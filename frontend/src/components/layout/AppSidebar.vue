<template>
  <aside :class="sidebarClasses" :style="sidebarStyle">
    <!-- 側邊欄頭部 -->
    <div v-if="showHeader" :class="headerClasses">
      <slot name="header">
        <div class="sidebar-logo">
          <router-link :to="homeRoute" class="logo-link">
            <img
              v-if="logoUrl"
              :src="logoUrl"
              :alt="appTitle"
              class="logo-image"
            />
            <div v-else class="logo-placeholder">
              <Document />
            </div>
            <Transition name="fade">
              <span v-if="!collapsed" class="logo-text">
                {{ appTitle }}
              </span>
            </Transition>
          </router-link>
        </div>
        
        <!-- 折疊按鈕 -->
        <el-button
          v-if="showCollapseButton"
          :class="collapseButtonClasses"
          size="small"
          text
          @click="toggleCollapse"
          :aria-label="collapsed ? '展開側邊欄' : '收起側邊欄'"
        >
          <component :is="collapseIcon" />
        </el-button>
      </slot>
    </div>

    <!-- 用戶信息區域 -->
    <div v-if="showUserInfo && userInfo" :class="userInfoClasses">
      <slot name="user-info" :user="userInfo" :collapsed="collapsed">
        <div class="user-card">
          <el-avatar
            :size="collapsed ? 32 : 40"
            :src="userInfo.avatar"
            :icon="UserFilled"
          />
          <Transition name="slide-fade">
            <div v-if="!collapsed" class="user-details">
              <div class="user-name">{{ userInfo.displayName }}</div>
              <div class="user-role">{{ userInfo.role }}</div>
            </div>
          </Transition>
        </div>
      </slot>
    </div>

    <!-- 導航菜單 -->
    <nav :class="menuClasses" role="navigation">
      <el-menu
        :default-active="activeMenuKey"
        :collapse="collapsed"
        :unique-opened="uniqueOpened"
        :router="enableRouter"
        :collapse-transition="collapseTransition"
        @select="handleMenuSelect"
        @open="handleSubMenuOpen"
        @close="handleSubMenuClose"
      >
        <template v-for="item in menuItems" :key="item.key">
          <!-- 菜單分組 -->
          <el-menu-item-group
            v-if="item.type === 'group'"
            :title="collapsed ? '' : item.title"
          >
            <template v-for="groupItem in item.children" :key="groupItem.key">
              <sidebar-menu-item
                :item="groupItem"
                :collapsed="collapsed"
                :base-path="basePath"
              />
            </template>
          </el-menu-item-group>

          <!-- 分隔線 -->
          <li v-else-if="item.type === 'divider'" class="menu-divider" />

          <!-- 普通菜單項 -->
          <sidebar-menu-item
            v-else
            :item="item"
            :collapsed="collapsed"
            :base-path="basePath"
          />
        </template>
      </el-menu>
    </nav>

    <!-- 側邊欄底部 -->
    <div v-if="showFooter" :class="footerClasses">
      <slot name="footer" :collapsed="collapsed">
        <!-- 快捷操作 -->
        <div v-if="quickActions.length > 0" class="quick-actions">
          <el-tooltip
            v-for="action in quickActions"
            :key="action.key"
            :content="action.title"
            :disabled="!collapsed"
            placement="right"
          >
            <el-button
              :icon="action.icon"
              :type="action.type || 'text'"
              size="small"
              @click="handleActionClick(action)"
            >
              <span v-if="!collapsed">{{ action.title }}</span>
            </el-button>
          </el-tooltip>
        </div>

        <!-- 版本信息 -->
        <div v-if="showVersion && !collapsed" class="version-info">
          <span class="version-text">v{{ appVersion }}</span>
        </div>
      </slot>
    </div>

    <!-- 調整大小手柄 -->
    <div
      v-if="resizable && !collapsed"
      class="resize-handle"
      @mousedown="startResize"
    />
  </aside>

  <!-- 移動端遮罩 -->
  <Transition name="mask">
    <div
      v-if="isMobile && !collapsed"
      class="sidebar-mask"
      @click="handleMaskClick"
    />
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMenu, ElButton, ElAvatar, ElTooltip, ElMenuItemGroup } from 'element-plus';
import { 
  Document, 
  UserFilled, 
  Expand, 
  Fold 
} from '@element-plus/icons-vue';
import SidebarMenuItem from './SidebarMenuItem.vue';

