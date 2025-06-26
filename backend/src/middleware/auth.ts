// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../utils/database';

// 擴展 Request 類型以包含用戶信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username?: string;
        email?: string;
        is_guest: boolean;
        session_id?: number;
      };
    }
  }
}

interface JWTPayload {
  userId: number;
  sessionId: number;
  isGuest: boolean;
  iat: number;
  exp: number;
}

/**
 * JWT 驗證中間件
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // 驗證 JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JWTPayload;

    // 檢查會話是否有效
    const session = await queryOne(
      `SELECT us.*, u.username, u.email, u.is_guest, u.is_active
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.id = $1 
       AND us.session_token = $2 
       AND us.is_active = true 
       AND us.expires_at > CURRENT_TIMESTAMP
       AND u.is_active = true`,
      [decoded.sessionId, token]
    );

    if (!session) {
      res.status(401).json({
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      return;
    }

    // 更新會話最後活動時間
    await queryOne(
      'UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

    // 設置用戶信息到請求對象
    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      is_guest: session.is_guest,
      session_id: session.id
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      return;
    }

    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * 可選認證中間件（允許遊客訪問）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 沒有 token，繼續處理（遊客模式）
      next();
      return;
    }

    // 如果有 token，嘗試驗證
    await authenticateToken(req, res, next);
  } catch (error) {
    // 認證失敗，但允許繼續（遊客模式）
    next();
  }
};

/**
 * 權限檢查中間件
 */
export const requirePermission = (
  projectId?: number,
  requiredLevel: 'read' | 'write' | 'admin' = 'read'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // 如果沒有指定專案 ID，從路由參數或查詢參數獲取
      const targetProjectId = projectId || 
        parseInt(req.params.projectId) || 
        parseInt(req.query.projectId as string);

      if (!targetProjectId) {
        res.status(400).json({
          error: 'Project ID required',
          code: 'PROJECT_ID_REQUIRED'
        });
        return;
      }

      // 檢查專案是否存在且啟用
      const project = await queryOne(
        'SELECT id, name, guest_accessible FROM projects WHERE id = $1 AND is_active = true',
        [targetProjectId]
      );

      if (!project) {
        res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
        return;
      }

      // 如果是遊客且專案允許遊客訪問
      if (req.user.is_guest && project.guest_accessible) {
        next();
        return;
      }

      // 檢查用戶權限
      const permission = await queryOne(
        `SELECT permission_level 
         FROM user_project_permissions 
         WHERE user_id = $1 
         AND project_id = $2 
         AND is_active = true 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [req.user.id, targetProjectId]
      );

      if (!permission) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // 檢查權限等級
      const permissionLevels = ['read', 'write', 'admin'];
      const userLevel = permissionLevels.indexOf(permission.permission_level);
      const requiredLevelIndex = permissionLevels.indexOf(requiredLevel);

      if (userLevel < requiredLevelIndex) {
        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredLevel,
          current: permission.permission_level
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * 管理員權限檢查中間件
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (req.user.is_guest) {
      res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
      return;
    }

    // 檢查用戶是否有任何專案的管理員權限
    const adminPermission = await queryOne(
      `SELECT COUNT(*) as admin_count
       FROM user_project_permissions 
       WHERE user_id = $1 
       AND permission_level = 'admin' 
       AND is_active = true 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [req.user.id]
    );

    if (!adminPermission || parseInt(adminPermission.admin_count) === 0) {
      res.status(403).json({
        error: 'Admin privileges required',
        code: 'ADMIN_PRIVILEGES_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Admin check failed',
      code: 'ADMIN_CHECK_ERROR'
    });
  }
};

/**
 * 會話限制中間件
 */
export const sessionLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next();
      return;
    }

    // 獲取最大會話數配置
    const config = await queryOne(
      "SELECT config_value FROM system_config WHERE config_key = 'max_sessions_per_user'"
    );

    const maxSessions = config ? parseInt(config.config_value) : 5;

    // 檢查當前用戶的活躍會話數
    const sessionCount = await queryOne(
      `SELECT COUNT(*) as session_count
       FROM user_sessions 
       WHERE user_id = $1 
       AND is_active = true 
       AND expires_at > CURRENT_TIMESTAMP`,
      [req.user.id]
    );

    if (parseInt(sessionCount.session_count) >= maxSessions) {
      // 清理最舊的會話
      await queryOne(
        `UPDATE user_sessions 
         SET is_active = false 
         WHERE user_id = $1 
         AND id IN (
           SELECT id FROM user_sessions 
           WHERE user_id = $1 
           AND is_active = true 
           ORDER BY updated_at ASC 
           LIMIT 1
         )`,
        [req.user.id]
      );
    }

    next();
  } catch (error) {
    console.error('Session limiter error:', error);
    next(); // 不阻斷請求，只記錄錯誤
  }
};