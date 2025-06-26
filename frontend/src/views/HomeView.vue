<template>
  <div class="home-view">
    <!-- 英雄區域 -->
    <section :class="heroClasses">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="highlight">智能</span>動態表單系統
          </h1>
          <p class="hero-subtitle">
            專業的健康計算工具，支持 BMI 和 TDEE 計算，
            <br>幫助您制定個性化的健康管理方案
          </p>
          
          <!-- 快速開始按鈕 -->
          <div class="hero-actions">
            <el-button
              type="primary"
              size="large"
              :icon="Promotion"
              @click="handleGetStarted"
            >
              立即開始
            </el-button>
            
            <el-button
              size="large"
              :icon="VideoPlay"
              @click="handleWatchDemo"
            >
              觀看演示
            </el-button>
          </div>
          
          <!-- 特色標籤 -->
          <div class="hero-badges">
            <el-tag type="success" effect="plain" size="large">
              <el-icon><Check /></el-icon>
              免費使用
            </el-tag>
            <el-tag type="info" effect="plain" size="large">
              <el-icon><Shield /></el-icon>
              隱私安全
            </el-tag>
            <el-tag type="warning" effect="plain" size="large">
              <el-icon><TrendCharts /></el-icon>
              數據分析
            </el-tag>
          </div>
        </div>
        
        <!-- 英雄圖片 -->
        <div class="hero-image">
          <div class="dashboard-preview">
            <div class="preview-header">
              <div class="preview-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div class="preview-content">
              <div class="preview-card bmi-card">
                <h3>BMI 計算器</h3>
                <div class="preview-chart">
                  <div class="chart-bar" style="height: 60%"></div>
                  <div class="chart-bar" style="height: 80%"></div>
                  <div class="chart-bar" style="height: 45%"></div>
                  <div class="chart-bar" style="height: 90%"></div>
                </div>
              </div>
              <div class="preview-card tdee-card">
                <h3>TDEE 計算器</h3>
                <div class="preview-stats">
                  <div class="stat-item">
                    <span class="stat-label">BMR</span>
                    <span class="stat-value">1,680</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">TDEE</span>
                    <span class="stat-value">2,352</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能特色區域 -->
    <section class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">強大功能特色</h2>
          <p class="section-subtitle">
            專業的健康計算工具，為您提供科學準確的健康數據分析
          </p>
        </div>
        
        <div class="features-grid">
          <div
            v-for="feature in features"
            :key="feature.id"
            :class="featureCardClasses(feature)"
            @click="handleFeatureClick(feature)"
          >
            <div class="feature-icon">
              <component :is="feature.icon" />
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-tags">
              <el-tag
                v-for="tag in feature.tags"
                :key="tag"
                size="small"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 工具卡片區域 -->
    <section class="tools-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">健康計算工具</h2>
          <p class="section-subtitle">
            選擇適合的計算工具，開始您的健康管理之旅
          </p>
        </div>
        
        <div class="tools-grid">
          <div
            v-for="tool in tools"
            :key="tool.id"
            :class="toolCardClasses(tool)"
            @click="handleToolClick(tool)"
          >
            <div class="tool-header">
              <div class="tool-icon">
                <component :is="tool.icon" />
              </div>
              <div class="tool-info">
                <h3 class="tool-title">{{ tool.title }}</h3>
                <p class="tool-subtitle">{{ tool.subtitle }}</p>
              </div>
              <div class="tool-badge">
                <el-tag
                  :type="tool.access === 'free' ? 'success' : 'warning'"
                  effect="plain"
                >
                  {{ tool.access === 'free' ? '免費' : '會員' }}
                </el-tag>
              </div>
            </div>
            
            <div class="tool-content">
              <p class="tool-description">{{ tool.description }}</p>
              
              <div class="tool-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ tool.stats.users }}</span>
                  <span class="stat-label">用戶使用</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ tool.stats.calculations }}</span>
                  <span class="stat-label">次計算</span>
                </div>
              </div>
              
              <div class="tool-features">
                <div
                  v-for="item in tool.features"
                  :key="item"
                  class="feature-item"
                >
                  <el-icon><Check /></el-icon>
                  <span>{{ item }}</span>
                </div>
              </div>
            </div>
            
            <div class="tool-actions">
              <el-button
                type="primary"
                :size="isMobile ? 'default' : 'large'"
                block
                @click.stop="navigateToTool(tool)"
              >
                {{ tool.buttonText }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 統計數據區域 -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div
            v-for="stat in statistics"
            :key="stat.id"
            class="stat-card"
          >
            <div class="stat-icon">
              <component :is="stat.icon" />
            </div>
            <div class="stat-content">
              <div class="stat-number">
                <CountUp
                  :end-val="stat.value"
                  :duration="2000"
                  :options="{ separator: ',' }"
                />
                <span class="stat-unit">{{ stat.unit }}</span>
              </div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 用戶評價區域 -->
    <section class="testimonials-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">用戶評價</h2>
          <p class="section-subtitle">
            來看看其他用戶是如何評價我們的健康計算工具
          </p>
        </div>
        
        <div class="testimonials-carousel">
          <el-carousel
            :interval="5000"
            height="300px"
            indicator-position="outside"
            arrow="hover"
          >
            <el-carousel-item
              v-for="testimonial in testimonials"
              :key="testimonial.id"
            >
              <div class="testimonial-card">
                <div class="testimonial-content">
                  <div class="quote-icon">
                    <el-icon><ChatDotRound /></el-icon>
                  </div>
                  <p class="testimonial-text">{{ testimonial.content }}</p>
                  <div class="testimonial-rating">
                    <el-rate
                      v-model="testimonial.rating"
                      disabled
                      show-score
                      text-color="#ff9900"
                    />
                  </div>
                </div>
                <div class="testimonial-author">
                  <el-avatar
                    :size="50"
                    :src="testimonial.avatar"
                    :icon="UserFilled"
                  />
                  <div class="author-info">
                    <div class="author-name">{{ testimonial.author }}</div>
                    <div class="author-role">{{ testimonial.role }}</div>
                  </div>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>
      </div>
    </section>

    <!-- CTA 區域 -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">開始您的健康管理之旅</h2>
          <p class="cta-subtitle">
            立即註冊，解鎖更多專業功能，獲得個性化的健康建議
          </p>
          <div class="cta-actions">
            <el-button
              type="primary"
              size="large"
              :icon="UserFilled"
              @click="handleRegister"
            >
              免費註冊
            </el-button>
            <el-button
              size="large"
              :icon="Star"
              @click="handleTryGuest"
            >
              遊客體驗
            </el-button>
          </div>
          <div class="cta-note">
            <el-icon><InfoFilled /></el-icon>
            <span>註冊即可享受所有功能，並且完全免費</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ElButton, 
  ElTag, 
  ElIcon, 
  ElCarousel, 
  ElCarouselItem,
  ElAvatar,
  ElRate,
  ElMessage
} from 'element-plus';
import {
  Promotion,
  VideoPlay,
  Check,
  Shield,
  TrendCharts,
  Calculator,
  DataAnalysis,
  UserFilled,
  Star,
  InfoFilled,
  ChatDotRound,
  Management,
  DataBoard,
  Timer
} from '@element-plus/icons-vue';