// 菜單項類型定義
interface MenuItem {
  key: string;
  title: string;
  path?: string;
  icon?: any;
  type?: 'item' | 'group' | 'divider';
  children?: MenuItem[];
  disabled?: boolean;
  hidden?: boolean;
  badge?: string | number;
  permission?: string | string[];
  meta?: Record<string, any>;
}

// 快捷操作類型定義
interface QuickAction {
  key: string;
  title: string;
  icon: any;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  action: () => void;
  permission?: string | string[];
}

// 用戶信息類型定義
interface UserInfo {
  displayName: string;
  role: string;
  avatar?: string;
}

// 定義 Props
interface Props {
  // 基礎配置
  collapsed?: boolean;
  width?: string | number;
  collapsedWidth?: string | number;
  
  // 顯示控制
  showHeader?: boolean;
  showUserInfo?: boolean;
  showFooter?: boolean;
  showCollapseButton?: boolean;
  showVersion?: boolean;
  
  // Logo 相關
  logoUrl?: string;
  appTitle?: string;
  homeRoute?: string;
  
  // 菜單配置
  menuItems?: MenuItem[];
  uniqueOpened?: boolean;
  enableRouter?: boolean;
  collapseTransition?: boolean;
  basePath?: string;
  
  // 用戶信息
  userInfo?: UserInfo | null;
  
  // 快捷操作
  quickActions?: QuickAction[];
  
  // 功能配置
  resizable?: boolean;
  fixed?: boolean;
  
  // 版本信息
  appVersion?: string;
  
  // 樣式配置
  variant?: 'default' | 'dark' | 'light';
  theme?: 'auto' | 'light' | 'dark';
  
  // 響應式
  mobileBreakpoint?: number;
  autoCollapse?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  width: 240,
  collapsedWidth: 64,
  showHeader: true,
  showUserInfo: true,
  showFooter: true,
  showCollapseButton: true,
  showVersion: true,
  logoUrl: '',
  appTitle: '動態表單系統',
  homeRoute: '/',
  menuItems: () => [],
  uniqueOpened: false,
  enableRouter: true,
  collapseTransition: true,
  basePath: '',
  userInfo: null,
  quickActions: () => [],
  resizable: false,
  fixed: true,
  appVersion: '1.0.0',
  variant: 'default',
  theme: 'auto',
  mobileBreakpoint: 768,
  autoCollapse: true
});

// 定義 Emits
const emit = defineEmits<{
  collapse: [collapsed: boolean];
  menuSelect: [key: string, keyPath: string[], item: MenuItem];
  subMenuOpen: [key: string, keyPath: string[]];
  subMenuClose: [key: string, keyPath: string[]];
  actionClick: [action: QuickAction];
  resize: [width: number];
}>();

// 路由相關
const router = useRouter();
const route = useRoute();

// 響應式狀態
const isCollapsed = ref(props.collapsed);
const currentWidth = ref(typeof props.width === 'number' ? props.width : 240);
const isMobile = ref(false);
const isResizing = ref(false);

// 計算屬性
const collapsed = computed({
  get: () => isCollapsed.value,
  set: (value: boolean) => {
    isCollapsed.value = value;
    emit('collapse', value);
  }
});

const sidebarClasses = computed(() => ({
  'app-sidebar': true,
  [`app-sidebar--${props.variant}`]: true,
  [`app-sidebar--${props.theme}`]: props.theme !== 'auto',
  'app-sidebar--collapsed': collapsed.value,
  'app-sidebar--fixed': props.fixed,
  'app-sidebar--mobile': isMobile.value,
  'app-sidebar--resizing': isResizing.value
}));

