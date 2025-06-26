// frontend/src/types/api.ts
// API 響應和請求的 TypeScript 類型定義

/**
 * 基礎 API 響應結構
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

/**
 * 分頁響應結構
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * 錯誤響應結構
 */
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
  errors?: ValidationError[];
}

/**
 * 驗證錯誤結構
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * HTTP 請求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API 請求配置
 */
export interface ApiRequestConfig {
  url: string;
  method: HttpMethod;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * 認證相關 API 類型
 */
export namespace AuthAPI {
  // 登錄請求
  export interface LoginRequest {
    identifier: string; // 可以是 email 或 username
    password: string;
  }

  // 註冊請求
  export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
  }

  // 遊客升級請求
  export interface UpgradeGuestRequest {
    username: string;
    email: string;
    password: string;
  }

  // 密碼修改請求
  export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
  }

  // 認證響應
  export interface AuthResponse {
    user: {
      id: number;
      username?: string;
      email?: string;
      is_guest: boolean;
      avatar_url?: string;
    };
    token: string;
    expiresAt: string;
    isFirstLogin?: boolean;
  }

  // Token 驗證響應
  export interface ValidateTokenResponse {
    user: {
      id: number;
      username?: string;
      email?: string;
      is_guest: boolean;
      avatar_url?: string;
    };
    session: {
      id: number;
      expires_at: string;
    };
  }
}

/**
 * 用戶相關 API 類型
 */
export namespace UserAPI {
  // 用戶資料
  export interface UserProfile {
    id: number;
    username?: string;
    email?: string;
    is_guest: boolean;
    avatar_url?: string;
    created_at: string;
    last_active_at: string;
  }

  // 用戶資料更新請求
  export interface UpdateProfileRequest {
    username?: string;
    email?: string;
    avatar_url?: string;
  }

  // 專案訪問權限
  export interface ProjectAccess {
    id: number;
    name: string;
    description?: string;
    config_path: string;
    permission_level: string;
    has_access: boolean;
    guest_accessible: boolean;
  }

  // 用戶統計
  export interface UserStats {
    total_submissions: number;
    projects_accessed: number;
    last_activity: string;
    account_age_days: number;
    favorite_project?: string;
  }

  // 用戶偏好設置
  export interface UserPreference {
    key: string;
    value: any;
    description?: string;
    updated_at: string;
  }
}

/**
 * 表單相關 API 類型
 */
export namespace FormsAPI {
  // 表單配置
  export interface FormConfig {
    formId: string;
    name: string;
    description: string;
    version: string;
    tableName: string;
    guestAccessible: boolean;
    category?: string;
    tags?: string[];
    submitEndpoint: string;
    fields: FormField[];
    results?: FormResults;
  }

  // 表單字段定義
  export interface FormField {
    id: string;
    type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'radio' | 'checkbox';
    label: string;
    required: boolean;
    placeholder?: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: FormFieldOption[];
    validation?: FormFieldValidation;
  }

  // 表單字段選項
  export interface FormFieldOption {
    label: string;
    value: string;
  }

  // 表單字段驗證
  export interface FormFieldValidation {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  }

  // 表單結果配置
  export interface FormResults {
    display: Array<{
      key: string;
      label: string;
      unit?: string;
    }>;
    charts?: string[];
  }

  // BMI 計算請求
  export interface BMIRequest {
    height: number;
    weight: number;
    notes?: string;
  }

  // BMI 計算響應
  export interface BMIResponse {
    submission_id: number;
    calculations: {
      bmi: number;
      category: string;
      health_risk?: string;
      recommendations?: string[];
    };
    input_data: BMIRequest;
    created_at: string;
  }

  // TDEE 計算請求
  export interface TDEERequest {
    gender: 'male' | 'female';
    age: number;
    height: number;
    weight: number;
    activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
    goal?: 'lose_weight' | 'maintain' | 'gain_weight';
    body_fat_percentage?: number;
    notes?: string;
  }

  // TDEE 計算響應
  export interface TDEEResponse {
    submission_id: number;
    calculations: {
      bmr: number;
      tdee: number;
      target_calories?: number;
    };
    input_data: TDEERequest;
    created_at: string;
  }

  // 表單歷史記錄
  export interface FormSubmission {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    notes?: string;
  }

  // BMI 歷史記錄
  export interface BMISubmission extends FormSubmission {
    height: number;
    weight: number;
    bmi_result: number;
    bmi_category: string;
  }

  // TDEE 歷史記錄
  export interface TDEESubmission extends FormSubmission {
    gender: string;
    age: number;
    height: number;
    weight: number;
    activity_level: string;
    bmr: number;
    tdee: number;
    goal?: string;
    target_calories?: number;
    body_fat_percentage?: number;
  }

  // 統計數據
  export interface FormStats {
    total_submissions: number;
    latest_submission?: FormSubmission;
    average_values?: Record<string, number>;
    trends?: {
      current_value: number;
      previous_value?: number;
      change: number;
      change_percentage: number;
    };
    period_summary?: {
      days: number;
      min_value: number;
      max_value: number;
    };
  }
}

/**
 * 圖表數據類型
 */
export namespace ChartAPI {
  // 趨勢數據點
  export interface TrendDataPoint {
    date: string;
    value: number;
    category?: string;
    label?: string;
  }

  // 比較數據
  export interface ComparisonData {
    name: string;
    value: number;
    change?: number;
    change_percentage?: number;
  }

  // 圖表配置
  export interface ChartConfig {
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
  }
}

/**
 * 文件上傳類型
 */
export namespace FileAPI {
  // 文件上傳請求
  export interface UploadRequest {
    file: File;
    type: 'avatar' | 'document' | 'image';
  }

  // 文件上傳響應
  export interface UploadResponse {
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
  }
}

/**
 * 系統設置類型
 */
export namespace SystemAPI {
  // 系統健康狀態
  export interface HealthStatus {
    status: 'OK' | 'ERROR';
    message: string;
    timestamp: string;
    uptime?: number;
    memory?: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    environment?: string;
  }

  // 系統配置
  export interface SystemConfig {
    config_key: string;
    config_value: any;
    description?: string;
    updated_at: string;
  }
}

/**
 * WebSocket 消息類型
 */
export namespace WebSocketAPI {
  // 基礎消息結構
  export interface BaseMessage {
    type: string;
    timestamp: string;
    data?: any;
  }

  // 實時通知
  export interface NotificationMessage extends BaseMessage {
    type: 'notification';
    data: {
      title: string;
      message: string;
      level: 'info' | 'success' | 'warning' | 'error';
    };
  }

  // 數據更新通知
  export interface DataUpdateMessage extends BaseMessage {
    type: 'data_update';
    data: {
      entity: string;
      action: 'create' | 'update' | 'delete';
      id: number;
    };
  }
}

/**
 * 導出所有 API 相關類型的聯合類型
 */
export type AnyApiResponse = 
  | ApiResponse
  | PaginatedResponse
  | ApiError;

export type AnyAuthResponse = 
  | AuthAPI.AuthResponse
  | AuthAPI.ValidateTokenResponse;

export type AnyFormRequest = 
  | FormsAPI.BMIRequest
  | FormsAPI.TDEERequest;

export type AnyFormResponse = 
  | FormsAPI.BMIResponse
  | FormsAPI.TDEEResponse;