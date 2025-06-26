<template>
  <Transition
    name="error-message"
    mode="out-in"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-if="visible"
      :class="containerClasses"
      :style="containerStyle"
      role="alert"
      :aria-live="ariaLive"
    >
      <!-- 錯誤圖標 -->
      <div v-if="showIcon" :class="iconClasses">
        <component
          :is="iconComponent"
          :class="iconContentClasses"
          :style="iconStyle"
        />
      </div>

      <!-- 主要內容區域 -->
      <div :class="contentClasses">
        <!-- 錯誤標題 -->
        <div
          v-if="title"
          :class="titleClasses"
          :style="titleStyle"
        >
          {{ title }}
        </div>

        <!-- 錯誤描述 -->
        <div
          :class="descriptionClasses"
          :style="descriptionStyle"
        >
          <slot v-if="$slots.default" />
          <template v-else>{{ description }}</template>
        </div>

        <!-- 錯誤詳情（開發模式） -->
        <details
          v-if="showDetails && details"
          :class="detailsClasses"
          :open="detailsOpen"
        >
          <summary class="details-summary">技術詳情</summary>
          <pre class="details-content">{{ details }}</pre>
        </details>

        <!-- 建議操作 -->
        <div
          v-if="suggestions && suggestions.length > 0"
          :class="suggestionsClasses"
        >
          <div class="suggestions-title">建議操作：</div>
          <ul class="suggestions-list">
            <li
              v-for="(suggestion, index) in suggestions"
              :key="index"
              class="suggestion-item"
            >
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 操作按鈕區域 -->
      <div v-if="showActions" :class="actionsClasses">
        <!-- 重試按鈕 -->
        <el-button
          v-if="showRetry"
          :size="buttonSize"
          type="primary"
          :loading="retrying"
          :disabled="disabled"
          @click="handleRetry"
        >
          <template #icon>
            <Refresh />
          </template>
          {{ retryText }}
        </el-button>

        <!-- 關閉按鈕 -->
        <el-button
          v-if="closable"
          :size="buttonSize"
          :disabled="disabled"
          @click="handleClose"
        >
          {{ closeText }}
        </el-button>

        <!-- 自定義操作按鈕 -->
        <slot name="actions" :retry="handleRetry" :close="handleClose" />
      </div>

      <!-- 關閉按鈕（右上角） -->
      <button
        v-if="closable && showCloseIcon"
        :class="closeButtonClasses"
        :disabled="disabled"
        @click="handleClose"
        aria-label="關閉錯誤提示"
      >
        <Close />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { 
  WarningFilled, 
  CircleCloseFilled, 
  InfoFilled, 
  Close, 
  Refresh 
} from '@element-plus/icons-vue';
import { ElButton } from 'element-plus';

// 定義錯誤類型
type ErrorType = 'error' | 'warning' | 'info' | 'network' | 'validation' | 'permission' | 'server';

// 定義 Props
interface Props {
  // 基礎屬性
  visible?: boolean;
  type?: ErrorType;
  title?: string;
  description?: string;
  details?: string | Error;
  
  // 外觀相關
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'text';
  showIcon?: boolean;
  showCloseIcon?: boolean;
  
  // 行為相關
  closable?: boolean;
  showRetry?: boolean;
  showDetails?: boolean;
  detailsOpen?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  
  // 交互相關
  disabled?: boolean;
  retrying?: boolean;
  retryText?: string;
  closeText?: string;
  
  // 建議操作
  suggestions?: string[];
  
  // 無障礙
  ariaLive?: 'polite' | 'assertive' | 'off';
  
  // 自定義樣式
  customClass?: string;
  customStyle?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  type: 'error',
  title: '',
  description: '發生了一個錯誤',
  details: '',
  size: 'medium',
  variant: 'filled',
  showIcon: true,
  showCloseIcon: true,
  closable: true,
  showRetry: false,
  showDetails: false,
  detailsOpen: false,
  autoClose: false,
  autoCloseDelay: 5000,
  disabled: false,
  retrying: false,
  retryText: '重試',
  closeText: '關閉',
  suggestions: () => [],
  ariaLive: 'assertive',
  customClass: '',
  customStyle: () => ({})
});

