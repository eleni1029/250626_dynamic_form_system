// frontend/src/router/index.ts
// Vue Router 配置 - 路由定義和設置

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { setupRouterGuards } from './guards';

/**
 * 路由配置
 * 採用懶加載方式提升性能
 */
const routes: RouteRecordRaw[] = [
  // 首頁
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: '動態表單系統',
      requiresAuth: false,
      allowGuest: true
    }
  },

  // 認證相關路由
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/views/auth/AuthLayout.vue'),
    meta: {
      title: '用戶認證',
      requiresAuth: false,
      hideForAuthenticated: true // 已登錄用戶隱藏
    },
    children: [
      {
        path: '',
        redirect: '/auth/login'
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: {
          title: '登錄',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/auth/RegisterView.vue'),
        meta: {
          title: '註冊',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: 'guest',
        name: 'GuestCreate',
        component: () => import('@/views/auth/GuestCreateView.vue'),
        meta: {
          title: '創建遊客賬號',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: 'upgrade',
        name: 'GuestUpgrade',
        component: () => import('@/views/auth/GuestUpgradeView.vue'),
        meta: {
          title: '升級為正式用戶',
          requiresAuth: false,
          requiresGuest: true // 只有遊客可以訪問
        }
      }
    ]
  },

  // 表單相關路由
  {
    path: '/forms',
    name: 'Forms',
    component: () => import('@/views/forms/FormsLayout.vue'),
    meta: {
      title: '表單系統',
      requiresAuth: false,
      allowGuest: true
    },
    children: [
      {
        path: '',
        name: 'FormsIndex',
        component: () => import('@/views/forms/FormsIndexView.vue'),
        meta: {
          title: '表單列表',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: 'bmi',
        name: 'BMICalculator',
        component: () => import('@/views/forms/BMIView.vue'),
        meta: {
          title: 'BMI 計算器',
          requiresAuth: false,
          allowGuest: true,
          formId: 'bmi-calculator'
        }
      },
      {
        path: 'tdee',
        name: 'TDEECalculator',
        component: () => import('@/views/forms/TDEEView.vue'),
        meta: {
          title: 'TDEE 計算器',
          requiresAuth: true, // 註冊用戶專用
          allowGuest: false,
          formId: 'tdee-calculator'
        }
      },
      {
        path: ':formId',
        name: 'DynamicForm',
        component: () => import('@/views/forms/DynamicFormView.vue'),
        meta: {
          title: '動態表單',
          requiresAuth: false,
          allowGuest: true
        },
        props: true
      }
    ]
  },

  // 用戶中心路由
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views/user/UserLayout.vue'),
    meta: {
      title: '用戶中心',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/user/dashboard'
      },
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: () => import('@/views/user/DashboardView.vue'),
        meta: {
          title: '用戶儀表板',
          requiresAuth: true
        }
      },
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('@/views/user/ProfileView.vue'),
        meta: {
          title: '個人資料',
          requiresAuth: true
        }
      },
      {
        path: 'history',
        name: 'UserHistory',
        component: () => import('@/views/user/HistoryView.vue'),
        meta: {
          title: '歷史記錄',
          requiresAuth: true
        }
      },
      {
        path: 'settings',
        name: 'UserSettings',
        component: () => import('@/views/user/SettingsView.vue'),
        meta: {
          title: '設置',
          requiresAuth: true
        }
      }
    ]
  },

  // 管理員路由（未來擴展）
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: {
      title: '管理後台',
      requiresAuth: true,
      requiresRole: 'admin'
    },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: {
          title: '管理儀表板',
          requiresAuth: true,
          requiresRole: 'admin'
        }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: {
          title: '用戶管理',
          requiresAuth: true,
          requiresRole: 'admin'
        }
      },
      {
        path: 'forms',
        name: 'AdminForms',
        component: () => import('@/views/admin/FormsView.vue'),
        meta: {
          title: '表單管理',
          requiresAuth: true,
          requiresRole: 'admin'
        }
      }
    ]
  },

  // 錯誤頁面
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/views/ErrorView.vue'),
    meta: {
      title: '錯誤頁面',
      requiresAuth: false,
      allowGuest: true
    },
    children: [
      {
        path: '403',
        name: 'Forbidden',
        component: () => import('@/views/error/ForbiddenView.vue'),
        meta: {
          title: '訪問被禁止',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: '404',
        name: 'NotFound',
        component: () => import('@/views/error/NotFoundView.vue'),
        meta: {
          title: '頁面不存在',
          requiresAuth: false,
          allowGuest: true
        }
      },
      {
        path: '500',
        name: 'ServerError',
        component: () => import('@/views/error/ServerErrorView.vue'),
        meta: {
          title: '服務器錯誤',
          requiresAuth: false,
          allowGuest: true
        }
      }
    ]
  },

  // 關於頁面
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: '關於我們',
      requiresAuth: false,
      allowGuest: true
    }
  },

  // 隱私政策
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: {
      title: '隱私政策',
      requiresAuth: false,
      allowGuest: true
    }
  },

  // 服務條款
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/TermsView.vue'),
    meta: {
      title: '服務條款',
      requiresAuth: false,
      allowGuest: true
    }
  },

  // 404 捕獲所有未匹配的路由
  {
    path: '/:pathMatch(.*)*',
    name: 'CatchAll',
    redirect: '/error/404'
  }
];

