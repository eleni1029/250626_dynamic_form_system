// frontend/src/stores/forms.ts
// 表單狀態管理 - Pinia Store

import { defineStore } from 'pinia';
import { ref, computed, reactive, watch } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { ApiService, ApiCache } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import type { 
  FormsAPI, 
  PaginatedResponse,
  ApiError 
} from '@/types/api';

/**
 * 表單狀態接口
 */
interface FormState {
  configs: Map<string, FormsAPI.FormConfig>;
  submissions: Map<string, FormsAPI.FormSubmission[]>;
  stats: Map<string, FormsAPI.FormStats>;
  isLoading: boolean;
  lastUpdated: number | null;
}

/**
 * 分頁參數接口
 */
interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 表單歷史查詢參數
 */
interface HistoryQueryParams {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  order?: 'asc' | 'desc';
}

/**
 * 表單 Store
 */
export const useFormsStore = defineStore('forms', () => {
  const authStore = useAuthStore();

  // ======================== 狀態 ========================
  
  const configs = ref<Map<string, FormsAPI.FormConfig>>(new Map());
  const submissions = ref<Map<string, FormsAPI.FormSubmission[]>>(new Map());
  const stats = ref<Map<string, FormsAPI.FormStats>>(new Map());
  const availableForms = ref<FormsAPI.FormConfig[]>([]);
  const isLoading = ref(false);
  const lastUpdated = ref<number | null>(null);

  // 分頁狀態
  const pagination = reactive<Map<string, PaginationParams>>(new Map());

  // 當前選中的表單
  const selectedFormId = ref<string | null>(null);

  // 計算結果緩存
  const calculationResults = ref<Map<string, any>>(new Map());

  // ======================== 計算屬性 ========================

  /**
   * 獲取當前選中的表單配置
   */
  const selectedFormConfig = computed(() => {
    if (!selectedFormId.value) return null;
    return configs.value.get(selectedFormId.value) || null;
  });

  /**
   * 獲取可用表單列表（根據用戶權限）
   */
  const accessibleForms = computed(() => {
    return availableForms.value.filter(form => {
      if (form.guestAccessible) return true;
      return authStore.isRegisteredUser;
    });
  });

  /**
   * 獲取表單類別
   */
  const formCategories = computed(() => {
    const categories = new Map<string, FormsAPI.FormConfig[]>();
    
    accessibleForms.value.forEach(form => {
      const category = form.category || 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(form);
    });

    return Array.from(categories.entries()).map(([name, forms]) => ({
      name,
      forms,
      count: forms.length,
    }));
  });

  /**
   * 獲取總體統計
   */
  const overallStats = computed(() => {
    let totalSubmissions = 0;
    let totalForms = stats.value.size;
    let latestSubmission: FormsAPI.FormSubmission | null = null;

    stats.value.forEach(stat => {
      totalSubmissions += stat.total_submissions;
      if (stat.latest_submission && (!latestSubmission || 
          new Date(stat.latest_submission.created_at) > new Date(latestSubmission.created_at))) {
        latestSubmission = stat.latest_submission;
      }
    });

    return {
      totalSubmissions,
      totalForms,
      latestSubmission,
      averageSubmissionsPerForm: totalForms > 0 ? Math.round(totalSubmissions / totalForms) : 0,
    };
  });

  /**
   * 表單載入狀態
   */
  const loadingStates = computed(() => ({
    isLoading: isLoading.value,
    hasConfigs: configs.value.size > 0,
    hasSubmissions: submissions.value.size > 0,
    hasStats: stats.value.size > 0,
    isInitialized: lastUpdated.value !== null,
  }));

  // ======================== 方法 ========================

  /**
   * 載入可用表單列表
   */
  const loadAvailableForms = async (): Promise<boolean> => {
    try {
      isLoading.value = true;

      const cacheKey = `available_forms_${authStore.user?.id || 'anonymous'}`;
      const cachedForms = ApiCache.get<FormsAPI.FormConfig[]>(cacheKey);
      
      if (cachedForms) {
        availableForms.value = cachedForms;
        return true;
      }

      const response = await ApiService.get<{ forms: FormsAPI.FormConfig[] }>('/forms/available');
      
      if (response.success && response.data) {
        availableForms.value = response.data.forms;
        ApiCache.set(cacheKey, response.data.forms, 10 * 60 * 1000); // 10分鐘緩存
        return true;
      }

      throw new Error(response.error || '載入表單列表失敗');
    } catch (error) {
      console.error('載入可用表單失敗:', error);
      ElMessage.error('載入表單列表失敗');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 載入表單配置
   */
  const loadFormConfig = async (formId: string): Promise<FormsAPI.FormConfig | null> => {
    try {
      // 檢查緩存
      if (configs.value.has(formId)) {
        return configs.value.get(formId)!;
      }

      const response = await ApiService.get<FormsAPI.FormConfig>(`/forms/configs/${formId}`);
      
      if (response.success && response.data) {
        configs.value.set(formId, response.data);
        return response.data;
      }

      throw new Error(response.error || '載入表單配置失敗');
    } catch (error) {
      console.error(`載入表單配置失敗 (${formId}):`, error);
      ElMessage.error(`載入 ${formId} 配置失敗`);
      return null;
    }
  };

  /**
   * 提交 BMI 表單
   */
  const submitBMI = async (data: FormsAPI.BMIRequest): Promise<FormsAPI.BMIResponse | null> => {
    try {
      isLoading.value = true;

      const response = await ApiService.post<FormsAPI.BMIResponse>('/forms/bmi/submit', data);
      
      if (response.success && response.data) {
        // 更新本地緩存
        await refreshFormData('bmi-calculator');
        
        // 緩存計算結果
        calculationResults.value.set(`bmi_${response.data.submission_id}`, response.data);

        ElNotification({
          title: 'BMI 計算完成',
          message: `您的 BMI 值為 ${response.data.calculations.bmi}`,
          type: 'success',
          duration: 4000,
        });

        return response.data;
      }

      throw new Error(response.error || 'BMI 計算失敗');
    } catch (error) {
      console.error('BMI 提交失敗:', error);
      const apiError = error as ApiError;
      ElMessage.error(apiError.message || 'BMI 計算失敗');
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 提交 TDEE 表單
   */
  const submitTDEE = async (data: FormsAPI.TDEERequest): Promise<FormsAPI.TDEEResponse | null> => {
    try {
      isLoading.value = true;

      const response = await ApiService.post<FormsAPI.TDEEResponse>('/forms/tdee/submit', data);
      
      if (response.success && response.data) {
        // 更新本地緩存
        await refreshFormData('tdee-calculator');
        
        // 緩存計算結果
        calculationResults.value.set(`tdee_${response.data.submission_id}`, response.data);

        ElNotification({
          title: 'TDEE 計算完成',
          message: `您的 TDEE 值為 ${response.data.calculations.tdee} 卡路里/天`,
          type: 'success',
          duration: 4000,
        });

        return response.data;
      }

      throw new Error(response.error || 'TDEE 計算失敗');
    } catch (error) {
      console.error('TDEE 提交失敗:', error);
      const apiError = error as ApiError;
      ElMessage.error(apiError.message || 'TDEE 計算失敗');
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 載入表單歷史記錄
   */
  const loadFormHistory = async (
    formId: string, 
    params: HistoryQueryParams = {}
  ): Promise<PaginatedResponse<FormsAPI.FormSubmission> | null> => {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        ...params,
      };

      const endpoint = formId === 'bmi-calculator' ? '/forms/bmi/history' : '/forms/tdee/history';
      const response = await ApiService.getPaginated<FormsAPI.FormSubmission>(
        endpoint,
        queryParams.page,
        queryParams.limit,
        queryParams
      );

      if (response.success && response.data) {
        // 更新本地提交記錄
        submissions.value.set(formId, response.data);
        
        // 更新分頁信息
        pagination.set(formId, {
          page: response.pagination.current_page,
          limit: response.pagination.per_page,
          total: response.pagination.total_count,
          totalPages: response.pagination.total_pages,
        });

        return response;
      }

      throw new Error('載入歷史記錄失敗');
    } catch (error) {
      console.error(`載入表單歷史失敗 (${formId}):`, error);
      ElMessage.error('載入歷史記錄失敗');
      return null;
    }
  };

  /**
   * 載入表單統計
   */
  const loadFormStats = async (formId: string, days: number = 30): Promise<FormsAPI.FormStats | null> => {
    try {
      const endpoint = formId === 'bmi-calculator' ? '/forms/bmi/stats' : '/forms/tdee/stats';
      const response = await ApiService.get<{ stats: FormsAPI.FormStats }>(endpoint, { days });

      if (response.success && response.data) {
        stats.value.set(formId, response.data.stats);
        return response.data.stats;
      }

      throw new Error('載入統計數據失敗');
    } catch (error) {
      console.error(`載入表單統計失敗 (${formId}):`, error);
      ElMessage.error('載入統計數據失敗');
      return null;
    }
  };

  /**
   * 刪除表單記錄
   */
  const deleteFormRecord = async (formId: string, recordId: number): Promise<boolean> => {
    try {
      const endpoint = formId === 'bmi-calculator' 
        ? `/forms/bmi/${recordId}` 
        : `/forms/tdee/${recordId}`;
      
      const response = await ApiService.delete(endpoint);

      if (response.success) {
        // 更新本地數據
        await refreshFormData(formId);
        
        ElMessage.success('記錄已刪除');
        return true;
      }

      throw new Error(response.error || '刪除失敗');
    } catch (error) {
      console.error('刪除表單記錄失敗:', error);
      const apiError = error as ApiError;
      ElMessage.error(apiError.message || '刪除失敗');
      return false;
    }
  };

  /**
   * 載入趨勢數據
   */
  const loadTrendData = async (formId: string, days: number = 30): Promise<any[] | null> => {
    try {
      const endpoint = formId === 'bmi-calculator' ? '/forms/bmi/trends' : '/forms/tdee/trends';
      const response = await ApiService.get<{ trends: any[] }>(endpoint, { days });

      if (response.success && response.data) {
        return response.data.trends;
      }

      throw new Error('載入趨勢數據失敗');
    } catch (error) {
      console.error(`載入趨勢數據失敗 (${formId}):`, error);
      ElMessage.error('載入趨勢數據失敗');
      return null;
    }
  };

  /**
   * 匯出表單數據
   */
  const exportFormData = async (formId: string, format: 'json' | 'csv' = 'json'): Promise<boolean> => {
    try {
      const endpoint = formId === 'bmi-calculator' 
        ? '/forms/bmi/export/data' 
        : '/forms/tdee/export/data';
      
      await ApiService.downloadFile(endpoint, `${formId}_data.${format}`, { format });
      
      ElMessage.success('數據匯出成功');
      return true;
    } catch (error) {
      console.error('匯出表單數據失敗:', error);
      ElMessage.error('數據匯出失敗');
      return false;
    }
  };

  /**
   * 刷新表單數據
   */
  const refreshFormData = async (formId?: string): Promise<void> => {
    try {
      if (formId) {
        // 刷新特定表單
        await Promise.all([
          loadFormHistory(formId),
          loadFormStats(formId),
        ]);
      } else {
        // 刷新所有表單
        await loadAvailableForms();
        
        for (const form of accessibleForms.value) {
          await Promise.all([
            loadFormConfig(form.formId),
            loadFormHistory(form.formId),
            loadFormStats(form.formId),
          ]);
        }
      }
      
      lastUpdated.value = Date.now();
    } catch (error) {
      console.error('刷新表單數據失敗:', error);
    }
  };

  /**
   * 清除表單緩存
   */
  const clearFormCache = (formId?: string): void => {
    if (formId) {
      configs.value.delete(formId);
      submissions.value.delete(formId);
      stats.value.delete(formId);
      pagination.delete(formId);
      calculationResults.value.delete(formId);
    } else {
      configs.value.clear();
      submissions.value.clear();
      stats.value.clear();
      pagination.clear();
      calculationResults.value.clear();
      availableForms.value = [];
      lastUpdated.value = null;
    }
  };

  /**
   * 設置選中的表單
   */
  const setSelectedForm = (formId: string | null): void => {
    selectedFormId.value = formId;
  };

  /**
   * 獲取計算結果
   */
  const getCalculationResult = (key: string): any | null => {
    return calculationResults.value.get(key) || null;
  };

  /**
   * 獲取表單提交記錄
   */
  const getFormSubmissions = (formId: string): FormsAPI.FormSubmission[] => {
    return submissions.value.get(formId) || [];
  };

  /**
   * 獲取表單統計
   */
  const getFormStats = (formId: string): FormsAPI.FormStats | null => {
    return stats.value.get(formId) || null;
  };

  /**
   * 獲取分頁信息
   */
  const getFormPagination = (formId: string): PaginationParams | null => {
    return pagination.get(formId) || null;
  };

  // ======================== 監聽器 ========================

  /**
   * 監聽認證狀態變化
   */
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        // 用戶登錄後重新載入表單
        loadAvailableForms();
      } else {
        // 用戶登出後清除數據
        clearFormCache();
      }
    }
  );

  // ======================== 初始化 ========================

  /**
   * 初始化表單 Store
   */
  const initializeForms = async (): Promise<void> => {
    if (authStore.isAuthenticated) {
      await loadAvailableForms();
    }
  };

  // ======================== 返回 ========================

  return {
    // 狀態
    configs: readonly(configs),
    submissions: readonly(submissions),
    stats: readonly(stats),
    availableForms: readonly(availableForms),
    isLoading: readonly(isLoading),
    lastUpdated: readonly(lastUpdated),
    selectedFormId: readonly(selectedFormId),

    // 計算屬性
    selectedFormConfig,
    accessibleForms,
    formCategories,
    overallStats,
    loadingStates,

    // 方法
    loadAvailableForms,
    loadFormConfig,
    submitBMI,
    submitTDEE,
    loadFormHistory,
    loadFormStats,
    deleteFormRecord,
    loadTrendData,
    exportFormData,
    refreshFormData,
    clearFormCache,
    setSelectedForm,
    getCalculationResult,
    getFormSubmissions,
    getFormStats,
    getFormPagination,
    initializeForms,
  };
});

/**
 * 表單工具 Hook
 */
export const useFormUtils = () => {
  const formsStore = useFormsStore();

  /**
   * 格式化 BMI 類別
   */
  const formatBMICategory = (bmi: number): { category: string; color: string; level: string } => {
    if (bmi < 18.5) {
      return { category: '體重過輕', color: '#409EFF', level: 'info' };
    } else if (bmi < 24) {
      return { category: '正常體重', color: '#67C23A', level: 'success' };
    } else if (bmi < 27) {
      return { category: '體重過重', color: '#E6A23C', level: 'warning' };
    } else {
      return { category: '肥胖', color: '#F56C6C', level: 'danger' };
    }
  };

  /**
   * 格式化活動程度
   */
  const formatActivityLevel = (level: string): string => {
    const levelMap = {
      sedentary: '久坐少動',
      lightly_active: '輕度活躍',
      moderately_active: '中度活躍',
      very_active: '高度活躍',
      extremely_active: '極度活躍',
    };
    return levelMap[level as keyof typeof levelMap] || level;
  };

  /**
   * 格式化目標
   */
  const formatGoal = (goal?: string): string => {
    if (!goal) return '未設定';
    
    const goalMap = {
      lose_weight: '減重',
      maintain: '維持體重',
      gain_weight: '增重',
    };
    return goalMap[goal as keyof typeof goalMap] || goal;
  };

  /**
   * 計算趨勢百分比
   */
  const calculateTrendPercentage = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    formatBMICategory,
    formatActivityLevel,
    formatGoal,
    calculateTrendPercentage,
  };
};