// 定義 Emits
const emit = defineEmits<{
  close: [void];
  retry: [void];
  visible: [visible: boolean];
}>();

// 響應式狀態
const autoCloseTimer = ref<NodeJS.Timeout | null>(null);

// 圖標映射
const iconMap = {
  error: CircleCloseFilled,
  warning: WarningFilled,
  info: InfoFilled,
  network: CircleCloseFilled,
  validation: WarningFilled,
  permission: CircleCloseFilled,
  server: CircleCloseFilled
};

// 錯誤類型配置
const typeConfig = computed(() => {
  const configs = {
    error: {
      color: '#F56C6C',
      backgroundColor: '#FEF0F0',
      borderColor: '#FBC4C4',
      textColor: '#F56C6C',
      title: '錯誤'
    },
    warning: {
      color: '#E6A23C',
      backgroundColor: '#FDF6EC',
      borderColor: '#F5DAB1',
      textColor: '#E6A23C',
      title: '警告'
    },
    info: {
      color: '#409EFF',
      backgroundColor: '#EDF2FC',
      borderColor: '#B3D8FF',
      textColor: '#409EFF',
      title: '信息'
    },
    network: {
      color: '#F56C6C',
      backgroundColor: '#FEF0F0',
      borderColor: '#FBC4C4',
      textColor: '#F56C6C',
      title: '網絡錯誤'
    },
    validation: {
      color: '#E6A23C',
      backgroundColor: '#FDF6EC',
      borderColor: '#F5DAB1',
      textColor: '#E6A23C',
      title: '驗證錯誤'
    },
    permission: {
      color: '#F56C6C',
      backgroundColor: '#FEF0F0',
      borderColor: '#FBC4C4',
      textColor: '#F56C6C',
      title: '權限錯誤'
    },
    server: {
      color: '#F56C6C',
      backgroundColor: '#FEF0F0',
      borderColor: '#FBC4C4',
      textColor: '#F56C6C',
      title: '服務器錯誤'
    }
  };
  return configs[props.type];
});

// 尺寸配置
const sizeConfig = computed(() => {
  const configs = {
    small: {
      padding: '12px',
      iconSize: '16px',
      titleSize: '14px',
      descriptionSize: '12px',
      borderRadius: '4px',
      gap: '8px'
    },
    medium: {
      padding: '16px',
      iconSize: '20px',
      titleSize: '16px',
      descriptionSize: '14px',
      borderRadius: '6px',
      gap: '12px'
    },
    large: {
      padding: '20px',
      iconSize: '24px',
      titleSize: '18px',
      descriptionSize: '16px',
      borderRadius: '8px',
      gap: '16px'
    }
  };
  return configs[props.size];
});

// 計算屬性
const iconComponent = computed(() => iconMap[props.type]);

const containerClasses = computed(() => ({
  'error-message': true,
  [`error-message--${props.type}`]: true,
  [`error-message--${props.size}`]: true,
  [`error-message--${props.variant}`]: true,
  [props.customClass]: props.customClass
}));

const containerStyle = computed(() => ({
  backgroundColor: props.variant === 'filled' ? typeConfig.value.backgroundColor : 'transparent',
  borderColor: typeConfig.value.borderColor,
  borderRadius: sizeConfig.value.borderRadius,
  padding: sizeConfig.value.padding,
  gap: sizeConfig.value.gap,
  ...props.customStyle
}));

const iconClasses = computed(() => ({
  'error-icon': true,
  [`error-icon--${props.size}`]: true
}));

const iconContentClasses = computed(() => ({
  'error-icon-content': true
}));

const iconStyle = computed(() => ({
  color: typeConfig.value.color,
  fontSize: sizeConfig.value.iconSize
}));

const contentClasses = computed(() => ({
  'error-content': true,
  [`error-content--${props.size}`]: true
}));

const titleClasses = computed(() => ({
  'error-title': true,
  [`error-title--${props.size}`]: true
}));

const titleStyle = computed(() => ({
  color: typeConfig.value.textColor,
  fontSize: sizeConfig.value.titleSize
}));

