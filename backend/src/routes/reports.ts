import { Router, Request, Response } from 'express';
import { Report } from '../models/Report';
import { Student } from '../models/Student';
import { Intervention } from '../models/Intervention';
import { Schedule } from '../models/Schedule';
import { RiskScore } from '../models/RiskScore';
import { Task } from '../models/Task';
import { AcademicRecord } from '../models/AcademicRecord';

const router = Router();

// Get all reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await Report.find()
      .populate('student_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .exec();

    res.json({ data: reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get reports for a specific student
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const reports = await Report.find({ student_id: studentId })
      .populate('student_id', 'first_name last_name')
      .sort({ createdAt: -1 })
      .exec();

    res.json({ data: reports });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    res.status(500).json({ error: 'Failed to fetch student reports' });
  }
});

// Create a new report
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, report_type, description, student_id, generated_by, data, status } = req.body;

    // If student_id is provided, verify student exists
    if (student_id) {
      const student = await Student.findById(student_id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
    }

    const report = new Report({
      title,
      report_type,
      description,
      student_id,
      generated_by,
      data,
      status: status || 'Draft',
    });

    await report.save();
    res.status(201).json({ data: report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update a report
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ data: updatedReport });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete a report
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Archive the report before deletion
    const { ReportArchive } = await import('../models/ReportArchive');
    await ReportArchive.create({
      original_id: report._id,
      title: report.title,
      report_type: report.report_type,
      description: report.description,
      student_id: report.student_id,
      generated_by: report.generated_by,
      data: report.data,
      status: report.status,
      deleted_by: req.body.deleted_by || req.headers['user-email'] as string,
    });

    // Delete the report
    await Report.findByIdAndDelete(id);

    res.json({ message: 'Report deleted successfully and archived' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Generate a report with real data
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { report_type, student_id, generated_by } = req.body;

    if (!report_type || !student_id || !generated_by) {
      return res.status(400).json({ error: 'Missing required fields: report_type, student_id, generated_by' });
    }

    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let reportData: any = {};
    let title = '';
    let description = '';

    switch (report_type) {
      case 'Attendance':
        title = `Attendance Report - ${student.first_name} ${student.last_name}`;
        description = 'Summary of student attendance patterns';
        const attendanceSchedules = await Schedule.find({ student_id });
        const totalSchedules = attendanceSchedules.length;
        const completedSchedules = attendanceSchedules.filter((s: any) => s.status === 'Completed').length;
        const cancelledSchedules = attendanceSchedules.filter((s: any) => s.status === 'Cancelled').length;
        const noShowSchedules = attendanceSchedules.filter((s: any) => s.status === 'No-Show').length;
        const scheduledSchedules = attendanceSchedules.filter((s: any) => s.status === 'Scheduled').length;
        
        // Get connected interventions for attendance context
        const attendanceScheduleIds = attendanceSchedules.map(s => s._id);
        const attendanceConnectedInterventions = await Intervention.find({ schedule_id: { $in: attendanceScheduleIds } });
        
        // Clean schedule types for clearer presentation
        const cleanScheduleTypes = attendanceSchedules.reduce((acc: any, s: any) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        }, {});
        
        reportData = {
          student_name: `${student.first_name} ${student.last_name}`,
          grade_level: student.grade_level,
          section: student.section,
          total_appointments: totalSchedules,
          attended_appointments: completedSchedules,
          cancelled_appointments: cancelledSchedules,
          missed_appointments: noShowSchedules,
          upcoming_appointments: scheduledSchedules,
          attendance_rate: totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0,
          connected_interventions: attendanceConnectedInterventions.length,
          appointment_types: cleanScheduleTypes,
          upcoming_count: attendanceSchedules.filter((s: any) => s.status === 'Scheduled' && new Date(s.date) >= new Date()).length
        };
        break;

      case 'Academic':
        title = `Academic Report - ${student.first_name} ${student.last_name}`;
        description = 'Academic performance analysis';
        const academicRecords = await AcademicRecord.find({ student_id }).sort({ createdAt: -1 }).limit(1);
        const latestAcademic = academicRecords[0];
        
        // Clean major subject grades for clearer presentation
        const cleanMajorSubjectGrades = (latestAcademic?.major_subject_grades || []).map((grade: any) => ({
          subject: grade.subject,
          grade: grade.grade,
          date: grade.date ? grade.date.toISOString().split('T')[0] : 'N/A'
        })).filter((grade: any) => grade.subject && grade.grade !== null && grade.grade !== undefined);
        
        reportData = {
          student_name: `${student.first_name} ${student.last_name}`,
          grade_level: student.grade_level,
          section: student.section,
          program: student.program,
          year_level: student.year_level,
          overall_average: latestAcademic?.overall_average || 0,
          mathematics_grade: latestAcademic?.mathematics_grade || 0,
          english_grade: latestAcademic?.english_grade || 0,
          science_grade: latestAcademic?.science_grade || 0,
          academic_year: latestAcademic?.year || 'N/A',
          term: latestAcademic?.term || 'N/A',
          major_subject_grades: cleanMajorSubjectGrades,
        };
        break;

      case 'Behavioral':
        title = `Behavioral Report - ${student.first_name} ${student.last_name}`;
        description = 'Behavioral incidents and observations';
        const behavioralInterventions = await Intervention.find({ student_id });
        const behavioralInterventionIds = behavioralInterventions.map(i => i.intervention_id);
        const behavioralTasks = await Task.find({ intervention_id: { $in: behavioralInterventionIds } });
        const behavioralSchedules = await Schedule.find({ intervention_id: { $in: behavioralInterventionIds } });
        
        // Get latest risk score for behavioral context
        const latestRiskScoreBehavioral = await RiskScore.findOne({ student_id }).sort({ prediction_date: -1 });
        
        // Clean recent interventions for clearer presentation
        const cleanRecentInterventions = behavioralInterventions.slice(-5).map((i: any) => ({
          intervention_id: i.intervention_id,
          type: i.intervention_type,
          status: i.status,
          start_date: i.start_date ? i.start_date.toISOString().split('T')[0] : 'N/A',
          outcome: i.outcome || 'In progress'
        }));
        
        reportData = {
          student_name: `${student.first_name} ${student.last_name}`,
          grade_level: student.grade_level,
          section: student.section,
          total_interventions: behavioralInterventions.length,
          active_interventions: behavioralInterventions.filter((i: any) => i.status === 'Active').length,
          completed_interventions: behavioralInterventions.filter((i: any) => i.status === 'Completed').length,
          pending_interventions: behavioralInterventions.filter((i: any) => i.status === 'Pending').length,
          cancelled_interventions: behavioralInterventions.filter((i: any) => i.status === 'Cancelled').length,
          total_tasks: behavioralTasks.length,
          completed_tasks: behavioralTasks.filter((t: any) => t.status === 'Completed').length,
          current_risk_level: latestRiskScoreBehavioral?.risk_level || 'Low',
          risk_score: latestRiskScoreBehavioral?.risk_score || 0,
          behavior_factor: latestRiskScoreBehavioral?.behavior_factor || 0,
          intervention_types: behavioralInterventions.reduce((acc: any, i: any) => {
            acc[i.intervention_type] = (acc[i.intervention_type] || 0) + 1;
            return acc;
          }, {}),
          recent_interventions: cleanRecentInterventions
        };
        break;

      case 'Risk':
        title = `Risk Assessment Report - ${student.first_name} ${student.last_name}`;
        description = 'Comprehensive risk evaluation';
        const riskScoreData = await RiskScore.find({ student_id }).sort({ prediction_date: -1 }).limit(5);
        const latestRiskScore = riskScoreData[0];
        
        // Get related interventions and tasks for risk context
        const riskActiveInterventions = await Intervention.find({ student_id, status: 'Active' });
        const riskInterventionIds = riskActiveInterventions.map(i => i.intervention_id);
        const riskActiveTasks = await Task.find({ intervention_id: { $in: riskInterventionIds }, status: { $in: ['Pending', 'In Progress'] } });
        
        // Clean historical scores for clearer presentation
        const cleanHistoricalScores = riskScoreData.map((r: any) => ({
          date: r.prediction_date ? r.prediction_date.toISOString().split('T')[0] : 'N/A',
          risk_score: r.risk_score,
          attendance_factor: r.attendance_factor,
          academic_factor: r.academic_factor,
          behavior_factor: r.behavior_factor,
          risk_level: r.risk_level,
        }));
        
        reportData = {
          student_name: `${student.first_name} ${student.last_name}`,
          grade_level: student.grade_level,
          section: student.section,
          program: student.program,
          current_risk_level: latestRiskScore?.risk_level || 'Low',
          risk_score: latestRiskScore?.risk_score || 0,
          attendance_factor: latestRiskScore?.attendance_factor || 0,
          academic_factor: latestRiskScore?.academic_factor || 0,
          behavior_factor: latestRiskScore?.behavior_factor || 0,
          assessment_date: latestRiskScore?.prediction_date ? latestRiskScore.prediction_date.toISOString().split('T')[0] : 'N/A',
          confidence: latestRiskScore?.confidence || 0,
          historical_scores: cleanHistoricalScores,
          active_interventions: riskActiveInterventions.length,
          active_tasks: riskActiveTasks.length,
          intervention_types: riskActiveInterventions.reduce((acc: any, i: any) => {
            acc[i.intervention_type] = (acc[i.intervention_type] || 0) + 1;
            return acc;
          }, {}),
          risk_indicators: {
            attendance_concern: (latestRiskScore?.attendance_factor || 0) < 50,
            academic_concern: (latestRiskScore?.academic_factor || 0) < 50,
            behavior_concern: (latestRiskScore?.behavior_factor || 0) < 50,
          }
        };
        break;

      case 'Intervention':
        title = `Intervention Report - ${student.first_name} ${student.last_name}`;
        description = 'Intervention outcomes and progress';
        const allStudentInterventions = await Intervention.find({ student_id });
        const studentInterventionIds = allStudentInterventions.map(i => i.intervention_id);
        const studentInterventionTasks = await Task.find({ intervention_id: { $in: studentInterventionIds } });
        
        // Clean intervention details for clearer presentation
        const cleanInterventionDetails = allStudentInterventions.map((i: any) => ({
          intervention_id: i.intervention_id,
          type: i.intervention_type,
          status: i.status,
          start_date: i.start_date ? i.start_date.toISOString().split('T')[0] : 'N/A',
          end_date: i.end_date ? i.end_date.toISOString().split('T')[0] : 'Ongoing',
          outcome: i.outcome || 'In progress',
          task_count: studentInterventionTasks.filter((t: any) => t.intervention_id === i.intervention_id).length
        }));
        
        reportData = {
          student_name: `${student.first_name} ${student.last_name}`,
          grade_level: student.grade_level,
          section: student.section,
          total_interventions: allStudentInterventions.length,
          completed_interventions: allStudentInterventions.filter((i: any) => i.status === 'Completed').length,
          active_interventions: allStudentInterventions.filter((i: any) => i.status === 'Active').length,
          pending_interventions: allStudentInterventions.filter((i: any) => i.status === 'Pending').length,
          total_tasks: studentInterventionTasks.length,
          pending_tasks: studentInterventionTasks.filter((t: any) => t.status === 'Pending').length,
          in_progress_tasks: studentInterventionTasks.filter((t: any) => t.status === 'In Progress').length,
          completed_tasks: studentInterventionTasks.filter((t: any) => t.status === 'Completed').length,
          intervention_types: allStudentInterventions.reduce((acc: any, i: any) => {
            acc[i.intervention_type] = (acc[i.intervention_type] || 0) + 1;
            return acc;
          }, {}),
          interventions_details: cleanInterventionDetails
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const report = new Report({
      title,
      report_type,
      description,
      student_id,
      generated_by,
      data: reportData,
      status: 'Generated',
    });

    await report.save();
    res.status(201).json({ data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Helper function to convert JSON to CSV
function jsonToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const flattenObject = (obj: any, prefix = ''): any => {
    const result: any = {};
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        // Skip empty arrays and null values
        if (obj[key].length > 0) {
          result[newKey] = JSON.stringify(obj[key]);
        }
      } else {
        // Skip null and undefined values
        if (obj[key] !== null && obj[key] !== undefined) {
          result[newKey] = obj[key];
        }
      }
    }
    return result;
  };

  const flattened = flattenObject(data);
  const headers = Object.keys(flattened);
  const values = Object.values(flattened);

  const csv = [
    headers.join(','),
    values.map(v => {
      const str = String(v || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ].join('\n');

  return csv;
}

// Download report as CSV
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id).populate('student_id', 'first_name last_name');
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report.title.replace(/\s+/g, '_')}.csv"`);

    // Create CSV content
    const reportMetadata = {
      'Report Title': report.title,
      'Report Type': report.report_type,
      'Description': report.description,
      'Student Name': (report.student_id as any) ? `${(report.student_id as any).first_name} ${(report.student_id as any).last_name}` : 'N/A',
      'Generated By': report.generated_by,
      'Generated Date': new Date(report.createdAt).toLocaleDateString(),
      'Status': report.status,
    };

    const metadataCSV = jsonToCSV(reportMetadata);
    const dataCSV = jsonToCSV(report.data);

    const csvContent = [
      '=== REPORT METADATA ===',
      metadataCSV,
      '',
      '=== REPORT DATA ===',
      dataCSV
    ].join('\n');

    res.send(csvContent);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Seed sample reports (temporary endpoint)
router.post('/seed-sample', async (req: Request, res: Response) => {
  try {
    const { Student } = await import('../models/Student');
    const students = await Student.find().limit(5).exec();
    
    const sampleReports = [
      {
        title: 'Monthly Attendance Report',
        report_type: 'Attendance',
        description: 'Summary of student attendance patterns for the current month',
        student_id: students[0]?._id,
        generated_by: 'counselor@sjc.edu.ph',
        status: 'Generated',
        data: { attendance_rate: 92, total_days: 20, present_days: 18 },
      },
      {
        title: 'Academic Performance Analysis',
        report_type: 'Academic',
        description: 'Detailed analysis of academic progress and areas for improvement',
        student_id: students[1]?._id,
        generated_by: 'counselor@sjc.edu.ph',
        status: 'Generated',
        data: { overall_average: 82, subjects: 6, improvements: 2 },
      },
      {
        title: 'Behavioral Incident Report',
        report_type: 'Behavioral',
        description: 'Documentation of behavioral incidents and intervention outcomes',
        student_id: students[2]?._id,
        generated_by: 'counselor@sjc.edu.ph',
        status: 'Draft',
        data: { incidents: 2, resolved: 1 },
      },
      {
        title: 'Risk Assessment Summary',
        report_type: 'Risk',
        description: 'Comprehensive risk evaluation and recommended interventions',
        student_id: students[3]?._id,
        generated_by: 'counselor@sjc.edu.ph',
        status: 'Generated',
        data: { risk_level: 'High', risk_score: 75 },
      },
      {
        title: 'Intervention Effectiveness Report',
        report_type: 'Intervention',
        description: 'Analysis of intervention outcomes and success rates',
        student_id: students[4]?._id,
        generated_by: 'counselor@sjc.edu.ph',
        status: 'Generated',
        data: { interventions: 3, successful: 2, success_rate: 67 },
      },
    ];

    const createdReports = await Report.insertMany(sampleReports);
    res.json({ 
      message: 'Sample reports seeded successfully',
      created: createdReports.length
    });
  } catch (error) {
    console.error('Error seeding reports:', error);
    res.status(500).json({ error: 'Failed to seed reports' });
  }
});

export default router;
