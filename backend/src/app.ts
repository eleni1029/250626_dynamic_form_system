// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './utils/database';

// 導入路由
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// 中間件設置
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 信任代理（用於獲取真實 IP）
app.set('trust proxy', 1);

// 基礎路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'Dynamic Form System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      database: '/api/db/test'
    }
  });
});

// API 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// 測試數據庫連接
app.get('/api/db/test', async (req, res) => {
  try {
    await testConnection();
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed', 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 全局錯誤處理中間件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 啟動伺服器
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database Test: http://localhost:${PORT}/api/db/test`);
  console.log(`🔐 Auth Endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`👤 User Endpoints: http://localhost:${PORT}/api/users`);
  
  // 測試數據庫連接
  try {
    await testConnection();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ 初始數據庫連接失敗，請檢查 Docker 服務是否正常運行');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  }
});

export default app;