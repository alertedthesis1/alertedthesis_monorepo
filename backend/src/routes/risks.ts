import { Router, Request, Response } from 'express';
import { RiskScore } from '../models/RiskScore';
import { Student } from '../models/Student';
import { calculateRiskScore, updateRiskScoreForStudent, calculateAllHistoricalRiskScores } from '../services/riskCalculationService';

const router = Router();

// Get all risk scores
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const riskLevel = req.query.risk_level as string;
    const term = req.query.term as string;
    const year = req.query.year as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let query: any = {};
    if (riskLevel) {
      query.risk_level = riskLevel;
    }
    if (term) {
      query.term = term;
    }
    if (year) {
      query.year = year;
    }
    if (startDate || endDate) {
      query.prediction_date = {};
      if (startDate) {
        query.prediction_date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.prediction_date.$lte = new Date(endDate);
      }
    }

    const scores = await RiskScore.find(query)
      .populate('student_id', 'first_name last_name email program')
      .sort({ prediction_date: -1 })
      .limit(limit)
      .exec();

    const total = await RiskScore.countDocuments(query);

    res.json({
      data: scores,
      total,
      limit,
      filters: {
        risk_level: riskLevel,
        term,
        year,
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    res.status(500).json({ error: 'Failed to fetch risk scores' });
  }
});

// Get risk score for specific student
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const term = req.query.term as string;
    const year = req.query.year as string;

    let query: any = { student_id: studentId };
    if (term) {
      query.term = term;
    }
    if (year) {
      query.year = year;
    }

    const score = await RiskScore.findOne(query)
      .populate('student_id', 'first_name last_name email')
      .sort({ prediction_date: -1 })
      .exec();

    if (!score) {
      return res.status(404).json({ error: 'Risk score not found' });
    }

    res.json(score);
  } catch (error) {
    console.error('Error fetching risk score:', error);
    res.status(500).json({ error: 'Failed to fetch risk score' });
  }
});

