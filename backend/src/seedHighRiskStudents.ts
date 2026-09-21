import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from './models/Student';
import { AcademicRecord } from './models/AcademicRecord';
import { Attendance } from './models/Attendance';
import { calculateRiskScore } from './services/riskCalculationService';
import { RiskScore } from './models/RiskScore';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function seedHighRiskStudents() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Create high-risk students with poor academic performance
    const highRiskStudents = [
      {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        email: 'juan.delacruz@sjc.edu.ph',
        grade_level: 'Grade 10',
        section: 'Section A',
        enrollment_date: new Date('2023-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 4,
        phone: '09171234567',
        address: '123 Main St, Manila',
        guardian_name: 'Maria Dela Cruz',
        guardian_relation: 'Mother',
        guardian_phone: '09181234567',
      },
      {
        first_name: 'Ana',
        last_name: 'Reyes',
        email: 'ana.reyes@sjc.edu.ph',
        grade_level: 'Grade 9',
        section: 'Section B',
        enrollment_date: new Date('2023-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 3,
        phone: '09172345678',
        address: '456 Oak Ave, Quezon City',
        guardian_name: 'Jose Reyes',
        guardian_relation: 'Father',
        guardian_phone: '09182345678',
      },
      {
        first_name: 'Carlos',
        last_name: 'Santos',
        email: 'carlos.santos@sjc.edu.ph',
        grade_level: 'Grade 8',
        section: 'Section C',
        enrollment_date: new Date('2023-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 2,
        phone: '09173456789',
        address: '789 Pine Rd, Makati',
        guardian_name: 'Elena Santos',
        guardian_relation: 'Mother',
        guardian_phone: '09183456789',
      },
    ];

    for (const studentData of highRiskStudents) {
      // Check if student already exists
      const existingStudent = await Student.findOne({ email: studentData.email });
      if (existingStudent) {
        console.log(`⚠️  Student ${studentData.email} already exists, skipping...`);
        continue;
      }

      // Create student
      const student = await Student.create(studentData);
      console.log(`✅ Created student: ${student.first_name} ${student.last_name}`);

      // Create poor academic records
      const academicRecord = await AcademicRecord.create({
        student_id: student._id,
        term: '1st Term',
        year: '2026',
        mathematics_grade: 45,
        english_grade: 52,
        science_grade: 48,
        overall_average: 48.3,
        gpa: 1.83,
        major_subjects_enrolled: 8,
        major_subjects_passed: 4,
        major_subjects_failed: 4,
        total_units: 24,
      });
      console.log(`✅ Created academic record for ${student.first_name}`);

      // Create poor attendance records (last 45 days)
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        // Create attendance with high absence rate (only 40% present)
        const present = Math.random() < 0.4;
        await Attendance.create({
          student_id: student._id,
          attendance_date: date,
          present,
          subject: 'General',
          excused_absent: false,
        });
      }
      console.log(`✅ Created attendance records for ${student.first_name}`);

      // Calculate risk score
      const riskCalculation = await calculateRiskScore(String(student._id));
      console.log(`📊 Risk score for ${student.first_name}: ${riskCalculation.riskScore} (${riskCalculation.riskLevel})`);

      // Save risk score
      const riskScore = await RiskScore.create({
        student_id: student._id,
        risk_level: riskCalculation.riskLevel,
        risk_score: riskCalculation.riskScore,
        confidence: 85,
        attendance_factor: riskCalculation.attendanceFactor,
        academic_factor: riskCalculation.academicFactor,
        behavior_factor: 50,
        model_version: '2.0.0',
        detailed_factors: riskCalculation.detailedFactors,
      });
      console.log(`✅ Saved risk score for ${student.first_name}`);
    }

    console.log('🎉 High-risk students seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding high-risk students:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedHighRiskStudents();