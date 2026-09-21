import { Router, Request, Response } from 'express';
import { earlyWarningService, EarlyWarningPrediction } from '../services/earlyWarningService';
import { Student } from '../models/Student';

const router = Router();

/**
 * Get early warning prediction for a single student
 */
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const prediction = await earlyWarningService.generatePrediction(studentId);
    res.json({ data: prediction });
  } catch (error) {
    console.error('Error generating early warning prediction:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

/**
 * Get early warning predictions for multiple students
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { student_ids, term, year } = req.body;
    
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'Invalid student IDs' });
    }

    // Verify all students exist
    const students = await Student.find({ _id: { $in: student_ids } });
    if (students.length !== student_ids.length) {
      return res.status(404).json({ error: 'One or more students not found' });
    }

    const predictions = await earlyWarningService.generateBatchPredictions(student_ids, term, year);
    res.json({ data: predictions });
  } catch (error) {
    console.error('Error generating batch predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

/**
 * Get early warning predictions for all students (with optional filtering)
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    const riskLevel = req.query.risk_level as string;
    
    let filter: any = {};
    
    // Filter by faculty if provided
    if (facultyEmail) {
      const { Faculty } = await import('../models/Faculty');
      const faculty = await Faculty.findOne({ email: facultyEmail });
      if (faculty) {
        filter.assigned_faculty = faculty._id;
      }
    }

    const students = await Student.find(filter).select('_id');
    const studentIds = students.map(s => s._id.toString());

    const predictions = await earlyWarningService.generateBatchPredictions(studentIds);

    // Filter by risk level if provided
    let filteredPredictions = predictions;
    if (riskLevel && ['Low', 'Medium', 'High', 'Critical'].includes(riskLevel)) {
      filteredPredictions = predictions.filter(p => p.overall_risk_level === riskLevel);
    }

    // Sort by risk level (Critical first)
    const riskOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    filteredPredictions.sort((a, b) => riskOrder[a.overall_risk_level] - riskOrder[b.overall_risk_level]);

    res.json({ 
      data: filteredPredictions,
      total: filteredPredictions.length,
      summary: {
        critical: filteredPredictions.filter(p => p.overall_risk_level === 'Critical').length,
        high: filteredPredictions.filter(p => p.overall_risk_level === 'High').length,
        medium: filteredPredictions.filter(p => p.overall_risk_level === 'Medium').length,
        low: filteredPredictions.filter(p => p.overall_risk_level === 'Low').length,
      }
    });
  } catch (error) {
    console.error('Error generating all predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

/**
 * Get early warning summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    
    let filter: any = {};
    
    // Filter by faculty if provided
    if (facultyEmail) {
      const { Faculty } = await import('../models/Faculty');
      const faculty = await Faculty.findOne({ email: facultyEmail });
      if (faculty) {
        filter.assigned_faculty = faculty._id;
      }
    }

    const students = await Student.find(filter).select('_id');
    const studentIds = students.map(s => s._id.toString());

    const predictions = await earlyWarningService.generateBatchPredictions(studentIds);

    const summary = {
      total_students: predictions.length,
      risk_distribution: {
        critical: predictions.filter(p => p.overall_risk_level === 'Critical').length,
        high: predictions.filter(p => p.overall_risk_level === 'High').length,
        medium: predictions.filter(p => p.overall_risk_level === 'Medium').length,
        low: predictions.filter(p => p.overall_risk_level === 'Low').length,
      },
      average_dropout_risk: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.dropout_risk, 0) / predictions.length 
        : 0,
      average_academic_failure_risk: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.academic_failure_risk, 0) / predictions.length 
        : 0,
      common_risk_factors: predictions.length > 0 ? getCommonRiskFactors(predictions) : [],
    };

    res.json({ data: summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Helper function to get common risk factors
 */
function getCommonRiskFactors(predictions: EarlyWarningPrediction[]): string[] {
  const factorCounts: Record<string, number> = {};
  
  predictions.forEach(prediction => {
    prediction.risk_factors.forEach(factor => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    });
  });

  return Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([factor]) => factor);
}

export default router;
