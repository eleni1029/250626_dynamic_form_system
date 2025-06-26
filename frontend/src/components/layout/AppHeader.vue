<template>
  <header :class="headerClasses" :style="headerStyle">
    <div :class="containerClasses">
      <!-- 左側區域 -->
      <div class="header-left">
        <!-- 側邊欄切換按鈕（移動端） -->
        <el-button
          v-if="showMenuButton"
          :class="menuButtonClasses"
          :size="buttonSize"
          text
          @click="toggleSidebar"
          aria-label="切換導航菜單"
        >
          <component :is="menuIcon" />
        </el-button>

        <!-- Logo 和應用標題 -->
        <router-link
          :to="homeRoute"
          :class="logoClasses"
          @click="handleLogoClick"
        >
          <div v-if="showLogo" class="logo-image">
            <img
              v-if="logoUrl"
              :src="logoUrl"
              :alt="appTitle"
              class="logo-img"
            />
            <div v-else class="logo-placeholder">
              <Document />
            </div>
          </div>
          <div v-if="showTitle" class="logo-text">
            <h1 class="app-title">{{ appTitle }}</h1>
            <p v-if="showSubtitle && appSubtitle" class="app-subtitle">
              {{ appSubtitle }}
            </p>
          </div>
        </router-link>

        <!-- 面包屑導航 -->
        <nav
          v-if="showBreadcrumb && breadcrumbs.length > 0"
          :class="breadcrumbClasses"
          aria-label="面包屑導航"
        >
          <el-breadcrumb :separator="breadcrumbSeparator">
            <el-breadcrumb-item
              v-for="(item, index) in breadcrumbs"
              :key="item.path || index"
              :to="item.to"
              :class="breadcrumbItemClasses(item, index)"
            >
              <component
                v-if="item.icon"
                :is="item.icon"
                class="breadcrumb-icon"
              />
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </nav>
      </div>

      <!-- 中間區域（可選） -->
      <div v-if="$slots.center" class="header-center">
        <slot name="center" />
      </div>

      <!-- 右側區域 -->
      <div class="header-right">
        <!-- 搜索框 -->
        <div v-if="showSearch" :class="searchClasses">
          <el-input
            v-model="searchValue"
            :placeholder="searchPlaceholder"
            :size="inputSize"
            clearable
            @input="handleSearchInput"
            @keyup.enter="handleSearchEnter"
            @clear="handleSearchClear"
          >
            <template #prefix>
              <Search />
            </template>
          </el-input>
        </div>

        <!-- 快捷操作按鈕 -->
        <div v-if="showQuickActions" class="quick-actions">
          <slot name="quick-actions">
            <!-- 通知按鈕 -->
            <el-badge
              v-if="showNotifications"
              :value="notificationCount"
              :hidden="notificationCount === 0"
              :max="99"
            >
              <el-button
                :size="buttonSize"
                text
                @click="handleNotificationClick"
                aria-label="通知"
              >
                <Bell />
              </el-button>
            </el-badge>

            <!-- 幫助按鈕 -->
            <el-button
              v-if="showHelp"
              :size="buttonSize"
              text
              @click="handleHelpClick"
              aria-label="幫助"
            >
              <QuestionFilled />
            </el-button>

            <!-- 設置按鈕 -->
            <el-button
              v-if="showSettings"
              :size="buttonSize"
              text
              @click="handleSettingsClick"
              aria-label="設置"
            >
              <Setting />
            </el-button>
          </slot>
        </div>

        <!-- 主題切換按鈕 -->
        <el-button
          v-if="showThemeToggle"
          :size="buttonSize"
          text
          @click="toggleTheme"
          :aria-label="isDarkMode ? '切換到淺色模式' : '切換到深色模式'"
        >
          <component :is="themeIcon" />
        </el-button>

        <!-- 用戶菜單 -->
        <div v-if="showUserMenu" class="user-menu">
          <el-dropdown
            trigger="click"
            @command="handleUserMenuCommand"
            placement="bottom-end"
          >
            <div :class="userAvatarClasses">
              <el-avatar
                :size="avatarSize"
                :src="userAvatar"
                :icon="UserFilled"
                @error="handleAvatarError"
              />
              <div v-if="showUserInfo" class="user-info">
                <div class="user-name">{{ displayUserName }}</div>
                <div v-if="userRole" class="user-role">{{ userRole }}</div>
              </div>
              <el-icon class="dropdown-icon">
                <ArrowDown />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <slot name="user-menu-items">
                  <el-dropdown-item
                    v-if="authStore.isAuthenticated"
                    command="profile"
                    :icon="User"
                  >
                    個人資料
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="authStore.isAuthenticated"
                    command="settings"
                    :icon="Setting"
                  >
                    賬號設置
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="authStore.isGuest"
                    command="upgrade"
                    :icon="Promotion"
                  >
                    升級賬號
                  </el-dropdown-item>
                  <el-dropdown-item divided />
                  <el-dropdown-item
                    v-if="authStore.isAuthenticated || authStore.isGuest"
                    command="logout"
                    :icon="SwitchButton"
                  >
                    {{ authStore.isGuest ? '退出遊客模式' : '登出' }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-else
                    command="login"
                    :icon="Key"
                  >
                    登錄
                  </el-dropdown-item>
                </slot>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 進度條 -->
    <div v-if="showProgress" :class="progressClasses">
      <div
        class="progress-bar"
        :style="progressStyle"
      ></div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  ElButton, 
  ElInput, 
  ElDropdown, 
  ElDropdownMenu, 
  ElDropdownItem,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElAvatar,
  ElBadge,
  ElIcon
} from 'element-plus';
import {
  Menu,
  Fold,
  Document,
  Search,
  Bell,
  QuestionFilled,
  Setting,
  Sunny,
  Moon,
  UserFilled,
  User,
  ArrowDown,
  SwitchButton,
  Key,
  Promotion
} from '@element-plus/icons-vue';