// Predict risk (placeholder for ML integration)
router.post('/predict/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.body;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Calculate risk score using the enhanced formula with optional term/year
    const riskCalculation = await calculateRiskScore(studentId, term, year);

    // Create new risk score record
    const newRiskScore = new RiskScore({
      student_id: studentId,
      risk_level: riskCalculation.riskLevel,
      risk_score: riskCalculation.riskScore,
      confidence: 85, // Default confidence for calculation-based score
      term: term || undefined,
      year: year || undefined,
      attendance_factor: riskCalculation.attendanceFactor,
      academic_factor: riskCalculation.academicFactor,
      behavior_factor: 50, // Default value since behavior not in current calculation
      model_version: '2.0.0',
      detailed_factors: riskCalculation.detailedFactors,
    });

    const savedScore = await newRiskScore.save();

    res.status(201).json({
      data: savedScore,
      message: 'Risk prediction generated successfully',
    });
  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Recalculate risk scores for all students
router.post('/recalculate-all', async (req: Request, res: Response) => {
  try {
    const { term, year } = req.body;
    const students = await Student.find({});
    let updatedCount = 0;
    let failedCount = 0;

    for (const student of students) {
      try {
        await updateRiskScoreForStudent(String(student._id), term, year);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to calculate risk for student ${student._id}:`, error);
        failedCount++;
      }
    }

    res.json({
      message: `Recalculated risk scores for ${updatedCount} students`,
      updated: updatedCount,
      failed: failedCount,
      term,
      year,
    });
  } catch (error) {
    console.error('Error recalculating risk scores:', error);
    res.status(500).json({ error: 'Failed to recalculate risk scores' });
  }
});

// Recalculate risk score for a specific student when term/year changes
router.post('/recalculate/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.body;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await updateRiskScoreForStudent(studentId, term, year);

    res.json({
      message: 'Risk score recalculated successfully',
      student_id: studentId,
      term,
      year,
    });
  } catch (error) {
    console.error('Error recalculating risk score:', error);
    res.status(500).json({ error: 'Failed to recalculate risk score' });
  }
});

// Calculate historical risk scores for all students across all terms and years
router.post('/calculate-historical', async (req: Request, res: Response) => {
  try {
    const { yearsBack } = req.body;
    const yearsToCalculate = yearsBack ? parseInt(yearsBack) : 2;

    console.log('Starting historical risk score calculation...');
    const result = await calculateAllHistoricalRiskScores(yearsToCalculate);

    res.json({
      message: 'Historical risk scores calculated successfully',
      ...result,
    });
  } catch (error) {
    console.error('Error calculating historical risk scores:', error);
    res.status(500).json({ error: 'Failed to calculate historical risk scores' });
  }
});

// Seed high-risk students for testing
router.post('/seed-high-risk', async (req: Request, res: Response) => {
  try {
    const { Attendance } = await import('../models/Attendance');
    const { AcademicRecord } = await import('../models/AcademicRecord');

    // Generate unique student IDs following 2024XXXX format
    function generateStudentId(): string {
      const currentYear = new Date().getFullYear();
      const randomSuffix = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      return `${currentYear}${randomSuffix}`;
    }

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
          return studentId!;
        }
        attempts++;
      }

      throw new Error('Failed to generate unique student ID after multiple attempts');
    }

    // Create high-risk students with poor academic performance
    const highRiskStudents = [
      {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        email: 'juan.delacruz@sjc.edu.ph',
        grade_level: 'Grade 10',
        section: 'Einstein',
        enrollment_date: new Date('2022-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 4,
        phone: '09171234567',
        address: '123 Main St, Manila',
        guardian_name: 'Maria Dela Cruz',
        guardian_relation: 'Mother',
        guardian_phone: '09181234567',
      },
      {
        first_name: 'Ana',
        last_name: 'Reyes',
        email: 'ana.reyes@sjc.edu.ph',
        grade_level: 'Grade 10',
        section: 'Einstein',
        enrollment_date: new Date('2022-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 4,
        phone: '09172345678',
        address: '456 Oak Ave, Quezon City',
        guardian_name: 'Jose Reyes',
        guardian_relation: 'Father',
        guardian_phone: '09182345678',
      },
      {
        first_name: 'Carlos',
        last_name: 'Santos',
        email: 'carlos.santos@sjc.edu.ph',
        grade_level: 'Grade 10',
        section: 'Einstein',
        enrollment_date: new Date('2022-06-15'),
        status: 'Active',
        program: 'Junior High School',
        year_level: 4,
        phone: '09173456789',
        address: '789 Pine Rd, Makati',
        guardian_name: 'Elena Santos',
        guardian_relation: 'Mother',
        guardian_phone: '09183456789',
      },
    ];

    const createdStudents = [];

    for (const studentData of highRiskStudents) {
      // Check if student already exists and delete their data to recreate
      const existingStudent = await Student.findOne({ email: studentData.email });
      if (existingStudent) {
        console.log(`🔄 Deleting existing student ${studentData.email} to recreate with proper data...`);

        // Delete related data
        await AcademicRecord.deleteMany({ student_id: existingStudent._id });
        await Attendance.deleteMany({ student_id: existingStudent._id });
        await RiskScore.deleteMany({ student_id: existingStudent._id });
        await Student.findByIdAndDelete(existingStudent._id);

        console.log(`✅ Deleted existing data for ${studentData.email}`);
      }

      // Generate unique student ID
      const studentId = await ensureUniqueStudentId();

      // Create student
      const student = await Student.create({ ...studentData, student_id: studentId });
      console.log(`✅ Created student: ${student.first_name} ${student.last_name} (ID: ${studentId})`);

      // Create 9 terms of academic records (3 years x 3 terms)
      const terms = ['1st Term', '2nd Term', '3rd Term'];
      const startYear = 2024;
      const currentYearNum = new Date().getFullYear();

      for (let year = startYear; year <= currentYearNum; year++) {
        for (const term of terms) {
          // Generate grades between 60-69 (just below 70 but at least higher than 60)
          const mathGrade = Math.floor(Math.random() * 10) + 60; // 60-69
          const englishGrade = Math.floor(Math.random() * 10) + 60; // 60-69
          const scienceGrade = Math.floor(Math.random() * 10) + 60; // 60-69
          const overallAverage = (mathGrade + englishGrade + scienceGrade) / 3;

          // Generate major subject grades array
          const majorSubjectGrades = [
            { subject: 'Mathematics', grade: mathGrade, date: new Date(year, term === '1st Term' ? 9 : term === '2nd Term' ? 11 : 4, 1) },
            { subject: 'English', grade: englishGrade, date: new Date(year, term === '1st Term' ? 9 : term === '2nd Term' ? 11 : 4, 1) },
            { subject: 'Science', grade: scienceGrade, date: new Date(year, term === '1st Term' ? 9 : term === '2nd Term' ? 11 : 4, 1) },
          ];

          const academicRecord = await AcademicRecord.create({
            student_id: student._id,
            term,
            year: year.toString(),
            mathematics_grade: mathGrade,
            english_grade: englishGrade,
            science_grade: scienceGrade,
            overall_average: parseFloat(overallAverage.toFixed(1)),
            major_subject_grades: majorSubjectGrades,
          });
          console.log(`✅ Created academic record for ${student.first_name} - ${term} ${year}: Avg ${overallAverage.toFixed(1)}`);
        }
      }

      // Create attendance records for the entire academic period (last 45 days)
      const today = new Date();
      for (let i = 0; i < 45; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        // Create attendance with high absence rate (only 40% present)
        const present = Math.random() < 0.4;
        await Attendance.create({
          student_id: student._id,
          attendance_date: date,
          present,
          subject: 'General',
          excused_absent: false,
        });
      }
      console.log(`✅ Created attendance records for ${student.first_name}`);

      // Calculate risk score
      const currentYearStr = new Date().getFullYear().toString();
      const currentMonth = new Date().getMonth();
      let currentTerm = '1st Term';
      if (currentMonth >= 11 || currentMonth <= 3) {
        currentTerm = '2nd Term';
      } else if (currentMonth >= 4 && currentMonth <= 8) {
        currentTerm = '3rd Term';
      }

      const riskCalculation = await calculateRiskScore(String(student._id), currentTerm, currentYearStr);
      console.log(`📊 Risk score for ${student.first_name}: ${riskCalculation.riskScore} (${riskCalculation.riskLevel})`);

      // Save risk score with term and year
      const riskScore = await RiskScore.create({
        student_id: student._id,
        risk_level: riskCalculation.riskLevel,
        risk_score: riskCalculation.riskScore,
        confidence: 85,
        term: currentTerm,
        year: currentYearStr,
        attendance_factor: riskCalculation.attendanceFactor,
        academic_factor: riskCalculation.academicFactor,
        behavior_factor: 50,
        model_version: '2.0.0',
        detailed_factors: riskCalculation.detailedFactors,
      });
      console.log(`✅ Saved risk score for ${student.first_name}`);

      createdStudents.push({
        id: student._id,
        name: `${student.first_name} ${student.last_name}`,
        riskScore: riskCalculation.riskScore,
        riskLevel: riskCalculation.riskLevel,
      });
    }

    res.json({
      message: `Created ${createdStudents.length} high-risk students`,
      students: createdStudents,
    });
  } catch (error) {
    console.error('Error seeding high-risk students:', error);
    res.status(500).json({ error: 'Failed to seed high-risk students' });
  }
});

// Seed attendance data for all terms and years
router.post('/seed-attendance-all', async (req: Request, res: Response) => {
  try {
    const { Attendance } = await import('../models/Attendance');

    // Helper function to get term start date
    function getTermStartDate(term: string, year: string): Date {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term':
          return new Date(yearNum, 8, 1); // September 1st
        case '2nd Term':
          return new Date(yearNum, 11, 1); // December 1st
        case '3rd Term':
          return new Date(yearNum + 1, 4, 1); // May 1st of next year
        default:
          return new Date(yearNum, 8, 1);
      }
    }

    // Helper function to get term end date
    function getTermEndDate(term: string, year: string): Date {
      const yearNum = parseInt(year);
      switch (term) {
        case '1st Term':
          return new Date(yearNum, 10, 30); // November 30th
        case '2nd Term':
          return new Date(yearNum + 1, 3, 30); // April 30th of next year
        case '3rd Term':
          return new Date(yearNum + 1, 8, 30); // August 30th of next year
        default:
          return new Date(yearNum, 10, 30);
      }
    }

    const students = await Student.find({});
    console.log(`📊 Found ${students.length} students`);

    const terms = ['1st Term', '2nd Term', '3rd Term'];
    const years = ['2024', '2025', '2026'];

    let totalAttendanceRecords = 0;
    let updatedStudents = 0;
    let skippedRecords = 0;

    for (const student of students) {
      console.log(`🔄 Processing ${student.first_name} ${student.last_name}...`);

      for (const year of years) {
        for (const term of terms) {
          const termStartDate = getTermStartDate(term, year);
          const termEndDate = getTermEndDate(term, year);

          // Check if attendance already exists for this term/year
          const existingAttendance = await Attendance.countDocuments({
            student_id: student._id,
            attendance_date: { $gte: termStartDate, $lte: termEndDate }
          });

          if (existingAttendance > 0) {
            skippedRecords += existingAttendance;
            continue;
          }

          // Generate attendance records for the term (about 45 school days)
          const currentDate = new Date(termEndDate);
          const attendanceRecords = [];

          for (let i = 0; i < 45; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Vary attendance rate based on student (60-95% attendance)
            const attendanceRate = 0.6 + Math.random() * 0.35;
            const present = Math.random() < attendanceRate;

            attendanceRecords.push({
              student_id: student._id,
              attendance_date: date,
              present,
              subject: 'General',
              excused_absent: !present && Math.random() < 0.3, // 30% of absences are excused
            });
          }

          if (attendanceRecords.length > 0) {
            await Attendance.insertMany(attendanceRecords);
            totalAttendanceRecords += attendanceRecords.length;
          }
        }
      }

      // Recalculate risk scores for all terms/years
      for (const year of years) {
        for (const term of terms) {
          try {
            await updateRiskScoreForStudent(String(student._id), term, year);
          } catch (err) {
            // Skip if no academic data exists for this term/year
            continue;
          }
        }
      }

      updatedStudents++;
    }

    res.json({
      message: 'Attendance data seeded successfully for all terms and years',
      totalAttendanceRecords,
      updatedStudents,
      skippedRecords,
      terms,
      years,
    });
  } catch (error) {
    console.error('Error seeding attendance data:', error);
    res.status(500).json({ error: 'Failed to seed attendance data' });
  }
});

export default router;
