import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { Student } from './models/Student';
import { Attendance } from './models/Attendance';
import { AcademicRecord } from './models/AcademicRecord';
import { updateRiskScoreForStudent } from './services/riskCalculationService';
import { notificationService } from './services/notificationService';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alerted';

// Philippine school calendar term definitions (updated to specific weeks)
interface TermDefinition {
  startMonth: number;
  startWeek: number; // Week of month (1-based)
  endMonth: number;
  endWeek: number; // Week of month (1-based)
  startYearOffset?: number; // Offset for start year (for terms that start in next calendar year)
  endYearOffset?: number; // Offset for end year (for terms that end in next calendar year)
}

const TERM_DEFINITIONS: Record<string, TermDefinition> = {
  '1st Term': { startMonth: 5, startWeek: 2, endMonth: 8, endWeek: 2 }, // 2nd week June to 2nd week September
  '2nd Term': { startMonth: 8, startWeek: 3, endMonth: 11, endWeek: 2 }, // 3rd week September to 2nd week December
  '3rd Term': { startMonth: 0, startWeek: 2, endMonth: 3, endWeek: 1, startYearOffset: 1, endYearOffset: 1 }, // 2nd week January to 1st week April (next calendar year)
};

/**
 * Get date range for a given term and year
 */
function getTermDateRange(term: string, year: number): { startDate: Date; endDate: Date } {
  const termDef = TERM_DEFINITIONS[term];
  if (!termDef) {
    throw new Error(`Invalid term: ${term}`);
  }

  // Calculate start date (week of month) with year offset if specified
  const startYear = termDef.startYearOffset ? year + termDef.startYearOffset : year;
  const startDate = new Date(startYear, termDef.startMonth, 1);
  const startDayOfWeek = startDate.getDay();
  const daysToAdd = (termDef.startWeek - 1) * 7 + (1 - startDayOfWeek + 7) % 7;
  startDate.setDate(startDate.getDate() + daysToAdd);

  // Calculate end date (week of month) with year offset if specified
  const endYear = termDef.endYearOffset ? year + termDef.endYearOffset : year;
  const endDate = new Date(endYear, termDef.endMonth, 1);
  const endDayOfWeek = endDate.getDay();
  const endDaysToAdd = (termDef.endWeek - 1) * 7 + (6 - endDayOfWeek + 7) % 7;
  endDate.setDate(endDate.getDate() + endDaysToAdd);

  // Set times to midnight
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * Generate all weekdays for a given date range (GMT+8)
 */
function generateWeekdays(startDate: Date, endDate: Date, maxDate?: Date): Date[] {
  const weekdays: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday, so we want 1-5 (Monday-Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Don't include future dates beyond maxDate
      if (!maxDate || currentDate <= maxDate) {
        weekdays.push(new Date(currentDate));
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return weekdays;
}

/**
 * Generate realistic attendance pattern for a student
 * Returns a record for each weekday with present/absent status
 */
function generateAttendancePattern(weekdays: Date[], studentId: string, isHighRisk: boolean = false): any[] {
  const attendanceRecords: any[] = [];
  
  // Base attendance rate - vary by student to create realistic patterns
  // High-risk students have lower attendance rates (50-70%)
  // Normal students have higher attendance rates (80-95%)
  const baseAttendanceRate = isHighRisk 
    ? 0.50 + Math.random() * 0.20  // 50-70% for high-risk
    : 0.80 + Math.random() * 0.15; // 80-95% for normal
  
  // Some students have patterns of consecutive absences
  // High-risk students are more likely to have consecutive absences
  const hasConsecutiveAbsences = isHighRisk 
    ? Math.random() < 0.70  // 70% chance for high-risk
    : Math.random() < 0.30; // 30% chance for normal
  
  let consecutiveAbsenceStart = -1;
  let consecutiveAbsenceLength = 0;
  
  if (hasConsecutiveAbsences) {
    consecutiveAbsenceStart = Math.floor(Math.random() * (weekdays.length - 10));
    // High-risk students have longer consecutive absences
    consecutiveAbsenceLength = isHighRisk
      ? 7 + Math.floor(Math.random() * 5) // 7-11 consecutive absences for high-risk
      : 5 + Math.floor(Math.random() * 3); // 5-7 consecutive absences for normal
  }

  weekdays.forEach((date, index) => {
    let present = true;
    
    // Check if this date should be part of consecutive absences
    if (hasConsecutiveAbsences && 
        index >= consecutiveAbsenceStart && 
        index < consecutiveAbsenceStart + consecutiveAbsenceLength) {
      present = false;
    } else {
      // Random attendance based on base rate
      present = Math.random() < baseAttendanceRate;
    }

    attendanceRecords.push({
      student_id: studentId,
      attendance_date: date,
      present,
      excused_absent: !present && Math.random() < 0.2, // 20% of absences are excused
      course_code: 'GENERAL',
      course_name: 'General Attendance',
      subject: 'General',
    });
  });

  return attendanceRecords;
}

/**
 * Generate realistic academic grades for a student
 */
function generateAcademicGrades(isHighRisk: boolean = false): { mathematics: number; english: number; science: number; overall: number } {
  // Generate grades with some correlation (students who do well in one subject tend to do well in others)
  // High-risk students have lower grades (60-75), normal students have higher grades (70-95)
  const basePerformance = isHighRisk
    ? 60 + Math.random() * 15  // 60-75 for high-risk
    : 70 + Math.random() * 25; // 70-95 for normal
  
  const mathematics = Math.min(95, Math.max(60, basePerformance + (Math.random() - 0.5) * 10));
  const english = Math.min(95, Math.max(60, basePerformance + (Math.random() - 0.5) * 10));
  const science = Math.min(95, Math.max(60, basePerformance + (Math.random() - 0.5) * 10));
  
  const overall = Math.round((mathematics + english + science) / 3);

  return {
    mathematics: Math.round(mathematics),
    english: Math.round(english),
    science: Math.round(science),
    overall,
  };
}

/**
 * Seed attendance and academic records for all students
 */
async function seedAttendanceAndAcademics() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete all existing attendance records
    console.log('Deleting existing attendance records...');
    const attendanceDeleteResult = await Attendance.deleteMany({});
    console.log(`Deleted ${attendanceDeleteResult.deletedCount} existing attendance records`);

    // Delete all existing academic records for the terms we're seeding
    console.log('Deleting existing academic records for target terms...');
    const termsToDelete = ['1st Term', '2nd Term', '3rd Term'];
    const yearsToDelete = ['2025', '2026'];
    const academicDeleteResult = await AcademicRecord.deleteMany({
      term: { $in: termsToDelete },
      year: { $in: yearsToDelete }
    });
    console.log(`Deleted ${academicDeleteResult.deletedCount} existing academic records`);

    // Fetch all students
    const students = await Student.find().exec();
    console.log(`Found ${students.length} students`);

    // Mark some students as high-risk (about 20% of students)
    const highRiskStudentIds = new Set<string>();
    const numHighRiskStudents = Math.max(3, Math.floor(students.length * 0.2)); // At least 3 or 20%
    
    // Randomly select students to be high-risk
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numHighRiskStudents; i++) {
      highRiskStudentIds.add(shuffledStudents[i]._id.toString());
    }
    
    console.log(`Marked ${numHighRiskStudents} students as high-risk`);

    // Define terms to seed (only 1st, 2nd, 3rd term of 2025 and 1st, 2nd term of 2026)
    const termsToSeed = [
      { term: '1st Term', year: '2025' },
      { term: '2nd Term', year: '2025' },
      { term: '3rd Term', year: '2025' },
      { term: '1st Term', year: '2026' },
      { term: '2nd Term', year: '2026' },
    ];

    // Get current date for future date filtering
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let totalAttendanceCreated = 0;
    let totalAcademicsCreated = 0;
    let consecutiveAbsenceAlerts = 0;
    let totalAttendanceDeleted = attendanceDeleteResult.deletedCount;
    let totalAcademicsDeleted = academicDeleteResult.deletedCount;

    for (const { term, year } of termsToSeed) {
      console.log(`\nProcessing ${term} ${year}...`);
      
      const yearNum = parseInt(year);
      const { startDate, endDate } = getTermDateRange(term, yearNum);
      
      // Use current date as max date to avoid future attendance
      const maxDate = (term === '2nd Term' && year === '2026') ? now : undefined;
      const weekdays = generateWeekdays(startDate, endDate, maxDate);
      
      console.log(`  Term date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
      console.log(`  Total weekdays: ${weekdays.length}`);

      // Skip if no weekdays in range (for future terms)
      if (weekdays.length === 0) {
        console.log(`  Skipping ${term} ${year} - no valid weekdays`);
        continue;
      }

      try {
        // Bulk insert arrays
        const attendanceBulkInserts: any[] = [];
        const academicBulkInserts: any[] = [];

        for (const student of students) {
          const isHighRisk = highRiskStudentIds.has(student._id.toString());
          
          // Generate attendance records
          const attendancePattern = generateAttendancePattern(weekdays, student._id.toString(), isHighRisk);
          attendanceBulkInserts.push(...attendancePattern);

          // Generate academic record
          const grades = generateAcademicGrades(isHighRisk);
          
          academicBulkInserts.push({
            student_id: student._id,
            term,
            year,
            mathematics_grade: grades.mathematics,
            english_grade: grades.english,
            science_grade: grades.science,
            overall_average: grades.overall,
          });
        }

        // Bulk insert attendance records in smaller batches
        if (attendanceBulkInserts.length > 0) {
          const batchSize = 1000;
          for (let i = 0; i < attendanceBulkInserts.length; i += batchSize) {
            const batch = attendanceBulkInserts.slice(i, i + batchSize);
            await Attendance.insertMany(batch);
            totalAttendanceCreated += batch.length;
          }
          console.log(`  Inserted ${attendanceBulkInserts.length} attendance records`);
        }

        // Bulk insert academic records
        if (academicBulkInserts.length > 0) {
          await AcademicRecord.insertMany(academicBulkInserts);
          totalAcademicsCreated += academicBulkInserts.length;
          console.log(`  Inserted ${academicBulkInserts.length} academic records`);
        }

        // Check for consecutive absences and create alerts, and update risk scores
        for (const student of students) {
          // Check for consecutive absences and create alerts
          try {
            const { count, dates } = await notificationService.checkConsecutiveAbsences(student._id.toString());
            if (count >= 5) {
              await notificationService.createConsecutiveAbsenceAlert(student._id.toString(), count, dates);
              consecutiveAbsenceAlerts++;
              console.log(`  Created consecutive absence alert for ${student.first_name} ${student.last_name} (${count} absences)`);
            }
          } catch (error) {
            console.error(`  Error checking consecutive absences for ${student.first_name} ${student.last_name}:`, error);
          }

          // Update risk score for the student
          try {
            await updateRiskScoreForStudent(student._id.toString());
          } catch (error) {
            console.error(`  Error updating risk score for ${student.first_name} ${student.last_name}:`, error);
          }
        }

        console.log(`  Completed ${term} ${year}`);
        
        // Force garbage collection between terms to free memory
        if (typeof global.gc === 'function') {
          global.gc();
        }
      } catch (error) {
        console.error(`  Error processing ${term} ${year}:`, error);
        // Continue with next term even if this one fails
      }
    }

    console.log(`\n========================================`);
    console.log(`Seeding Complete!`);
    console.log(`========================================`);
    console.log(`Attendance Records:`);
    console.log(`  Deleted: ${totalAttendanceDeleted}`);
    console.log(`  Created: ${totalAttendanceCreated}`);
    console.log(`Academic Records:`);
    console.log(`  Deleted: ${totalAcademicsDeleted}`);
    console.log(`  Created: ${totalAcademicsCreated}`);
    console.log(`Consecutive Absence Alerts: ${consecutiveAbsenceAlerts}`);
    console.log(`========================================`);

  } catch (error) {
    console.error('Error seeding attendance and academics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedAttendanceAndAcademics();