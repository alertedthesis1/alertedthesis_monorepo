import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Users,
  User,
  Calendar,
  CalendarDays,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  StickyNote,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import RiskBadge from '@/components/ui/RiskBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import EarlyWarningBadge from '@/components/ui/EarlyWarningBadge';
import { fetchStudents, StudentSummary, fetchDashboardStats, DashboardStats, fetchEarlyWarningBatchPredictions, EarlyWarningPrediction, recordAttendance, getStudentAttendance, getStudentAcademicRecords, recalculateAllRiskScores } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const TABS = ['Dashboard', 'Attendance', 'Academic Records'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const client = axios.create({ baseURL: API_URL, timeout: 8000 });

export default function Faculty() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [earlyWarnings, setEarlyWarnings] = useState<Record<string, EarlyWarningPrediction>>({});
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [sortOption, setSortOption] = useState('name-asc');
  const [todayPresent, setTodayPresent] = useState(0);
  const [todayAbsent, setTodayAbsent] = useState(0);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | undefined>>({});
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [showStudentInfoModal, setShowStudentInfoModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [gradeForm, setGradeForm] = useState({ date: '', semester: '', grade: '', subject: '' });
  const [studentAcademicRecords, setStudentAcademicRecords] = useState<Record<string, any[]>>({});
  const [studentAttendanceHistory, setStudentAttendanceHistory] = useState<Record<string, any[]>>({});
  const [calendarStartDate, setCalendarStartDate] = useState('');
  const [calendarEndDate, setCalendarEndDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [showAcademicRecordModal, setShowAcademicRecordModal] = useState(false);
  const [showAddAcademicRecordModal, setShowAddAcademicRecordModal] = useState(false);
  const [showEditAcademicRecordModal, setShowEditAcademicRecordModal] = useState(false);
  const [editingAcademicRecord, setEditingAcademicRecord] = useState<any>(null);
  const [academicRecordForm, setAcademicRecordForm] = useState({ term: '', year: '', mathematics_grade: '', english_grade: '', science_grade: '', overall_average: '', gpa: '', major_subjects_enrolled: '', major_subjects_passed: '', major_subjects_failed: '', total_units: '' });
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Calculate overall average and GPA automatically when subject grades change
  const calculateAcademicMetrics = (math: string, english: string, science: string) => {
    const mathGrade = parseFloat(math) || 0;
    const englishGrade = parseFloat(english) || 0;
    const scienceGrade = parseFloat(science) || 0;
    
    if (mathGrade > 0 || englishGrade > 0 || scienceGrade > 0) {
      const overallAverage = ((mathGrade + englishGrade + scienceGrade) / 3).toFixed(1);
      // Convert to GPA (4.0 scale): 90-100 = 4.0, 80-89 = 3.0-3.9, 70-79 = 2.0-2.9, 60-69 = 1.0-1.9, below 60 = 0.0
      const avgGrade = parseFloat(overallAverage);
      let gpa = 0;
      if (avgGrade >= 90) gpa = 4.0;
      else if (avgGrade >= 80) gpa = 3.0 + (avgGrade - 80) / 10;
      else if (avgGrade >= 70) gpa = 2.0 + (avgGrade - 70) / 10;
      else if (avgGrade >= 60) gpa = 1.0 + (avgGrade - 60) / 10;
      else gpa = 0.0;
      
      return { overall_average: overallAverage, gpa: gpa.toFixed(2) };
    }
    return { overall_average: '', gpa: '' };
  };

  const handleSubjectGradeChange = (field: string, value: string) => {
    const updatedForm = { ...academicRecordForm, [field]: value };
    const { overall_average, gpa } = calculateAcademicMetrics(
      updatedForm.mathematics_grade,
      updatedForm.english_grade,
      updatedForm.science_grade
    );
    setAcademicRecordForm({ ...updatedForm, overall_average, gpa });
  };

  useEffect(() => {
    let active = true;
    Promise.all([fetchStudents(user?.email, 1, 1000, selectedTerm, selectedYear), fetchDashboardStats(user?.email, selectedTerm, selectedYear)]).then(([studentsData, stats]) => {
      if (active) {
        setStudents(studentsData.data);
        setDashboardStats(stats);

        // Fetch today's attendance for all students
        const todayDate = new Date().toISOString().split('T')[0];
        const studentIds = studentsData.data.map((s: any) => s.id);

        client.post('/attendance/batch', { student_ids: studentIds, attendance_date: todayDate })
          .then(({ data }) => {
            if (active && data.data) {
              const attendanceMap: Record<string, 'present' | 'absent'> = {};
              data.data.forEach((record: any) => {
                attendanceMap[record.student_id] = record.present ? 'present' : 'absent';
              });
              setAttendance(attendanceMap);
            }
          })
          .catch(err => {
            console.error('Error fetching today\'s attendance:', err);
          });

        // Fetch early warning predictions
        if (studentsData.data.length > 0) {
          const studentIds = studentsData.data.map((s: any) => s.id);
          fetchEarlyWarningBatchPredictions(studentIds, selectedTerm, selectedYear).then(predictions => {
            if (active) {
              const predictionsMap: Record<string, EarlyWarningPrediction> = {};
              predictions.forEach(p => {
                predictionsMap[p.student_id] = p;
              });
              setEarlyWarnings(predictionsMap);
            }
          }).catch((err: any) => {
            console.error('Error fetching early warnings:', err);
          });
        }
      }
    });
    return () => {
      active = false;
    };
  }, [user, query, selectedTerm, selectedYear]);

  // Recalculate risk scores when term/year filters change
  const handleRecalculateRiskScores = async () => {
    if (!selectedTerm && !selectedYear) {
      alert('Please select a term or year to recalculate risk scores');
      return;
    }
    
    setIsRecalculating(true);
    try {
      await recalculateAllRiskScores(selectedTerm || undefined, selectedYear || undefined);
      // Refresh the data after recalculation
      const [studentsData, stats] = await Promise.all([
        fetchStudents(user?.email, 1, 1000, selectedTerm, selectedYear),
        fetchDashboardStats(user?.email, selectedTerm, selectedYear)
      ]);
      setStudents(studentsData.data);
      setDashboardStats(stats);
      
      // Refresh early warning predictions
      if (studentsData.data.length > 0) {
        const studentIds = studentsData.data.map((s: any) => s.id);
        const predictions = await fetchEarlyWarningBatchPredictions(studentIds, selectedTerm, selectedYear);
        const predictionsMap: Record<string, EarlyWarningPrediction> = {};
        predictions.forEach(p => {
          predictionsMap[p.student_id] = p;
        });
        setEarlyWarnings(predictionsMap);
      }
    } catch (error) {
      console.error('Error recalculating risk scores:', error);
      alert('Failed to recalculate risk scores. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (s as any).student_id?.toString().includes(query);
    return matchesSearch;
  }).sort((a, b) => {
    if (sortOption === 'name-asc') {
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    } else if (sortOption === 'name-desc') {
      return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
    } else if (sortOption === 'id-asc') {
      return (a.student_id || '').localeCompare(b.student_id || '');
    } else if (sortOption === 'id-desc') {
      return (b.student_id || '').localeCompare(a.student_id || '');
    }
    return 0;
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getAttendanceForDate = (date: Date, studentId: string) => {
    const history = studentAttendanceHistory[studentId] || [];
    const calendarDate = new Date(date);
    calendarDate.setHours(0, 0, 0, 0);
    const calendarDateStr = calendarDate.toISOString().split('T')[0];

    return history.find((record: any) => {
      const recordDate = new Date(record.attendance_date);
      recordDate.setHours(0, 0, 0, 0);
      const recordDateStr = recordDate.toISOString().split('T')[0];
      return calendarDateStr === recordDateStr;
    });
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const isDateInRange = (date: Date) => {
    if (!calendarStartDate || !calendarEndDate) return true;
    const start = new Date(calendarStartDate);
    const end = new Date(calendarEndDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  };

  const getAttendanceSummary = (studentId: string) => {
    const history = studentAttendanceHistory[studentId] || [];

    const filteredHistory = history.filter((record: any) => {
      const date = new Date(record.attendance_date);
      return isDateInRange(date) && !isWeekend(date) && !isFutureDate(date);
    });

    let present = filteredHistory.filter((r: any) => r.present === true).length;
    let absent = filteredHistory.filter((r: any) => r.present === false).length;

    // Include the selected attendance date's marking from the attendance state if it's in range
    const selectedDate = new Date(attendanceDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (isDateInRange(selectedDate) && !isWeekend(selectedDate) && !isFutureDate(selectedDate)) {
      const selectedDateAttendance = attendance[studentId];
      if (selectedDateAttendance === 'present') {
        present++;
      } else if (selectedDateAttendance === 'absent') {
        absent++;
      }
    }

    // Calculate total weekdays in the date range
    let totalWeekdays = 0;
    if (calendarStartDate && calendarEndDate) {
      const start = new Date(calendarStartDate);
      const end = new Date(calendarEndDate);
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        if (!isWeekend(current) && !isFutureDate(current)) {
          totalWeekdays++;
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      // If no date range selected, use the current month
      const daysInMonth = getDaysInMonth(currentMonth);
      totalWeekdays = daysInMonth.filter((date) => date && !isWeekend(date) && !isFutureDate(date as Date)).length;
    }

    return { total: totalWeekdays, present, absent };
  };

  return (
    <>
      <Head>
        <title>Faculty Dashboard - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600">
              {user ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'FA'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user?.name ?? 'Faculty Member'}</h1>
              <p className="text-sm text-gray-500">{user?.department ?? 'Faculty'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
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

        {tab === 'Dashboard' && (
          <>
        {/* Term and Year Filters */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter size={18} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filter by Term and Year</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Term:</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Terms</option>
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
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {(selectedTerm || selectedYear) && (
              <>
                <button
                  onClick={handleRecalculateRiskScores}
                  disabled={isRecalculating}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRecalculating ? 'Recalculating...' : 'Recalculate Risk Scores'}
                </button>
                <button
                  onClick={() => {
                    setSelectedTerm('');
                    setSelectedYear('');
                  }}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={dashboardStats?.totalStudents ?? 0} caption="Active enrollment" icon={Users} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="Current Date" value={currentDate} caption="Today" icon={Calendar} iconColor="text-blue-600" valueColor="text-blue-600" />
          <StatCard label="Present" value={Object.values(attendance).filter(v => v === 'present').length} caption="Today's attendance" icon={CheckCircle} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="Absent" value={Object.values(attendance).filter(v => v === 'absent').length} caption="Today's attendance" icon={XCircle} iconColor="text-red-600" valueColor="text-red-600" />
        </div>

        {/* Student Cards Section */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Students</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-44 text-sm outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="id-asc">Student ID (ASC)</option>
                <option value="id-desc">Student ID (DESC)</option>
              </select>
              <button
                onClick={() => {
                  setQuery('');
                  setSortOption('name-asc');
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X size={14} /> Clear
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setShowStudentInfoModal(true);
                  }}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-5 hover:bg-gray-100 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-300 text-sm font-semibold text-gray-700">
                        <User size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                        <p className="text-xs text-gray-500">Grade: {s.grade}</p>
                      </div>
                    </div>
                    <RiskBadge level={s.riskLevel} label={s.riskLevel} />
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Math:</span>
                      <span className="text-gray-700">{s.mathematicsGrade || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">English:</span>
                      <span className="text-gray-700">{s.englishGrade || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Science:</span>
                      <span className="text-gray-700">{s.scienceGrade || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">GPA:</span>
                      <span className="text-gray-700">{s.gpa || '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}

        {tab === 'Attendance' && (
          <>
            <div className="mt-6">
              {/* Term and Year Filters for Attendance Tab */}
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Filter size={18} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Filter by Term and Year</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Term:</label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">All Terms</option>
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
                      <option value="">All Years</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(selectedTerm || selectedYear) && (
                    <button
                      onClick={() => {
                        setSelectedTerm('');
                        setSelectedYear('');
                      }}
                      className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Mark Attendance</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Date:</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                    <button
                      onClick={async () => {
                        const studentIds = students.map((s: any) => s.id);
                        client.post('/attendance/batch', { student_ids: studentIds, attendance_date: attendanceDate })
                          .then(({ data }) => {
                            if (data.data) {
                              const attendanceMap: Record<string, 'present' | 'absent'> = {};
                              data.data.forEach((record: any) => {
                                attendanceMap[record.student_id] = record.present ? 'present' : 'absent';
                              });
                              setAttendance(attendanceMap);
                            }
                          })
                          .catch(err => {
                            console.error('Error fetching attendance for date:', err);
                          });
                      }}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      OK
                    </button>
                    <button
                      onClick={async () => {
                        const todayDate = new Date().toISOString().split('T')[0];
                        setAttendanceDate(todayDate);
                        const studentIds = students.map((s: any) => s.id);
                        client.post('/attendance/batch', { student_ids: studentIds, attendance_date: todayDate })
                          .then(({ data }) => {
                            if (data.data) {
                              const attendanceMap: Record<string, 'present' | 'absent'> = {};
                              data.data.forEach((record: any) => {
                                attendanceMap[record.student_id] = record.present ? 'present' : 'absent';
                              });
                              setAttendance(attendanceMap);
                            }
                          })
                          .catch(err => {
                            console.error('Error fetching today\'s attendance:', err);
                          });
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={async () => {
                        const attendanceMap: Record<string, 'present' | 'absent'> = {};
                        const promises = students.map((s: any) => {
                          attendanceMap[s.id] = 'present';
                          return recordAttendance(s.id, attendanceDate, true);
                        });
                        setAttendance(attendanceMap);
                        try {
                          await Promise.all(promises);
                          setAlertModal({ show: true, message: 'All students marked as present', type: 'success' });
                        } catch (err) {
                          console.error('Error marking all present:', err);
                          setAlertModal({ show: true, message: 'Failed to mark some students as present', type: 'error' });
                        }
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Present All
                    </button>
                  </div>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="id-asc">Student ID (A-Z)</option>
                    <option value="id-desc">Student ID (Z-A)</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade/Section</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700 mr-3">
                              {s.firstName[0]}{s.lastName[0]}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.student_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.grade}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {attendance[s.id] === 'present' && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Present</span>
                          )}
                          {attendance[s.id] === 'absent' && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Absent</span>
                          )}
                          {!attendance[s.id] && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Not Marked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => {
                              setAttendance({ ...attendance, [s.id]: 'present' });
                              recordAttendance(s.id, attendanceDate, true).catch(() => {
                                const newAttendance = { ...attendance };
                                delete newAttendance[s.id];
                                setAttendance(newAttendance);
                              });
                            }}
                            className="mr-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => {
                              setAttendance({ ...attendance, [s.id]: 'absent' });
                              recordAttendance(s.id, attendanceDate, false).catch(() => {
                                const newAttendance = { ...attendance };
                                delete newAttendance[s.id];
                                setAttendance(newAttendance);
                              });
                            }}
                            className="mr-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Absent
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedStudent(s);
                              const history = await getStudentAttendance(s.id, calendarStartDate, calendarEndDate, selectedTerm || undefined, selectedYear || undefined);
                              setStudentAttendanceHistory({ ...studentAttendanceHistory, [s.id]: history });
                              setShowAttendanceModal(true);
                            }}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Calendar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'Academic Records' && (
          <>
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Student Academic Records</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <Search size={16} className="text-gray-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search students..."
                      className="w-44 text-sm outline-none placeholder:text-gray-400"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="id-asc">Student ID (A-Z)</option>
                    <option value="id-desc">Student ID (Z-A)</option>
                  </select>
                </div>
              </div>

              {/* Term and Year Filters for Academic Tab */}
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Filter size={18} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Filter by Term and Year</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Term:</label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">All Terms</option>
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
                      <option value="">All Years</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(selectedTerm || selectedYear) && (
                    <button
                      onClick={() => {
                        setSelectedTerm('');
                        setSelectedYear('');
                      }}
                      className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    onClick={async () => {
                      setSelectedStudent(s);
                      const academicRecords = await getStudentAcademicRecords(s.id, selectedTerm || undefined, selectedYear || undefined);
                      setStudentAcademicRecords({ ...studentAcademicRecords, [s.id]: academicRecords });
                      setShowAcademicRecordModal(true);
                    }}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition flex flex-col items-center text-center"
                  >
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center mb-3 overflow-hidden">
                      <div className="flex h-full w-full items-center justify-center bg-gray-300 text-sm font-semibold text-gray-700">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                    <div className="mt-2 w-full space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Math:</span>
                        <span className="text-gray-700">{s.mathematicsGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">English:</span>
                        <span className="text-gray-700">{s.englishGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Science:</span>
                        <span className="text-gray-700">{s.scienceGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">GPA:</span>
                        <span className="text-gray-700">{s.gpa || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {showAcademicRecordModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-4xl w-full rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Academic Records - {selectedStudent.firstName} {selectedStudent.lastName}</h3>
                <button onClick={() => setShowAcademicRecordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddAcademicRecordModal(true)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Add Record
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                    {[...(studentAcademicRecords[selectedStudent.id] || [])].sort((a, b) => {
                      // Sort by year descending (2026 → 2025 → 2024)
                      const yearDiff = parseInt(b.year) - parseInt(a.year);
                      if (yearDiff !== 0) return yearDiff;
                      
                      // Sort by term descending (3rd Term → 2nd Term → 1st Term)
                      const termOrder = { '3rd Term': 3, '2nd Term': 2, '1st Term': 1 };
                      const termDiff = termOrder[b.term as keyof typeof termOrder] - termOrder[a.term as keyof typeof termOrder];
                      return termDiff;
                    }).map((record: any) => (
                      <tr key={record._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.term} {record.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.mathematics_grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.english_grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.science_grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.overall_average || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.gpa}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.major_subjects_enrolled}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.major_subjects_passed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.major_subjects_failed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.total_units}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingAcademicRecord(record);
                                setAcademicRecordForm({
                                  term: record.term,
                                  year: record.year,
                                  mathematics_grade: record.mathematics_grade?.toString() || '',
                                  english_grade: record.english_grade?.toString() || '',
                                  science_grade: record.science_grade?.toString() || '',
                                  overall_average: record.overall_average?.toString() || '',
                                  gpa: record.gpa.toString(),
                                  major_subjects_enrolled: record.major_subjects_enrolled.toString(),
                                  major_subjects_passed: record.major_subjects_passed.toString(),
                                  major_subjects_failed: record.major_subjects_failed.toString(),
                                  total_units: record.total_units.toString(),
                                });
                                setShowEditAcademicRecordModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await client.delete(`/academicrecords/${record._id}`);
                                  const academicRecords = await getStudentAcademicRecords(selectedStudent.id);
                                  setStudentAcademicRecords({ ...studentAcademicRecords, [selectedStudent.id]: academicRecords });
                                  setAlertModal({ show: true, message: 'Academic record deleted successfully', type: 'success' });
                                } catch (err) {
                                  console.error('Error deleting academic record:', err);
                                  setAlertModal({ show: true, message: 'Failed to delete academic record', type: 'error' });
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(studentAcademicRecords[selectedStudent.id] || []).length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">
                          No academic records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showAddAcademicRecordModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md w-full rounded-lg bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add Academic Record</h3>
                <button onClick={() => setShowAddAcademicRecordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select
                      value={academicRecordForm.term}
                      onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, term: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    >
                      <option value="">Select term</option>
                      <option value="1st Term">1st Term (September)</option>
                      <option value="2nd Term">2nd Term (January)</option>
                      <option value="3rd Term">3rd Term (May)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={academicRecordForm.year}
                      onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, year: e.target.value })}
                      placeholder="e.g., 2026"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mathematics</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.mathematics_grade}
                      onChange={(e) => handleSubjectGradeChange('mathematics_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">English</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.english_grade}
                      onChange={(e) => handleSubjectGradeChange('english_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Science</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.science_grade}
                      onChange={(e) => handleSubjectGradeChange('science_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overall Average</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={academicRecordForm.overall_average}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={academicRecordForm.gpa}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Enrolled</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_enrolled}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_enrolled: e.target.value })}
                    placeholder="e.g., 15"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Passed</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_passed}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_passed: e.target.value })}
                    placeholder="e.g., 14"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Failed</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_failed}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_failed: e.target.value })}
                    placeholder="e.g., 1"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={academicRecordForm.total_units}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, total_units: e.target.value })}
                    placeholder="e.g., 45"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddAcademicRecordModal(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await client.post('/academicrecords', {
                        student_id: selectedStudent.id,
                        term: academicRecordForm.term,
                        year: academicRecordForm.year,
                        mathematics_grade: parseFloat(academicRecordForm.mathematics_grade),
                        english_grade: parseFloat(academicRecordForm.english_grade),
                        science_grade: parseFloat(academicRecordForm.science_grade),
                        major_subjects_enrolled: parseInt(academicRecordForm.major_subjects_enrolled),
                        major_subjects_passed: parseInt(academicRecordForm.major_subjects_passed),
                        major_subjects_failed: parseInt(academicRecordForm.major_subjects_failed),
                        total_units: parseInt(academicRecordForm.total_units),
                      });
                      const academicRecords = await getStudentAcademicRecords(selectedStudent.id);
                      setStudentAcademicRecords({ ...studentAcademicRecords, [selectedStudent.id]: academicRecords });
                      setShowAddAcademicRecordModal(false);
                      setAcademicRecordForm({ term: '', year: '', mathematics_grade: '', english_grade: '', science_grade: '', overall_average: '', gpa: '', major_subjects_enrolled: '', major_subjects_passed: '', major_subjects_failed: '', total_units: '' });
                      setAlertModal({ show: true, message: 'Academic record added successfully', type: 'success' });
                    } catch (err) {
                      console.error('Error adding academic record:', err);
                      setAlertModal({ show: true, message: 'Failed to add academic record', type: 'error' });
                    }
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditAcademicRecordModal && selectedStudent && editingAcademicRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md w-full rounded-lg bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Edit Academic Record</h3>
                <button onClick={() => setShowEditAcademicRecordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <select
                      value={academicRecordForm.term}
                      onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, term: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    >
                      <option value="">Select term</option>
                      <option value="1st Term">1st Term (September)</option>
                      <option value="2nd Term">2nd Term (January)</option>
                      <option value="3rd Term">3rd Term (May)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={academicRecordForm.year}
                      onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, year: e.target.value })}
                      placeholder="e.g., 2026"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mathematics</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.mathematics_grade}
                      onChange={(e) => handleSubjectGradeChange('mathematics_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">English</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.english_grade}
                      onChange={(e) => handleSubjectGradeChange('english_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Science</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={academicRecordForm.science_grade}
                      onChange={(e) => handleSubjectGradeChange('science_grade', e.target.value)}
                      placeholder="0-100"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overall Average</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={academicRecordForm.overall_average}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={academicRecordForm.gpa}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Enrolled</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_enrolled}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_enrolled: e.target.value })}
                    placeholder="e.g., 15"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Passed</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_passed}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_passed: e.target.value })}
                    placeholder="e.g., 14"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major Subjects Failed</label>
                  <input
                    type="number"
                    value={academicRecordForm.major_subjects_failed}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, major_subjects_failed: e.target.value })}
                    placeholder="e.g., 1"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
                  <input
                    type="number"
                    value={academicRecordForm.total_units}
                    onChange={(e) => setAcademicRecordForm({ ...academicRecordForm, total_units: e.target.value })}
                    placeholder="e.g., 45"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditAcademicRecordModal(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await client.put(`/academicrecords/${editingAcademicRecord._id}`, {
                        term: academicRecordForm.term,
                        year: academicRecordForm.year,
                        mathematics_grade: parseFloat(academicRecordForm.mathematics_grade),
                        english_grade: parseFloat(academicRecordForm.english_grade),
                        science_grade: parseFloat(academicRecordForm.science_grade),
                        major_subjects_enrolled: parseInt(academicRecordForm.major_subjects_enrolled),
                        major_subjects_passed: parseInt(academicRecordForm.major_subjects_passed),
                        major_subjects_failed: parseInt(academicRecordForm.major_subjects_failed),
                        total_units: parseInt(academicRecordForm.total_units),
                      });
                      const academicRecords = await getStudentAcademicRecords(selectedStudent.id);
                      setStudentAcademicRecords({ ...studentAcademicRecords, [selectedStudent.id]: academicRecords });
                      setShowEditAcademicRecordModal(false);
                      setEditingAcademicRecord(null);
                      setAcademicRecordForm({ term: '', year: '', mathematics_grade: '', english_grade: '', science_grade: '', overall_average: '', gpa: '', major_subjects_enrolled: '', major_subjects_passed: '', major_subjects_failed: '', total_units: '' });
                      setAlertModal({ show: true, message: 'Academic record updated successfully', type: 'success' });
                    } catch (err) {
                      console.error('Error updating academic record:', err);
                      setAlertModal({ show: true, message: 'Failed to update academic record', type: 'error' });
                    }
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showStudentInfoModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-2xl w-full rounded-lg bg-white p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Student Profile</h3>
                <button onClick={() => setShowStudentInfoModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="text-3xl font-semibold text-gray-600">
                    {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                  <p className="text-gray-600">Student ID: {selectedStudent.student_id}</p>
                  <p className="text-gray-600">Grade: {selectedStudent.grade}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Student ID</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.student_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Grade Level</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.grade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Attendance Rate</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.attendance}%</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Academic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Mathematics Grade</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.mathematicsGrade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">English Grade</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.englishGrade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Science Grade</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.scienceGrade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">GPA</p>
                      <p className="text-sm font-medium text-gray-900">{selectedStudent.gpa || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAttendanceModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-4xl w-full rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Attendance Calendar - {selectedStudent.firstName} {selectedStudent.lastName}</h3>
                <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <h4 className="text-md font-semibold text-gray-900 mb-3">Attendance Calendar</h4>

              {/* Date Range Filter */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={calendarStartDate}
                    onChange={(e) => setCalendarStartDate(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={calendarEndDate}
                    onChange={(e) => setCalendarEndDate(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <button
                  onClick={() => {
                    setCalendarStartDate('');
                    setCalendarEndDate('');
                  }}
                  className="mt-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X size={14} /> Clear
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Previous
                </button>
                <h5 className="text-lg font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h5>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, idx) => {
                    if (!date) {
                      return <div key={idx} className="h-10"></div>;
                    }

                    const attendance = getAttendanceForDate(date, selectedStudent.id);
                    const weekend = isWeekend(date);
                    const future = isFutureDate(date);
                    const inRange = isDateInRange(date);

                    let bgColor = 'bg-white';
                    let textColor = 'text-gray-900';
                    let borderColor = 'border-gray-200';

                    if (weekend || future) {
                      bgColor = 'bg-gray-100';
                      textColor = 'text-gray-400';
                      borderColor = 'border-gray-100';
                    } else if (attendance) {
                      if (attendance.present) {
                        bgColor = 'bg-green-100';
                        textColor = 'text-green-800';
                        borderColor = 'border-green-300';
                      } else {
                        bgColor = 'bg-red-100';
                        textColor = 'text-red-800';
                        borderColor = 'border-red-300';
                      }
                    }

                    if (!inRange && calendarStartDate && calendarEndDate) {
                      bgColor = 'bg-gray-50';
                      textColor = 'text-gray-400';
                      borderColor = 'border-gray-100';
                    }

                    return (
                      <div
                        key={idx}
                        className={`h-10 flex items-center justify-center rounded border ${bgColor} ${textColor} ${borderColor} text-sm font-medium`}
                      >
                        {date.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Attendance Summary</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {getAttendanceSummary(selectedStudent.id).total}
                    </div>
                    <div className="text-xs text-gray-500">Total Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getAttendanceSummary(selectedStudent.id).present}
                    </div>
                    <div className="text-xs text-gray-500">Days Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {getAttendanceSummary(selectedStudent.id).absent}
                    </div>
                    <div className="text-xs text-gray-500">Days Absent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {alertModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md w-full rounded-lg bg-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                {alertModal.type === 'success' ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <XCircle size={24} className="text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {alertModal.type === 'success' ? 'Success' : 'Error'}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">{alertModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setAlertModal({ show: false, message: '', type: 'success' })}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
