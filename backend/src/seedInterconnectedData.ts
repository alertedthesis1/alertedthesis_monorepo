import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Schedule } from './models/Schedule';
import { Intervention } from './models/Intervention';
import { Task } from './models/Task';
import { Student } from './models/Student';
import { RiskScore } from './models/RiskScore';

dotenv.config();

// FIX: Use Google DNS for resolution since local DNS cannot resolve MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function seedInterconnectedData() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Get students from database
    const students = await Student.find().limit(5);
    console.log(`📚 Found ${students.length} students`);

    if (students.length === 0) {
      console.error('❌ No students found in database. Please seed students first.');
      process.exit(1);
    }

    // Get or create risk scores for students
    const riskScores: any[] = [];
    for (const student of students) {
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
      }
      riskScores.push(riskScore);
    }

    console.log('📊 Risk scores ready');

    // Intervention type mappings
    const interventionTypes = ['Mentoring', 'Tutoring', 'Counseling', 'Family Meeting'];
    const scheduleTypes = ['Mentoring', 'Tutoring', 'Counseling', 'Family Meeting'];
    const statuses = ['Pending', 'Active', 'Completed', 'Cancelled'];
    const scheduleStatuses = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show'];
    const taskPriorities = ['Low', 'Medium', 'High'];
    const taskStatuses = ['Pending', 'In Progress', 'Completed'];

    // Create interconnected data for each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const riskScore = riskScores[i];
      const studentName = `${student.first_name} ${student.last_name}`;

      console.log(`\n🔄 Creating data for student: ${studentName}`);

      // Create 2-3 interventions per student
      const numInterventions = Math.floor(Math.random() * 2) + 2; // 2-3 interventions

      for (let j = 0; j < numInterventions; j++) {
        const interventionType = interventionTypes[Math.floor(Math.random() * interventionTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Generate intervention ID
        const typePrefixMap: Record<string, string> = {
          'Mentoring': 'M',
          'Tutoring': 'T',
          'Counseling': 'C',
          'Family Meeting': 'F',
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
        const interventionIdString = `${prefix}${currentYear}${String(nextNumber).padStart(5, '0')}`;

        // Create dates
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30)); // Random date within next 30 days
        const endDate = status === 'Completed' ? new Date(startDate) : undefined;
        if (endDate) {
          endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 7); // 7-21 days after start
        }

        // Create intervention
        const intervention = await Intervention.create({
          intervention_id: interventionIdString,
          student_id: student._id,
          score_id: riskScore._id,
          intervention_type: interventionType,
          description: `${interventionType} intervention for ${studentName} - Focus on academic improvement and behavioral support`,
          assigned_to: student._id, // Self-assigned for demo
          start_date: startDate,
          end_date: endDate,
          status: status,
          outcome: status === 'Completed' ? 'Successfully completed intervention' : undefined,
          meeting_details: status === 'Completed' ? 'Regular meetings held, progress observed' : undefined,
        });

        console.log(`  ✅ Created intervention: ${interventionIdString} (${interventionType}, ${status})`);

        // Create schedule connected to this intervention
        const scheduleDate = new Date(startDate);
        scheduleDate.setDate(scheduleDate.getDate() - 1); // Schedule one day before intervention starts
        const hours = Math.floor(Math.random() * 4) + 9; // 9-12
        const minutes = Math.random() < 0.5 ? '00' : '30';
        const time = `${hours}:${minutes}`;
        
        const scheduleStatus = status === 'Completed' ? 'Completed' : 
                              status === 'Cancelled' ? 'Cancelled' : 'Scheduled';

        const schedule = await Schedule.create({
          student_id: student._id,
          student_name: studentName,
          date: scheduleDate,
          time: time,
          type: interventionType,
          status: scheduleStatus,
          notes: `Scheduled for ${interventionType} session`,
          created_by: 'counselor@sjc.edu.ph',
          intervention_id: intervention._id, // Connect schedule to intervention
        });

        console.log(`  ✅ Created schedule: ${scheduleDate.toISOString().split('T')[0]} at ${time} (${scheduleStatus})`);

        // Update intervention with schedule reference
        await Intervention.findByIdAndUpdate(intervention._id, {
          schedule_id: schedule._id
        });

        // Create 2-4 tasks connected to this intervention
        const numTasks = Math.floor(Math.random() * 3) + 2; // 2-4 tasks

        for (let k = 0; k < numTasks; k++) {
          const taskPriority = taskPriorities[Math.floor(Math.random() * taskPriorities.length)];
          const taskStatus = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
          
          const taskDueDate = new Date(startDate);
          taskDueDate.setDate(taskDueDate.getDate() + Math.floor(Math.random() * 7) + 3); // 3-10 days after start

          const taskTitles = [
            'Complete assessment forms',
            'Attend counseling session',
            'Submit progress report',
            'Review academic performance',
            'Meet with assigned mentor',
            'Complete assigned readings',
            'Participate in group activities',
            'Update personal goals'
          ];

          const task = await Task.create({
            title: taskTitles[Math.floor(Math.random() * taskTitles.length)],
            description: `Task related to ${interventionType} intervention for ${studentName}`,
            student_id: student._id,
            assigned_to: student._id,
            intervention_id: intervention._id, // Connect task to intervention
            due_date: taskDueDate,
            priority: taskPriority,
            status: taskStatus,
            created_by: 'counselor@sjc.edu.ph',
          });

          console.log(`    ✅ Created task: ${task.title} (${taskPriority}, ${taskStatus})`);
        }
      }
    }

    // Display summary
    const scheduleCount = await Schedule.countDocuments();
    const interventionCount = await Intervention.countDocuments();
    const taskCount = await Task.countDocuments();

    console.log('\n📊 Data Creation Summary:');
    console.log(`  - Schedules: ${scheduleCount}`);
    console.log(`  - Interventions: ${interventionCount}`);
    console.log(`  - Tasks: ${taskCount}`);
    console.log('\n✅ Interconnected data seeded successfully!');
    console.log('\n🔗 Relationships:');
    console.log('  - Schedules → Interventions (via intervention_id)');
    console.log('  - Interventions → Schedules (via schedule_id)');
    console.log('  - Tasks → Interventions (via intervention_id)');

  } catch (error) {
    console.error('❌ Error seeding interconnected data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedInterconnectedData();