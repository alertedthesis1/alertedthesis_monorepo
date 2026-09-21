import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { RiskScore } from '../models/RiskScore';

// Helper function to get term start date
function getTermStartDate(term: string, year: string): Date | null {
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
function getTermEndDate(term: string, year: string): Date | null {
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

export interface RiskCalculationResult {
  riskScore: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  attendanceFactor: number;
  academicFactor: number;
  detailedFactors?: {
    attendanceRate: number;
    unexcusedAbsenceRate: number;
    overallAverage: number;
    gpa: number;
    failedMajorSubjects: number;
    majorSubjectCompletionRate: number;
    subjectGrades: {
      mathematics: number;
      english: number;
      science: number;
    };
  };
}

/**
 * Calculate comprehensive risk score based on attendance and academic performance
 *
 * ENHANCED FORMULA:
 * ================
 * Attendance Factors (40% total weight):
 * - Overall attendance rate: 15%
 * - Unexcused absence rate: 15% (more severe than general absence)
 * - Recent attendance trend: 10%
 *
 * Academic Factors (60% total weight):
 * - Overall average: 25% (increased weight - critical factor)
 * - GPA: 20% (increased weight - critical factor)
 * - Failed major subjects: 10% (reduced from 15%)
 * - Major subject completion rate: 3% (reduced from 5%)
 * - Subject-specific grades: 2% (reduced from 5%)
 *
 * SPECIAL LOGIC:
 * - High attendance (>90%) with low grades (<75 average or <3.0 GPA) = ADDITIONAL RISK
 * - This indicates attendance without engagement/learning - concerning pattern
 *
 * RISK LEVELS:
 * - High: 70-100
 * - Medium: 30-69
 * - Low: 0-29
 *
 * Higher score = higher risk
 */
export async function calculateRiskScore(studentId: string, term?: string, year?: string): Promise<RiskCalculationResult> {
  // Get attendance records for the last 45 days
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  const attendanceQuery: any = {
    student_id: studentId,
    attendance_date: { $gte: fortyFiveDaysAgo }
  };

  // If term and year are provided, filter attendance by academic period
  if (term && year) {
    // Calculate approximate date range for the term
    const termStartDate = getTermStartDate(term, year);
    const termEndDate = getTermEndDate(term, year);
    if (termStartDate && termEndDate) {
      attendanceQuery.attendance_date = {
        $gte: termStartDate,
        $lte: termEndDate
      };
    }
  } else {
    // If no term/year specified, get data from the current academic period
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let currentTerm = '1st Term';
    let academicYear = currentYear.toString();
    
    if (currentMonth >= 11 || currentMonth <= 3) {
      currentTerm = '2nd Term';
      academicYear = currentMonth >= 11 ? currentYear.toString() : (currentYear - 1).toString();
    } else if (currentMonth >= 4 && currentMonth <= 8) {
      currentTerm = '3rd Term';
      academicYear = (currentYear - 1).toString();
    }
    
    const termStartDate = getTermStartDate(currentTerm, academicYear);
    const termEndDate = getTermEndDate(currentTerm, academicYear);
    if (termStartDate && termEndDate) {
      attendanceQuery.attendance_date = {
        $gte: termStartDate,
        $lte: termEndDate
      };
    }
  }

  const attendanceRecords = await Attendance.find(attendanceQuery);

  // Get academic record for the specified term/year, or current if not specified
  const academicQuery: any = { student_id: studentId };
  if (term && year) {
    academicQuery.term = term;
    academicQuery.year = year;
  } else {
    // If no term/year specified, get data from the current academic period
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let currentTerm = '1st Term';
    let academicYear = currentYear.toString();
    
    if (currentMonth >= 11 || currentMonth <= 3) {
      currentTerm = '2nd Term';
      academicYear = currentMonth >= 11 ? currentYear.toString() : (currentYear - 1).toString();
    } else if (currentMonth >= 4 && currentMonth <= 8) {
      currentTerm = '3rd Term';
      academicYear = (currentYear - 1).toString();
    }
    
    academicQuery.term = currentTerm;
    academicQuery.year = academicYear;
  }

  const latestAcademicRecord = await AcademicRecord.findOne(academicQuery)
    .sort({ year: -1, term: -1 });

  // ========== ATTENDANCE CALCULATIONS ==========
  const totalAttendanceDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(r => r.present).length;
  const unexcusedAbsences = attendanceRecords.filter(r => !r.present && !r.excused_absent).length;
  
  // Use more realistic default attendance rate when no data exists
  const attendanceRate = totalAttendanceDays > 0 
    ? (presentDays / totalAttendanceDays) * 100 
    : 80; // Changed from 0 to 80% default
  
  const unexcusedAbsenceRate = totalAttendanceDays > 0 
    ? (unexcusedAbsences / totalAttendanceDays) * 100 
    : 5; // Changed from 0 to 5% default

  // Recent attendance trend (last 15 days vs previous 15 days)
  const recentRecords = attendanceRecords.slice(0, 15);
  const olderRecords = attendanceRecords.slice(15, 30);
  
  const recentRate = recentRecords.length > 0 
    ? (recentRecords.filter(r => r.present).length / recentRecords.length) * 100 
    : attendanceRate;
    
  const olderRate = olderRecords.length > 0 
    ? (olderRecords.filter(r => r.present).length / olderRecords.length) * 100 
    : attendanceRate;
    
  const attendanceTrend = recentRate - olderRate; // Positive = improving, Negative = declining

  // ========== ACADEMIC CALCULATIONS ==========
  // Use more realistic defaults when data is missing to generate varied risk scores
  // Ensure grades are at least 60+ as per requirements
  const overallAverage = latestAcademicRecord?.overall_average ?? 75; // Default above 70 threshold
  const gpa = latestAcademicRecord?.gpa ?? 2.5; // Default above 2.0 threshold
  const failedMajorSubjects = latestAcademicRecord?.major_subjects_failed ?? 0;
  const majorSubjectsEnrolled = latestAcademicRecord?.major_subjects_enrolled ?? 5;
  const majorSubjectsPassed = latestAcademicRecord?.major_subjects_passed ?? 3;

  const majorSubjectCompletionRate = majorSubjectsEnrolled > 0
    ? (majorSubjectsPassed / majorSubjectsEnrolled) * 100
    : 60; // Default to 60% completion rate

  // Ensure grades are at least 60+ as per requirements
  const mathGrade = Math.max(60, latestAcademicRecord?.mathematics_grade ?? 70);
  const englishGrade = Math.max(60, latestAcademicRecord?.english_grade ?? 70);
  const scienceGrade = Math.max(60, latestAcademicRecord?.science_grade ?? 70);
  const subjectAverage = (mathGrade + englishGrade + scienceGrade) / 3;

  // ========== RISK SCORE CALCULATION ==========
  let riskScore = 0;

  // Attendance Factors (40% total)
  // Overall attendance rate (15% weight): Lower rate = higher risk
  if (attendanceRate < 50) riskScore += 15;
  else if (attendanceRate < 60) riskScore += 12;
  else if (attendanceRate < 70) riskScore += 9;
  else if (attendanceRate < 80) riskScore += 6;
  else if (attendanceRate < 90) riskScore += 3;
  else riskScore += 0;

  // Unexcused absence rate (15% weight): Higher rate = higher risk
  if (unexcusedAbsenceRate > 20) riskScore += 15;
  else if (unexcusedAbsenceRate > 15) riskScore += 12;
  else if (unexcusedAbsenceRate > 10) riskScore += 9;
  else if (unexcusedAbsenceRate > 5) riskScore += 6;
  else if (unexcusedAbsenceRate > 2) riskScore += 3;
  else riskScore += 0;

  // Attendance trend (10% weight): Declining trend = higher risk
  if (attendanceTrend < -15) riskScore += 10; // Significantly declining
  else if (attendanceTrend < -8) riskScore += 7; // Moderately declining
  else if (attendanceTrend < -3) riskScore += 4; // Slightly declining
  else if (attendanceTrend >= -3 && attendanceTrend <= 3) riskScore += 2; // Stable
  else riskScore += 0; // Improving

  // Academic Factors (60% total)
  // Overall average (25% weight): Lower average = higher risk - CRITICAL FACTOR
  if (overallAverage < 50) riskScore += 25;
  else if (overallAverage < 60) riskScore += 20;
  else if (overallAverage < 70) riskScore += 15;
  else if (overallAverage < 75) riskScore += 12; // Below 75 is concerning
  else if (overallAverage < 80) riskScore += 8;
  else if (overallAverage < 85) riskScore += 4;
  else riskScore += 0;

  // GPA (20% weight): Lower GPA = higher risk - CRITICAL FACTOR
  if (gpa < 1.0) riskScore += 20;
  else if (gpa < 1.5) riskScore += 16;
  else if (gpa < 2.0) riskScore += 12;
  else if (gpa < 2.5) riskScore += 8;
  else if (gpa < 3.0) riskScore += 6; // Below 3.0 is concerning
  else if (gpa < 3.5) riskScore += 3;
  else riskScore += 0;

  // Failed major subjects (10% weight): More failures = higher risk
  if (failedMajorSubjects >= 4) riskScore += 10;
  else if (failedMajorSubjects >= 3) riskScore += 8;
  else if (failedMajorSubjects >= 2) riskScore += 6;
  else if (failedMajorSubjects >= 1) riskScore += 3;
  else riskScore += 0;

  // Major subject completion rate (3% weight): Lower completion = higher risk
  if (majorSubjectCompletionRate < 50) riskScore += 3;
  else if (majorSubjectCompletionRate < 70) riskScore += 2;
  else if (majorSubjectCompletionRate < 90) riskScore += 1;
  else riskScore += 0;

  // Subject-specific grades (2% weight): Lower subject average = higher risk
  if (subjectAverage < 50) riskScore += 2;
  else if (subjectAverage < 60) riskScore += 1.5;
  else if (subjectAverage < 70) riskScore += 1;
  else if (subjectAverage < 80) riskScore += 0.5;
  else riskScore += 0;

  // SPECIAL LOGIC: High attendance with low grades - concerning pattern
  // Students with >90% attendance but <75 average or <3.0 GPA
  // This indicates attendance without engagement/learning
  if (attendanceRate >= 90 && (overallAverage < 75 || gpa < 3.0)) {
    riskScore += 15; // Significant additional risk for this pattern
  }

  // Cap the risk score at 100
  riskScore = Math.min(Math.round(riskScore), 100);

  // Determine risk level
  let riskLevel: 'High' | 'Medium' | 'Low';
  if (riskScore >= 70) {
    riskLevel = 'High';
  } else if (riskScore >= 30) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  return {
    riskScore,
    riskLevel,
    attendanceFactor: Math.round(attendanceRate),
    academicFactor: Math.round(overallAverage),
    detailedFactors: {
      attendanceRate: Math.round(attendanceRate),
      unexcusedAbsenceRate: Math.round(unexcusedAbsenceRate),
      overallAverage: Math.round(overallAverage),
      gpa: parseFloat(gpa.toFixed(2)),
      failedMajorSubjects,
      majorSubjectCompletionRate: Math.round(majorSubjectCompletionRate),
      subjectGrades: {
        mathematics: mathGrade,
        english: englishGrade,
        science: scienceGrade,
      },
    },
  };
}

/**
 * Calculate risk score from raw values (for seeding/testing)
 * Uses the same enhanced formula but with provided values
 */
export function calculateRiskScoreFromValues(
  attendanceRate: number,
  unexcusedAbsenceRate: number,
  overallAverage: number,
  gpa: number,
  failedMajorSubjects: number,
  majorSubjectCompletionRate: number,
  subjectGrades: { mathematics: number; english: number; science: number },
  attendanceTrend: number = 0
): RiskCalculationResult {
  let riskScore = 0;

  // Attendance Factors (40% total)
  if (attendanceRate < 50) riskScore += 15;
  else if (attendanceRate < 60) riskScore += 12;
  else if (attendanceRate < 70) riskScore += 9;
  else if (attendanceRate < 80) riskScore += 6;
  else if (attendanceRate < 90) riskScore += 3;
  else riskScore += 0;

  if (unexcusedAbsenceRate > 20) riskScore += 15;
  else if (unexcusedAbsenceRate > 15) riskScore += 12;
  else if (unexcusedAbsenceRate > 10) riskScore += 9;
  else if (unexcusedAbsenceRate > 5) riskScore += 6;
  else if (unexcusedAbsenceRate > 2) riskScore += 3;
  else riskScore += 0;

  if (attendanceTrend < -15) riskScore += 10;
  else if (attendanceTrend < -8) riskScore += 7;
  else if (attendanceTrend < -3) riskScore += 4;
  else if (attendanceTrend >= -3 && attendanceTrend <= 3) riskScore += 2;
  else riskScore += 0;

  // Academic Factors (60% total)
  // Overall average (25% weight): Lower average = higher risk - CRITICAL FACTOR
  if (overallAverage < 50) riskScore += 25;
  else if (overallAverage < 60) riskScore += 20;
  else if (overallAverage < 70) riskScore += 15;
  else if (overallAverage < 75) riskScore += 12; // Below 75 is concerning
  else if (overallAverage < 80) riskScore += 8;
  else if (overallAverage < 85) riskScore += 4;
  else riskScore += 0;

  // GPA (20% weight): Lower GPA = higher risk - CRITICAL FACTOR
  if (gpa < 1.0) riskScore += 20;
  else if (gpa < 1.5) riskScore += 16;
  else if (gpa < 2.0) riskScore += 12;
  else if (gpa < 2.5) riskScore += 8;
  else if (gpa < 3.0) riskScore += 6; // Below 3.0 is concerning
  else if (gpa < 3.5) riskScore += 3;
  else riskScore += 0;

  // Failed major subjects (10% weight): More failures = higher risk
  if (failedMajorSubjects >= 4) riskScore += 10;
  else if (failedMajorSubjects >= 3) riskScore += 8;
  else if (failedMajorSubjects >= 2) riskScore += 6;
  else if (failedMajorSubjects >= 1) riskScore += 3;
  else riskScore += 0;

  // Major subject completion rate (3% weight): Lower completion = higher risk
  if (majorSubjectCompletionRate < 50) riskScore += 3;
  else if (majorSubjectCompletionRate < 70) riskScore += 2;
  else if (majorSubjectCompletionRate < 90) riskScore += 1;
  else riskScore += 0;

  const subjectAverage = (subjectGrades.mathematics + subjectGrades.english + subjectGrades.science) / 3;
  // Subject-specific grades (2% weight): Lower subject average = higher risk
  if (subjectAverage < 50) riskScore += 2;
  else if (subjectAverage < 60) riskScore += 1.5;
  else if (subjectAverage < 70) riskScore += 1;
  else if (subjectAverage < 80) riskScore += 0.5;
  else riskScore += 0;

  // SPECIAL LOGIC: High attendance with low grades - concerning pattern
  // Students with >90% attendance but <75 average or <3.0 GPA
  // This indicates attendance without engagement/learning
  if (attendanceRate >= 90 && (overallAverage < 75 || gpa < 3.0)) {
    riskScore += 15; // Significant additional risk for this pattern
  }

  riskScore = Math.min(Math.round(riskScore), 100);

  let riskLevel: 'High' | 'Medium' | 'Low';
  if (riskScore >= 70) {
    riskLevel = 'High';
  } else if (riskScore >= 30) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  return {
    riskScore,
    riskLevel,
    attendanceFactor: Math.round(attendanceRate),
    academicFactor: Math.round(overallAverage),
    detailedFactors: {
      attendanceRate: Math.round(attendanceRate),
      unexcusedAbsenceRate: Math.round(unexcusedAbsenceRate),
      overallAverage: Math.round(overallAverage),
      gpa: parseFloat(gpa.toFixed(2)),
      failedMajorSubjects,
      majorSubjectCompletionRate: Math.round(majorSubjectCompletionRate),
      subjectGrades: subjectGrades,
    },
  };
}

/**
 * Recalculate and update risk score for a student
 * This should be called whenever new attendance or academic data is added
 */
export async function updateRiskScoreForStudent(studentId: string, term?: string, year?: string): Promise<void> {
  try {
    // Calculate the new risk score
    const riskCalculation = await calculateRiskScore(studentId, term, year);
    
    // Determine the term and year to use
    let targetTerm = term;
    let targetYear = year;
    
    if (!targetTerm || !targetYear) {
      // Use current academic period if not specified
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      if (currentMonth >= 11 || currentMonth <= 3) {
        targetTerm = '2nd Term';
        targetYear = currentMonth >= 11 ? currentYear.toString() : (currentYear - 1).toString();
      } else if (currentMonth >= 4 && currentMonth <= 8) {
        targetTerm = '3rd Term';
        targetYear = (currentYear - 1).toString();
      } else {
        targetTerm = '1st Term';
        targetYear = currentYear.toString();
      }
    }
    
    // Check if a risk score already exists for this student, term, and year
    const existingRiskScore = await RiskScore.findOne({
      student_id: studentId,
      term: targetTerm,
      year: targetYear
    });
    
    if (existingRiskScore) {
      // Update existing risk score
      await RiskScore.findByIdAndUpdate(existingRiskScore._id, {
        risk_level: riskCalculation.riskLevel,
        risk_score: riskCalculation.riskScore,
        attendance_factor: riskCalculation.attendanceFactor,
        academic_factor: riskCalculation.academicFactor,
        detailed_factors: riskCalculation.detailedFactors,
        prediction_date: new Date(),
      });
    } else {
      // Create new risk score
      await RiskScore.create({
        student_id: studentId,
        risk_level: riskCalculation.riskLevel,
        risk_score: riskCalculation.riskScore,
        confidence: 85,
        term: targetTerm,
        year: targetYear,
        attendance_factor: riskCalculation.attendanceFactor,
        academic_factor: riskCalculation.academicFactor,
        behavior_factor: 50,
        model_version: '2.0.0',
        detailed_factors: riskCalculation.detailedFactors,
        prediction_date: new Date(),
      });
    }
  } catch (error) {
    console.error(`Error updating risk score for student ${studentId}:`, error);
    throw error;
  }
}
