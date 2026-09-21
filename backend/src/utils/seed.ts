import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { AcademicRecord } from '../models/AcademicRecord';
import { Attendance } from '../models/Attendance';
import { BehaviorReport } from '../models/BehaviorReport';
import { RiskScore } from '../models/RiskScore';
import { Intervention } from '../models/Intervention';
import { calculateRiskScoreFromValues } from '../services/riskCalculationService';

dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

type Level = 'Low' | 'Medium' | 'High';

interface SeedStudent {
  first_name: string;
  last_name: string;
  email: string;
  grade_level: string;
  section: string;
  year_level: number;
  program: string;
  phone: string;
  address: string;
  enrollment_date: Date;
  guardian_name: string;
  guardian_relation: string;
  guardian_phone: string;
  riskLevel: Level;
  riskScore: number;
  confidence: number;
  attendancePct: number;
  unexcusedAbsencePct: number;
  generalAverage: number;
  gpa: number;
  majorSubjectsFailed: number;
  subjectGrades: {
    mathematics: number;
    english: number;
    science: number;
  };
  attendanceTrend: number;
  interventions: { type: string; status: 'Pending' | 'Active' | 'Completed'; daysAgo: number }[];
  behavior: { incident_type: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; description: string; daysAgo: number }[];
  assignedFacultyEmail?: string;
}

const SEED_USERS = [
  { name: 'Admin User', email: 'admin@sjc.edu.ph', password: 'admin123', role: 'admin', department: 'Administration' },
  { name: 'Counselor User', email: 'counselor@sjc.edu.ph', password: 'counselor123', role: 'counselor', department: 'Student Affairs' },
  { name: 'Mr. James Villanueva', email: 'faculty@sjc.edu.ph', password: 'faculty123', role: 'faculty', department: 'Junior High School', section: 'Einstein' },
];

