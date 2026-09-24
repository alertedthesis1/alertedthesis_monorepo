import { Router, Request, Response } from 'express';
import { Schedule } from '../models/Schedule';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { notificationService } from '../services/notificationService';

const router = Router();

// Create a new schedule
router.post('/', async (req: Request, res: Response) => {
  try {
    const { student_id, student_name, date, time, type, notes, created_by, intervention_id } = req.body;

    // Validate required fields
    if (!student_id || !student_name || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let finalInterventionId = intervention_id;

    // If intervention_id is provided, verify it exists
    if (intervention_id) {
      const { Intervention } = await import('../models/Intervention');
      const intervention = await Intervention.findOne({ intervention_id: intervention_id });
      if (!intervention) {
        return res.status(404).json({ error: 'Intervention not found' });
      }
      finalInterventionId = intervention_id; // Use the readable ID directly
    } else {
      // If intervention_id is blank/undefined, create a new intervention
      const { Intervention } = await import('../models/Intervention');
      const { RiskScore } = await import('../models/RiskScore');

      // Find or create a risk score for this student
      let riskScore = await RiskScore.findOne({ student_id: student_id });
      if (!riskScore) {
        riskScore = await RiskScore.create({
          student_id: student_id,
          overall_score: 50,
          attendance_score: 50,
          academic_score: 50,
          behavior_score: 50,
          calculated_at: new Date(),
        });
      }

      // Generate intervention ID
      const typePrefixMap: Record<string, string> = {
        'Mentoring': 'M',
        'Peer Tutoring': 'T',
        'Counseling/Coaching': 'C',
        'Parent Conference': 'P',
      };
      const prefix = typePrefixMap[type || 'Counseling/Coaching'] || 'X';
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

      // Create new intervention
      const newIntervention = new Intervention({
        intervention_id: interventionIdString,
        student_id: student_id,
        score_id: riskScore._id,
        intervention_type: type || 'Counseling/Coaching',
        description: notes || `Scheduled ${type || 'Counseling/Coaching'} session`,
        start_date: new Date(date),
        status: 'Active',
        schedule_id: undefined, // Will be set after schedule is created
      });

      await newIntervention.save();
      finalInterventionId = interventionIdString; // Use the readable ID directly
    }

    const schedule = new Schedule({
      student_id,
      student_name,
      date: new Date(date),
      time,
      type: type || 'Counseling/Coaching',
      notes,
      created_by,
      intervention_id: finalInterventionId, // Now stores the readable ID
    });

    await schedule.save();

    // If we created a new intervention, update it with the schedule_id
    if (!intervention_id && finalInterventionId) {
      const { Intervention } = await import('../models/Intervention');
      await Intervention.findOneAndUpdate({ intervention_id: finalInterventionId }, { schedule_id: schedule._id });
    }

    // Create notification for the schedule
    if (created_by) {
      await notificationService.createScheduleNotification(
        student_id,
        type || 'Counseling/Coaching',
        date,
        time,
        created_by
      );
    }

    res.status(201).json({ data: schedule });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Get all schedules
router.get('/', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    let facultyId: string | undefined;
    
    if (facultyEmail) {
      const faculty = await Faculty.findOne({ email: facultyEmail });
      facultyId = faculty?._id?.toString();
    }
    
    // Get students assigned to this faculty
    const assignedStudentIds = facultyId 
      ? (await Student.find({ assigned_faculty: facultyId }).select('_id').exec()).map(s => s._id)
      : undefined;
    
    const filter = assignedStudentIds ? { student_id: { $in: assignedStudentIds } } : {};
    
    const schedules = await Schedule.find(filter)
      .exec();

    res.json({ data: schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get schedules for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const schedules = await Schedule.find({ student_id: studentId })
      .exec();

    res.json({ data: schedules });
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    res.status(500).json({ error: 'Failed to fetch student schedules' });
  }
});

// Update a schedule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If intervention_id is being updated, verify it exists
    if (updates.intervention_id) {
      const { Intervention } = await import('../models/Intervention');
      const intervention = await Intervention.findOne({ intervention_id: updates.intervention_id });
      if (!intervention) {
        return res.status(404).json({ error: 'Intervention not found' });
      }
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ data: updatedSchedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Delete a schedule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Archive the schedule before deletion
    const { ScheduleArchive } = await import('../models/ScheduleArchive');
    await ScheduleArchive.create({
      original_id: schedule._id,
      student_id: schedule.student_id,
      student_name: schedule.student_name,
      date: schedule.date,
      time: schedule.time,
      type: schedule.type,
      status: schedule.status,
      notes: schedule.notes,
      intervention_id: (schedule as any).intervention_id,
      created_by: schedule.created_by,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the schedule
    await Schedule.findByIdAndDelete(id);

    res.json({ message: 'Schedule deleted successfully and archived' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Seed schedules from interventions (temporary endpoint)
router.post('/seed-from-interventions', async (req: Request, res: Response) => {
  try {
    const { Intervention } = await import('../models/Intervention');
    
    console.log('Fetching interventions...');
    const interventions = await Intervention.find()
      .populate('student_id', 'first_name last_name')
      .exec();

    console.log(`Found ${interventions.length} interventions`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const intervention of interventions) {
      try {
        const existingSchedule = await Schedule.findOne({
          student_id: intervention.student_id,
          date: intervention.start_date,
        });

        if (existingSchedule) {
          console.log(`Skipping - schedule exists for student ${intervention.student_id}`);
          skippedCount++;
          continue;
        }

        const student = intervention.student_id as any;
        const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';

        // Generate a random time between 8:00 and 17:00
        const hours = Math.floor(Math.random() * 10) + 8; // 8-17
        const minutes = Math.random() < 0.5 ? '00' : '30';
        const time = `${hours}:${minutes}`;

        const schedule = new Schedule({
          student_id: intervention.student_id,
          student_name: studentName,
          date: intervention.start_date,
          time: time,
          type: intervention.intervention_type,
          notes: intervention.description || '',
          created_by: 'counselor@sjc.edu.ph',
        });

        await schedule.save();
        createdCount++;
        console.log(`Created schedule for ${studentName} at ${time}`);
      } catch (err) {
        console.error('Error creating schedule for intervention:', intervention._id, err);
      }
    }

    res.json({ 
      message: 'Seeding complete',
      created: createdCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error('Error seeding schedules:', error);
    res.status(500).json({ error: 'Failed to seed schedules', details: error instanceof Error ? error.message : String(error) });
  }
});

// Add status field to existing schedules (temporary endpoint)
router.post('/add-status-field', async (req: Request, res: Response) => {
  try {
    const schedulesWithoutStatus = await Schedule.find({ status: { $exists: false } });
    console.log(`Found ${schedulesWithoutStatus.length} schedules without status`);

    if (schedulesWithoutStatus.length === 0) {
      return res.json({ message: 'All schedules already have status field. No updates needed.' });
    }

    let updatedCount = 0;
    for (const schedule of schedulesWithoutStatus) {
      await Schedule.findByIdAndUpdate(schedule._id, { status: 'Scheduled' });
      updatedCount++;
    }

    res.json({ 
      message: `Successfully added status field to ${updatedCount} schedules`,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error adding status field:', error);
    res.status(500).json({ error: 'Failed to add status field' });
  }
});

// Update schedule status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Create notification based on status change
    if (status === 'Completed') {
      await notificationService.createScheduleCompletionNotification(
        String(updatedSchedule.student_id),
        updatedSchedule.type,
        updatedSchedule.created_by || 'system'
      );
    } else if (status === 'Cancelled') {
      await notificationService.createScheduleCancellationNotification(
        String(updatedSchedule.student_id),
        updatedSchedule.type,
        updatedSchedule.created_by || 'system'
      );
    }

    res.json({ data: updatedSchedule });
  } catch (error) {
    console.error('Error updating schedule status:', error);
    res.status(500).json({ error: 'Failed to update schedule status' });
  }
});

// Create intervention from schedule and mark as completed
router.post('/:id/complete-with-intervention', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meeting_details, intervention_type, description, outcome, completeOnly } = req.body;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const { Intervention } = await import('../models/Intervention');
    const { RiskScore } = await import('../models/RiskScore');

    // Check if schedule has an existing intervention_id
    let intervention;
    if (schedule.intervention_id) {
      // Find existing intervention by intervention_id string
      intervention = await Intervention.findOne({ intervention_id: schedule.intervention_id });
      if (intervention) {
        // Append notes with date
        const today = new Date().toISOString().split('T')[0];
        const dateHeader = `- ${today} -`;
        const existingDetails = intervention.meeting_details || '';
        const newDetails = existingDetails 
          ? `${existingDetails}\n${dateHeader}\n${meeting_details}`
          : `${dateHeader}\n${meeting_details}`;
        
        intervention.meeting_details = newDetails;
        
        // Update status based on completeOnly flag
        if (completeOnly) {
          intervention.status = 'Completed';
          intervention.end_date = new Date();
          intervention.outcome = outcome || 'Completed successfully';
        }
        
        await intervention.save();
      } else {
        // Intervention not found, create new one
        return res.status(404).json({ error: 'Intervention not found' });
      }
    } else {
      // Create new intervention
      // Find or create a risk score for this student
      let riskScore = await RiskScore.findOne({ student_id: schedule.student_id });
      if (!riskScore) {
        riskScore = await RiskScore.create({
          student_id: schedule.student_id,
          overall_score: 50,
          attendance_score: 50,
          academic_score: 50,
          behavior_score: 50,
          calculated_at: new Date(),
        });
      }

      // Generate intervention ID
      const typePrefixMap: Record<string, string> = {
        'Mentoring': 'M',
        'Peer Tutoring': 'T',
        'Counseling/Coaching': 'C',
        'Parent Conference': 'P',
      };
      const prefix = typePrefixMap[intervention_type || schedule.type] || 'X';
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

      const today = new Date().toISOString().split('T')[0];
      const dateHeader = `- ${today} -`;

      intervention = new Intervention({
        intervention_id: interventionIdString,
        student_id: schedule.student_id,
        score_id: riskScore._id,
        intervention_type: intervention_type || schedule.type,
        description: description || `Meeting for ${schedule.type}`,
        start_date: new Date(),
        end_date: completeOnly ? new Date() : undefined,
        status: completeOnly ? 'Completed' : 'Active',
        outcome: completeOnly ? (outcome || 'Completed successfully') : undefined,
        meeting_details: `${dateHeader}\n${meeting_details}`,
        schedule_id: schedule._id,
      });

      await intervention.save();

      // Update schedule with intervention_id
      schedule.intervention_id = intervention.intervention_id;
    }

    // Update schedule status to completed if completeOnly
    if (completeOnly) {
      schedule.status = 'Completed';
    }
    await schedule.save();

    res.json({ 
      message: completeOnly ? 'Intervention completed' : 'Notes added to intervention',
      intervention,
      schedule
    });
  } catch (error) {
    console.error('Error creating intervention from schedule:', error);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// Clear all schedules (for testing/development)
router.delete('/clear-all', async (req: Request, res: Response) => {
  try {
    const result = await Schedule.deleteMany({});
    res.json({ 
      message: `Cleared ${result.deletedCount} schedules`,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing schedules:', error);
    res.status(500).json({ error: 'Failed to clear schedules' });
  }
});

export default router;