/**
 * 創建路由實例
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 路由滾動行為
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置（瀏覽器前進後退）
    if (savedPosition) {
      return savedPosition;
    }
    // 如果路由有錨點
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      };
    }
    // 默認滾動到頂部
    return { top: 0, behavior: 'smooth' };
  }
});

/**
 * 設置路由守衛
 */
setupRouterGuards(router);

/**
 * 路由工具函數
 */
export const routerUtils = {
  /**
   * 檢查路由是否需要認證
   */
  requiresAuth: (route: any): boolean => {
    return route.meta?.requiresAuth === true;
  },

  /**
   * 檢查路由是否允許遊客訪問
   */
  allowsGuest: (route: any): boolean => {
    return route.meta?.allowGuest === true;
  },

  /**
   * 檢查路由是否需要特定角色
   */
  requiresRole: (route: any): string | undefined => {
    return route.meta?.requiresRole;
  },

  /**
   * 檢查路由是否對已認證用戶隱藏
   */
  hideForAuthenticated: (route: any): boolean => {
    return route.meta?.hideForAuthenticated === true;
  },

  /**
   * 檢查路由是否只允許遊客訪問
   */
  requiresGuest: (route: any): boolean => {
    return route.meta?.requiresGuest === true;
  },

  /**
   * 獲取路由標題
   */
  getTitle: (route: any): string => {
    return route.meta?.title || '動態表單系統';
  },

  /**
   * 獲取表單 ID
   */
  getFormId: (route: any): string | undefined => {
    return route.meta?.formId || route.params?.formId;
  },

  /**
   * 導航到指定路由
   */
  navigateTo: (name: string, params?: any, query?: any) => {
    return router.push({ name, params, query });
  },

  /**
   * 替換當前路由
   */
  replaceTo: (name: string, params?: any, query?: any) => {
    return router.replace({ name, params, query });
  },

  /**
   * 返回上一頁
   */
  goBack: () => {
    if (window.history.length > 1) {
      router.go(-1);
    } else {
      router.push('/');
    }
  },

  /**
   * 獲取當前路由
   */
  getCurrentRoute: () => {
    return router.currentRoute.value;
  },

  /**
   * 檢查是否為當前路由
   */
  isCurrentRoute: (name: string): boolean => {
    return router.currentRoute.value.name === name;
  },

  /**
   * 生成路由 URL
   */
  getRouteUrl: (name: string, params?: any, query?: any): string => {
    const route = router.resolve({ name, params, query });
    return route.href;
  }
};

/**
 * 路由常量
 */
export const ROUTE_NAMES = {
  // 首頁
  HOME: 'Home',
  
  // 認證
  AUTH: 'Auth',
  LOGIN: 'Login',
  REGISTER: 'Register',
  GUEST_CREATE: 'GuestCreate',
  GUEST_UPGRADE: 'GuestUpgrade',
  
  // 表單
  FORMS: 'Forms',
  FORMS_INDEX: 'FormsIndex',
  BMI_CALCULATOR: 'BMICalculator',
  TDEE_CALCULATOR: 'TDEECalculator',
  DYNAMIC_FORM: 'DynamicForm',
  
  // 用戶
  USER: 'User',
  USER_DASHBOARD: 'UserDashboard',
  USER_PROFILE: 'UserProfile',
  USER_HISTORY: 'UserHistory',
  USER_SETTINGS: 'UserSettings',
  
  // 管理員
  ADMIN: 'Admin',
  ADMIN_DASHBOARD: 'AdminDashboard',
  ADMIN_USERS: 'AdminUsers',
  ADMIN_FORMS: 'AdminForms',
  
  // 錯誤頁面
  ERROR: 'Error',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'NotFound',
  SERVER_ERROR: 'ServerError',
  
  // 其他
  ABOUT: 'About',
  PRIVACY: 'Privacy',
  TERMS: 'Terms'
} as const;

export { router, routes };
export default router;