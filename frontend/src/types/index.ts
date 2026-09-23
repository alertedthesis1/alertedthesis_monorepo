export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_date: string;
  status: string;
  program: string;
  year_level: number;
}

export interface RiskScore {
  score_id: number;
  student_id: number;
  risk_level: RiskLevel;
  risk_score: number;
  confidence: number;
  prediction_date: string;
  attendance_factor: number;
  academic_factor: number;
  behavior_factor: number;
}

export interface Intervention {
  intervention_id: number;
  student_id: number;
  score_id: number;
  intervention_type: string;
  description: string;
  status: 'Pending' | 'Active' | 'Completed';
  start_date: string;
  end_date: string;
}

export interface StudentRecord {
  id: string;
  student_id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  email: string;
  phone?: string;
  address?: string;
  enrolledDate?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  attendance: number;
  generalAverage: number;
  mathematicsGrade?: number;
  englishGrade?: number;
  scienceGrade?: number;
  gpa?: number;
  lastActive: string;
  interventions: number;
  keyConcerns: string[];
  lastSession?: string;
  nextAppointment?: string;
  appointmentScheduled?: boolean;
}

export interface CaseloadStudent extends StudentRecord {
  lastSession: string;
  nextAppointment: string;
  appointmentScheduled: boolean;
  enrolledDate?: string; // Change from string to string | undefined
}

export interface AlertItem {
  id: string;
  category: 'Attendance' | 'Academic' | 'Behavioral';
  date: string;
  message: string;
}
