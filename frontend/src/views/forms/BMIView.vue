<template>
  <div class="bmi-view">
    <!-- 頁面頭部 -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">
              <Calculator class="title-icon" />
              BMI 身體質量指數計算器
            </h1>
            <p class="page-subtitle">
              輸入您的身高和體重，快速計算 BMI 值，了解您的身體健康狀況
            </p>
          </div>
          
          <div class="header-badges">
            <el-tag type="success" effect="plain" size="large">
              <el-icon><Check /></el-icon>
              免費使用
            </el-tag>
            <el-tag type="info" effect="plain" size="large">
              <el-icon><Shield /></el-icon>
              隱私保護
            </el-tag>
            <el-tag type="warning" effect="plain" size="large">
              <el-icon><TrendCharts /></el-icon>
              精確計算
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="bmi-content">
        <!-- 左側：計算表單 -->
        <div class="calculator-section">
          <el-card class="calculator-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <h2>BMI 計算器</h2>
                <el-switch
                  v-model="isMetric"
                  size="large"
                  :active-text="isMetric ? '公制' : '英制'"
                  :inactive-text="isMetric ? '公制' : '英制'"
                  @change="handleUnitChange"
                />
              </div>
            </template>
            
            <el-form
              ref="bmiFormRef"
              :model="formData"
              :rules="formRules"
              label-position="top"
              size="large"
            >
              <div class="form-grid">
                <el-form-item :label="heightLabel" prop="height">
                  <el-input
                    v-model="formData.height"
                    :placeholder="heightPlaceholder"
                    :disabled="isSubmitting"
                    @input="handleInputChange"
                  >
                    <template #append>{{ heightUnit }}</template>
                  </el-input>
                </el-form-item>

                <el-form-item :label="weightLabel" prop="weight">
                  <el-input
                    v-model="formData.weight"
                    :placeholder="weightPlaceholder"
                    :disabled="isSubmitting"
                    @input="handleInputChange"
                  >
                    <template #append>{{ weightUnit }}</template>
                  </el-input>
                </el-form-item>
              </div>

              <!-- 即時預覽 -->
              <div v-if="previewBMI" class="preview-section">
                <div class="preview-card">
                  <div class="preview-header">
                    <h3>即時預覽</h3>
                  </div>
                  <div class="preview-content">
                    <div class="bmi-value">
                      <span class="value">{{ previewBMI }}</span>
                      <span class="unit">BMI</span>
                    </div>
                    <div 
                      :class="previewCategoryClasses"
                      class="bmi-category"
                    >
                      {{ previewCategory?.name }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <el-button
                  type="primary"
                  size="large"
                  :loading="isSubmitting"
                  :disabled="!isFormValid"
                  @click="calculateBMI"
                  block
                >
                  {{ isSubmitting ? '計算中...' : '計算 BMI' }}
                </el-button>
                
                <el-button
                  size="large"
                  :disabled="isSubmitting"
                  @click="resetForm"
                  block
                >
                  重置
                </el-button>
              </div>
            </el-form>
          </el-card>

          <!-- BMI 分類說明 -->
          <el-card class="info-card" shadow="hover">
            <template #header>
              <h3>BMI 分類標準</h3>
            </template>
            
            <div class="bmi-categories">
              <div 
                v-for="category in bmiCategories"
                :key="category.name"
                class="category-item"
              >
                <div 
                  class="category-indicator"
                  :style="{ backgroundColor: category.color }"
                ></div>
                <div class="category-info">
                  <div class="category-name">{{ category.name }}</div>
                  <div class="category-range">
                    {{ formatRange(category.min, category.max) }}
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 健康小知識 -->
          <el-card class="tips-card" shadow="hover">
            <template #header>
              <h3>
                <el-icon><InfoFilled /></el-icon>
                健康小知識
              </h3>
            </template>
            
            <div class="health-tips">
              <div class="tip-item">
                <div class="tip-icon">
                  <Food />
                </div>
                <div class="tip-content">
                  <h4>均衡飲食</h4>
                  <p>選擇多樣化的食物，控制熱量攝入，保持營養均衡</p>
                </div>
              </div>
              
              <div class="tip-item">
                <div class="tip-icon">
                  <Walk />
                </div>
                <div class="tip-content">
                  <h4>規律運動</h4>
                  <p>每週至少150分鐘中等強度運動，增強體質</p>
                </div>
              </div>
              
              <div class="tip-item">
                <div class="tip-icon">
                  <Timer />
                </div>
                <div class="tip-content">
                  <h4>良好作息</h4>
                  <p>保持充足睡眠，規律作息，有助於體重管理</p>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 右側：結果顯示 -->
        <div class="results-section">
          <!-- 計算結果 -->
          <el-card 
            v-if="calculationResult" 
            class="result-card" 
            shadow="hover"
          >
            <template #header>
              <div class="result-header">
                <h2>計算結果</h2>
                <div class="header-actions">
                  <el-button
                    :icon="Download"
                    size="small"
                    @click="downloadResult"
                  >
                    下載報告
                  </el-button>
                  <el-button
                    :icon="Share"
                    size="small"
                    @click="shareResult"
                  >
                    分享
                  </el-button>
                </div>
              </div>
            </template>
            
            <div class="result-content">
              <!-- BMI 數值顯示 -->
              <div class="bmi-result">
                <div class="bmi-circle">
                  <div class="circle-content">
                    <div class="bmi-number">{{ calculationResult.bmi }}</div>
                    <div class="bmi-label">BMI</div>
                  </div>
                  <svg class="progress-ring" width="200" height="200">
                    <circle
                      class="progress-ring-bg"
                      cx="100"
                      cy="100"
                      r="85"
                    />
                    <circle
                      class="progress-ring-progress"
                      cx="100"
                      cy="100"
                      r="85"
                      :style="progressStyle"
                      :stroke="resultCategory.color"
                    />
                  </svg>
                </div>
                
                <div class="result-info">
                  <div 
                    :class="resultCategoryClasses"
                    class="result-category"
                  >
                    {{ resultCategory.name }}
                  </div>
                  <div class="result-status">
                    <el-icon>
                      <component :is="resultCategory.isHealthy ? 'SuccessFilled' : 'WarningFilled'" />
                    </el-icon>
                    <span>{{ resultCategory.isHealthy ? '健康範圍' : '需要關注' }}</span>
                  </div>
                </div>
              </div>

              <!-- 詳細分析 -->
              <div class="analysis-section">
                <div class="analysis-grid">
                  <!-- 理想體重範圍 -->
                  <div class="analysis-card ideal-weight">
                    <div class="card-icon">
                      <Target />
                    </div>
                    <div class="card-content">
                      <h4>理想體重範圍</h4>
                      <div class="weight-range">
                        <span class="range-value">
                          {{ idealWeightRange.min }} - {{ idealWeightRange.max }}
                        </span>
                        <span class="range-unit">{{ weightUnit }}</span>
                      </div>
                      <div class="weight-diff">
                        <span v-if="weightDifference > 0" class="diff-text over">
                          <el-icon><ArrowUp /></el-icon>
                          超出 {{ Math.abs(weightDifference).toFixed(1) }} {{ weightUnit }}
                        </span>
                        <span v-else-if="weightDifference < 0" class="diff-text under">
                          <el-icon><ArrowDown /></el-icon>
                          低於 {{ Math.abs(weightDifference).toFixed(1) }} {{ weightUnit }}
                        </span>
                        <span v-else class="diff-text ideal">
                          <el-icon><Check /></el-icon>
                          在理想範圍內
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 健康風險 -->
                  <div class="analysis-card health-risk">
                    <div class="card-icon">
                      <Warning />
                    </div>
                    <div class="card-content">
                      <h4>健康風險評估</h4>
                      <div class="risk-level">
                        <div 
                          :class="riskLevelClasses"
                          class="risk-indicator"
                        >
                          {{ getRiskLevel() }}
                        </div>
                      </div>
                      <div class="risk-description">
                        {{ getRiskDescription() }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 健康建議 -->
              <div class="health-advice">
                <h4>
                  <el-icon><Memo /></el-icon>
                  個性化健康建議
                </h4>
                <div class="advice-content">
                  <p class="primary-advice">{{ getHealthAdvice() }}</p>
                  
                  <div class="advice-grid">
                    <div class="advice-item diet">
                      <div class="advice-icon">
                        <Food />
                      </div>
                      <div class="advice-text">
                        <h5>飲食建議</h5>
                        <p>{{ getDietAdvice() }}</p>
                      </div>
                    </div>
                    
                    <div class="advice-item exercise">
                      <div class="advice-icon">
                        <Walk />
                      </div>
                      <div class="advice-text">
                        <h5>運動建議</h5>
                        <p>{{ getExerciseAdvice() }}</p>
                      </div>
                    </div>
                    
                    <div class="advice-item lifestyle">
                      <div class="advice-icon">
                        <Timer />
                      </div>
                      <div class="advice-text">
                        <h5>生活方式</h5>
                        <p>{{ getLifestyleAdvice() }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 歷史記錄 -->
          <el-card 
            v-if="showHistory && hasRecords" 
            class="history-card" 
            shadow="hover"
          >
            <template #header>
              <div class="history-header">
                <h3>
                  <el-icon><Clock /></el-icon>
                  歷史記錄
                </h3>
                <div class="header-actions">
                  <el-button
                    :icon="TrendCharts"
                    size="small"
                    @click="viewTrendAnalysis"
                  >
                    趨勢分析
                  </el-button>
                  <el-button
                    :icon="MoreFilled"
                    size="small"
                    @click="viewAllHistory"
                  >
                    查看全部
                  </el-button>
                </div>
              </div>
            </template>
            
            <div class="history-content">
              <!-- 趨勢圖表 -->
              <div v-if="trendData.length > 1" class="trend-chart">
                <div class="chart-header">
                  <h4>BMI 變化趨勢</h4>
                  <div class="chart-period">
                    <el-radio-group v-model="chartPeriod" size="small">
                      <el-radio-button label="7d">近7天</el-radio-button>
                      <el-radio-button label="30d">近30天</el-radio-button>
                      <el-radio-button label="90d">近3個月</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
                <div class="chart-container">
                  <BMITrendChart 
                    :data="filteredTrendData" 
                    :height="200"
                  />
                </div>
              </div>
              
              <!-- 記錄列表 -->
              <div class="records-list">
                <div class="records-header">
                  <h4>最近記錄</h4>
                  <span class="records-count">{{ recentRecords.length }} 條記錄</span>
                </div>
                
                <div class="records-grid">
                  <div 
                    v-for="record in recentRecords"
                    :key="record.id"
                    class="record-item"
                    @click="viewRecord(record)"
                  >
                    <div class="record-date">
                      <div class="date-main">{{ formatDate(record.createdAt, 'date') }}</div>
                      <div class="date-time">{{ formatDate(record.createdAt, 'time') }}</div>
                    </div>
                    
                    <div class="record-data">
                      <div class="data-row">
                        <span class="data-label">身高:</span>
                        <span class="data-value">{{ record.height }} {{ record.unit === 'metric' ? 'cm' : 'ft' }}</span>
                      </div>
                      <div class="data-row">
                        <span class="data-label">體重:</span>
                        <span class="data-value">{{ record.weight }} {{ record.unit === 'metric' ? 'kg' : 'lbs' }}</span>
                      </div>
                    </div>
                    
                    <div class="record-result">
                      <div class="bmi-value">{{ record.bmiResult }}</div>
                      <div 
                        class="category-badge"
                        :style="{ backgroundColor: getBMICategory(record.bmiResult).color }"
                      >
                        {{ getBMICategory(record.bmiResult).name }}
                      </div>
                    </div>
                    
                    <div class="record-actions">
                      <el-button
                        :icon="View"
                        size="small"
                        text
                        @click.stop="viewRecord(record)"
                        title="查看詳情"
                      />
                      <el-button
                        :icon="CopyDocument"
                        size="small"
                        text
                        @click.stop="copyRecord(record)"
                        title="複製數據"
                      />
                      <el-button
                        :icon="Delete"
                        size="small"
                        text
                        type="danger"
                        @click.stop="deleteRecord(record.id)"
                        title="刪除記錄"
                      />
                    </div>
                  </div>
                </div>
                
                <!-- 空狀態 -->
                <div v-if="!hasRecords" class="empty-state">
                  <div class="empty-icon">
                    <el-icon><DocumentCopy /></el-icon>
                  </div>
                  <div class="empty-text">
                    <h4>暫無歷史記錄</h4>
                    <p>開始您的第一次 BMI 計算吧！</p>
                  </div>
                </div>
              </div>
            </div>
          </el-card>

<!-- 相關工具推薦 -->
          <el-card class="recommendations-card" shadow="hover">
            <template #header>
              <h3>
                <el-icon><Grid /></el-icon>
                相關工具推薦
              </h3>
            </template>
            
            <div class="recommendations">
              <div class="tool-item">
                <div class="tool-icon">
                  <DataBoard />
                </div>
                <div class="tool-info">
                  <h4>TDEE 計算器</h4>
                  <p>計算每日總能量消耗，制定飲食計劃</p>
                  <div class="tool-tags">
                    <el-tag size="small" type="warning">會員功能</el-tag>
                    <el-tag size="small" effect="plain">專業工具</el-tag>
                  </div>
                </div>
                <div class="tool-action">
                  <el-button
                    type="primary"
                    size="small"
                    @click="navigateToTDEE"
                  >
                    立即使用
                  </el-button>
                </div>
              </div>
              
              <div class="tool-item">
                <div class="tool-icon">
                  <TrendCharts />
                </div>
                <div class="tool-info">
                  <h4>健康數據追蹤</h4>
                  <p>長期健康數據分析和趨勢追蹤</p>
                  <div class="tool-tags">
                    <el-tag size="small" type="success">免費功能</el-tag>
                    <el-tag size="small" effect="plain">數據分析</el-tag>
                  </div>
                </div>
                <div class="tool-action">
                  <el-button
                    size="small"
                    @click="navigateToTracking"
                  >
                    了解更多
                  </el-button>
                </div>
              </div>
              
              <div class="tool-item">
                <div class="tool-icon">
                  <Calendar />
                </div>
                <div class="tool-info">
                  <h4>健康計劃制定</h4>
                  <p>個性化健康管理和目標設定</p>
                  <div class="tool-tags">
                    <el-tag size="small" type="info">即將推出</el-tag>
                    <el-tag size="small" effect="plain">智能推薦</el-tag>
                  </div>
                </div>
                <div class="tool-action">
                  <el-button
                    size="small"
                    disabled
                  >
                    敬請期待
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 專家建議 -->
          <el-card v-if="showExpertAdvice" class="expert-card" shadow="hover">
            <template #header>
              <h3>
                <el-icon><User /></el-icon>
                專家建議
              </h3>
            </template>
            
            <div class="expert-content">
              <div class="expert-avatar">
                <el-avatar :size="60" :src="expertInfo.avatar">
                  <User />
                </el-avatar>
              </div>
              <div class="expert-info">
                <div class="expert-name">{{ expertInfo.name }}</div>
                <div class="expert-title">{{ expertInfo.title }}</div>
              </div>
              <div class="expert-advice-text">
                <blockquote>
                  {{ getExpertAdvice() }}
                </blockquote>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 結果詳情對話框 -->
    <el-dialog
      v-model="showResultDialog"
      title="BMI 計算結果詳情"
      width="700px"
      :before-close="handleDialogClose"
      class="result-dialog"
    >
      <BMIResultDetail 
        v-if="calculationResult"
        :result="calculationResult"
        :unit="formData.unit"
        :ideal-weight="idealWeightRange"
      />
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showResultDialog = false">關閉</el-button>
          <el-button type="primary" @click="downloadDetailedReport">
            <el-icon><Download /></el-icon>
            下載詳細報告
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 歷史記錄詳情對話框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="歷史記錄詳情"
      width="600px"
      class="history-dialog"
    >
      <BMIHistoryDetail 
        v-if="selectedRecord"
        :record="selectedRecord"
        @delete="handleDeleteFromDialog"
      />
    </el-dialog>

    <!-- 趨勢分析對話框 -->
    <el-dialog
      v-model="showTrendDialog"
      title="BMI 趨勢分析"
      width="800px"
      class="trend-dialog"
    >
      <BMITrendAnalysis 
        :data="trendData"
        :statistics="bmiStatistics"
      />
    </el-dialog>

    <!-- 分享對話框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享計算結果"
      width="500px"
      class="share-dialog"
    >
      <ShareResult 
        v-if="calculationResult"
        :result="calculationResult"
        type="bmi"
        @shared="handleShared"
      />
    </el-dialog>

    <!-- 全局加載 -->
    <LoadingSpinner
      v-if="globalLoading"
      :loading="globalLoading"
      overlay
      fullscreen
      text="處理中..."
    />

    <!-- 錯誤提示 -->
    <ErrorMessage
      v-if="errorMessage"
      :visible="!!errorMessage"
      :type="errorType"
      :title="errorTitle"
      :description="errorMessage"
      :show-retry="showRetry"
      @retry="handleRetry"
      @close="clearError"
    />

    <!-- 成功提示浮層 -->
    <Transition name="success-fade">
      <div v-if="showSuccessOverlay" class="success-overlay">
        <div class="success-content">
          <div class="success-icon">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="success-text">
            <h3>計算完成！</h3>
            <p>您的 BMI 值為 {{ calculationResult?.bmi }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  ElCard, 
  ElForm, 
  ElFormItem, 
  ElInput, 
  ElButton, 
  ElSwitch,
  ElTag,
  ElIcon,
  ElDialog,
  ElMessage,
  ElNotification,
  ElRadioGroup,
  ElRadioButton,
  ElAvatar,
  ElMessageBox,
  type FormInstance,
  type FormRules
} from 'element-plus';

// Element Plus Icons
import {
  Calculator,
  Check,
  Shield,
  TrendCharts,
  Download,
  Share,
  SuccessFilled,
  WarningFilled,
  InfoFilled,
  Food,
  Walk,
  Timer,
  Target,
  ArrowUp,
  ArrowDown,
  Warning,
  Memo,
  Clock,
  MoreFilled,
  View,
  CopyDocument,
  Delete,
  DocumentCopy,
  Grid,
  DataBoard,
  Calendar,
  User
} from '@element-plus/icons-vue';

// 導入組件
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorMessage from '@/components/common/ErrorMessage.vue';
import BMITrendChart from '@/components/charts/BMITrendChart.vue';
import BMIResultDetail from '@/components/forms/BMIResultDetail.vue';
import BMIHistoryDetail from '@/components/forms/BMIHistoryDetail.vue';
import BMITrendAnalysis from '@/components/charts/BMITrendAnalysis.vue';
import ShareResult from '@/components/common/ShareResult.vue';

// 導入 composables
import { useBMICalculator } from '@/composables/useBMICalculator';
import { useFormHistory } from '@/composables/useFormHistory';
import { useDevice } from '@/composables/useDevice';

// 導入 stores
import { useAuthStore } from '@/stores/auth';
import { useFormsStore } from '@/stores/forms';

// 導入工具函數
import { bmiUtils, formatDateTime, debounce } from '@/utils/helpers';
import { FORM_CONSTANTS } from '@/utils/constants';

// 導入類型
import type { BMICalculationResult, FormRecord } from '@/types/forms';

// 路由
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();
const formsStore = useFormsStore();

// 設備檢測
const { isMobile, isTablet } = useDevice();

// BMI Calculator Composable
const {
  formRef: bmiFormRef,
  formData,
  formRules,
  isSubmitting,
  calculationResult,
  showResultDialog,
  calculateBMI: submitCalculation,
  resetForm: resetBMIForm,
  toggleUnit,
  getBMICategory,
  getBMITrend,
  isFormFilled,
  isFormValid,
  getFormHints
} = useBMICalculator();

// Form History Composable
const {
  records,
  statistics,
  hasRecords,
  isLoading: historyLoading,
  deleteRecord: removeRecord,
  exportRecords,
  getTrendData
} = useFormHistory('bmi-calculator');

// 響應式狀態
const showHistory = ref(true);
const showExpertAdvice = ref(false);
const globalLoading = ref(false);
const showSuccessOverlay = ref(false);

// 對話框狀態
const showHistoryDialog = ref(false);
const showTrendDialog = ref(false);
const showShareDialog = ref(false);

// 錯誤處理狀態
const errorMessage = ref('');
const errorTitle = ref('');
const errorType = ref<'error' | 'warning' | 'info'>('error');
const showRetry = ref(false);

// 記錄相關狀態
const selectedRecord = ref<FormRecord | null>(null);
const chartPeriod = ref('30d');

// 專家信息
const expertInfo = reactive({
  name: 'Dr. Sarah Chen',
  title: '營養學專家',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
});

// 計算屬性
const isMetric = computed({
  get: () => formData.unit === 'metric',
  set: (value: boolean) => {
    formData.unit = value ? 'metric' : 'imperial';
  }
});

const heightLabel = computed(() => 
  isMetric.value ? '身高' : '身高'
);

const weightLabel = computed(() => 
  isMetric.value ? '體重' : '體重'
);

const heightUnit = computed(() => 
  isMetric.value ? 'cm' : 'ft'
);

const weightUnit = computed(() => 
  isMetric.value ? 'kg' : 'lbs'
);

const heightPlaceholder = computed(() => 
  isMetric.value ? '請輸入身高（公分）' : '請輸入身高（英尺）'
);

const weightPlaceholder = computed(() => 
  isMetric.value ? '請輸入體重（公斤）' : '請輸入體重（磅）'
);

const previewBMI = computed(() => {
  if (!isFormValid.value) return null;
  
  const height = parseFloat(formData.height);
  const weight = parseFloat(formData.weight);
  
  return bmiUtils.calculate(weight, height, formData.unit).toFixed(1);
});

const previewCategory = computed(() => {
  if (!previewBMI.value) return null;
  return getBMICategory(parseFloat(previewBMI.value));
});

const previewCategoryClasses = computed(() => ({
  'category-normal': previewCategory.value?.isHealthy,
  'category-warning': !previewCategory.value?.isHealthy
}));

const resultCategory = computed(() => {
  if (!calculationResult.value) return null;
  return getBMICategory(calculationResult.value.bmi);
});

const resultCategoryClasses = computed(() => ({
  'result-normal': resultCategory.value?.isHealthy,
  'result-warning': !resultCategory.value?.isHealthy
}));

const progressStyle = computed(() => {
  if (!calculationResult.value) return {};
  
  const bmi = calculationResult.value.bmi;
  const maxBMI = 40;
  const progress = Math.min(bmi / maxBMI, 1);
  const circumference = 2 * Math.PI * 85;
  const offset = circumference - (progress * circumference);
  
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset
  };
});

const idealWeightRange = computed(() => {
  if (!formData.height) return { min: 0, max: 0 };
  
  const height = parseFloat(formData.height);
  return bmiUtils.getIdealWeightRange(height, formData.unit);
});

const weightDifference = computed(() => {
  if (!formData.weight || !idealWeightRange.value) return 0;
  
  const currentWeight = parseFloat(formData.weight);
  const { min, max } = idealWeightRange.value;
  
  if (currentWeight < min) {
    return currentWeight - min;
  } else if (currentWeight > max) {
    return currentWeight - max;
  } else {
    return 0;
  }
});

const bmiCategories = computed(() => FORM_CONSTANTS.BMI.CATEGORIES);

const trendData = computed(() => getBMITrend());

const filteredTrendData = computed(() => {
  if (!trendData.value) return [];
  
  const now = new Date();
  const days = chartPeriod.value === '7d' ? 7 : chartPeriod.value === '30d' ? 30 : 90;
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  return trendData.value.filter(item => new Date(item.date) >= cutoffDate);
});

const recentRecords = computed(() => 
  records.value?.slice(0, 5) || []
);

const bmiStatistics = computed(() => {
  if (!records.value || records.value.length === 0) return null;
  
  const bmis = records.value.map(r => r.bmiResult);
  const average = bmis.reduce((sum, bmi) => sum + bmi, 0) / bmis.length;
  const min = Math.min(...bmis);
  const max = Math.max(...bmis);
  
  return {
    average: average.toFixed(1),
    min: min.toFixed(1),
    max: max.toFixed(1),
    count: bmis.length,
    trend: bmis.length > 1 ? (bmis[0] > bmis[bmis.length - 1] ? 'decreasing' : 'increasing') : 'stable'
  };
});

const riskLevelClasses = computed(() => {
  if (!calculationResult.value) return {};
  
  const bmi = calculationResult.value.bmi;
  return {
    'risk-low': bmi >= 18.5 && bmi < 24,
    'risk-medium': (bmi >= 24 && bmi < 28) || (bmi >= 17 && bmi < 18.5),
    'risk-high': bmi >= 28 || bmi < 17
  };
});

// 防抖處理輸入變化
const debouncedInputChange = debounce(() => {
  // 處理輸入變化的邏輯
}, 300);

// 方法定義
const calculateBMI = async () => {
  try {
    globalLoading.value = true;
    await submitCalculation();
    
    if (calculationResult.value) {
      showSuccessOverlay.value = true;
      setTimeout(() => {
        showSuccessOverlay.value = false;
      }, 2000);
      
      ElNotification({
        title: 'BMI 計算完成',
        message: `您的 BMI 值為 ${calculationResult.value.bmi}，屬於${resultCategory.value?.name}`,
        type: resultCategory.value?.isHealthy ? 'success' : 'warning',
        duration: 5000,
        position: 'top-right'
      });
      
      // 如果是首次計算且用戶已認證，顯示專家建議
      if (authStore.isAuthenticated && !showExpertAdvice.value) {
        showExpertAdvice.value = true;
      }
    }
  } catch (error: any) {
    console.error('BMI 計算失敗:', error);
    handleError(error, '計算失敗');
  } finally {
    globalLoading.value = false;
  }
};