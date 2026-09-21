import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { BehaviorReport } from '../models/BehaviorReport';
import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';

export interface EarlyWarningPrediction {
  student_id: string;
  dropout_risk: number; // 0-100
  academic_failure_risk: number; // 0-100
  overall_risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_factors: string[];
  recommended_actions: string[];
  prediction_date: Date;
}

export interface StudentMetrics {
  attendance_rate: number;
  average_gpa: number;
  majorSubjectsFailed: number;
  behavior_incidents: number;
  high_severity_incidents: number;
  intervention_count: number;
  current_risk_score: number;
  recent_attendance_trend: 'improving' | 'declining' | 'stable';
  recent_grade_trend: 'improving' | 'declining' | 'stable';
}

export class EarlyWarningService {
  /**
   * Calculate comprehensive student metrics for prediction
   */
  private async calculateStudentMetrics(studentId: string, term?: string, year?: string): Promise<StudentMetrics> {
    // Build risk score query with term/year filters
    const riskQuery: any = { student_id: studentId };
    if (term) riskQuery.term = term;
    if (year) riskQuery.year = year;

    // Build academic query with term/year filters
    const academicQuery: any = { student_id: studentId };
    if (term) academicQuery.term = term;
    if (year) academicQuery.year = year;

    // Build attendance query with term/year filters if provided
    const attendanceQuery: any = { student_id: studentId };
    if (term && year) {
      // Calculate approximate date range for the term
      const termStartDate = this.getTermStartDate(term, year);
      const termEndDate = this.getTermEndDate(term, year);
      if (termStartDate && termEndDate) {
        attendanceQuery.attendance_date = {
          $gte: termStartDate,
          $lte: termEndDate
        };
      }
    }

    const [attendanceDocs, academicRecords, behaviorReports, interventions, riskScores] = await Promise.all([
      Attendance.find(attendanceQuery).sort({ date: -1 }).limit(30),
      AcademicRecord.find(academicQuery).sort({ createdAt: -1 }).limit(5),
      BehaviorReport.find({ student_id: studentId }).sort({ report_date: -1 }).limit(10),
      Intervention.find({ student_id: studentId }).sort({ start_date: -1 }).limit(10),
      RiskScore.find(riskQuery).sort({ prediction_date: -1 }).limit(5),
    ]);

    // Attendance metrics
    const totalAttendance = attendanceDocs.length;
    const presentAttendance = attendanceDocs.filter(a => a.present).length;
    const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;

    // Attendance trend (compare recent vs older records)
    const recentAttendance = attendanceDocs.slice(0, 10);
    const olderAttendance = attendanceDocs.slice(10, 20);
    const recentRate = recentAttendance.length > 0 
      ? (recentAttendance.filter(a => a.present).length / recentAttendance.length) * 100 
      : attendanceRate;
    const olderRate = olderAttendance.length > 0 
      ? (olderAttendance.filter(a => a.present).length / olderAttendance.length) * 100 
      : attendanceRate;
    const attendanceTrend = recentRate >= olderRate + 5 ? 'improving' : recentRate <= olderRate - 5 ? 'declining' : 'stable';

    // Academic metrics
    const latestAcademic = academicRecords.length > 0 ? academicRecords[0] : null;
    const averageGpa = latestAcademic?.gpa || 0;
    const majorSubjectsFailed = latestAcademic?.major_subjects_failed || 0;

    // Grade trend
    const gradeTrend = academicRecords.length >= 2 
      ? (academicRecords[0]?.gpa >= academicRecords[1]?.gpa ? 'improving' : 'declining')
      : 'stable';

    // Behavior metrics
    const behaviorIncidents = behaviorReports.length;
    const highSeverityIncidents = behaviorReports.filter(b => 
      b.severity === 'High' || b.severity === 'Critical'
    ).length;

    // Intervention metrics
    const interventionCount = interventions.length;

    // Current risk score
    const currentRiskScore = riskScores[0]?.risk_score || 0;

    return {
      attendance_rate: attendanceRate,
      average_gpa: averageGpa,
      majorSubjectsFailed,
      behavior_incidents: behaviorIncidents,
      high_severity_incidents: highSeverityIncidents,
      intervention_count: interventionCount,
      current_risk_score: currentRiskScore,
      recent_attendance_trend: attendanceTrend,
      recent_grade_trend: gradeTrend,
    };
  }

