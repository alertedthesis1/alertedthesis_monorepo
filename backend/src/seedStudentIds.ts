import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from './models/Student';

dotenv.config();

function generateStudentId(): string {
  // Generate a random 8-digit number
  const min = 10000000;
  const max = 99999999;
  const randomId = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomId.toString();
}

async function ensureUniqueStudentId(): Promise<string> {
  let studentId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    studentId = generateStudentId();
    const existing = await Student.findOne({ student_id: studentId });
    if (!existing) {
      isUnique = true;
      return studentId;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique student ID after multiple attempts');
}

async function seedStudentIds() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all students without a student_id
    const studentsWithoutId = await Student.find({ student_id: { $exists: false } });
    console.log(`Found ${studentsWithoutId.length} students without student_id`);

    if (studentsWithoutId.length === 0) {
      console.log('All students already have student_id. No updates needed.');
      return;
    }

    let updatedCount = 0;
    for (const student of studentsWithoutId) {
      try {
        const studentId = await ensureUniqueStudentId();
        await Student.findByIdAndUpdate(student._id, { student_id: studentId });
        console.log(`✓ Assigned student_id ${studentId} to ${student.first_name} ${student.last_name}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Failed to assign student_id to ${student.first_name} ${student.last_name}:`, error);
      }
    }

    console.log(`\n✅ Successfully assigned student_id to ${updatedCount} students`);
  } catch (error) {
    console.error('❌ Error seeding student IDs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedStudentIds();
