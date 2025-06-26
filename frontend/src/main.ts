// frontend/src/main.ts
// 應用程序入口文件 - Vue 3 + TypeScript + Element Plus

import { createApp } from 'vue';
import { createPinia } from 'pinia';

// 導入根組件
import App from './App.vue';

// 導入路由
import router from '@/router';

// 導入 Element Plus
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'; // 深色主題

// 導入 Element Plus 圖標
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

// 導入全局樣式
import '@/assets/styles/index.scss';

// 導入常量和配置
import { ENV_CONSTANTS, FEATURE_FLAGS } from '@/utils/constants';

// 導入工具函數
import { setupGlobalProperties } from '@/utils/global-properties';
import { setupDirectives } from '@/directives';
import { setupI18n } from '@/i18n';

/**
 * 創建 Vue 應用實例
 */
async function createVueApp() {
  const app = createApp(App);

  // 創建 Pinia 狀態管理
  const pinia = createPinia();
  
  // 設置開發工具支持
  if (ENV_CONSTANTS.IS_DEVELOPMENT) {
    app.config.devtools = true;
    
    // 設置性能追蹤
    if (FEATURE_FLAGS.DEVELOPMENT.ENABLE_PERFORMANCE_MONITOR) {
      app.config.performance = true;
    }
  }

  // 全局錯誤處理
  app.config.errorHandler = (err, instance, info) => {
    console.error('Vue 全局錯誤:', err);
    console.error('錯誤信息:', info);
    console.error('組件實例:', instance);
    
    // 在生產環境中可以發送錯誤到監控服務
    if (ENV_CONSTANTS.IS_PRODUCTION) {
      // 發送到錯誤監控服務 (如 Sentry)
      // captureException(err, { extra: { info, instance } });
    }
  };

  // 全局警告處理
  app.config.warnHandler = (msg, instance, trace) => {
    if (ENV_CONSTANTS.IS_DEVELOPMENT) {
      console.warn('Vue 警告:', msg);
      console.warn('追蹤:', trace);
    }
  };

  // 註冊插件
  app.use(pinia);
  app.use(router);
  app.use(ElementPlus, {
    // Element Plus 配置
    size: 'default',
    zIndex: 3000,
    namespace: 'el',
    locale: undefined // 將由 i18n 處理
  });

  // 註冊所有 Element Plus 圖標
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }

  // 設置國際化 (如果啟用)
  if (FEATURE_FLAGS.ENABLE_I18N) {
    const i18n = await setupI18n();
    app.use(i18n);
  }

  // 註冊全局指令
  setupDirectives(app);

  // 設置全局屬性和方法
  setupGlobalProperties(app);

  // 註冊全局組件
  await registerGlobalComponents(app);

  return app;
}

/**
 * 註冊全局組件
 */
async function registerGlobalComponents(app: any) {
  // 動態導入並註冊常用組件
  const globalComponents = [
    // 布局組件
    ['AppLayout', () => import('@/components/layout/AppLayout.vue')],
    ['AppHeader', () => import('@/components/layout/AppHeader.vue')],
    ['AppSidebar', () => import('@/components/layout/AppSidebar.vue')],
    ['AppFooter', () => import('@/components/layout/AppFooter.vue')],
    
    // 通用組件
    ['LoadingSpinner', () => import('@/components/common/LoadingSpinner.vue')],
    ['ErrorMessage', () => import('@/components/common/ErrorMessage.vue')],
    ['EmptyState', () => import('@/components/common/EmptyState.vue')],
    ['ConfirmDialog', () => import('@/components/common/ConfirmDialog.vue')],
    
    // 表單組件
    ['FormRenderer', () => import('@/components/forms/FormRenderer.vue')],
    ['FormField', () => import('@/components/forms/FormField.vue')],
    
    // 工具組件
    ['PageTitle', () => import('@/components/common/PageTitle.vue')],
    ['BackButton', () => import('@/components/common/BackButton.vue')],
    ['HelpTooltip', () => import('@/components/common/HelpTooltip.vue')]
  ];

  // 並行載入組件
  const componentPromises = globalComponents.map(async ([name, loader]) => {
    try {
      const component = await loader();
      app.component(name, component.default || component);
    } catch (error) {
      console.warn(`載入全局組件 ${name} 失敗:`, error);
    }
  });

  await Promise.all(componentPromises);
}

/**
 * 設置全局CSS變數
 */
function setupGlobalCSSVariables() {
  const root = document.documentElement;
  
  // 設置主題色彩變數
  root.style.setProperty('--app-primary-color', '#409EFF');
  root.style.setProperty('--app-success-color', '#67C23A');
  root.style.setProperty('--app-warning-color', '#E6A23C');
  root.style.setProperty('--app-danger-color', '#F56C6C');
  root.style.setProperty('--app-info-color', '#909399');
  
  // 設置動畫變數
  root.style.setProperty('--app-transition-duration', '0.3s');
  root.style.setProperty('--app-transition-timing', 'ease-in-out');
  
  // 設置陰影變數
  root.style.setProperty('--app-shadow-light', '0 2px 4px rgba(0, 0, 0, 0.1)');
  root.style.setProperty('--app-shadow-medium', '0 4px 8px rgba(0, 0, 0, 0.15)');
  root.style.setProperty('--app-shadow-heavy', '0 8px 16px rgba(0, 0, 0, 0.2)');
  
  // 設置間距變數
  root.style.setProperty('--app-spacing-xs', '4px');
  root.style.setProperty('--app-spacing-sm', '8px');
  root.style.setProperty('--app-spacing-md', '16px');
  root.style.setProperty('--app-spacing-lg', '24px');
  root.style.setProperty('--app-spacing-xl', '32px');
}

