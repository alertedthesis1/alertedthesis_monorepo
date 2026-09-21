import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Intervention } from '../models/Intervention';
import { Schedule } from '../models/Schedule';

dotenv.config();

// Sample meeting notes for different intervention types
const sampleNotes = {
  'Mentoring': [
    'Student showed great engagement in today\'s session. Discussed academic goals and created a study plan.',
    'Progress report: Student has improved time management skills. Completed all assigned tasks this week.',
    'Session focused on building confidence. Student participated actively in group activities.',
    'Reviewed midterm performance. Identified areas for improvement in mathematics.',
    'Student expressed concerns about upcoming presentations. Worked on public speaking skills.',
  ],
  'Tutoring': [
    'Math tutoring session: Covered algebraic equations. Student demonstrated good understanding.',
    'Science review: Helped student with physics concepts. Homework completed successfully.',
    'English literature: Discussed novel themes. Student showed analytical thinking.',
    'Chemistry lab preparation: Reviewed safety protocols and experiment procedures.',
    'History essay assistance: Student outlined main arguments and gathered sources.',
  ],
  'Counseling': [
    'Initial counseling session: Student opened up about personal challenges. Established trust.',
    'Follow-up session: Discussed coping strategies for stress. Student reported improvement.',
    'Family dynamics discussion: Explored communication patterns within family.',
    'Goal-setting session: Student identified short-term and long-term objectives.',
    'Crisis intervention: Provided immediate support for emotional distress.',
  ],
  'Family Meeting': [
    'Family conference: Discussed student\'s academic progress. Parents engaged constructively.',
    'Mediation session: Addressed conflicts between student and family members.',
    'Behavioral plan review: Family agreed on consistent discipline approach.',
    'College planning meeting: Discussed options and financial considerations.',
    'Progress update: Celebrated student\'s achievements and set new goals.',
  ],
};

async function generateInterventionId(interventionType: string): Promise<string> {
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

  return `${prefix}${currentYear}${String(nextNumber).padStart(5, '0')}`;
}

function getRandomNote(type: string): string {
  const notes = sampleNotes[type as keyof typeof sampleNotes] || sampleNotes['Counseling'];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateDateSeparatedNotes(type: string, count: number = 3): string {
  const notes = sampleNotes[type as keyof typeof sampleNotes] || sampleNotes['Counseling'];
  let result = '';
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i) * 7); // Weekly intervals
    const dateStr = date.toISOString().split('T')[0];
    const note = notes[Math.floor(Math.random() * notes.length)];
    
    result += `- ${dateStr} -\n${note}\n\n`;
  }
  
  return result.trim();
}

export async function migrateInterventionIds() {
  try {
    console.log('Starting intervention ID migration...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alerted');
    console.log('Connected to database');

    // Get all interventions without intervention_id
    const interventions = await Intervention.find({ intervention_id: { $exists: false } });
    console.log(`Found ${interventions.length} interventions without IDs`);

    for (const intervention of interventions) {
      const intervention_id = await generateInterventionId(intervention.intervention_type);
      intervention.intervention_id = intervention_id;
      
      // Add meeting details with random notes
      const notes = generateDateSeparatedNotes(intervention.intervention_type, 2);
      intervention.meeting_details = notes;
      
      await intervention.save();
      console.log(`Updated intervention: ${intervention_id} - ${intervention.intervention_type}`);
    }

    // Connect schedules to interventions
    const schedules = await Schedule.find({ 
      intervention_id: { $exists: false },
      status: 'Completed'
    });
    console.log(`Found ${schedules.length} completed schedules without intervention_id`);

    for (const schedule of schedules) {
      // Find matching intervention by student_id and type
      const intervention = await Intervention.findOne({
        student_id: schedule.student_id,
        intervention_type: schedule.type,
      }).sort({ createdAt: -1 });

      if (intervention && intervention.intervention_id) {
        schedule.intervention_id = intervention._id;
        await schedule.save();
        console.log(`Connected schedule to intervention: ${intervention.intervention_id}`);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInterventionIds();
}