  /**
   * Calculate dropout risk based on metrics
   */
  private calculateDropoutRisk(metrics: StudentMetrics): number {
    let riskScore = 0;

    // Attendance factor (30% weight)
    if (metrics.attendance_rate < 60) riskScore += 30;
    else if (metrics.attendance_rate < 70) riskScore += 20;
    else if (metrics.attendance_rate < 80) riskScore += 10;
    else if (metrics.attendance_rate < 90) riskScore += 5;

    // Attendance trend factor (15% weight)
    if (metrics.recent_attendance_trend === 'declining') riskScore += 15;
    else if (metrics.recent_attendance_trend === 'stable') riskScore += 5;

    // Academic factor (25% weight)
    if (metrics.average_gpa < 1.5) riskScore += 25;
    else if (metrics.average_gpa < 2.0) riskScore += 20;
    else if (metrics.average_gpa < 2.5) riskScore += 15;
    else if (metrics.average_gpa < 3.0) riskScore += 10;

    // Failed major subjects factor (10% weight)
    if (metrics.majorSubjectsFailed >= 3) riskScore += 10;
    else if (metrics.majorSubjectsFailed >= 2) riskScore += 7;
    else if (metrics.majorSubjectsFailed >= 1) riskScore += 3;

    // Behavior factor (10% weight)
    if (metrics.high_severity_incidents >= 3) riskScore += 10;
    else if (metrics.high_severity_incidents >= 2) riskScore += 7;
    else if (metrics.high_severity_incidents >= 1) riskScore += 3;

    // Intervention history factor (5% weight)
    if (metrics.intervention_count >= 5) riskScore += 5;
    else if (metrics.intervention_count >= 3) riskScore += 3;

    // Current risk score factor (5% weight)
    if (metrics.current_risk_score >= 80) riskScore += 5;
    else if (metrics.current_risk_score >= 60) riskScore += 3;

    return Math.min(riskScore, 100);
  }

