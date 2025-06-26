<template>
  <div :class="containerClasses" :style="containerStyle">
    <!-- 加載圖標 -->
    <div :class="spinnerClasses" :style="spinnerStyle">
      <component
        :is="iconComponent"
        :class="iconClasses"
        :style="iconStyle"
      />
    </div>
    
    <!-- 加載文本 -->
    <div
      v-if="showText && text"
      :class="textClasses"
      :style="textStyle"
    >
      {{ text }}
    </div>
    
    <!-- 進度條（可選） -->
    <div
      v-if="showProgress && progress !== null"
      :class="progressClasses"
      :style="progressStyle"
    >
      <div class="progress-bar" :style="progressBarStyle">
        <div 
          class="progress-fill" 
          :style="progressFillStyle"
        ></div>
      </div>
      <span class="progress-text">{{ Math.round(progress) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { Loading, Refresh, Download, Upload } from '@element-plus/icons-vue';

// 定義 Props
interface Props {
  // 基礎屬性
  loading?: boolean;
  size?: 'mini' | 'small' | 'medium' | 'large' | 'extra-large';
  color?: string;
  
  // 文本相關
  text?: string;
  showText?: boolean;
  textColor?: string;
  
  // 圖標相關
  icon?: 'loading' | 'refresh' | 'download' | 'upload' | string;
  
  // 布局相關
  overlay?: boolean;
  fullscreen?: boolean;
  center?: boolean;
  inline?: boolean;
  
  // 進度相關
  progress?: number | null;
  showProgress?: boolean;
  
  // 動畫相關
  duration?: number;
  
  // 樣式相關
  background?: string;
  backdropFilter?: boolean;
  
  // 行為相關
  preventScroll?: boolean;
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: true,
  size: 'medium',
  color: '#409EFF',
  text: '載入中...',
  showText: true,
  textColor: '#606266',
  icon: 'loading',
  overlay: false,
  fullscreen: false,
  center: true,
  inline: false,
  progress: null,
  showProgress: false,
  duration: 1000,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: true,
  preventScroll: true,
  zIndex: 2000
});

// 定義 Emits
const emit = defineEmits<{
  visible: [visible: boolean];
  complete: [void];
}>();

// 響應式狀態
const isVisible = ref(props.loading);
const animationId = ref<number | null>(null);

// 圖標映射
const iconMap = {
  loading: Loading,
  refresh: Refresh,
  download: Download,
  upload: Upload
};

// 計算屬性
const iconComponent = computed(() => {
  if (typeof props.icon === 'string' && iconMap[props.icon as keyof typeof iconMap]) {
    return iconMap[props.icon as keyof typeof iconMap];
  }
  return Loading;
});

const sizeConfig = computed(() => {
  const configs = {
    mini: { icon: 16, text: 12, padding: '8px', gap: '4px' },
    small: { icon: 20, text: 14, padding: '12px', gap: '6px' },
    medium: { icon: 24, text: 14, padding: '16px', gap: '8px' },
    large: { icon: 32, text: 16, padding: '20px', gap: '10px' },
    'extra-large': { icon: 40, text: 18, padding: '24px', gap: '12px' }
  };
  return configs[props.size];
});

// 容器樣式類
const containerClasses = computed(() => ({
  'loading-spinner': true,
  'loading-spinner--overlay': props.overlay,
  'loading-spinner--fullscreen': props.fullscreen,
  'loading-spinner--center': props.center,
  'loading-spinner--inline': props.inline,
  'loading-spinner--visible': isVisible.value
}));

const containerStyle = computed(() => ({
  background: props.overlay || props.fullscreen ? props.background : 'transparent',
  backdropFilter: (props.overlay || props.fullscreen) && props.backdropFilter ? 'blur(4px)' : 'none',
  zIndex: props.overlay || props.fullscreen ? props.zIndex : 'auto',
  padding: sizeConfig.value.padding,
  gap: sizeConfig.value.gap
}));

// 旋轉器樣式類
const spinnerClasses = computed(() => ({
  'spinner': true,
  [`spinner--${props.size}`]: true
}));

const spinnerStyle = computed(() => ({
  animationDuration: `${props.duration}ms`
}));

// 圖標樣式類
const iconClasses = computed(() => ({
  'spinner-icon': true,
  'spinning': props.loading
}));

const iconStyle = computed(() => ({
  fontSize: `${sizeConfig.value.icon}px`,
  color: props.color
}));

// 文本樣式類
const textClasses = computed(() => ({
  'loading-text': true,
  [`loading-text--${props.size}`]: true
}));

const textStyle = computed(() => ({
  fontSize: `${sizeConfig.value.text}px`,
  color: props.textColor
}));

// 進度條樣式
const progressClasses = computed(() => ({
  'progress-container': true,
  [`progress-container--${props.size}`]: true
}));

const progressStyle = computed(() => ({
  marginTop: sizeConfig.value.gap
}));

const progressBarStyle = computed(() => ({
  height: props.size === 'mini' ? '2px' : props.size === 'small' ? '3px' : '4px',
  backgroundColor: '#f0f0f0',
  borderRadius: '2px',
  overflow: 'hidden'
}));

const progressFillStyle = computed(() => ({
  width: `${props.progress || 0}%`,
  height: '100%',
  backgroundColor: props.color,
  transition: 'width 0.3s ease',
  borderRadius: '2px'
}));

// 方法
const show = () => {
  isVisible.value = true;
  emit('visible', true);
  
  if (props.preventScroll && (props.overlay || props.fullscreen)) {
    document.body.style.overflow = 'hidden';
  }
};

const hide = () => {
  isVisible.value = false;
  emit('visible', false);
  emit('complete');
  
  if (props.preventScroll && (props.overlay || props.fullscreen)) {
    document.body.style.overflow = '';
  }
};

const toggle = () => {
  if (isVisible.value) {
    hide();
  } else {
    show();
  }
};

// 暴露方法給父組件
defineExpose({
  show,
  hide,
  toggle,
  isVisible: readonly(isVisible)
});

// 監聽 loading 屬性變化
watch(() => props.loading, (newVal) => {
  if (newVal) {
    show();
  } else {
    hide();
  }
}, { immediate: true });

// 生命週期
onMounted(() => {
  if (props.loading) {
    show();
  }
});

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
  
  // 清理滾動鎖定
  if (props.preventScroll && (props.overlay || props.fullscreen)) {
    document.body.style.overflow = '';
  }
});
</script>

