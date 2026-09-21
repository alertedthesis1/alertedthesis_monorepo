import { Router, Request, Response } from 'express';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { AcademicRecord } from '../models/AcademicRecord';
import { Attendance } from '../models/Attendance';
import { buildStudentSummary, buildStudentAlerts } from '../utils/studentMetrics';
import { studentSummaryService } from '../services/studentSummaryService';

const router = Router();

// Generate a random 8-digit student ID
function generateStudentId(): string {
  const min = 10000000;
  const max = 99999999;
  const randomId = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomId.toString();
}

// Ensure the generated student ID is unique by checking against existing records
// Retries up to 100 times before throwing an error
async function ensureUniqueStudentId(): Promise<string> {
  let studentId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    studentId = generateStudentId();
    const existing = await Student.findOne({ student_id: studentId });
    if (!existing) {
      isUnique = true;
      return studentId;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique student ID after multiple attempts');
}

// Get full student profile including summary metrics and recent alerts
// Used for the student profile page to display comprehensive student information
router.get('/:id/detail', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const [summary, alerts] = await Promise.all([
      buildStudentSummary(student),
      buildStudentAlerts(id),
    ]);
    res.json({ data: { ...summary, alerts } });
  } catch (error) {
    console.error('Error fetching student detail:', error);
    res.status(500).json({ error: 'Failed to fetch student detail' });
  }
});

// Get AI-generated student summary using the student summary service
// Returns a comprehensive AI analysis of the student's academic and behavioral data
router.get('/:id/ai-summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await studentSummaryService.getStudentSummary(id);
    res.json({ data: summary });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Return a fallback summary instead of error
    res.json({
      data: {
        data: {},
        aiSummary: 'Unable to generate AI summary at this time. Please check the student details manually.'
      }
    });
  }
});

// Get all academic records for a specific student
// Returns records sorted by creation date (newest first)
router.get('/:id/academics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const academics = await AcademicRecord.find({ student_id: id }).sort({ createdAt: -1 });
    res.json({ data: academics });
  } catch (error) {
    console.error('Error fetching student academics:', error);
    res.status(500).json({ error: 'Failed to fetch student academics' });
  }
});

// Create a new academic record for a student
// Accepts term, year, subject grades, course counts, and total units
// GPA and overall average are computed automatically from subject grades
router.post('/:id/academics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { term, year, mathematics_grade, english_grade, science_grade, major_subjects_enrolled, major_subjects_passed, major_subjects_failed, total_units } = req.body;

    // Calculate overall average and GPA automatically
    const mathGrade = parseFloat(mathematics_grade) || 0;
    const englishGrade = parseFloat(english_grade) || 0;
    const scienceGrade = parseFloat(science_grade) || 0;
    
    let overall_average = 0;
    let gpa = 0;
    
    if (mathGrade > 0 || englishGrade > 0 || scienceGrade > 0) {
      overall_average = parseFloat(((mathGrade + englishGrade + scienceGrade) / 3).toFixed(1));
      const avgGrade = overall_average;
      
      // Convert to GPA (4.0 scale): 90-100 = 4.0, 80-89 = 3.0-3.9, 70-79 = 2.0-2.9, 60-69 = 1.0-1.9, below 60 = 0.0
      if (avgGrade >= 90) gpa = 4.0;
      else if (avgGrade >= 80) gpa = 3.0 + (avgGrade - 80) / 10;
      else if (avgGrade >= 70) gpa = 2.0 + (avgGrade - 70) / 10;
      else if (avgGrade >= 60) gpa = 1.0 + (avgGrade - 60) / 10;
      else gpa = 0.0;
      
      gpa = parseFloat(gpa.toFixed(2));
    }

    const academic = await AcademicRecord.create({
      student_id: id,
      term,
      year,
      mathematics_grade,
      english_grade,
      science_grade,
      overall_average,
      gpa,
      major_subjects_enrolled,
      major_subjects_passed,
      major_subjects_failed,
      total_units,
    });
    res.status(201).json({ data: academic });
  } catch (error) {
    console.error('Error creating academic record:', error);
    res.status(500).json({ error: 'Failed to create academic record' });
  }
});

// Update an existing academic record by ID
// Returns the updated record with new values
// GPA and overall average are computed automatically from subject grades
router.put('/academics/:academicId', async (req: Request, res: Response) => {
  try {
    const { academicId } = req.params;
    const { term, year, mathematics_grade, english_grade, science_grade, major_subjects_enrolled, major_subjects_passed, major_subjects_failed, total_units } = req.body;

    // Calculate overall average and GPA automatically
    const mathGrade = parseFloat(mathematics_grade) || 0;
    const englishGrade = parseFloat(english_grade) || 0;
    const scienceGrade = parseFloat(science_grade) || 0;
    
    let overall_average = 0;
    let gpa = 0;
    
    if (mathGrade > 0 || englishGrade > 0 || scienceGrade > 0) {
      overall_average = parseFloat(((mathGrade + englishGrade + scienceGrade) / 3).toFixed(1));
      const avgGrade = overall_average;
      
      // Convert to GPA (4.0 scale): 90-100 = 4.0, 80-89 = 3.0-3.9, 70-79 = 2.0-2.9, 60-69 = 1.0-1.9, below 60 = 0.0
      if (avgGrade >= 90) gpa = 4.0;
      else if (avgGrade >= 80) gpa = 3.0 + (avgGrade - 80) / 10;
      else if (avgGrade >= 70) gpa = 2.0 + (avgGrade - 70) / 10;
      else if (avgGrade >= 60) gpa = 1.0 + (avgGrade - 60) / 10;
      else gpa = 0.0;
      
      gpa = parseFloat(gpa.toFixed(2));
    }

    const academic = await AcademicRecord.findByIdAndUpdate(
      academicId,
      { term, year, mathematics_grade, english_grade, science_grade, overall_average, gpa, major_subjects_enrolled, major_subjects_passed, major_subjects_failed, total_units },
      { new: true }
    );
    if (!academic) {
      return res.status(404).json({ error: 'Academic record not found' });
    }
    res.json({ data: academic });
  } catch (error) {
    console.error('Error updating academic record:', error);
    res.status(500).json({ error: 'Failed to update academic record' });
  }
});

