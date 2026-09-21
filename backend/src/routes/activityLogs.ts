import { Router, Request, Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';

const router = Router();

// Get all activity logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get activity logs for a specific user
router.get('/user/:userEmail', async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.params;
    const logs = await ActivityLog.find({ user_email: userEmail })
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch user activity logs' });
  }
});

// Create a new activity log
router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, user, user_email, user_role, target_type, target_id, details } = req.body;

    const log = new ActivityLog({
      action,
      user,
      user_email,
      user_role,
      target_type,
      target_id,
      details,
    });

    await log.save();
    res.status(201).json({ data: log });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

export default router;
