import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Student } from './models/Student';
import { Attendance } from './models/Attendance';

dotenv.config();

async function seedAttendanceFromSept1() {
  try {
    // Set DNS servers to avoid connection issues
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });
    console.log('✅ Connected to MongoDB');

    const students = await Student.find({ status: 'Active' });
    console.log(`Found ${students.length} active students`);

    const startDate = new Date('2026-09-01');
    const endDate = new Date();
    let totalAttendanceRecords = 0;

    for (const student of students) {
      console.log(`Processing student: ${student.first_name} ${student.last_name}`);
      
      let currentDate = new Date(startDate);
      let studentRecords = 0;

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Check if attendance already exists for this date
          const existingAttendance = await Attendance.findOne({
            student_id: student._id,
            attendance_date: currentDate
          });

          if (!existingAttendance) {
            // Randomly determine if present (80% present rate)
            const isPresent = Math.random() > 0.2;
            
            const attendance = new Attendance({
              student_id: student._id,
              attendance_date: new Date(currentDate),
              present: isPresent,
              excused_absent: false,
              course_code: 'GENERAL',
              course_name: 'General Attendance'
            });

            await attendance.save();
            studentRecords++;
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`  Created ${studentRecords} attendance records for ${student.first_name} ${student.last_name}`);
      totalAttendanceRecords += studentRecords;
    }

    console.log(`\n✅ Successfully created ${totalAttendanceRecords} attendance records`);
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`👥 Students processed: ${students.length}`);

  } catch (error) {
    console.error('❌ Error seeding attendance:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedAttendanceFromSept1();