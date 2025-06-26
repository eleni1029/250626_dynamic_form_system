// frontend/src/composables/useAuth.ts
// 認證相關的組合式 API - 業務邏輯和 UI 交互

import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { useAuthStore, useAuthGuard } from '@/stores/auth';
import type { AuthAPI } from '@/types/api';

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
 * 遊客升級表單接口
 */
interface UpgradeForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 修改密碼表單接口
 */
interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 主要認證邏輯 Hook
 */
export const useAuth = () => {
  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  // ======================== 響應式數據 ========================

  const isInitialized = ref(false);
  const showAuthModal = ref(false);
  const authModalMode = ref<'login' | 'register' | 'upgrade'>('login');

  // ======================== 計算屬性 ========================

  /**
   * 是否需要顯示升級提示
   */
  const shouldShowUpgradePrompt = computed(() => {
    return authStore.isGuest && authStore.isAuthenticated;
  });

  /**
   * 認證狀態摘要
   */
  const authStatus = computed(() => ({
    ...authStore.authSummary,
    shouldShowUpgradePrompt: shouldShowUpgradePrompt.value,
  }));

  // ======================== 初始化方法 ========================

  /**
   * 初始化認證系統
   */
  const initializeAuth = async (): Promise<void> => {
    try {
      if (isInitialized.value) return;

      // 檢查自動登錄
      const autoLoginSuccess = await authStore.checkAutoLogin();
      
      if (!autoLoginSuccess) {
        // 如果沒有有效登錄，根據路由需求處理
        await handleRouteAuth();
      }

      isInitialized.value = true;
    } catch (error) {
      console.error('認證初始化失敗:', error);
      isInitialized.value = true;
    }
  };

  /**
   * 處理路由認證需求
   */
  const handleRouteAuth = async (): Promise<void> => {
    const routeMeta = route.meta;
    
    // 檢查路由是否需要認證
    if (routeMeta?.requiresAuth && !authStore.isAuthenticated) {
      await handleGuestAccess();
    }
    
    // 檢查路由是否需要註冊用戶
    if (routeMeta?.requiresRegisteredUser && authStore.isGuest) {
      showUpgradePrompt();
    }
  };

  /**
   * 處理遊客訪問
   */
  const handleGuestAccess = async (): Promise<void> => {
    try {
      const result = await ElMessageBox.confirm(
        '此功能需要登錄才能使用。您可以選擇創建遊客帳號快速開始，或登錄現有帳號。',
        '需要登錄',
        {
          confirmButtonText: '創建遊客帳號',
          cancelButtonText: '登錄帳號',
          distinguishCancelAndClose: true,
          type: 'info',
        }
      );

      if (result === 'confirm') {
        await authStore.createGuest();
      }
    } catch (action) {
      if (action === 'cancel') {
        openAuthModal('login');
      } else {
        // 用戶取消，跳轉到首頁
        router.push('/');
      }
    }
  };

  /**
   * 顯示升級提示
   */
  const showUpgradePrompt = (): void => {
    ElMessageBox.confirm(
      '此功能需要註冊用戶才能使用。將您的遊客帳號升級為正式帳號，即可使用全部功能。',
      '升級帳號',
      {
        confirmButtonText: '立即升級',
        cancelButtonText: '稍後升級',
        type: 'info',
      }
    ).then(() => {
      openAuthModal('upgrade');
    }).catch(() => {
      // 用戶選擇稍後升級
      ElMessage.info('您可以隨時在個人設置中升級帳號');
    });
  };

  /**
   * 開啟認證彈窗
   */
  const openAuthModal = (mode: 'login' | 'register' | 'upgrade' = 'login'): void => {
    authModalMode.value = mode;
    showAuthModal.value = true;
  };

  /**
   * 關閉認證彈窗
   */
  const closeAuthModal = (): void => {
    showAuthModal.value = false;
  };

  // ======================== 導航方法 ========================

  /**
   * 登錄後導航
   */
  const navigateAfterLogin = (): void => {
    const redirect = route.query.redirect as string;
    const targetRoute = redirect || '/dashboard';
    
    router.push(targetRoute);
    closeAuthModal();
  };

  /**
   * 登出後導航
   */
  const navigateAfterLogout = (): void => {
    router.push('/');
  };

  /**
   * 安全登出
   */
  const safeLogout = async (): Promise<void> => {
    try {
      const result = await ElMessageBox.confirm(
        '確定要登出嗎？',
        '確認登出',
        {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'question',
        }
      );

      if (result === 'confirm') {
        await authStore.logout();
        navigateAfterLogout();
      }
    } catch {
      // 用戶取消登出
    }
  };

  // ======================== 返回值 ========================

  return {
    // 狀態
    isInitialized,
    showAuthModal,
    authModalMode,
    shouldShowUpgradePrompt,
    authStatus,

    // Store 狀態 (代理)
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isGuest: authStore.isGuest,
    isRegisteredUser: authStore.isRegisteredUser,
    displayName: authStore.displayName,
    userAvatar: authStore.userAvatar,
    isLoading: authStore.isLoading,

    // 方法
    initializeAuth,
    handleRouteAuth,
    handleGuestAccess,
    showUpgradePrompt,
    openAuthModal,
    closeAuthModal,
    navigateAfterLogin,
    navigateAfterLogout,
    safeLogout,

    // Store 方法 (代理)
    createGuest: authStore.createGuest,
    login: authStore.login,
    register: authStore.register,
    upgradeGuest: authStore.upgradeGuest,
    logout: authStore.logout,
    changePassword: authStore.changePassword,
  };
};