/**
 * 設置頁面元數據
 */
function setupPageMetadata() {
  // 設置頁面標題
  document.title = ENV_CONSTANTS.APP_TITLE;
  
  // 設置 meta 標籤
  const metaTags = [
    { name: 'description', content: '強大的動態表單系統，支持 BMI 和 TDEE 計算器' },
    { name: 'keywords', content: 'BMI,TDEE,計算器,表單系統,健康工具' },
    { name: 'author', content: 'Dynamic Form System Team' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
    { name: 'theme-color', content: '#409EFF' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: ENV_CONSTANTS.APP_TITLE }
  ];

  metaTags.forEach(({ name, content }) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });

  // 設置 Open Graph 標籤
  const ogTags = [
    { property: 'og:title', content: ENV_CONSTANTS.APP_TITLE },
    { property: 'og:description', content: '強大的動態表單系統' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: ENV_CONSTANTS.APP_TITLE }
  ];

  ogTags.forEach(({ property, content }) => {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });
}

/**
 * 設置字體加載
 */
function setupFontLoading() {
  // 預載入字體
  const fontUrls = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap'
  ];

  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    document.head.appendChild(link);

    // 實際載入字體
    setTimeout(() => {
      link.rel = 'stylesheet';
    }, 100);
  });
}

/**
 * 設置 Service Worker
 */
async function setupServiceWorker() {
  if ('serviceWorker' in navigator && ENV_CONSTANTS.IS_PRODUCTION) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker 註冊成功:', registration);
      
      // 監聽更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 有新版本可用
              console.log('發現新版本，請刷新頁面');
            }
          });
        }
      });
      
    } catch (error) {
      console.error('Service Worker 註冊失敗:', error);
    }
  }
}

/**
 * 設置 PWA 安裝提示
 */
function setupPWAInstallPrompt() {
  if (FEATURE_FLAGS.EXPERIMENTAL.ENABLE_PWA) {
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      // 阻止默認的安裝提示
      e.preventDefault();
      
      // 保存事件，以便稍後使用
      deferredPrompt = e;
      
      // 顯示自定義安裝按鈕
      console.log('PWA 可以安裝');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA 已安裝');
      deferredPrompt = null;
    });
  }
}

/**
 * 設置性能監控
 */
function setupPerformanceMonitoring() {
  if (FEATURE_FLAGS.DEVELOPMENT.ENABLE_PERFORMANCE_MONITOR) {
    // 監控關鍵性能指標
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`性能指標 ${entry.name}:`, entry.startTime);
      }
    }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });

    // 監控長任務
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn('檢測到長任務:', entry.duration, 'ms');
      }
    }).observe({ entryTypes: ['longtask'] });
  }
}

/**
 * 主要初始化函數
 */
async function initializeApplication() {
  try {
    // 顯示初始載入畫面
    console.log(`🚀 ${ENV_CONSTANTS.APP_TITLE} v${ENV_CONSTANTS.APP_VERSION} 啟動中...`);
    
    // 設置基礎配置
    setupGlobalCSSVariables();
    setupPageMetadata();
    setupFontLoading();
    setupPerformanceMonitoring();
    
    // 創建 Vue 應用
    console.log('📦 創建 Vue 應用實例...');
    const app = await createVueApp();
    
    // 設置 PWA 相關功能
    if (FEATURE_FLAGS.EXPERIMENTAL.ENABLE_PWA) {
      await setupServiceWorker();
      setupPWAInstallPrompt();
    }
    
    // 掛載應用
    console.log('🔧 掛載 Vue 應用...');
    app.mount('#app');
    
    console.log('✅ 應用啟動完成!');
    
    // 發送啟動事件
    if (ENV_CONSTANTS.IS_PRODUCTION) {
      // 發送到分析服務
      // gtag('event', 'app_start', {
      //   app_version: ENV_CONSTANTS.APP_VERSION,
      //   environment: ENV_CONSTANTS.NODE_ENV
      // });
    }
    
  } catch (error) {
    console.error('❌ 應用啟動失敗:', error);
    
    // 顯示錯誤頁面
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="color: #F56C6C; margin-bottom: 16px;">應用啟動失敗</h1>
        <p style="color: #666; margin-bottom: 24px;">請刷新頁面重試，或聯繫技術支持</p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #409EFF;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
        >
          重新載入
        </button>
      </div>
    `;
  }
}

// 等待 DOM 載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}