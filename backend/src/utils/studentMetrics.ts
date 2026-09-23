import { IStudent } from '../models/Student';
import { Attendance } from '../models/Attendance';
import { AcademicRecord } from '../models/AcademicRecord';
import { BehaviorReport, IBehaviorReport } from '../models/BehaviorReport';
import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';
import { Alert } from '../models/Alert';
import { Schedule } from '../models/Schedule';

export interface StudentSummary {
  id: string;
  student_id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  email: string;
  phone: string;
  address: string;
  enrolledDate: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  riskScore: number;
  confidence: number;
  attendance: number;
  generalAverage: number;
  mathematicsGrade?: number;
  englishGrade?: number;
  scienceGrade?: number;
  lastActive: string;
  interventions: number;
  keyConcerns: string[];
  lastSession: string;
  nextAppointment: string;
  appointmentScheduled: boolean;
}

export interface StudentAlert {
  id: string;
  category: 'Attendance' | 'Academic' | 'Behavioral';
  date: string;
  message: string;
}

// Convert a date to a human-readable "time ago" format
// Returns strings like "Today", "1 day ago", "2 weeks ago", etc.
function timeAgo(date?: Date): string {
  if (!date) return 'Unknown';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

// Format a date to a readable string (e.g., "January 1, 2024")
function formatDate(date?: Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Build a comprehensive student summary by aggregating data from multiple collections
// Uses MongoDB aggregation pipelines to efficiently fetch attendance, academics, risk scores,
// behavior reports, interventions, and schedules in parallel queries
// Returns a StudentSummary object with all key metrics and concerns
export async function buildStudentSummary(student: IStudent, term?: string, year?: string): Promise<StudentSummary> {
  const sid = student._id;

  // Build risk score query with term/year filters
  const riskQuery: any = { student_id: sid };
  if (term) riskQuery.term = term;
  if (year) riskQuery.year = year;

  // Use aggregation to fetch all related data in fewer queries
  const [attendanceData, academic, latestRisk, behaviorReports, interventionData, scheduleData] =
    await Promise.all([
      // Aggregate attendance to get count and present count in one query
      Attendance.aggregate([
        { $match: { student_id: sid } },
        { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: ['$present', 1, 0] } } } }
      ]),
      AcademicRecord.findOne({ student_id: sid }).sort({ createdAt: -1 }),
      RiskScore.findOne(riskQuery).sort({ prediction_date: -1 }),
      BehaviorReport.find({ student_id: sid }).sort({ report_date: -1 }).limit(5),
      // Aggregate interventions to get count and latest in one query
      Intervention.aggregate([
        { $match: { student_id: sid } },
        { $facet: {
          count: [{ $count: 'total' }],
          latest: [{ $sort: { start_date: -1 } }, { $limit: 1 }]
        }}
      ]),
      // Aggregate schedules to get past and future in one query
      Schedule.aggregate([
        { $match: { student_id: sid } },
        { $sort: { date: 1, time: 1 } },
        { $facet: {
          past: [
            { $match: { date: { $lt: new Date() } } },
            { $sort: { date: -1, time: -1 } },
            { $limit: 1 }
          ],
          future: [
            { $match: { date: { $gte: new Date() } } },
            { $limit: 1 }
          ],
          nextScheduled: [
            { $match: { status: 'Scheduled' } },
            { $sort: { date: 1, time: 1 } },
            { $limit: 1 }
          ]
        }}
      ])
    ]);

  const attendanceResult = attendanceData[0] || { total: 0, present: 0 };
  const totalAtt = attendanceResult.total;
  const present = attendanceResult.present;
  const attendance = totalAtt ? Math.round((present / totalAtt) * 100) : 0;

  const generalAverage = academic?.overall_average ?? 0;
  const mathematicsGrade = academic?.mathematics_grade;
  const englishGrade = academic?.english_grade;
  const scienceGrade = academic?.science_grade;

  const riskLevel = (latestRisk?.risk_level ?? 'Low') as 'High' | 'Medium' | 'Low';
  const riskScore = latestRisk ? Math.round(latestRisk.risk_score) : 0;
  const confidence = latestRisk ? Math.round(latestRisk.confidence) : 0;

  const keyConcerns: string[] = [];
  if (totalAtt && attendance < 75) keyConcerns.push('Low attendance');
  if (academic && generalAverage < 75) keyConcerns.push('Declining grades');
  if (behaviorReports.some((b) => b.severity === 'High' || b.severity === 'Critical'))
    keyConcerns.push('Behavioral incidents');

  const interventionResult = interventionData[0] || { count: [{ total: 0 }], latest: [] };
  const interventionCount = interventionResult.count[0]?.total || 0;
  const pastSchedules = scheduleData[0]?.past || [];
  const futureSchedules = scheduleData[0]?.future || [];
  const nextScheduled = scheduleData[0]?.nextScheduled || [];

  const lastSession = pastSchedules.length > 0
    ? timeAgo(pastSchedules[0].date)
    : 'No sessions';

  const nextAppointment = nextScheduled.length > 0
    ? `${formatDate(nextScheduled[0].date)} at ${nextScheduled[0].time}`
    : 'Not scheduled';

  return {
    id: String(student._id),
    student_id: student.student_id || String(student._id),
    studentNo: student.grade_level
      ? String(student._id).slice(-6).toUpperCase()
      : String(student._id).slice(-6).toUpperCase(),
    firstName: student.first_name,
    lastName: student.last_name,
    grade: student.grade_level || `Year ${student.year_level ?? 1}`,
    section: student.section || student.program,
    email: student.email,
    phone: student.phone || 'N/A',
    address: student.address || 'N/A',
    enrolledDate: formatDate(student.enrollment_date),
    guardianName: student.guardian_name || 'N/A',
    guardianRelation: student.guardian_relation || 'N/A',
    guardianPhone: student.guardian_phone || 'N/A',
    riskLevel,
    riskScore,
    confidence,
    attendance,
    generalAverage,
    mathematicsGrade,
    englishGrade,
    scienceGrade,
    lastActive: timeAgo(student.updatedAt),
    interventions: interventionCount,
    keyConcerns,
    lastSession,
    nextAppointment,
    appointmentScheduled: nextScheduled.length > 0,
  };
}

// Build a list of student alerts for the profile page
// Returns the 10 most recent alerts sorted by date
export async function buildStudentAlerts(studentId: string): Promise<StudentAlert[]> {
  const alerts = await Alert.find({ student_id: studentId })
    .sort({ date: -1 })
    .limit(10)
    .exec();

  return alerts.map((a) => ({
    id: String(a._id),
    category: a.category,
    date: new Date(a.date).toISOString().slice(0, 10),
    message: a.message,
  }));
}
