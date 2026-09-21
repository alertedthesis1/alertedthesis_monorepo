import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Attendance } from './models/Attendance';

dotenv.config();

async function clearAttendanceCollection() {
  try {
    // Set DNS servers like the main server does
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
    console.log('✅ Connected to MongoDB Atlas');

    const result = await Attendance.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} attendance records`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAttendanceCollection();