// 導入 stores
import { useAuthStore } from '@/stores/auth';
import { useBreadcrumbStore } from '@/stores/breadcrumb';
import { useThemeStore } from '@/stores/theme';

// 導入常量
import { ROUTE_NAMES } from '@/router';
import { UI_CONSTANTS } from '@/utils/constants';

// 面包屑項目類型
interface BreadcrumbItem {
  title: string;
  path?: string;
  to?: string | object;
  icon?: any;
  disabled?: boolean;
}

// 定義 Props
interface Props {
  // 布局相關
  fixed?: boolean;
  height?: string | number;
  showMenuButton?: boolean;
  showBorder?: boolean;
  
  // Logo 相關
  showLogo?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  logoUrl?: string;
  appTitle?: string;
  appSubtitle?: string;
  homeRoute?: string;
  
  // 面包屑
  showBreadcrumb?: boolean;
  breadcrumbSeparator?: string;
  
  // 搜索相關
  showSearch?: boolean;
  searchPlaceholder?: string;
  
  // 功能按鈕
  showQuickActions?: boolean;
  showNotifications?: boolean;
  showHelp?: boolean;
  showSettings?: boolean;
  showThemeToggle?: boolean;
  
  // 用戶相關
  showUserMenu?: boolean;
  showUserInfo?: boolean;
  
  // 進度條
  showProgress?: boolean;
  progress?: number;
  
  // 樣式相關
  variant?: 'default' | 'transparent' | 'blur';
  size?: 'small' | 'medium' | 'large';
  
  // 響應式
  mobileBreakpoint?: number;
}

const props = withDefaults(defineProps<Props>(), {
  fixed: true,
  height: 64,
  showMenuButton: true,
  showBorder: true,
  showLogo: true,
  showTitle: true,
  showSubtitle: false,
  logoUrl: '',
  appTitle: '動態表單系統',
  appSubtitle: '',
  homeRoute: '/',
  showBreadcrumb: true,
  breadcrumbSeparator: '/',
  showSearch: false,
  searchPlaceholder: '搜索...',
  showQuickActions: true,
  showNotifications: true,
  showHelp: true,
  showSettings: true,
  showThemeToggle: true,
  showUserMenu: true,
  showUserInfo: true,
  showProgress: false,
  progress: 0,
  variant: 'default',
  size: 'medium',
  mobileBreakpoint: 768
});