/**
 * 登錄表單 Hook
 */
export const useLoginForm = () => {
  const authStore = useAuthStore();
  const { navigateAfterLogin } = useAuth();

  // 表單數據
  const loginForm = reactive<LoginForm>({
    identifier: '',
    password: '',
    rememberMe: false,
  });

  // 表單引用
  const loginFormRef = ref<FormInstance>();

  // 表單驗證規則
  const loginRules: FormRules<LoginForm> = {
    identifier: [
      { required: true, message: '請輸入用戶名或郵箱', trigger: 'blur' },
      { min: 3, max: 50, message: '長度在 3 到 50 個字符', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '請輸入密碼', trigger: 'blur' },
      { min: 6, message: '密碼至少 6 個字符', trigger: 'blur' },
    ],
  };

  /**
   * 提交登錄
   */
  const submitLogin = async (): Promise<void> => {
    if (!loginFormRef.value) return;

    try {
      await loginFormRef.value.validate();
      const success = await authStore.login(loginForm);
      
      if (success) {
        resetLoginForm();
        navigateAfterLogin();
      }
    } catch {
      ElMessage.error('請檢查表單填寫是否正確');
    }
  };

  /**
   * 重置登錄表單
   */
  const resetLoginForm = (): void => {
    if (loginFormRef.value) {
      loginFormRef.value.resetFields();
    }
    Object.assign(loginForm, {
      identifier: '',
      password: '',
      rememberMe: false,
    });
  };

  return {
    loginForm,
    loginFormRef,
    loginRules,
    submitLogin,
    resetLoginForm,
  };
};

/**
 * 註冊表單 Hook
 */
export const useRegisterForm = () => {
  const authStore = useAuthStore();
  const { navigateAfterLogin } = useAuth();

  // 表單數據
  const registerForm = reactive<RegisterForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  // 表單引用
  const registerFormRef = ref<FormInstance>();

  // 自定義驗證器
  const validatePassword = (rule: any, value: any, callback: any) => {
    if (value === '') {
      callback(new Error('請輸入密碼'));
    } else if (value.length < 8) {
      callback(new Error('密碼至少 8 個字符'));
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      callback(new Error('密碼必須包含大小寫字母和數字'));
    } else {
      callback();
    }
  };

  const validateConfirmPassword = (rule: any, value: any, callback: any) => {
    if (value === '') {
      callback(new Error('請確認密碼'));
    } else if (value !== registerForm.password) {
      callback(new Error('兩次輸入密碼不一致'));
    } else {
      callback();
    }
  };

  // 表單驗證規則
  const registerRules: FormRules<RegisterForm> = {
    username: [
      { required: true, message: '請輸入用戶名', trigger: 'blur' },
      { min: 3, max: 20, message: '長度在 3 到 20 個字符', trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、數字和下劃線', trigger: 'blur' },
    ],
    email: [
      { required: true, message: '請輸入郵箱地址', trigger: 'blur' },
      { type: 'email', message: '請輸入正確的郵箱地址', trigger: 'blur' },
    ],
    password: [
      { required: true, validator: validatePassword, trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, validator: validateConfirmPassword, trigger: 'blur' },
    ],
    acceptTerms: [
      { required: true, message: '請同意服務條款', trigger: 'change' },
    ],
  };

  /**
   * 提交註冊
   */
  const submitRegister = async (): Promise<void> => {
    if (!registerFormRef.value) return;

    try {
      await registerFormRef.value.validate();
      const success = await authStore.register(registerForm);
      
      if (success) {
        resetRegisterForm();
        navigateAfterLogin();
      }
    } catch {
      ElMessage.error('請檢查表單填寫是否正確');
    }
  };

  /**
   * 重置註冊表單
   */
  const resetRegisterForm = (): void => {
    if (registerFormRef.value) {
      registerFormRef.value.resetFields();
    }
    Object.assign(registerForm, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    });
  };

  return {
    registerForm,
    registerFormRef,
    registerRules,
    submitRegister,
    resetRegisterForm,
  };
};

