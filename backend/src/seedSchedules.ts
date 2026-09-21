import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { Intervention } from './models/Intervention';
import { Schedule } from './models/Schedule';
import { Student } from './models/Student';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alerted';

async function seedSchedules() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch all interventions
    const interventions = await Intervention.find().exec();

    console.log(`Found ${interventions.length} interventions`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const intervention of interventions) {
      // Check if schedule already exists for this intervention
      const existingSchedule = await Schedule.findOne({
        student_id: intervention.student_id,
        date: intervention.start_date,
      });

      // Set schedule status based on intervention status
      const scheduleStatus = intervention.status === 'Completed' ? 'Completed' : 'Scheduled';

      if (existingSchedule) {
        // Update existing schedule status and intervention_id
        const needsUpdate = 
          existingSchedule.status !== scheduleStatus ||
          existingSchedule.intervention_id !== (intervention as any).intervention_id;
        
        if (needsUpdate) {
          existingSchedule.status = scheduleStatus;
          existingSchedule.intervention_id = (intervention as any).intervention_id;
          await existingSchedule.save();
          console.log(`Updated schedule for student ${intervention.student_id} on ${intervention.start_date} - status: ${scheduleStatus}, intervention_id: ${(intervention as any).intervention_id}`);
          createdCount++;
        } else {
          console.log(`Schedule already up to date for student ${intervention.student_id} on ${intervention.start_date}`);
          skippedCount++;
        }
        continue;
      }

      // Fetch student to get name
      const student = await Student.findById(intervention.student_id);
      if (!student) {
        console.log(`Student not found for intervention ${intervention._id}`);
        skippedCount++;
        continue;
      }

      const studentName = `${student.first_name} ${student.last_name}`;

      const schedule = new Schedule({
        student_id: intervention.student_id,
        student_name: studentName,
        date: intervention.start_date,
        time: '09:00', // Default time, can be adjusted
        type: intervention.intervention_type,
        status: scheduleStatus,
        notes: intervention.description,
        intervention_id: (intervention as any).intervention_id,
        created_by: 'System',
      });

      await schedule.save();
      createdCount++;
      console.log(`Created schedule for ${studentName} on ${intervention.start_date} with intervention_id: ${(intervention as any).intervention_id}`);
    }

    console.log(`\nSeeding complete!`);
    console.log(`Created: ${createdCount} schedules`);
    console.log(`Skipped: ${skippedCount} schedules (already existed)`);
  } catch (error) {
    console.error('Error seeding schedules:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedSchedules();
