import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';
import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';

export interface AnalyticsInsight {
  type: 'trend' | 'alert' | 'recommendation' | 'success';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
  actionable?: boolean;
}

export class AnalyticsInsightsService {
  /**
   * Generate comprehensive AI insights from analytics data
   */
  async generateInsights(): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Get current data
    const [riskTrend, interventionData, attendanceData, academicData] = await Promise.all([
      this.getRiskTrendInsights(),
      this.getInterventionInsights(),
      this.getAttendanceInsights(),
      this.getAcademicInsights(),
    ]);

    insights.push(...riskTrend, ...interventionData, ...attendanceData, ...academicData);

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
  }

  /**
   * Analyze risk trends
   */
  private async getRiskTrendInsights(): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    // Get risk distribution
    const latestRisks = await RiskScore.aggregate([
      { $sort: { prediction_date: -1 } },
      { $group: { _id: '$student_id', risk_level: { $first: '$risk_level' } } },
    ]);

    const counts = { High: 0, Medium: 0, Low: 0 };
    latestRisks.forEach((r) => {
      counts[r.risk_level as 'High' | 'Medium' | 'Low']++;
    });

    const totalStudents = await Student.countDocuments();
    const highRiskPercentage = totalStudents > 0 ? (counts.High / totalStudents) * 100 : 0;

    // High risk alert
    if (highRiskPercentage > 20) {
      insights.push({
        type: 'alert',
        title: 'High Risk Student Population',
        description: `${highRiskPercentage.toFixed(1)}% of students are currently at high risk. This exceeds the recommended threshold of 20%. Consider reviewing intervention strategies.`,
        priority: 'high',
        data: { highRiskCount: counts.High, totalStudents, percentage: highRiskPercentage },
        actionable: true,
      });
    } else if (highRiskPercentage > 15) {
      insights.push({
        type: 'trend',
        title: 'Elevated Risk Levels',
        description: `${highRiskPercentage.toFixed(1)}% of students are at high risk. Monitor this metric closely as it approaches the warning threshold.`,
        priority: 'medium',
        data: { highRiskCount: counts.High, totalStudents, percentage: highRiskPercentage },
      });
    }

    // Success insight
    if (highRiskPercentage < 10) {
      insights.push({
        type: 'success',
        title: 'Low Risk Achievement',
        description: `Excellent risk management with only ${highRiskPercentage.toFixed(1)}% of students at high risk. Current intervention strategies are effective.`,
        priority: 'low',
        data: { highRiskCount: counts.High, totalStudents, percentage: highRiskPercentage },
      });
    }

    // Risk trend over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRisks = await RiskScore.aggregate([
      { $match: { prediction_date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$prediction_date' } },
          avg_risk: { $avg: '$risk_score' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (recentRisks.length >= 2) {
      const recentAvg = recentRisks.slice(-7).reduce((sum, r) => sum + r.avg_risk, 0) / Math.min(7, recentRisks.length);
      const previousAvg = recentRisks.slice(-14, -7).reduce((sum, r) => sum + r.avg_risk, 0) / Math.min(7, recentRisks.length);

      if (recentAvg > previousAvg + 5) {
        insights.push({
          type: 'alert',
          title: 'Rising Risk Trend',
          description: `Average risk scores have increased by ${(recentAvg - previousAvg).toFixed(1)} points in the past week. This may indicate emerging issues requiring attention.`,
          priority: 'high',
          data: { recentAvg, previousAvg, change: recentAvg - previousAvg },
          actionable: true,
        });
      } else if (recentAvg < previousAvg - 5) {
        insights.push({
          type: 'success',
          title: 'Improving Risk Trend',
          description: `Average risk scores have decreased by ${(previousAvg - recentAvg).toFixed(1)} points in the past week. Current interventions are showing positive results.`,
          priority: 'medium',
          data: { recentAvg, previousAvg, change: previousAvg - recentAvg },
        });
      }
    }

    return insights;
  }

  /**
   * Analyze intervention effectiveness
   */
  private async getInterventionInsights(): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    const interventionAgg = await Intervention.aggregate([
      {
        $group: {
          _id: '$intervention_type',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        },
      },
    ]);

    const totalInterventions = await Intervention.countDocuments();
    const completed = await Intervention.countDocuments({ status: 'Completed' });
    const successRate = totalInterventions > 0 ? (completed / totalInterventions) * 100 : 0;

    // Overall success rate
    if (successRate < 50) {
      insights.push({
        type: 'alert',
        title: 'Low Intervention Completion Rate',
        description: `Only ${successRate.toFixed(1)}% of interventions are being completed. Review intervention planning and follow-up procedures.`,
        priority: 'high',
        data: { successRate, totalInterventions, completed },
        actionable: true,
      });
    } else if (successRate < 70) {
      insights.push({
        type: 'trend',
        title: 'Moderate Intervention Completion',
        description: `${successRate.toFixed(1)}% intervention completion rate. Consider implementing better tracking and reminder systems.`,
        priority: 'medium',
        data: { successRate, totalInterventions, completed },
        actionable: true,
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Strong Intervention Completion',
        description: `${successRate.toFixed(1)}% of interventions are completed successfully. Current intervention management is effective.`,
        priority: 'low',
        data: { successRate, totalInterventions, completed },
      });
    }

    // Most/least effective intervention types
    const interventionTypes = interventionAgg.map((i) => ({
      type: i._id || 'Other',
      rate: i.total ? (i.completed / i.total) * 100 : 0,
      total: i.total,
    }));

    if (interventionTypes.length > 0) {
      const mostEffective = interventionTypes.reduce((a, b) => a.rate > b.rate ? a : b);
      const leastEffective = interventionTypes.reduce((a, b) => a.rate < b.rate ? a : b);

      if (mostEffective.rate > 80) {
        insights.push({
          type: 'success',
          title: 'Highly Effective Intervention Type',
          description: `${mostEffective.type} interventions have a ${mostEffective.rate.toFixed(1)}% success rate. Consider expanding this approach.`,
          priority: 'medium',
          data: { type: mostEffective.type, rate: mostEffective.rate },
        });
      }

      if (leastEffective.rate < 50 && leastEffective.total >= 5) {
        insights.push({
          type: 'recommendation',
          title: 'Review Intervention Strategy',
          description: `${leastEffective.type} interventions have only ${leastEffective.rate.toFixed(1)}% success rate. Consider modifying or replacing this approach.`,
          priority: 'medium',
          data: { type: leastEffective.type, rate: leastEffective.rate },
          actionable: true,
        });
      }
    }

    return insights;
  }

  /**
   * Analyze attendance patterns
   */
  private async getAttendanceInsights(): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    const attendanceAgg = await Attendance.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: '$attendance_date' },
          present: { $sum: { $cond: ['$present', 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const weekdayAttendance = attendanceAgg
      .filter((a) => a._id >= 2 && a._id <= 6)
      .map((a) => a.total ? (a.present / a.total) * 100 : 0);

    if (weekdayAttendance.length > 0) {
      const avgAttendance = weekdayAttendance.reduce((sum, rate) => sum + rate, 0) / weekdayAttendance.length;

      if (avgAttendance < 75) {
        insights.push({
          type: 'alert',
          title: 'Low Overall Attendance',
          description: `Average attendance is ${avgAttendance.toFixed(1)}%, below the recommended 75% threshold. Implement attendance improvement programs.`,
          priority: 'high',
          data: { avgAttendance },
          actionable: true,
        });
      } else if (avgAttendance < 85) {
        insights.push({
          type: 'trend',
          title: 'Moderate Attendance Levels',
          description: `Average attendance is ${avgAttendance.toFixed(1)}%. Room for improvement to reach optimal levels.`,
          priority: 'medium',
          data: { avgAttendance },
        });
      } else {
        insights.push({
          type: 'success',
          title: 'Strong Attendance',
          description: `Excellent attendance rate of ${avgAttendance.toFixed(1)}%. Students are consistently engaged.`,
          priority: 'low',
          data: { avgAttendance },
        });
      }

      // Identify problematic days
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const lowAttendanceDays = attendanceAgg
        .filter((a) => a._id >= 2 && a._id <= 6 && a.total && (a.present / a.total) * 100 < 80)
        .map((a) => weekdays[a._id - 2]);

      if (lowAttendanceDays.length > 0) {
        insights.push({
          type: 'recommendation',
          title: 'Attendance Pattern Analysis',
          description: `Lower attendance observed on: ${lowAttendanceDays.join(', ')}. Consider scheduling important activities on higher attendance days.`,
          priority: 'medium',
          data: { lowAttendanceDays },
          actionable: true,
        });
      }
    }

    return insights;
  }

  /**
   * Analyze academic performance
   */
  private async getAcademicInsights(): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = [];

    const academicAgg = await AcademicRecord.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$student_id', gpa: { $first: '$gpa' }, major_subjects_failed: { $first: '$major_subjects_failed' } } },
    ]);

    if (academicAgg.length > 0) {
      const avgGpa = academicAgg.reduce((sum, r) => sum + r.gpa, 0) / academicAgg.length;
      const totalFailed = academicAgg.reduce((sum, r) => sum + (r.major_subjects_failed || 0), 0);
      const studentsWithFailures = academicAgg.filter((r) => r.major_subjects_failed > 0).length;

      // GPA analysis
      if (avgGpa < 2.0) {
        insights.push({
          type: 'alert',
          title: 'Low Average GPA',
          description: `Average GPA is ${avgGpa.toFixed(2)}, below the 2.0 threshold. Academic support programs are urgently needed.`,
          priority: 'high',
          data: { avgGpa },
          actionable: true,
        });
      } else if (avgGpa < 2.5) {
        insights.push({
          type: 'trend',
          title: 'Moderate Academic Performance',
          description: `Average GPA is ${avgGpa.toFixed(2)}. Consider implementing additional academic support resources.`,
          priority: 'medium',
          data: { avgGpa },
        });
      } else {
        insights.push({
          type: 'success',
          title: 'Strong Academic Performance',
          description: `Average GPA of ${avgGpa.toFixed(2)} indicates good academic standing across the student population.`,
          priority: 'low',
          data: { avgGpa },
        });
      }

      // Course failure analysis
      const failureRate = (studentsWithFailures / academicAgg.length) * 100;
      if (failureRate > 30) {
        insights.push({
          type: 'alert',
          title: 'High Course Failure Rate',
          description: `${failureRate.toFixed(1)}% of students have failed at least one major subject. Review curriculum and support systems.`,
          priority: 'high',
          data: { failureRate, studentsWithFailures, totalStudents: academicAgg.length },
          actionable: true,
        });
      } else if (failureRate > 15) {
        insights.push({
          type: 'trend',
          title: 'Moderate Major Subject Failure Rate',
          description: `${failureRate.toFixed(1)}% of students have failed major subjects. Monitor and provide targeted support.`,
          priority: 'medium',
          data: { failureRate, studentsWithFailures, totalStudents: academicAgg.length },
        });
      }
    }

    return insights;
  }
}

export const analyticsInsightsService = new AnalyticsInsightsService();
