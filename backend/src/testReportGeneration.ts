import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Report } from './models/Report';
import { Student } from './models/Student';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testReportGeneration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const student = await Student.findOne();
    if (!student) {
      console.error('❌ No student found');
      process.exit(1);
    }

    const report = await Report.create({
      title: 'Test Attendance Report',
      report_type: 'Attendance',
      description: 'Test report for CSV download',
      student_id: student._id,
      generated_by: 'test@example.com',
      status: 'Generated',
      data: {
        student_name: `${student.first_name} ${student.last_name}`,
        attendance_rate: 85,
        total_days: 20,
        present_days: 17,
        grade_level: student.grade_level,
        section: student.section
      }
    });

    console.log('✅ Test report created:', report._id);
    console.log('Report title:', report.title);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReportGeneration();