// backend/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';

export class AuthController {
  /**
   * 創建遊客用戶
   */
  static createGuest = async (req: Request, res: Response): Promise<void> => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.createGuest(ipAddress, userAgent);

      res.status(201).json({
        success: true,
        message: 'Guest user created successfully',
        data: {
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt
        }
      });
    } catch (error) {
      console.error('Create guest error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create guest user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 用戶登錄
   */
  static login = async (req: Request, res: Response): Promise<void> => {
    try {
      // 驗證輸入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.login(identifier, password, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt,
          isFirstLogin: result.isFirstLogin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // 根據錯誤類型返回不同的狀態碼
      const statusCode = error instanceof Error && error.message === 'Invalid credentials' ? 401 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
        code: statusCode === 401 ? 'INVALID_CREDENTIALS' : 'LOGIN_ERROR'
      });
    }
  };

  /**
   * 用戶註冊
   */
  static register = async (req: Request, res: Response): Promise<void> => {
    try {
      // 驗證輸入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { username, email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.register(username, email, password, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt,
          isFirstLogin: result.isFirstLogin
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      const statusCode = error instanceof Error && 
        error.message.includes('already exists') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
        code: statusCode === 409 ? 'USER_EXISTS' : 'REGISTRATION_ERROR'
      });
    }
  };

  /**
   * 遊客升級為註冊用戶
   */
  static upgradeGuest = async (req: Request, res: Response): Promise<void> => {
    try {
      // 驗證輸入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user || !req.user.is_guest) {
        res.status(400).json({
          success: false,
          message: 'Only guest users can be upgraded',
          code: 'NOT_GUEST_USER'
        });
        return;
      }

      const { username, email, password } = req.body;

      const result = await AuthService.upgradeGuest(req.user.id, username, email, password);

      res.json({
        success: true,
        message: 'Guest upgrade successful',
        data: {
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt,
          isFirstLogin: result.isFirstLogin
        }
      });
    } catch (error) {
      console.error('Guest upgrade error:', error);
      
      const statusCode = error instanceof Error && 
        error.message.includes('already exists') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Guest upgrade failed',
        code: statusCode === 409 ? 'USER_EXISTS' : 'UPGRADE_ERROR'
      });
    }
  };

  /**
   * 用戶登出
   */
  static logout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.session_id) {
        res.status(400).json({
          success: false,
          message: 'No active session found',
          code: 'NO_SESSION'
        });
        return;
      }

      await AuthService.logout(req.user.session_id);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 登出所有會話
   */
  static logoutAll = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      await AuthService.logoutAll(req.user.id);

      res.json({
        success: true,
        message: 'All sessions logged out successfully'
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout all sessions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取當前用戶信息
   */
  static getMe = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            is_guest: req.user.is_guest
          }
        }
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 驗證 Token
   */
  static validateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token is required',
          code: 'TOKEN_REQUIRED'
        });
        return;
      }

      const result = await AuthService.validateSession(token);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Validate token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  };

  /**
   * 刷新 Token
   */
  static refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'];
      const currentToken = authHeader && authHeader.split(' ')[1];

      if (!currentToken) {
        res.status(400).json({
          success: false,
          message: 'Current token is required',
          code: 'TOKEN_REQUIRED'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.refreshToken(currentToken, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: result.token,
          expiresAt: result.expiresAt
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Failed to refresh token',
        code: 'REFRESH_FAILED'
      });
    }
  };

  /**
   * 獲取用戶會話列表
   */
  static getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const sessions = await AuthService.getUserSessions(req.user.id);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            ip_address: session.ip_address,
            user_agent: session.user_agent,
            created_at: session.created_at,
            updated_at: session.updated_at,
            expires_at: session.expires_at,
            is_current: session.id === req.user?.session_id
          }))
        }
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 密碼重置請求
   */
  static requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  };

  /**
   * 更改密碼
   */
  static changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      if (req.user.is_guest) {
        res.status(400).json({
          success: false,
          message: 'Guest users cannot change password',
          code: 'GUEST_NOT_ALLOWED'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      const statusCode = error instanceof Error && 
        error.message === 'Current password is incorrect' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to change password',
        code: statusCode === 400 ? 'INCORRECT_PASSWORD' : 'CHANGE_PASSWORD_ERROR'
      });
    }
  };
}

/**
 * 驗證規則
 */
export const authValidation = {
  login: [
    body('identifier')
      .notEmpty()
      .withMessage('Email or username is required')
      .trim(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],

  register: [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],

  upgradeGuest: [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],

  passwordReset: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
  ]
};