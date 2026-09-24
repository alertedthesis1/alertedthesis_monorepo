import { Router, Request, Response } from 'express';
import { Intervention } from '../models/Intervention';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';

const router = Router();

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

  // Find the highest intervention ID for this type and year
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

// Get all interventions
router.get('/', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
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
    
    const [interventions, total] = await Promise.all([
      Intervention.find(filter)
        .populate('student_id', 'first_name last_name')
        .populate('assigned_to', 'first_name last_name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Intervention.countDocuments(filter)
    ]);

    res.json({ 
      data: interventions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

// Get interventions for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const interventions = await Intervention.find({ student_id: studentId })
      .populate('student_id', 'first_name last_name')
      .populate('assigned_to', 'first_name last_name')
      .sort({ createdAt: -1 })
      .exec();

    res.json({ data: interventions });
  } catch (error) {
    console.error('Error fetching student interventions:', error);
    res.status(500).json({ error: 'Failed to fetch student interventions' });
  }
});

// Create a new intervention
router.post('/', async (req: Request, res: Response) => {
  try {
    const { student_id, score_id, intervention_type, description, assigned_to, start_date, end_date, status, outcome, schedule_id } = req.body;

    // Verify student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If schedule_id is provided, verify it exists
    if (schedule_id) {
      const { Schedule } = await import('../models/Schedule');
      const schedule = await Schedule.findById(schedule_id);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
    }

    // Generate intervention ID
    const intervention_id = await generateInterventionId(intervention_type);

    const intervention = new Intervention({
      intervention_id,
      student_id,
      score_id,
      intervention_type,
      description,
      assigned_to,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : undefined,
      status: status || 'Pending',
      outcome,
      schedule_id,
    });

    await intervention.save();

    // If schedule_id was provided, update the schedule to link to this intervention
    if (schedule_id) {
      const { Schedule } = await import('../models/Schedule');
      await Schedule.findByIdAndUpdate(schedule_id, { intervention_id: intervention._id });
    }

    res.status(201).json({ data: intervention });
  } catch (error) {
    console.error('Error creating intervention:', error);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// Update an intervention
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedIntervention = await Intervention.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedIntervention) {
      return res.status(404).json({ error: 'Intervention not found' });
    }

    // Sync task status if intervention status changed
    if (updates.status) {
      const { Task } = await import('../models/Task');
      const taskStatusMap: Record<string, string> = {
        'Pending': 'Pending',
        'Active': 'In Progress',
        'Completed': 'Completed',
        'Cancelled': 'Pending',
      };
      
      const newTaskStatus = taskStatusMap[updates.status] || 'Pending';
      
      await Task.updateMany(
        { intervention_id: updatedIntervention._id },
        { status: newTaskStatus }
      );
    }

    res.json({ data: updatedIntervention });
  } catch (error) {
    console.error('Error updating intervention:', error);
    res.status(500).json({ error: 'Failed to update intervention' });
  }
});

// Delete an intervention
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const intervention = await Intervention.findById(id);
    
    if (!intervention) {
      return res.status(404).json({ error: 'Intervention not found' });
    }

    // Archive the intervention before deletion
    const { InterventionArchive } = await import('../models/InterventionArchive');
    await InterventionArchive.create({
      original_id: intervention._id,
      intervention_id: intervention.intervention_id,
      student_id: intervention.student_id,
      score_id: intervention.score_id,
      intervention_type: intervention.intervention_type,
      description: intervention.description,
      assigned_to: intervention.assigned_to,
      start_date: intervention.start_date,
      end_date: intervention.end_date,
      status: intervention.status,
      outcome: intervention.outcome,
      meeting_details: intervention.meeting_details,
      schedule_id: intervention.schedule_id,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the intervention
    await Intervention.findByIdAndDelete(id);

    res.json({ message: 'Intervention deleted successfully and archived' });
  } catch (error) {
    console.error('Error deleting intervention:', error);
    res.status(500).json({ error: 'Failed to delete intervention' });
  }
});

// Clear all interventions (for testing/development)
router.delete('/clear-all', async (req: Request, res: Response) => {
  try {
    const result = await Intervention.deleteMany({});
    res.json({ 
      message: `Cleared ${result.deletedCount} interventions`,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing interventions:', error);
    res.status(500).json({ error: 'Failed to clear interventions' });
  }
});

export default router;