// 定義 Emits
const emit = defineEmits<{
  menuToggle: [collapsed: boolean];
  search: [value: string];
  logoClick: [void];
  notificationClick: [void];
  helpClick: [void];
  settingsClick: [void];
  userMenuCommand: [command: string];
}>();

// 路由相關
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const themeStore = useThemeStore();

// 響應式狀態
const searchValue = ref('');
const sidebarCollapsed = ref(false);
const isMobile = ref(false);

// 計算屬性
const headerClasses = computed(() => ({
  'app-header': true,
  [`app-header--${props.variant}`]: true,
  [`app-header--${props.size}`]: true,
  'app-header--fixed': props.fixed,
  'app-header--bordered': props.showBorder,
  'app-header--mobile': isMobile.value
}));

const headerStyle = computed(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height
}));

const containerClasses = computed(() => ({
  'header-container': true,
  [`header-container--${props.size}`]: true
}));

const menuButtonClasses = computed(() => ({
  'menu-button': true,
  'menu-button--collapsed': sidebarCollapsed.value
}));

const menuIcon = computed(() => sidebarCollapsed.value ? Menu : Fold);

const logoClasses = computed(() => ({
  'app-logo': true,
  [`app-logo--${props.size}`]: true,
  'app-logo--with-subtitle': props.showSubtitle && props.appSubtitle
}));

const breadcrumbClasses = computed(() => ({
  'header-breadcrumb': true,
  'header-breadcrumb--hidden': isMobile.value
}));

const searchClasses = computed(() => ({
  'header-search': true,
  [`header-search--${props.size}`]: true,
  'header-search--mobile': isMobile.value
}));

const userAvatarClasses = computed(() => ({
  'user-avatar': true,
  [`user-avatar--${props.size}`]: true,
  'user-avatar--with-info': props.showUserInfo,
  'user-avatar--guest': authStore.isGuest
}));

const progressClasses = computed(() => ({
  'header-progress': true,
  'header-progress--visible': props.showProgress && props.progress > 0
}));

const progressStyle = computed(() => ({
  width: `${Math.max(0, Math.min(100, props.progress))}%`
}));

const breadcrumbs = computed(() => breadcrumbStore.breadcrumbs);

const buttonSize = computed(() => {
  const sizeMap = { small: 'small', medium: 'default', large: 'large' };
  return sizeMap[props.size] as 'small' | 'default' | 'large';
});

const inputSize = computed(() => {
  const sizeMap = { small: 'small', medium: 'default', large: 'large' };
  return sizeMap[props.size] as 'small' | 'default' | 'large';
});

const avatarSize = computed(() => {
  const sizeMap = { small: 28, medium: 32, large: 36 };
  return sizeMap[props.size];
});

const notificationCount = computed(() => 0); // 從通知 store 獲取

const isDarkMode = computed(() => themeStore.isDarkMode);

const themeIcon = computed(() => isDarkMode.value ? Sunny : Moon);

const displayUserName = computed(() => {
  if (authStore.isGuest) return '遊客用戶';
  return authStore.user?.username || authStore.user?.email || '用戶';
});

const userRole = computed(() => {
  if (authStore.isGuest) return '遊客';
  return authStore.user?.role || '';
});

const userAvatar = computed(() => {
  if (authStore.user?.avatar) return authStore.user.avatar;
  // 生成默認頭像
  const name = displayUserName.value;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
});

// 方法
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  emit('menuToggle', sidebarCollapsed.value);
};

const handleLogoClick = () => {
  emit('logoClick');
};

const handleSearchInput = (value: string) => {
  // 防抖處理可以在這裡實現
  emit('search', value);
};

const handleSearchEnter = () => {
  if (searchValue.value.trim()) {
    emit('search', searchValue.value.trim());
    // 可以在這裡實現搜索頁面跳轉
    router.push(`/search?q=${encodeURIComponent(searchValue.value.trim())}`);
  }
};

const handleSearchClear = () => {
  searchValue.value = '';
  emit('search', '');
};

const handleNotificationClick = () => {
  emit('notificationClick');
  // 打開通知面板或跳轉到通知頁面
};

const handleHelpClick = () => {
  emit('helpClick');
  // 打開幫助文檔或跳轉到幫助頁面
  router.push('/help');
};

const handleSettingsClick = () => {
  emit('settingsClick');
  if (authStore.isAuthenticated) {
    router.push('/user/settings');
  } else {
    router.push('/auth/login');
  }
};

const toggleTheme = () => {
  themeStore.toggleTheme();
};

const handleUserMenuCommand = (command: string) => {
  emit('userMenuCommand', command);
  
  switch (command) {
    case 'profile':
      router.push('/user/profile');
      break;
    case 'settings':
      router.push('/user/settings');
      break;
    case 'upgrade':
      router.push('/auth/upgrade');
      break;
    case 'logout':
      authStore.logout();
      router.push('/');
      break;
    case 'login':
      router.push('/auth/login');
      break;
  }
};

const handleAvatarError = () => {
  // 頭像載入失敗時的處理
  console.warn('用戶頭像載入失敗');
};

const breadcrumbItemClasses = (item: BreadcrumbItem, index: number) => ({
  'breadcrumb-item': true,
  'breadcrumb-item--disabled': item.disabled,
  'breadcrumb-item--last': index === breadcrumbs.value.length - 1
});

const checkMobile = () => {
  isMobile.value = window.innerWidth < props.mobileBreakpoint;
};

// 事件監聽
const handleResize = () => {
  checkMobile();
};

// 生命週期
onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<script lang="ts">
export default {
  name: 'AppHeader'
};
</script>

<style lang="scss" scoped>
.app-header {
  position: relative;
  background-color: var(--el-bg-color);
  transition: all 0.3s ease;
  z-index: 1000;
  
  &--fixed {
    position: sticky;
    top: 0;
  }
  
  &--bordered {
    border-bottom: 1px solid var(--el-border-color-light);
  }
  
  &--transparent {
    background-color: transparent;
    backdrop-filter: blur(10px);
  }
  
  &--blur {
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
  }
  
  &--small {
    .header-container {
      height: 48px;
      padding: 0 12px;
    }
  }
  
  &--medium {
    .header-container {
      height: 64px;
      padding: 0 16px;
    }
  }
  
  &--large {
    .header-container {
      height: 80px;
      padding: 0 24px;
    }
  }
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
  margin: 0 auto;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.menu-button {
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
  }
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 0.8;
  }
  
  &--small {
    gap: 8px;
    
    .logo-image {
      width: 28px;
      height: 28px;
    }
    
    .app-title {
      font-size: 16px;
    }
    
    .app-subtitle {
      font-size: 11px;
    }
  }
  
  &--medium {
    gap: 12px;
    
    .logo-image {
      width: 32px;
      height: 32px;
    }
    
    .app-title {
      font-size: 18px;
    }
    
    .app-subtitle {
      font-size: 12px;
    }
  }
  
  &--large {
    gap: 16px;
    
    .logo-image {
      width: 40px;
      height: 40px;
    }
    
    .app-title {
      font-size: 20px;
    }
    
    .app-subtitle {
      font-size: 14px;
    }
  }
}

.logo-image {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
  
  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .logo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-color-primary);
    color: white;
    font-size: 16px;
  }
}

.header-breadcrumb {
  flex: 1;
  min-width: 0;
  margin-left: 24px;
  
  &--hidden {
    display: none;
  }
  
  :deep(.el-breadcrumb) {
    .el-breadcrumb__item {
      .el-breadcrumb__inner {
        color: var(--el-text-color-regular);
        font-weight: 400;
        
        &:hover {
          color: var(--el-color-primary);
        }
        
        &.is-link {
          cursor: pointer;
        }
      }
      
      &:last-child .el-breadcrumb__inner {
        color: var(--el-text-color-primary);
        font-weight: 500;
      }
    }
  }
  
  .breadcrumb-icon {
    margin-right: 4px;
    font-size: 14px;
  }
}

