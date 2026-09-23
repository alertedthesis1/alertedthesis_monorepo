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
    const { student_id, attendance_date, present } = req.body;

    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({
      student_id,
      attendance_date: new Date(attendance_date)
    });

    let attendance;
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.present = present;
      attendance = await existingAttendance.save();
    } else {
      // Create new attendance record
      attendance = new Attendance({
        student_id,
        attendance_date: new Date(attendance_date),
        present,
        course_code: 'GENERAL',
        course_name: 'General Attendance'
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
    
    // Helper function to get term start date
    function getTermStartDate(term: string, year: string): Date | null {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term':
          return new Date(yearNum, 5, 1); // June 1st
        case '2nd Term':
          return new Date(yearNum, 8, 1); // September 1st
        case '3rd Term':
          return new Date(yearNum + 1, 0, 1); // January 1st of next year
        default:
          return null;
      }
    }

    // Helper function to get term end date
    function getTermEndDate(term: string, year: string): Date | null {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term':
          return new Date(yearNum, 7, 31); // August 31st
        case '2nd Term':
          return new Date(yearNum, 10, 30); // November 30th
        case '3rd Term':
          return new Date(yearNum + 1, 2, 31); // March 31st of next year
        default:
          return null;
      }
    }

    // If term and year are provided, use term date range
    if (term && year) {
      const termStartDate = getTermStartDate(term as string, year as string);
      const termEndDate = getTermEndDate(term as string, year as string);
      if (termStartDate && termEndDate) {
        filter.attendance_date = {
          $gte: termStartDate,
          $lte: termEndDate
        };
      }
    } else if (start_date && end_date) {
      // Otherwise use explicit date range
      filter.attendance_date = {
        $gte: new Date(start_date as string),
        $lte: new Date(end_date as string)
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

    const attendanceRecords = await Attendance.find({
      student_id: { $in: student_ids },
      attendance_date: date
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
