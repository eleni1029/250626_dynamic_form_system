// frontend/src/composables/useFormHistory.ts
// 表單歷史記錄管理組合式 API

import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { useFormsStore } from '@/stores/forms';
import { useAuthStore } from '@/stores/auth';
import type { FormRecord, FormStatistics, ExportOptions } from '@/types/forms';

/**
 * 表單歷史記錄 Hook
 * 管理表單記錄的載入、分頁、刪除和匯出功能
 */
export function useFormHistory(formId: string) {
  const formsStore = useFormsStore();
  const authStore = useAuthStore();
  
  // 分頁狀態
  const currentPage = ref(1);
  const pageSize = ref(10);
  const isLoading = ref(false);
  const isExporting = ref(false);

  // 篩選和排序選項
  const sortBy = ref<'createdAt' | 'updatedAt'>('createdAt');
  const sortOrder = ref<'asc' | 'desc'>('desc');
  const dateRange = ref<[Date, Date] | null>(null);

  // 計算屬性
  const records = computed(() => formsStore.getFormRecords(formId) || []);
  const statistics = computed(() => formsStore.getFormStatistics(formId));
  const totalRecords = computed(() => statistics.value?.totalRecords || 0);
  const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value));
  
  const hasRecords = computed(() => records.value.length > 0);
  const canDelete = computed(() => authStore.isAuthenticated); // 只有註冊用戶可以刪除
  const canExport = computed(() => authStore.isAuthenticated && hasRecords.value);

  // 分頁資訊
  const paginationInfo = computed(() => ({
    current: currentPage.value,
    size: pageSize.value,
    total: totalRecords.value,
    pages: totalPages.value,
    start: (currentPage.value - 1) * pageSize.value + 1,
    end: Math.min(currentPage.value * pageSize.value, totalRecords.value)
  }));

  /**
   * 載入記錄
   */
  const loadRecords = async (page = 1, size = pageSize.value) => {
    isLoading.value = true;
    try {
      const params = {
        page,
        size,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        ...(dateRange.value && {
          startDate: dateRange.value[0].toISOString(),
          endDate: dateRange.value[1].toISOString()
        })
      };

      await formsStore.loadFormRecords(formId, page, size, params);
      currentPage.value = page;
      pageSize.value = size;
    } catch (error) {
      ElMessage.error('載入記錄失敗，請重試');
      console.error('Load records error:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 刷新記錄
   */
  const refreshRecords = () => {
    loadRecords(currentPage.value, pageSize.value);
  };

  /**
   * 載入統計數據
   */
  const loadStatistics = async () => {
    try {
      await formsStore.loadFormStatistics(formId);
    } catch (error) {
      console.error('載入統計數據失敗:', error);
    }
  };

  /**
   * 切換頁面
   */
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      loadRecords(page, pageSize.value);
    }
  };

  /**
   * 改變每頁大小
   */
  const changePageSize = (size: number) => {
    const newPage = Math.min(currentPage.value, Math.ceil(totalRecords.value / size));
    loadRecords(newPage, size);
  };

  /**
   * 改變排序
   */
  const changeSort = (field: 'createdAt' | 'updatedAt', order: 'asc' | 'desc') => {
    sortBy.value = field;
    sortOrder.value = order;
    loadRecords(1, pageSize.value); // 重置到第一頁
  };

  /**
   * 設置日期範圍篩選
   */
  const setDateRange = (range: [Date, Date] | null) => {
    dateRange.value = range;
    loadRecords(1, pageSize.value); // 重置到第一頁
  };

  /**
   * 清除篩選
   */
  const clearFilters = () => {
    dateRange.value = null;
    sortBy.value = 'createdAt';
    sortOrder.value = 'desc';
    loadRecords(1, pageSize.value);
  };

  /**
   * 刪除單個記錄
   */
  const deleteRecord = async (recordId: number, record?: FormRecord) => {
    if (!canDelete.value) {
      ElMessage.warning('遊客用戶無法刪除記錄，請註冊賬號');
      return;
    }

    try {
      const recordDate = record ? new Date(record.createdAt).toLocaleString() : '';
      const confirmMessage = record 
        ? `確定要刪除 ${recordDate} 的記錄嗎？此操作無法恢復。`
        : '確定要刪除這條記錄嗎？此操作無法恢復。';

      await ElMessageBox.confirm(confirmMessage, '確認刪除', {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await formsStore.deleteFormRecord(recordId);
      ElMessage.success('記錄刪除成功');
      
      // 如果當前頁沒有記錄了，跳到上一頁
      if (records.value.length === 1 && currentPage.value > 1) {
        changePage(currentPage.value - 1);
      } else {
        refreshRecords();
      }
      
      // 重新載入統計數據
      loadStatistics();

    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('刪除記錄失敗，請重試');
        console.error('Delete record error:', error);
      }
    }
  };

  /**
   * 批量刪除記錄
   */
  const deleteMultipleRecords = async (recordIds: number[]) => {
    if (!canDelete.value) {
      ElMessage.warning('遊客用戶無法刪除記錄，請註冊賬號');
      return;
    }

    if (recordIds.length === 0) {
      ElMessage.warning('請選擇要刪除的記錄');
      return;
    }

    try {
      await ElMessageBox.confirm(
        `確定要刪除選中的 ${recordIds.length} 條記錄嗎？此操作無法恢復。`,
        '批量刪除確認',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      // 批量刪除
      const deletePromises = recordIds.map(id => formsStore.deleteFormRecord(id));
      await Promise.all(deletePromises);

      ElMessage.success(`成功刪除 ${recordIds.length} 條記錄`);
      refreshRecords();
      loadStatistics();

    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('批量刪除失敗，請重試');
        console.error('Batch delete error:', error);
      }
    }
  };

  /**
   * 匯出記錄
   */
  const exportRecords = async (options: ExportOptions) => {
    if (!canExport.value) {
      ElMessage.warning('沒有可匯出的記錄或權限不足');
      return;
    }

    isExporting.value = true;
    try {
      const blob = await formsStore.exportFormData(formId, options);
      
      // 生成文件名
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${formId}-records-${timestamp}.${options.format}`;
      
      // 創建下載鏈接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      ElNotification({
        title: '匯出成功',
        message: `已成功匯出 ${records.value.length} 條記錄`,
        type: 'success',
        duration: 3000
      });

    } catch (error) {
      ElMessage.error('匯出失敗，請重試');
      console.error('Export error:', error);
    } finally {
      isExporting.value = false;
    }
  };

  /**
   * 獲取記錄詳情
   */
  const getRecordDetails = (record: FormRecord) => {
    // 根據表單類型返回格式化的詳情
    switch (formId) {
      case 'bmi-calculator':
        return {
          height: record.height,
          weight: record.weight,
          bmi: record.bmiResult,
          category: record.bmiCategory,
          unit: record.unit || 'metric'
        };
      case 'tdee-calculator':
        return {
          age: record.age,
          gender: record.gender,
          height: record.height,
          weight: record.weight,
          activityLevel: record.activityLevel,
          goal: record.goal,
          bmr: record.bmrResult,
          tdee: record.tdeeResult,
          targetCalories: record.targetCalories,
          unit: record.unit || 'metric'
        };
      default:
        return record;
    }
  };

  /**
   * 格式化記錄用於顯示
   */
  const formatRecordForDisplay = (record: FormRecord) => {
    const details = getRecordDetails(record);
    const date = new Date(record.createdAt).toLocaleString();
    
    return {
      id: record.id,
      date,
      details,
      canDelete: canDelete.value
    };
  };

  /**
   * 獲取趨勢數據
   */
  const getTrendData = () => {
    if (!hasRecords.value) return [];

    return records.value.slice(-10).map(record => {
      const date = new Date(record.createdAt).toLocaleDateString();
      
      switch (formId) {
        case 'bmi-calculator':
          return {
            date,
            value: record.bmiResult,
            label: 'BMI',
            category: record.bmiCategory
          };
        case 'tdee-calculator':
          return {
            date,
            value: record.tdeeResult,
            label: 'TDEE',
            bmr: record.bmrResult,
            target: record.targetCalories
          };
        default:
          return { date, value: 0, label: '未知' };
      }
    }).reverse();
  };

  /**
   * 檢查是否有新記錄
   */
  const checkForNewRecords = async () => {
    try {
      const latestRecord = records.value[0];
      if (!latestRecord) return;

      const response = await formsStore.checkNewRecords(formId, latestRecord.createdAt);
      if (response.hasNew) {
        ElNotification({
          title: '有新記錄',
          message: `發現 ${response.count} 條新記錄`,
          type: 'info',
          duration: 5000,
          onClick: () => refreshRecords()
        });
      }
    } catch (error) {
      console.error('檢查新記錄失敗:', error);
    }
  };

  // 監聽認證狀態變化
  watch(() => authStore.isAuthenticated, (newVal) => {
    if (newVal) {
      refreshRecords();
      loadStatistics();
    }
  });

  // 初始化載入
  onMounted(async () => {
    await loadRecords();
    await loadStatistics();
  });

  return {
    // 狀態
    currentPage,
    pageSize,
    isLoading,
    isExporting,
    sortBy,
    sortOrder,
    dateRange,
    
    // 計算屬性
    records,
    statistics,
    totalRecords,
    totalPages,
    hasRecords,
    canDelete,
    canExport,
    paginationInfo,
    
    // 方法
    loadRecords,
    refreshRecords,
    loadStatistics,
    changePage,
    changePageSize,
    changeSort,
    setDateRange,
    clearFilters,
    deleteRecord,
    deleteMultipleRecords,
    exportRecords,
    getRecordDetails,
    formatRecordForDisplay,
    getTrendData,
    checkForNewRecords
  };
}