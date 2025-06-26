<template>
  <div class="login-view">
    <div class="login-container">
      <!-- 左側裝飾區域 -->
      <div class="login-decoration">
        <div class="decoration-content">
          <div class="brand-section">
            <div class="brand-logo">
              <Document />
            </div>
            <h1 class="brand-title">動態表單系統</h1>
            <p class="brand-subtitle">專業的健康計算平台</p>
          </div>
          
          <div class="features-showcase">
            <div class="feature-item">
              <div class="feature-icon">
                <Calculator />
              </div>
              <div class="feature-text">
                <h3>精確計算</h3>
                <p>採用國際標準公式，提供準確的健康數據</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <TrendCharts />
              </div>
              <div class="feature-text">
                <h3>趨勢分析</h3>
                <p>長期數據追蹤，了解健康變化趨勢</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                <Shield />
              </div>
              <div class="feature-text">
                <h3>隱私安全</h3>
                <p>數據加密存儲，保護您的隱私安全</p>
              </div>
            </div>
          </div>
          
          <div class="testimonial">
            <blockquote>
              "這是我用過最專業的健康計算工具，
              界面簡潔，功能強大！"
            </blockquote>
            <cite>— Sarah Chen, 營養師</cite>
          </div>
        </div>
      </div>

      <!-- 右側登錄表單 -->
      <div class="login-form-section">
        <div class="form-container">
          <!-- 表單頭部 -->
          <div class="form-header">
            <h2 class="form-title">歡迎回來</h2>
            <p class="form-subtitle">
              登錄您的賬號，繼續使用我們的服務
            </p>
          </div>

          <!-- 社交登錄 -->
          <div v-if="showSocialLogin" class="social-login">
            <el-button
              v-for="provider in socialProviders"
              :key="provider.name"
              :class="socialButtonClasses(provider)"
              :loading="socialLoading[provider.name]"
              :disabled="isLoading"
              block
              @click="handleSocialLogin(provider)"
            >
              <component :is="provider.icon" class="social-icon" />
              <span>使用 {{ provider.label }} 登錄</span>
            </el-button>
            
            <div class="divider">
              <span>或使用電子郵件</span>
            </div>
          </div>

          <!-- 登錄表單 -->
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            size="large"
            @submit.prevent="handleLogin"
          >
            <el-form-item label="電子郵件" prop="email">
              <el-input
                v-model="loginForm.email"
                :prefix-icon="Message"
                placeholder="請輸入您的電子郵件"
                autocomplete="email"
                :disabled="isLoading"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item label="密碼" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                :prefix-icon="Lock"
                placeholder="請輸入您的密碼"
                autocomplete="current-password"
                :disabled="isLoading"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <div class="form-options">
              <el-checkbox 
                v-model="loginForm.rememberMe"
                :disabled="isLoading"
              >
                記住我
              </el-checkbox>
              
              <el-link
                type="primary"
                :disabled="isLoading"
                @click="handleForgotPassword"
              >
                忘記密碼？
              </el-link>
            </div>

            <el-form-item>
              <el-button
                type="primary"
                :loading="isLoading"
                :disabled="!isFormValid"
                block
                @click="handleLogin"
              >
                {{ isLoading ? '登錄中...' : '登錄' }}
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 表單底部 -->
          <div class="form-footer">
            <div class="register-prompt">
              <span>還沒有賬號？</span>
              <el-link
                type="primary"
                :disabled="isLoading"
                @click="handleRegister"
              >
                立即註冊
              </el-link>
            </div>
            
            <div class="guest-option">
              <el-divider>
                <span class="divider-text">或者</span>
              </el-divider>
              
              <el-button
                :icon="UserFilled"
                :loading="guestLoading"
                :disabled="isLoading"
                plain
                block
                @click="handleGuestLogin"
              >
                {{ guestLoading ? '創建中...' : '以遊客身份體驗' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景裝飾 -->
    <div class="background-decoration">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <!-- 移動端頂部導航 -->
    <div v-if="isMobile" class="mobile-header">
      <el-button
        :icon="ArrowLeft"
        circle
        @click="handleBack"
      />
      <span class="mobile-title">用戶登錄</span>
      <div class="mobile-spacer"></div>
    </div>

    <!-- 加載遮罩 -->
    <LoadingSpinner
      v-if="isLoading"
      :loading="isLoading"
      overlay
      text="正在登錄..."
    />

    <!-- 錯誤提示 -->
    <Transition name="slide-up">
      <ErrorMessage
        v-if="errorMessage"
        :visible="!!errorMessage"
        type="error"
        :title="errorTitle"
        :description="errorMessage"
        show-retry
        @retry="handleRetryLogin"
        @close="clearError"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  ElForm, 
  ElFormItem, 
  ElInput, 
  ElButton, 
  ElCheckbox, 
  ElLink,
  ElDivider,
  ElMessage,
  ElNotification,
  type FormInstance,
  type FormRules
} from 'element-plus';
import {
  Document,
  Calculator,
  TrendCharts,
  Shield,
  Message,
  Lock,
  UserFilled,
  ArrowLeft
} from '@element-plus/icons-vue';

// 導入組件
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorMessage from '@/components/common/ErrorMessage.vue';

// 導入 composables
import { useAuth, useLoginForm } from '@/composables/useAuth';
import { useDevice } from '@/composables/useDevice';

// 導入 stores
import { useAuthStore } from '@/stores/auth';

// 導入常量
import { API_CONSTANTS, STORAGE_CONSTANTS } from '@/utils/constants';

// 路由
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();

// Composables
const { isMobile, isTablet } = useDevice();

// 表單相關
const loginFormRef = ref<FormInstance>();
const loginForm = reactive({
  email: '',
  password: '',
  rememberMe: false
});

// 響應式狀態
const isLoading = ref(false);
const guestLoading = ref(false);
const errorMessage = ref('');
const errorTitle = ref('');

const socialLoading = reactive<Record<string, boolean>>({
  google: false,
  facebook: false,
  github: false
});

// 社交登錄配置
const socialProviders = ref([
  {
    name: 'google',
    label: 'Google',
    icon: 'IconGoogle',
    color: '#4285f4'
  },
  {
    name: 'github',
    label: 'GitHub', 
    icon: 'IconGitHub',
    color: '#333'
  }
]);

const showSocialLogin = ref(false); // 根據配置決定是否顯示

// 表單驗證規則
const loginRules: FormRules = {
  email: [
    { required: true, message: '請輸入電子郵件', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的電子郵件格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' },
    { min: 6, message: '密碼長度至少6位', trigger: 'blur' }
  ]
};

// 計算屬性
const isFormValid = computed(() => {
  return loginForm.email && 
         loginForm.password && 
         loginForm.email.includes('@') &&
         loginForm.password.length >= 6;
});

const socialButtonClasses = (provider: any) => ({
  'social-button': true,
  [`social-button--${provider.name}`]: true
});

// 方法
const handleLogin = async () => {
  if (!loginFormRef.value) return;
  
  try {
    const isValid = await loginFormRef.value.validate();
    if (!isValid) return;

    isLoading.value = true;
    clearError();

    // 執行登錄
    const loginData = {
      email: loginForm.email.trim(),
      password: loginForm.password,
      rememberMe: loginForm.rememberMe
    };

    await authStore.login(loginData);
    
    // 保存郵箱用於下次自動填充
    if (loginForm.rememberMe) {
      localStorage.setItem(STORAGE_CONSTANTS.AUTH.REMEMBER_ME, 'true');
      localStorage.setItem('saved_email', loginForm.email);
    } else {
      localStorage.removeItem(STORAGE_CONSTANTS.AUTH.REMEMBER_ME);
      localStorage.removeItem('saved_email');
    }
    
    ElMessage.success('登錄成功！歡迎回來');
    
    // 重定向到目標頁面
    const redirectPath = route.query.redirect as string || '/user/dashboard';
    router.push(redirectPath);
    
  } catch (error: any) {
    console.error('登錄失敗:', error);
    
    handleLoginError(error);
  } finally {
    isLoading.value = false;
  }
};

const handleLoginError = (error: any) => {
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;
  
  switch (status) {
    case 401:
      errorTitle.value = '登錄失敗';
      errorMessage.value = '郵箱或密碼錯誤，請檢查後重試';
      // 清空密碼
      loginForm.password = '';
      break;
    case 403:
      errorTitle.value = '賬號被禁用';
      errorMessage.value = '您的賬號已被暫時禁用，請聯繫客服';
      break;
    case 429:
      errorTitle.value = '登錄過於頻繁';
      errorMessage.value = '登錄嘗試過於頻繁，請稍後再試';
      break;
    case 500:
      errorTitle.value = '服務器錯誤';
      errorMessage.value = '服務器暫時不可用，請稍後重試';
      break;
    default:
      errorTitle.value = '登錄失敗';
      errorMessage.value = serverMessage || '登錄時發生未知錯誤，請重試';
  }
};

const handleSocialLogin = async (provider: any) => {
  socialLoading[provider.name] = true;
  
  try {
    clearError();
    
    // 實現社交登錄邏輯
    ElMessage.info(`${provider.label} 登錄功能開發中...`);
    
    // 實際實現時會調用對應的 OAuth 流程
    // const result = await authStore.socialLogin(provider.name);
    
  } catch (error: any) {
    console.error(`${provider.label} 登錄失敗:`, error);
    errorTitle.value = `${provider.label} 登錄失敗`;
    errorMessage.value = `無法通過 ${provider.label} 登錄，請嘗試其他方式`;
  } finally {
    socialLoading[provider.name] = false;
  }
};

const handleGuestLogin = async () => {
  guestLoading.value = true;
  clearError();
  
  try {
    await authStore.createGuestUser();
    
    ElNotification({
      title: '遊客模式已啟用',
      message: '已為您創建臨時賬號，可以體驗基礎功能。您隨時可以註冊正式賬號以解鎖更多功能。',
      type: 'success',
      duration: 6000
    });
    
    // 重定向到表單頁面
    const redirectPath = route.query.redirect as string || '/forms';
    router.push(redirectPath);
    
  } catch (error: any) {
    console.error('創建遊客賬號失敗:', error);
    errorTitle.value = '創建遊客賬號失敗';
    errorMessage.value = '無法創建遊客賬號，請重試或註冊正式賬號';
  } finally {
    guestLoading.value = false;
  }
};

const handleForgotPassword = () => {
  router.push('/auth/forgot-password');
};

const handleRegister = () => {
  const redirectPath = route.query.redirect as string;
  const query = redirectPath ? { redirect: redirectPath } : {};
  router.push({ path: '/auth/register', query });
};

const handleBack = () => {
  router.back();
};

const handleRetryLogin = () => {
  clearError();
  handleLogin();
};

const clearError = () => {
  errorMessage.value = '';
  errorTitle.value = '';
};

// 生命週期
onMounted(() => {
  // 如果已經登錄，直接重定向
  if (authStore.isAuthenticated) {
    const redirectPath = route.query.redirect as string || '/user/dashboard';
    router.replace(redirectPath);
    return;
  }
  
  // 檢查是否有保存的登錄信息
  const rememberMe = localStorage.getItem(STORAGE_CONSTANTS.AUTH.REMEMBER_ME);
  const savedEmail = localStorage.getItem('saved_email');
  
  if (rememberMe === 'true' && savedEmail) {
    loginForm.email = savedEmail;
    loginForm.rememberMe = true;
  }
  
  // 檢查 URL 參數中是否有錯誤信息
  const error = route.query.error as string;
  if (error) {
    switch (error) {
      case 'session_expired':
        errorTitle.value = '登錄已過期';
        errorMessage.value = '您的登錄已過期，請重新登錄';
        break;
      case 'unauthorized':
        errorTitle.value = '未授權訪問';
        errorMessage.value = '您需要登錄才能訪問該頁面';
        break;
    }
  }
});

// 監聽器
watch(() => route.query.error, (newError) => {
  if (newError) {
    // 處理來自 URL 的錯誤參數
    clearError();
  }
});
</script>

<script lang="ts">
export default {
  name: 'LoginView'
};
</script>

<style lang="scss" scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
}

.login-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

// 左側裝飾區域
.login-decoration {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 1024px) {
    display: none;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(1px);
  }
  
  .decoration-content {
    position: relative;
    z-index: 1;
    max-width: 500px;
    
    .brand-section {
      margin-bottom: 60px;
      
      .brand-logo {
        width: 80px;
        height: 80px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        margin-bottom: 24px;
        backdrop-filter: blur(10px);
      }
      
      .brand-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 12px;
        line-height: 1.2;
      }
      
      .brand-subtitle {
        font-size: 1.125rem;
        opacity: 0.9;
        line-height: 1.5;
      }
    }
    
    .features-showcase {
      margin-bottom: 60px;
      
      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 32px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .feature-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .feature-text {
          flex: 1;
          
          h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          p {
            opacity: 0.8;
            line-height: 1.5;
            margin: 0;
          }
        }
      }
    }
    
    .testimonial {
      padding: 32px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      
      blockquote {
        font-size: 1.125rem;
        line-height: 1.6;
        margin: 0 0 16px 0;
        font-style: italic;
        opacity: 0.95;
      }
      
      cite {
        font-size: 0.9rem;
        opacity: 0.8;
        font-style: normal;
      }
    }
  }
}

