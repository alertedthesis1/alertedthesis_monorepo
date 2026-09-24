import { Router, Request, Response } from 'express';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { Student } from '../models/Student';
import { updateRiskScoreForStudent } from '../services/riskCalculationService';
import { notificationService } from '../services/notificationService';

const router = Router();

// Record attendance for a student
router.post('/', async (req: Request, res: Response) => {
  try {
    const { student_id, attendance_date, present, subject } = req.body;

    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({
      student_id,
      attendance_date: new Date(attendance_date)
    });

    let attendance;
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.present = present;
      if (subject) existingAttendance.subject = subject;
      attendance = await existingAttendance.save();
    } else {
      // Create new attendance record
      attendance = new Attendance({
        student_id,
        attendance_date: new Date(attendance_date),
        present,
        course_code: 'GENERAL',
        course_name: 'General Attendance',
        subject: subject || 'General'
      });
      attendance = await attendance.save();
    }
    
    // Automatically recalculate risk score for the student
    try {
      await updateRiskScoreForStudent(student_id);
    } catch (error) {
      console.error('Error updating risk score after attendance:', error);
      // Don't fail the request if risk score update fails
    }

    // Check for consecutive absences and create alerts if needed
    if (!present) {
      try {
        const { count, dates } = await notificationService.checkConsecutiveAbsences(student_id);
        if (count >= 5) {
          await notificationService.createConsecutiveAbsenceAlert(student_id, count, dates);
        }
      } catch (error) {
        console.error('Error checking consecutive absences:', error);
        // Don't fail the request if notification check fails
      }
    }
    
    const statusCode = existingAttendance ? 200 : 201;
    res.status(statusCode).json({ data: attendance });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get attendance for a student
router.get('/student/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const { start_date, end_date, term, year } = req.query;

    const filter: any = { student_id };
    
    // Helper function to get term start date (matching seed script definitions)
    function getTermStartDate(term: string, year: string): Date | null {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term': {
          // 2nd week of June
          const date = new Date(yearNum, 5, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (2 - 1) * 7 + (1 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(0, 0, 0, 0);
          return date;
        }
        case '2nd Term': {
          // 3rd week of September
          const date = new Date(yearNum, 8, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (3 - 1) * 7 + (1 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(0, 0, 0, 0);
          return date;
        }
        case '3rd Term': {
          // 2nd week of January (next calendar year)
          const date = new Date(yearNum + 1, 0, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (2 - 1) * 7 + (1 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(0, 0, 0, 0);
          return date;
        }
        default:
          return null;
      }
    }

    // Helper function to get term end date (matching seed script definitions)
    function getTermEndDate(term: string, year: string): Date | null {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term': {
          // 2nd week of September
          const date = new Date(yearNum, 8, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (2 - 1) * 7 + (6 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(23, 59, 59, 999);
          return date;
        }
        case '2nd Term': {
          // 2nd week of December
          const date = new Date(yearNum, 11, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (2 - 1) * 7 + (6 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(23, 59, 59, 999);
          return date;
        }
        case '3rd Term': {
          // 1st week of April (next calendar year)
          const date = new Date(yearNum + 1, 3, 1);
          const dayOfWeek = date.getDay();
          const daysToAdd = (1 - 1) * 7 + (6 - dayOfWeek + 7) % 7;
          date.setDate(date.getDate() + daysToAdd);
          date.setHours(23, 59, 59, 999);
          return date;
        }
        default:
          return null;
      }
    }

    // If term and year are provided, use term date range
    if (term && year) {
      const termStartDate = getTermStartDate(term as string, year as string);
      const termEndDate = getTermEndDate(term as string, year as string);
      
      // Filter out future dates beyond current GMT+8 date
      const now = new Date();
      const gmt8Offset = 8 * 60 * 60 * 1000;
      const currentGMT8 = new Date(now.getTime() + gmt8Offset);
      currentGMT8.setHours(23, 59, 59, 999);
      
      if (termStartDate && termEndDate) {
        const effectiveEndDate = termEndDate > currentGMT8 ? currentGMT8 : termEndDate;
        filter.attendance_date = {
          $gte: termStartDate,
          $lte: effectiveEndDate
        };
      }
    } else if (start_date && end_date) {
      // Otherwise use explicit date range
      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      
      // Filter out future dates beyond current GMT+8 date
      const now = new Date();
      const gmt8Offset = 8 * 60 * 60 * 1000;
      const currentGMT8 = new Date(now.getTime() + gmt8Offset);
      currentGMT8.setHours(23, 59, 59, 999);
      
      const effectiveEndDate = endDate > currentGMT8 ? currentGMT8 : endDate;
      
      filter.attendance_date = {
        $gte: startDate,
        $lte: effectiveEndDate
      };
    }

    const attendanceRecords = await Attendance.find(filter)
      .sort({ attendance_date: -1 })
      .exec();

    res.json({ data: attendanceRecords });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get attendance for today for multiple students
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { student_ids, attendance_date } = req.body;
    const date = attendance_date ? new Date(attendance_date) : new Date();
    
    // Set start/end of day for date range comparison (local time)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      student_id: { $in: student_ids },
      attendance_date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).exec();

    res.json({ data: attendanceRecords });
  } catch (error) {
    console.error('Error fetching batch attendance:', error);
    res.status(500).json({ error: 'Failed to fetch batch attendance' });
  }
});

// Get academic records for a student
router.get('/academic/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;

    const academicRecords = await AcademicRecord.find({ student_id })
      .sort({ term: -1 })
      .exec();

    // Flatten major subject grades from all semesters
    const allGrades = academicRecords.flatMap(record =>
      record.major_subject_grades.map(grade => ({
        semester: record.term || 'N/A',
        subject: grade.subject,
        grade: grade.grade,
        date: grade.date
      }))
    );

    res.json({ data: allGrades });
  } catch (error) {
    console.error('Error fetching academic records:', error);
    res.status(500).json({ error: 'Failed to fetch academic records' });
  }
});

export default router;
