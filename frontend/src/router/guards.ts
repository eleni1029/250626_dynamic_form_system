// frontend/src/router/guards.ts
// 路由守衛 - 權限檢查和導航控制

import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { ElMessage, ElNotification } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useFormsStore } from '@/stores/forms';
import { routerUtils } from './index';

/**
 * 設置所有路由守衛
 */
export function setupRouterGuards(router: Router) {
  // 全局前置守衛 - 權限檢查
  router.beforeEach(async (to, from, next) => {
    await authenticationGuard(to, from, next);
  });

  // 全局前置守衛 - 表單權限檢查
  router.beforeEach(async (to, from, next) => {
    await formAccessGuard(to, from, next);
  });

  // 全局前置守衛 - 頁面標題設置
  router.beforeEach((to, from, next) => {
    titleGuard(to, from, next);
  });

  // 全局後置鈎子 - 頁面載入完成處理
  router.afterEach((to, from) => {
    afterNavigationHandler(to, from);
  });

  // 全局錯誤處理
  router.onError((error) => {
    errorHandler(error);
  });
}

/**
 * 認證守衛 - 檢查用戶認證狀態和權限
 */
async function authenticationGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore();

  try {
    // 初始化認證狀態（如果還未初始化）
    if (!authStore.isInitialized) {
      await authStore.initializeAuth();
    }

    // 檢查是否需要認證
    const requiresAuth = routerUtils.requiresAuth(to);
    const allowsGuest = routerUtils.allowsGuest(to);
    const hideForAuthenticated = routerUtils.hideForAuthenticated(to);
    const requiresGuest = routerUtils.requiresGuest(to);
    const requiredRole = routerUtils.requiresRole(to);

    // 如果頁面對已認證用戶隱藏（如登錄頁）
    if (hideForAuthenticated && authStore.isAuthenticated) {
      ElMessage.info('您已經登錄，自動跳轉到儀表板');
      next('/user/dashboard');
      return;
    }

    // 如果頁面只允許遊客訪問
    if (requiresGuest && !authStore.isGuest) {
      if (authStore.isAuthenticated) {
        ElMessage.warning('此頁面僅限遊客用戶訪問');
        next('/user/dashboard');
      } else {
        ElMessage.warning('請先創建遊客賬號');
        next('/auth/guest');
      }
      return;
    }

    // 如果頁面需要認證
    if (requiresAuth) {
      if (!authStore.isAuthenticated) {
        ElMessage.warning('請先登錄以訪問此頁面');
        next({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        });
        return;
      }

      // 檢查角色權限
      if (requiredRole && authStore.user?.role !== requiredRole) {
        ElMessage.error('您沒有權限訪問此頁面');
        next('/error/403');
        return;
      }
    }

    // 如果頁面不允許遊客但用戶是遊客
    if (!allowsGuest && authStore.isGuest) {
      ElNotification({
        title: '需要註冊賬號',
        message: '此功能需要註冊賬號才能使用，是否現在升級？',
        type: 'warning',
        duration: 5000,
        onClick: () => {
          router.push('/auth/upgrade');
        }
      });
      next('/auth/upgrade');
      return;
    }

    next();
  } catch (error) {
    console.error('認證守衛錯誤:', error);
    ElMessage.error('驗證用戶狀態時出現錯誤');
    next('/error/500');
  }
}

/**
 * 表單訪問守衛 - 檢查表單權限
 */
async function formAccessGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore();
  const formsStore = useFormsStore();
  
  // 只對表單相關路由進行檢查
  if (!to.path.startsWith('/forms/') || to.name === 'FormsIndex') {
    next();
    return;
  }

  try {
    const formId = routerUtils.getFormId(to);
    
    if (!formId) {
      next();
      return;
    }

    // 載入表單配置（如果還未載入）
    if (!formsStore.formConfigs.length) {
      await formsStore.loadFormConfigs();
    }

    // 檢查表單是否存在
    const formConfig = formsStore.getFormConfig(formId);
    if (!formConfig) {
      ElMessage.error('表單不存在或已被移除');
      next('/forms');
      return;
    }

    // 檢查表單是否啟用
    if (!formConfig.enabled) {
      ElMessage.warning('此表單暫時不可用');
      next('/forms');
      return;
    }

    // 檢查用戶是否有訪問權限
    const canAccess = authStore.isAuthenticated || 
                     (authStore.isGuest && formConfig.guestAccessible);

    if (!canAccess) {
      ElMessage.warning('您沒有權限訪問此表單，請先登錄');
      next({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      });
      return;
    }

    // 遊客訪問非遊客表單的提示
    if (authStore.isGuest && !formConfig.guestAccessible) {
      ElNotification({
        title: '需要註冊賬號',
        message: '此表單需要註冊賬號才能使用',
        type: 'warning',
        duration: 5000
      });
      next('/auth/upgrade');
      return;
    }

    next();
  } catch (error) {
    console.error('表單訪問守衛錯誤:', error);
    ElMessage.error('檢查表單權限時出現錯誤');
    next('/forms');
  }
}

/**
 * 標題守衛 - 設置頁面標題
 */
function titleGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // 設置頁面標題
  const title = routerUtils.getTitle(to);
  document.title = title ? `${title} - 動態表單系統` : '動態表單系統';
  
  next();
}

/**
 * 導航完成後處理
 */
function afterNavigationHandler(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) {
  // 記錄頁面瀏覽統計
  recordPageView(to, from);
  
  // 清除之前的錯誤狀態
  clearPreviousErrors();
  
  // 發送頁面載入分析事件
  sendPageLoadEvent(to);
}