const sidebarStyle = computed(() => ({
  width: collapsed.value 
    ? (typeof props.collapsedWidth === 'number' ? `${props.collapsedWidth}px` : props.collapsedWidth)
    : `${currentWidth.value}px`,
  '--sidebar-width': `${currentWidth.value}px`,
  '--sidebar-collapsed-width': typeof props.collapsedWidth === 'number' 
    ? `${props.collapsedWidth}px` 
    : props.collapsedWidth
}));

const headerClasses = computed(() => ({
  'sidebar-header': true,
  'sidebar-header--collapsed': collapsed.value
}));

const userInfoClasses = computed(() => ({
  'sidebar-user-info': true,
  'sidebar-user-info--collapsed': collapsed.value
}));

const menuClasses = computed(() => ({
  'sidebar-menu': true,
  'sidebar-menu--collapsed': collapsed.value
}));

const footerClasses = computed(() => ({
  'sidebar-footer': true,
  'sidebar-footer--collapsed': collapsed.value
}));

const collapseButtonClasses = computed(() => ({
  'collapse-button': true,
  'collapse-button--collapsed': collapsed.value
}));

const collapseIcon = computed(() => collapsed.value ? Expand : Fold);

const activeMenuKey = computed(() => {
  // 根據當前路由計算活躍菜單項
  return findActiveMenuKey(props.menuItems, route.path);
});

// 方法
const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};

const handleMenuSelect = (key: string, keyPath: string[]) => {
  const item = findMenuItemByKey(props.menuItems, key);
  if (item) {
    emit('menuSelect', key, keyPath, item);
  }
  
  // 移動端選擇菜單後自動收起
  if (isMobile.value) {
    collapsed.value = true;
  }
};

const handleSubMenuOpen = (key: string, keyPath: string[]) => {
  emit('subMenuOpen', key, keyPath);
};

const handleSubMenuClose = (key: string, keyPath: string[]) => {
  emit('subMenuClose', key, keyPath);
};

const handleActionClick = (action: QuickAction) => {
  action.action();
  emit('actionClick', action);
};

const handleMaskClick = () => {
  if (isMobile.value) {
    collapsed.value = true;
  }
};

const findActiveMenuKey = (items: MenuItem[], currentPath: string): string => {
  for (const item of items) {
    if (item.path === currentPath) {
      return item.key;
    }
    if (item.children) {
      const found = findActiveMenuKey(item.children, currentPath);
      if (found) return found;
    }
  }
  return '';
};

const findMenuItemByKey = (items: MenuItem[], key: string): MenuItem | null => {
  for (const item of items) {
    if (item.key === key) {
      return item;
    }
    if (item.children) {
      const found = findMenuItemByKey(item.children, key);
      if (found) return found;
    }
  }
  return null;
};

const checkMobile = () => {
  const wasMobile = isMobile.value;
  isMobile.value = window.innerWidth < props.mobileBreakpoint;
  
  // 自動折疊邏輯
  if (props.autoCollapse) {
    if (isMobile.value && !wasMobile) {
      // 切換到移動端時自動收起
      collapsed.value = true;
    } else if (!isMobile.value && wasMobile) {
      // 切換到桌面端時自動展開
      collapsed.value = false;
    }
  }
};

// 調整大小相關
const startResize = (e: MouseEvent) => {
  if (!props.resizable) return;
  
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = currentWidth.value;
  
  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(400, startWidth + deltaX));
    currentWidth.value = newWidth;
    emit('resize', newWidth);
  };
  
  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  e.preventDefault();
};

// 事件監聽
const handleResize = () => {
  checkMobile();
};

// 監聽器
watch(() => props.collapsed, (newVal) => {
  isCollapsed.value = newVal;
});

watch(() => route.path, () => {
  // 路由變化時的處理
});

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
  name: 'AppSidebar'
};
</script>

