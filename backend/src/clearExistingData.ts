import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Schedule } from './models/Schedule';
import { Intervention } from './models/Intervention';
import { Task } from './models/Task';

dotenv.config();

// FIX: Use Google DNS for resolution since local DNS cannot resolve MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function clearExistingData() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Clear all existing data
    const scheduleCount = await Schedule.countDocuments();
    const interventionCount = await Intervention.countDocuments();
    const taskCount = await Task.countDocuments();

    console.log(`📊 Current data:`);
    console.log(`  - Schedules: ${scheduleCount}`);
    console.log(`  - Interventions: ${interventionCount}`);
    console.log(`  - Tasks: ${taskCount}`);

    // Delete all documents
    await Schedule.deleteMany({});
    await Intervention.deleteMany({});
    await Task.deleteMany({});

    console.log('✅ Cleared all existing schedules, interventions, and tasks');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

clearExistingData();