// backend/src/services/forms/BMIService.ts
import { query, queryOne, queryMany } from '../../utils/database';

interface BMIData {
  height: number;
  weight: number;
  notes?: string;
}

interface BMIResult {
  height: number;
  weight: number;
  bmi: number;
  category: string;
  healthRisk: string;
  recommendations: string[];
  idealWeightRange: { min: number; max: number };
  weightChange: { toNormal: number; type: string };
}

interface BMIRecord {
  id: number;
  height: number;
  weight: number;
  bmi_result: number;
  bmi_category: string;
  notes?: string;
  created_at: Date;
}

export class BMIService {
  /**
   * 計算 BMI 並返回詳細結果
   */
  static calculate(height: number, weight: number): BMIResult {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    
    let category = '';
    let healthRisk = '';
    let recommendations: string[] = [];
    
    if (bmi < 18.5) {
      category = '體重過輕';
      healthRisk = '營養不良、骨質疏鬆、免疫力降低的風險';
      recommendations = [
        '增加熱量攝取，選擇營養豐富的食物',
        '進行適度的重量訓練增加肌肉量',
        '諮詢營養師制定增重計劃',
        '定期健康檢查，排除潛在疾病'
      ];
    } else if (bmi < 24) {
      category = '正常範圍';
      healthRisk = '健康風險最低';
      recommendations = [
        '維持目前的健康生活方式',
        '均衡飲食，定期運動',
        '保持良好的睡眠品質',
        '定期健康檢查'
      ];
    } else if (bmi < 27) {
      category = '過重';
      healthRisk = '糖尿病、心血管疾病風險略微增加';
      recommendations = [
        '減少每日熱量攝取約300-500卡',
        '增加有氧運動頻率',
        '多攝取蔬菜水果，減少高熱量食物',
        '控制份量，規律用餐'
      ];
    } else if (bmi < 30) {
      category = '輕度肥胖';
      healthRisk = '糖尿病、高血壓、心臟病風險中等';
      recommendations = [
        '建議諮詢醫師或營養師',
        '制定結構化的減重計劃',
        '每週至少150分鐘中等強度運動',
        '記錄飲食日誌，監控體重變化'
      ];
    } else if (bmi < 35) {
      category = '中度肥胖';
      healthRisk = '嚴重健康風險，多種慢性疾病高風險';
      recommendations = [
        '強烈建議尋求專業醫療協助',
        '考慮專業減重計劃',
        '可能需要藥物或手術治療',
        '密切監控血壓、血糖等指標'
      ];
    } else {
      category = '重度肥胖';
      healthRisk = '極高健康風險，嚴重威脅生命';
      recommendations = [
        '立即尋求專業醫療治療',
        '考慮減重手術等積極治療',
        '需要多學科團隊協助',
        '密切醫療監督下進行減重'
      ];
    }

    // 計算理想體重範圍 (BMI 18.5-24)
    const idealWeightRange = {
      min: Math.round(18.5 * heightInMeters * heightInMeters * 10) / 10,
      max: Math.round(24 * heightInMeters * heightInMeters * 10) / 10
    };

    // 計算達到正常體重需要的體重變化
    let weightChange = { toNormal: 0, type: '' };
    if (bmi < 18.5) {
      weightChange.toNormal = Math.round((idealWeightRange.min - weight) * 10) / 10;
      weightChange.type = '增重';
    } else if (bmi > 24) {
      weightChange.toNormal = Math.round((weight - idealWeightRange.max) * 10) / 10;
      weightChange.type = '減重';
    }

    return {
      height,
      weight,
      bmi: Math.round(bmi * 100) / 100,
      category,
      healthRisk,
      recommendations,
      idealWeightRange,
      weightChange
    };
  }

