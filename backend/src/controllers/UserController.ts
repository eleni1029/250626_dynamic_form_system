// backend/src/controllers/UserController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/UserService';

export class UserController {
  /**
   * 獲取用戶資料
   */
  static getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const profile = await UserService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: { profile }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 更新用戶資料
   */
  static updateProfile = async (req: Request, res: Response): Promise<void> => {
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

      const updateData = req.body;
      const updatedProfile = await UserService.updateUserProfile(req.user.id, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取用戶可訪問的專案列表
   */
  static getAccessibleProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const projects = await UserService.getUserAccessibleProjects(req.user.id, req.user.is_guest);

      res.json({
        success: true,
        data: { projects }
      });
    } catch (error) {
      console.error('Get accessible projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get accessible projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取用戶偏好設置
   */
  static getPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const preferences = await UserService.getUserPreferences(req.user.id);

      res.json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 更新用戶偏好設置
   */
  static updatePreferences = async (req: Request, res: Response): Promise<void> => {
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

      const { preferences } = req.body;
      const updatedPreferences = await UserService.updateUserPreferences(req.user.id, preferences);

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: updatedPreferences }
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取單個偏好設置
   */
  static getPreference = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const { key } = req.params;
      const preference = await UserService.getUserPreference(req.user.id, key);

      if (!preference) {
        res.status(404).json({
          success: false,
          message: 'Preference not found',
          code: 'PREFERENCE_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: { preference }
      });
    } catch (error) {
      console.error('Get preference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get preference',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 設置單個偏好設置
   */
  static setPreference = async (req: Request, res: Response): Promise<void> => {
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

      const { key } = req.params;
      const { value } = req.body;

      const preference = await UserService.setUserPreference(req.user.id, key, value);

      res.json({
        success: true,
        message: 'Preference set successfully',
        data: { preference }
      });
    } catch (error) {
      console.error('Set preference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set preference',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取用戶統計數據
   */
  static getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const stats = await UserService.getUserStats(req.user.id);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取用戶活動歷史
   */
  static getActivityHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

      const result = await UserService.getUserActivityHistory(req.user.id, page, limit, projectId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get activity history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取用戶儀表板數據
   */
  static getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const dashboard = await UserService.getUserDashboard(req.user.id, req.user.is_guest);

      res.json({
        success: true,
        data: { dashboard }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 檢查用戶權限
   */
  static checkPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const { projectId } = req.params;
      const requiredLevel = req.query.level as string || 'read';

      const hasPermission = await UserService.checkUserPermission(
        req.user.id,
        parseInt(projectId),
        req.user.is_guest,
        requiredLevel as 'read' | 'write' | 'admin'
      );

      res.json({
        success: true,
        data: { hasPermission }
      });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 刪除用戶帳號
   */
  static deleteAccount = async (req: Request, res: Response): Promise<void> => {
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

      const { password } = req.body;

      await UserService.deleteUserAccount(req.user.id, password, req.user.is_guest);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      
      const statusCode = error instanceof Error && 
        error.message === 'Invalid password' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete account',
        code: statusCode === 400 ? 'INVALID_PASSWORD' : 'DELETE_ACCOUNT_ERROR'
      });
    }
  };
}

/**
 * 用戶相關驗證規則
 */
export const userValidation = {
  updateProfile: [
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Valid URL is required for avatar')
  ],

  updatePreferences: [
    body('preferences')
      .isObject()
      .withMessage('Preferences must be an object')
      .custom((preferences) => {
        const allowedKeys = ['theme', 'language', 'default_project', 'notifications', 'timezone'];
        const keys = Object.keys(preferences);
        
        for (const key of keys) {
          if (!allowedKeys.includes(key)) {
            throw new Error(`Invalid preference key: ${key}`);
          }
        }
        
        return true;
      })
  ],

  setPreference: [
    body('value')
      .notEmpty()
      .withMessage('Preference value is required')
  ],

  deleteAccount: [
    body('password')
      .optional()
      .notEmpty()
      .withMessage('Password is required for registered users')
  ]
};