// 右側登錄表單
.login-form-section {
  flex: 0 0 500px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  
  @media (max-width: 1024px) {
    flex: 1;
    padding: 24px;
  }
  
  @media (max-width: 768px) {
    padding: 20px;
    padding-top: 80px; // 為移動端頂部導航留空間
  }
  
  .form-container {
    width: 100%;
    max-width: 400px;
  }
  
  .form-header {
    text-align: center;
    margin-bottom: 40px;
    
    .form-title {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    
    .form-subtitle {
      color: #666;
      line-height: 1.5;
      margin: 0;
    }
  }
  
  .social-login {
    margin-bottom: 32px;
    
    .social-button {
      height: 48px;
      margin-bottom: 12px;
      border: 1px solid #e0e0e0;
      background: white;
      color: #333;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
      
      .social-icon {
        margin-right: 12px;
        font-size: 18px;
      }
    }
    
    .divider {
      position: relative;
      text-align: center;
      margin: 24px 0;
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e0e0e0;
      }
      
      span {
        background: white;
        padding: 0 16px;
        color: #666;
        font-size: 0.9rem;
        position: relative;
      }
    }
  }
  
  :deep(.el-form) {
    .el-form-item__label {
      font-weight: 500;
      color: #333;
    }
    
    .el-input__inner {
      height: 48px;
      border-radius: 8px;
    }
    
    .el-button {
      height: 48px;
      border-radius: 8px;
      font-weight: 500;
    }
  }
  
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  
  .form-footer {
    margin-top: 32px;
    
    .register-prompt {
      text-align: center;
      margin-bottom: 24px;
      color: #666;
      
      span {
        margin-right: 8px;
      }
    }
    
    .guest-option {
      .divider-text {
        font-size: 0.9rem;
        color: #666;
      }
    }
  }
}

