import { Router, Request, Response } from 'express';
import { Task } from '../models/Task';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';

const router = Router();

// Get all tasks
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
    
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('student_id', 'first_name last_name')
        .populate('assigned_to', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Task.countDocuments(filter)
    ]);

    res.json({ 
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const tasks = await Task.find({ student_id: studentId })
      .populate('student_id', 'first_name last_name')
      .populate('assigned_to', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    res.json({ data: tasks });
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ error: 'Failed to fetch student tasks' });
  }
});

// Create a new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, student_id, assigned_to, intervention_id, due_date, priority, status, created_by } = req.body;

    // If student_id is provided, verify student exists
    if (student_id) {
      const student = await Student.findById(student_id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
    }

    // If intervention_id is provided, verify it exists
    if (intervention_id) {
      const { Intervention } = await import('../models/Intervention');
      const intervention = await Intervention.findOne({ intervention_id: intervention_id });
      if (!intervention) {
        return res.status(404).json({ error: 'Intervention not found' });
      }
    }

    const task = new Task({
      title,
      description,
      student_id,
      assigned_to,
      intervention_id,
      due_date: due_date ? new Date(due_date) : undefined,
      priority: priority || 'Medium',
      status: status || 'Pending',
      created_by,
    });

    await task.save();
    res.status(201).json({ data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If intervention_id is being updated, verify it exists
    if (updates.intervention_id) {
      const { Intervention } = await import('../models/Intervention');
      const intervention = await Intervention.findOne({ intervention_id: updates.intervention_id });
      if (!intervention) {
        return res.status(404).json({ error: 'Intervention not found' });
      }
    }

    res.json({ data: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Archive the task before deletion
    const { TaskArchive } = await import('../models/TaskArchive');
    await TaskArchive.create({
      original_id: task._id,
      title: task.title,
      description: task.description,
      student_id: task.student_id,
      assigned_to: task.assigned_to,
      intervention_id: (task as any).intervention_id,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      created_by: task.created_by,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the task
    await Task.findByIdAndDelete(id);

    res.json({ message: 'Task deleted successfully and archived' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Seed sample tasks (temporary endpoint)
router.post('/seed-sample', async (req: Request, res: Response) => {
  try {
    const { Student } = await import('../models/Student');
    const students = await Student.find().limit(5).exec();
    
    const sampleTasks = [
      {
        title: 'Review student progress report',
        description: 'Analyze academic performance and identify areas needing improvement',
        student_id: students[0]?._id,
        priority: 'High',
        status: 'Pending',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_by: 'counselor@sjc.edu.ph',
      },
      {
        title: 'Schedule parent meeting',
        description: 'Discuss behavioral concerns with parents',
        student_id: students[1]?._id,
        priority: 'Medium',
        status: 'In Progress',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        created_by: 'counselor@sjc.edu.ph',
      },
      {
        title: 'Update intervention plan',
        description: 'Revise current intervention strategy based on recent assessments',
        student_id: students[2]?._id,
        priority: 'High',
        status: 'Pending',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        created_by: 'counselor@sjc.edu.ph',
      },
      {
        title: 'Complete risk assessment',
        description: 'Conduct comprehensive risk evaluation for new students',
        student_id: students[3]?._id,
        priority: 'Medium',
        status: 'Completed',
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        created_by: 'counselor@sjc.edu.ph',
      },
      {
        title: 'Prepare monthly report',
        description: 'Compile intervention statistics and outcomes for the month',
        student_id: students[4]?._id,
        priority: 'Low',
        status: 'Pending',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        created_by: 'counselor@sjc.edu.ph',
      },
    ];

    const createdTasks = await Task.insertMany(sampleTasks);
    res.json({ 
      message: 'Sample tasks seeded successfully',
      created: createdTasks.length
    });
  } catch (error) {
    console.error('Error seeding tasks:', error);
    res.status(500).json({ error: 'Failed to seed tasks' });
  }
});

export default router;
