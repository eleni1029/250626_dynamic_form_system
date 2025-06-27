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
                <el-button
                  :icon="Download"
                  size="small"
                  @click="downloadResult"
                >
                  下載報告
                </el-button>
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

              <!-- 理想體重範圍 -->
              <div class="ideal-weight">
                <h4>理想體重範圍</h4>
                <div class="weight-range">
                  <span class="range-value">
                    {{ idealWeightRange.min }} - {{ idealWeightRange.max }}
                  </span>
                  <span class="range-unit">{{ weightUnit }}</span>
                </div>
                <div class="weight-diff">
                  <span v-if="weightDifference > 0" class="diff-text over">
                    超出理想體重 {{ Math.abs(weightDifference) }} {{ weightUnit }}
                  </span>
                  <span v-else-if="weightDifference < 0" class="diff-text under">
                    低於理想體重 {{ Math.abs(weightDifference) }} {{ weightUnit }}
                  </span>
                  <span v-else class="diff-text ideal">
                    體重在理想範圍內
                  </span>
                </div>
              </div>

              <!-- 健康建議 -->
              <div class="health-advice">
                <h4>健康建議</h4>
                <div class="advice-content">
                  <p>{{ getHealthAdvice() }}</p>
                  
                  <div class="advice-tips">
                    <div class="tip-item">
                      <el-icon><Food /></el-icon>
                      <span>均衡飲食，控制熱量攝入</span>
                    </div>
                    <div class="tip-item">
                      <el-icon><Walk /></el-icon>
                      <span>定期運動，增強體質</span>
                    </div>
                    <div class="tip-item">
                      <el-icon><Timer /></el-icon>
                      <span>保持良好的作息習慣</span>
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
                <h3>歷史記錄</h3>
                <el-button
                  :icon="TrendCharts"
                  size="small"
                  @click="viewAllHistory"
                >
                  查看全部
                </el-button>
              </div>
            </template>
            
            <div class="history-content">
              <!-- 趨勢圖表 -->
              <div v-if="trendData.length > 1" class="trend-chart">
                <BMITrendChart :data="trendData" />
              </div>
              
              <!-- 記錄列表 -->
              <div class="records-list">
                <div 
                  v-for="record in recentRecords"
                  :key="record.id"
                  class="record-item"
                >
                  <div class="record-date">
                    {{ formatDate(record.createdAt) }}
                  </div>
                  <div class="record-value">
                    <span class="bmi-value">{{ record.bmiResult }}</span>
                    <span 
                      class="category-badge"
                      :style="{ backgroundColor: getBMICategory(record.bmiResult).color }"
                    >
                      {{ getBMICategory(record.bmiResult).name }}
                    </span>
                  </div>
                  <div class="record-actions">
                    <el-button
                      :icon="View"
                      size="small"
                      text
                      @click="viewRecord(record)"
                    />
                    <el-button
                      :icon="Delete"
                      size="small"
                      text
                      type="danger"
                      @click="deleteRecord(record.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 相關工具推薦 -->
          <el-card class="recommendations-card" shadow="hover">
            <template #header>
              <h3>相關工具</h3>
            </template>
            
            <div class="recommendations">
              <div class="tool-item">
                <div class="tool-icon">
                  <DataBoard />
                </div>
                <div class="tool-info">
                  <h4>TDEE 計算器</h4>
                  <p>計算每日總能量消耗</p>
                </div>
                <el-button
                  type="primary"
                  size="small"
                  @click="navigateToTDEE"
                >
                  使用
                </el-button>
              </div>
              
              <div class="tool-item">
                <div class="tool-icon">
                  <TrendCharts />
                </div>
                <div class="tool-info">
                  <h4>健康追蹤</h4>
                  <p>長期健康數據分析</p>
                </div>
                <el-button
                  size="small"
                  @click="navigateToTracking"
                >
                  了解更多
                </el-button>
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
      width="600px"
      :before-close="handleDialogClose"
    >
      <BMIResultDetail 
        v-if="calculationResult"
        :result="calculationResult"
        :unit="formData.unit"
      />
    </el-dialog>
  </div>
</template>