  /**
   * Calculate academic failure risk based on metrics
   */
  private calculateAcademicFailureRisk(metrics: StudentMetrics): number {
    let riskScore = 0;

    // GPA factor (40% weight)
    if (metrics.average_gpa < 1.0) riskScore += 40;
    else if (metrics.average_gpa < 1.5) riskScore += 35;
    else if (metrics.average_gpa < 2.0) riskScore += 30;
    else if (metrics.average_gpa < 2.5) riskScore += 20;
    else if (metrics.average_gpa < 3.0) riskScore += 10;

    // Grade trend factor (20% weight)
    if (metrics.recent_grade_trend === 'declining') riskScore += 20;
    else if (metrics.recent_grade_trend === 'stable') riskScore += 10;

    // Failed major subjects factor (25% weight)
    if (metrics.majorSubjectsFailed >= 4) riskScore += 25;
    else if (metrics.majorSubjectsFailed >= 3) riskScore += 20;
    else if (metrics.majorSubjectsFailed >= 2) riskScore += 15;
    else if (metrics.majorSubjectsFailed >= 1) riskScore += 8;

    // Attendance factor (10% weight)
    if (metrics.attendance_rate < 50) riskScore += 10;
    else if (metrics.attendance_rate < 60) riskScore += 8;
    else if (metrics.attendance_rate < 70) riskScore += 5;
    else if (metrics.attendance_rate < 80) riskScore += 3;

    // Behavior factor (5% weight)
    if (metrics.high_severity_incidents >= 2) riskScore += 5;
    else if (metrics.high_severity_incidents >= 1) riskScore += 2;

    return Math.min(riskScore, 100);
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(dropoutRisk: number, academicRisk: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    const maxRisk = Math.max(dropoutRisk, academicRisk);
    
    if (maxRisk >= 80) return 'Critical';
    if (maxRisk >= 60) return 'High';
    if (maxRisk >= 40) return 'Medium';
    return 'Low';
  }

  /**
   * Identify risk factors based on metrics
   */
  private identifyRiskFactors(metrics: StudentMetrics): string[] {
    const factors: string[] = [];

    if (metrics.attendance_rate < 70) factors.push('Low attendance rate');
    if (metrics.recent_attendance_trend === 'declining') factors.push('Declining attendance trend');
    if (metrics.average_gpa < 2.5) factors.push('Low GPA');
    if (metrics.recent_grade_trend === 'declining') factors.push('Declining academic performance');
    if (metrics.majorSubjectsFailed >= 2) factors.push('Multiple failed major subjects');
    if (metrics.high_severity_incidents >= 2) factors.push('High-severity behavioral incidents');
    if (metrics.intervention_count >= 5) factors.push('High intervention frequency');
    if (metrics.current_risk_score >= 70) factors.push('High current risk score');

    return factors;
  }

  /**
   * Generate recommended actions based on risk factors
   */
  private generateRecommendedActions(riskFactors: string[], riskLevel: string): string[] {
    const actions: string[] = [];

    if (riskFactors.includes('Low attendance rate')) {
      actions.push('Schedule attendance review meeting');
      actions.push('Implement attendance monitoring plan');
    }

    if (riskFactors.includes('Declining attendance trend')) {
      actions.push('Investigate causes of attendance decline');
      actions.push('Provide attendance support resources');
    }

    if (riskFactors.includes('Low GPA') || riskFactors.includes('Declining academic performance')) {
      actions.push('Refer to academic counseling');
      actions.push('Arrange tutoring support');
      actions.push('Review study habits and time management');
    }

    if (riskFactors.includes('Multiple failed major subjects')) {
      actions.push('Develop academic recovery plan');
      actions.push('Consider major subject load adjustment');
    }

    if (riskFactors.includes('High-severity behavioral incidents')) {
      actions.push('Schedule behavioral intervention');
      actions.push('Refer to behavioral specialist');
    }

    if (riskFactors.includes('High intervention frequency')) {
      actions.push('Review intervention effectiveness');
      actions.push('Consider alternative support strategies');
    }

    if (riskLevel === 'Critical' || riskLevel === 'High') {
      actions.push('Increase monitoring frequency');
      actions.push('Engage family/guardian support');
      actions.push('Create comprehensive support plan');
    }

    return actions.length > 0 ? actions : ['Continue regular monitoring'];
  }

  /**
   * Generate early warning prediction for a student
   */
  async generatePrediction(studentId: string, term?: string, year?: string): Promise<EarlyWarningPrediction> {
    const metrics = await this.calculateStudentMetrics(studentId, term, year);
    
    const dropoutRisk = this.calculateDropoutRisk(metrics);
    const academicFailureRisk = this.calculateAcademicFailureRisk(metrics);
    const overallRiskLevel = this.determineRiskLevel(dropoutRisk, academicFailureRisk);
    const riskFactors = this.identifyRiskFactors(metrics);
    const recommendedActions = this.generateRecommendedActions(riskFactors, overallRiskLevel);

    return {
      student_id: studentId,
      dropout_risk: dropoutRisk,
      academic_failure_risk: academicFailureRisk,
      overall_risk_level: overallRiskLevel,
      risk_factors: riskFactors,
      recommended_actions: recommendedActions,
      prediction_date: new Date(),
    };
  }

  /**
   * Generate predictions for multiple students
   */
  async generateBatchPredictions(studentIds: string[], term?: string, year?: string): Promise<EarlyWarningPrediction[]> {
    const predictions = await Promise.all(
      studentIds.map(id => this.generatePrediction(id, term, year))
    );
    return predictions;
  }

  // Helper function to get term start date
  private getTermStartDate(term: string, year: string): Date | null {
    const yearNum = parseInt(year);
    switch (term) {
      case '1st Term':
        return new Date(yearNum, 8, 1); // September 1st
      case '2nd Term':
        return new Date(yearNum, 11, 1); // December 1st
      case '3rd Term':
        return new Date(yearNum + 1, 4, 1); // May 1st of next year
      default:
        return null;
    }
  }

  // Helper function to get term end date
  private getTermEndDate(term: string, year: string): Date | null {
    const yearNum = parseInt(year);
    switch (term) {
      case '1st Term':
        return new Date(yearNum, 10, 30); // November 30th
      case '2nd Term':
        return new Date(yearNum + 1, 3, 30); // April 30th of next year
      case '3rd Term':
        return new Date(yearNum + 1, 8, 30); // August 30th of next year
      default:
        return null;
    }
  }
}

export const earlyWarningService = new EarlyWarningService();
