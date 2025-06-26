// frontend/src/utils/constants.ts
// 應用程序常量定義 - 統一管理所有常量

/**
 * API 相關常量
 */
export const API_CONSTANTS = {
  // 基礎配置
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
  TIMEOUT: 10000, // 10秒超時
  
  // 請求重試配置
  RETRY: {
    ATTEMPTS: 3,
    DELAY: 1000,
    BACKOFF_FACTOR: 2
  },
  
  // 認證相關
  AUTH: {
    TOKEN_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'user_info',
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分鐘前刷新Token
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24小時會話超時
  },
  
  // 緩存配置
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5分鐘
    FORM_CONFIG_TTL: 15 * 60 * 1000, // 15分鐘
    USER_PROFILE_TTL: 10 * 60 * 1000, // 10分鐘
    STATISTICS_TTL: 30 * 60 * 1000, // 30分鐘
  },
  
  // 文件上傳
  UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  }
} as const;

/**
 * 表單相關常量
 */
export const FORM_CONSTANTS = {
  // 表單類型
  TYPES: {
    BMI_CALCULATOR: 'bmi-calculator',
    TDEE_CALCULATOR: 'tdee-calculator',
  },
  
  // BMI 相關
  BMI: {
    CATEGORIES: [
      { min: 0, max: 18.5, name: '體重過輕', color: '#409EFF', healthy: false },
      { min: 18.5, max: 24, name: '正常體重', color: '#67C23A', healthy: true },
      { min: 24, max: 28, name: '體重過重', color: '#E6A23C', healthy: false },
      { min: 28, max: Infinity, name: '肥胖', color: '#F56C6C', healthy: false }
    ],
    UNITS: {
      METRIC: {
        HEIGHT: { min: 50, max: 250, unit: '公分', step: 1 },
        WEIGHT: { min: 20, max: 300, unit: '公斤', step: 0.1 }
      },
      IMPERIAL: {
        HEIGHT: { min: 1.5, max: 8.5, unit: '英尺', step: 0.1 },
        WEIGHT: { min: 44, max: 660, unit: '磅', step: 0.1 }
      }
    }
  },
  
  // TDEE 相關
  TDEE: {
    ACTIVITY_LEVELS: [
      { value: 'sedentary', label: '久坐不動', multiplier: 1.2 },
      { value: 'light', label: '輕度活動', multiplier: 1.375 },
      { value: 'moderate', label: '中度活動', multiplier: 1.55 },
      { value: 'active', label: '重度活動', multiplier: 1.725 },
      { value: 'extreme', label: '極重度活動', multiplier: 1.9 }
    ],
    GOALS: [
      { value: 'lose', label: '減重', modifier: -0.2, color: '#409EFF' },
      { value: 'maintain', label: '維持', modifier: 0, color: '#67C23A' },
      { value: 'gain', label: '增重', modifier: 0.2, color: '#E6A23C' }
    ],
    AGE_RANGE: { min: 10, max: 100 },
    NUTRITION_RATIOS: {
      PROTEIN: 0.25,
      CARBS: 0.45,
      FATS: 0.30
    }
  },
  
  // 驗證規則
  VALIDATION: {
    USERNAME: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 20,
      PATTERN: /^[a-zA-Z0-9_-]+$/
    },
    PASSWORD: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 50,
      REQUIRE_NUMBER: true,
      REQUIRE_LETTER: true
    },
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    PHONE: {
      TAIWAN_PATTERN: /^09\d{8}$/,
      INTERNATIONAL_PATTERN: /^\+886[9]\d{8}$/
    }
  }
} as const;

/**
 * UI 相關常量
 */
export const UI_CONSTANTS = {
  // Element Plus 主題配置
  THEME: {
    PRIMARY_COLOR: '#409EFF',
    SUCCESS_COLOR: '#67C23A',
    WARNING_COLOR: '#E6A23C',
    DANGER_COLOR: '#F56C6C',
    INFO_COLOR: '#909399'
  },
  
  // 分頁配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZES: [10, 20, 50, 100],
    LAYOUT: 'total, sizes, prev, pager, next, jumper'
  },
  
  // 表格配置
  TABLE: {
    MAX_HEIGHT: 600,
    ROW_HEIGHT: 50,
    HEADER_HEIGHT: 55
  },
  
  // 消息提示配置
  MESSAGE: {
    DURATION: 3000,
    SUCCESS_DURATION: 2000,
    ERROR_DURATION: 5000,
    WARNING_DURATION: 4000
  },
  
  // 加載配置
  LOADING: {
    MIN_DURATION: 500, // 最小顯示時間
    DELAY: 300, // 延遲顯示時間
    TEXT: '載入中...'
  },
  
  // 動畫配置
  ANIMATION: {
    DURATION: 300,
    EASING: 'ease-in-out'
  },
  
  // 響應式斷點
  BREAKPOINTS: {
    XS: 576,
    SM: 768,
    MD: 992,
    LG: 1200,
    XL: 1920
  }
} as const;

