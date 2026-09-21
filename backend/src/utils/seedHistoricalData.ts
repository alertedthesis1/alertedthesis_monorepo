import { Student } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';

interface HistoricalDataResult {
  success: boolean;
  message: string;
  studentsProcessed: number;
  academicRecordsCreated: number;
  attendanceRecordsCreated: number;
  recordsDeleted: number;
}

/**
 * Seed historical data for all students for the years 2025, 2026
 * 2025: 1st Term, 2nd Term, 3rd Term
 * 2026: 1st Term only
 * Ensures all students have complete academic and attendance history
 */
export async function seedHistoricalData(): Promise<HistoricalDataResult> {
  try {
    const students = await Student.find({});
    const years = ['2025', '2026'];
    const terms = ['1st Term', '2nd Term', '3rd Term'];

    let academicRecordsCreated = 0;
    let attendanceRecordsCreated = 0;
    let recordsDeleted = 0;

    // Delete all existing academic and attendance records for the target years/terms
    console.log('Deleting existing records for 2025 (all terms) and 2026 (1st term only)...');
    const deleted2025Academic = await AcademicRecord.deleteMany({ year: '2025' });
    const deleted2026Academic = await AcademicRecord.deleteMany({
      year: '2026',
      term: '1st Term'
    });

    // Delete ALL attendance records to ensure clean slate with correct dates
    const deletedAttendance = await Attendance.deleteMany({});

    recordsDeleted += deleted2025Academic.deletedCount || 0;
    recordsDeleted += deleted2026Academic.deletedCount || 0;
    recordsDeleted += deletedAttendance.deletedCount || 0;
    console.log(`Deleted ${deleted2025Academic.deletedCount} academic records for 2025`);
    console.log(`Deleted ${deleted2026Academic.deletedCount} academic records for 2026 1st term`);
    console.log(`Deleted ${deletedAttendance.deletedCount} attendance records (all)`);
    
    console.log(`Processing ${students.length} students for historical data...`);
    
    for (const student of students) {
      // Determine if this should be a high-risk student (30% chance)
      const isHighRisk = Math.random() < 0.3;

      for (const year of years) {
        for (const term of terms) {
          // Skip 2nd and 3rd term for 2026 (only 1st Term)
          if (year === '2026' && (term === '2nd Term' || term === '3rd Term')) {
            continue;
          }
          // Generate academic record
          const existingAcademic = await AcademicRecord.findOne({
            student_id: student._id,
            term,
            year
          });
          
          if (!existingAcademic) {
            // Generate grades based on risk level
            let mathGrade, englishGrade, scienceGrade;
            
            if (isHighRisk) {
              // High risk students: grades between 60-70
              mathGrade = Math.floor(Math.random() * 11) + 60; // 60-70
              englishGrade = Math.floor(Math.random() * 11) + 60; // 60-70
              scienceGrade = Math.floor(Math.random() * 11) + 60; // 60-70
            } else {
              // Normal students: grades between 70-95
              mathGrade = Math.floor(Math.random() * 26) + 70; // 70-95
              englishGrade = Math.floor(Math.random() * 26) + 70; // 70-95
              scienceGrade = Math.floor(Math.random() * 26) + 70; // 70-95
            }
            
            const overallAverage = ((mathGrade + englishGrade + scienceGrade) / 3).toFixed(1);
            
            // Calculate GPA based on average
            const avgGrade = parseFloat(overallAverage);
            let gpa = 0;
            if (avgGrade >= 90) gpa = 4.0;
            else if (avgGrade >= 80) gpa = 3.0 + (avgGrade - 80) / 10;
            else if (avgGrade >= 70) gpa = 2.0 + (avgGrade - 70) / 10;
            else if (avgGrade >= 60) gpa = 1.0 + (avgGrade - 60) / 10;
            else gpa = 0.0;
            
            // Calculate major subjects passed/failed
            const passedSubjects = [mathGrade, englishGrade, scienceGrade].filter(g => g >= 75).length;
            const failedSubjects = 3 - passedSubjects;
            
            await AcademicRecord.create({
              student_id: student._id,
              term,
              year,
              mathematics_grade: mathGrade,
              english_grade: englishGrade,
              science_grade: scienceGrade,
              overall_average: parseFloat(overallAverage),
              gpa: parseFloat(gpa.toFixed(2)),
              major_subjects_enrolled: 3,
              major_subjects_passed: passedSubjects,
              major_subjects_failed: failedSubjects,
              total_units: 9,
              major_subject_grades: [
                { subject: 'Mathematics', grade: mathGrade, date: new Date(parseInt(year), term === '1st Term' ? 5 : term === '2nd Term' ? 8 : 0, 1) },
                { subject: 'English', grade: englishGrade, date: new Date(parseInt(year), term === '1st Term' ? 5 : term === '2nd Term' ? 8 : 0, 1) },
                { subject: 'Science', grade: scienceGrade, date: new Date(parseInt(year), term === '1st Term' ? 5 : term === '2nd Term' ? 8 : 0, 1) },
              ],
            });
            
            academicRecordsCreated++;
            console.log(`Created academic record for ${student.first_name} ${student.last_name} - ${term} ${year}`);
          }
          
          // Generate attendance records for the term
          const termStartDate = getTermStartDate(term, year);
          const termEndDate = getTermEndDate(term, year);

          if (termStartDate && termEndDate) {
            const existingAttendanceCount = await Attendance.countDocuments({
              student_id: student._id,
              attendance_date: { $gte: termStartDate, $lte: termEndDate }
            });

            if (existingAttendanceCount === 0) {
              // Generate attendance for each school day in the term
              const currentDate = new Date(termStartDate);
              let attendanceForTerm = 0;

              while (currentDate <= termEndDate) {
                const dayOfWeek = currentDate.getDay();

                // Skip weekends (0 = Sunday, 6 = Saturday)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                  // Generate attendance based on risk level
                  let present;
                  if (isHighRisk) {
                    // High risk students: 60-70% attendance
                    present = Math.random() < 0.65;
                  } else {
                    // Normal students: 80-95% attendance
                    present = Math.random() < 0.88;
                  }

                  await Attendance.create({
                    student_id: student._id,
                    attendance_date: new Date(currentDate),
                    present,
                    subject: 'General',
                    excused_absent: false,
                  });

                  attendanceForTerm++;
                }

                currentDate.setDate(currentDate.getDate() + 1);
              }

              attendanceRecordsCreated += attendanceForTerm;
              console.log(`Created ${attendanceForTerm} attendance records for ${student.first_name} ${student.last_name} - ${term} ${year}`);
            }
          }
        }
      }
    }
    
    return {
      success: true,
      message: `Successfully seeded historical data for ${students.length} students`,
      studentsProcessed: students.length,
      academicRecordsCreated,
      attendanceRecordsCreated,
      recordsDeleted,
    };
  } catch (error) {
    console.error('Error seeding historical data:', error);
    return {
      success: false,
      message: `Error seeding historical data: ${error}`,
      studentsProcessed: 0,
      academicRecordsCreated: 0,
      attendanceRecordsCreated: 0,
      recordsDeleted: 0,
    };
  }
}

// Helper function to get term start date
function getTermStartDate(term: string, year: string): Date | null {
  const yearNum = parseInt(year);
  switch (term) {
    case '1st Term':
      return new Date(yearNum, 5, 1); // June 1st
    case '2nd Term':
      return new Date(yearNum, 8, 1); // September 1st
    case '3rd Term':
      return new Date(yearNum + 1, 0, 1); // January 1st of next year
    default:
      return null;
  }
}

// Helper function to get term end date
function getTermEndDate(term: string, year: string): Date | null {
  const yearNum = parseInt(year);
  switch (term) {
    case '1st Term':
      return new Date(yearNum, 7, 31); // August 31st
    case '2nd Term':
      return new Date(yearNum, 10, 30); // November 30th
    case '3rd Term':
      return new Date(yearNum + 1, 2, 31); // March 31st of next year
    default:
      return null;
  }
}