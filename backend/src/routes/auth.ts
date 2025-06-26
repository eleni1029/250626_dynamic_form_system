// backend/src/routes/auth.ts
import { Router } from 'express';
import { AuthController, authValidation } from '../controllers/AuthController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// 速率限制配置
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 每 15 分鐘最多 5 次嘗試
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

/**
 * 公開路由（不需要認證）
 */

// 創建遊客用戶
router.post('/guest', generalLimiter, AuthController.createGuest);

// 用戶登錄
router.post('/login', authLimiter, authValidation.login, AuthController.login);

// 用戶註冊
router.post('/register', authLimiter, authValidation.register, AuthController.register);

// Token 驗證（可選認證）
router.post('/validate', optionalAuth, AuthController.validateToken);

// 密碼重置請求
router.post('/password-reset', authLimiter, authValidation.passwordReset, AuthController.requestPasswordReset);

/**
 * 需要認證的路由
 */

// 獲取當前用戶信息
router.get('/me', authenticateToken, AuthController.getMe);

// 遊客升級為註冊用戶
router.post('/upgrade', authenticateToken, authValidation.upgradeGuest, AuthController.upgradeGuest);

// 用戶登出
router.post('/logout', authenticateToken, AuthController.logout);

// 登出所有會話
router.post('/logout-all', authenticateToken, AuthController.logoutAll);

// 刷新 Token
router.post('/refresh', generalLimiter, AuthController.refreshToken);

// 獲取用戶會話列表
router.get('/sessions', authenticateToken, AuthController.getSessions);

// 更改密碼
router.put('/password', authenticateToken, authValidation.changePassword, AuthController.changePassword);

export default router;