// frontend/src/composables/useTDEECalculator.ts
// TDEE 計算器專用邏輯組合式 API

import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, ElNotification, type FormInstance, type FormRules } from 'element-plus';
import { useFormsStore } from '@/stores/forms';
import { useFormValidation } from '@/composables/useForms';
import type { FormSubmissionRequest, TDEECalculationResult } from '@/types/forms';

/**
 * TDEE 計算器 Hook
 * 專門處理 TDEE（每日總能量消耗）計算的表單邏輯
 */
export function useTDEECalculator() {
  const formsStore = useFormsStore();
  const { validateAge, validateHeightMetric, validateHeightImperial, validateWeightMetric, validateWeightImperial, createValidator } = useFormValidation();

  // 表單引用
  const formRef = ref<FormInstance>();

  // 表單數據
  const formData = reactive({
    age: '',
    gender: 'male' as 'male' | 'female',
    height: '',
    weight: '',
    activityLevel: 'sedentary' as string,
    goal: 'maintain' as 'lose' | 'maintain' | 'gain',
    unit: 'metric' as 'metric' | 'imperial'
  });

  // 提交狀態
  const isSubmitting = ref(false);
  const calculationResult = ref<TDEECalculationResult | null>(null);
  const showResultDialog = ref(false);

  // 活動水平選項
  const activityLevels = [
    { 
      value: 'sedentary', 
      label: '久坐不動', 
      description: '辦公室工作，幾乎不運動', 
      multiplier: 1.2 
    },
    { 
      value: 'light', 
      label: '輕度活動', 
      description: '每周輕度運動 1-3 次', 
      multiplier: 1.375 
    },
    { 
      value: 'moderate', 
      label: '中度活動', 
      description: '每周中度運動 3-5 次', 
      multiplier: 1.55 
    },
    { 
      value: 'active', 
      label: '重度活動', 
      description: '每周高強度運動 6-7 次', 
      multiplier: 1.725 
    },
    { 
      value: 'extreme', 
      label: '極重度活動', 
      description: '每天訓練或體力勞動工作', 
      multiplier: 1.9 
    }
  ];

  // 目標選項
  const goalOptions = [
    { 
      value: 'lose', 
      label: '減重', 
      description: '建議減少 20% 卡路里攝入', 
      modifier: -0.2,
      color: '#409EFF'
    },
    { 
      value: 'maintain', 
      label: '維持體重', 
      description: '保持當前卡路里攝入', 
      modifier: 0,
      color: '#67C23A'
    },
    { 
      value: 'gain', 
      label: '增重', 
      description: '建議增加 20% 卡路里攝入', 
      modifier: 0.2,
      color: '#E6A23C'
    }
  ];

  // 計算屬性
  const isMetric = computed(() => formData.unit === 'metric');
  const heightLabel = computed(() => isMetric.value ? '身高 (公分)' : '身高 (英尺)');
  const weightLabel = computed(() => isMetric.value ? '體重 (公斤)' : '體重 (磅)');
  
  const selectedActivityLevel = computed(() => 
    activityLevels.find(level => level.value === formData.activityLevel)
  );
  
  const selectedGoal = computed(() => 
    goalOptions.find(goal => goal.value === formData.goal)
  );

  // 動態表單驗證規則
  const formRules = computed<FormRules>(() => ({
    age: [
      { required: true, message: '請輸入年齡', trigger: 'blur' },
      { validator: createValidator(validateAge), trigger: 'blur' }
    ],
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
    ],
    gender: [
      { required: true, message: '請選擇性別', trigger: 'change' }
    ],
    activityLevel: [
      { required: true, message: '請選擇活動水平', trigger: 'change' }
    ],
    goal: [
      { required: true, message: '請選擇目標', trigger: 'change' }
    ]
  }));

  /**
   * 本地 BMR 計算（基礎代謝率）
   */
  const calculateLocalBMR = () => {
    const age = parseInt(formData.age);
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);
    
    if (!age || !height || !weight) return null;

    let heightInCm = height;
    let weightInKg = weight;

    // 單位轉換
    if (formData.unit === 'imperial') {
      heightInCm = height * 30.48; // 英尺轉公分
      weightInKg = weight * 0.453592; // 磅轉公斤
    }

    // Mifflin-St Jeor 公式
    let bmr;
    if (formData.gender === 'male') {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age + 5;
    } else {
      bmr = 10 * weightInKg + 6.25 * heightInCm - 5 * age - 161;
    }

    return Math.round(bmr);
  };

  /**
   * 本地 TDEE 計算
   */
  const calculateLocalTDEE = () => {
    const bmr = calculateLocalBMR();
    if (!bmr || !selectedActivityLevel.value) return null;

    const tdee = bmr * selectedActivityLevel.value.multiplier;
    return Math.round(tdee);
  };

  /**
   * 計算目標卡路里
   */
  const calculateTargetCalories = () => {
    const tdee = calculateLocalTDEE();
    if (!tdee || !selectedGoal.value) return null;

    const target = tdee * (1 + selectedGoal.value.modifier);
    return Math.round(target);
  };

  // 即時預覽
  const previewBMR = computed(() => calculateLocalBMR());
  const previewTDEE = computed(() => calculateLocalTDEE());
  const previewTarget = computed(() => calculateTargetCalories());

  /**
   * 提交 TDEE 計算
   */
  const calculateTDEE = async () => {
    if (!formRef.value) return;

    // 表單驗證
    const isValid = await formRef.value.validate().catch(() => false);
    if (!isValid) return;

    isSubmitting.value = true;
    try {
      const submitData: FormSubmissionRequest = {
        formId: 'tdee-calculator',
        data: {
          age: parseInt(formData.age),
          gender: formData.gender,
          height: parseFloat(formData.height),
          weight: parseFloat(formData.weight),
          activityLevel: formData.activityLevel,
          goal: formData.goal,
          unit: formData.unit
        }
      };

      const result = await formsStore.submitForm(submitData) as TDEECalculationResult;
      calculationResult.value = result;
      showResultDialog.value = true;

      ElNotification({
        title: 'TDEE 計算完成',
        message: `您的每日總消耗量為 ${result.tdee} 卡路里`,
        type: 'success',
        duration: 5000
      });

      // 重新載入歷史記錄
      await formsStore.loadFormRecords('tdee-calculator', 1, 10);

    } catch (error) {
      ElMessage.error('計算失敗，請檢查網絡連接後重試');
      console.error('TDEE calculation error:', error);
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
    
    // 轉換身高
    if (formData.height) {
      const currentHeight = parseFloat(formData.height);
      if (newUnit === 'imperial') {
        formData.height = (currentHeight / 30.48).toFixed(1);
      } else {
        formData.height = (currentHeight * 30.48).toFixed(0);
      }
    }

    // 轉換體重
    if (formData.weight) {
      const currentWeight = parseFloat(formData.weight);
      if (newUnit === 'imperial') {
        formData.weight = (currentWeight * 2.20462).toFixed(1);
      } else {
        formData.weight = (currentWeight / 2.20462).toFixed(1);
      }
    }

    formData.unit = newUnit;
  };

  /**
   * 載入歷史記錄數據
   */
  const loadFromHistory = (record: any) => {
    formData.age = record.age?.toString() || '';
    formData.gender = record.gender || 'male';
    formData.height = record.height?.toString() || '';
    formData.weight = record.weight?.toString() || '';
    formData.activityLevel = record.activityLevel || 'sedentary';
    formData.goal = record.goal || 'maintain';
    formData.unit = record.unit || 'metric';
  };

  /**
   * 獲取 TDEE 趨勢數據
   */
  const getTDEETrend = () => {
    const records = formsStore.getFormRecords('tdee-calculator');
    if (!records || records.length === 0) return [];

    return records
      .slice(-10)
      .map(record => ({
        date: new Date(record.createdAt).toLocaleDateString(),
        bmr: record.bmrResult,
        tdee: record.tdeeResult,
        targetCalories: record.targetCalories,
        goal: record.goal
      }))
      .reverse();
  };

  /**
   * 獲取營養建議
   */
  const getNutritionAdvice = () => {
    const targetCalories = previewTarget.value;
    if (!targetCalories) return null;

    // 基本營養分配建議
    const protein = Math.round(targetCalories * 0.25 / 4); // 25% 蛋白質，每克4卡
    const carbs = Math.round(targetCalories * 0.45 / 4);   // 45% 碳水化合物，每克4卡
    const fats = Math.round(targetCalories * 0.30 / 9);    // 30% 脂肪，每克9卡

    return {
      totalCalories: targetCalories,
      protein: { grams: protein, calories: protein * 4 },
      carbs: { grams: carbs, calories: carbs * 4 },
      fats: { grams: fats, calories: fats * 9 }
    };
  };

  /**
   * 檢查表單是否完整
   */
  const isFormComplete = computed(() => {
    return formData.age.trim() !== '' &&
           formData.height.trim() !== '' &&
           formData.weight.trim() !== '' &&
           formData.gender &&
           formData.activityLevel &&
           formData.goal;
  });

  /**
   * 獲取表單提示
   */
  const getFormHints = () => {
    const hints = [];
    
    if (isMetric.value) {
      hints.push('身高請以公分為單位，體重請以公斤為單位');
    } else {
      hints.push('身高請以英尺為單位，體重請以磅為單位');
    }
    
    hints.push('活動水平會顯著影響您的 TDEE 計算結果');
    hints.push('選擇適合的目標以獲得個性化的卡路里建議');
    
    return hints;
  };

  // 監聽單位變化
  watch(() => formData.unit, () => {
    if (formRef.value) {
      formRef.value.clearValidate(['height', 'weight']);
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
    
    // 選項
    activityLevels,
    goalOptions,
    
    // 計算屬性
    isMetric,
    heightLabel,
    weightLabel,
    selectedActivityLevel,
    selectedGoal,
    previewBMR,
    previewTDEE,
    previewTarget,
    isFormComplete,
    
    // 方法
    calculateTDEE,
    resetForm,
    toggleUnit,
    loadFromHistory,
    getTDEETrend,
    getNutritionAdvice,
    getFormHints
  };
}