// 移動端頂部導航
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
  border-bottom: 1px solid #eee;
  
  @media (min-width: 769px) {
    display: none;
  }
  
  .mobile-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  .mobile-spacer {
    width: 32px; // 與左側按鈕同寬，保持居中
  }
}

// 背景裝飾
.background-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  
  .bg-shape {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    animation: float 6s ease-in-out infinite;
    
    &.shape-1 {
      width: 300px;
      height: 300px;
      top: 10%;
      right: 10%;
      animation-delay: 0s;
    }
    
    &.shape-2 {
      width: 200px;
      height: 200px;
      bottom: 20%;
      left: 15%;
      animation-delay: 2s;
    }
    
    &.shape-3 {
      width: 150px;
      height: 150px;
      top: 60%;
      right: 20%;
      animation-delay: 4s;
    }
  }
}

// 動畫
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(5deg); }
  66% { transform: translateY(10px) rotate(-5deg); }
}

// 轉場動畫
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

// 深色模式適配
@media (prefers-color-scheme: dark) {
  .login-form-section {
    background: #1a1a1a;
    color: white;
    
    .form-header .form-title {
      color: white;
    }
    
    .form-header .form-subtitle {
      color: #ccc;
    }
    
    .social-login .divider span {
      background: #1a1a1a;
      color: #ccc;
    }
    
    .form-footer .register-prompt {
      color: #ccc;
    }
  }
  
  .mobile-header {
    background: #1a1a1a;
    border-bottom-color: #333;
    
    .mobile-title {
      color: white;
    }
  }
}

// 減少動畫偏好
@media (prefers-reduced-motion: reduce) {
  .bg-shape {
    animation: none !important;
  }
  
  .social-button,
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: none !important;
  }
}
</style>