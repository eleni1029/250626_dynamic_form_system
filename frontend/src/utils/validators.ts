// frontend/src/utils/validators.ts
// 驗證工具函數 - 通用驗證邏輯和規則

import type { FormItemRule } from 'element-plus';

/**
 * 基礎驗證函數類型
 */
export type ValidatorFunction = (value: any) => string | true;

/**
 * 驗證規則配置
 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message?: string;
  trigger?: 'blur' | 'change';
  validator?: ValidatorFunction;
}

/**
 * 數字範圍驗證
 */
export const validateNumberRange = (
  min: number, 
  max: number, 
  fieldName: string,
  decimalPlaces = 1
): ValidatorFunction => {
  return (value: any): string | true => {
    // 空值檢查
    if (value === '' || value === null || value === undefined) {
      return `請輸入${fieldName}`;
    }

    // 數字轉換
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    // 有效性檢查
    if (isNaN(num)) {
      return `請輸入有效的${fieldName}數值`;
    }

    // 範圍檢查
    if (num < min || num > max) {
      return `${fieldName}應在 ${min}-${max} 之間`;
    }

    // 小數位數檢查
    if (decimalPlaces >= 0) {
      const decimalPart = value.toString().split('.')[1];
      if (decimalPart && decimalPart.length > decimalPlaces) {
        return `${fieldName}最多保留 ${decimalPlaces} 位小數`;
      }
    }

    return true;
  };
};

/**
 * 整數驗證
 */
export const validateInteger = (
  min: number, 
  max: number, 
  fieldName: string
): ValidatorFunction => {
  return (value: any): string | true => {
    if (value === '' || value === null || value === undefined) {
      return `請輸入${fieldName}`;
    }

    const num = typeof value === 'string' ? parseInt(value) : Number(value);
    
    if (isNaN(num) || !Number.isInteger(num)) {
      return `${fieldName}必須是整數`;
    }

    if (num < min || num > max) {
      return `${fieldName}應在 ${min}-${max} 之間`;
    }

    return true;
  };
};

/**
 * 年齡驗證器
 */
export const validateAge = validateInteger(10, 120, '年齡');

/**
 * 身高驗證器（公制 - 公分）
 */
export const validateHeightMetric = validateNumberRange(50, 250, '身高', 0);

/**
 * 身高驗證器（英制 - 英尺）
 */
export const validateHeightImperial = validateNumberRange(1.5, 8.5, '身高', 1);

/**
 * 體重驗證器（公制 - 公斤）
 */
export const validateWeightMetric = validateNumberRange(20, 300, '體重', 1);

/**
 * 體重驗證器（英制 - 磅）
 */
export const validateWeightImperial = validateNumberRange(44, 660, '體重', 1);

/**
 * 電子郵件驗證
 */
export const validateEmail: ValidatorFunction = (value: string): string | true => {
  if (!value || value.trim() === '') {
    return '請輸入電子郵件地址';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return '請輸入有效的電子郵件地址';
  }

  return true;
};

/**
 * 密碼強度驗證
 */
export const validatePassword: ValidatorFunction = (value: string): string | true => {
  if (!value) {
    return '請輸入密碼';
  }

  if (value.length < 8) {
    return '密碼長度至少 8 個字符';
  }

  if (value.length > 50) {
    return '密碼長度不能超過 50 個字符';
  }

  // 檢查是否包含至少一個數字
  if (!/\d/.test(value)) {
    return '密碼必須包含至少一個數字';
  }

  // 檢查是否包含至少一個字母
  if (!/[a-zA-Z]/.test(value)) {
    return '密碼必須包含至少一個字母';
  }

  return true;
};

/**
 * 確認密碼驗證
 */
export const validateConfirmPassword = (originalPassword: string): ValidatorFunction => {
  return (value: string): string | true => {
    if (!value) {
      return '請確認密碼';
    }

    if (value !== originalPassword) {
      return '兩次輸入的密碼不一致';
    }

    return true;
  };
};

/**
 * 用戶名驗證
 */
export const validateUsername: ValidatorFunction = (value: string): string | true => {
  if (!value || value.trim() === '') {
    return '請輸入用戶名';
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < 3) {
    return '用戶名至少 3 個字符';
  }

  if (trimmedValue.length > 20) {
    return '用戶名不能超過 20 個字符';
  }

  // 用戶名只能包含字母、數字、下劃線和連字符
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmedValue)) {
    return '用戶名只能包含字母、數字、下劃線和連字符';
  }

  // 不能以數字開頭
  if (/^\d/.test(trimmedValue)) {
    return '用戶名不能以數字開頭';
  }

  return true;
};

/**
 * 手機號碼驗證（支持多種格式）
 */