// Delete an academic record by ID
// Permanently removes the record from the database
router.delete('/academics/:academicId', async (req: Request, res: Response) => {
  try {
    const { academicId } = req.params;
    const academic = await AcademicRecord.findByIdAndDelete(academicId);
    if (!academic) {
      return res.status(404).json({ error: 'Academic record not found' });
    }
    res.json({ message: 'Academic record deleted successfully' });
  } catch (error) {
    console.error('Error deleting academic record:', error);
    res.status(500).json({ error: 'Failed to delete academic record' });
  }
});

// Get all attendance records for a specific student
// Returns up to 50 records sorted by date (newest first)
router.get('/:id/attendance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.find({ student_id: id }).sort({ attendance_date: -1 }).limit(50);
    res.json({ data: attendance });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ error: 'Failed to fetch student attendance' });
  }
});

// Create a new attendance record for a student
// Accepts date, present/absent status, and subject
router.post('/:id/attendance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { attendance_date, present, subject } = req.body;
    const attendance = await Attendance.create({
      student_id: id,
      attendance_date,
      present,
      subject,
    });
    res.status(201).json({ data: attendance });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

// Update an existing attendance record by ID
// Returns the updated record with new values
router.put('/attendance/:attendanceId', async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const { attendance_date, present, subject } = req.body;
    const attendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      { attendance_date, present, subject },
      { new: true }
    );
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ data: attendance });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

// Delete an attendance record by ID
// Permanently removes the record from the database
router.delete('/attendance/:attendanceId', async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const attendance = await Attendance.findByIdAndDelete(attendanceId);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Get all students with pagination support
// Returns paginated results sorted by last updated date
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find()
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Student.countDocuments()
    ]);
    
    res.json({
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get a single student by ID
// Returns the full student document or 404 if not found
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Create a new student record
// Accepts personal info, enrollment details, and guardian information
// Handles faculty assignment by email or ObjectId
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      enrollment_date,
      status,
      program,
      year_level,
      grade_level,
      section,
      phone,
      address,
      guardian_name,
      guardian_relation,
      guardian_phone,
      assigned_faculty,
    } = req.body;

    let facultyId: any = assigned_faculty;
    if (assigned_faculty && typeof assigned_faculty === 'string' && !assigned_faculty.match(/^[0-9a-fA-F]{24}$/)) {
      const faculty = await Faculty.findOne({ email: assigned_faculty });
      facultyId = faculty?._id;
    }

    const newStudent = new Student({
      first_name,
      last_name,
      email,
      enrollment_date,
      status,
      program,
      year_level,
      grade_level,
      section,
      phone,
      address,
      guardian_name,
      guardian_relation,
      guardian_phone,
      assigned_faculty: facultyId,
    });

    const savedStudent = await newStudent.save();

    res.status(201).json({
      data: savedStudent,
      message: 'Student created successfully',
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// Update an existing student by ID
// Accepts partial updates and automatically updates the timestamp
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      data: updatedStudent,
      message: 'Student updated successfully',
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Temporary endpoint to assign student IDs to existing students
// Used for data migration to ensure all students have unique student_id
router.post('/seed-ids', async (req: Request, res: Response) => {
  try {
    const studentsWithoutId = await Student.find({ student_id: { $exists: false } });
    console.log(`Found ${studentsWithoutId.length} students without student_id`);

    if (studentsWithoutId.length === 0) {
      return res.json({ message: 'All students already have student_id. No updates needed.' });
    }

    let updatedCount = 0;
    for (const student of studentsWithoutId) {
      try {
        const studentId = await ensureUniqueStudentId();
        await Student.findByIdAndUpdate(student._id, { student_id: studentId });
        console.log(`✓ Assigned student_id ${studentId} to ${student.first_name} ${student.last_name}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Failed to assign student_id to ${student.first_name} ${student.last_name}:`, error);
      }
    }

    res.json({ 
      message: `Successfully assigned student_id to ${updatedCount} students`,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error seeding student IDs:', error);
    res.status(500).json({ error: 'Failed to seed student IDs' });
  }
});

// Delete a student by ID after archiving their data
// Archives the student record before permanent deletion for audit purposes
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedStudent = await Student.findById(id);

    if (!deletedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Archive the student before deletion
    const { StudentArchive } = await import('../models/StudentArchive');
    await StudentArchive.create({
      original_id: deletedStudent._id,
      student_id: deletedStudent.student_id,
      first_name: deletedStudent.first_name,
      last_name: deletedStudent.last_name,
      email: deletedStudent.email,
      enrollment_date: deletedStudent.enrollment_date,
      status: deletedStudent.status,
      program: deletedStudent.program,
      year_level: deletedStudent.year_level,
      grade_level: deletedStudent.grade_level,
      section: deletedStudent.section,
      phone: deletedStudent.phone,
      address: deletedStudent.address,
      guardian_name: deletedStudent.guardian_name,
      guardian_relation: deletedStudent.guardian_relation,
      guardian_phone: deletedStudent.guardian_phone,
      assigned_faculty: deletedStudent.assigned_faculty,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the student
    await Student.findByIdAndDelete(id);

    res.json({
      message: 'Student deleted successfully and archived',
      data: deletedStudent,
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;
