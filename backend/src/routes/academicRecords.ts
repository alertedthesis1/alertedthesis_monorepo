import express from 'express';
import { AcademicRecord } from '../models/AcademicRecord';
import { updateRiskScoreForStudent } from '../services/riskCalculationService';

const router = express.Router();

// Create a new academic record
router.post('/', async (req, res) => {
  try {
    const { student_id, term, year, mathematics_grade, english_grade, science_grade, major_subjects_enrolled, major_subjects_passed, major_subjects_failed, total_units } = req.body;

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

    const academicRecord = new AcademicRecord({
      student_id,
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

    await academicRecord.save();
    
    // Automatically recalculate risk score for the student
    try {
      await updateRiskScoreForStudent(student_id, term, year);
    } catch (error) {
      console.error('Error updating risk score after academic record:', error);
      // Don't fail the request if risk score update fails
    }

    res.status(201).json({
      success: true,
      data: academicRecord,
    });
  } catch (error) {
    console.error('Error creating academic record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create academic record',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get academic records for a student
router.get('/student/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;
    const { term, year } = req.query;

    const filter: any = { student_id };
    if (term) filter.term = term;
    if (year) filter.year = year;

    const records = await AcademicRecord.find(filter).sort({ year: -1, term: 1 });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching academic records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic records',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update an academic record
router.put('/:id', async (req, res) => {
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

    const academicRecord = await AcademicRecord.findByIdAndUpdate(
      id,
      {
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
      },
      { new: true }
    );

    if (!academicRecord) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found',
      });
    }
    
    // Automatically recalculate risk score for the student
    try {
      await updateRiskScoreForStudent(academicRecord.student_id.toString(), term, year);
    } catch (error) {
      console.error('Error updating risk score after academic record update:', error);
      // Don't fail the request if risk score update fails
    }

    res.status(200).json({
      success: true,
      data: academicRecord,
    });
  } catch (error) {
    console.error('Error updating academic record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update academic record',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete an academic record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const academicRecord = await AcademicRecord.findByIdAndDelete(id);

    if (!academicRecord) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Academic record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting academic record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete academic record',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
