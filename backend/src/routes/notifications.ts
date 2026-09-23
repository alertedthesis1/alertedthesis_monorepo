import { Router, Request, Response } from 'express';
import { notificationService, FacultyNotification } from '../services/notificationService';

const router = Router();

/**
 * Get notifications for a faculty member
 */
router.get('/faculty', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    
    if (!facultyEmail) {
      return res.status(400).json({ error: 'Faculty email is required' });
    }

    const notifications = await notificationService.getFacultyNotifications(facultyEmail);
    res.json({ data: notifications });
  } catch (error) {
    console.error('Error fetching faculty notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Get unread notification count for a faculty member
 */
router.get('/faculty/unread-count', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    
    if (!facultyEmail) {
      return res.status(400).json({ error: 'Faculty email is required' });
    }

    const count = await notificationService.getUnreadNotificationCount(facultyEmail);
    res.json({ data: { count } });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * Mark all notifications as read for a faculty member
 */
router.put('/faculty/mark-all-read', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    
    if (!facultyEmail) {
      return res.status(400).json({ error: 'Faculty email is required' });
    }

    await notificationService.markAllNotificationsAsRead(facultyEmail);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * Check consecutive absences for a specific student
 */
router.get('/student/:studentId/consecutive-absences', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const { count, dates } = await notificationService.checkConsecutiveAbsences(studentId);
    res.json({ data: { consecutive_absences: count, absence_dates: dates } });
  } catch (error) {
    console.error('Error checking consecutive absences:', error);
    res.status(500).json({ error: 'Failed to check consecutive absences' });
  }
});

/**
 * Process all students for consecutive absences and create alerts
 * This endpoint should be called periodically (e.g., via cron job)
 */
router.post('/process-consecutive-absences', async (req: Request, res: Response) => {
  try {
    const alertsCreated = await notificationService.processConsecutiveAbsences();
    res.json({ 
      message: 'Processed consecutive absences',
      data: { alerts_created: alertsCreated }
    });
  } catch (error) {
    console.error('Error processing consecutive absences:', error);
    res.status(500).json({ error: 'Failed to process consecutive absences' });
  }
});

/**
 * Mark a notification as read
 */
router.put('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    
    await notificationService.markNotificationAsRead(notificationId);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Create a risk alert notification
 */
router.post('/risk-alert', async (req: Request, res: Response) => {
  try {
    const { student_id, risk_level, faculty_email } = req.body;
    
    if (!student_id || !risk_level || !faculty_email) {
      return res.status(400).json({ error: 'student_id, risk_level, and faculty_email are required' });
    }

    await notificationService.createRiskAlert(student_id, risk_level, faculty_email);
    res.json({ message: 'Risk alert created successfully' });
  } catch (error) {
    console.error('Error creating risk alert:', error);
    res.status(500).json({ error: 'Failed to create risk alert' });
  }
});

/**
 * Create an intervention alert notification
 */
router.post('/intervention-alert', async (req: Request, res: Response) => {
  try {
    const { student_id, intervention_type, faculty_email } = req.body;
    
    if (!student_id || !intervention_type || !faculty_email) {
      return res.status(400).json({ error: 'student_id, intervention_type, and faculty_email are required' });
    }

    await notificationService.createInterventionAlert(student_id, intervention_type, faculty_email);
    res.json({ message: 'Intervention alert created successfully' });
  } catch (error) {
    console.error('Error creating intervention alert:', error);
    res.status(500).json({ error: 'Failed to create intervention alert' });
  }
});

/**
 * Create an academic alert notification
 */
router.post('/academic-alert', async (req: Request, res: Response) => {
  try {
    const { student_id, academic_message, faculty_email } = req.body;
    
    if (!student_id || !academic_message || !faculty_email) {
      return res.status(400).json({ error: 'student_id, academic_message, and faculty_email are required' });
    }

    await notificationService.createAcademicAlert(student_id, academic_message, faculty_email);
    res.json({ message: 'Academic alert created successfully' });
  } catch (error) {
    console.error('Error creating academic alert:', error);
    res.status(500).json({ error: 'Failed to create academic alert' });
  }
});

/**
 * Create a behavioral alert notification
 */
router.post('/behavioral-alert', async (req: Request, res: Response) => {
  try {
    const { student_id, behavior_message, faculty_email } = req.body;
    
    if (!student_id || !behavior_message || !faculty_email) {
      return res.status(400).json({ error: 'student_id, behavior_message, and faculty_email are required' });
    }

    await notificationService.createBehavioralAlert(student_id, behavior_message, faculty_email);
    res.json({ message: 'Behavioral alert created successfully' });
  } catch (error) {
    console.error('Error creating behavioral alert:', error);
    res.status(500).json({ error: 'Failed to create behavioral alert' });
  }
});

/**
 * Create a system notification
 */
router.post('/system-notification', async (req: Request, res: Response) => {
  try {
    const { user_email, title, message, priority } = req.body;
    
    if (!user_email || !title || !message) {
      return res.status(400).json({ error: 'user_email, title, and message are required' });
    }

    await notificationService.createSystemNotification(user_email, title, message, priority);
    res.json({ message: 'System notification created successfully' });
  } catch (error) {
    console.error('Error creating system notification:', error);
    res.status(500).json({ error: 'Failed to create system notification' });
  }
});

export default router;