// backend/src/services/AuthService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryMany } from '../utils/database';

interface CreateGuestResult {
  user: {
    id: number;
    guest_uuid: string;
    is_guest: boolean;
    created_at: Date;
  };
  token: string;
  expiresAt: Date;
}

interface LoginResult {
  user: {
    id: number;
    username?: string;
    email?: string;
    is_guest: boolean;
    avatar_url?: string;
  };
  token: string;
  expiresAt: Date;
  isFirstLogin?: boolean;
}

interface SessionInfo {
  id: number;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
  private static readonly DEFAULT_SESSION_HOURS = 168; // 7 days

  /**
   * 創建遊客用戶
   */
  static async createGuest(ipAddress?: string, userAgent?: string): Promise<CreateGuestResult> {
    try {
      const guestUuid = uuidv4();
      
      // 創建遊客用戶
      const user = await queryOne(
        `INSERT INTO users (guest_uuid, is_guest, last_active_at)
         VALUES ($1, true, CURRENT_TIMESTAMP)
         RETURNING id, guest_uuid, is_guest, created_at`,
        [guestUuid]
      );

      if (!user) {
        throw new Error('Failed to create guest user');
      }

      // 創建會話
      const { token, expiresAt, sessionId } = await this.createSession(
        user.id,
        ipAddress,
        userAgent
      );

      return {
        user: {
          id: user.id,
          guest_uuid: user.guest_uuid,
          is_guest: user.is_guest,
          created_at: user.created_at
        },
        token,
        expiresAt
      };
    } catch (error) {
      console.error('Error creating guest user:', error);
      throw new Error('Failed to create guest user');
    }
  }

