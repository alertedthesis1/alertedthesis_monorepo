import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Report } from './models/Report';
import { Student } from './models/Student';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testAllReportTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const student = await Student.findOne();
    if (!student) {
      console.error('❌ No student found');
      process.exit(1);
    }

    const reportTypes = ['Attendance', 'Academic', 'Behavioral', 'Risk', 'Intervention'];
    const studentName = `${student.first_name} ${student.last_name}`;

    console.log(`\n🧪 Testing report generation for all types for student: ${studentName}\n`);

    for (const reportType of reportTypes) {
      try {
        const response = await fetch('http://localhost:5000/api/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: reportType,
            student_id: student._id.toString(),
            generated_by: 'test@example.com',
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          console.log(`✅ ${reportType} Report generated successfully`);
          console.log(`   Title: ${data.data.title}`);
          console.log(`   Status: ${data.data.status}`);
          
          // Show a sample of the data
          const dataKeys = Object.keys(data.data.data || {});
          console.log(`   Data fields: ${dataKeys.slice(0, 5).join(', ')}${dataKeys.length > 5 ? '...' : ''}`);
        } else {
          const error: any = await response.json();
          console.log(`❌ ${reportType} Report generation failed: ${error.error}`);
        }
      } catch (error) {
        console.log(`❌ ${reportType} Report generation error: ${error}`);
      }
    }

    console.log('\n✅ All report type tests completed');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAllReportTypes();