// frontend/src/utils/helpers.ts
// 輔助工具函數 - 通用工具和格式化函數

import type { FormRecord, BMICalculationResult, TDEECalculationResult } from '@/types/forms';

/**
 * 延遲執行函數
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 防抖函數
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * 節流函數
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 深拷貝對象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (obj instanceof Object) {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
};

/**
 * 生成唯一 ID
 */
export const generateId = (prefix = 'id'): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 格式化日期時間
 */
export const formatDateTime = (
  date: Date | string | number,
  format: 'full' | 'date' | 'time' | 'relative' = 'full'
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '無效日期';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  switch (format) {
    case 'relative':
      if (diffMins < 1) return '剛剛';
      if (diffMins < 60) return `${diffMins} 分鐘前`;
      if (diffHours < 24) return `${diffHours} 小時前`;
      if (diffDays < 7) return `${diffDays} 天前`;
      return dateObj.toLocaleDateString('zh-TW');
    
    case 'date':
      return dateObj.toLocaleDateString('zh-TW');
    
    case 'time':
      return dateObj.toLocaleTimeString('zh-TW');
    
    case 'full':
    default:
      return dateObj.toLocaleString('zh-TW');
  }
};

/**
 * 格式化數字
 */
export const formatNumber = (
  num: number,
  decimals = 1,
  separator = ','
): string => {
  if (isNaN(num)) return '0';
  
  const parts = num.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  
  return parts.join('.');
};

/**
 * 格式化百分比
 */
export const formatPercentage = (
  value: number,
  decimals = 1
): string => {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * 單位轉換工具
 */
export const unitConverter = {
  // 長度轉換
  length: {
    cmToFeet: (cm: number): number => cm / 30.48,
    feetToCm: (feet: number): number => feet * 30.48,
    cmToInches: (cm: number): number => cm / 2.54,
    inchesToCm: (inches: number): number => inches * 2.54
  },
  
  // 重量轉換
  weight: {
    kgToLbs: (kg: number): number => kg * 2.20462,
    lbsToKg: (lbs: number): number => lbs / 2.20462,
    kgToOz: (kg: number): number => kg * 35.274,
    ozToKg: (oz: number): number => oz / 35.274
  },
  
  // 溫度轉換
  temperature: {
    celsiusToFahrenheit: (c: number): number => (c * 9/5) + 32,
    fahrenheitToCelsius: (f: number): number => (f - 32) * 5/9
  }
};

/**
 * BMI 相關工具函數
 */
export const bmiUtils = {
  /**
   * 計算 BMI
   */
  calculate: (weight: number, height: number, unit: 'metric' | 'imperial' = 'metric'): number => {
    let weightKg = weight;
    let heightM = height;
    
    if (unit === 'imperial') {
      weightKg = unitConverter.weight.lbsToKg(weight);
      heightM = unitConverter.length.feetToCm(height) / 100;
    } else {
      heightM = height / 100; // 公分轉米
    }
    
    return weightKg / (heightM * heightM);
  },
  
  /**
   * 獲取 BMI 分類
   */
  getCategory: (bmi: number): { name: string; color: string; isHealthy: boolean } => {
    if (bmi < 18.5) {
      return { name: '體重過輕', color: '#409EFF', isHealthy: false };
    } else if (bmi < 24) {
      return { name: '正常體重', color: '#67C23A', isHealthy: true };
    } else if (bmi < 28) {
      return { name: '體重過重', color: '#E6A23C', isHealthy: false };
    } else {
      return { name: '肥胖', color: '#F56C6C', isHealthy: false };
    }
  },
  
  /**
   * 獲取健康建議
   */
  getAdvice: (bmi: number): string => {
    if (bmi < 18.5) {
      return '建議增加營養攝入，適當運動增加肌肉量';
    } else if (bmi < 24) {
      return '保持良好的飲食和運動習慣';
    } else if (bmi < 28) {
      return '建議控制飲食，增加運動量';
    } else {
      return '建議諮詢醫生，制定專業的減重計劃';
    }
  },
  
  /**
   * 計算理想體重範圍
   */
  getIdealWeightRange: (height: number, unit: 'metric' | 'imperial' = 'metric'): { min: number; max: number } => {
    let heightM = height;
    
    if (unit === 'imperial') {
      heightM = unitConverter.length.feetToCm(height) / 100;
    } else {
      heightM = height / 100;
    }
    
    const minWeight = 18.5 * (heightM * heightM);
    const maxWeight = 24 * (heightM * heightM);
    
    if (unit === 'imperial') {
      return {
        min: Math.round(unitConverter.weight.kgToLbs(minWeight) * 10) / 10,
        max: Math.round(unitConverter.weight.kgToLbs(maxWeight) * 10) / 10
      };
    }
    
    return {
      min: Math.round(minWeight * 10) / 10,
      max: Math.round(maxWeight * 10) / 10
    };
  }
};

/**
 * TDEE 相關工具函數
 */
export const tdeeUtils = {
  /**
   * 計算 BMR（基礎代謝率）- Mifflin-St Jeor 公式
   */
  calculateBMR: (
    weight: number, 
    height: number, 
    age: number, 
    gender: 'male' | 'female',
    unit: 'metric' | 'imperial' = 'metric'
  ): number => {
    let weightKg = weight;
    let heightCm = height;
    
    if (unit === 'imperial') {
      weightKg = unitConverter.weight.lbsToKg(weight);
      heightCm = unitConverter.length.feetToCm(height);
    }
    
    const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'male' ? baseBMR + 5 : baseBMR - 161;
  },
  
  /**
   * 活動係數
   */
  activityMultipliers: {
    sedentary: 1.2,      // 久坐不動
    light: 1.375,        // 輕度活動
    moderate: 1.55,      // 中度活動
    active: 1.725,       // 重度活動
    extreme: 1.9         // 極重度活動
  },
  
  /**
   * 計算 TDEE
   */
  calculateTDEE: (bmr: number, activityLevel: string): number => {
    const multiplier = tdeeUtils.activityMultipliers[activityLevel as keyof typeof tdeeUtils.activityMultipliers] || 1.2;
    return bmr * multiplier;
  },
  
  /**
   * 計算目標卡路里
   */
  calculateTargetCalories: (tdee: number, goal: 'lose' | 'maintain' | 'gain'): number => {
    switch (goal) {
      case 'lose':
        return tdee * 0.8; // 減少 20%
      case 'gain':
        return tdee * 1.2; // 增加 20%
      case 'maintain':
      default:
        return tdee;
    }
  },
  
  /**
   * 獲取營養分配建議
   */
  getNutritionBreakdown: (targetCalories: number) => {
    return {
      protein: {
        grams: Math.round(targetCalories * 0.25 / 4),
        calories: Math.round(targetCalories * 0.25),
        percentage: 25
      },
      carbs: {
        grams: Math.round(targetCalories * 0.45 / 4),
        calories: Math.round(targetCalories * 0.45),
        percentage: 45
      },
      fats: {
        grams: Math.round(targetCalories * 0.30 / 9),
        calories: Math.round(targetCalories * 0.30),
        percentage: 30
      }
    };
  }
};

/**
 * 數據導出工具
 */
export const exportUtils = {
  /**
   * 轉換為 CSV 格式
   */
  toCSV: (data: any[], headers: string[]): string => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 處理包含逗號的值
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value || '';
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  },
  
  /**
   * 格式化表單記錄用於導出
   */
  formatRecordsForExport: (records: FormRecord[], formType: string) => {
    return records.map(record => {
      const baseData = {
        '日期': formatDateTime(record.createdAt, 'full'),
        '創建時間': formatDateTime(record.createdAt, 'date')
      };
      
      switch (formType) {
        case 'bmi-calculator':
          return {
            ...baseData,
            '身高': record.height,
            '體重': record.weight,
            'BMI': record.bmiResult,
            '分類': record.bmiCategory,
            '單位': record.unit === 'metric' ? '公制' : '英制'
          };
        
        case 'tdee-calculator':
          return {
            ...baseData,
            '年齡': record.age,
            '性別': record.gender === 'male' ? '男' : '女',
            '身高': record.height,
            '體重': record.weight,
            '活動水平': record.activityLevel,
            '目標': record.goal,
            'BMR': record.bmrResult,
            'TDEE': record.tdeeResult,
            '目標卡路里': record.targetCalories,
            '單位': record.unit === 'metric' ? '公制' : '英制'
          };
        
        default:
          return baseData;
      }
    });
  },
  
  /**
   * 創建下載鏈接
   */
  downloadFile: (content: string, filename: string, type = 'text/csv'): void => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};

