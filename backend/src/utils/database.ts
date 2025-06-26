import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dynamic_form_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await query(text, params);
  return result.rows;
}

export async function testConnection(): Promise<void> {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connected successfully');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export { pool };
