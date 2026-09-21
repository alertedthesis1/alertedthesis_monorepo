import { Router, Request, Response } from 'express';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';
import { Task } from '../models/Task';
import { buildStudentSummary } from '../utils/studentMetrics';

const router = Router();

// Aggregated stat cards for the main dashboard
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    const term = req.query.term as string;
    const year = req.query.year as string;
    
    let facultySection: string | undefined;
    if (facultyEmail) {
      const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
      facultySection = faculty?.section;
    }
    const studentFilter = facultySection ? { section: facultySection } : {};

    const totalStudents = await Student.countDocuments(studentFilter);

    // Build risk score query with term/year filters
    const riskQuery: any = {};
    if (term) riskQuery.term = term;
    if (year) riskQuery.year = year;

    const latestRisks = await RiskScore.aggregate([
      { $match: riskQuery },
      { $sort: { prediction_date: -1 } },
      { $group: { _id: '$student_id', risk_level: { $first: '$risk_level' } } },
    ]);

    let studentIds: string[] = [];
    if (facultySection) {
      const facultyStudents = await Student.find(studentFilter).select('_id');
      studentIds = facultyStudents.map((s) => String(s._id));
    }

    const atRisk = latestRisks.filter(
      (r) =>
        (r.risk_level === 'High' || r.risk_level === 'Medium') &&
        (!facultySection || studentIds.includes(String(r._id)))
    ).length;

    const interventionFilter = facultySection
      ? { student_id: { $in: studentIds } }
      : {};
    const totalInterventions = await Intervention.countDocuments(interventionFilter);
    const completed = await Intervention.countDocuments({ ...interventionFilter, status: 'Completed' });
    const activeThisWeek = await Intervention.countDocuments({ ...interventionFilter, status: 'Active' });

    const pendingTasks = await Task.countDocuments({ status: 'Pending' });

    res.json({
      totalStudents,
      atRisk,
      atRiskPercent: totalStudents ? Number(((atRisk / totalStudents) * 100).toFixed(1)) : 0,
      interventions: activeThisWeek || totalInterventions,
      successRate: totalInterventions ? Math.round((completed / totalInterventions) * 100) : 0,
      tasks: pendingTasks,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// All students shaped for the UI (dashboard + counselor caseload consume this)
router.get('/students', async (req: Request, res: Response) => {
  try {
    const facultyEmail = req.query.faculty_email as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const term = req.query.term as string;
    const year = req.query.year as string;

    let facultySection: string | undefined;
    if (facultyEmail) {
      const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
      facultySection = faculty?.section;
    }
    const filter = facultySection ? { section: facultySection } : {};

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Student.countDocuments(filter)
    ]);

    const summaries = await Promise.all(students.map((s) => buildStudentSummary(s, term, year)));

    res.json({
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

export default router;