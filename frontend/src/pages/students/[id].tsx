import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  AlertTriangle,
  Users,
  Mail,
  Phone,
  Home,
  CalendarCheck,
  Calendar,
  FileText,
  X,
  Lightbulb,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import RiskBadge from '@/components/ui/RiskBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import { fetchStudentDetail, StudentDetail, fetchStudentInterventions, fetchStudentSchedules, fetchStudentReports, fetchStudentAISummary, fetchStudentAcademics, fetchStudentAttendance, createAcademicRecord, updateAcademicRecord, deleteAcademicRecord, createAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord, Intervention, Schedule, Report, getStudentAttendance, getStudentAcademicRecords } from '@/lib/api';

const TABS = ['Overview', 'Academic', 'Attendance', 'Interventions', 'Summary'];

// Mapping between display labels and database values for schedule/intervention types
const SCHEDULE_TYPE_MAPPING = {
  'Mentoring': 'Mentoring',
  'Peer Tutoring': 'Tutoring',
  'Counseling / Coaching': 'Counseling',
  'Parent Conference': 'Family Meeting',
  'Family': 'Family Meeting', // Legacy support
};

const REVERSE_SCHEDULE_TYPE_MAPPING = {
  'Mentoring': 'Mentoring',
  'Tutoring': 'Peer Tutoring',
  'Counseling': 'Counseling / Coaching',
  'Family Meeting': 'Parent Conference',
};

// Function to convert database value to display label
const toDisplayType = (databaseValue: string): string => {
  return REVERSE_SCHEDULE_TYPE_MAPPING[databaseValue as keyof typeof REVERSE_SCHEDULE_TYPE_MAPPING] || databaseValue;
};

const ALERT_STYLES: Record<string, string> = {
  Attendance: 'border-red-500 bg-red-50',
  Academic: 'border-red-500 bg-red-50',
  Behavioral: 'border-amber-400 bg-amber-50',
};