<style lang="scss" scoped>
.app-sidebar {
  position: relative;
  height: 100vh;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1001;
  
  &--fixed {
    position: fixed;
    top: 0;
    left: 0;
  }
  
  &--collapsed {
    .fade-enter-active,
    .fade-leave-active {
      transition: opacity 0.2s ease;
    }
    
    .fade-enter-from,
    .fade-leave-to {
      opacity: 0;
    }
    
    .slide-fade-enter-active,
    .slide-fade-leave-active {
      transition: all 0.2s ease;
    }
    
    .slide-fade-enter-from,
    .slide-fade-leave-to {
      opacity: 0;
      transform: translateX(-20px);
    }
  }
  
  &--mobile {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2000;
    box-shadow: var(--el-box-shadow);
    
    &.app-sidebar--collapsed {
      transform: translateX(-100%);
    }
  }
  
  &--dark {
    background-color: #001529;
    border-right-color: #002140;
  }
  
  &--light {
    background-color: #fafafa;
    border-right-color: #e8e8e8;
  }
  
  &--resizing {
    user-select: none;
    
    * {
      pointer-events: none;
    }
  }
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  
  &--collapsed {
    padding: 16px 8px;
    justify-content: center;
  }
  
  .sidebar-logo {
    .logo-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      
      .logo-image,
      .logo-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .logo-image {
        object-fit: cover;
      }
      
      .logo-placeholder {
        background: var(--el-color-primary);
        color: white;
        font-size: 16px;
      }
      
      .logo-text {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        white-space: nowrap;
      }
    }
  }
  
  .collapse-button {
    padding: 4px;
    
    &--collapsed {
      display: none;
    }
  }
}