/**
 * 路由相關常量
 */
export const ROUTE_CONSTANTS = {
  // 默認路由
  DEFAULT_ROUTES: {
    HOME: '/',
    LOGIN: '/auth/login',
    DASHBOARD: '/user/dashboard',
    FORMS: '/forms',
    ERROR: '/error/404'
  },
  
  // 路由元數據鍵
  META_KEYS: {
    TITLE: 'title',
    REQUIRES_AUTH: 'requiresAuth',
    ALLOW_GUEST: 'allowGuest',
    HIDE_FOR_AUTH: 'hideForAuthenticated',
    REQUIRES_GUEST: 'requiresGuest',
    REQUIRES_ROLE: 'requiresRole',
    FORM_ID: 'formId'
  },
  
  // 查詢參數
  QUERY_PARAMS: {
    REDIRECT: 'redirect',
    TAB: 'tab',
    PAGE: 'page',
    SIZE: 'size',
    SORT: 'sort',
    FILTER: 'filter'
  }
} as const;

/**
 * 本地存儲相關常量
 */
export const STORAGE_CONSTANTS = {
  // 存儲鍵前綴
  PREFIX: 'dfs_', // Dynamic Form System
  
  // 認證相關
  AUTH: {
    TOKEN: 'dfs_auth_token',
    REFRESH_TOKEN: 'dfs_refresh_token',
    USER: 'dfs_user_info',
    REMEMBER_ME: 'dfs_remember_me',
    LAST_LOGIN: 'dfs_last_login'
  },
  
  // 用戶偏好設置
  PREFERENCES: {
    THEME: 'dfs_theme',
    LANGUAGE: 'dfs_language',
    TIMEZONE: 'dfs_timezone',
    PAGE_SIZE: 'dfs_page_size',
    SIDEBAR_COLLAPSED: 'dfs_sidebar_collapsed'
  },
  
  // 表單相關
  FORMS: {
    DRAFT: 'dfs_form_draft_',
    LAST_USED: 'dfs_last_used_form',
    UNIT_PREFERENCE: 'dfs_unit_preference'
  },
  
  // 緩存
  CACHE: {
    FORM_CONFIGS: 'dfs_form_configs',
    USER_STATISTICS: 'dfs_user_statistics',
    RECENT_ACTIVITIES: 'dfs_recent_activities'
  }
} as const;

/**
 * 錯誤代碼常量
 */
export const ERROR_CONSTANTS = {
  // HTTP 狀態碼
  HTTP: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  },
  
  // 業務錯誤代碼
  BUSINESS: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    FORM_NOT_FOUND: 'FORM_NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
  },
  
  // 錯誤消息
  MESSAGES: {
    NETWORK_ERROR: '網絡連接錯誤，請檢查網絡設置',
    SERVER_ERROR: '服務器錯誤，請稍後重試',
    TIMEOUT_ERROR: '請求超時，請重試',
    UNKNOWN_ERROR: '發生未知錯誤',
    FORM_VALIDATION_ERROR: '表單驗證失敗',
    PERMISSION_ERROR: '權限不足',
    NOT_FOUND_ERROR: '請求的資源不存在'
  }
} as const;

/**
 * 格式化相關常量
 */
export const FORMAT_CONSTANTS = {
  // 日期時間格式
  DATE_TIME: {
    FULL: 'YYYY-MM-DD HH:mm:ss',
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    MONTH: 'YYYY-MM',
    YEAR: 'YYYY',
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  },
  
  // 數字格式
  NUMBER: {
    DECIMAL_PLACES: 1,
    THOUSAND_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
    CURRENCY_SYMBOL: '¥'
  },
  
  // 文件大小單位
  FILE_SIZE: {
    UNITS: ['Bytes', 'KB', 'MB', 'GB', 'TB'],
    BASE: 1024
  }
} as const;