// 導入 stores
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

// 導入 composables
import { useDevice } from '@/composables/useDevice';

// 導入組件
import CountUp from '@/components/common/CountUp.vue';

// 路由
const router = useRouter();

// Stores
const authStore = useAuthStore();
const themeStore = useThemeStore();

// 設備檢測
const { isMobile, isTablet } = useDevice();

// 響應式狀態
const isLoading = ref(false);

// 功能特色數據
const features = ref([
  {
    id: 'smart-calculation',
    title: '智能計算',
    description: '採用國際標準公式，提供精確的 BMI 和 TDEE 計算結果',
    icon: Calculator,
    tags: ['精確', '快速', '可靠'],
    available: true
  },
  {
    id: 'data-analysis',
    title: '數據分析',
    description: '詳細的健康數據分析報告，幫助您了解身體狀況',
    icon: DataAnalysis,
    tags: ['專業', '詳細', '直觀'],
    available: true
  },
  {
    id: 'trend-tracking',
    title: '趨勢追蹤',
    description: '長期健康數據追蹤，觀察身體變化趨勢',
    icon: TrendCharts,
    tags: ['長期', '追蹤', '分析'],
    available: authStore.isAuthenticated
  },
  {
    id: 'personal-advice',
    title: '個性化建議',
    description: '基於您的數據提供個性化的健康管理建議',
    icon: Management,
    tags: ['個性化', '專業', '實用'],
    available: authStore.isAuthenticated
  }
]);