/**
 * 路由錯誤處理
 */
function errorHandler(error: Error) {
  console.error('路由錯誤:', error);
  
  // 根據錯誤類型顯示不同的錯誤信息
  if (error.message.includes('ChunkLoadError')) {
    ElNotification({
      title: '載入失敗',
      message: '頁面載入失敗，請刷新頁面重試',
      type: 'error',
      duration: 0, // 不自動關閉
      showClose: true,
      onClick: () => {
        window.location.reload();
      }
    });
  } else if (error.message.includes('Loading')) {
    ElMessage.error('頁面載入超時，請檢查網絡連接');
  } else {
    ElMessage.error('頁面載入時發生錯誤');
  }
}

/**
 * 記錄頁面瀏覽統計
 */
function recordPageView(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) {
  try {
    // 在生產環境中可以發送到分析服務
    if (process.env.NODE_ENV === 'production') {
      // 發送到 Google Analytics 或其他分析服務
      // gtag('config', 'GA_TRACKING_ID', {
      //   page_path: to.path
      // });
    }
    
    // 記錄到控制台（開發環境）
    console.log(`頁面瀏覽: ${from.path} → ${to.path}`);
  } catch (error) {
    console.error('記錄頁面瀏覽失敗:', error);
  }
}

/**
 * 清除之前的錯誤狀態
 */
function clearPreviousErrors() {
  // 清除之前可能存在的錯誤狀態
  // 可以在這裡重置全局錯誤狀態
}

/**
 * 發送頁面載入事件
 */
function sendPageLoadEvent(to: RouteLocationNormalized) {
  try {
    // 計算頁面載入時間
    const loadTime = performance.now();
    
    // 在生產環境中可以發送性能數據
    if (process.env.NODE_ENV === 'production') {
      // 發送到性能監控服務
      // sendPerformanceData({
      //   route: to.path,
      //   loadTime: loadTime
      // });
    }
  } catch (error) {
    console.error('發送頁面載入事件失敗:', error);
  }
}

/**
 * 導航守衛工具函數
 */
export const guardUtils = {
  /**
   * 檢查用戶是否可以離開當前頁面
   */
  canLeave: async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<boolean> => {
    // 檢查是否有未保存的更改
    const hasUnsavedChanges = checkUnsavedChanges(from);
    
    if (hasUnsavedChanges) {
      try {
        await ElMessageBox.confirm(
          '您有未保存的更改，確定要離開此頁面嗎？',
          '確認離開',
          {
            confirmButtonText: '離開',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        return true;
      } catch {
        return false;
      }
    }
    
    return true;
  },

  /**
   * 重定向到登錄頁面
   */
  redirectToLogin: (currentPath: string) => {
    return {
      path: '/auth/login',
      query: { redirect: currentPath }
    };
  },

  /**
   * 重定向到錯誤頁面
   */
  redirectToError: (errorType: '403' | '404' | '500' = '404') => {
    return `/error/${errorType}`;
  },

  /**
   * 處理認證後的重定向
   */
  handleAuthRedirect: (router: Router, defaultPath = '/user/dashboard') => {
    const redirectPath = router.currentRoute.value.query.redirect as string;
    const targetPath = redirectPath && redirectPath !== '/auth/login' 
      ? redirectPath 
      : defaultPath;
    
    router.push(targetPath);
  }
};

/**
 * 檢查頁面是否有未保存的更改
 */
function checkUnsavedChanges(route: RouteLocationNormalized): boolean {
  // 這裡可以檢查特定頁面的狀態
  // 例如表單是否有未保存的數據
  
  // 檢查表單頁面
  if (route.path.startsWith('/forms/')) {
    // 可以通過 store 或其他方式檢查表單狀態
    return false; // 暫時返回 false
  }
  
  // 檢查設置頁面
  if (route.path.includes('/settings')) {
    // 檢查設置是否有未保存的更改
    return false; // 暫時返回 false
  }
  
  return false;
}

/**
 * 路由守衛常量
 */
export const GUARD_MESSAGES = {
  LOGIN_REQUIRED: '請先登錄以訪問此頁面',
  PERMISSION_DENIED: '您沒有權限訪問此頁面',
  GUEST_ONLY: '此頁面僅限遊客用戶訪問',
  REGISTERED_ONLY: '此功能需要註冊賬號才能使用',
  FORM_NOT_FOUND: '表單不存在或已被移除',
  FORM_DISABLED: '此表單暫時不可用',
  ALREADY_AUTHENTICATED: '您已經登錄，自動跳轉到儀表板',
  UNSAVED_CHANGES: '您有未保存的更改，確定要離開此頁面嗎？'
} as const;

/**
 * 導出路由守衛配置
 */
export const GUARD_CONFIG = {
  // 需要認證的路由模式
  PROTECTED_PATTERNS: [
    '/user',
    '/admin'
  ],
  
  // 允許遊客的路由模式
  GUEST_ALLOWED_PATTERNS: [
    '/',
    '/auth',
    '/forms/bmi',
    '/about',
    '/privacy',
    '/terms'
  ],
  
  // 對已認證用戶隱藏的路由
  HIDDEN_FOR_AUTH_PATTERNS: [
    '/auth/login',
    '/auth/register',
    '/auth/guest'
  ],
  
  // 默認重定向路徑
  DEFAULT_REDIRECTS: {
    AFTER_LOGIN: '/user/dashboard',
    AFTER_LOGOUT: '/',
    UNAUTHORIZED: '/auth/login',
    FORBIDDEN: '/error/403',
    NOT_FOUND: '/error/404'
  }
} as const;