import { Router, Request, Response } from 'express';
import { Alert } from '../models/Alert';

const router = Router();

// Get alerts for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const alerts = await Alert.find({ student_id: studentId })
      .sort({ date: -1 })
      .exec();

    res.json({ data: alerts });
  } catch (error) {
    console.error('Error fetching student alerts:', error);
    res.status(500).json({ error: 'Failed to fetch student alerts' });
  }
});

// Create a new alert
router.post('/', async (req: Request, res: Response) => {
  try {
    const { student_id, category, date, message, resolved } = req.body;

    const alert = new Alert({
      student_id,
      category,
      date: new Date(date),
      message,
      resolved: resolved || false,
    });

    await alert.save();
    res.status(201).json({ data: alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Update alert
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ data: updatedAlert });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedAlert = await Alert.findById(id);

    if (!deletedAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Archive the alert before deletion
    const { AlertArchive } = await import('../models/AlertArchive');
    await AlertArchive.create({
      original_id: deletedAlert._id,
      student_id: deletedAlert.student_id,
      category: deletedAlert.category,
      date: deletedAlert.date,
      message: deletedAlert.message,
      resolved: deletedAlert.resolved,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the alert
    await Alert.findByIdAndDelete(id);

    res.json({ message: 'Alert deleted successfully and archived' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
