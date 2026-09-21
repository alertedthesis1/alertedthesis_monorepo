import axios from 'axios';
import { RiskLevel, StudentRecord, CaseloadStudent, AlertItem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const client = axios.create({ baseURL: API_URL, timeout: 8000 });

export interface DashboardStats {
  totalStudents: number;
  atRisk: number;
  atRiskPercent: number;
  interventions: number;
  successRate: number;
  tasks: number;
}

export interface StudentSummary extends CaseloadStudent {
  confidence?: number;
  gradeLevel?: string;
  yearLevel?: number;
  program?: string;
  status?: 'Active' | 'Graduated' | 'Suspended' | 'Dropped' | 'On Leave';
}

export interface StudentDetail extends StudentSummary {
  alerts: AlertItem[];
}

export interface AnalyticsOverview {
  summary: {
    modelAccuracy: number;
    accuracyDelta: number;
    interventions: number;
    earlyDetection: number;
    preventionRate: number;
  };
  riskTrend: { month: string; high: number; medium: number; low: number }[];
  riskDistribution: { name: string; value: number; color: string }[];
  interventionEffectiveness: { type: string; rate: number }[];
  attendancePattern: { day: string; attendance: number }[];
}

export interface EarlyWarningPrediction {
  student_id: string;
  dropout_risk: number;
  academic_failure_risk: number;
  overall_risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_factors: string[];
  recommended_actions: string[];
  prediction_date: string;
}

export interface RiskScoreFilter {
  term?: string;
  year?: string;
  start_date?: string;
  end_date?: string;
  risk_level?: string;
}

export interface RiskScoreData {
  _id: string;
  student_id: {
    _id: string;
    first_name: string;
    last_name: string;
    email?: string;
    program?: string;
  };
  risk_level: 'Low' | 'Medium' | 'High';
  risk_score: number;
  confidence: number;
  prediction_date: string;
  term?: string;
  year?: string;
  attendance_factor: number;
  academic_factor: number;
  behavior_factor: number;
  detailed_factors?: {
    attendanceRate: number;
    unexcusedAbsenceRate: number;
    overallAverage: number;
    gpa: number;
    failedMajorSubjects: number;
    majorSubjectCompletionRate: number;
    subjectGrades: {
      mathematics: number;
      english: number;
      science: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface EarlyWarningSummary {
  total_students: number;
  risk_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  average_student_at_risk: number;
  average_academic_failure_risk: number;
  common_risk_factors: string[];
}

export interface Schedule {
  _id: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  type: 'Mentoring' | 'Tutoring' | 'Counseling' | 'Family Meeting'; // Database values
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No-Show';
  notes?: string;
  intervention_id?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch dashboard statistics including total students, at-risk count, interventions, and success rate
// Returns default zero values if the request fails
export async function fetchDashboardStats(facultyEmail?: string, term?: string, year?: string): Promise<DashboardStats> {
  try {
    const params: any = {};
    if (facultyEmail) params.faculty_email = facultyEmail;
    if (term) params.term = term;
    if (year) params.year = year;
    const { data } = await client.get<DashboardStats>('/dashboard/stats', { params });
    return data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalStudents: 0,
      atRisk: 0,
      atRiskPercent: 0,
      interventions: 0,
      successRate: 0,
      tasks: 0,
    };
  }
}

// Fetch students with pagination support
// Returns paginated student data with summary metrics for caseload/dashboard views
export async function fetchStudents(facultyEmail?: string, page = 1, limit = 20, term?: string, year?: string): Promise<{ data: StudentSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const params: any = { 
      ...(facultyEmail && { faculty_email: facultyEmail }),
      page,
      limit
    };
    if (term) params.term = term;
    if (year) params.year = year;
    const { data } = await client.get<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/dashboard/students', { params });
    if (Array.isArray(data.data) && data.data.length) {
      return {
        data: data.data.map((s) => ({
          id: s.id,
          student_id: s.student_id,
          studentNo: s.studentNo,
          firstName: s.firstName,
          lastName: s.lastName,
          grade: s.grade,
          section: s.section,
          email: s.email,
          phone: s.phone,
          address: s.address,
          enrolledDate: s.enrolledDate,
          guardianName: s.guardianName,
          guardianRelation: s.guardianRelation,
          guardianPhone: s.guardianPhone,
          riskLevel: s.riskLevel,
          riskScore: s.riskScore,
          attendance: s.attendance,
          yearLevel: s.yearLevel,
          program: s.program,
          status: s.status,
          generalAverage: s.generalAverage,
          mathematicsGrade: s.mathematicsGrade,
          englishGrade: s.englishGrade,
          scienceGrade: s.scienceGrade,
          gpa: s.gpa,
          lastActive: s.lastActive,
          interventions: s.interventions,
          keyConcerns: s.keyConcerns,
          lastSession: s.lastSession,
          nextAppointment: s.nextAppointment,
          appointmentScheduled: s.appointmentScheduled,
        })),
        pagination: data.pagination || { page, limit, total: 0, totalPages: 0 }
      };
    }
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
}

// Fetch detailed student profile including summary metrics and recent alerts
// Used for the student profile page
export async function fetchStudentDetail(id: string): Promise<StudentDetail | null> {
  try {
    const { data } = await client.get<{ data: StudentDetail }>(`/students/${id}/detail`);
    return data.data;
  } catch {
    return null;
  }
}

// Fetch alerts for a specific student
// Returns an array of alert items sorted by date
export async function fetchStudentAlerts(studentId: string): Promise<AlertItem[]> {
  try {
    const { data } = await client.get<{ data: any[] }>(`/alerts/student/${studentId}`);
    if (Array.isArray(data.data)) {
      return data.data.map((a) => ({
        id: a._id,
        category: a.category,
        date: a.date,
        message: a.message,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching student alerts:', error);
    return [];
  }
}

// Fetch intervention history for a specific student
// Returns all interventions associated with the student
export async function fetchStudentInterventions(studentId: string): Promise<Intervention[]> {
  try {
    const { data } = await client.get<{ data: Intervention[] }>(`/interventions/student/${studentId}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student interventions:', error);
    return [];
  }
}

// Fetch scheduled appointments for a specific student
// Returns all schedules for the student
export async function fetchStudentSchedules(studentId: string): Promise<Schedule[]> {
  try {
    const { data } = await client.get<{ data: Schedule[] }>(`/schedules/student/${studentId}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    return [];
  }
}

// Fetch reports for a specific student
// Returns all reports associated with the student
export async function fetchStudentReports(studentId: string): Promise<Report[]> {
  try {
    const { data } = await client.get<{ data: Report[] }>(`/reports/student/${studentId}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return [];
  }
}

// Create a new student record
// Accepts complete student data and returns the created record
export async function createStudent(studentData: any) {
  try {
    const { data } = await client.post('/students', studentData);
    return data;
  } catch (error) {
    console.error('Error creating student:', error);
    throw error;
  }
}

// Update an existing student record by ID
// Accepts partial updates and returns the updated record
export async function updateStudent(id: string, studentData: any) {
  try {
    const { data } = await client.put(`/students/${id}`, studentData);
    return data;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
}

// Delete a student record by ID
// Permanently removes the student from the database
export async function deleteStudent(id: string) {
  try {
    const { data } = await client.delete(`/students/${id}`);
    return data;
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

// Fetch analytics overview data for the analytics dashboard
// Returns risk trends, distribution, intervention effectiveness, and attendance patterns
export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  try {
    const { data } = await client.get<AnalyticsOverview>('/analytics/overview');
    return data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      summary: {
        modelAccuracy: 0,
        accuracyDelta: 0,
        interventions: 0,
        earlyDetection: 0,
        preventionRate: 0,
      },
      riskTrend: [],
      riskDistribution: [],
      interventionEffectiveness: [],
      attendancePattern: [],
    };
  }
}

// Fetch all schedules for a faculty member
// Returns scheduled appointments filtered by faculty email if provided
export async function fetchSchedules(facultyEmail?: string): Promise<Schedule[]> {
  try {
    const params = facultyEmail ? { faculty_email: facultyEmail } : {};
    const { data } = await client.get<{ data: Schedule[] }>('/schedules', { params });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
}

// Create a new schedule/appointment
// Accepts schedule details and returns the created schedule
export async function createSchedule(schedule: {
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  type: string;
  intervention_id?: string;
  notes?: string;
  created_by?: string;
}): Promise<Schedule> {
  try {
    const { data } = await client.post<{ data: Schedule }>('/schedules', schedule);
    return data.data;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
}

// Update an existing schedule by ID
// Accepts partial updates and returns the updated schedule
export async function updateSchedule(id: string, schedule: {
  student_id?: string;
  student_name?: string;
  date?: string;
  time?: string;
  type?: string;
  notes?: string;
}): Promise<Schedule> {
  try {
    const { data } = await client.put<{ data: Schedule }>(`/schedules/${id}`, schedule);
    return data.data;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
}

// Delete a schedule by ID
// Permanently removes the schedule from the database
export async function deleteSchedule(id: string): Promise<void> {
  try {
    await client.delete(`/schedules/${id}`);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

export interface Intervention {
  _id: string;
  student_id: string;
  score_id: string;
  intervention_type: string;
  description: string;
  assigned_to?: string;
  start_date: string;
  end_date?: string;
  status: 'Pending' | 'Active' | 'Completed' | 'Cancelled';
  outcome?: string;
  meeting_details?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch all interventions for a faculty member
// Returns interventions filtered by faculty email if provided
export async function fetchInterventions(facultyEmail?: string): Promise<Intervention[]> {
  try {
    const params = facultyEmail ? { faculty_email: facultyEmail } : {};
    const { data } = await client.get<{ data: Intervention[] }>('/interventions', { params });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching interventions:', error);
    return [];
  }
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  student_id?: string;
  assigned_to?: string;
  intervention_id?: string;
  due_date?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  created_by?: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch all tasks for a faculty member
// Returns tasks filtered by faculty email if provided
export async function fetchTasks(facultyEmail?: string): Promise<Task[]> {
  try {
    const params = facultyEmail ? { faculty_email: facultyEmail } : {};
    const { data } = await client.get<{ data: Task[] }>('/tasks', { params });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// Create a new task
// Accepts task details and returns the created task
export async function createTask(task: {
  title: string;
  description?: string;
  student_id?: string;
  assigned_to?: string;
  intervention_id?: string;
  due_date?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status?: 'Pending' | 'In Progress' | 'Completed';
  created_by?: string;
}): Promise<Task> {
  try {
    const { data } = await client.post<{ data: Task }>('/tasks', task);
    return data.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

// Update an existing task by ID
// Accepts partial updates and returns the updated task
export async function updateTask(id: string, task: {
  title?: string;
  description?: string;
  student_id?: string;
  assigned_to?: string;
  intervention_id?: string;
  due_date?: string;
  priority?: 'Low' | 'Medium' | 'High';
  status?: 'Pending' | 'In Progress' | 'Completed';
}): Promise<Task> {
  try {
    const { data } = await client.patch<{ data: Task }>(`/tasks/${id}`, task);
    return data.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

// Delete a task by ID
// Permanently removes the task from the database
export async function deleteTask(id: string): Promise<void> {
  try {
    await client.delete(`/tasks/${id}`);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// Fetch risk scores with optional filtering
// Returns risk scores filtered by term, year, date range, and risk level
export async function fetchRiskScores(filters?: RiskScoreFilter): Promise<{ data: RiskScoreData[]; total: number; limit: number; filters: RiskScoreFilter }> {
  try {
    const params = {
      ...(filters?.term && { term: filters.term }),
      ...(filters?.year && { year: filters.year }),
      ...(filters?.start_date && { start_date: filters.start_date }),
      ...(filters?.end_date && { end_date: filters.end_date }),
      ...(filters?.risk_level && { risk_level: filters.risk_level }),
      limit: 100,
    };
    const { data } = await client.get<{ data: RiskScoreData[]; total: number; limit: number; filters: RiskScoreFilter }>('/risk-scores', { params });
    return data;
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    return { data: [], total: 0, limit: 100, filters: filters || {} };
  }
}

// Fetch risk score for a specific student with optional term/year filter
export async function fetchStudentRiskScore(studentId: string, term?: string, year?: string): Promise<RiskScoreData | null> {
  try {
    const params = {
      ...(term && { term }),
      ...(year && { year }),
    };
    const { data } = await client.get<RiskScoreData>(`/risk-scores/${studentId}`, { params });
    return data;
  } catch (error) {
    console.error('Error fetching student risk score:', error);
    return null;
  }
}

// Generate/predict risk score for a specific student with optional term/year
export async function generateRiskScore(studentId: string, term?: string, year?: string): Promise<RiskScoreData> {
  try {
    const { data } = await client.post<{ data: RiskScoreData }>(`/risk-scores/predict/${studentId}`, { term, year });
    return data.data;
  } catch (error) {
    console.error('Error generating risk score:', error);
    throw error;
  }
}

// Recalculate risk score for a specific student with optional term/year
export async function recalculateRiskScore(studentId: string, term?: string, year?: string): Promise<void> {
  try {
    await client.post(`/risk-scores/recalculate/${studentId}`, { term, year });
  } catch (error) {
    console.error('Error recalculating risk score:', error);
    throw error;
  }
}

// Recalculate risk scores for all students with optional term/year
export async function recalculateAllRiskScores(term?: string, year?: string): Promise<{ message: string; updated: number; failed: number; term?: string; year?: string }> {
  try {
    const { data } = await client.post<{ message: string; updated: number; failed: number; term?: string; year?: string }>('/risk-scores/recalculate-all', { term, year });
    return data;
  } catch (error) {
    console.error('Error recalculating all risk scores:', error);
    throw error;
  }
}

export interface Report {
  _id: string;
  title: string;
  report_type: 'Attendance' | 'Academic' | 'Behavioral' | 'Risk' | 'Intervention';
  description?: string;
  student_id?: string;
  generated_by?: string;
  data?: any;
  status: 'Draft' | 'Generated' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

// Fetch all reports
// Returns all reports in the system
export async function fetchReports(): Promise<Report[]> {
  try {
    const { data } = await client.get<{ data: Report[] }>('/reports');
    return data.data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

// Generate a new report for a student
// Accepts report type, student ID, and generator info
export async function generateReport(reportType: string, studentId: string, generatedBy: string): Promise<Report> {
  try {
    const { data } = await client.post<{ data: Report }>('/reports/generate', {
      report_type: reportType,
      student_id: studentId,
      generated_by: generatedBy,
    });
    return data.data;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

export async function downloadReport(reportId: string, reportTitle?: string): Promise<void> {
  try {
    const response = await client.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    // Use the report title for the filename, sanitized for filesystem
    const filename = reportTitle 
      ? `${reportTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.csv`
      : `report_${reportId}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
}

export type { RiskLevel };

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'counselor' | 'faculty';
  department?: string;
  section?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUsers(): Promise<User[]> {
  try {
    const { data } = await client.get<{ data: User[] }>('/faculty');
    return data.data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function createUser(user: Omit<User, '_id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User> {
  try {
    const { data } = await client.post<{ data: User }>('/faculty', user);
    return data.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Early Warning System API functions
export async function fetchEarlyWarningPrediction(studentId: string): Promise<EarlyWarningPrediction> {
  try {
    const { data } = await client.get<{ data: EarlyWarningPrediction }>(`/early-warning/student/${studentId}`);
    return data.data;
  } catch (error) {
    console.error('Error fetching early warning prediction:', error);
    throw error;
  }
}

// Fetch early warning predictions for a batch of students
// Efficiently loads risk predictions for multiple students at once
export async function fetchEarlyWarningBatchPredictions(studentIds: string[], term?: string, year?: string): Promise<EarlyWarningPrediction[]> {
  try {
    const body: any = { student_ids: studentIds };
    if (term) body.term = term;
    if (year) body.year = year;
    const { data } = await client.post<{ data: EarlyWarningPrediction[] }>('/early-warning/batch', body);
    return data.data;
  } catch (error) {
    console.error('Error fetching batch predictions:', error);
    throw error;
  }
}

export async function fetchAllEarlyWarningPredictions(facultyEmail?: string, riskLevel?: string): Promise<{ data: EarlyWarningPrediction[]; total: number; summary: any }> {
  try {
    const params: any = {};
    if (facultyEmail) params.faculty_email = facultyEmail;
    if (riskLevel) params.risk_level = riskLevel;
    
    const { data } = await client.get<{ data: EarlyWarningPrediction[]; total: number; summary: any }>('/early-warning/all', { params });
    return { data: data.data, total: data.total, summary: data.summary };
  } catch (error) {
    console.error('Error fetching all predictions:', error);
    throw error;
  }
}

export async function fetchEarlyWarningSummary(facultyEmail?: string): Promise<EarlyWarningSummary> {
  try {
    const params: any = {};
    if (facultyEmail) params.faculty_email = facultyEmail;
    
    const { data } = await client.get<{ data: EarlyWarningSummary }>('/early-warning/summary', { params });
    return data.data;
  } catch (error) {
    console.error('Error fetching early warning summary:', error);
    throw error;
  }
}

export interface AnalyticsInsight {
  type: 'trend' | 'alert' | 'recommendation' | 'success';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
  actionable?: boolean;
}

// Fetch analytics insights for the dashboard
// Returns AI-generated insights including trends, alerts, and recommendations
export async function fetchAnalyticsInsights(): Promise<AnalyticsInsight[]> {
  try {
    const { data } = await client.get<{ data: AnalyticsInsight[] }>('/analytics/insights');
    return data.data;
  } catch (error) {
    console.error('Error fetching analytics insights:', error);
    throw error;
  }
}

// Update a faculty/staff user record by ID
// Accepts partial updates and returns the updated user
export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  try {
    const { data } = await client.put<{ data: User }>(`/faculty/${id}`, updates);
    return data.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export interface StudentAISummary {
  data: {
    data: any;
    aiSummary: string;
  };
}

// Fetch AI-generated summary for a specific student
// Uses a 30-second timeout for AI generation
// Returns the AI analysis of the student's data
export async function fetchStudentAISummary(studentId: string): Promise<{ data: any; aiSummary: string }> {
  try {
    const { data } = await client.get<{ data: { data: any; aiSummary: string } }>(`/students/${studentId}/ai-summary`, {
      timeout: 30000 // 30 seconds timeout for AI generation
    });
    return data.data;
  } catch (error) {
    console.error('Error fetching student AI summary:', error);
    throw error;
  }
}

// Fetch academic records for a specific student
// Returns all academic records sorted by creation date
export async function fetchStudentAcademics(studentId: string): Promise<any[]> {
  try {
    const { data } = await client.get<{ data: any[] }>(`/students/${studentId}/academics`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student academics:', error);
    return [];
  }
}

// Create a new academic record for a student
// Accepts term, year, subject grades (Math, English, Science), GPA, and course information
export async function createAcademicRecord(studentId: string, academicData: any): Promise<any> {
  try {
    const { data } = await client.post<{ data: any }>(`/students/${studentId}/academics`, academicData);
    return data.data;
  } catch (error) {
    console.error('Error creating academic record:', error);
    throw error;
  }
}

// Update an existing academic record by ID
// Accepts partial updates and returns the updated record
export async function updateAcademicRecord(academicId: string, academicData: any): Promise<any> {
  try {
    const { data } = await client.put<{ data: any }>(`/students/academics/${academicId}`, academicData);
    return data.data;
  } catch (error) {
    console.error('Error updating academic record:', error);
    throw error;
  }
}

// Delete an academic record by ID
// Permanently removes the record from the database
export async function deleteAcademicRecord(academicId: string): Promise<void> {
  try {
    await client.delete(`/students/academics/${academicId}`);
  } catch (error) {
    console.error('Error deleting academic record:', error);
    throw error;
  }
}

// Fetch attendance records for a specific student
// Returns up to 50 records sorted by date
export async function fetchStudentAttendance(studentId: string): Promise<any[]> {
  try {
    const { data } = await client.get<{ data: any[] }>(`/students/${studentId}/attendance`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }
}

// Create a new attendance record for a student
// Accepts date, present/absent status, and subject
export async function createAttendanceRecord(studentId: string, attendanceData: any): Promise<any> {
  try {
    const { data } = await client.post<{ data: any }>(`/students/${studentId}/attendance`, attendanceData);
    return data.data;
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
}

// Update an existing attendance record by ID
// Accepts partial updates and returns the updated record
export async function updateAttendanceRecord(attendanceId: string, attendanceData: any): Promise<any> {
  try {
    const { data } = await client.put<{ data: any }>(`/students/attendance/${attendanceId}`, attendanceData);
    return data.data;
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw error;
  }
}

// Delete an attendance record by ID
// Permanently removes the record from the database
export async function deleteAttendanceRecord(attendanceId: string): Promise<void> {
  try {
    await client.delete(`/students/attendance/${attendanceId}`);
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    throw error;
  }
}

// Record attendance for a student
export async function recordAttendance(studentId: string, attendanceDate: string, present: boolean): Promise<any> {
  try {
    const { data } = await client.post<{ data: any }>('/attendance', {
      student_id: studentId,
      attendance_date: attendanceDate,
      present
    });
    return data.data;
  } catch (error) {
    console.error('Error recording attendance:', error);
    throw error;
  }
}

// Get attendance for a student
export async function getStudentAttendance(studentId: string, startDate?: string, endDate?: string, term?: string, year?: string): Promise<any[]> {
  try {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (term) params.term = term;
    if (year) params.year = year;
    const { data } = await client.get<{ data: any[] }>(`/attendance/student/${studentId}`, { params });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }
}

// Get academic records for a student
export async function getStudentAcademicRecords(studentId: string, term?: string, year?: string): Promise<any[]> {
  try {
    const params: any = {};
    if (term) params.term = term;
    if (year) params.year = year;
    const { data } = await client.get<{ data: any[] }>(`/academicrecords/student/${studentId}`, { params });
    return data.data || [];
  } catch (error) {
    console.error('Error fetching student academic records:', error);
    return [];
  }
}

// Delete a faculty/staff user by ID
// Permanently removes the user from the database
export async function deleteUser(id: string): Promise<void> {
  try {
    await client.delete(`/faculty/${id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Get AI-powered insights
export async function fetchInsights(): Promise<any[]> {
  try {
    const { data } = await client.get<{ data: any[] }>('/analytics/insights');
    return data.data || [];
  } catch (error) {
    console.error('Error fetching insights:', error);
    return [];
  }
}
