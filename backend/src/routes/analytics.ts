import { Router, Request, Response } from 'express';
import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';
import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { analyticsInsightsService } from '../services/analyticsInsightsService';

const router = Router();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Aggregated analytics for the Analytics & Reports page
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const term = req.query.term as string;
    const year = req.query.year as string;
    const riskTrendGranularity = req.query.riskTrendGranularity as string || 'monthly';
    const interventionGranularity = req.query.interventionGranularity as string || 'monthly';
    const attendanceGranularity = req.query.attendanceGranularity as string || 'weekly';
    
    // Build date range filter based on term and year
    let dateFilter: any = {};
    if (term && year) {
      const termStartMonth = term === '1st Term' ? 0 : term === '2nd Term' ? 4 : 8; // Jan, May, Sep
      const termEndMonth = term === '1st Term' ? 3 : term === '2nd Term' ? 7 : 11; // Apr, Aug, Dec
      
      const startDate = new Date(parseInt(year), termStartMonth, 1);
      const endDate = new Date(parseInt(year), termEndMonth, 31, 23, 59, 59);
      
      dateFilter = {
        prediction_date: { $gte: startDate, $lte: endDate }
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      
      dateFilter = {
        prediction_date: { $gte: startDate, $lte: endDate }
      };
    }
    // If no filters are provided, dateFilter remains empty to show all historical data

    const totalStudents = await Student.countDocuments();

    // Latest risk per student for distribution
    const riskPipeline: any[] = [];
    if (Object.keys(dateFilter).length > 0) {
      riskPipeline.push({ $match: dateFilter });
    }
    riskPipeline.push({ $sort: { prediction_date: -1 } as any });
    riskPipeline.push({ $group: { _id: '$student_id', risk_level: { $first: '$risk_level' } } });
    
    const latestRisks = await RiskScore.aggregate(riskPipeline);
    const counts = { High: 0, Medium: 0, Low: 0 };
    latestRisks.forEach((r) => {
      counts[r.risk_level as 'High' | 'Medium' | 'Low']++;
    });
    const totalRated = latestRisks.length || 1;
    const riskDistribution = [
      { name: 'Low Risk', value: Math.round((counts.Low / totalRated) * 100), color: '#16a34a' },
      { name: 'Medium Risk', value: Math.round((counts.Medium / totalRated) * 100), color: '#f59e0b' },
      { name: 'High Risk', value: Math.round((counts.High / totalRated) * 100), color: '#dc2626' },
    ];

    // Risk trend with granularity support
    let trendGroupStage;
    if (riskTrendGranularity === 'daily') {
      trendGroupStage = {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$prediction_date',
            },
          },
          high: { $sum: { $cond: [{ $eq: ['$risk_level', 'High'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$risk_level', 'Medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$risk_level', 'Low'] }, 1, 0] } },
        },
      };
    } else if (riskTrendGranularity === 'weekly') {
      trendGroupStage = {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%U',
              date: '$prediction_date',
            },
          },
          high: { $sum: { $cond: [{ $eq: ['$risk_level', 'High'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$risk_level', 'Medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$risk_level', 'Low'] }, 1, 0] } },
        },
      };
    } else {
      // monthly (default) - include year in grouping to show data across multiple years
      trendGroupStage = {
        $group: {
          _id: {
            year: { $year: '$prediction_date' },
            month: { $month: '$prediction_date' }
          },
          high: { $sum: { $cond: [{ $eq: ['$risk_level', 'High'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$risk_level', 'Medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$risk_level', 'Low'] }, 1, 0] } },
        },
      };
    }

    const trendPipeline: any[] = [];
    if (Object.keys(dateFilter).length > 0) {
      trendPipeline.push({ $match: dateFilter });
    }
    trendPipeline.push(trendGroupStage);
    trendPipeline.push({ $sort: { _id: 1 } as any });
    
    const trendAgg = await RiskScore.aggregate(trendPipeline);
    const riskTrend = trendAgg.map((t) => {
      if (riskTrendGranularity === 'monthly') {
        // Handle the new structure with year and month
        if (t._id && typeof t._id === 'object' && 'year' in t._id && 'month' in t._id) {
          return {
            month: `${MONTHS[t._id.month - 1]} ${t._id.year}`,
            high: t.high,
            medium: t.medium,
            low: t.low,
          };
        }
        // Fallback for old structure
        return {
          month: MONTHS[t._id - 1],
          high: t.high,
          medium: t.medium,
          low: t.low,
        };
      } else {
        return {
          month: t._id,
          high: t.high,
          medium: t.medium,
          low: t.low,
        };
      }
    });

    // Intervention effectiveness by type with granularity
    const interventionPipeline: any[] = [];
    if (Object.keys(dateFilter).length > 0) {
      interventionPipeline.push({ $match: { start_date: dateFilter.prediction_date } });
    }
    interventionPipeline.push({
      $group: {
        _id: '$intervention_type',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
      },
    });
    
    const interventionAgg = await Intervention.aggregate(interventionPipeline);
    const interventionEffectiveness = interventionAgg.map((i) => ({
      type: i._id || 'Other',
      rate: i.total ? Math.round((i.completed / i.total) * 100) : 0,
    }));

    // Attendance pattern with granularity
    const attendancePipeline: any[] = [];
    if (Object.keys(dateFilter).length > 0) {
      attendancePipeline.push({ $match: { attendance_date: dateFilter.prediction_date } });
    }
    
    let attendanceGroupStage;
    if (attendanceGranularity === 'daily') {
      attendanceGroupStage = {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$attendance_date',
            },
          },
          present: { $sum: { $cond: ['$present', 1, 0] } },
          total: { $sum: 1 },
        },
      };
    } else if (attendanceGranularity === 'monthly') {
      attendanceGroupStage = {
        $group: {
          _id: {
            year: { $year: '$attendance_date' },
            month: { $month: '$attendance_date' }
          },
          present: { $sum: { $cond: ['$present', 1, 0] } },
          total: { $sum: 1 },
        },
      };
    } else {
      // weekly (default)
      attendanceGroupStage = {
        $group: {
          _id: { $dayOfWeek: '$attendance_date' },
          present: { $sum: { $cond: ['$present', 1, 0] } },
          total: { $sum: 1 },
        },
      };
    }
    
    attendancePipeline.push(attendanceGroupStage);
    attendancePipeline.push({ $sort: { _id: 1 } as any });
    
    const attendanceAgg = await Attendance.aggregate(attendancePipeline);
    const attendancePattern = attendanceAgg.map((a) => {
      if (attendanceGranularity === 'weekly') {
        if (a._id >= 2 && a._id <= 6) {
          return {
            day: WEEKDAYS[a._id - 1],
            attendance: a.total ? Math.round((a.present / a.total) * 100) : 0,
          };
        }
        return null;
      } else if (attendanceGranularity === 'monthly') {
        // Handle the new structure with year and month
        if (a._id && typeof a._id === 'object' && 'year' in a._id && 'month' in a._id) {
          return {
            day: `${MONTHS[a._id.month - 1]} ${a._id.year}`,
            attendance: a.total ? Math.round((a.present / a.total) * 100) : 0,
          };
        }
        // Fallback for old structure
        return {
          day: MONTHS[a._id - 1],
          attendance: a.total ? Math.round((a.present / a.total) * 100) : 0,
        };
      } else {
        return {
          day: a._id,
          attendance: a.total ? Math.round((a.present / a.total) * 100) : 0,
        };
      }
    }).filter(Boolean);

    // Summary metrics
    const interventionFilter: any = {};
    if (Object.keys(dateFilter).length > 0) {
      interventionFilter.start_date = dateFilter.prediction_date;
    }
    const totalInterventions = await Intervention.countDocuments(interventionFilter);
    const completed = await Intervention.countDocuments({ ...interventionFilter, status: 'Completed' });
    const successRate = totalInterventions ? Math.round((completed / totalInterventions) * 100) : 0;
    const preventionRate = totalStudents
      ? Math.round(((counts.Low) / totalRated) * 100)
      : 0;

    res.json({
      summary: {
        modelAccuracy: 94.2,
        accuracyDelta: 2.1,
        interventions: successRate,
        earlyDetection: 3.2,
        preventionRate,
      },
      riskTrend,
      riskDistribution,
      interventionEffectiveness,
      attendancePattern,
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get risk trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'month';

    // Get scores from last 30 days grouped by date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await RiskScore.aggregate([
      {
        $match: {
          prediction_date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$prediction_date',
            },
          },
          high_risk: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'High'] }, 1, 0] },
          },
          medium_risk: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'Medium'] }, 1, 0] },
          },
          low_risk: {
            $sum: { $cond: [{ $eq: ['$risk_level', 'Low'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    const formattedTrends = trends.map(trend => ({
      date: trend._id,
      high_risk: trend.high_risk,
      medium_risk: trend.medium_risk,
      low_risk: trend.low_risk,
    }));

    res.json({ data: formattedTrends, period });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get intervention outcomes
router.get('/interventions', async (req: Request, res: Response) => {
  try {
    const interventions = await Intervention.aggregate([
      {
        $group: {
          _id: '$intervention_type',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
          },
        },
      },
    ]);

    const totalCompleted = await Intervention.countDocuments({
      status: 'Completed',
    });
    const totalInterventions = await Intervention.countDocuments();

    res.json({
      data: interventions,
      summary: {
        total_interventions: totalInterventions,
        completed: totalCompleted,
        success_rate: totalInterventions > 0 
          ? ((totalCompleted / totalInterventions) * 100).toFixed(1)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

// Get model accuracy
router.get('/model-accuracy', async (req: Request, res: Response) => {
  try {
    res.json({
      model_version: '1.0.0',
      accuracy: 89.3,
      precision: 87.5,
      recall: 91.2,
      f1_score: 89.3,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching model accuracy:', error);
    res.status(500).json({ error: 'Failed to fetch model accuracy' });
  }
});

// Get AI-powered insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const insights = await analyticsInsightsService.generateInsights();
    res.json({ data: insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
