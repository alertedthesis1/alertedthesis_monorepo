import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from './models/Student';
import { Attendance } from './models/Attendance';
import { updateRiskScoreForStudent } from './services/riskCalculationService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Helper function to get term start date
function getTermStartDate(term: string, year: string): Date {
  const yearNum = parseInt(year);
  switch (term) {
    case '1st Term':
      return new Date(yearNum, 5, 1); // June 1st
    case '2nd Term':
      return new Date(yearNum, 8, 1); // September 1st
    case '3rd Term':
      return new Date(yearNum + 1, 0, 1); // January 1st of next year
    default:
      return new Date(yearNum, 5, 1);
  }
}

// Helper function to get term end date
function getTermEndDate(term: string, year: string): Date {
  const yearNum = parseInt(year);
  switch (term) {
    case '1st Term':
      return new Date(yearNum, 7, 31); // August 31st
    case '2nd Term':
      return new Date(yearNum, 10, 30); // November 30th
    case '3rd Term':
      return new Date(yearNum + 1, 2, 31); // March 31st of next year
    default:
      return new Date(yearNum, 7, 31);
  }
}

async function seedAttendanceForAllTerms() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students`);

    const terms = ['1st Term', '2nd Term', '3rd Term'];
    const years = ['2025', '2026'];

    let totalAttendanceRecords = 0;
    let updatedStudents = 0;

    for (const student of students) {
      console.log(`\n🔄 Processing ${student.first_name} ${student.last_name}...`);

      for (const year of years) {
        for (const term of terms) {
          const termStartDate = getTermStartDate(term, year);
          const termEndDate = getTermEndDate(term, year);

          // Check if attendance already exists for this term/year
          const existingAttendance = await Attendance.countDocuments({
            student_id: student._id,
            attendance_date: { $gte: termStartDate, $lte: termEndDate }
          });

          if (existingAttendance > 0) {
            console.log(`   ⏭️  Skipping ${term} ${year} - ${existingAttendance} records already exist`);
            continue;
          }

          // Generate attendance records for the term (all weekdays in the term)
          const currentDate = new Date(termStartDate);
          const attendanceRecords = [];

          while (currentDate <= termEndDate) {
            const dayOfWeek = currentDate.getDay();

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              // Vary attendance rate based on student (60-95% attendance)
              const attendanceRate = 0.6 + Math.random() * 0.35;
              const present = Math.random() < attendanceRate;

              attendanceRecords.push({
                student_id: student._id,
                attendance_date: new Date(currentDate),
                present,
                subject: 'General',
                excused_absent: !present && Math.random() < 0.3, // 30% of absences are excused
              });
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }

          if (attendanceRecords.length > 0) {
            await Attendance.insertMany(attendanceRecords);
            totalAttendanceRecords += attendanceRecords.length;
            console.log(`   ✅ Created ${attendanceRecords.length} attendance records for ${term} ${year}`);
          }
        }
      }

      // Recalculate risk scores for all terms/years
      for (const year of years) {
        for (const term of terms) {
          try {
            await updateRiskScoreForStudent(String(student._id), term, year);
          } catch (err) {
            // Skip if no academic data exists for this term/year
            continue;
          }
        }
      }

      updatedStudents++;
    }

    console.log(`\n🎉 Attendance seeding complete!`);
    console.log(`   ✅ Total attendance records created: ${totalAttendanceRecords}`);
    console.log(`   ✅ Students processed: ${updatedStudents}`);
    console.log(`   ✅ Risk scores recalculated for all terms/years`);
  } catch (error) {
    console.error('❌ Error seeding attendance data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedAttendanceForAllTerms();
