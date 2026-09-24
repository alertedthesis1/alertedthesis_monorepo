import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from './models/Student';
import { RiskScore } from './models/RiskScore';
import { Intervention } from './models/Intervention';
import { Schedule } from './models/Schedule';
import { Task } from './models/Task';
import { User } from './models/User';
import { notificationService } from './services/notificationService';

dotenv.config();

// Helper function to generate intervention ID
async function generateInterventionId(interventionType: string): Promise<string> {
  const typePrefixMap: Record<string, string> = {
    'Mentoring': 'M',
    'Peer Tutoring': 'T',
    'Counseling/Coaching': 'C',
    'Parent Conference': 'P',
  };

  const prefix = typePrefixMap[interventionType] || 'X';
  const currentYear = new Date().getFullYear();

  const lastIntervention = await Intervention.findOne({
    intervention_id: new RegExp(`^${prefix}${currentYear}`),
  }).sort({ intervention_id: -1 });

  let nextNumber = 1;
  if (lastIntervention) {
    const lastNumber = parseInt(lastIntervention.intervention_id.slice(-5));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${currentYear}${String(nextNumber).padStart(5, '0')}`;
}

// Sample data for meeting details
const sampleMeetingDetails = {
  'Mentoring': [
    'Student showed great engagement in today\'s session. Discussed academic goals and created a study plan.',
    'Progress report: Student has improved time management skills. Completed all assigned tasks this week.',
    'Session focused on building confidence. Student participated actively in group activities.',
  ],
  'Peer Tutoring': [
    'Math tutoring session: Covered algebraic equations. Student demonstrated good understanding.',
    'Science review: Helped student with physics concepts. Homework completed successfully.',
    'English literature: Discussed novel themes. Student showed analytical thinking.',
  ],
  'Counseling/Coaching': [
    'Initial counseling session: Student opened up about personal challenges. Established trust.',
    'Follow-up session: Discussed coping strategies for stress. Student reported improvement.',
    'Family dynamics discussion: Explored communication patterns within family.',
  ],
  'Parent Conference': [
    'Family conference: Discussed student\'s academic progress. Parents engaged constructively.',
    'Mediation session: Addressed conflicts between student and family members.',
    'Behavioral plan review: Family agreed on consistent discipline approach.',
  ],
};

// Intervention types to use
const interventionTypes = ['Mentoring', 'Peer Tutoring', 'Counseling/Coaching', 'Parent Conference'];
const scheduleStatuses = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show'];
const taskPriorities = ['Low', 'Medium', 'High'];
const taskStatuses = ['Pending', 'In Progress', 'Completed'];

// Helper function to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random date in the next 30 days
function getRandomFutureDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
  return date;
}

// Helper function to get random time
function getRandomTime(): string {
  const hours = Math.floor(Math.random() * 9) + 8; // 8-16
  const minutes = Math.random() < 0.5 ? '00' : '30';
  return `${hours}:${minutes}`;
}

// Helper function to get random meeting details
function getRandomMeetingDetails(type: string): string {
  const details = sampleMeetingDetails[type as keyof typeof sampleMeetingDetails] || sampleMeetingDetails['Counseling/Coaching'];
  return getRandomItem(details);
}

export async function generateInterconnectedData() {
  try {
    console.log('Starting interconnected data generation...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alerted');
    console.log('Connected to database');

    // Get existing students
    const students = await Student.find({ status: 'Active' }).limit(10);
    console.log(`Found ${students.length} active students`);

    if (students.length === 0) {
      console.log('No active students found. Please seed students first.');
      process.exit(1);
    }

    // Get faculty user for notifications
    const faculty = await User.findOne({ role: 'faculty' });
    if (!faculty) {
      console.log('No faculty user found. Notifications will not be created.');
    }

    let interventionsCreated = 0;
    let schedulesCreated = 0;
    let tasksCreated = 0;
    let notificationsCreated = 0;

    // Generate interconnected data for each student
    for (const student of students) {
      console.log(`\n🔄 Processing student: ${student.first_name} ${student.last_name}`);

      // Get or create risk score for the student
      let riskScore = await RiskScore.findOne({ student_id: student._id });
      if (!riskScore) {
        riskScore = await RiskScore.create({
          student_id: student._id,
          overall_score: Math.floor(Math.random() * 40) + 30, // 30-70
          attendance_score: Math.floor(Math.random() * 40) + 30,
          academic_score: Math.floor(Math.random() * 40) + 30,
          behavior_score: Math.floor(Math.random() * 40) + 30,
          calculated_at: new Date(),
        });
        console.log(`  ✅ Created risk score for ${student.first_name}`);
      }

      // Create 1-2 interventions per student
      const numInterventions = Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < numInterventions; i++) {
        const interventionType = getRandomItem(interventionTypes);
        const interventionId = await generateInterventionId(interventionType);
        
        const intervention = new Intervention({
          intervention_id: interventionId,
          student_id: student._id,
          score_id: riskScore._id,
          intervention_type: interventionType,
          description: `${interventionType} intervention for ${student.first_name} ${student.last_name}`,
          start_date: new Date(),
          status: getRandomItem(['Active', 'Pending', 'Completed']),
          meeting_details: getRandomMeetingDetails(interventionType),
        });

        await intervention.save();
        interventionsCreated++;
        console.log(`  ✅ Created intervention: ${interventionId} (${interventionType})`);

        // Create notification for the intervention
        if (faculty) {
          await notificationService.createInterventionAlert(
            String(student._id),
            interventionType,
            faculty.email
          );
          notificationsCreated++;
          console.log(`  ✅ Created intervention notification`);
        }

        // Create 1-3 schedules per intervention
        const numSchedules = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < numSchedules; j++) {
          const scheduleDate = getRandomFutureDate();
          const scheduleTime = getRandomTime();
          const scheduleStatus = getRandomItem(scheduleStatuses);

          const schedule = new Schedule({
            student_id: student._id,
            student_name: `${student.first_name} ${student.last_name}`,
            date: scheduleDate,
            time: scheduleTime,
            type: interventionType,
            status: scheduleStatus,
            notes: `Schedule for ${interventionType} session`,
            created_by: faculty?.email || 'system',
            intervention_id: intervention._id,
          });

          await schedule.save();
          schedulesCreated++;
          console.log(`  ✅ Created schedule: ${scheduleDate.toISOString().split('T')[0]} at ${scheduleTime} (${scheduleStatus})`);

          // Create notification for the schedule
          if (faculty) {
            await notificationService.createScheduleNotification(
              String(student._id),
              interventionType,
              scheduleDate.toISOString().split('T')[0],
              scheduleTime,
              faculty.email
            );
            notificationsCreated++;
            console.log(`  ✅ Created schedule notification`);
          }

          // Create 1-2 tasks per schedule
          const numTasks = Math.floor(Math.random() * 2) + 1;

          for (let k = 0; k < numTasks; k++) {
            const task = new Task({
              title: `Follow-up for ${interventionType} session`,
              description: `Complete follow-up actions for ${interventionType} with ${student.first_name}`,
              student_id: student._id,
              assigned_to: faculty?._id,
              intervention_id: intervention._id,
              due_date: getRandomFutureDate(),
              priority: getRandomItem(taskPriorities),
              status: getRandomItem(taskStatuses),
            });

            await task.save();
            tasksCreated++;
            console.log(`  ✅ Created task: "${task.title}" (${task.status})`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Generation Summary:');
    console.log(`  Interventions created: ${interventionsCreated}`);
    console.log(`  Schedules created: ${schedulesCreated}`);
    console.log(`  Tasks created: ${tasksCreated}`);
    console.log(`  Notifications created: ${notificationsCreated}`);
    console.log('=' .repeat(50));
    console.log('✅ Interconnected data generation completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run the generation if called directly
if (require.main === module) {
  generateInterconnectedData();
}
