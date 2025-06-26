// frontend/src/utils/api.ts
// Axios 配置、攔截器和 API 調用封裝

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  ApiError,
  HttpMethod,
  ApiRequestConfig 
} from '@/types/api';

/**
 * API 基礎配置
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  timeout: 30000, // 30 秒超時
  withCredentials: true, // 支援 cookies
};

/**
 * 創建 Axios 實例
 */
export const apiClient: AxiosInstance = axios.create(API_CONFIG);

/**
 * Token 管理
 */
export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  /**
   * 獲取 Token
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * 設置 Token
   */
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * 移除 Token
   */
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 獲取 Refresh Token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 設置 Refresh Token
   */
  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * 檢查 Token 是否有效
   */
  static isTokenValid(token: string): boolean {
    if (!token) return false;
    
    try {
      // 解析 JWT token 檢查過期時間
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }
}

/**
 * 請求攔截器
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 Token 到請求頭
    const token = TokenManager.getToken();
    if (token && TokenManager.isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加請求時間戳
    config.metadata = { startTime: Date.now() };

    // 開發環境下記錄請求
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * 響應攔截器
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 計算請求耗時
    const config = response.config as any;
    const duration = config.metadata 
      ? Date.now() - config.metadata.startTime 
      : 0;

    // 開發環境下記錄響應
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        duration: `${duration}ms`,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // 開發環境下記錄錯誤
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.response?.status} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // 處理 401 未授權錯誤
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 嘗試刷新 Token
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { token } = response.data.data;
          TokenManager.setToken(token);

          // 重新發送原始請求
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失敗，清除 Token 並跳轉到登錄頁
        TokenManager.removeToken();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    // 處理網路錯誤
    if (!error.response) {
      const networkError: ApiError = {
        success: false,
        message: '網路連接失敗，請檢查您的網路設置',
        code: 'NETWORK_ERROR'
      };
      return Promise.reject(networkError);
    }

    // 統一錯誤格式
    const apiError: ApiError = {
      success: false,
      message: error.response.data?.message || '請求失敗',
      error: error.response.data?.error,
      code: error.response.data?.code || `HTTP_${error.response.status}`,
      errors: error.response.data?.errors,
    };

    return Promise.reject(apiError);
  }
);

/**
 * API 請求封裝類
 */
export class ApiService {
  /**
   * 通用請求方法
   */
  static async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.request({
        url: config.url,
        method: config.method,
        data: config.data,
        params: config.params,
        headers: config.headers,
        timeout: config.timeout,
      });

      return response.data as ApiResponse<T>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET 請求
   */
  static async get<T = any>(
    url: string, 
    params?: Record<string, any>,
    config?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'GET',
      params,
      ...config,
    });
  }

  /**
   * POST 請求
   */
  static async post<T = any>(
    url: string, 
    data?: any,
    config?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      ...config,
    });
  }

  /**
   * PUT 請求
   */
  static async put<T = any>(
    url: string, 
    data?: any,
    config?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      data,
      ...config,
    });
  }

  /**
   * DELETE 請求
   */
  static async delete<T = any>(
    url: string,
    config?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      ...config,
    });
  }

  /**
   * PATCH 請求
   */
  static async patch<T = any>(
    url: string, 
    data?: any,
    config?: Partial<AxiosRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      url,
      method: 'PATCH',
      data,
      ...config,
    });
  }

  /**
   * 分頁請求
   */
  static async getPaginated<T = any>(
    url: string,
    page: number = 1,
    limit: number = 10,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.get<T[]>(url, {
      page,
      limit,
      ...params,
    });

    return response as unknown as PaginatedResponse<T>;
  }

  /**
   * 文件上傳
   */
  static async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      url,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // 上傳進度追蹤
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    } as any);
  }

  /**
   * 下載文件
   */
  static async downloadFile(
    url: string,
    filename?: string,
    params?: Record<string, any>
  ): Promise<void> {
    try {
      const response = await apiClient.get(url, {
        params,
        responseType: 'blob',
      });

      // 創建下載連結
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `download_${Date.now()}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理 URL
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('文件下載失敗:', error);
      throw error;
    }
  }
}

/**
 * 健康檢查
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await ApiService.get('/health');
    return response.success;
  } catch {
    return false;
  }
};

/**
 * 測試數據庫連接
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await ApiService.get('/db/test');
    return response.success;
  } catch {
    return false;
  }
};

/**
 * 重試機制包裝器
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        throw lastError;
      }

      // 指數退避延遲
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

/**
 * 請求去重
 */
const pendingRequests = new Map<string, Promise<any>>();

export const withDeduplication = async <T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> => {
  // 如果已有相同的請求在進行中，返回該請求的 Promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // 創建新請求
  const promise = fn().finally(() => {
    // 請求完成後清除記錄
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

/**
 * 請求取消管理器
 */
export class RequestCancelManager {
  private controllers = new Map<string, AbortController>();

  /**
   * 創建可取消的請求
   */
  createCancelableRequest<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // 取消之前的同類請求
    this.cancel(key);

    // 創建新的控制器
    const controller = new AbortController();
    this.controllers.set(key, controller);

    return requestFn(controller.signal).finally(() => {
      this.controllers.delete(key);
    });
  }

  /**
   * 取消指定請求
   */
  cancel(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  /**
   * 取消所有請求
   */
  cancelAll(): void {
    this.controllers.forEach(controller => controller.abort());
    this.controllers.clear();
  }
}

// 導出全局請求取消管理器實例
export const globalRequestManager = new RequestCancelManager();

/**
 * API 響應緩存
 */
export class ApiCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * 設置緩存
   */
  static set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 獲取緩存
   */
  static get<T = any>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 檢查是否過期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 清除緩存
   */
  static clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 帶緩存的請求
   */
  static async getWithCache<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 嘗試從緩存獲取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 發送請求並緩存結果
    const data = await requestFn();
    this.set(key, data, ttl);
    return data;
  }
}

/**
 * 環境配置
 */
export const ENV_CONFIG = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5001',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

// 默認導出 API 服務
export default ApiService;