.sidebar-user-info {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  
  &--collapsed {
    padding: 16px 8px;
    
    .user-card {
      justify-content: center;
    }
  }
  
  .user-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 8px;
    background-color: var(--el-fill-color-light);
    
    .user-details {
      flex: 1;
      min-width: 0;
      
      .user-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .user-role {
        font-size: 12px;
        color: var(--el-text-color-regular);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  
  :deep(.el-menu) {
    border: none;
    background-color: transparent;
    
    .el-menu-item,
    .el-sub-menu__title {
      height: 48px;
      line-height: 48px;
      margin: 2px 8px;
      border-radius: 6px;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
      
      &.is-active {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
        font-weight: 500;
        
        &::before {
          content: '';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background-color: var(--el-color-primary);
          border-radius: 2px;
        }
      }
    }
    
    .el-menu-item-group__title {
      padding: 12px 16px 8px;
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .el-sub-menu {
      .el-menu {
        background-color: var(--el-fill-color-extra-light);
        
        .el-menu-item {
          height: 40px;
          line-height: 40px;
          padding-left: 48px !important;
        }
      }
    }
  }
  
  .menu-divider {
    height: 1px;
    background-color: var(--el-border-color-lighter);
    margin: 8px 16px;
    list-style: none;
  }
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  
  &--collapsed {
    padding: 16px 8px;
  }
  
  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    
    .app-sidebar--collapsed & {
      align-items: center;
    }
    
    .el-button {
      justify-content: flex-start;
      width: 100%;
      
      .app-sidebar--collapsed & {
        width: auto;
        justify-content: center;
      }
    }
  }
  
  .version-info {
    text-align: center;
    padding: 8px 0;
    
    .version-text {
      font-size: 11px;
      color: var(--el-text-color-placeholder);
      font-weight: 400;
    }
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: var(--el-color-primary);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -2px;
    right: -2px;
    bottom: 0;
  }
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

// 遮罩動畫
.mask-enter-active,
.mask-leave-active {
  transition: opacity 0.3s ease;
}

.mask-enter-from,
.mask-leave-to {
  opacity: 0;
}

// 深色主題
.app-sidebar--dark {
  background-color: #001529;
  border-right-color: #002140;
  
  .sidebar-header,
  .sidebar-user-info,
  .sidebar-footer {
    border-color: #002140;
  }
  
  .sidebar-logo .logo-link .logo-text {
    color: rgba(255, 255, 255, 0.85);
  }
  
  .user-card {
    background-color: rgba(255, 255, 255, 0.04);
    
    .user-name {
      color: rgba(255, 255, 255, 0.85);
    }
    
    .user-role {
      color: rgba(255, 255, 255, 0.45);
    }
  }
  
  :deep(.el-menu) {
    .el-menu-item,
    .el-sub-menu__title {
      color: rgba(255, 255, 255, 0.65);
      
      &:hover {
        background-color: rgba(24, 144, 255, 0.1);
        color: #1890ff;
      }
      
      &.is-active {
        background-color: rgba(24, 144, 255, 0.1);
        color: #1890ff;
      }
    }
    
    .el-menu-item-group__title {
      color: rgba(255, 255, 255, 0.3);
    }
    
    .el-sub-menu .el-menu {
      background-color: rgba(255, 255, 255, 0.02);
    }
  }
  
  .menu-divider {
    background-color: #002140;
  }
  
  .version-info .version-text {
    color: rgba(255, 255, 255, 0.3);
  }
}

// 淺色主題
.app-sidebar--light {
  background-color: #fafafa;
  border-right-color: #e8e8e8;
  
  .sidebar-header,
  .sidebar-user-info,
  .sidebar-footer {
    border-color: #e8e8e8;
  }
  
  .user-card {
    background-color: #f0f0f0;
  }
  
  :deep(.el-menu) {
    .el-menu-item,
    .el-sub-menu__title {
      &:hover {
        background-color: #e6f7ff;
        color: #1890ff;
      }
      
      &.is-active {
        background-color: #e6f7ff;
        color: #1890ff;
      }
    }
    
    .el-sub-menu .el-menu {
      background-color: #f5f5f5;
    }
  }
  
  .menu-divider {
    background-color: #e8e8e8;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .app-sidebar {
    width: 280px !important;
    
    &--collapsed {
      transform: translateX(-100%);
    }
  }
}

// 滾動條樣式
.sidebar-menu {
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-darker);
    border-radius: 2px;
    
    &:hover {
      background: var(--el-border-color-dark);
    }
  }
}

// 深色模式下的滾動條
.app-sidebar--dark .sidebar-menu {
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 動畫效果
.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s ease;
  }
  
  &:hover::after {
    left: 100%;
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .app-sidebar {
    border-right-width: 2px;
    
    :deep(.el-menu) {
      .el-menu-item,
      .el-sub-menu__title {
        &.is-active {
          background-color: var(--el-color-primary);
          color: white;
        }
      }
    }
  }
}

// 減少動畫偏好
@media (prefers-reduced-motion: reduce) {
  .app-sidebar,
  .sidebar-menu :deep(.el-menu-item),
  .sidebar-menu :deep(.el-sub-menu__title),
  .fade-enter-active,
  .fade-leave-active,
  .slide-fade-enter-active,
  .slide-fade-leave-active,
  .mask-enter-active,
  .mask-leave-active {
    transition: none;
  }
  
  .sidebar-menu :deep(.el-menu-item)::after,
  .sidebar-menu :deep(.el-sub-menu__title)::after {
    display: none;
  }
}

// 列印樣式
@media print {
  .app-sidebar {
    display: none !important;
  }
  
  .sidebar-mask {
    display: none !important;
  }
}

// RTL 支持
[dir="rtl"] {
  .app-sidebar {
    border-right: none;
    border-left: 1px solid var(--el-border-color-light);
    
    &--fixed {
      left: auto;
      right: 0;
    }
    
    &--mobile {
      left: auto;
      right: 0;
      
      &.app-sidebar--collapsed {
        transform: translateX(100%);
      }
    }
  }
  
  .sidebar-header {
    .sidebar-logo .logo-link {
      flex-direction: row-reverse;
    }
  }
  
  .user-card {
    flex-direction: row-reverse;
  }
  
  .sidebar-menu :deep(.el-menu) {
    .el-menu-item.is-active::before {
      right: auto;
      left: 8px;
    }
    
    .el-sub-menu .el-menu .el-menu-item {
      padding-left: 16px !important;
      padding-right: 48px !important;
    }
  }
  
  .resize-handle {
    right: auto;
    left: 0;
  }
  
  .quick-actions .el-button {
    justify-content: flex-end;
    
    .app-sidebar--collapsed & {
      justify-content: center;
    }
  }
}