  /**
   * 計算並保存 BMI
   */
  static async calculateAndSave(userId: number, data: BMIData): Promise<BMIResult> {
    try {
      const result = this.calculate(data.height, data.weight);
      
      // 保存到數據庫
      await queryOne(
        `INSERT INTO form_bmi_submissions (user_id, height, weight, bmi_result, bmi_category, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, data.height, data.weight, result.bmi, result.category, data.notes]
      );

      // 更新用戶最後活動時間
      await query(
        'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      return result;
    } catch (error) {
      console.error('Calculate and save BMI error:', error);
      throw new Error('Failed to calculate and save BMI');
    }
  }

  /**
   * 獲取用戶 BMI 歷史記錄
   */
  static async getHistory(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: BMIRecord[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;

      const data = await queryMany(
        `SELECT id, height, weight, bmi_result, bmi_category, notes, created_at
         FROM form_bmi_submissions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const totalResult = await queryOne(
        'SELECT COUNT(*) as total FROM form_bmi_submissions WHERE user_id = $1',
        [userId]
      );

      const total = parseInt(totalResult?.total || '0');

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get BMI history error:', error);
      throw new Error('Failed to get BMI history');
    }
  }

  /**
   * 獲取用戶 BMI 統計
   */
  static async getStats(userId: number): Promise<any> {
    try {
      const stats = await queryOne(
        `SELECT 
           COUNT(*) as total_submissions,
           AVG(bmi_result) as avg_bmi,
           MIN(bmi_result) as min_bmi,
           MAX(bmi_result) as max_bmi,
           AVG(weight) as avg_weight,
           MIN(weight) as min_weight,
           MAX(weight) as max_weight,
           MIN(created_at) as first_submission,
           MAX(created_at) as latest_submission
         FROM form_bmi_submissions 
         WHERE user_id = $1`,
        [userId]
      );

      if (!stats || parseInt(stats.total_submissions) === 0) {
        return {
          total_submissions: 0,
          message: 'No BMI submissions found'
        };
      }

      // 格式化統計數據
      return {
        total_submissions: parseInt(stats.total_submissions),
        avg_bmi: Math.round(parseFloat(stats.avg_bmi) * 100) / 100,
        min_bmi: Math.round(parseFloat(stats.min_bmi) * 100) / 100,
        max_bmi: Math.round(parseFloat(stats.max_bmi) * 100) / 100,
        avg_weight: Math.round(parseFloat(stats.avg_weight) * 10) / 10,
        min_weight: Math.round(parseFloat(stats.min_weight) * 10) / 10,
        max_weight: Math.round(parseFloat(stats.max_weight) * 10) / 10,
        first_submission: stats.first_submission,
        latest_submission: stats.latest_submission
      };
    } catch (error) {
      console.error('Get BMI stats error:', error);
      throw new Error('Failed to get BMI statistics');
    }
  }

  /**
   * 獲取 BMI 趨勢數據
   */
  static async getTrends(userId: number, days: number = 30): Promise<any[]> {
    try {
      const trends = await queryMany(
        `SELECT 
           bmi_result as bmi,
           weight,
           bmi_category as category,
           created_at as date
         FROM form_bmi_submissions 
         WHERE user_id = $1 
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
         ORDER BY created_at ASC`,
        [userId]
      );

      return trends.map(record => ({
        date: record.date,
        bmi: parseFloat(record.bmi),
        weight: parseFloat(record.weight),
        category: record.category
      }));
    } catch (error) {
      console.error('Get BMI trends error:', error);
      throw new Error('Failed to get BMI trends');
    }
  }

  /**
   * 刪除 BMI 記錄
   */
  static async deleteRecord(userId: number, recordId: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM form_bmi_submissions WHERE id = $1 AND user_id = $2',
        [recordId, userId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Delete BMI record error:', error);
      throw new Error('Failed to delete BMI record');
    }
  }

  /**
   * 匯出用戶 BMI 數據
   */
  static async exportUserData(userId: number, format: string = 'json'): Promise<any> {
    try {
      const allData = await queryMany(
        `SELECT height, weight, bmi_result, bmi_category, notes, created_at
         FROM form_bmi_submissions 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      if (format === 'csv') {
        let csvContent = 'Height (cm),Weight (kg),BMI,Category,Notes,Date\n';
        
        allData.forEach(record => {
          const row = [
            record.height,
            record.weight,
            record.bmi_result,
            `"${record.bmi_category}"`,
            `"${record.notes || ''}"`,
            record.created_at.toISOString().split('T')[0]
          ].join(',');
          csvContent += row + '\n';
        });

        return csvContent;
      } else {
        return {
          export_date: new Date().toISOString(),
          user_id: userId,
          form_type: 'bmi-calculator',
          total_records: allData.length,
          data: allData
        };
      }
    } catch (error) {
      console.error('Export BMI data error:', error);
      throw new Error('Failed to export BMI data');
    }
  }

  /**
   * 獲取基於 BMI 的健康建議
   */
  static getRecommendations(height: number, weight: number): any {
    const result = this.calculate(height, weight);
    
    return {
      bmi: result.bmi,
      category: result.category,
      healthRisk: result.healthRisk,
      recommendations: result.recommendations,
      idealWeightRange: result.idealWeightRange,
      weightChange: result.weightChange,
      additionalTips: this.getAdditionalTips(result.bmi)
    };
  }

  /**
   * 獲取額外的健康建議
   */
  private static getAdditionalTips(bmi: number): string[] {
    const tips: string[] = [
      '保持充足的水分攝取，每天至少8杯水',
      '保證每天7-9小時的優質睡眠',
      '學習壓力管理技巧，如冥想或深呼吸'
    ];

    if (bmi < 18.5) {
      tips.push(
        '考慮增加健康脂肪的攝取，如堅果、橄欖油',
        '可以嘗試增加餐次頻率，少量多餐'
      );
    } else if (bmi > 25) {
      tips.push(
        '控制食物份量，使用較小的餐具',
        '增加膳食纖維攝取，增加飽足感',
        '避免含糖飲料，選擇無糖替代品'
      );
    }

    return tips;
  }
}