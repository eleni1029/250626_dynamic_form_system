// backend/src/controllers/forms/BMIController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { BMIService } from '../../services/forms/BMIService';

export class BMIController {
  /**
   * 提交 BMI 表單
   */
  static submit = async (req: Request, res: Response): Promise<void> => {
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

      const { height, weight, notes } = req.body;

      const result = await BMIService.calculateAndSave(req.user.id, {
        height,
        weight,
        notes
      });

      res.json({
        success: true,
        message: 'BMI calculation completed successfully',
        data: { result }
      });
    } catch (error) {
      console.error('BMI submit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit BMI calculation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 快速計算 BMI（不保存）
   */
  static quickCalculate = async (req: Request, res: Response): Promise<void> => {
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

      const { height, weight } = req.body;

      const result = BMIService.calculate(height, weight);

      res.json({
        success: true,
        message: 'BMI calculation completed',
        data: { result }
      });
    } catch (error) {
      console.error('BMI quick calculate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate BMI',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取 BMI 歷史記錄
   */
  static getHistory = async (req: Request, res: Response): Promise<void> => {
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

      const history = await BMIService.getHistory(req.user.id, page, limit);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get BMI history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get BMI history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取 BMI 統計
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

      const stats = await BMIService.getStats(req.user.id);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get BMI stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get BMI statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取 BMI 趨勢數據
   */
  static getTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const trends = await BMIService.getTrends(req.user.id, days);

      res.json({
        success: true,
        data: { 
          trends,
          period: days
        }
      });
    } catch (error) {
      console.error('Get BMI trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get BMI trends',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 刪除 BMI 記錄
   */
  static deleteRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const { recordId } = req.params;
      const success = await BMIService.deleteRecord(req.user.id, parseInt(recordId));

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Record not found or access denied',
          code: 'RECORD_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        message: 'BMI record deleted successfully'
      });
    } catch (error) {
      console.error('Delete BMI record error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete BMI record',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 匯出 BMI 數據
   */
  static exportData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const format = req.query.format as string || 'json';
      const data = await BMIService.exportUserData(req.user.id, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="bmi_data.csv"');
        res.send(data);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="bmi_data.json"');
        res.json(data);
      }
    } catch (error) {
      console.error('Export BMI data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export BMI data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * 獲取 BMI 建議
   */
  static getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { height, weight } = req.query;

      if (!height || !weight) {
        res.status(400).json({
          success: false,
          message: 'Height and weight are required',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      const recommendations = BMIService.getRecommendations(
        parseFloat(height as string),
        parseFloat(weight as string)
      );

      res.json({
        success: true,
        data: { recommendations }
      });
    } catch (error) {
      console.error('Get BMI recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get BMI recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}