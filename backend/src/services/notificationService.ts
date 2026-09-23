import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';
import { Alert } from '../models/Alert';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

export interface ConsecutiveAbsenceAlert {
  student_id: string;
  student_name: string;
  consecutive_absences: number;
  absence_dates: string[];
  faculty_email: string;
  alert_date: Date;
}

export interface FacultyNotification {
  id: string;
  type: 'consecutive_absence' | 'attendance_alert' | 'academic_alert' | 'behavioral_alert' | 'risk_alert' | 'intervention_alert' | 'system';
  title: string;
  message: string;
  student_id?: string;
  student_name?: string;
  priority: 'high' | 'medium' | 'low';
  link?: string;
  created_at: Date;
  read: boolean;
}

export class NotificationService {
  /**
   * Check for consecutive absences for a specific student
   * Returns the count of consecutive absences and the dates
   * Skips weekends (Saturday and Sunday)
   */
  async checkConsecutiveAbsences(studentId: string): Promise<{ count: number; dates: string[] }> {
    const attendanceRecords = await Attendance.find({ student_id: studentId })
      .sort({ attendance_date: -1 })
      .limit(50);

    if (attendanceRecords.length === 0) {
      return { count: 0, dates: [] };
    }

    let consecutiveCount = 0;
    const absenceDates: string[] = [];

    for (const record of attendanceRecords) {
      const date = new Date(record.attendance_date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      if (!record.present && !record.excused_absent) {
        consecutiveCount++;
        absenceDates.push(record.attendance_date.toISOString().split('T')[0]);
      } else {
        break;
      }
    }

    return { count: consecutiveCount, dates: absenceDates };
  }

  /**
   * Check all students for consecutive absences and generate alerts
   * Returns students with 5+ consecutive absences
   */
  async checkAllStudentsForConsecutiveAbsences(): Promise<ConsecutiveAbsenceAlert[]> {
    const students = await Student.find({ status: 'Active' });
    const alerts: ConsecutiveAbsenceAlert[] = [];

    for (const student of students) {
      const { count, dates } = await this.checkConsecutiveAbsences(String(student._id));

      if (count >= 5) {
        // Get faculty email for this student
        const faculty = await User.findOne({ 
          role: 'faculty',
          section: student.section 
        });

        if (faculty) {
          alerts.push({
            student_id: String(student._id),
            student_name: `${student.first_name} ${student.last_name}`,
            consecutive_absences: count,
            absence_dates: dates,
            faculty_email: faculty.email,
            alert_date: new Date(),
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Create an alert for a student with consecutive absences
   */
  async createConsecutiveAbsenceAlert(studentId: string, consecutiveCount: number, absenceDates: string[]): Promise<void> {
    const student = await Student.findById(studentId);
    if (!student) return;

    // Create alert in the Alert collection
    const alert = new Alert({
      student_id: studentId,
      category: 'Attendance',
      date: new Date(),
      message: `${consecutiveCount} consecutive absences detected (${absenceDates.slice(0, 5).join(', ')}${absenceDates.length > 5 ? '...' : ''})`,
      resolved: false,
    });

    await alert.save();

    // Create notification for faculty
    const faculty = await User.findOne({ 
      role: 'faculty',
      section: student.section 
    });

    if (faculty) {
      // Check if there's already an unread consecutive absence notification for this student
      const existingNotification = await Notification.findOne({
        user_email: faculty.email,
        type: 'consecutive_absence',
        student_id: studentId,
        read: false,
      });

      // Only create new notification if there isn't already an unread one
      if (!existingNotification) {
        const notification = new Notification({
          user_id: faculty._id,
          user_email: faculty.email,
          type: 'consecutive_absence',
          title: 'Consecutive Absence Alert',
          message: `${student.first_name} ${student.last_name} has ${consecutiveCount} consecutive absences`,
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          priority: 'high',
          link: `/students/${studentId}`,
          read: false,
        });

        await notification.save();
      } else {
        // Update existing notification with latest count
        existingNotification.message = `${student.first_name} ${student.last_name} has ${consecutiveCount} consecutive absences`;
        existingNotification.updatedAt = new Date();
        await existingNotification.save();
      }
    }
  }

  /**
   * Get faculty notifications for a specific faculty member from database
   */
  async getFacultyNotifications(facultyEmail: string): Promise<FacultyNotification[]> {
    const notifications = await Notification.find({ user_email: facultyEmail })
      .sort({ read: 1, createdAt: -1 })
      .limit(50)
      .exec();

    return notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      student_id: n.student_id ? String(n.student_id) : undefined,
      student_name: n.student_name,
      priority: n.priority,
      link: n.link,
      created_at: n.createdAt,
      read: n.read,
    }));
  }

  /**
   * Get unread notification count for a faculty member
   */
  async getUnreadNotificationCount(facultyEmail: string): Promise<number> {
    const count = await Notification.countDocuments({ 
      user_email: facultyEmail, 
      read: false 
    });
    return count;
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await Notification.findByIdAndUpdate(
      notificationId,
      { read: true, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(facultyEmail: string): Promise<void> {
    await Notification.updateMany(
      { user_email: facultyEmail, read: false },
      { read: true, updatedAt: new Date() }
    );
  }

  /**
   * Process and create alerts for all students with consecutive absences
   * This should be called periodically (e.g., daily)
   */
  async processConsecutiveAbsences(): Promise<number> {
    const alerts = await this.checkAllStudentsForConsecutiveAbsences();
    let alertsCreated = 0;

    for (const alert of alerts) {
      // Check if an alert already exists for this student
      const existingAlert = await Alert.findOne({
        student_id: alert.student_id,
        category: 'Attendance',
        message: { $regex: 'consecutive absences', $options: 'i' },
        resolved: false,
      });

      if (!existingAlert) {
        await this.createConsecutiveAbsenceAlert(
          alert.student_id,
          alert.consecutive_absences,
          alert.absence_dates
        );
        alertsCreated++;
      }
    }

    return alertsCreated;
  }

  /**
   * Create a risk alert notification for a student
   */
  async createRiskAlert(studentId: string, riskLevel: string, facultyEmail: string): Promise<void> {
    const student = await Student.findById(studentId);
    if (!student) return;

    const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
    if (!faculty) return;

    const notification = new Notification({
      user_id: faculty._id,
      user_email: faculty.email,
      type: 'risk_alert',
      title: 'Risk Level Alert',
      message: `${student.first_name} ${student.last_name} risk level has changed to ${riskLevel}`,
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      priority: riskLevel === 'Critical' || riskLevel === 'High' ? 'high' : 'medium',
      link: `/students/${studentId}`,
      read: false,
    });

    await notification.save();
  }

  /**
   * Create an intervention alert notification
   */
  async createInterventionAlert(studentId: string, interventionType: string, facultyEmail: string): Promise<void> {
    const student = await Student.findById(studentId);
    if (!student) return;

    const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
    if (!faculty) return;

    const notification = new Notification({
      user_id: faculty._id,
      user_email: faculty.email,
      type: 'intervention_alert',
      title: 'New Intervention Assigned',
      message: `${interventionType} intervention assigned for ${student.first_name} ${student.last_name}`,
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      priority: 'medium',
      link: `/students/${studentId}`,
      read: false,
    });

    await notification.save();
  }

  /**
   * Create an academic alert notification
   */
  async createAcademicAlert(studentId: string, academicMessage: string, facultyEmail: string): Promise<void> {
    const student = await Student.findById(studentId);
    if (!student) return;

    const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
    if (!faculty) return;

    const notification = new Notification({
      user_id: faculty._id,
      user_email: faculty.email,
      type: 'academic_alert',
      title: 'Academic Alert',
      message: `${academicMessage} for ${student.first_name} ${student.last_name}`,
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      priority: 'high',
      link: `/students/${studentId}`,
      read: false,
    });

    await notification.save();
  }

  /**
   * Create a behavioral alert notification
   */
  async createBehavioralAlert(studentId: string, behaviorMessage: string, facultyEmail: string): Promise<void> {
    const student = await Student.findById(studentId);
    if (!student) return;

    const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
    if (!faculty) return;

    const notification = new Notification({
      user_id: faculty._id,
      user_email: faculty.email,
      type: 'behavioral_alert',
      title: 'Behavioral Alert',
      message: `${behaviorMessage} for ${student.first_name} ${student.last_name}`,
      student_id: studentId,
      student_name: `${student.first_name} ${student.last_name}`,
      priority: 'high',
      link: `/students/${studentId}`,
      read: false,
    });

    await notification.save();
  }

  /**
   * Create a system notification
   */
  async createSystemNotification(userEmail: string, title: string, message: string, priority: 'high' | 'medium' | 'low' = 'low'): Promise<void> {
    const user = await User.findOne({ email: userEmail });
    if (!user) return;

    const notification = new Notification({
      user_id: user._id,
      user_email: userEmail,
      type: 'system',
      title: title,
      message: message,
      priority: priority,
      read: false,
    });

    await notification.save();
  }
}

export const notificationService = new NotificationService();