<script lang="ts">
export default {
  name: 'LoadingSpinner'
};
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  &--overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  &--fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  &--center {
    text-align: center;
  }
  
  &--inline {
    display: inline-flex;
    vertical-align: middle;
  }
  
  &--visible {
    .spinner-icon {
      animation-play-state: running;
    }
  }
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  
  &--mini {
    width: 20px;
    height: 20px;
  }
  
  &--small {
    width: 24px;
    height: 24px;
  }
  
  &--medium {
    width: 32px;
    height: 32px;
  }
  
  &--large {
    width: 40px;
    height: 40px;
  }
  
  &--extra-large {
    width: 48px;
    height: 48px;
  }
}

.spinner-icon {
  animation: spin 1s linear infinite;
  animation-play-state: paused;
  transition: all 0.3s ease;
  
  &.spinning {
    animation-play-state: running;
  }
}

.loading-text {
  font-weight: 400;
  line-height: 1.5;
  margin: 0;
  user-select: none;
  
  &--mini {
    margin-top: 4px;
  }
  
  &--small {
    margin-top: 6px;
  }
  
  &--medium {
    margin-top: 8px;
  }
  
  &--large {
    margin-top: 10px;
  }
  
  &--extra-large {
    margin-top: 12px;
  }
}

.progress-container {
  width: 100%;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  &--mini {
    max-width: 120px;
  }
  
  &--small {
    max-width: 150px;
  }
  
  &--medium {
    max-width: 200px;
  }
  
  &--large {
    max-width: 250px;
  }
  
  &--extra-large {
    max-width: 300px;
  }
}

.progress-bar {
  position: relative;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  transition: width 0.3s ease;
  border-radius: inherit;
}

.progress-text {
  font-size: 12px;
  color: #666;
  text-align: center;
  font-weight: 500;
}

// 旋轉動畫
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 淡入淡出動畫
.loading-spinner {
  transition: opacity 0.3s ease;
  
  &:not(.loading-spinner--visible) {
    opacity: 0;
    pointer-events: none;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .loading-spinner {
    &--fullscreen {
      padding: 20px;
    }
  }
  
  .progress-container {
    max-width: 150px;
    
    &--large,
    &--extra-large {
      max-width: 180px;
    }
  }
}

// 深色模式支持
@media (prefers-color-scheme: dark) {
  .loading-spinner {
    &--overlay,
    &--fullscreen {
      background: rgba(0, 0, 0, 0.9);
    }
  }
  
  .loading-text {
    color: #e4e7ed;
  }
  
  .progress-bar {
    background-color: #4c4d4f;
  }
  
  .progress-text {
    color: #a8abb2;
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .loading-spinner {
    &--overlay,
    &--fullscreen {
      background: rgba(255, 255, 255, 1);
      backdrop-filter: none;
    }
  }
  
  .spinner-icon {
    filter: contrast(2);
  }
}

// 減少動畫偏好設置
@media (prefers-reduced-motion: reduce) {
  .spinner-icon {
    animation: none;
  }
  
  .progress-fill {
    transition: none;
  }
}
</style>