export default function StudentProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [tab, setTab] = useState('Overview');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [academics, setAcademics] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [studentAcademicRecords, setStudentAcademicRecords] = useState<any[]>([]);
  const [showAcademicModal, setShowAcademicModal] = useState(false);
  const [editingAcademic, setEditingAcademic] = useState<any>(null);
  const [academicForm, setAcademicForm] = useState({
    term: '',
    year: '',
    mathematics_grade: '',
    english_grade: '',
    science_grade: '',
    overall_average: '',
    gpa: '',
    major_subjects_enrolled: '',
    major_subjects_passed: '',
    major_subjects_failed: '',
    total_units: '',
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    attendance_date: '',
    present: true,
    subject: '',
  });
  // Function to determine current term based on today's date
  const getCurrentTerm = (): { term: string; year: string } => {
    const today = new Date();
    const month = today.getMonth(); // 0-11
    const year = today.getFullYear();

    // Term logic based on Philippine school calendar
    // 1st Term: June (5) - August (7)
    // 2nd Term: September (8) - November (10)
    // 3rd Term: December (11) - May (4) of next year
    if (month >= 5 && month <= 7) {
      return { term: '1st Term', year: year.toString() };
    } else if (month >= 8 && month <= 10) {
      return { term: '2nd Term', year: year.toString() };
    } else {
      // December to May is 3rd Term (uses previous year for school year)
      return { term: '3rd Term', year: (month >= 11 ? year : year - 1).toString() };
    }
  };

  const [selectedTerm, setSelectedTerm] = useState(() => getCurrentTerm().term);
  const [selectedYear, setSelectedYear] = useState(() => getCurrentTerm().year);
  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Function to generate all dates for a given term
  const generateTermDates = (term: string, year: string): Date[] => {
    const yearNum = parseInt(year);
    let startDate: Date;
    let endDate: Date;

    switch (term) {
      case '1st Term':
        startDate = new Date(yearNum, 5, 1); // June 1st
        endDate = new Date(yearNum, 7, 31); // August 31st
        break;
      case '2nd Term':
        startDate = new Date(yearNum, 8, 1); // September 1st
        endDate = new Date(yearNum, 10, 30); // November 30th
        break;
      case '3rd Term':
        startDate = new Date(yearNum + 1, 0, 1); // January 1st of next year
        endDate = new Date(yearNum + 1, 2, 31); // March 31st of next year
        break;
      default:
        return [];
    }

    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  useEffect(() => {
    if (typeof id !== 'string') return;
    let active = true;
    setLoading(true);
    Promise.all([
      fetchStudentDetail(id),
      fetchStudentInterventions(id),
      fetchStudentSchedules(id),
      fetchStudentReports(id),
      fetchStudentAcademics(id),
      fetchStudentAttendance(id),
    ]).then(([s, ints, scheds, rpts, acads, att]) => {
      if (!active) return;
      setStudent(s);
      setInterventions(ints);
      setSchedules(scheds);
      setReports(rpts);
      setAcademics(acads);
      setAttendance(att);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching student data:', err);
      if (active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  // Fetch filtered attendance when term/year changes or on initial load
  useEffect(() => {
    if (typeof id !== 'string') return;
    if (selectedTerm && selectedYear) {
      getStudentAttendance(id, undefined, undefined, selectedTerm, selectedYear)
        .then(filteredAttendance => {
          setAttendance(filteredAttendance);
        })
        .catch(err => {
          console.error('Error fetching filtered attendance:', err);
        });
    }
  }, [id, selectedTerm, selectedYear]);

  // Handle AI summary generation when user clicks the generate button
  // Fetches the AI summary from the backend and updates the state
  const handleGenerateSummary = async () => {
    if (typeof id !== 'string') return;
    setLoadingSummary(true);
    try {
      const summary = await fetchStudentAISummary(id);
      setAiSummary(summary.aiSummary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('Failed to generate AI summary. Please try again.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle submission of academic record form (create or update)
  // Validates form data, calls appropriate API, and refreshes the academic list
  const handleAcademicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof id !== 'string') return;
    try {
      if (editingAcademic) {
        await updateAcademicRecord(editingAcademic._id, academicForm);
      } else {
        await createAcademicRecord(id, academicForm);
      }
      const updatedAcademics = await fetchStudentAcademics(id);
      setAcademics(updatedAcademics);
      setShowAcademicModal(false);
      setEditingAcademic(null);
      setAcademicForm({
        term: '',
        year: '',
        mathematics_grade: '',
        english_grade: '',
        science_grade: '',
        overall_average: '',
        gpa: '',
        major_subjects_enrolled: '',
        major_subjects_passed: '',
        major_subjects_failed: '',
        total_units: '',
      });
    } catch (error) {
      console.error('Error saving academic record:', error);
      alert('Failed to save academic record');
    }
  };

  // Handle deletion of an academic record
  // Shows confirmation dialog, deletes record, and refreshes the list
  const handleDeleteAcademic = async (academicId: string) => {
    if (!confirm('Are you sure you want to delete this academic record?')) return;
    try {
      await deleteAcademicRecord(academicId);
      if (typeof id === 'string') {
        const updatedAcademics = await fetchStudentAcademics(id);
        setAcademics(updatedAcademics);
      }
    } catch (error) {
      console.error('Error deleting academic record:', error);
      alert('Failed to delete academic record');
    }
  };

  // Open the academic modal for creating or editing
  // Pre-fills form data if editing, clears form if creating new record
  const openAcademicModal = (academic?: any) => {
    if (academic) {
      setEditingAcademic(academic);
      setAcademicForm({
        term: academic.term,
        year: academic.year,
        mathematics_grade: academic.mathematics_grade?.toString() || '',
        english_grade: academic.english_grade?.toString() || '',
        science_grade: academic.science_grade?.toString() || '',
        overall_average: academic.overall_average?.toString() || '',
        gpa: academic.gpa.toString(),
        major_subjects_enrolled: academic.major_subjects_enrolled?.toString() || academic.courses_enrolled?.toString() || '',
        major_subjects_passed: academic.major_subjects_passed?.toString() || academic.courses_passed?.toString() || '',
        major_subjects_failed: academic.major_subjects_failed?.toString() || academic.courses_failed?.toString() || '',
        total_units: academic.total_units?.toString() || '',
      });
    } else {
      setEditingAcademic(null);
      setAcademicForm({
        term: '',
        year: '',
        mathematics_grade: '',
        english_grade: '',
        science_grade: '',
        overall_average: '',
        gpa: '',
        major_subjects_enrolled: '',
        major_subjects_passed: '',
        major_subjects_failed: '',
        total_units: '',
      });
    }
    setShowAcademicModal(true);
  };

  // Handle submission of attendance record form (create or update)
  // Validates form data, calls appropriate API, and refreshes the attendance list
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof id !== 'string') return;
    try {
      if (editingAttendance) {
        await updateAttendanceRecord(editingAttendance._id, attendanceForm);
      } else {
        await createAttendanceRecord(id, attendanceForm);
      }
      // Refresh attendance based on current filter state
      if (selectedTerm && selectedYear) {
        const updatedAttendance = await getStudentAttendance(id, undefined, undefined, selectedTerm, selectedYear);
        setAttendance(updatedAttendance);
      } else {
        const updatedAttendance = await fetchStudentAttendance(id);
        setAttendance(updatedAttendance);
      }
      setShowAttendanceModal(false);
      setEditingAttendance(null);
      setAttendanceForm({
        attendance_date: '',
        present: true,
        subject: '',
      });
    } catch (error) {
      console.error('Error saving attendance record:', error);
      alert('Failed to save attendance record');
    }
  };

  // Handle deletion of an attendance record
  // Shows confirmation dialog, deletes record, and refreshes the list
  const handleDeleteAttendance = async (attendanceId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await deleteAttendanceRecord(attendanceId);
      if (typeof id === 'string') {
        // Refresh attendance based on current filter state
        if (selectedTerm && selectedYear) {
          const updatedAttendance = await getStudentAttendance(id, undefined, undefined, selectedTerm, selectedYear);
          setAttendance(updatedAttendance);
        } else {
          const updatedAttendance = await fetchStudentAttendance(id);
          setAttendance(updatedAttendance);
        }
      }
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      alert('Failed to delete attendance record');
    }
  };

  // Open the attendance modal for creating or editing
  // Pre-fills form data if editing, clears form if creating new record
  const openAttendanceModal = (attendance?: any, date?: Date) => {
    if (attendance) {
      setEditingAttendance(attendance);
      setAttendanceForm({
        attendance_date: attendance.attendance_date.split('T')[0],
        present: attendance.present,
        subject: attendance.subject || '',
      });
    } else {
      setEditingAttendance(null);
      setAttendanceForm({
        attendance_date: date ? date.toISOString().split('T')[0] : '',
        present: true,
        subject: '',
      });
    }
    setShowAttendanceModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-gray-500">Student not found.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm font-medium text-green-700">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const alerts = student.alerts ?? [];

  return (
    <>
      <Head>
        <title>
          {student.firstName} {student.lastName} - AlertED
        </title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-xs text-gray-500">
                {student.studentNo} • {student.grade} - {student.section}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <RiskBadge level={student.riskLevel} label={`${student.riskLevel} Risk (${student.riskScore}%)`} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="General Average" value={student.generalAverage} icon={BookOpen} valueColor="text-red-600">
            <div className="mt-3 h-0.5 bg-red-400" />
          </StatCard>
          <StatCard label="Attendance" value={`${student.attendance}%`} icon={CalendarDays} valueColor="text-red-600">
            <div className="mt-3 h-2 rounded-full bg-red-200" />
          </StatCard>
          <StatCard label="Risk Score" value={`${student.riskScore}%`} icon={AlertTriangle} iconColor="text-red-500" valueColor="text-red-600">
            <ProgressBar value={student.riskScore} className="mt-3" />
          </StatCard>
          <StatCard label="Interventions" value={student.interventions} caption="Total sessions" icon={Users} iconColor="text-green-600" valueColor="text-green-600" />
        </div>

        <div className="mt-6 flex overflow-hidden rounded-lg bg-gray-600 text-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2.5 font-medium transition ${
                tab === t ? 'bg-white text-gray-900' : 'text-gray-100 hover:bg-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' ? (
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Personal info */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                <h3 className="font-bold text-gray-900">Personal Information</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {student.email}</p>
                <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {student.phone}</p>
                <p className="flex items-center gap-2"><Home size={14} className="text-gray-400" /> {student.address}</p>
                <p className="flex items-center gap-2"><CalendarCheck size={14} className="text-gray-400" /> Enrolled: {student.enrolledDate}</p>
              </div>
              <hr className="my-4 border-gray-200" />
              <h4 className="mb-2 font-semibold text-gray-900">Guardian Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium text-gray-700">Name:</span> {student.guardianName}</p>
                <p><span className="font-medium text-gray-700">Relation:</span> {student.guardianRelation}</p>
                <p><span className="font-medium text-gray-700">Phone:</span> {student.guardianPhone}</p>
              </div>
            </div>

            {/* Recent alerts */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="font-bold text-gray-900">Recent Alerts</h3>
              </div>
              <div className="space-y-3">
                {alerts.length === 0 && <p className="text-sm text-gray-400">No recent alerts.</p>}
                {alerts.map((a) => (
                  <div key={a.id} className={`rounded-lg border-l-4 p-3 ${ALERT_STYLES[a.category]}`}>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-gray-700">{a.category}</span>
                      <span className="text-xs text-gray-500">{a.date}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-4 font-bold text-gray-900">Quick Actions</h3>
              <div className="space-y-2">
                <button className="flex w-full items-center gap-3 rounded-lg bg-green-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-800">
                  <Calendar size={16} /> Schedule Meeting
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <Phone size={16} className="text-gray-500" /> Contact Guardian
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <FileText size={16} className="text-gray-500" /> Generate Report
                </button>
              </div>
            </div>
            </div>
          </div>
        ) : tab === 'Academic' ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Academic Performance</h3>
              <button
                onClick={() => openAcademicModal()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Record
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">General Average</span>
                  <span className="text-lg font-bold text-gray-900">{student.generalAverage}%</span>
                </div>
                <ProgressBar value={student.generalAverage} className="mt-2" />
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Grade Level</span>
                  <span className="text-lg font-bold text-gray-900">{student.grade}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-3 font-semibold text-gray-900">Academic Records</h4>
              {academics.length === 0 ? (
                <p className="text-sm text-gray-500">No academic records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term/Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mathematics</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">English</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Science</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Avg</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPA</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major Subjects Enrolled</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major Subjects Passed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major Subjects Failed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Units</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {[...academics].sort((a, b) => {
                        // Sort by year descending (2026 → 2025 → 2024)
                        const yearDiff = parseInt(b.year) - parseInt(a.year);
                        if (yearDiff !== 0) return yearDiff;
                        
                        // Sort by term descending (3rd Term → 2nd Term → 1st Term)
                        const termOrder = { '3rd Term': 3, '2nd Term': 2, '1st Term': 1 };
                        const termDiff = termOrder[b.term as keyof typeof termOrder] - termOrder[a.term as keyof typeof termOrder];
                        return termDiff;
                      }).map((academic) => (
                        <tr key={academic._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.term} {academic.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.mathematics_grade || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.english_grade || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.science_grade || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.overall_average || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.gpa}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.major_subjects_enrolled || academic.courses_enrolled}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.major_subjects_passed || academic.courses_passed}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.major_subjects_failed || academic.courses_failed}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{academic.total_units}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openAcademicModal(academic)}
                                className="rounded-lg p-1 text-gray-600 hover:bg-gray-200"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAcademic(academic._id)}
                                className="rounded-lg p-1 text-red-600 hover:bg-red-100"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'Attendance' ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
            {/* Term and Year Filters */}
            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <Filter size={18} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Select Term and Year</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Term:</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {terms.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Attendance Records</h3>
              <button
                onClick={() => openAttendanceModal(undefined, new Date())}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Record
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedTerm && selectedYear ? `${selectedTerm} Attendance Rate` : 'Overall Attendance Rate'}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedTerm && selectedYear && attendance.length > 0
                      ? `${Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)}%`
                      : `${student.attendance}%`
                    }
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${selectedTerm && selectedYear && attendance.length > 0
                        ? Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)
                        : student.attendance}%`
                    }}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedTerm && selectedYear ? `${selectedTerm} Records` : 'Total Records'}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{attendance.length}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <h4 className="font-semibold text-gray-900">
                {selectedTerm && selectedYear ? `${selectedTerm} ${selectedYear} - All School Days` : 'Recent Attendance'}
              </h4>
              {selectedTerm && selectedYear ? (
                // Show all dates for the selected term
                (() => {
                  const termDates = generateTermDates(selectedTerm, selectedYear);
                  if (termDates.length === 0) {
                    return <p className="text-sm text-gray-500">Invalid term or year selection.</p>;
                  }

                  // Create a map of existing attendance records by date string
                  const attendanceMap = new Map(
                    attendance.map(record => {
                      const attendanceDate = new Date(record.attendance_date);
                      // Normalize to local date to avoid timezone issues
                      const normalizedDate = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate());
                      return [normalizedDate.toDateString(), record];
                    })
                  );

                  return (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {termDates.map((date) => {
                        const dateStr = date.toDateString();
                        const record = attendanceMap.get(dateStr);
                        const isPresent = record?.present;
                        const hasRecord = !!record;

                        return (
                          <div key={dateStr} className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{date.toLocaleDateString()}</p>
                                <p className="text-xs text-gray-500">{record?.subject || 'General'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  !hasRecord ? 'bg-gray-100 text-gray-600' :
                                  isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {!hasRecord ? 'Not Recorded' : isPresent ? 'Present' : 'Absent'}
                                </span>
                                {hasRecord ? (
                                  <>
                                    <button
                                      onClick={() => openAttendanceModal(record)}
                                      className="rounded-lg p-1 text-gray-600 hover:bg-gray-200"
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAttendance(record._id)}
                                      className="rounded-lg p-1 text-red-600 hover:bg-red-100"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => openAttendanceModal(undefined, date)}
                                    className="rounded-lg p-1 text-blue-600 hover:bg-blue-100"
                                    title="Add Attendance"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                // Show recent attendance when no filter is applied
                attendance.length === 0 ? (
                  <p className="text-sm text-gray-500">No attendance records found.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 20).map((record) => (
                      <div key={record._id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{new Date(record.attendance_date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{record.subject || 'General'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              record.present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {record.present ? 'Present' : 'Absent'}
                            </span>
                            <button
                              onClick={() => openAttendanceModal(record)}
                              className="rounded-lg p-1 text-gray-600 hover:bg-gray-200"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAttendance(record._id)}
                              className="rounded-lg p-1 text-red-600 hover:bg-red-100"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        ) : tab === 'Interventions' ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Intervention History</h3>
            {interventions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">No interventions recorded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interventions.map((intervention) => (
                  <div key={intervention._id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{toDisplayType(intervention.intervention_type)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(intervention.start_date).toLocaleDateString()} - {intervention.end_date ? new Date(intervention.end_date).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        intervention.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        intervention.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                        intervention.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {intervention.status}
                      </span>
                    </div>
                    {intervention.description && (
                      <div className="mt-3 rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700">Description:</p>
                        <p className="text-sm text-gray-700">{intervention.description}</p>
                      </div>
                    )}
                    {intervention.meeting_details && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-700">Meeting Details:</p>
                        <p className="text-sm text-gray-600">{intervention.meeting_details}</p>
                      </div>
                    )}
                    {intervention.outcome && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-medium text-green-700">Outcome:</p>
                        <p className="text-sm text-gray-700">{intervention.outcome}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'Summary' ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">AI-Generated Summary</h3>
              {!aiSummary && !loadingSummary && (
                <button
                  onClick={handleGenerateSummary}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Sparkles size={16} />
                  Generate Summary
                </button>
              )}
            </div>
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                <span>Generating AI summary...</span>
              </div>
            ) : aiSummary ? (
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 text-sm text-gray-700 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Student Summary</h4>
                  </div>
                  <button
                    onClick={handleGenerateSummary}
                    className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Sparkles size={12} />
                    Regenerate
                  </button>
                </div>
                <p className="whitespace-pre-line">{aiSummary}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <Sparkles size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">Click the button above to generate an AI summary of this student's profile.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-sm font-medium text-gray-600">{tab}</p>
            <p className="mt-1 text-xs text-gray-400">Detailed {tab.toLowerCase()} records coming soon.</p>
          </div>
        )}
      </div>

      {/* Academic Modal */}
      {showAcademicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              {editingAcademic ? 'Edit Academic Record' : 'Add Academic Record'}
            </h3>
            <form onSubmit={handleAcademicSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Term</label>
                    <select
                      required
                      value={academicForm.term}
                      onChange={(e) => setAcademicForm({ ...academicForm, term: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select term</option>
                      <option value="1st Term">1st Term (September)</option>
                      <option value="2nd Term">2nd Term (January)</option>
                      <option value="3rd Term">3rd Term (May)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                    <input
                      required
                      type="text"
                      value={academicForm.year}
                      onChange={(e) => setAcademicForm({ ...academicForm, year: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g., 2026"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Mathematics</label>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      value={academicForm.mathematics_grade}
                      onChange={(e) => setAcademicForm({ ...academicForm, mathematics_grade: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">English</label>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      value={academicForm.english_grade}
                      onChange={(e) => setAcademicForm({ ...academicForm, english_grade: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Science</label>
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      value={academicForm.science_grade}
                      onChange={(e) => setAcademicForm({ ...academicForm, science_grade: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="0-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Overall Average</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    value={academicForm.overall_average}
                    onChange={(e) => setAcademicForm({ ...academicForm, overall_average: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">GPA</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={academicForm.gpa}
                    onChange={(e) => setAcademicForm({ ...academicForm, gpa: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g., 3.12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Major Subjects Enrolled</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={academicForm.major_subjects_enrolled}
                      onChange={(e) => setAcademicForm({ ...academicForm, major_subjects_enrolled: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Major Subjects Passed</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={academicForm.major_subjects_passed}
                      onChange={(e) => setAcademicForm({ ...academicForm, major_subjects_passed: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Major Subjects Failed</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={academicForm.major_subjects_failed}
                      onChange={(e) => setAcademicForm({ ...academicForm, major_subjects_failed: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Total Units</label>
                    <input
                      type="number"
                      min="0"
                      value={academicForm.total_units}
                      onChange={(e) => setAcademicForm({ ...academicForm, total_units: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAcademicModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {editingAcademic ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              {editingAttendance ? 'Edit Attendance Record' : 'Add Attendance Record'}
            </h3>
            <form onSubmit={handleAttendanceSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input
                    required
                    type="date"
                    value={attendanceForm.attendance_date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    value={attendanceForm.subject}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, subject: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={attendanceForm.present.toString()}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, present: e.target.value === 'true' })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="true">Present</option>
                    <option value="false">Absent</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {editingAttendance ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