.header-center {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-search {
  &--small {
    :deep(.el-input) {
      width: 200px;
    }
  }
  
  &--medium {
    :deep(.el-input) {
      width: 240px;
    }
  }
  
  &--large {
    :deep(.el-input) {
      width: 280px;
    }
  }
  
  &--mobile {
    :deep(.el-input) {
      width: 160px;
    }
  }
  
  :deep(.el-input__inner) {
    border-radius: 20px;
  }
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  
  .el-button {
    color: var(--el-text-color-regular);
    
    &:hover {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }
  }
  
  .el-badge {
    :deep(.el-badge__content) {
      border: 2px solid var(--el-bg-color);
    }
  }
}

.user-menu {
  .user-avatar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: var(--el-color-primary-light-9);
    }
    
    &--small {
      gap: 6px;
      padding: 3px 6px;
      
      .user-info {
        .user-name {
          font-size: 13px;
        }
        
        .user-role {
          font-size: 11px;
        }
      }
    }
    
    &--medium {
      gap: 8px;
      padding: 4px 8px;
      
      .user-info {
        .user-name {
          font-size: 14px;
        }
        
        .user-role {
          font-size: 12px;
        }
      }
    }
    
    &--large {
      gap: 10px;
      padding: 5px 10px;
      
      .user-info {
        .user-name {
          font-size: 15px;
        }
        
        .user-role {
          font-size: 13px;
        }
      }
    }
    
    &--guest {
      .user-info .user-name {
        color: var(--el-color-warning);
      }
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
      
      .user-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        line-height: 1.2;
        margin: 0;
      }
      
      .user-role {
        color: var(--el-text-color-regular);
        line-height: 1.2;
        margin: 0;
      }
    }
    
    .dropdown-icon {
      color: var(--el-text-color-placeholder);
      font-size: 12px;
      transition: transform 0.3s ease;
    }
    
    &:hover .dropdown-icon {
      transform: rotate(180deg);
    }
  }
}

.header-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--el-border-color-lighter);
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  &--visible {
    opacity: 1;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--el-color-primary),
      var(--el-color-primary-light-3)
    );
    transition: width 0.3s ease;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 20px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4)
      );
      animation: shimmer 1.5s infinite;
    }
  }
}

// 移動端適配
@media (max-width: 768px) {
  .app-header {
    &--mobile {
      .header-container {
        padding: 0 12px;
        gap: 8px;
      }
      
      .header-left {
        gap: 8px;
        
        .app-logo {
          .logo-text {
            display: none;
          }
        }
      }
      
      .header-right {
        gap: 4px;
        
        .header-search {
          display: none;
        }
        
        .quick-actions {
          gap: 2px;
          
          .el-button {
            padding: 4px;
          }
        }
        
        .user-avatar--with-info {
          .user-info {
            display: none;
          }
        }
      }
    }
  }
}

// 平板端適配
@media (min-width: 768px) and (max-width: 1024px) {
  .header-search {
    :deep(.el-input) {
      width: 200px !important;
    }
  }
  
  .user-avatar {
    .user-info {
      .user-name,
      .user-role {
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

// 動畫效果
@keyframes shimmer {
  0% {
    transform: translateX(-20px);
  }
  100% {
    transform: translateX(100px);
  }
}

// 深色模式適配
@media (prefers-color-scheme: dark) {
  .app-header {
    &--blur {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .app-header {
    border-bottom-width: 2px;
    
    .app-logo,
    .user-avatar {
      &:hover {
        outline: 2px solid var(--el-color-primary);
      }
    }
  }
}

// 減少動畫偏好
@media (prefers-reduced-motion: reduce) {
  .app-header,
  .app-logo,
  .user-avatar,
  .header-progress .progress-bar,
  .dropdown-icon {
    transition: none;
  }
  
  .header-progress .progress-bar::after {
    animation: none;
  }
  
  .user-avatar:hover .dropdown-icon {
    transform: none;
  }
}

// 列印樣式
@media print {
  .app-header {
    position: static !important;
    background: transparent !important;
    border-bottom: 1px solid #ccc !important;
    
    .header-right {
      display: none !important;
    }
    
    .quick-actions,
    .user-menu,
    .header-search {
      display: none !important;
    }
    
    .app-logo .logo-text {
      color: #000 !important;
    }
  }
}

// RTL 支持
[dir="rtl"] {
  .header-container {
    direction: rtl;
  }
  
  .header-left {
    justify-content: flex-end;
  }
  
  .header-right {
    justify-content: flex-start;
  }
  
  .app-logo {
    flex-direction: row-reverse;
  }
  
  .user-avatar {
    flex-direction: row-reverse;
  }
  
  .breadcrumb-icon {
    margin-right: 0;
    margin-left: 4px;
  }
}