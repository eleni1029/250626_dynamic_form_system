<template>
  <div id="app" :class="appClasses">
    <!-- 全局加載遮罩 -->
    <Transition name="fade">
      <div v-if="isGlobalLoading" class="global-loading">
        <el-icon class="loading-icon" :size="40">
          <Loading />
        </el-icon>
        <p class="loading-text">{{ loadingText }}</p>
      </div>
    </Transition>

    <!-- 主要內容區域 -->
    <router-view v-slot="{ Component, route }">
      <Transition
        :name="getTransitionName(route)"
        mode="out-in"
        @enter="onRouteEnter"
        @leave="onRouteLeave"
      >
        <KeepAlive :include="keepAliveComponents">
          <component
            :is="Component"
            :key="route.fullPath"
            class="route-component"
          />
        </KeepAlive>
      </Transition>
    </router-view>

    <!-- 全局通知容器 -->
    <div id="notification-container"></div>

    <!-- 調試信息面板（僅開發環境） -->
    <DebugPanel v-if="showDebugPanel" />

    <!-- 網絡狀態提示 -->
    <NetworkStatus />

    <!-- PWA 更新提示 -->
    <PWAUpdatePrompt v-if="enablePWA" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElNotification } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';

// 導入 stores
import { useAuthStore } from '@/stores/auth';
import { useFormsStore } from '@/stores/forms';

// 導入組件
import DebugPanel from '@/components/common/DebugPanel.vue';
import NetworkStatus from '@/components/common/NetworkStatus.vue';
import PWAUpdatePrompt from '@/components/common/PWAUpdatePrompt.vue';

// 導入常量和工具
import { ENV_CONSTANTS, FEATURE_FLAGS } from '@/utils/constants';

// 路由相關
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();
const formsStore = useFormsStore();

// 響應式狀態
const isGlobalLoading = ref(false);
const loadingText = ref('載入中...');
const isAppReady = ref(false);

// 計算屬性
const appClasses = computed(() => ({
  'app-loading': isGlobalLoading.value,
  'app-ready': isAppReady.value,
  'is-mobile': isMobile.value,
  'is-tablet': isTablet.value,
  'is-desktop': isDesktop.value,
  'dark-mode': isDarkMode.value
}));

const showDebugPanel = computed(() => 
  ENV_CONSTANTS.IS_DEVELOPMENT && FEATURE_FLAGS.DEVELOPMENT.ENABLE_DEBUG_LOGS
);

const enablePWA = computed(() => FEATURE_FLAGS.EXPERIMENTAL.ENABLE_PWA);

const keepAliveComponents = computed(() => [
  'UserDashboard',
  'FormsIndex',
  'BMICalculator',
  'TDEECalculator'
]);

// 響應式檢測
const screenWidth = ref(window.innerWidth);
const isMobile = computed(() => screenWidth.value < 768);
const isTablet = computed(() => screenWidth.value >= 768 && screenWidth.value < 1024);
const isDesktop = computed(() => screenWidth.value >= 1024);

// 主題相關
const isDarkMode = ref(false);

/**
 * 應用初始化
 */
const initializeApp = async () => {
  try {
    isGlobalLoading.value = true;
    loadingText.value = '初始化應用...';

    // 1. 初始化認證狀態
    loadingText.value = '驗證用戶身份...';
    await authStore.initializeAuth();

    // 2. 載入表單配置
    if (authStore.isAuthenticated || authStore.isGuest) {
      loadingText.value = '載入表單配置...';
      await formsStore.loadFormConfigs();
    }

    // 3. 設置主題
    loadingText.value = '設置主題...';
    await initializeTheme();

    // 4. 設置全局錯誤處理
    setupGlobalErrorHandling();

    // 5. 設置性能監控
    if (FEATURE_FLAGS.DEVELOPMENT.ENABLE_PERFORMANCE_MONITOR) {
      setupPerformanceMonitoring();
    }

    // 6. 設置 PWA
    if (enablePWA.value) {
      loadingText.value = '設置 PWA...';
      await setupPWA();
    }

    await nextTick();
    isAppReady.value = true;
    
    ElMessage.success('應用載入完成');
    
  } catch (error) {
    console.error('應用初始化失敗:', error);
    ElNotification({
      title: '初始化失敗',
      message: '應用初始化時發生錯誤，請刷新頁面重試',
      type: 'error',
      duration: 0,
      showClose: true
    });
  } finally {
    // 延遲隱藏加載動畫，確保用戶體驗
    setTimeout(() => {
      isGlobalLoading.value = false;
    }, 500);
  }
};

