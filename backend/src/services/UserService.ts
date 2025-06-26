// backend/src/services/UserService.ts
import bcrypt from 'bcryptjs';
import { query, queryOne, queryMany } from '../utils/database';

interface UserProfile {
  id: number;
  username?: string;
  email?: string;
  is_guest: boolean;
  avatar_url?: string;
  created_at: Date;
  last_active_at: Date;
}

interface UserPreference {
  key: string;
  value: any;
  description?: string;
  updated_at: Date;
}

interface ProjectAccess {
  id: number;
  name: string;
  description?: string;
  config_path: string;
  permission_level: string;
  has_access: boolean;
  guest_accessible: boolean;
}

interface UserStats {
  total_submissions: number;
  projects_accessed: number;
  last_activity: Date;
  account_age_days: number;
  favorite_project?: string;
}

interface ActivityRecord {
  id: number;
  project_name: string;
  action: string;
  created_at: Date;
  details?: any;
}

interface DashboardData {
  user: UserProfile;
  recent_projects: ProjectAccess[];
  recent_activities: ActivityRecord[];
  stats: UserStats;
  quick_access: ProjectAccess[];
}

export class UserService {
  /**
   * 獲取用戶完整資料
   */
  static async getUserProfile(userId: number): Promise<UserProfile> {
    try {
      const user = await queryOne(
        `SELECT id, username, email, is_guest, avatar_url, created_at, updated_at, last_active_at
         FROM users 
         WHERE id = $1 AND is_active = true`,
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  /**
   * 更新用戶資料
   */
  static async updateUserProfile(
    userId: number, 
    updateData: Partial<{ username: string; email: string; avatar_url: string }>
  ): Promise<UserProfile> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // 構建動態更新查詢
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && ['username', 'email', 'avatar_url'].includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return await this.getUserProfile(userId);
      }

      // 檢查用戶名和郵箱是否已存在（如果要更新的話）
      if (updateData.username || updateData.email) {
        const conflictCheck = await queryOne(
          `SELECT id FROM users 
           WHERE (username = $1 OR email = $2) 
           AND id != $3 
           AND is_active = true`,
          [updateData.username || '', updateData.email || '', userId]
        );

        if (conflictCheck) {
          throw new Error('Username or email already exists');
        }
      }

      values.push(userId);
      const updatedUser = await queryOne(
        `UPDATE users 
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramCount} AND is_active = true
         RETURNING id, username, email, is_guest, avatar_url, created_at, updated_at, last_active_at`,
        values
      );

      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }

      return updatedUser;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶可訪問的專案
   */
  static async getUserAccessibleProjects(userId: number, isGuest: boolean): Promise<ProjectAccess[]> {
    try {
      const projects = await queryMany(
        `SELECT DISTINCT 
           p.id, 
           p.name, 
           p.description, 
           p.config_path,
           p.guest_accessible,
           COALESCE(upp.permission_level, 
             CASE WHEN p.guest_accessible = true THEN 'read' ELSE 'none' END
           ) as permission_level,
           CASE 
             WHEN p.guest_accessible = true THEN true
             WHEN upp.permission_level IS NOT NULL AND upp.is_active = true THEN true
             ELSE false
           END as has_access
         FROM projects p
         LEFT JOIN user_project_permissions upp ON p.id = upp.project_id AND upp.user_id = $1
         WHERE p.is_active = true
         AND (
           p.guest_accessible = true 
           OR (upp.is_active = true AND (upp.expires_at IS NULL OR upp.expires_at > CURRENT_TIMESTAMP))
         )
         ORDER BY 
           CASE WHEN upp.permission_level IS NOT NULL THEN 0 ELSE 1 END,
           p.sort_order, 
           p.name`,
        [userId]
      );

      return projects.filter(project => project.has_access);
    } catch (error) {
      console.error('Get user accessible projects error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶所有偏好設置
   */
  static async getUserPreferences(userId: number): Promise<Record<string, any>> {
    try {
      const preferences = await queryMany(
        `SELECT preference_key, preference_value, description, updated_at
         FROM user_preferences 
         WHERE user_id = $1
         ORDER BY preference_key`,
        [userId]
      );

      const result: Record<string, any> = {};
      preferences.forEach(pref => {
        result[pref.preference_key] = {
          value: pref.preference_value,
          description: pref.description,
          updated_at: pref.updated_at
        };
      });

      return result;
    } catch (error) {
      console.error('Get user preferences error:', error);
      throw error;
    }
  }

  /**
   * 批量更新用戶偏好設置
   */
  static async updateUserPreferences(
    userId: number, 
    preferences: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const allowedKeys = ['theme', 'language', 'default_project', 'notifications', 'timezone'];
      
      for (const [key, value] of Object.entries(preferences)) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid preference key: ${key}`);
        }

        await query(
          `INSERT INTO user_preferences (user_id, preference_key, preference_value)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (user_id, preference_key) 
           DO UPDATE SET 
             preference_value = EXCLUDED.preference_value,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, key, JSON.stringify(value)]
        );
      }

      return await this.getUserPreferences(userId);
    } catch (error) {
      console.error('Update user preferences error:', error);
      throw error;
    }
  }