const descriptionClasses = computed(() => ({
  'error-description': true,
  [`error-description--${props.size}`]: true
}));

const descriptionStyle = computed(() => ({
  fontSize: sizeConfig.value.descriptionSize
}));

const detailsClasses = computed(() => ({
  'error-details': true,
  [`error-details--${props.size}`]: true
}));

const suggestionsClasses = computed(() => ({
  'error-suggestions': true,
  [`error-suggestions--${props.size}`]: true
}));

const actionsClasses = computed(() => ({
  'error-actions': true,
  [`error-actions--${props.size}`]: true
}));

const closeButtonClasses = computed(() => ({
  'error-close-button': true,
  [`error-close-button--${props.size}`]: true
}));

const showActions = computed(() => 
  props.showRetry || props.closable || !!slots.actions
);

const buttonSize = computed(() => 
  props.size === 'small' ? 'small' : 'default'
);

const displayTitle = computed(() => 
  props.title || typeConfig.value.title
);

const formattedDetails = computed(() => {
  if (!props.details) return '';
  
  if (props.details instanceof Error) {
    return `${props.details.name}: ${props.details.message}\n${props.details.stack || ''}`;
  }
  
  return typeof props.details === 'object' 
    ? JSON.stringify(props.details, null, 2)
    : String(props.details);
});

// 方法
const handleRetry = () => {
  emit('retry');
};

const handleClose = () => {
  emit('close');
  emit('visible', false);
};

const startAutoClose = () => {
  if (props.autoClose && props.autoCloseDelay > 0) {
    autoCloseTimer.value = setTimeout(() => {
      handleClose();
    }, props.autoCloseDelay);
  }
};

const clearAutoClose = () => {
  if (autoCloseTimer.value) {
    clearTimeout(autoCloseTimer.value);
    autoCloseTimer.value = null;
  }
};

const onEnter = (el: Element) => {
  startAutoClose();
};

const onLeave = (el: Element) => {
  clearAutoClose();
};

// 暴露方法
defineExpose({
  close: handleClose,
  retry: handleRetry,
  clearAutoClose
});

// 生命週期
onMounted(() => {
  if (props.visible) {
    startAutoClose();
  }
});

// 獲取插槽
const slots = useSlots();
</script>

<script lang="ts">
export default {
  name: 'ErrorMessage'
};
</script>

<style lang="scss" scoped>
.error-message {
  display: flex;
  align-items: flex-start;
  position: relative;
  border: 1px solid;
  transition: all 0.3s ease;
  
  &--filled {
    // 填充樣式已在 computed style 中定義
  }
  
  &--outlined {
    background-color: transparent;
  }
  
  &--text {
    background-color: transparent;
    border: none;
  }
  
  &--small {
    font-size: 12px;
  }
  
  &--medium {
    font-size: 14px;
  }
  
  &--large {
    font-size: 16px;
  }
}

.error-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &--small {
    margin-top: 2px;
  }
  
  &--medium {
    margin-top: 3px;
  }
  
  &--large {
    margin-top: 4px;
  }
}

.error-icon-content {
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
  }
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  
  &--small {
    margin-bottom: 4px;
  }
  
  &--medium {
    margin-bottom: 6px;
  }
  
  &--large {
    margin-bottom: 8px;
  }
}

.error-description {
  color: #606266;
  line-height: 1.5;
  margin: 0;
  word-break: break-word;
}