// 工具數據
const tools = ref([
  {
    id: 'bmi-calculator',
    title: 'BMI 計算器',
    subtitle: '身體質量指數計算',
    description: '計算您的身體質量指數，了解體重是否在健康範圍內',
    icon: Calculator,
    access: 'free',
    route: '/forms/bmi',
    buttonText: '開始計算',
    stats: {
      users: '10,000+',
      calculations: '50,000+'
    },
    features: [
      '支持公制和英制單位',
      '詳細的健康分類說明',
      '理想體重範圍建議',
      '健康改善建議'
    ]
  },
  {
    id: 'tdee-calculator',
    title: 'TDEE 計算器',
    subtitle: '每日總能量消耗計算',
    description: '計算您的每日總能量消耗，制定個性化的飲食計劃',
    icon: DataBoard,
    access: 'member',
    route: '/forms/tdee',
    buttonText: '開始計算',
    stats: {
      users: '5,000+',
      calculations: '25,000+'
    },
    features: [
      '基礎代謝率計算',
      '活動水平評估',
      '營養攝取建議',
      '目標設定指導'
    ]
  }
]);

// 統計數據
const statistics = ref([
  {
    id: 'users',
    label: '註冊用戶',
    value: 15000,
    unit: '+',
    icon: UserFilled
  },
  {
    id: 'calculations',
    label: '總計算次數',
    value: 75000,
    unit: '+',
    icon: Calculator
  },
  {
    id: 'accuracy',
    label: '計算準確率',
    value: 99.9,
    unit: '%',
    icon: TrendCharts
  },
  {
    id: 'satisfaction',
    label: '用戶滿意度',
    value: 4.8,
    unit: '/5',
    icon: Star
  }
]);

// 用戶評價數據
const testimonials = ref([
  {
    id: 1,
    content: '這個BMI計算器非常準確，界面簡潔易用。作為健身愛好者，我經常使用它來監控自己的身體狀況。',
    author: 'Alice Chen',
    role: '健身教練',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
  },
  {
    id: 2,
    content: 'TDEE計算器幫助我制定了合理的飲食計劃，結果非常準確。強烈推薦給需要管理體重的朋友們。',
    author: 'David Wang',
    role: '營養師',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
  },
  {
    id: 3,
    content: '作為醫生，我需要準確的健康計算工具。這個系統的專業性和準確性讓我非常滿意。',
    author: 'Dr. Sarah Liu',
    role: '內科醫生',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  }
]);

// 計算屬性
const heroClasses = computed(() => ({
  'hero-section': true,
  'hero-section--mobile': isMobile.value
}));

const featureCardClasses = (feature: any) => ({
  'feature-card': true,
  'feature-card--available': feature.available,
  'feature-card--disabled': !feature.available
});

const toolCardClasses = (tool: any) => ({
  'tool-card': true,
  'tool-card--free': tool.access === 'free',
  'tool-card--member': tool.access === 'member'
});

// 方法
const handleGetStarted = () => {
  if (authStore.isAuthenticated) {
    router.push('/user/dashboard');
  } else {
    router.push('/auth/register');
  }
};