/**
 * 遊客升級表單 Hook
 */
export const useUpgradeForm = () => {
  const authStore = useAuthStore();
  const { closeAuthModal } = useAuth();

  // 表單數據
  const upgradeForm = reactive<UpgradeForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // 表單引用
  const upgradeFormRef = ref<FormInstance>();

  // 重用註冊表單的驗證邏輯
  const { registerRules } = useRegisterForm();
  
  // 升級表單規則（移除 acceptTerms）
  const upgradeRules: FormRules<UpgradeForm> = {
    username: registerRules.username,
    email: registerRules.email,
    password: registerRules.password,
    confirmPassword: registerRules.confirmPassword,
  };

  /**
   * 提交升級
   */
  const submitUpgrade = async (): Promise<void> => {
    if (!upgradeFormRef.value) return;

    try {
      await upgradeFormRef.value.validate();
      const success = await authStore.upgradeGuest(upgradeForm);
      
      if (success) {
        resetUpgradeForm();
        closeAuthModal();
      }
    } catch {
      ElMessage.error('請檢查表單填寫是否正確');
    }
  };

  /**
   * 重置升級表單
   */
  const resetUpgradeForm = (): void => {
    if (upgradeFormRef.value) {
      upgradeFormRef.value.resetFields();
    }
    Object.assign(upgradeForm, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
  };

  return {
    upgradeForm,
    upgradeFormRef,
    upgradeRules,
    submitUpgrade,
    resetUpgradeForm,
  };
};

/**
 * 修改密碼表單 Hook
 */
export const useChangePasswordForm = () => {
  const authStore = useAuthStore();

  // 表單數據
  const changePasswordForm = reactive<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 表單引用
  const changePasswordFormRef = ref<FormInstance>();

  // 自定義驗證器
  const validateNewPassword = (rule: any, value: any, callback: any) => {
    if (value === '') {
      callback(new Error('請輸入新密碼'));
    } else if (value.length < 8) {
      callback(new Error('密碼至少 8 個字符'));
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      callback(new Error('密碼必須包含大小寫字母和數字'));
    } else if (value === changePasswordForm.currentPassword) {
      callback(new Error('新密碼不能與當前密碼相同'));
    } else {
      callback();
    }
  };

  const validateConfirmNewPassword = (rule: any, value: any, callback: any) => {
    if (value === '') {
      callback(new Error('請確認新密碼'));
    } else if (value !== changePasswordForm.newPassword) {
      callback(new Error('兩次輸入密碼不一致'));
    } else {
      callback();
    }
  };

  // 表單驗證規則
  const changePasswordRules: FormRules<ChangePasswordForm> = {
    currentPassword: [
      { required: true, message: '請輸入當前密碼', trigger: 'blur' },
    ],
    newPassword: [
      { required: true, validator: validateNewPassword, trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, validator: validateConfirmNewPassword, trigger: 'blur' },
    ],
  };

  /**
   * 提交密碼修改
   */
  const submitChangePassword = async (): Promise<boolean> => {
    if (!changePasswordFormRef.value) return false;

    try {
      await changePasswordFormRef.value.validate();
      const success = await authStore.changePassword(
        changePasswordForm.currentPassword,
        changePasswordForm.newPassword
      );
      
      if (success) {
        resetChangePasswordForm();
      }
      
      return success;
    } catch {
      ElMessage.error('請檢查表單填寫是否正確');
      return false;
    }
  };

  /**
   * 重置密碼修改表單
   */
  const resetChangePasswordForm = (): void => {
    if (changePasswordFormRef.value) {
      changePasswordFormRef.value.resetFields();
    }
    Object.assign(changePasswordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return {
    changePasswordForm,
    changePasswordFormRef,
    changePasswordRules,
    submitChangePassword,
    resetChangePasswordForm,
  };
};

/**
 * 認證守衛 Hook (重新導出便於使用)
 */
export { useAuthGuard };

/**
 * 認證狀態監聽 Hook
 */
export const useAuthWatcher = () => {
  const authStore = useAuthStore();
  const router = useRouter();

  /**
   * 監聽認證狀態變化
   */
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      // 從已認證變為未認證 (登出)
      if (wasAuthenticated && !isAuthenticated) {
        const currentRoute = router.currentRoute.value;
        
        // 如果當前頁面需要認證，跳轉到首頁
        if (currentRoute.meta?.requiresAuth) {
          router.push('/');
        }
      }
    }
  );

  /**
   * 監聽用戶類型變化
   */
  watch(
    () => authStore.isGuest,
    (isGuest, wasGuest) => {
      // 從遊客升級為註冊用戶
      if (wasGuest && !isGuest) {
        ElMessage.success('帳號升級成功，您現在可以使用全部功能！');
      }
    }
  );
};