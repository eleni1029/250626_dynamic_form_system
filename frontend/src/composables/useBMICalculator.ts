// frontend/src/composables/useBMICalculator.ts
// BMI 計算器專用邏輯組合式 API

import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, ElNotification, type FormInstance, type FormRules } from 'element-plus';
import { useFormsStore } from '@/stores/forms';
import { useFormValidation } from '@/composables/useForms';
import type { FormSubmissionRequest, BMICalculationResult } from '@/types/forms';

/**
 * BMI 計算器 Hook
 * 專門處理 BMI 計算的表單邏輯、驗證和提交
 */
export function useBMICalculator() {
  const formsStore = useFormsStore();
  const { validateHeightMetric, validateHeightImperial, validateWeightMetric, validateWeightImperial, createValidator } = useFormValidation();
  
  // 表單引用
  const formRef = ref<FormInstance>();
  
  // 表單數據
  const formData = reactive({
    height: '',
    weight: '',
    unit: 'metric' as 'metric' | 'imperial'
  });

  // 提交狀態
  const isSubmitting = ref(false);
  const calculationResult = ref<BMICalculationResult | null>(null);
  const showResultDialog = ref(false);

  // 計算屬性
  const isMetric = computed(() => formData.unit === 'metric');
  const heightLabel = computed(() => isMetric.value ? '身高 (公分)' : '身高 (英尺)');
  const weightLabel = computed(() => isMetric.value ? '體重 (公斤)' : '體重 (磅)');
  const heightPlaceholder = computed(() => isMetric.value ? '例如: 170' : '例如: 5.6');
  const weightPlaceholder = computed(() => isMetric.value ? '例如: 65' : '例如: 143');

  // 動態表單驗證規則
  const formRules = computed<FormRules>(() => ({
    height: [
      { required: true, message: '請輸入身高', trigger: 'blur' },
      { 
        validator: createValidator(
          isMetric.value ? validateHeightMetric : validateHeightImperial
        ),
        trigger: 'blur'
      }
    ],
    weight: [
      { required: true, message: '請輸入體重', trigger: 'blur' },
      { 
        validator: createValidator(
          isMetric.value ? validateWeightMetric : validateWeightImperial
        ),
        trigger: 'blur'
      }
    ]
  }));

  // BMI 分類定義
  const bmiCategories = [
    { min: 0, max: 18.5, name: '體重過輕', color: '#409EFF', healthTip: '建議增加營養攝入，適當運動' },
    { min: 18.5, max: 24, name: '正常體重', color: '#67C23A', healthTip: '保持良好的飲食和運動習慣' },
    { min: 24, max: 28, name: '體重過重', color: '#E6A23C', healthTip: '建議控制飲食，增加運動量' },
    { min: 28, max: Infinity, name: '肥胖', color: '#F56C6C', healthTip: '建議諮詢醫生，制定減重計劃' }
  ];

  /**
   * 獲取 BMI 分類信息
   */
  const getBMICategory = (bmi: number) => {
    return bmiCategories.find(category => bmi >= category.min && bmi < category.max) || bmiCategories[0];
  };

  /**
   * 本地 BMI 計算（用於即時預覽）
   */
  const calculateLocalBMI = () => {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    
    if (!height || !weight) return null;

    let heightInMeters = height;
    let weightInKg = weight;

    // 單位轉換
    if (formData.unit === 'imperial') {
      heightInMeters = height * 0.3048; // 英尺轉米
      weightInKg = weight * 0.453592; // 磅轉公斤
    } else {
      heightInMeters = height / 100; // 公分轉米
    }

    const bmi = weightInKg / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  // 即時 BMI 預覽
  const previewBMI = computed(() => calculateLocalBMI());
  const previewCategory = computed(() => 
    previewBMI.value ? getBMICategory(previewBMI.value) : null
  );

  /**
   * 提交 BMI 計算
   */
  const calculateBMI = async () => {
    if (!formRef.value) return;

    // 表單驗證
    const isValid = await formRef.value.validate().catch(() => false);
    if (!isValid) return;

    isSubmitting.value = true;
    try {
      const height = parseFloat(formData.height);
      const weight = parseFloat(formData.weight);

      const submitData: FormSubmissionRequest = {
        formId: 'bmi-calculator',
        data: {
          height,
          weight,
          unit: formData.unit
        }
      };

      const result = await formsStore.submitForm(submitData) as BMICalculationResult;
      calculationResult.value = result;
      showResultDialog.value = true;

      // 顯示通知
      const category = getBMICategory(result.bmi);
      ElNotification({
        title: 'BMI 計算完成',
        message: `您的 BMI 值為 ${result.bmi}，屬於「${category.name}」`,
        type: result.isHealthy ? 'success' : 'warning',
        duration: 5000
      });

      // 重新載入歷史記錄
      await formsStore.loadFormRecords('bmi-calculator', 1, 10);

    } catch (error) {
      ElMessage.error('計算失敗，請檢查網絡連接後重試');
      console.error('BMI calculation error:', error);
    } finally {
      isSubmitting.value = false;
    }
  };

  /**
   * 重置表單
   */
  const resetForm = () => {
    if (formRef.value) {
      formRef.value.resetFields();
    }
    calculationResult.value = null;
    showResultDialog.value = false;
  };

  /**
   * 切換單位制
   */
  const toggleUnit = () => {
    const newUnit = formData.unit === 'metric' ? 'imperial' : 'metric';
    
    // 轉換現有數值
    if (formData.height) {
      const currentHeight = parseFloat(formData.height);
      if (newUnit === 'imperial') {
        // 公分轉英尺
        formData.height = (currentHeight / 30.48).toFixed(1);
      } else {
        // 英尺轉公分
        formData.height = (currentHeight * 30.48).toFixed(0);
      }
    }

    if (formData.weight) {
      const currentWeight = parseFloat(formData.weight);
      if (newUnit === 'imperial') {
        // 公斤轉磅
        formData.weight = (currentWeight * 2.20462).toFixed(1);
      } else {
        // 磅轉公斤
        formData.weight = (currentWeight / 2.20462).toFixed(1);
      }
    }

    formData.unit = newUnit;
  };

  /**
   * 載入歷史記錄中的數據到表單
   */
  const loadFromHistory = (record: any) => {
    formData.height = record.height?.toString() || '';
    formData.weight = record.weight?.toString() || '';
    formData.unit = record.unit || 'metric';
  };

  /**
   * 獲取 BMI 趨勢數據
   */
  const getBMITrend = () => {
    const records = formsStore.getFormRecords('bmi-calculator');
    if (!records || records.length === 0) return [];

    return records
      .slice(-10) // 最近10筆記錄
      .map(record => ({
        date: new Date(record.createdAt).toLocaleDateString(),
        bmi: record.bmiResult,
        category: getBMICategory(record.bmiResult).name
      }))
      .reverse(); // 時間順序
  };

  /**
   * 檢查表單是否已填寫
   */
  const isFormFilled = computed(() => {
    return formData.height.trim() !== '' && formData.weight.trim() !== '';
  });

  /**
   * 檢查表單數據是否有效
   */
  const isFormValid = computed(() => {
    if (!isFormFilled.value) return false;
    
    const heightValidation = isMetric.value 
      ? validateHeightMetric(formData.height)
      : validateHeightImperial(formData.height);
    
    const weightValidation = isMetric.value
      ? validateWeightMetric(formData.weight)
      : validateWeightImperial(formData.weight);

    return heightValidation === true && weightValidation === true;
  });

  /**
   * 獲取表單提示信息
   */
  const getFormHints = () => {
    const hints = [];
    
    if (isMetric.value) {
      hints.push('身高請以公分為單位（例如：170）');
      hints.push('體重請以公斤為單位（例如：65）');
    } else {
      hints.push('身高請以英尺為單位（例如：5.6）');
      hints.push('體重請以磅為單位（例如：143）');
    }
    
    return hints;
  };

  // 監聽單位變化，清除驗證錯誤
  watch(() => formData.unit, () => {
    if (formRef.value) {
      formRef.value.clearValidate();
    }
  });

  return {
    // 表單相關
    formRef,
    formData,
    formRules,
    
    // 狀態
    isSubmitting,
    calculationResult,
    showResultDialog,
    
    // 計算屬性
    isMetric,
    heightLabel,
    weightLabel,
    heightPlaceholder,
    weightPlaceholder,
    previewBMI,
    previewCategory,
    isFormFilled,
    isFormValid,
    
    // 方法
    calculateBMI,
    resetForm,
    toggleUnit,
    loadFromHistory,
    getBMICategory,
    getBMITrend,
    getFormHints,
    
    // 常量
    bmiCategories
  };
}