// frontend/src/stores/auth.ts
// 認證狀態管理 - Pinia Store

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { ApiService, TokenManager } from '@/utils/api';
import type { 
  AuthAPI, 
  UserAPI, 
  ApiError 
} from '@/types/api';

/**
 * 認證狀態接口
 */
interface AuthState {
  user: AuthAPI.AuthResponse['user'] | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  loginAttempts: number;
  lastLoginTime: number | null;
}

/**
 * 登錄表單接口
 */
interface LoginForm {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

/**
 * 註冊表單接口
 */
interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

/**
 * 認證 Store
 */
export const useAuthStore = defineStore('auth', () => {
  // ======================== 狀態 ========================
  
  const user = ref<AuthState['user']>(null);
  const token = ref<string | null>(TokenManager.getToken());
  const isLoading = ref(false);
  const loginAttempts = ref(0);
  const lastLoginTime = ref<number | null>(null);

  // ======================== 計算屬性 ========================
  
  /**
   * 是否已認證
   */
  const isAuthenticated = computed(() => {
    return !!(user.value && token.value && TokenManager.isTokenValid(token.value));
  });

  /**
   * 是否為遊客
   */
  const isGuest = computed(() => {
    return user.value?.is_guest ?? false;
  });

  /**
   * 是否為註冊用戶
   */
  const isRegisteredUser = computed(() => {
    return isAuthenticated.value && !isGuest.value;
  });

  /**
   * 用戶顯示名稱
   */
  const displayName = computed(() => {
    if (!user.value) return '';
    if (user.value.username) return user.value.username;
    if (user.value.email) return user.value.email;
    return `遊客 #${user.value.id}`;
  });

  /**
   * 用戶頭像
   */
  const userAvatar = computed(() => {
    return user.value?.avatar_url || '/default-avatar.png';
  });

  /**
   * 認證狀態摘要
   */
  const authSummary = computed(() => ({
    isAuthenticated: isAuthenticated.value,
    isGuest: isGuest.value,
    isRegisteredUser: isRegisteredUser.value,
    displayName: displayName.value,
    userId: user.value?.id || null,
    loginAttempts: loginAttempts.value,
  }));

  // ======================== 方法 ========================

  /**
   * 設置用戶信息
   */
  const setUser = (userData: AuthAPI.AuthResponse['user'] | null) => {
    user.value = userData;
  };

  /**
   * 設置 Token
   */
  const setToken = (newToken: string | null) => {
    token.value = newToken;
    if (newToken) {
      TokenManager.setToken(newToken);
    } else {
      TokenManager.removeToken();
    }
  };

  /**
   * 設置認證狀態
   */
  const setAuthData = (authResponse: AuthAPI.AuthResponse) => {
    setUser(authResponse.user);
    setToken(authResponse.token);
    lastLoginTime.value = Date.now();
    
    // 重置登錄嘗試次數
    loginAttempts.value = 0;
  };

  /**
   * 清除認證狀態
   */
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    lastLoginTime.value = null;
  };

  /**
   * 創建遊客用戶
   */
  const createGuest = async (): Promise<boolean> => {
    try {
      isLoading.value = true;
      
      const response = await ApiService.post<AuthAPI.AuthResponse>('/auth/guest');
      
      if (response.success && response.data) {
        setAuthData(response.data);
        
        ElNotification({
          title: '歡迎使用',
          message: '已為您創建遊客帳號，您可以開始使用表單功能',
          type: 'success',
          duration: 3000,
        });
        
        return true;
      }
      
      throw new Error(response.error || '創建遊客用戶失敗');
    } catch (error) {
      console.error('創建遊客失敗:', error);
      
      const errorMessage = (error as ApiError).message || '創建遊客用戶失敗';
      ElMessage.error(errorMessage);
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 用戶登錄
   */
  const login = async (loginForm: LoginForm): Promise<boolean> => {
    try {
      isLoading.value = true;
      loginAttempts.value++;

      const response = await ApiService.post<AuthAPI.AuthResponse>('/auth/login', {
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });

      if (response.success && response.data) {
        setAuthData(response.data);
        
        // 處理記住登錄
        if (loginForm.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        ElNotification({
          title: '登錄成功',
          message: `歡迎回來，${displayName.value}！`,
          type: 'success',
          duration: 3000,
        });

        return true;
      }

      throw new Error(response.error || '登錄失敗');
    } catch (error) {
      console.error('登錄失敗:', error);
      
      const apiError = error as ApiError;
      let errorMessage = '登錄失敗';
      
      if (apiError.code === 'INVALID_CREDENTIALS') {
        errorMessage = '用戶名或密碼錯誤';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      ElMessage.error(errorMessage);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 用戶註冊
   */
  const register = async (registerForm: RegisterForm): Promise<boolean> => {
    try {
      isLoading.value = true;

      // 客戶端驗證
      if (registerForm.password !== registerForm.confirmPassword) {
        ElMessage.error('密碼確認不一致');
        return false;
      }

      if (!registerForm.acceptTerms) {
        ElMessage.error('請同意服務條款');
        return false;
      }

      const response = await ApiService.post<AuthAPI.AuthResponse>('/auth/register', {
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
      });

      if (response.success && response.data) {
        setAuthData(response.data);

        ElNotification({
          title: '註冊成功',
          message: `歡迎加入，${displayName.value}！`,
          type: 'success',
          duration: 4000,
        });

        return true;
      }

      throw new Error(response.error || '註冊失敗');
    } catch (error) {
      console.error('註冊失敗:', error);
      
      const apiError = error as ApiError;
      let errorMessage = '註冊失敗';
      
      if (apiError.code === 'USER_EXISTS') {
        errorMessage = '用戶名或郵箱已存在';
      } else if (apiError.errors && apiError.errors.length > 0) {
        errorMessage = apiError.errors.map(e => e.message).join(', ');
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      ElMessage.error(errorMessage);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 遊客升級為註冊用戶
   */
  const upgradeGuest = async (upgradeForm: Omit<RegisterForm, 'acceptTerms'>): Promise<boolean> => {
    try {
      isLoading.value = true;

      if (!isGuest.value) {
        ElMessage.error('只有遊客用戶可以升級');
        return false;
      }

      if (upgradeForm.password !== upgradeForm.confirmPassword) {
        ElMessage.error('密碼確認不一致');
        return false;
      }

      const response = await ApiService.post<AuthAPI.AuthResponse>('/auth/upgrade', {
        username: upgradeForm.username.trim(),
        email: upgradeForm.email.trim(),
        password: upgradeForm.password,
      });

      if (response.success && response.data) {
        setAuthData(response.data);

        ElNotification({
          title: '升級成功',
          message: '您的遊客帳號已成功升級為正式用戶！',
          type: 'success',
          duration: 4000,
        });

        return true;
      }

      throw new Error(response.error || '升級失敗');
    } catch (error) {
      console.error('升級失敗:', error);
      
      const apiError = error as ApiError;
      let errorMessage = '升級失敗';
      
      if (apiError.code === 'USER_EXISTS') {
        errorMessage = '用戶名或郵箱已存在';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      ElMessage.error(errorMessage);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 用戶登出
   */
  const logout = async (showMessage: boolean = true): Promise<void> => {
    try {
      isLoading.value = true;

      // 調用後端登出 API
      if (isAuthenticated.value) {
        await ApiService.post('/auth/logout');
      }
    } catch (error) {
      console.error('登出 API 調用失敗:', error);
      // 即使 API 失敗也要清除本地狀態
    } finally {
      // 清除本地認證狀態
      clearAuthData();
      localStorage.removeItem('rememberMe');
      
      if (showMessage) {
        ElMessage.success('已成功登出');
      }
      
      isLoading.value = false;
    }
  };

  /**
   * 驗證當前 Token
   */
  const validateToken = async (): Promise<boolean> => {
    try {
      const currentToken = TokenManager.getToken();
      if (!currentToken || !TokenManager.isTokenValid(currentToken)) {
        clearAuthData();
        return false;
      }

      const response = await ApiService.post<AuthAPI.ValidateTokenResponse>('/auth/validate', {
        token: currentToken,
      });

      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      }

      clearAuthData();
      return false;
    } catch (error) {
      console.error('Token 驗證失敗:', error);
      clearAuthData();
      return false;
    }
  };

  /**
   * 獲取當前用戶信息
   */
  const fetchUserInfo = async (): Promise<boolean> => {
    try {
      if (!isAuthenticated.value) return false;

      const response = await ApiService.get<{ user: UserAPI.UserProfile }>('/auth/me');
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('獲取用戶信息失敗:', error);
      return false;
    }
  };

  /**
   * 自動登錄檢查
   */
  const checkAutoLogin = async (): Promise<boolean> => {
    try {
      const currentToken = TokenManager.getToken();
      const rememberMe = localStorage.getItem('rememberMe');
      
      if (!currentToken || !rememberMe) {
        return false;
      }

      if (!TokenManager.isTokenValid(currentToken)) {
        clearAuthData();
        return false;
      }

      return await validateToken();
    } catch (error) {
      console.error('自動登錄檢查失敗:', error);
      clearAuthData();
      return false;
    }
  };

  /**
   * 修改密碼
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      isLoading.value = true;

      const response = await ApiService.put('/auth/password', {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        ElNotification({
          title: '密碼修改成功',
          message: '您的密碼已成功修改',
          type: 'success',
        });
        return true;
      }

      throw new Error(response.error || '密碼修改失敗');
    } catch (error) {
      console.error('密碼修改失敗:', error);
      
      const apiError = error as ApiError;
      const errorMessage = apiError.message || '密碼修改失敗';
      ElMessage.error(errorMessage);
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 重置登錄嘗試次數
   */
  const resetLoginAttempts = () => {
    loginAttempts.value = 0;
  };

  /**
   * 檢查是否需要重新認證
   */
  const shouldReauthenticate = computed(() => {
    if (!lastLoginTime.value) return false;
    
    // 24 小時後建議重新認證
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - lastLoginTime.value > twentyFourHours;
  });

  // ======================== 監聽器 ========================

  /**
   * 監聽 Token 變化
   */
  watch(token, (newToken) => {
    if (!newToken) {
      clearAuthData();
    }
  });

  /**
   * 監聽頁面可見性變化，自動驗證 Token
   */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isAuthenticated.value) {
        validateToken();
      }
    });
  }

  // ======================== 初始化 ========================

  /**
   * 初始化認證狀態
   */
  const initializeAuth = async (): Promise<void> => {
    const currentToken = TokenManager.getToken();
    if (currentToken && TokenManager.isTokenValid(currentToken)) {
      await validateToken();
    }
  };

  // ======================== 返回 ========================

  return {
    // 狀態
    user: readonly(user),
    token: readonly(token),
    isLoading: readonly(isLoading),
    loginAttempts: readonly(loginAttempts),
    lastLoginTime: readonly(lastLoginTime),

    // 計算屬性
    isAuthenticated,
    isGuest,
    isRegisteredUser,
    displayName,
    userAvatar,
    authSummary,
    shouldReauthenticate,

    // 方法
    createGuest,
    login,
    register,
    upgradeGuest,
    logout,
    validateToken,
    fetchUserInfo,
    checkAutoLogin,
    changePassword,
    resetLoginAttempts,
    initializeAuth,

    // 內部方法（供其他 stores 使用）
    setUser,
    setToken,
    clearAuthData,
  };
});

/**
 * 認證守衛 Hook
 */
export const useAuthGuard = () => {
  const authStore = useAuthStore();

  /**
   * 要求認證
   */
  const requireAuth = (): boolean => {
    if (!authStore.isAuthenticated) {
      ElMessage.warning('請先登錄');
      return false;
    }
    return true;
  };

  /**
   * 要求註冊用戶
   */
  const requireRegisteredUser = (): boolean => {
    if (!authStore.isAuthenticated) {
      ElMessage.warning('請先登錄');
      return false;
    }
    
    if (authStore.isGuest) {
      ElMessage.info('此功能需要註冊用戶，請升級您的帳號');
      return false;
    }
    
    return true;
  };

  /**
   * 允許遊客訪問
   */
  const allowGuest = (): boolean => {
    if (!authStore.isAuthenticated) {
      // 自動創建遊客用戶
      authStore.createGuest();
    }
    return true;
  };

  return {
    requireAuth,
    requireRegisteredUser,
    allowGuest,
  };
};