/**
 * 初始化主題
 */
const initializeTheme = async () => {
  try {
    // 從本地存儲讀取主題設置
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    isDarkMode.value = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    // 應用主題到 document
    document.documentElement.setAttribute(
      'data-theme', 
      isDarkMode.value ? 'dark' : 'light'
    );
    
    // 監聽系統主題變化
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          isDarkMode.value = e.matches;
          document.documentElement.setAttribute(
            'data-theme', 
            isDarkMode.value ? 'dark' : 'light'
          );
        }
      });
      
  } catch (error) {
    console.error('主題初始化失敗:', error);
  }
};

/**
 * 設置全局錯誤處理
 */
const setupGlobalErrorHandling = () => {
  // Vue 錯誤處理
  window.addEventListener('error', (event) => {
    console.error('全局錯誤:', event.error);
    
    if (!ENV_CONSTANTS.IS_DEVELOPMENT) {
      ElMessage.error('頁面發生錯誤，請刷新後重試');
    }
  });

  // Promise 未捕獲錯誤處理
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未捕獲的 Promise 錯誤:', event.reason);
    
    if (!ENV_CONSTANTS.IS_DEVELOPMENT) {
      ElMessage.error('操作失敗，請重試');
    }
    
    // 防止錯誤冒泡到控制台
    event.preventDefault();
  });
};

/**
 * 設置性能監控
 */
const setupPerformanceMonitoring = () => {
  // 監控路由切換性能
  router.beforeEach((to, from, next) => {
    performance.mark(`route-start-${to.path}`);
    next();
  });

  router.afterEach((to) => {
    performance.mark(`route-end-${to.path}`);
    performance.measure(
      `route-duration-${to.path}`,
      `route-start-${to.path}`,
      `route-end-${to.path}`
    );
  });

  // 監控頁面載入時間
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    console.log('頁面載入時間:', navigation.loadEventEnd - navigation.fetchStart, 'ms');
  });
};

/**
 * 設置 PWA
 */
const setupPWA = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 註冊成功');
    } catch (error) {
      console.error('Service Worker 註冊失敗:', error);
    }
  }
};

/**
 * 獲取路由轉場動畫名稱
 */
const getTransitionName = (route: any) => {
  // 根據路由層級決定動畫類型
  const depth = route.path.split('/').length;
  
  if (route.path.includes('/auth/')) return 'auth-transition';
  if (route.path.includes('/forms/')) return 'form-transition';
  if (route.path.includes('/user/')) return 'user-transition';
  if (route.path.includes('/error/')) return 'error-transition';
  
  return depth > 2 ? 'slide-left' : 'fade';
};

/**
 * 路由進入動畫回調
 */
const onRouteEnter = (el: Element) => {
  // 路由進入時的處理
  el.classList.add('route-enter');
};

/**
 * 路由離開動畫回調
 */
const onRouteLeave = (el: Element) => {
  // 路由離開時的處理
  el.classList.add('route-leave');
};

/**
 * 處理窗口大小變化
 */
const handleResize = () => {
  screenWidth.value = window.innerWidth;
};

/**
 * 處理頁面可見性變化
 */
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 頁面隱藏時的處理
    console.log('頁面隱藏');
  } else {
    // 頁面顯示時的處理
    console.log('頁面顯示');
    
    // 刷新認證狀態
    if (authStore.isAuthenticated) {
      authStore.checkAuthStatus();
    }
  }
};

// 監聽路由變化
watch(() => route.path, (newPath, oldPath) => {
  // 記錄路由變化
  console.log(`路由變化: ${oldPath} → ${newPath}`);
  
  // 清除之前的錯誤狀態
  // 可以在這裡重置全局狀態
});