  /**
   * 獲取單個偏好設置
   */
  static async getUserPreference(userId: number, key: string): Promise<UserPreference | null> {
    try {
      const preference = await queryOne(
        `SELECT preference_key as key, preference_value as value, description, updated_at
         FROM user_preferences 
         WHERE user_id = $1 AND preference_key = $2`,
        [userId, key]
      );

      return preference;
    } catch (error) {
      console.error('Get user preference error:', error);
      throw error;
    }
  }

  /**
   * 設置單個偏好設置
   */
  static async setUserPreference(userId: number, key: string, value: any): Promise<UserPreference> {
    try {
      const allowedKeys = ['theme', 'language', 'default_project', 'notifications', 'timezone'];
      
      if (!allowedKeys.includes(key)) {
        throw new Error(`Invalid preference key: ${key}`);
      }

      const preference = await queryOne(
        `INSERT INTO user_preferences (user_id, preference_key, preference_value)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, preference_key) 
         DO UPDATE SET 
           preference_value = EXCLUDED.preference_value,
           updated_at = CURRENT_TIMESTAMP
         RETURNING preference_key as key, preference_value as value, description, updated_at`,
        [userId, key, JSON.stringify(value)]
      );

      if (!preference) {
        throw new Error('Failed to set preference');
      }

      return preference;
    } catch (error) {
      console.error('Set user preference error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶統計數據
   */
  static async getUserStats(userId: number): Promise<UserStats> {
    try {
      // 獲取基本統計
      const basicStats = await queryOne(
        `SELECT 
           (SELECT COUNT(*) FROM form_bmi_submissions WHERE user_id = $1) +
           (SELECT COUNT(*) FROM form_tdee_submissions WHERE user_id = $1) as total_submissions,
           EXTRACT(DAY FROM CURRENT_TIMESTAMP - u.created_at) as account_age_days,
           u.last_active_at
         FROM users u 
         WHERE u.id = $1`,
        [userId]
      );

      // 獲取訪問過的專案數量
      const projectStats = await queryOne(
        `SELECT COUNT(DISTINCT project_id) as projects_accessed
         FROM (
           SELECT 1 as project_id FROM form_bmi_submissions WHERE user_id = $1
           UNION
           SELECT 2 as project_id FROM form_tdee_submissions WHERE user_id = $1
         ) as project_usage`,
        [userId]
      );

      // 獲取最常用的專案
      const favoriteProject = await queryOne(
        `SELECT p.name as project_name, COUNT(*) as usage_count
         FROM (
           SELECT 1 as project_id FROM form_bmi_submissions WHERE user_id = $1
           UNION ALL
           SELECT 2 as project_id FROM form_tdee_submissions WHERE user_id = $1
         ) as usage
         JOIN projects p ON usage.project_id = p.id
         GROUP BY p.id, p.name
         ORDER BY usage_count DESC
         LIMIT 1`,
        [userId]
      );

      return {
        total_submissions: parseInt(basicStats?.total_submissions || '0'),
        projects_accessed: parseInt(projectStats?.projects_accessed || '0'),
        last_activity: basicStats?.last_active_at || new Date(),
        account_age_days: parseInt(basicStats?.account_age_days || '0'),
        favorite_project: favoriteProject?.project_name || undefined
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶活動歷史
   */
  static async getUserActivityHistory(
    userId: number, 
    page: number = 1, 
    limit: number = 10,
    projectId?: number
  ): Promise<{ activities: ActivityRecord[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE user_id = $1';
      let params: any[] = [userId];
      
      if (projectId) {
        whereClause += ' AND project_id = $2';
        params.push(projectId);
      }

      // 構建活動歷史查詢（從多個表聯合）
      const activitiesQuery = `
        SELECT 
          activity_id as id,
          project_name,
          'BMI Calculation' as action,
          created_at,
          json_build_object(
            'height', height,
            'weight', weight,
            'bmi', bmi_result,
            'category', bmi_category
          ) as details
        FROM (
          SELECT 
            bmi.id as activity_id,
            p.name as project_name,
            bmi.created_at,
            bmi.height,
            bmi.weight,
            bmi.bmi_result,
            bmi.bmi_category,
            1 as project_id
          FROM form_bmi_submissions bmi
          JOIN projects p ON p.table_name = 'form_bmi_submissions'
          ${whereClause.replace('project_id', '1')}
          
          UNION ALL
          
          SELECT 
            tdee.id as activity_id,
            p.name as project_name,
            tdee.created_at,
            NULL as height,
            NULL as weight,
            NULL as bmi_result,
            NULL as bmi_category,
            2 as project_id
          FROM form_tdee_submissions tdee
          JOIN projects p ON p.table_name = 'form_tdee_submissions'
          ${whereClause.replace('project_id', '2')}
        ) as combined_activities
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const activities = await queryMany(activitiesQuery, [...params, limit, offset]);

      // 獲取總數
      const totalQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT id FROM form_bmi_submissions ${whereClause.replace('project_id', '1')}
          UNION ALL
          SELECT id FROM form_tdee_submissions ${whereClause.replace('project_id', '2')}
        ) as total_activities
      `;

      const totalResult = await queryOne(totalQuery, params);
      const total = parseInt(totalResult?.total || '0');

      return {
        activities,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get user activity history error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶儀表板數據
   */
  static async getUserDashboard(userId: number, isGuest: boolean): Promise<DashboardData> {
    try {
      // 獲取用戶資料
      const user = await this.getUserProfile(userId);

      // 獲取可訪問的專案
      const allProjects = await this.getUserAccessibleProjects(userId, isGuest);

      // 獲取最近活動
      const recentActivities = await this.getUserActivityHistory(userId, 1, 5);

      // 獲取統計數據
      const stats = await this.getUserStats(userId);

      // 獲取快速訪問專案（最常用的前3個）
      const quickAccess = allProjects.slice(0, 3);

      return {
        user,
        recent_projects: allProjects,
        recent_activities: recentActivities.activities,
        stats,
        quick_access: quickAccess
      };
    } catch (error) {
      console.error('Get user dashboard error:', error);
      throw error;
    }
  }

  /**
   * 檢查用戶權限
   */
  static async checkUserPermission(
    userId: number,
    projectId: number,
    isGuest: boolean,
    requiredLevel: 'read' | 'write' | 'admin' = 'read'
  ): Promise<boolean> {
    try {
      // 檢查專案是否存在且啟用
      const project = await queryOne(
        'SELECT id, guest_accessible FROM projects WHERE id = $1 AND is_active = true',
        [projectId]
      );

      if (!project) {
        return false;
      }

      // 如果是遊客且專案允許遊客訪問
      if (isGuest && project.guest_accessible && requiredLevel === 'read') {
        return true;
      }

      if (isGuest) {
        return false;
      }

      // 檢查用戶權限
      const permission = await queryOne(
        `SELECT permission_level 
         FROM user_project_permissions 
         WHERE user_id = $1 
         AND project_id = $2 
         AND is_active = true 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [userId, projectId]
      );

      if (!permission) {
        return false;
      }

      // 檢查權限等級
      const permissionLevels = ['read', 'write', 'admin'];
      const userLevel = permissionLevels.indexOf(permission.permission_level);
      const requiredLevelIndex = permissionLevels.indexOf(requiredLevel);

      return userLevel >= requiredLevelIndex;
    } catch (error) {
      console.error('Check user permission error:', error);
      return false;
    }
  }

  /**
   * 刪除用戶帳號
   */
  static async deleteUserAccount(userId: number, password?: string, isGuest: boolean = false): Promise<void> {
    try {
      if (!isGuest && password) {
        // 驗證密碼（註冊用戶）
        const user = await queryOne(
          'SELECT password_hash FROM users WHERE id = $1',
          [userId]
        );

        if (!user) {
          throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }
      }

      // 軟刪除用戶（設置為非活躍）
      await query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      // 使所有會話失效
      await query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );

      // 刪除用戶權限
      await query(
        'UPDATE user_project_permissions SET is_active = false WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Delete user account error:', error);
      throw error;
    }
  }

  /**
   * 更新用戶最後活動時間
   */
  static async updateLastActive(userId: number): Promise<void> {
    try {
      await query(
        'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Update last active error:', error);
      // 不拋出錯誤，因為這不是關鍵功能
    }
  }

  /**
   * 獲取用戶權限詳情
   */
  static async getUserPermissions(userId: number): Promise<any[]> {
    try {
      const permissions = await queryMany(
        `SELECT 
           upp.project_id,
           p.name as project_name,
           p.description as project_description,
           upp.permission_level,
           upp.granted_at,
           upp.expires_at,
           upp.is_active,
           gu.username as granted_by_username
         FROM user_project_permissions upp
         JOIN projects p ON upp.project_id = p.id
         LEFT JOIN users gu ON upp.granted_by = gu.id
         WHERE upp.user_id = $1
         ORDER BY upp.granted_at DESC`,
        [userId]
      );

      return permissions;
    } catch (error) {
      console.error('Get user permissions error:', error);
      throw error;
    }
  }

  /**
   * 搜索用戶可訪問的專案
   */
  static async searchUserProjects(
    userId: number,
    isGuest: boolean,
    searchTerm: string,
    limit: number = 10
  ): Promise<ProjectAccess[]> {
    try {
      const projects = await queryMany(
        `SELECT DISTINCT 
           p.id, 
           p.name, 
           p.description, 
           p.config_path,
           p.guest_accessible,
           COALESCE(upp.permission_level, 
             CASE WHEN p.guest_accessible = true THEN 'read' ELSE 'none' END
           ) as permission_level,
           CASE 
             WHEN p.guest_accessible = true THEN true
             WHEN upp.permission_level IS NOT NULL AND upp.is_active = true THEN true
             ELSE false
           END as has_access
         FROM projects p
         LEFT JOIN user_project_permissions upp ON p.id = upp.project_id AND upp.user_id = $1
         WHERE p.is_active = true
         AND (
           p.guest_accessible = true 
           OR (upp.is_active = true AND (upp.expires_at IS NULL OR upp.expires_at > CURRENT_TIMESTAMP))
         )
         AND (
           p.name ILIKE $2 
           OR p.description ILIKE $2
         )
         ORDER BY 
           CASE WHEN upp.permission_level IS NOT NULL THEN 0 ELSE 1 END,
           p.sort_order, 
           p.name
         LIMIT $3`,
        [userId, `%${searchTerm}%`, limit]
      );

      return projects.filter(project => project.has_access);
    } catch (error) {
      console.error('Search user projects error:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶偏好的預設專案
   */
  static async getUserDefaultProject(userId: number): Promise<ProjectAccess | null> {
    try {
      // 獲取用戶偏好的預設專案
      const preference = await queryOne(
        `SELECT preference_value FROM user_preferences 
         WHERE user_id = $1 AND preference_key = 'default_project'`,
        [userId]
      );

      if (!preference || preference.preference_value === null) {
        return null;
      }

      const defaultProjectId = JSON.parse(preference.preference_value);
      
      if (!defaultProjectId) {
        return null;
      }

      // 獲取專案詳情並檢查權限
      const project = await queryOne(
        `SELECT DISTINCT 
           p.id, 
           p.name, 
           p.description, 
           p.config_path,
           p.guest_accessible,
           COALESCE(upp.permission_level, 
             CASE WHEN p.guest_accessible = true THEN 'read' ELSE 'none' END
           ) as permission_level,
           CASE 
             WHEN p.guest_accessible = true THEN true
             WHEN upp.permission_level IS NOT NULL AND upp.is_active = true THEN true
             ELSE false
           END as has_access
         FROM projects p
         LEFT JOIN user_project_permissions upp ON p.id = upp.project_id AND upp.user_id = $1
         WHERE p.id = $2 AND p.is_active = true`,
        [userId, defaultProjectId]
      );

      return project && project.has_access ? project : null;
    } catch (error) {
      console.error('Get user default project error:', error);
      return null;
    }
  }
}