.error-details {
  margin-top: 12px;
  
  .details-summary {
    cursor: pointer;
    font-weight: 500;
    color: #409EFF;
    padding: 4px 0;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .details-content {
    background-color: #f5f7fa;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 12px;
    margin-top: 8px;
    font-size: 12px;
    color: #606266;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  }
}

.error-suggestions {
  margin-top: 12px;
  
  .suggestions-title {
    font-weight: 500;
    color: #303133;
    margin-bottom: 6px;
    font-size: 13px;
  }
  
  .suggestions-list {
    margin: 0;
    padding-left: 16px;
    color: #606266;
    
    .suggestion-item {
      margin-bottom: 4px;
      line-height: 1.4;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.error-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  
  &--small {
    margin-top: 12px;
    gap: 6px;
  }
  
  &--large {
    margin-top: 20px;
    gap: 10px;
  }
}

.error-close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #909399;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    color: #606266;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  &--small {
    width: 20px;
    height: 20px;
    top: 6px;
    right: 6px;
    
    :deep(.el-icon) {
      font-size: 12px;
    }
  }
  
  &--large {
    width: 28px;
    height: 28px;
    top: 10px;
    right: 10px;
    
    :deep(.el-icon) {
      font-size: 16px;
    }
  }
}

// 錯誤類型特定樣式
.error-message--error {
  &.error-message--outlined {
    border-color: #FBC4C4;
    color: #F56C6C;
  }
  
  &.error-message--text {
    color: #F56C6C;
  }
}

.error-message--warning {
  &.error-message--outlined {
    border-color: #F5DAB1;
    color: #E6A23C;
  }
  
  &.error-message--text {
    color: #E6A23C;
  }
}

.error-message--info {
  &.error-message--outlined {
    border-color: #B3D8FF;
    color: #409EFF;
  }
  
  &.error-message--text {
    color: #409EFF;
  }
}

// 轉場動畫
.error-message-enter-active {
  transition: all 0.3s ease;
}

.error-message-leave-active {
  transition: all 0.3s ease;
}

.error-message-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.error-message-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.05);
}

// 搖晃動畫（用於錯誤強調）
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.error-message--error {
  animation: shake 0.5s ease-in-out;
}

// 響應式設計
@media (max-width: 768px) {
  .error-message {
    flex-direction: column;
    align-items: stretch;
    
    &--small {
      padding: 10px;
    }
    
    &--medium {
      padding: 12px;
    }
    
    &--large {
      padding: 16px;
    }
  }
  
  .error-icon {
    margin-bottom: 8px;
    align-self: flex-start;
    
    &--small {
      margin-top: 0;
      margin-bottom: 6px;
    }
    
    &--medium {
      margin-top: 0;
      margin-bottom: 8px;
    }
    
    &--large {
      margin-top: 0;
      margin-bottom: 10px;
    }
  }
  
  .error-actions {
    flex-direction: column;
    
    :deep(.el-button) {
      width: 100%;
    }
  }
  
  .error-close-button {
    position: static;
    align-self: flex-end;
    margin-top: 8px;
  }
}

// 深色模式支持
@media (prefers-color-scheme: dark) {
  .error-message {
    &--filled {
      .error-description {
        color: rgba(255, 255, 255, 0.8);
      }
    }
    
    .error-details .details-content {
      background-color: #2d2d2d;
      border-color: #4d4d4d;
      color: #e4e7ed;
    }
    
    .error-suggestions .suggestions-list {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .error-close-button {
      color: rgba(255, 255, 255, 0.6);
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .error-message {
    border-width: 2px;
    
    &--filled {
      .error-description,
      .error-suggestions .suggestions-list {
        color: #000;
      }
    }
    
    &--outlined,
    &--text {
      .error-description,
      .error-suggestions .suggestions-list {
        color: inherit;
      }
    }
  }
  
  .error-icon-content,
  .error-title {
    filter: contrast(2);
  }
}

// 減少動畫偏好設置
@media (prefers-reduced-motion: reduce) {
  .error-message {
    animation: none;
  }
  
  .error-message-enter-active,
  .error-message-leave-active {
    transition: opacity 0.1s ease;
  }
  
  .error-message-enter-from,
  .error-message-leave-to {
    transform: none;
  }
  
  .error-icon-content {
    transition: none;
    
    &:hover {
      transform: none;
    }
  }
}

// 列印樣式
@media print {
  .error-message {
    break-inside: avoid;
    border: 1px solid #000 !important;
    background: transparent !important;
    color: #000 !important;
    
    .error-close-button,
    .error-actions {
      display: none !important;
    }
    
    .error-details .details-content {
      background: transparent !important;
      border: 1px solid #ccc !important;
      color: #000 !important;
    }
  }
}