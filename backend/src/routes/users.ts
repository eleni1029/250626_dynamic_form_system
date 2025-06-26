// backend/src/routes/users.ts
import { Router } from 'express';
import { UserController, userValidation } from '../controllers/UserController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// 速率限制配置
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每 15 分鐘最多 100 次請求
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 所有用戶路由都需要認證
router.use(authenticateToken);

/**
 * 用戶資料管理
 */

// 獲取用戶資料
router.get('/profile', generalLimiter, UserController.getProfile);

// 更新用戶資料
router.put('/profile', generalLimiter, userValidation.updateProfile, UserController.updateProfile);

// 刪除用戶帳號
router.delete('/account', generalLimiter, userValidation.deleteAccount, UserController.deleteAccount);

/**
 * 專案相關
 */

// 獲取用戶可訪問的專案列表
router.get('/projects', generalLimiter, UserController.getAccessibleProjects);

// 檢查用戶對特定專案的權限
router.get('/projects/:projectId/permission', generalLimiter, UserController.checkPermission);

/**
 * 偏好設置
 */

// 獲取所有偏好設置
router.get('/preferences', generalLimiter, UserController.getPreferences);

// 批量更新偏好設置
router.put('/preferences', generalLimiter, userValidation.updatePreferences, UserController.updatePreferences);

// 獲取單個偏好設置
router.get('/preferences/:key', generalLimiter, UserController.getPreference);

// 設置單個偏好設置
router.put('/preferences/:key', generalLimiter, userValidation.setPreference, UserController.setPreference);

/**
 * 統計和活動
 */

// 獲取用戶統計數據
router.get('/stats', generalLimiter, UserController.getStats);

// 獲取用戶活動歷史
router.get('/activities', generalLimiter, UserController.getActivityHistory);

// 獲取用戶儀表板數據
router.get('/dashboard', generalLimiter, UserController.getDashboard);

export default router;