const SEED_STUDENTS: SeedStudent[] = [
  {
    first_name: 'Maria',
    last_name: 'Santos',
    email: 'maria.santos@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 345 6789',
    address: '123 Main St, Quezon City',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Rosa Santos',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 123 4567',
    riskLevel: 'High',
    riskScore: 85,
    confidence: 87,
    attendancePct: 65,
    unexcusedAbsencePct: 15,
    generalAverage: 72,
    gpa: 2.88,
    majorSubjectsFailed: 1,
    subjectGrades: { mathematics: 68, english: 74, science: 74 },
    attendanceTrend: -5,
    interventions: [
      { type: 'Counseling', status: 'Completed', daysAgo: 30 },
      { type: 'Tutoring', status: 'Active', daysAgo: 12 },
      { type: 'Family Meeting', status: 'Active', daysAgo: 2 },
    ],
    behavior: [
      { incident_type: 'Late Attendance', severity: 'Medium', description: 'Late to class 5 times this week', daysAgo: 6 },
    ],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'John',
    last_name: 'Dela Cruz',
    email: 'john.delacruz@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 222 1111',
    address: '45 Rizal Ave, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Pedro Dela Cruz',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 555 2222',
    riskLevel: 'Medium',
    riskScore: 68,
    confidence: 84,
    attendancePct: 80,
    unexcusedAbsencePct: 8,
    generalAverage: 83,
    gpa: 3.32,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 82, english: 84, science: 83 },
    attendanceTrend: -2,
    interventions: [{ type: 'Counseling', status: 'Active', daysAgo: 7 }],
    behavior: [
      { incident_type: 'Disruption in Class', severity: 'Medium', description: 'Inconsistent participation in class', daysAgo: 10 },
    ],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Ana',
    last_name: 'Rodriguez',
    email: 'ana.rodriguez@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 888 9999',
    address: '78 Bonifacio St, Makati',
    enrollment_date: new Date('2023-08-10'),
    guardian_name: 'Elena Rodriguez',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 444 3333',
    riskLevel: 'High',
    riskScore: 92,
    confidence: 90,
    attendancePct: 60,
    unexcusedAbsencePct: 25,
    generalAverage: 68,
    gpa: 2.72,
    majorSubjectsFailed: 2,
    subjectGrades: { mathematics: 65, english: 70, science: 69 },
    attendanceTrend: -10,
    interventions: [
      { type: 'Counseling', status: 'Active', daysAgo: 5 },
      { type: 'Mentoring', status: 'Completed', daysAgo: 20 },
    ],
    behavior: [
      { incident_type: 'Unauthorized Absence', severity: 'High', description: 'Missed multiple consecutive classes', daysAgo: 4 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Carlo',
    last_name: 'Reyes',
    email: 'carlo.reyes@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 333 7777',
    address: '12 Mabini St, Pasig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Marco Reyes',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 666 8888',
    riskLevel: 'Low',
    riskScore: 24,
    confidence: 91,
    attendancePct: 95,
    unexcusedAbsencePct: 2,
    generalAverage: 92,
    gpa: 3.68,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 91, english: 93, science: 92 },
    attendanceTrend: 2,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Sofia',
    last_name: 'Garcia',
    email: 'sofia.garcia@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 111 4444',
    address: '90 Luna St, Taguig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Liza Garcia',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 222 5555',
    riskLevel: 'Low',
    riskScore: 19,
    confidence: 92,
    attendancePct: 100,
    unexcusedAbsencePct: 0,
    generalAverage: 95,
    gpa: 3.80,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 94, english: 96, science: 95 },
    attendanceTrend: 0,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Miguel',
    last_name: 'Tan',
    email: 'miguel.tan@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 555 6666',
    address: '23 Rizal St, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Carlos Tan',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 777 8888',
    riskLevel: 'Medium',
    riskScore: 55,
    confidence: 83,
    attendancePct: 85,
    unexcusedAbsencePct: 5,
    generalAverage: 81,
    gpa: 3.24,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 80, english: 82, science: 81 },
    attendanceTrend: -1,
    interventions: [{ type: 'Tutoring', status: 'Completed', daysAgo: 15 }],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Isabella',
    last_name: 'Fernandez',
    email: 'isabella.fernandez@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 999 0000',
    address: '56 Aguinaldo St, Quezon City',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Maria Fernandez',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 111 2222',
    riskLevel: 'High',
    riskScore: 78,
    confidence: 85,
    attendancePct: 70,
    unexcusedAbsencePct: 12,
    generalAverage: 73,
    gpa: 2.92,
    majorSubjectsFailed: 1,
    subjectGrades: { mathematics: 72, english: 74, science: 73 },
    attendanceTrend: -4,
    interventions: [
      { type: 'Counseling', status: 'Active', daysAgo: 3 },
      { type: 'Family Meeting', status: 'Pending', daysAgo: 0 },
    ],
    behavior: [
      { incident_type: 'Late Attendance', severity: 'Low', description: 'Late to class 3 times this month', daysAgo: 8 },
    ],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Gabriel',
    last_name: 'Ramos',
    email: 'gabriel.ramos@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 333 4444',
    address: '89 Mabini St, Pasay',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Jose Ramos',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 555 6666',
    riskLevel: 'Low',
    riskScore: 15,
    confidence: 94,
    attendancePct: 98,
    unexcusedAbsencePct: 1,
    generalAverage: 97,
    gpa: 3.88,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 96, english: 98, science: 97 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Andrea',
    last_name: 'Castillo',
    email: 'andrea.castillo@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 777 8888',
    address: '34 Bonifacio St, Makati',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Roberto Castillo',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 999 0000',
    riskLevel: 'Medium',
    riskScore: 62,
    confidence: 81,
    attendancePct: 82,
    unexcusedAbsencePct: 7,
    generalAverage: 82,
    gpa: 3.28,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 81, english: 83, science: 82 },
    attendanceTrend: -3,
    interventions: [{ type: 'Mentoring', status: 'Active', daysAgo: 10 }],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Luis',
    last_name: 'Santillan',
    email: 'luis.santillan@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 222 3333',
    address: '67 Luna St, Taguig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Elena Santillan',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 444 5555',
    riskLevel: 'High',
    riskScore: 88,
    confidence: 86,
    attendancePct: 58,
    unexcusedAbsencePct: 20,
    generalAverage: 69,
    gpa: 2.76,
    majorSubjectsFailed: 2,
    subjectGrades: { mathematics: 67, english: 70, science: 70 },
    attendanceTrend: -8,
    interventions: [
      { type: 'Counseling', status: 'Completed', daysAgo: 25 },
      { type: 'Tutoring', status: 'Active', daysAgo: 5 },
    ],
    behavior: [
      { incident_type: 'Disruption in Class', severity: 'High', description: 'Multiple behavioral incidents', daysAgo: 7 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Camille',
    last_name: 'Dizon',
    email: 'camille.dizon@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 666 7777',
    address: '12 Rizal Ave, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Antonio Dizon',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 888 9999',
    riskLevel: 'Low',
    riskScore: 28,
    confidence: 90,
    attendancePct: 96,
    unexcusedAbsencePct: 2,
    generalAverage: 93,
    gpa: 3.72,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 92, english: 94, science: 93 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Javier',
    last_name: 'Mendoza',
    email: 'javier.mendoza@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 444 5555',
    address: '45 Aguinaldo St, Quezon City',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Patricia Mendoza',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 333 4444',
    riskLevel: 'Medium',
    riskScore: 48,
    confidence: 82,
    attendancePct: 88,
    unexcusedAbsencePct: 4,
    generalAverage: 85,
    gpa: 3.40,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 84, english: 86, science: 85 },
    attendanceTrend: 0,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Elena',
    last_name: 'Bautista',
    email: 'elena.bautista@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 888 0000',
    address: '78 Mabini St, Pasig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Ricardo Bautista',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 111 3333',
    riskLevel: 'High',
    riskScore: 82,
    confidence: 84,
    attendancePct: 62,
    unexcusedAbsencePct: 18,
    generalAverage: 70,
    gpa: 2.80,
    majorSubjectsFailed: 1,
    subjectGrades: { mathematics: 68, english: 71, science: 71 },
    attendanceTrend: -6,
    interventions: [
      { type: 'Counseling', status: 'Active', daysAgo: 8 },
      { type: 'Family Meeting', status: 'Completed', daysAgo: 18 },
    ],
    behavior: [
      { incident_type: 'Unauthorized Absence', severity: 'Medium', description: 'Missed several classes', daysAgo: 12 },
    ],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Rafael',
    last_name: 'Torres',
    email: 'rafael.torres@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 111 2222',
    address: '23 Bonifacio St, Makati',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Sofia Torres',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 666 7777',
    riskLevel: 'Low',
    riskScore: 22,
    confidence: 93,
    attendancePct: 97,
    unexcusedAbsencePct: 1,
    generalAverage: 94,
    gpa: 3.76,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 93, english: 95, science: 94 },
    attendanceTrend: 2,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Samantha',
    last_name: 'Lopez',
    email: 'samantha.lopez@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 555 8888',
    address: '56 Luna St, Taguig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Miguel Lopez',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 222 4444',
    riskLevel: 'Medium',
    riskScore: 58,
    confidence: 80,
    attendancePct: 84,
    unexcusedAbsencePct: 6,
    generalAverage: 83,
    gpa: 3.32,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 82, english: 84, science: 83 },
    attendanceTrend: -2,
    interventions: [{ type: 'Tutoring', status: 'Active', daysAgo: 14 }],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Diego',
    last_name: 'Rivera',
    email: 'diego.rivera@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 999 2222',
    address: '89 Rizal Ave, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Carmen Rivera',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 555 8888',
    riskLevel: 'High',
    riskScore: 90,
    confidence: 88,
    attendancePct: 55,
    unexcusedAbsencePct: 22,
    generalAverage: 65,
    gpa: 2.60,
    majorSubjectsFailed: 2,
    subjectGrades: { mathematics: 62, english: 67, science: 66 },
    attendanceTrend: -12,
    interventions: [
      { type: 'Counseling', status: 'Active', daysAgo: 2 },
      { type: 'Mentoring', status: 'Pending', daysAgo: 0 },
    ],
    behavior: [
      { incident_type: 'Disruption in Class', severity: 'High', description: 'Repeated classroom disruptions', daysAgo: 5 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Valentina',
    last_name: 'Reyes',
    email: 'valentina.reyes@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 333 5555',
    address: '12 Aguinaldo St, Quezon City',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Fernando Reyes',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 999 1111',
    riskLevel: 'Low',
    riskScore: 17,
    confidence: 95,
    attendancePct: 99,
    unexcusedAbsencePct: 0,
    generalAverage: 96,
    gpa: 3.84,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 95, english: 97, science: 96 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Sebastian',
    last_name: 'Flores',
    email: 'sebastian.flores@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 777 0000',
    address: '34 Mabini St, Pasay',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Lourdes Flores',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 444 6666',
    riskLevel: 'Medium',
    riskScore: 52,
    confidence: 83,
    attendancePct: 86,
    unexcusedAbsencePct: 5,
    generalAverage: 84,
    gpa: 3.36,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 83, english: 85, science: 84 },
    attendanceTrend: -1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Mia',
    last_name: 'Cruz',
    email: 'mia.cruz@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 222 4444',
    address: '67 Bonifacio St, Makati',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Alberto Cruz',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 888 1111',
    riskLevel: 'Low',
    riskScore: 31,
    confidence: 89,
    attendancePct: 94,
    unexcusedAbsencePct: 2,
    generalAverage: 91,
    gpa: 3.64,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 90, english: 92, science: 91 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Antonio',
    last_name: 'Santos',
    email: 'antonio.santos@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 666 9999',
    address: '90 Luna St, Taguig',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Rosa Santos',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 333 5555',
    riskLevel: 'High',
    riskScore: 75,
    confidence: 83,
    attendancePct: 68,
    unexcusedAbsencePct: 14,
    generalAverage: 73,
    gpa: 2.92,
    majorSubjectsFailed: 1,
    subjectGrades: { mathematics: 72, english: 74, science: 73 },
    attendanceTrend: -5,
    interventions: [
      { type: 'Counseling', status: 'Completed', daysAgo: 20 },
      { type: 'Tutoring', status: 'Active', daysAgo: 6 },
    ],
    behavior: [
      { incident_type: 'Late Attendance', severity: 'Medium', description: 'Frequent tardiness', daysAgo: 9 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Lucia',
    last_name: 'Gomez',
    email: 'lucia.gomez@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 111 6666',
    address: '23 Rizal Ave, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Pedro Gomez',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 777 2222',
    riskLevel: 'Medium',
    riskScore: 45,
    confidence: 84,
    attendancePct: 90,
    unexcusedAbsencePct: 3,
    generalAverage: 85,
    gpa: 3.40,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 84, english: 86, science: 85 },
    attendanceTrend: 0,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Mateo',
    last_name: 'Aquino',
    email: 'mateo.aquino@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 555 1111',
    address: '56 Aguinaldo St, Quezon City',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Teresa Aquino',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 222 6666',
    riskLevel: 'Low',
    riskScore: 12,
    confidence: 96,
    attendancePct: 100,
    unexcusedAbsencePct: 0,
    generalAverage: 97,
    gpa: 3.88,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 96, english: 98, science: 97 },
    attendanceTrend: 0,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Daniela',
    last_name: 'Pascual',
    email: 'daniela.pascual@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 888 3333',
    address: '89 Mabini St, Pasig',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Roberto Pascual',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 555 9999',
    riskLevel: 'Medium',
    riskScore: 50,
    confidence: 82,
    attendancePct: 87,
    unexcusedAbsencePct: 4,
    generalAverage: 84,
    gpa: 3.36,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 83, english: 85, science: 84 },
    attendanceTrend: -1,
    interventions: [{ type: 'Mentoring', status: 'Completed', daysAgo: 12 }],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Nicolas',
    last_name: 'Del Rosario',
    email: 'nicolas.delrosario@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 444 7777',
    address: '12 Bonifacio St, Makati',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Elena Del Rosario',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 111 8888',
    riskLevel: 'High',
    riskScore: 86,
    confidence: 85,
    attendancePct: 60,
    unexcusedAbsencePct: 18,
    generalAverage: 73,
    gpa: 2.92,
    majorSubjectsFailed: 2,
    subjectGrades: { mathematics: 71, english: 74, science: 74 },
    attendanceTrend: -7,
    interventions: [
      { type: 'Counseling', status: 'Active', daysAgo: 4 },
      { type: 'Family Meeting', status: 'Pending', daysAgo: 0 },
    ],
    behavior: [
      { incident_type: 'Unauthorized Absence', severity: 'High', description: 'Extended absence without notice', daysAgo: 6 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Victoria',
    last_name: 'Villanueva',
    email: 'victoria.villanueva@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 777 2222',
    address: '34 Luna St, Taguig',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Carlos Villanueva',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 444 8888',
    riskLevel: 'Low',
    riskScore: 26,
    confidence: 91,
    attendancePct: 95,
    unexcusedAbsencePct: 2,
    generalAverage: 91,
    gpa: 3.64,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 90, english: 92, science: 91 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Alejandro',
    last_name: 'Castro',
    email: 'alejandro.castro@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 222 5555',
    address: '67 Rizal Ave, Manila',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Maria Castro',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 888 2222',
    riskLevel: 'Medium',
    riskScore: 54,
    confidence: 81,
    attendancePct: 83,
    unexcusedAbsencePct: 6,
    generalAverage: 80,
    gpa: 3.20,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 79, english: 81, science: 80 },
    attendanceTrend: -2,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Isabella',
    last_name: 'Romero',
    email: 'isabella.romero@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 555 3333',
    address: '90 Aguinaldo St, Quezon City',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Jose Romero',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 222 7777',
    riskLevel: 'Low',
    riskScore: 14,
    confidence: 94,
    attendancePct: 98,
    unexcusedAbsencePct: 1,
    generalAverage: 96,
    gpa: 3.84,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 95, english: 97, science: 96 },
    attendanceTrend: 2,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Emilio',
    last_name: 'Salazar',
    email: 'emilio.salazar@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 888 5555',
    address: '23 Mabini St, Pasay',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Carmen Salazar',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 555 1111',
    riskLevel: 'High',
    riskScore: 80,
    confidence: 84,
    attendancePct: 65,
    unexcusedAbsencePct: 16,
    generalAverage: 77,
    gpa: 3.08,
    majorSubjectsFailed: 1,
    subjectGrades: { mathematics: 76, english: 78, science: 77 },
    attendanceTrend: -5,
    interventions: [
      { type: 'Counseling', status: 'Completed', daysAgo: 22 },
      { type: 'Tutoring', status: 'Active', daysAgo: 8 },
    ],
    behavior: [
      { incident_type: 'Late Attendance', severity: 'Medium', description: 'Consistent tardiness issues', daysAgo: 11 },
    ],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Sofia',
    last_name: 'Navarro',
    email: 'sofia.navarro@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 333 8888',
    address: '56 Bonifacio St, Makati',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Fernando Navarro',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 777 4444',
    riskLevel: 'Medium',
    riskScore: 47,
    confidence: 83,
    attendancePct: 89,
    unexcusedAbsencePct: 3,
    generalAverage: 86,
    gpa: 3.44,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 85, english: 87, science: 86 },
    attendanceTrend: 0,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
  {
    first_name: 'Leonardo',
    last_name: 'Peralta',
    email: 'leonardo.peralta@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 666 2222',
    address: '89 Luna St, Taguig',
    enrollment_date: new Date('2023-08-15'),
    guardian_name: 'Ana Peralta',
    guardian_relation: 'Mother',
    guardian_phone: '+63 917 333 7777',
    riskLevel: 'Low',
    riskScore: 33,
    confidence: 88,
    attendancePct: 93,
    unexcusedAbsencePct: 2,
    generalAverage: 89,
    gpa: 3.56,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 88, english: 90, science: 89 },
    attendanceTrend: 1,
    interventions: [],
    behavior: [],
    assignedFacultyEmail: 'carla.mendoza@sjc.edu.ph',
  },
  {
    first_name: 'Valeria',
    last_name: 'Santos',
    email: 'valeria.santos@sjc.edu.ph',
    grade_level: 'Grade 10',
    section: 'Einstein',
    year_level: 4,
    program: 'Junior High School',
    phone: '+63 912 111 9999',
    address: '12 Rizal Ave, Manila',
    enrollment_date: new Date('2022-08-12'),
    guardian_name: 'Miguel Santos',
    guardian_relation: 'Father',
    guardian_phone: '+63 917 666 3333',
    riskLevel: 'Medium',
    riskScore: 56,
    confidence: 80,
    attendancePct: 81,
    unexcusedAbsencePct: 7,
    generalAverage: 79,
    gpa: 3.16,
    majorSubjectsFailed: 0,
    subjectGrades: { mathematics: 78, english: 80, science: 79 },
    attendanceTrend: -3,
    interventions: [{ type: 'Mentoring', status: 'Active', daysAgo: 16 }],
    behavior: [],
    assignedFacultyEmail: 'faculty@sjc.edu.ph',
  },
];

const ATTENDANCE_DAYS = 45;

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function seedDatabase() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([
      Student.deleteMany({}),
      User.deleteMany({}),
      AcademicRecord.deleteMany({}),
      Attendance.deleteMany({}),
      BehaviorReport.deleteMany({}),
      RiskScore.deleteMany({}),
      Intervention.deleteMany({}),
    ]);
    console.log('🧹 Cleared existing collections');

    // Seed users
    for (const u of SEED_USERS) {
      await User.create(u);
      console.log(`✅ Seeded user: ${u.name} (${u.role})`);
    }

    // Track intervention ID counters by type
    const interventionIdCounters: Record<string, number> = {
      'Mentoring': 0,
      'Tutoring': 0,
      'Counseling': 0,
      'Family Meeting': 0,
    };

    const typePrefixMap: Record<string, string> = {
      'Mentoring': 'M',
      'Tutoring': 'T',
      'Counseling': 'C',
      'Family Meeting': 'F',
    };

    const currentYear = new Date().getFullYear();

    function generateInterventionId(type: string): string {
      const prefix = typePrefixMap[type] || 'X';
      interventionIdCounters[type] = (interventionIdCounters[type] || 0) + 1;
      const number = String(interventionIdCounters[type]).padStart(5, '0');
      return `${prefix}${currentYear}${number}`;
    }

    function generateMeetingDetails(type: string, daysAgo: number): string {
      const notes = {
        'Mentoring': [
          'Student showed great engagement in today\'s session. Discussed academic goals and created a study plan.',
          'Progress report: Student has improved time management skills. Completed all assigned tasks this week.',
          'Session focused on building confidence. Student participated actively in group activities.',
        ],
        'Tutoring': [
          'Math tutoring session: Covered algebraic equations. Student demonstrated good understanding.',
          'Science review: Helped student with physics concepts. Homework completed successfully.',
          'English literature: Discussed novel themes. Student showed analytical thinking.',
        ],
        'Counseling': [
          'Initial counseling session: Student opened up about personal challenges. Established trust.',
          'Follow-up session: Discussed coping strategies for stress. Student reported improvement.',
          'Family dynamics discussion: Explored communication patterns within family.',
        ],
        'Family Meeting': [
          'Family conference: Discussed student\'s academic progress. Parents engaged constructively.',
          'Mediation session: Addressed conflicts between student and family members.',
          'Behavioral plan review: Family agreed on consistent discipline approach.',
        ],
      };

      const typeNotes = notes[type as keyof typeof notes] || notes['Counseling'];
      const note = typeNotes[Math.floor(Math.random() * typeNotes.length)];
      
      const date = daysAgoDate(daysAgo);
      const dateStr = date.toISOString().split('T')[0];
      
      return `- ${dateStr} -\n${note}`;
    }

    let studentCounter = 20240001;

    for (const s of SEED_STUDENTS) {
      const student_id = String(studentCounter);
      studentCounter++;

      const student = await Student.create({
        student_id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        enrollment_date: s.enrollment_date,
        status: 'Active',
        program: s.program,
        year_level: s.year_level,
        grade_level: s.grade_level,
        section: s.section,
        phone: s.phone,
        address: s.address,
        guardian_name: s.guardian_name,
        guardian_relation: s.guardian_relation,
        guardian_phone: s.guardian_phone,
      });

      // Academic records for 3 years x 3 terms per student
      // Terms: 1st (September), 2nd (January), 3rd (May)
      const academicYear = new Date().getFullYear();
      const terms = [
        { name: '1st Term', month: 8 }, // September (month 8)
        { name: '2nd Term', month: 0 }, // January (month 0)
        { name: '3rd Term', month: 4 }, // May (month 4)
      ];

      for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
        const year = academicYear - yearOffset;
        for (const term of terms) {
          // Use the seed student's subject grades with some variation for historical terms
          const variation = yearOffset === 0 && term.name === '1st Term' ? 0 : (Math.random() * 10 - 5);
          const mathGrade = Math.min(100, Math.max(50, s.subjectGrades.mathematics + variation));
          const englishGrade = Math.min(100, Math.max(50, s.subjectGrades.english + variation));
          const scienceGrade = Math.min(100, Math.max(50, s.subjectGrades.science + variation));
          const overallAverage = Math.round((mathGrade + englishGrade + scienceGrade) / 3);
          
          // Use the seed GPA for current term, calculate for historical terms
          const termGpa = yearOffset === 0 && term.name === '1st Term' 
            ? s.gpa 
            : Number(((overallAverage / 100) * 4).toFixed(2));

          const termDate = new Date(year, term.month, 1);
          
          await AcademicRecord.create({
            student_id: student._id,
            term: term.name,
            year: String(year),
            mathematics_grade: Math.round(mathGrade),
            english_grade: Math.round(englishGrade),
            science_grade: Math.round(scienceGrade),
            overall_average: overallAverage,
            gpa: termGpa,
            major_subjects_enrolled: 3,
            major_subjects_passed: 3 - (yearOffset === 0 && term.name === '1st Term' ? s.majorSubjectsFailed : 0),
            major_subjects_failed: yearOffset === 0 && term.name === '1st Term' ? s.majorSubjectsFailed : 0,
            total_units: 9,
          });
        }
      }

      // Attendance records spread across weekdays with unexcused absences
      const presentCount = Math.round((s.attendancePct / 100) * ATTENDANCE_DAYS);
      const unexcusedAbsentCount = Math.round((s.unexcusedAbsencePct / 100) * ATTENDANCE_DAYS);
      const excusedAbsentCount = ATTENDANCE_DAYS - presentCount - unexcusedAbsentCount;
      
      const attendanceDocs = [];
      for (let i = 0; i < ATTENDANCE_DAYS; i++) {
        let present = false;
        let excusedAbsent = false;
        
        if (i < presentCount) {
          present = true;
        } else if (i < presentCount + unexcusedAbsentCount) {
          present = false;
          excusedAbsent = false;
        } else {
          present = false;
          excusedAbsent = true;
        }
        
        attendanceDocs.push({
          student_id: student._id,
          attendance_date: daysAgoDate((ATTENDANCE_DAYS - i) * 1),
          present: present,
          excused_absent: excusedAbsent,
          course_code: 'GEN101',
          course_name: 'General Studies',
        });
      }
      await Attendance.insertMany(attendanceDocs);

      // Behavior reports
      for (const b of s.behavior) {
        await BehaviorReport.create({
          student_id: student._id,
          report_date: daysAgoDate(b.daysAgo),
          incident_type: b.incident_type,
          severity: b.severity,
          description: b.description,
          action_taken: 'Logged for counselor review',
        });
      }

      // Calculate risk score using enhanced formula
      const courseCompletionRate = s.majorSubjectsFailed === 0 ? 100 : Math.round(((3 - s.majorSubjectsFailed) / 3) * 100);
      const calculatedRisk = calculateRiskScoreFromValues(
        s.attendancePct,
        s.unexcusedAbsencePct,
        s.generalAverage,
        s.gpa,
        s.majorSubjectsFailed,
        courseCompletionRate,
        s.subjectGrades,
        s.attendanceTrend
      );

      // Get current term/year for risk score
      const riskYear = new Date().getFullYear().toString();
      const currentMonth = new Date().getMonth();
      let currentTerm = '1st Term';
      if (currentMonth >= 11 || currentMonth <= 3) {
        currentTerm = '2nd Term';
      } else if (currentMonth >= 4 && currentMonth <= 8) {
        currentTerm = '3rd Term';
      }

      // Risk scores across recent months for trend, latest carries the calculated value
      const factors = {
        attendance_factor: calculatedRisk.attendanceFactor,
        academic_factor: calculatedRisk.academicFactor,
        behavior_factor: 0, // Will be calculated separately
      };
      const historyScores = [];
      for (let m = 5; m >= 1; m--) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);

        // Calculate term/year for historical records
        const historyYear = d.getFullYear().toString();
        const historyMonth = d.getMonth();
        let historyTerm = '1st Term';
        if (historyMonth >= 11 || historyMonth <= 3) {
          historyTerm = '2nd Term';
        } else if (historyMonth >= 4 && historyMonth <= 8) {
          historyTerm = '3rd Term';
        }

        historyScores.push({
          student_id: student._id,
          risk_level: calculatedRisk.riskLevel,
          risk_score: Math.max(0, Math.min(100, calculatedRisk.riskScore + (m % 2 === 0 ? -4 : 3))),
          confidence: s.confidence,
          prediction_date: d,
          term: historyTerm,
          year: historyYear,
          ...factors,
          model_version: '2.0.0',
        });
      }
      await RiskScore.insertMany(historyScores);

      const latestScore = await RiskScore.create({
        student_id: student._id,
        risk_level: calculatedRisk.riskLevel,
        risk_score: calculatedRisk.riskScore,
        confidence: s.confidence,
        prediction_date: new Date(),
        term: currentTerm,
        year: riskYear,
        ...factors,
        model_version: '2.0.0',
      });

      // Interventions
      for (const iv of s.interventions) {
        const intervention_id = generateInterventionId(iv.type);
        const meeting_details = generateMeetingDetails(iv.type, iv.daysAgo);
        
        await Intervention.create({
          intervention_id,
          student_id: student._id,
          score_id: latestScore._id,
          intervention_type: iv.type,
          description: `${iv.type} session for ${s.first_name} ${s.last_name}`,
          start_date: daysAgoDate(iv.daysAgo),
          end_date: iv.status === 'Completed' ? daysAgoDate(Math.max(0, iv.daysAgo - 7)) : undefined,
          status: iv.status,
          meeting_details,
        });
      }

      console.log(`✅ Seeded ${s.first_name} ${s.last_name} (${s.riskLevel} risk)`);
    }

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
