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
  risk_level: 'Low' | 'Medium' | 'High';
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