const handleWatchDemo = () => {
  // 打開演示視頻或跳轉到演示頁面
  router.push('/demo');
};

const handleFeatureClick = (feature: any) => {
  if (!feature.available) {
    ElMessage.warning('此功能需要註冊賬號後使用');
    router.push('/auth/register');
  }
};

const handleToolClick = (tool: any) => {
  if (tool.access === 'member' && !authStore.isAuthenticated) {
    ElMessage.warning('此工具需要註冊賬號後使用');
    router.push('/auth/register');
    return;
  }
  
  navigateToTool(tool);
};

const navigateToTool = (tool: any) => {
  router.push(tool.route);
};

const handleRegister = () => {
  router.push('/auth/register');
};

const handleTryGuest = () => {
  router.push('/auth/guest');
};

// 生命週期
onMounted(() => {
  // 頁面載入完成後的處理
});
</script>

<script lang="ts">
export default {
  name: 'HomeView'
};
</script>

<style lang="scss" scoped>
.home-view {
  min-height: 100vh;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  
  @media (max-width: 768px) {
    padding: 0 16px;
  }
}

// 英雄區域
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 0;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
  
  &--mobile {
    padding: 60px 0;
    
    .hero-content {
      flex-direction: column;
      text-align: center;
      gap: 40px;
    }
    
    .hero-image {
      order: -1;
    }
  }
  
  .hero-content {
    display: flex;
    align-items: center;
    gap: 80px;
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }
  
  .hero-text {
    flex: 1;
    
    .hero-title {
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 24px;
      
      .highlight {
        background: linear-gradient(45deg, #ffd700, #ffed4e);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      @media (max-width: 768px) {
        font-size: 2.5rem;
      }
    }
    
    .hero-subtitle {
      font-size: 1.25rem;
      line-height: 1.6;
      margin-bottom: 40px;
      opacity: 0.9;
      
      @media (max-width: 768px) {
        font-size: 1.1rem;
        margin-bottom: 32px;
      }
    }
    
    .hero-actions {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
      
      @media (max-width: 768px) {
        flex-direction: column;
      }
    }
    
    .hero-badges {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      
      :deep(.el-tag) {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        color: white;
        
        .el-icon {
          margin-right: 4px;
        }
      }
    }
  }
  
  .hero-image {
    flex: 0 0 500px;
    
    @media (max-width: 768px) {
      flex: none;
      width: 100%;
      max-width: 400px;
    }
  }
  
  .dashboard-preview {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    animation: float 6s ease-in-out infinite;
    
    .preview-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      
      .preview-dots {
        display: flex;
        gap: 6px;
        
        span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
          
          &:nth-child(1) { background: #ff5f56; }
          &:nth-child(2) { background: #ffbd2e; }
          &:nth-child(3) { background: #27ca3f; }
        }
      }
    }
    
    .preview-content {
      display: flex;
      gap: 16px;
      
      @media (max-width: 768px) {
        flex-direction: column;
      }
    }
    
    .preview-card {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #eee;
      
      h3 {
        font-size: 14px;
        color: #333;
        margin-bottom: 12px;
      }
      
      &.bmi-card {
        .preview-chart {
          display: flex;
          align-items: end;
          gap: 4px;
          height: 60px;
          
          .chart-bar {
            flex: 1;
            background: linear-gradient(to top, #409EFF, #79bbff);
            border-radius: 2px;
            animation: chartGrow 2s ease-out;
          }
        }
      }
      
      &.tdee-card {
        .preview-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          
          .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            
            .stat-value {
              font-size: 16px;
              font-weight: 600;
              color: #67C23A;
            }
          }
        }
      }
    }
  }
}

// 其餘樣式請參考之前完整版本的 CSS...
// 為節省篇幅，這裡只顯示核心部分
// 完整的 CSS 包括：功能特色、工具卡片、統計數據、評價、CTA 等區域的樣式

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes chartGrow {
  from { height: 0; }
  to { height: var(--final-height, 100%); }
}
</style>