import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as dns from 'dns';
import { Schedule } from './models/Schedule';
import { Intervention } from './models/Intervention';
import { Task } from './models/Task';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testRelationships() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Testing interconnected data relationships...\n');

    // Test 1: Check if schedules have intervention_id
    console.log('📋 Test 1: Schedules → Interventions relationship');
    const schedules = await Schedule.find({ intervention_id: { $exists: true, $ne: null } });
    console.log(`   Found ${schedules.length} schedules with intervention_id`);
    
    if (schedules.length > 0) {
      const sampleSchedule = schedules[0];
      console.log(`   Sample schedule: ${sampleSchedule.student_name} on ${sampleSchedule.date.toISOString().split('T')[0]}`);
      console.log(`   Connected to intervention: ${sampleSchedule.intervention_id}`);
      
      // Verify the intervention exists
      const intervention = await Intervention.findById(sampleSchedule.intervention_id);
      if (intervention) {
        console.log(`   ✅ Intervention found: ${intervention.intervention_id} (${intervention.intervention_type})`);
      } else {
        console.log(`   ❌ Intervention not found!`);
      }
    }

    // Test 2: Check if interventions have schedule_id
    console.log('\n📋 Test 2: Interventions → Schedules relationship');
    const interventionsWithSchedule2 = await Intervention.find({ schedule_id: { $exists: true, $ne: null } });
    console.log(`   Found ${interventionsWithSchedule2.length} interventions with schedule_id`);
    
    if (interventionsWithSchedule2.length > 0) {
      const sampleIntervention = interventionsWithSchedule2[0];
      console.log(`   Sample intervention: ${sampleIntervention.intervention_id} (${sampleIntervention.intervention_type})`);
      console.log(`   Connected to schedule: ${sampleIntervention.schedule_id}`);
      
      // Verify the schedule exists
      const schedule = await Schedule.findById(sampleIntervention.schedule_id);
      if (schedule) {
        console.log(`   ✅ Schedule found: ${schedule.student_name} on ${schedule.date.toISOString().split('T')[0]}`);
      } else {
        console.log(`   ❌ Schedule not found!`);
      }
    }

    // Test 3: Check if tasks have intervention_id
    console.log('\n📋 Test 3: Tasks → Interventions relationship');
    const tasksWithIntervention2 = await Task.find({ intervention_id: { $exists: true, $ne: null } });
    console.log(`   Found ${tasksWithIntervention2.length} tasks with intervention_id`);
    
    if (tasksWithIntervention2.length > 0) {
      const sampleTask = tasksWithIntervention2[0];
      console.log(`   Sample task: ${sampleTask.title} (${sampleTask.status})`);
      console.log(`   Connected to intervention: ${sampleTask.intervention_id}`);
      
      // Verify the intervention exists
      const intervention = await Intervention.findById(sampleTask.intervention_id);
      if (intervention) {
        console.log(`   ✅ Intervention found: ${intervention.intervention_id} (${intervention.intervention_type})`);
        
        // Count tasks for this intervention
        const taskCount = await Task.countDocuments({ intervention_id: intervention._id });
        console.log(`   This intervention has ${taskCount} connected tasks`);
      } else {
        console.log(`   ❌ Intervention not found!`);
      }
    }

    // Test 4: Full relationship chain test
    console.log('\n📋 Test 4: Full relationship chain (Schedule → Intervention → Tasks)');
    const scheduleWithIntervention = await Schedule.findOne({ intervention_id: { $exists: true, $ne: null } });
    
    if (scheduleWithIntervention) {
      console.log(`   Starting with schedule: ${scheduleWithIntervention.student_name} on ${scheduleWithIntervention.date.toISOString().split('T')[0]}`);
      
      const intervention = await Intervention.findById(scheduleWithIntervention.intervention_id);
      if (intervention) {
        console.log(`   → Connected to intervention: ${intervention.intervention_id} (${intervention.intervention_type}, ${intervention.status})`);
        
        const tasks = await Task.find({ intervention_id: intervention._id });
        console.log(`   → Which has ${tasks.length} connected tasks:`);
        tasks.forEach((task, index) => {
          console.log(`      ${index + 1}. ${task.title} (${task.priority}, ${task.status})`);
        });
        
        console.log(`   ✅ Full relationship chain verified!`);
      } else {
        console.log(`   ❌ Intervention not found in chain`);
      }
    } else {
      console.log(`   ❌ No schedule with intervention found for chain test`);
    }

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    const totalSchedules = await Schedule.countDocuments();
    const totalInterventions = await Intervention.countDocuments();
    const totalTasks = await Task.countDocuments();
    
    const schedulesWithIntervention = await Schedule.countDocuments({ intervention_id: { $exists: true, $ne: null } });
    const interventionsWithScheduleCount = await Intervention.countDocuments({ schedule_id: { $exists: true, $ne: null } });
    const tasksWithInterventionCount = await Task.countDocuments({ intervention_id: { $exists: true, $ne: null } });
    
    console.log(`   Total Schedules: ${totalSchedules} (${schedulesWithIntervention} connected to interventions)`);
    console.log(`   Total Interventions: ${totalInterventions} (${interventionsWithScheduleCount} connected to schedules)`);
    console.log(`   Total Tasks: ${totalTasks} (${tasksWithInterventionCount} connected to interventions)`);

    console.log('\n✅ All relationship tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing relationships:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testRelationships();