// 監聽認證狀態變化
watch(() => authStore.isAuthenticated, async (newVal) => {
  if (newVal) {
    // 用戶登錄後載入個人數據
    try {
      await formsStore.loadFormConfigs();
    } catch (error) {
      console.error('載入用戶數據失敗:', error);
    }
  }
});

// 生命週期鈎子
onMounted(async () => {
  // 添加事件監聽器
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 初始化應用
  await initializeApp();
});

onUnmounted(() => {
  // 清理事件監聽器
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style lang="scss" scoped>
#app {
  min-height: 100vh;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
  overflow-x: hidden;
}

/* 全局加載遮罩 */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  
  .loading-icon {
    color: var(--el-color-primary);
    animation: rotate 2s linear infinite;
    margin-bottom: 16px;
  }
  
  .loading-text {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin: 0;
  }
}

/* 深色模式下的加載遮罩 */
.dark-mode .global-loading {
  background: rgba(0, 0, 0, 0.95);
}

/* 路由組件容器 */
.route-component {
  min-height: 100vh;
  width: 100%;
}

/* 響應式類名 */
.is-mobile {
  .route-component {
    padding: 0;
  }
}

.is-tablet {
  .route-component {
    padding: 0 16px;
  }
}

.is-desktop {
  .route-component {
    padding: 0 24px;
  }
}

/* 路由轉場動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

/* 認證頁面轉場 */
.auth-transition-enter-active,
.auth-transition-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.auth-transition-enter-from {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}

.auth-transition-leave-to {
  transform: translateY(-20px) scale(1.05);
  opacity: 0;
}

/* 表單頁面轉場 */
.form-transition-enter-active,
.form-transition-leave-active {
  transition: all 0.3s ease;
}

.form-transition-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.form-transition-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* 用戶頁面轉場 */
.user-transition-enter-active,
.user-transition-leave-active {
  transition: all 0.3s ease;
}

.user-transition-enter-from {
  transform: translateY(10px);
  opacity: 0;
}

.user-transition-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* 錯誤頁面轉場 */
.error-transition-enter-active,
.error-transition-leave-active {
  transition: all 0.5s ease;
}

.error-transition-enter-from {
  transform: scale(0.8);
  opacity: 0;
}

.error-transition-leave-to {
  transform: scale(1.2);
  opacity: 0;
}

/* 動畫關鍵幀 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

/* 全局滾動條樣式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border-radius: 4px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}

/* 深色模式滾動條 */
.dark-mode {
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
}

/* 全局選擇文本樣式 */
::selection {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}

.dark-mode ::selection {
  background: var(--el-color-primary-dark-2);
  color: var(--el-color-primary-light-5);
}

/* 全局焦點樣式 */
*:focus {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

/* 禁用焦點樣式的元素 */
button:focus,
.el-button:focus,
.el-input__inner:focus,
.el-textarea__inner:focus {
  outline: none;
}

/* 移動端優化 */
@media (max-width: 768px) {
  #app {
    overflow-x: hidden;
  }
  
  .global-loading {
    .loading-icon {
      font-size: 32px;
    }
    
    .loading-text {
      font-size: 12px;
    }
  }
  
  /* 禁用移動端的選擇高亮 */
  * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  /* 恢復可編輯元素的選擇 */
  input,
  textarea,
  [contenteditable] {
    -webkit-user-select: text;
    user-select: text;
  }
}

/* 平板端優化 */
@media (min-width: 768px) and (max-width: 1024px) {
  .route-component {
    max-width: 100%;
    margin: 0 auto;
  }
}

/* 桌面端優化 */
@media (min-width: 1024px) {
  .route-component {
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* 高分辨率屏幕優化 */
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  .global-loading {
    backdrop-filter: blur(20px);
  }
}

/* 減少動畫的用戶偏好設置 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高對比度模式支持 */
@media (prefers-contrast: high) {
  .global-loading {
    background: rgba(255, 255, 255, 1);
    backdrop-filter: none;
  }
  
  .dark-mode .global-loading {
    background: rgba(0, 0, 0, 1);
  }
}

/* 列印樣式 */
@media print {
  #app {
    background: white !important;
    color: black !important;
  }
  
  .global-loading,
  .notification-container,
  nav,
  aside,
  .debug-panel,
  .network-status,
  .pwa-update-prompt {
    display: none !important;
  }
}