/**
 * 趨勢分析工具
 */
export const trendUtils = {
  /**
   * 計算變化趨勢
   */
  calculateTrend: (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = Math.abs(first) * 0.05; // 5% 變化閾值
    
    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  },
  
  /**
   * 計算平均值
   */
  calculateAverage: (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  },
  
  /**
   * 獲取趨勢圖表數據
   */
  getChartData: (records: FormRecord[], valueKey: string, labelKey?: string) => {
    return records.map((record, index) => ({
      index: index + 1,
      date: formatDateTime(record.createdAt, 'date'),
      value: record[valueKey as keyof FormRecord],
      label: labelKey ? record[labelKey as keyof FormRecord] : undefined
    }));
  }
};

/**
 * 本地存儲工具
 */
export const storageUtils = {
  /**
   * 獲取存儲項目
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  /**
   * 設置存儲項目
   */
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('存儲失敗:', error);
    }
  },
  
  /**
   * 移除存儲項目
   */
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('移除存儲失敗:', error);
    }
  },
  
  /**
   * 清空所有存儲
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('清空存儲失敗:', error);
    }
  }
};

/**
 * URL 工具
 */
export const urlUtils = {
  /**
   * 獲取查詢參數
   */
  getQueryParam: (name: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },
  
  /**
   * 設置查詢參數
   */
  setQueryParam: (name: string, value: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url.toString());
  },
  
  /**
   * 移除查詢參數
   */
  removeQueryParam: (name: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
  }
};

/**
 * 裝置檢測工具
 */
export const deviceUtils = {
  /**
   * 檢測是否為移動設備
   */
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  /**
   * 檢測是否為平板設備
   */
  isTablet: (): boolean => {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  },
  
  /**
   * 獲取螢幕尺寸類別
   */
  getScreenSize: (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
    const width = window.innerWidth;
    if (width < 576) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    return 'xl';
  }
};

/**
 * 錯誤處理工具
 */
export const errorUtils = {
  /**
   * 解析 API 錯誤
   */
  parseApiError: (error: any): string => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return '發生未知錯誤，請稍後重試';
  },
  
  /**
   * 記錄錯誤
   */
  logError: (error: any, context?: string): void => {
    console.error(`[${context || 'Error'}]:`, error);
    
    // 在生產環境中可以發送到錯誤追蹤服務
    if (process.env.NODE_ENV === 'production') {
      // 發送到錯誤追蹤服務
    }
  }
};