export const validatePhoneNumber: ValidatorFunction = (value: string): string | true => {
  if (!value || value.trim() === '') {
    return '請輸入手機號碼';
  }

  // 移除所有空格和連字符
  const cleanValue = value.replace(/[\s-]/g, '');

  // 台灣手機號碼格式：09xxxxxxxx
  const taiwanMobileRegex = /^09\d{8}$/;
  
  // 國際格式：+886 開頭
  const internationalRegex = /^\+886[9]\d{8}$/;

  if (taiwanMobileRegex.test(cleanValue) || internationalRegex.test(cleanValue)) {
    return true;
  }

  return '請輸入有效的手機號碼（例如：0912345678）';
};

/**
 * 必填驗證
 */
export const validateRequired = (fieldName: string): ValidatorFunction => {
  return (value: any): string | true => {
    if (value === null || value === undefined || value === '') {
      return `請輸入${fieldName}`;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return `請輸入${fieldName}`;
    }

    if (Array.isArray(value) && value.length === 0) {
      return `請選擇${fieldName}`;
    }

    return true;
  };
};

/**
 * 字符長度驗證
 */
export const validateLength = (
  min: number, 
  max: number, 
  fieldName: string
): ValidatorFunction => {
  return (value: string): string | true => {
    if (!value) {
      return `請輸入${fieldName}`;
    }

    const length = value.trim().length;

    if (length < min) {
      return `${fieldName}至少 ${min} 個字符`;
    }

    if (length > max) {
      return `${fieldName}不能超過 ${max} 個字符`;
    }

    return true;
  };
};

/**
 * URL 驗證
 */
export const validateURL: ValidatorFunction = (value: string): string | true => {
  if (!value || value.trim() === '') {
    return '請輸入網址';
  }

  try {
    new URL(value.trim());
    return true;
  } catch {
    return '請輸入有效的網址（例如：https://example.com）';
  }
};

/**
 * 日期驗證
 */
export const validateDate = (
  minDate?: Date, 
  maxDate?: Date, 
  fieldName = '日期'
): ValidatorFunction => {
  return (value: Date | string): string | true => {
    if (!value) {
      return `請選擇${fieldName}`;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return `請輸入有效的${fieldName}`;
    }

    if (minDate && date < minDate) {
      return `${fieldName}不能早於 ${minDate.toLocaleDateString()}`;
    }

    if (maxDate && date > maxDate) {
      return `${fieldName}不能晚於 ${maxDate.toLocaleDateString()}`;
    }

    return true;
  };
};

/**
 * 文件大小驗證
 */
export const validateFileSize = (maxSizeMB: number): ValidatorFunction => {
  return (file: File): string | true => {
    if (!file) {
      return '請選擇文件';
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `文件大小不能超過 ${maxSizeMB}MB`;
    }

    return true;
  };
};

/**
 * 文件類型驗證
 */
export const validateFileType = (allowedTypes: string[]): ValidatorFunction => {
  return (file: File): string | true => {
    if (!file) {
      return '請選擇文件';
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return `只允許上傳 ${allowedTypes.join(', ')} 格式的文件`;
    }

    return true;
  };
};

/**
 * 創建 Element Plus 表單規則
 */
export const createFormRule = (
  validator: ValidatorFunction,
  required = false,
  trigger: 'blur' | 'change' = 'blur'
): FormItemRule => {
  return {
    required,
    validator: (rule: any, value: any, callback: (error?: Error) => void) => {
      const result = validator(value);
      if (result === true) {
        callback();
      } else {
        callback(new Error(result));
      }
    },
    trigger
  };
};

/**
 * 創建多個驗證規則
 */
export const createFormRules = (
  validators: ValidatorFunction[],
  required = false,
  trigger: 'blur' | 'change' = 'blur'
): FormItemRule[] => {
  return validators.map(validator => createFormRule(validator, required, trigger));
};

/**
 * 組合驗證器 - 多個驗證器順序執行
 */
export const combineValidators = (...validators: ValidatorFunction[]): ValidatorFunction => {
  return (value: any): string | true => {
    for (const validator of validators) {
      const result = validator(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  };
};

/**
 * 預定義的常用驗證規則組合
 */
export const commonRules = {
  // 必填文本
  requiredText: (fieldName: string) => [
    createFormRule(validateRequired(fieldName), true)
  ],

  // 電子郵件
  email: [
    createFormRule(validateRequired('電子郵件'), true),
    createFormRule(validateEmail)
  ],

  // 密碼
  password: [
    createFormRule(validateRequired('密碼'), true),
    createFormRule(validatePassword)
  ],

  // 用戶名
  username: [
    createFormRule(validateRequired('用戶名'), true),
    createFormRule(validateUsername)
  ],

  // 手機號碼
  phone: [
    createFormRule(validateRequired('手機號碼'), true),
    createFormRule(validatePhoneNumber)
  ],

  // 年齡
  age: [
    createFormRule(validateRequired('年齡'), true),
    createFormRule(validateAge)
  ],

  // 身高（公制）
  heightMetric: [
    createFormRule(validateRequired('身高'), true),
    createFormRule(validateHeightMetric)
  ],

  // 體重（公制）
  weightMetric: [
    createFormRule(validateRequired('體重'), true),
    createFormRule(validateWeightMetric)
  ]
};