/**
 * 功能開關常量
 */
export const FEATURE_FLAGS = {
  // 功能開關
  ENABLE_GUEST_MODE: true,
  ENABLE_DARK_MODE: true,
  ENABLE_EXPORT_FEATURE: true,
  ENABLE_STATISTICS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: false,
  
  // 實驗性功能
  EXPERIMENTAL: {
    ENABLE_PWA: false,
    ENABLE_VOICE_INPUT: false,
    ENABLE_AI_SUGGESTIONS: false
  },
  
  // 環境相關
  DEVELOPMENT: {
    ENABLE_DEBUG_LOGS: true,
    ENABLE_MOCK_DATA: false,
    ENABLE_PERFORMANCE_MONITOR: true
  }
} as const;

/**
 * 第三方服務常量
 */
export const THIRD_PARTY_CONSTANTS = {
  // Google Analytics
  GA: {
    TRACKING_ID: import.meta.env.VITE_GA_TRACKING_ID || '',
    EVENTS: {
      FORM_SUBMIT: 'form_submit',
      USER_REGISTER: 'user_register',
      FEATURE_USE: 'feature_use'
    }
  },
  
  // CDN 配置
  CDN: {
    BASE_URL: 'https://cdn.jsdelivr.net',
    AVATAR_URL: 'https://api.dicebear.com/7.x/initials/svg',
    PLACEHOLDER_IMAGE: 'https://via.placeholder.com'
  }
} as const;

/**
 * 導出所有常量的聯合類型
 */
export type AppConstants = {
  API: typeof API_CONSTANTS;
  FORM: typeof FORM_CONSTANTS;
  UI: typeof UI_CONSTANTS;
  ROUTE: typeof ROUTE_CONSTANTS;
  STORAGE: typeof STORAGE_CONSTANTS;
  ERROR: typeof ERROR_CONSTANTS;
  FORMAT: typeof FORMAT_CONSTANTS;
  FEATURE: typeof FEATURE_FLAGS;
  THIRD_PARTY: typeof THIRD_PARTY_CONSTANTS;
};

/**
 * 常量工具函數
 */
export const constantsUtils = {
  /**
   * 獲取 BMI 分類
   */
  getBMICategory: (bmi: number) => {
    return FORM_CONSTANTS.BMI.CATEGORIES.find(
      category => bmi >= category.min && bmi < category.max
    );
  },
  
  /**
   * 獲取活動水平配置
   */
  getActivityLevel: (value: string) => {
    return FORM_CONSTANTS.TDEE.ACTIVITY_LEVELS.find(
      level => level.value === value
    );
  },
  
  /**
   * 獲取目標配置
   */
  getGoal: (value: string) => {
    return FORM_CONSTANTS.TDEE.GOALS.find(
      goal => goal.value === value
    );
  },
  
  /**
   * 獲取錯誤消息
   */
  getErrorMessage: (code: string) => {
    return ERROR_CONSTANTS.MESSAGES[code as keyof typeof ERROR_CONSTANTS.MESSAGES] 
      || ERROR_CONSTANTS.MESSAGES.UNKNOWN_ERROR;
  },
  
  /**
   * 檢查功能是否啟用
   */
  isFeatureEnabled: (feature: keyof typeof FEATURE_FLAGS) => {
    return FEATURE_FLAGS[feature];
  },
  
  /**
   * 生成存儲鍵
   */
  generateStorageKey: (category: keyof typeof STORAGE_CONSTANTS, key: string) => {
    return `${STORAGE_CONSTANTS.PREFIX}${category}_${key}`;
  }
};

/**
 * 環境變量常量
 */
export const ENV_CONSTANTS = {
  NODE_ENV: import.meta.env.NODE_ENV,
  IS_DEVELOPMENT: import.meta.env.NODE_ENV === 'development',
  IS_PRODUCTION: import.meta.env.NODE_ENV === 'production',
  IS_TEST: import.meta.env.NODE_ENV === 'test',
  
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  APP_TITLE: import.meta.env.VITE_APP_TITLE || '動態表單系統',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  ENABLE_MOCK: import.meta.env.VITE_ENABLE_MOCK === 'true'
} as const;