  /**
   * 用戶登錄（郵箱/用戶名 + 密碼）
   */
  static async login(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // 查找用戶（支援郵箱或用戶名）
      const user = await queryOne(
        `SELECT id, username, email, password_hash, is_guest, avatar_url, created_at
         FROM users 
         WHERE (email = $1 OR username = $1) 
         AND is_active = true 
         AND is_guest = false`,
        [identifier]
      );

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // 驗證密碼
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // 更新最後活動時間
      await query(
        'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // 創建會話
      const { token, expiresAt } = await this.createSession(
        user.id,
        ipAddress,
        userAgent
      );

      // 檢查是否為首次登錄
      const loginCount = await queryOne(
        'SELECT COUNT(*) as login_count FROM user_sessions WHERE user_id = $1',
        [user.id]
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_guest: user.is_guest,
          avatar_url: user.avatar_url
        },
        token,
        expiresAt,
        isFirstLogin: parseInt(loginCount.login_count) === 1
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * 用戶註冊
   */
  static async register(
    username: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // 檢查用戶名和郵箱是否已存在
      const existingUser = await queryOne(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // 加密密碼
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 創建用戶
      const user = await queryOne(
        `INSERT INTO users (username, email, password_hash, is_guest, last_active_at)
         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
         RETURNING id, username, email, is_guest, avatar_url, created_at`,
        [username, email, passwordHash]
      );

      if (!user) {
        throw new Error('Failed to create user');
      }

      // 創建預設偏好設置
      await this.createDefaultPreferences(user.id);

      // 創建會話
      const { token, expiresAt } = await this.createSession(
        user.id,
        ipAddress,
        userAgent
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_guest: user.is_guest,
          avatar_url: user.avatar_url
        },
        token,
        expiresAt,
        isFirstLogin: true
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * 遊客升級為註冊用戶
   */
  static async upgradeGuest(
    guestId: number,
    username: string,
    email: string,
    password: string
  ): Promise<LoginResult> {
    try {
      // 檢查遊客是否存在
      const guest = await queryOne(
        'SELECT id, guest_uuid FROM users WHERE id = $1 AND is_guest = true AND is_active = true',
        [guestId]
      );

      if (!guest) {
        throw new Error('Guest user not found');
      }

      // 檢查用戶名和郵箱是否已存在
      const existingUser = await queryOne(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [email, username, guestId]
      );

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // 加密密碼
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 升級遊客為註冊用戶
      const user = await queryOne(
        `UPDATE users 
         SET username = $1, email = $2, password_hash = $3, is_guest = false, 
             guest_uuid = NULL, last_active_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, username, email, is_guest, avatar_url`,
        [username, email, passwordHash, guestId]
      );

      if (!user) {
        throw new Error('Failed to upgrade guest user');
      }

      // 創建預設偏好設置
      await this.createDefaultPreferences(user.id);

      // 使現有會話失效，強制重新登錄
      await query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [user.id]
      );

      // 創建新會話
      const { token, expiresAt } = await this.createSession(user.id);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_guest: user.is_guest,
          avatar_url: user.avatar_url
        },
        token,
        expiresAt,
        isFirstLogin: true
      };
    } catch (error) {
      console.error('Guest upgrade error:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  static async logout(sessionId: number): Promise<void> {
    try {
      await query(
        'UPDATE user_sessions SET is_active = false WHERE id = $1',
        [sessionId]
      );
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * 登出所有會話
   */
  static async logoutAll(userId: number): Promise<void> {
    try {
      await query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Logout all error:', error);
      throw new Error('Failed to logout all sessions');
    }
  }

  /**
   * 驗證會話
   */
  static async validateSession(token: string): Promise<any> {
    try {
      // 驗證 JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      // 檢查會話是否有效
      const session = await queryOne(
        `SELECT us.*, u.username, u.email, u.is_guest, u.avatar_url
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
        throw new Error('Invalid session');
      }

      return {
        user: {
          id: session.user_id,
          username: session.username,
          email: session.email,
          is_guest: session.is_guest,
          avatar_url: session.avatar_url
        },
        session: {
          id: session.id,
          expires_at: session.expires_at
        }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      throw new Error('Invalid session');
    }
  }

  /**
   * 獲取用戶的所有活躍會話
   */
  static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    try {
      const sessions = await queryMany(
        `SELECT id, ip_address, user_agent, created_at, updated_at, expires_at
         FROM user_sessions
         WHERE user_id = $1 
         AND is_active = true 
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY updated_at DESC`,
        [userId]
      );

      return sessions;
    } catch (error) {
      console.error('Get user sessions error:', error);
      throw new Error('Failed to get user sessions');
    }
  }

  /**
   * 刷新 Token
   */
  static async refreshToken(
    currentToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    try {
      const sessionInfo = await this.validateSession(currentToken);
      
      // 使舊會話失效
      await this.logout(sessionInfo.session.id);

      // 創建新會話
      const { token, expiresAt } = await this.createSession(
        sessionInfo.user.id,
        ipAddress,
        userAgent
      );

      return { token, expiresAt };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * 創建會話（私有方法）
   */
  private static async createSession(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date; sessionId: number }> {
    try {
      // 獲取會話持續時間配置
      const config = await queryOne(
        "SELECT config_value FROM system_config WHERE config_key = 'session_duration_hours'"
      );

      const sessionHours = config ? parseInt(config.config_value) : this.DEFAULT_SESSION_HOURS;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + sessionHours);

      // 生成臨時會話記錄
      const tempSession = await queryOne(
        `INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
         VALUES ($1, 'temp', $2, $3, $4)
         RETURNING id`,
        [userId, expiresAt, ipAddress, userAgent]
      );

      if (!tempSession) {
        throw new Error('Failed to create session');
      }

      // 獲取用戶信息以確定是否為遊客
      const user = await queryOne(
        'SELECT is_guest FROM users WHERE id = $1',
        [userId]
      );

      // 生成 JWT
      const payload = {
        userId,
        sessionId: tempSession.id,
        isGuest: user ? user.is_guest : false
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: `${sessionHours}h`
      });

      // 更新會話記錄，保存真實的 token
      await query(
        'UPDATE user_sessions SET session_token = $1 WHERE id = $2',
        [token, tempSession.id]
      );

      return {
        token,
        expiresAt,
        sessionId: tempSession.id
      };
    } catch (error) {
      console.error('Create session error:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * 創建用戶預設偏好設置（私有方法）
   */
  private static async createDefaultPreferences(userId: number): Promise<void> {
    try {
      const defaultPreferences = [
        { key: 'theme', value: '"light"', description: '用戶界面主題設置' },
        { key: 'language', value: '"zh-TW"', description: '用戶界面語言設置' },
        { key: 'default_project', value: 'null', description: '用戶預設專案' },
        { key: 'notifications', value: '{"email": true, "browser": true}', description: '通知設置' },
        { key: 'timezone', value: '"Asia/Taipei"', description: '時區設置' }
      ];

      for (const pref of defaultPreferences) {
        await query(
          `INSERT INTO user_preferences (user_id, preference_key, preference_value, description)
           VALUES ($1, $2, $3::jsonb, $4)
           ON CONFLICT (user_id, preference_key) DO NOTHING`,
          [userId, pref.key, pref.value, pref.description]
        );
      }
    } catch (error) {
      console.error('Create default preferences error:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 清理過期會話
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await queryOne('SELECT cleanup_expired_sessions() as deleted_count');
      return result ? parseInt(result.deleted_count) : 0;
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      return 0;
    }
  }

  /**
   * 重置密碼（發送重置郵件的前置檢查）
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await queryOne(
        'SELECT id, username FROM users WHERE email = $1 AND is_guest = false AND is_active = true',
        [email]
      );

      if (!user) {
        // 為了安全考慮，不透露用戶是否存在
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent'
        };
      }

      // TODO: 實現郵件發送邏輯
      // 這裡應該生成重置 token 並發送郵件

      return {
        success: true,
        message: 'Password reset link has been sent to your email'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * 更改密碼
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // 獲取用戶當前密碼
      const user = await queryOne(
        'SELECT password_hash FROM users WHERE id = $1 AND is_guest = false',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // 驗證當前密碼
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // 加密新密碼
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // 更新密碼
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // 登出所有其他會話（強制重新登錄）
      await query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}