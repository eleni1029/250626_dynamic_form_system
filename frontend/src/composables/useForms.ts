// frontend/src/composables/useForms.ts
// 主要表單管理邏輯組合式 API - 基礎表單管理功能

import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useFormsStore } from '@/stores/forms';
import { useAuthStore } from '@/stores/auth';
import type { FormConfig } from '@/types/forms';

/**
 * 主要表單管理 Hook
 * 負責表單的基礎管理功能：選擇、導航、權限檢查等
 */
export function useForms() {
  const formsStore = useFormsStore();
  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  // 響應式狀態
  const isLoading = ref(false);
  const selectedFormId = ref<string>('');
  const showResultsDialog = ref(false);
  const showHistoryDialog = ref(false);
  const showExportDialog = ref(false);

  // 計算屬性
  const availableForms = computed(() => formsStore.availableForms);
  
  const currentFormConfig = computed(() => 
    selectedFormId.value ? formsStore.getFormConfig(selectedFormId.value) : null
  );
  
  const canAccessForms = computed(() => 
    authStore.isAuthenticated || authStore.isGuest
  );
  
  const registeredUserForms = computed(() => 
    formsStore.registeredUserForms
  );
  
  const guestForms = computed(() => 
    formsStore.guestForms
  );

  const hasFormPermission = computed(() => (formId: string) => {
    const config = formsStore.getFormConfig(formId);
    if (!config) return false;
    
    // 遊客只能訪問允許遊客的表單
    if (authStore.isGuest && !config.guestAccessible) return false;
    
    // 註冊用戶可以訪問所有表單
    if (authStore.isAuthenticated) return true;
    
    return false;
  });

  /**
   * 初始化表單系統
   */
  const initialize = async () => {
    if (!canAccessForms.value) {
      ElMessage.warning('請先登錄或創建遊客賬號以使用表單功能');
      router.push('/auth/login');
      return;
    }

    isLoading.value = true;
    try {
      // 載入表單配置
      await formsStore.loadFormConfigs();
      
      // 如果 URL 中有表單 ID，設置為當前選中的表單
      if (route.params.formId) {
        const formId = route.params.formId as string;
        if (hasFormPermission.value(formId)) {
          selectedFormId.value = formId;
        } else {
          ElMessage.error('您沒有權限訪問此表單');
          router.push('/forms');
        }
      }
      
      ElMessage.success('表單系統初始化成功');
    } catch (error) {
      ElMessage.error('載入表單配置失敗，請重試');
      console.error('Form initialization error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 選擇並導航到指定表單
   */
  const selectForm = async (formId: string) => {
    // 權限檢查
    if (!canAccessForms.value) {
      ElMessage.warning('請先登錄以使用此功能');
      return;
    }

    if (!hasFormPermission.value(formId)) {
      ElMessage.error('您沒有權限訪問此表單');
      return;
    }

    selectedFormId.value = formId;
    router.push(`/forms/${formId}`);
    
    // 預載入表單歷史記錄
    try {
      await formsStore.loadFormRecords(formId, 1, 5);
    } catch (error) {
      console.error('預載入表單記錄失敗:', error);
      // 不顯示錯誤，因為這不影響主要功能
    }
  };

  /**
   * 查看表單結果
   */
  const viewResults = (formId: string) => {
    if (!hasFormPermission.value(formId)) {
      ElMessage.error('您沒有權限查看此表單的結果');
      return;
    }
    
    selectedFormId.value = formId;
    showResultsDialog.value = true;
  };

  /**
   * 查看表單歷史記錄
   */
  const viewHistory = async (formId: string) => {
    if (!hasFormPermission.value(formId)) {
      ElMessage.error('您沒有權限查看此表單的歷史記錄');
      return;
    }

    selectedFormId.value = formId;
    isLoading.value = true;
    
    try {
      await formsStore.loadFormRecords(formId, 1, 20);
      showHistoryDialog.value = true;
    } catch (error) {
      ElMessage.error('載入歷史記錄失敗，請重試');
      console.error('Load history error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 匯出表單數據
   */
  const exportData = (formId: string) => {
    if (!hasFormPermission.value(formId)) {
      ElMessage.error('您沒有權限匯出此表單的數據');
      return;
    }

    if (authStore.isGuest) {
      ElMessage.warning('遊客用戶無法匯出數據，請註冊賬號');
      return;
    }
    
    selectedFormId.value = formId;
    showExportDialog.value = true;
  };

  /**
   * 刪除表單記錄
   */
  const deleteRecord = async (recordId: number, formId?: string) => {
    try {
      await ElMessageBox.confirm(
        '確定要刪除這條記錄嗎？此操作無法恢復。',
        '確認刪除',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      await formsStore.deleteFormRecord(recordId);
      ElMessage.success('記錄刪除成功');
      
      // 刷新當前表單的記錄
      if (formId) {
        await formsStore.loadFormRecords(formId, 1, 20);
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('刪除記錄失敗，請重試');
        console.error('Delete record error:', error);
      }
    }
  };

  /**
   * 獲取表單統計數據
   */
  const getFormStatistics = async (formId: string) => {
    if (!hasFormPermission.value(formId)) {
      return null;
    }

    try {
      await formsStore.loadFormStatistics(formId);
      return formsStore.getFormStatistics(formId);
    } catch (error) {
      console.error('載入統計數據失敗:', error);
      return null;
    }
  };

  /**
   * 重新載入表單配置
   */
  const refreshFormConfigs = async () => {
    isLoading.value = true;
    try {
      await formsStore.loadFormConfigs();
      ElMessage.success('表單配置已更新');
    } catch (error) {
      ElMessage.error('更新表單配置失敗');
      console.error('Refresh configs error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 檢查表單是否可用
   */
  const isFormAvailable = (formId: string): boolean => {
    const config = formsStore.getFormConfig(formId);
    return config && config.enabled && hasFormPermission.value(formId);
  };

  /**
   * 獲取表單類別分組
   */
  const getFormsByCategory = () => {
    const forms = availableForms.value;
    const grouped: Record<string, FormConfig[]> = {};
    
    forms.forEach(form => {
      if (hasFormPermission.value(form.formId)) {
        const category = form.category || '其他';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(form);
      }
    });
    
    return grouped;
  };

  // 監聽認證狀態變化，自動重新初始化
  watch(() => authStore.isAuthenticated, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      initialize();
    }
  });

  // 監聽遊客狀態變化
  watch(() => authStore.isGuest, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      initialize();
    }
  });

  return {
    // 響應式狀態
    isLoading,
    selectedFormId,
    showResultsDialog,
    showHistoryDialog,
    showExportDialog,
    
    // 計算屬性
    availableForms,
    currentFormConfig,
    canAccessForms,
    registeredUserForms,
    guestForms,
    hasFormPermission,
    
    // 方法
    initialize,
    selectForm,
    viewResults,
    viewHistory,
    exportData,
    deleteRecord,
    getFormStatistics,
    refreshFormConfigs,
    isFormAvailable,
    getFormsByCategory
  };
}

/**
 * 表單數據驗證 Hook
 * 提供通用的表單驗證邏輯
 */
export function useFormValidation() {
  /**
   * 驗證數字範圍
   */
  const validateNumberRange = (
    value: string | number, 
    min: number, 
    max: number, 
    fieldName: string
  ) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) {
      return `請輸入有效的${fieldName}`;
    }
    
    if (num < min || num > max) {
      return `${fieldName}應在 ${min}-${max} 之間`;
    }
    
    return true;
  };

  /**
   * 驗證年齡
   */
  const validateAge = (value: string | number) => {
    return validateNumberRange(value, 10, 100, '年齡');
  };

  /**
   * 驗證身高（公制）
   */
  const validateHeightMetric = (value: string | number) => {
    return validateNumberRange(value, 50, 250, '身高');
  };

  /**
   * 驗證身高（英制）
   */
  const validateHeightImperial = (value: string | number) => {
    return validateNumberRange(value, 1.5, 8.5, '身高');
  };

  /**
   * 驗證體重（公制）
   */
  const validateWeightMetric = (value: string | number) => {
    return validateNumberRange(value, 20, 300, '體重');
  };

  /**
   * 驗證體重（英制）
   */
  const validateWeightImperial = (value: string | number) => {
    return validateNumberRange(value, 44, 660, '體重');
  };

  /**
   * 創建 Element Plus 驗證器
   */
  const createValidator = (validatorFn: (value: any) => string | true) => {
    return (rule: any, value: any, callback: (error?: Error) => void) => {
      const result = validatorFn(value);
      if (result === true) {
        callback();
      } else {
        callback(new Error(result));
      }
    };
  };

  return {
    validateNumberRange,
    validateAge,
    validateHeightMetric,
    validateHeightImperial,
    validateWeightMetric,
    validateWeightImperial,
    createValidator
  };
}