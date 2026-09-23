import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { RiskScore } from '../models/RiskScore';
import { Student } from '../models/Student';

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
 * - Overall average: 45% (increased weight - critical factor)
 * - Subject-specific grades: 15% (reduced from 5%)
 *
 * SPECIAL LOGIC:
 * - High attendance (>90%) with low grades (<75 average) = ADDITIONAL RISK
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
  // Overall average (45% weight): Lower average = higher risk - CRITICAL FACTOR
  if (overallAverage < 50) riskScore += 45;
  else if (overallAverage < 60) riskScore += 36;
  else if (overallAverage < 70) riskScore += 27;
  else if (overallAverage < 75) riskScore += 18; // Below 75 is concerning
  else if (overallAverage < 80) riskScore += 9;
  else if (overallAverage < 85) riskScore += 4;
  else riskScore += 0;

  // Subject-specific grades (15% weight): Lower subject average = higher risk
  if (subjectAverage < 50) riskScore += 15;
  else if (subjectAverage < 60) riskScore += 12;
  else if (subjectAverage < 70) riskScore += 8;
  else if (subjectAverage < 80) riskScore += 4;
  else riskScore += 0;

  // SPECIAL LOGIC: High attendance with low grades - concerning pattern
  // Students with >90% attendance but <75 average
  // This indicates attendance without engagement/learning
  if (attendanceRate >= 90 && overallAverage < 75) {
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
  // Overall average (45% weight): Lower average = higher risk - CRITICAL FACTOR
  if (overallAverage < 50) riskScore += 45;
  else if (overallAverage < 60) riskScore += 36;
  else if (overallAverage < 70) riskScore += 27;
  else if (overallAverage < 75) riskScore += 18; // Below 75 is concerning
  else if (overallAverage < 80) riskScore += 9;
  else if (overallAverage < 85) riskScore += 4;
  else riskScore += 0;

  const subjectAverage = (subjectGrades.mathematics + subjectGrades.english + subjectGrades.science) / 3;
  // Subject-specific grades (15% weight): Lower subject average = higher risk
  if (subjectAverage < 50) riskScore += 15;
  else if (subjectAverage < 60) riskScore += 12;
  else if (subjectAverage < 70) riskScore += 8;
  else if (subjectAverage < 80) riskScore += 4;
  else riskScore += 0;

  // SPECIAL LOGIC: High attendance with low grades - concerning pattern
  // Students with >90% attendance but <75 average
  // This indicates attendance without engagement/learning
  if (attendanceRate >= 90 && overallAverage < 75) {
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

/**
 * Automatically calculate risk scores for all students across all terms and years
 * This ensures historical data is available for analytics
 */
export async function calculateAllHistoricalRiskScores(yearsBack: number = 2): Promise<{ success: number; failed: number; total: number }> {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearsBack;
    const terms = ['1st Term', '2nd Term', '3rd Term'];
    
    // Get all students
    const students = await Student.find({});
    const totalStudents = students.length;
    let successCount = 0;
    let failedCount = 0;
    
    console.log(`Starting historical risk score calculation for ${totalStudents} students across ${yearsBack + 1} years...`);
    
    for (const student of students) {
      for (let year = startYear; year <= currentYear; year++) {
        const yearStr = year.toString();
        
        for (const term of terms) {
          try {
            // Calculate risk score for this student, term, and year
            const riskCalculation = await calculateRiskScore(student._id.toString(), term, yearStr);
            
            // Check if a risk score already exists
            const existingRiskScore = await RiskScore.findOne({
              student_id: student._id.toString(),
              term: term,
              year: yearStr
            });
            
            // Generate appropriate prediction date based on term
            let predictionDate: Date;
            switch (term) {
              case '1st Term':
                predictionDate = new Date(year, 9, 15); // Mid-September
                break;
              case '2nd Term':
                predictionDate = new Date(year, 0, 15); // Mid-January
                break;
              case '3rd Term':
                predictionDate = new Date(year, 6, 15); // Mid-July
                break;
              default:
                predictionDate = new Date();
            }
            
            if (existingRiskScore) {
              // Update existing risk score
              await RiskScore.findByIdAndUpdate(existingRiskScore._id, {
                risk_level: riskCalculation.riskLevel,
                risk_score: riskCalculation.riskScore,
                attendance_factor: riskCalculation.attendanceFactor,
                academic_factor: riskCalculation.academicFactor,
                detailed_factors: riskCalculation.detailedFactors,
                prediction_date: predictionDate,
              });
            } else {
              // Create new risk score
              await RiskScore.create({
                student_id: student._id.toString(),
                risk_level: riskCalculation.riskLevel,
                risk_score: riskCalculation.riskScore,
                confidence: 85,
                term: term,
                year: yearStr,
                attendance_factor: riskCalculation.attendanceFactor,
                academic_factor: riskCalculation.academicFactor,
                behavior_factor: 50,
                model_version: '2.0.0',
                detailed_factors: riskCalculation.detailedFactors,
                prediction_date: predictionDate,
              });
            }
            
            successCount++;
          } catch (error) {
            console.error(`Error calculating risk score for student ${student._id} in ${term} ${yearStr}:`, error);
            failedCount++;
          }
        }
      }
    }
    
    const totalCalculations = totalStudents * (yearsBack + 1) * 3; // students * years * 3 terms
    
    console.log(`Historical risk score calculation completed: ${successCount}/${totalCalculations} successful, ${failedCount} failed`);
    
    return {
      success: successCount,
      failed: failedCount,
      total: totalCalculations
    };
  } catch (error) {
    console.error('Error in bulk historical risk score calculation:', error);
    throw error;
  }
}
