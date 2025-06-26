-- 動態表單系統數據庫結構

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    is_guest BOOLEAN DEFAULT FALSE,
    guest_uuid UUID UNIQUE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_email CHECK (email IS NULL OR email != ''),
    CONSTRAINT unique_username CHECK (username IS NULL OR username != '')
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_guest_uuid ON users(guest_uuid) WHERE guest_uuid IS NOT NULL;

-- 第三方認證表
CREATE TABLE IF NOT EXISTS user_oauth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- 專案表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config_path VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    guest_accessible BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name)
);

-- 用戶專案權限表
CREATE TABLE IF NOT EXISTS user_project_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) DEFAULT 'read',
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_id)
);

-- BMI 表單數據表
CREATE TABLE IF NOT EXISTS form_bmi_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    height DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    bmi_result DECIMAL(4,2) NOT NULL,
    bmi_category VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TDEE 表單數據表
CREATE TABLE IF NOT EXISTS form_tdee_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(10) NOT NULL,
    age INTEGER NOT NULL,
    height DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    activity_level VARCHAR(20) NOT NULL,
    bmr DECIMAL(6,2) NOT NULL,
    tdee DECIMAL(6,2) NOT NULL,
    goal VARCHAR(20),
    target_calories DECIMAL(6,2),
    body_fat_percentage DECIMAL(4,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系統配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建所有必要的索引
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON user_project_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_project_id ON user_project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_bmi_user_id ON form_bmi_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_bmi_created_at ON form_bmi_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_tdee_user_id ON form_tdee_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tdee_created_at ON form_tdee_submissions(created_at);

-- 插入初始專案數據
INSERT INTO projects (name, description, config_path, table_name, guest_accessible, sort_order) VALUES 
('BMI計算器', '輸入身高體重計算BMI值和健康分類', 'bmi-calculator.json', 'form_bmi_submissions', true, 1),
('TDEE計算器', '計算每日總消耗量和建議卡路里攝取', 'tdee-calculator.json', 'form_tdee_submissions', true, 2)
ON CONFLICT (table_name) DO NOTHING;

-- 插入系統配置
INSERT INTO system_config (config_key, config_value, description) VALUES 
('guest_cleanup_days', '90', '遊客資料保留天數'),
('max_file_upload_size', '10485760', '最大文件上傳大小（bytes）'),
('api_rate_limit', '{"requests": 100, "window": 900}', 'API 速率限制設置')
ON CONFLICT (config_key) DO NOTHING;

-- 創建更新觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為需要的表創建更新觸發器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oauth_updated_at ON user_oauth;
CREATE TRIGGER update_oauth_updated_at BEFORE UPDATE ON user_oauth FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permissions_updated_at ON user_project_permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON user_project_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bmi_updated_at ON form_bmi_submissions;
CREATE TRIGGER update_bmi_updated_at BEFORE UPDATE ON form_bmi_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tdee_updated_at ON form_tdee_submissions;
CREATE TRIGGER update_tdee_updated_at BEFORE UPDATE ON form_tdee_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_config_updated_at ON system_config;
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 階段一：數據庫增強腳本
-- 在現有 schema.sql 基礎上添加用戶會話和偏好設置表

-- 用戶會話表
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建會話表索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);

-- 用戶偏好設置表
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- 創建偏好設置表索引
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_key ON user_preferences(preference_key);
CREATE INDEX IF NOT EXISTS idx_preferences_value ON user_preferences USING GIN(preference_value);

-- 為新表添加更新觸發器
DROP TRIGGER IF EXISTS update_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入預設的用戶偏好設置
INSERT INTO user_preferences (user_id, preference_key, preference_value, description) 
SELECT 
    u.id,
    'theme',
    '"light"'::jsonb,
    '用戶界面主題設置'
FROM users u
WHERE u.is_active = true
ON CONFLICT (user_id, preference_key) DO NOTHING;

INSERT INTO user_preferences (user_id, preference_key, preference_value, description) 
SELECT 
    u.id,
    'language',
    '"zh-TW"'::jsonb,
    '用戶界面語言設置'
FROM users u  
WHERE u.is_active = true
ON CONFLICT (user_id, preference_key) DO NOTHING;

INSERT INTO user_preferences (user_id, preference_key, preference_value, description) 
SELECT 
    u.id,
    'default_project',
    'null'::jsonb,
    '用戶預設專案'
FROM users u
WHERE u.is_active = true  
ON CONFLICT (user_id, preference_key) DO NOTHING;

-- 清理過期會話的函數
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 刪除過期的會話
    WITH deleted_sessions AS (
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
        OR is_active = false
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_sessions;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 創建定期清理任務（需要 pg_cron 擴展，可選）
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- 添加一些實用的視圖
CREATE OR REPLACE VIEW user_active_sessions AS
SELECT 
    us.id,
    us.user_id,
    u.username,
    u.email,
    us.session_token,
    us.expires_at,
    us.ip_address,
    us.user_agent,
    us.created_at,
    us.updated_at
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = true 
AND us.expires_at > CURRENT_TIMESTAMP
AND u.is_active = true;

CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.is_guest,
    p.id as project_id,
    p.name as project_name,
    p.config_path,
    p.guest_accessible,
    COALESCE(upp.permission_level, 'none') as permission_level,
    CASE 
        WHEN p.guest_accessible = true THEN true
        WHEN upp.permission_level IS NOT NULL AND upp.is_active = true THEN true
        ELSE false
    END as has_access
FROM users u
CROSS JOIN projects p
LEFT JOIN user_project_permissions upp ON u.id = upp.user_id AND p.id = upp.project_id
WHERE u.is_active = true AND p.is_active = true;

-- 更新系統配置，添加會話相關設置
INSERT INTO system_config (config_key, config_value, description) VALUES 
('session_duration_hours', '168', '用戶會話持續時間（小時）'),
('max_sessions_per_user', '5', '每個用戶最大同時會話數'),
('auto_guest_cleanup_hours', '24', '自動清理未使用遊客賬戶時間（小時）')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description;