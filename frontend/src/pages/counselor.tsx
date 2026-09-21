import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Users,
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
  Download,
  FileText,
  StickyNote,
  X,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import RiskBadge from '@/components/ui/RiskBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import EarlyWarningBadge from '@/components/ui/EarlyWarningBadge';
import { fetchStudents, StudentSummary, fetchSchedules, createSchedule, updateSchedule, deleteSchedule, Schedule, fetchInterventions, Intervention, fetchTasks, createTask, updateTask, deleteTask, Task, fetchReports, Report, fetchDashboardStats, DashboardStats, generateReport, downloadReport, fetchEarlyWarningPrediction, fetchEarlyWarningBatchPredictions, EarlyWarningPrediction, recalculateAllRiskScores } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TABS = ['My Caseload', 'Schedule', 'Interventions', 'Tasks', 'Reports'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

// Function to convert display label to database value
const toDatabaseType = (displayLabel: string): string => {
  return SCHEDULE_TYPE_MAPPING[displayLabel as keyof typeof SCHEDULE_TYPE_MAPPING] || displayLabel;
};

// Function to convert database value to display label
const toDisplayType = (databaseValue: string): string => {
  return REVERSE_SCHEDULE_TYPE_MAPPING[databaseValue as keyof typeof REVERSE_SCHEDULE_TYPE_MAPPING] || databaseValue;
};

export default function Counselor() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState('My Caseload');
  const [query, setQuery] = useState('');
  const [caseload, setCaseload] = useState<StudentSummary[]>([]);
  const [sortOption, setSortOption] = useState('name-asc');
  const [earlyWarnings, setEarlyWarnings] = useState<Record<string, EarlyWarningPrediction>>({});
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    student_id: '',
    student_name: '',
    date: '',
    time: '',
    type: 'Counseling / Coaching',
    intervention_id: '',
    notes: '',
  });
  const [addingAppointment, setAddingAppointment] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    report_type: 'Attendance' as 'Attendance' | 'Academic' | 'Behavioral' | 'Risk' | 'Intervention',
    student_id: '',
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('All');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingReport(true);
    try {
      const newReport = await generateReport(reportForm.report_type, reportForm.student_id, user?.email || '');
      setReports([newReport, ...reports]);
      setShowReportModal(false);
      setReportForm({
        report_type: 'Attendance',
        student_id: '',
      });
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const reportFilteredStudents = caseload.filter((student) => {
    const searchLower = studentSearchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.id.toLowerCase().includes(searchLower) ||
      (student.student_id && student.student_id.toLowerCase().includes(searchLower))
    );
  });

  const handleSelectReportStudent = (studentId: string, studentName: string) => {
    setReportForm({ ...reportForm, student_id: studentId });
    setStudentSearchQuery(studentName);
    setShowStudentDropdown(false);
  };

  const filteredReports = reports.filter((report) => {
    const searchLower = reportSearchQuery.toLowerCase();
    const matchesSearch =
      report.title.toLowerCase().includes(searchLower) ||
      report.report_type.toLowerCase().includes(searchLower) ||
      (report.student_id as any)?.toString().toLowerCase().includes(searchLower) ||
      ((report.student_id as any)?.first_name && (report.student_id as any).first_name.toLowerCase().includes(searchLower)) ||
      ((report.student_id as any)?.last_name && (report.student_id as any).last_name.toLowerCase().includes(searchLower));

    const matchesFilter = reportTypeFilter === 'All' || report.report_type === reportTypeFilter;

    return matchesSearch && matchesFilter;
  });

  const handleDownloadReport = async (reportId: string, reportTitle: string) => {
    try {
      await downloadReport(reportId, reportTitle);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    student_id: '',
    assigned_to: '',
    intervention_id: '',
    due_date: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    status: 'Pending' as 'Pending' | 'In Progress' | 'Completed',
  });
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('All');
  const [scheduleDateFilter, setScheduleDateFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [interventionSearchQuery, setInterventionSearchQuery] = useState('');
  const [interventionStatusFilter, setInterventionStatusFilter] = useState('All');
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [interventionForm, setInterventionForm] = useState({
    meeting_details: '',
    intervention_type: '',
    description: '',
    outcome: '',
  });

  useEffect(() => {
    let active = true;
    Promise.all([fetchStudents(user?.email, 1, 1000, selectedTerm, selectedYear), fetchDashboardStats(user?.email, selectedTerm, selectedYear)]).then(([students, stats]) => {
      if (active) {
        setCaseload(students.data);
        setDashboardStats(stats);

        // Fetch early warning predictions for caseload
        const studentIds = students.data.map(s => s.id);
        if (studentIds.length > 0) {
          fetchEarlyWarningBatchPredictions(studentIds, selectedTerm, selectedYear).then(predictions => {
            if (active) {
              const warningsMap: Record<string, EarlyWarningPrediction> = {};
              predictions.forEach(p => {
                warningsMap[p.student_id] = p;
              });
              setEarlyWarnings(warningsMap);
            }
          }).catch(err => {
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
      const [students, stats] = await Promise.all([
        fetchStudents(user?.email, 1, 1000, selectedTerm, selectedYear),
        fetchDashboardStats(user?.email, selectedTerm, selectedYear)
      ]);
      setCaseload(students.data);
      setDashboardStats(stats);
      
      // Refresh early warning predictions
      if (students.data.length > 0) {
        const studentIds = students.data.map(s => s.id);
        const predictions = await fetchEarlyWarningBatchPredictions(studentIds, selectedTerm, selectedYear);
        const warningsMap: Record<string, EarlyWarningPrediction> = {};
        predictions.forEach(p => {
          warningsMap[p.student_id] = p;
        });
        setEarlyWarnings(warningsMap);
      }
    } catch (error) {
      console.error('Error recalculating risk scores:', error);
      alert('Failed to recalculate risk scores. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Lazy load schedules when switching to Schedule tab
  useEffect(() => {
    if (tab === 'Schedule' && schedules.length === 0) {
      fetchSchedules(user?.email).then(setSchedules);
    }
  }, [tab, schedules.length, user?.email]);

  // Lazy load interventions when switching to Interventions tab
  useEffect(() => {
    if (tab === 'Interventions' && interventions.length === 0) {
      fetchInterventions(user?.email).then(setInterventions);
    }
  }, [tab, interventions.length, user?.email]);

  // Lazy load tasks when switching to Tasks tab
  useEffect(() => {
    if (tab === 'Tasks' && tasks.length === 0) {
      fetchTasks(user?.email).then(setTasks);
    }
  }, [tab, tasks.length, user?.email]);

  // Lazy load reports when switching to Reports tab
  useEffect(() => {
    if (tab === 'Reports' && reports.length === 0) {
      fetchReports().then(setReports);
    }
  }, [tab, reports.length]);

  const filtered = caseload.filter((s) => {
    const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (s as any).student_id?.toString().includes(query);
    const matchesRisk = riskFilter === 'All' || s.riskLevel === riskFilter;
    const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
    return matchesSearch && matchesRisk && matchesGrade;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'name-desc':
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      case 'id-asc':
        return ((a as any).student_id || '').localeCompare((b as any).student_id || '');
      case 'id-desc':
        return ((b as any).student_id || '').localeCompare((a as any).student_id || '');
      default:
        return 0;
    }
  });

  const filteredStudentsForDropdown = caseload.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const handleNewSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAppointment(true);
    try {
      await createSchedule({
        student_id: appointmentForm.student_id,
        student_name: appointmentForm.student_name,
        date: appointmentForm.date,
        time: appointmentForm.time,
        type: toDatabaseType(appointmentForm.type),
        intervention_id: appointmentForm.intervention_id || undefined,
        notes: appointmentForm.notes,
        created_by: user?.email,
      });
      const updatedSchedules = await fetchSchedules(user?.email);
      setSchedules(updatedSchedules);
      alert('Schedule created successfully!');
      setShowAppointmentModal(false);
      setAppointmentForm({
        student_id: '',
        student_name: '',
        date: '',
        time: '',
        type: 'Counseling / Coaching',
        intervention_id: '',
        notes: '',
      });
      setStudentSearchQuery('');
      setShowStudentDropdown(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create schedule');
    } finally {
      setAddingAppointment(false);
    }
  };

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setAddingAppointment(true);
    try {
      await updateSchedule(editingSchedule._id, {
        date: appointmentForm.date,
        time: appointmentForm.time,
        type: toDatabaseType(appointmentForm.type),
        notes: appointmentForm.notes,
      });
      const updatedSchedules = await fetchSchedules(user?.email);
      setSchedules(updatedSchedules);
      alert('Schedule updated successfully!');
      setShowEditModal(false);
      setEditingSchedule(null);
      setAppointmentForm({
        student_id: '',
        student_name: '',
        date: '',
        time: '',
        type: 'Counseling / Coaching',
        intervention_id: '',
        notes: '',
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update schedule');
    } finally {
      setAddingAppointment(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await deleteSchedule(id);
      const updatedSchedules = await fetchSchedules(user?.email);
      setSchedules(updatedSchedules);
      alert('Schedule deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to delete schedule');
    }
  };

  const handleNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateTask(editingTask._id, taskForm);
        alert('Task updated successfully!');
      } else {
        await createTask({
          ...taskForm,
          created_by: user?.email,
        });
        alert('Task created successfully!');
      }
      const updatedTasks = await fetchTasks();
      setTasks(updatedTasks);
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        student_id: '',
        assigned_to: '',
        intervention_id: '',
        due_date: '',
        priority: 'Medium',
        status: 'Pending',
      });
    } catch (err) {
      console.error(err);
      alert(editingTask ? 'Failed to update task' : 'Failed to create task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      const updatedTasks = await fetchTasks();
      setTasks(updatedTasks);
      alert('Task deleted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to delete task');
    }
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        student_id: task.student_id || '',
        assigned_to: task.assigned_to || '',
        intervention_id: task.intervention_id || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        priority: task.priority,
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        student_id: '',
        assigned_to: '',
        intervention_id: '',
        due_date: '',
        priority: 'Medium',
        status: 'Pending',
      });
    }
    setShowTaskModal(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setAppointmentForm({
      student_id: schedule.student_id,
      student_name: schedule.student_name,
      date: schedule.date.split('T')[0],
      time: schedule.time,
      type: toDisplayType(schedule.type),
      intervention_id: (schedule as any).intervention_id || '',
      notes: schedule.notes || '',
    });
    setShowEditModal(true);
  };

  return (
    <>
      <Head>
        <title>My Caseload - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600">
              {user ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'CO'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user?.name ?? 'School Counselor'}</h1>
              <p className="text-sm text-gray-500">{user?.department ?? 'School Counselor - Student Affairs'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAppointmentModal(true)}
            className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            <Plus size={16} /> New Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="My Caseload" value={caseload.length} caption="Active students" icon={Users} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="Active Interventions" value={caseload.reduce((sum, s) => sum + s.interventions, 0)} caption="Ongoing cases" icon={AlertTriangle} iconColor="text-amber-500" valueColor="text-amber-500" />
          <StatCard label="Today's Schedule" value={schedules.filter((a: Schedule) => new Date(a.date).toDateString() === new Date().toDateString()).length} caption="Appointments" icon={CalendarDays} iconColor="text-blue-500" valueColor="text-blue-600" />
          <StatCard label="Pending Tasks" value={dashboardStats?.tasks ?? 0} caption="Tasks awaiting completion" icon={StickyNote} iconColor="text-purple-600" valueColor="text-purple-600" />
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

        {tab === 'My Caseload' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">My Student Caseload</h2>
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
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                >
                  <option value="All">All Risk Levels</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
                >
                  <option value="All">All Grades</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
                <button
                  onClick={() => {
                    setQuery('');
                    setRiskFilter('All');
                    setGradeFilter('All');
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X size={14} /> Clear
                </button>
              </div>
            </div>

            {/* Term and Year Filters for Caseload Tab */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
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

            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                return (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                          <p className="text-xs text-gray-500">{s.grade}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <RiskBadge level={s.riskLevel} label={s.riskLevel} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Risk Score</span>
                        <span className={`font-semibold ${s.riskLevel === 'High' ? 'text-red-600' : s.riskLevel === 'Medium' ? 'text-amber-500' : 'text-green-600'}`}>
                          {s.riskScore}%
                        </span>
                      </div>
                      <ProgressBar value={s.riskScore} className="mt-1" />
                    </div>

                    <div className="mt-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Session:</span>
                        <span className="text-gray-700">{s.lastSession}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Next Appointment:</span>
                        <span className={s.appointmentScheduled ? 'text-green-600' : 'text-red-500'}>
                          {s.nextAppointment}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Math Grade:</span>
                        <span className="text-gray-700">{s.mathematicsGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">English Grade:</span>
                        <span className="text-gray-700">{s.englishGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Science Grade:</span>
                        <span className="text-gray-700">{s.scienceGrade || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">GPA:</span>
                        <span className="text-gray-700">{s.gpa || '-'}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setAppointmentForm({
                            ...appointmentForm,
                            student_id: s.id,
                            student_name: `${s.firstName} ${s.lastName}`,
                          });
                          setShowAppointmentModal(true);
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        <Calendar size={14} /> Schedule
                      </button>
                      <button
                        onClick={() => router.push(`/students/${s.id}`)}
                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <StickyNote size={14} /> Info
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </>
        ) : tab === 'Schedule' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">My Schedule</h2>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                <Plus size={16} /> New Appointment
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-48 text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <select
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
              >
                <option value="All">All Status</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="No-Show">No-Show</option>
              </select>
              <select
                value={scheduleDateFilter}
                onChange={(e) => setScheduleDateFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Past">Past</option>
                <option value="Future">Future</option>
              </select>
              <button
                onClick={() => {
                  setScheduleSearchQuery('');
                  setScheduleStatusFilter('All');
                  setScheduleDateFilter('All');
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X size={14} /> Clear Filters
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const filteredSchedules = schedules.filter((schedule: Schedule) => {
                  const matchesSearch = schedule.student_name.toLowerCase().includes(scheduleSearchQuery.toLowerCase()) ||
                    (schedule as any).student_id?.toString().includes(scheduleSearchQuery);
                  
                  const matchesStatus = scheduleStatusFilter === 'All' || schedule.status === scheduleStatusFilter;
                  
                  const scheduleDate = new Date(schedule.date);
                  scheduleDate.setHours(0, 0, 0, 0);
                  
                  let matchesDate = true;
                  if (scheduleDateFilter === 'Today') {
                    matchesDate = scheduleDate.getTime() === today.getTime();
                  } else if (scheduleDateFilter === 'This Week') {
                    const weekFromNow = new Date(today);
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    matchesDate = scheduleDate >= today && scheduleDate <= weekFromNow;
                  } else if (scheduleDateFilter === 'This Month') {
                    const monthFromNow = new Date(today);
                    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
                    matchesDate = scheduleDate >= today && scheduleDate <= monthFromNow;
                  } else if (scheduleDateFilter === 'Past') {
                    matchesDate = scheduleDate < today;
                  } else if (scheduleDateFilter === 'Future') {
                    matchesDate = scheduleDate > today;
                  }
                  
                  return matchesSearch && matchesStatus && matchesDate;
                });
                
                const sortedSchedules = filteredSchedules.sort((a: Schedule, b: Schedule) => 
                  new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()
                );
                
                const todaySchedules = sortedSchedules.filter((schedule: Schedule) => {
                  const scheduleDate = new Date(schedule.date);
                  scheduleDate.setHours(0, 0, 0, 0);
                  return scheduleDate.getTime() === today.getTime();
                });
                
                const otherSchedules = sortedSchedules.filter((schedule: Schedule) => {
                  const scheduleDate = new Date(schedule.date);
                  scheduleDate.setHours(0, 0, 0, 0);
                  return scheduleDate.getTime() !== today.getTime();
                });
                
                if (sortedSchedules.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-500">No appointments found.</p>
                    </div>
                  );
                }
                
                return (
                  <>
                    {todaySchedules.length > 0 && (
                      <>
                        <div className="mt-6">
                          <h3 className="mb-4 text-base font-semibold text-gray-900">Today's Schedule</h3>
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {todaySchedules.map((schedule: Schedule) => (
                              <div key={schedule._id} className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                                      <Calendar size={16} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{schedule.student_name}</p>
                                      <p className="text-xs text-gray-500">{toDisplayType(schedule.type)}</p>
                                    </div>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                    schedule.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    schedule.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    schedule.status === 'Rescheduled' ? 'bg-amber-100 text-amber-700' :
                                    schedule.status === 'No-Show' ? 'bg-gray-100 text-gray-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {schedule.status}
                                  </span>
                                </div>
                                <div className="mt-4 space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Date:</span>
                                    <span className="text-gray-700">{new Date(schedule.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Time:</span>
                                    <span className="text-gray-700">{schedule.time}</span>
                                  </div>
                                  {(schedule as any).intervention_id && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Intervention ID:</span>
                                      <span className="text-gray-700 font-mono text-xs">{(schedule as any).intervention_id}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  {schedule.status === 'Scheduled' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedSchedule(schedule);
                                          setInterventionForm({
                                            meeting_details: '',
                                            intervention_type: toDisplayType(schedule.type),
                                            description: `Meeting for ${toDisplayType(schedule.type)}`,
                                            outcome: '',
                                          });
                                          setShowInterventionModal(true);
                                        }}
                                        className="flex-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
                                      >
                                        Start Intervention
                                      </button>
                                      <div className="relative">
                                        <select
                                          onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            if (newStatus) {
                                              try {
                                                await axios.patch(`${API_URL}/schedules/${schedule._id}/status`, { status: newStatus });
                                                const updatedSchedules = await fetchSchedules(user?.email);
                                                setSchedules(updatedSchedules);
                                              } catch (error) {
                                                console.error('Error updating schedule status:', error);
                                                alert('Failed to update schedule status');
                                              }
                                            }
                                          }}
                                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none"
                                          defaultValue=""
                                        >
                                          <option value="" disabled>Change Status</option>
                                          <option value="Rescheduled">Reschedule</option>
                                          <option value="Cancelled">Cancel</option>
                                          <option value="No-Show">No-Show</option>
                                        </select>
                                      </div>
                                    </>
                                  )}
                                  <button
                                    onClick={() => openEditModal(schedule)}
                                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSchedule(schedule._id)}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                {schedule.notes && (
                                  <div className="mt-4">
                                    <span className="text-xs font-medium text-gray-500">Notes:</span>
                                    <div className="mt-1 rounded-lg bg-white p-3">
                                      <p className="text-sm text-gray-600">{schedule.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {otherSchedules.length > 0 && (
                      <>
                        <div className="mt-6">
                          <h3 className="mb-4 text-base font-semibold text-gray-900">All Schedules</h3>
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {otherSchedules.map((schedule: Schedule) => (
                              <div key={schedule._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                                      <Calendar size={16} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{schedule.student_name}</p>
                                      <p className="text-xs text-gray-500">{toDisplayType(schedule.type)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                      schedule.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                      schedule.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                      schedule.status === 'Rescheduled' ? 'bg-amber-100 text-amber-700' :
                                      schedule.status === 'No-Show' ? 'bg-gray-100 text-gray-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {schedule.status}
                                    </span>
                                    {schedule.status === 'Scheduled' && (
                                      <div className="relative">
                                        <select
                                          onChange={async (e) => {
                                            const newStatus = e.target.value;
                                            if (newStatus) {
                                              try {
                                                await axios.patch(`${API_URL}/schedules/${schedule._id}/status`, { status: newStatus });
                                                const updatedSchedules = await fetchSchedules(user?.email);
                                                setSchedules(updatedSchedules);
                                              } catch (error) {
                                                console.error('Error updating schedule status:', error);
                                                alert('Failed to update schedule status');
                                              }
                                            }
                                          }}
                                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none"
                                          defaultValue=""
                                        >
                                          <option value="" disabled>Change</option>
                                          <option value="Rescheduled">Reschedule</option>
                                          <option value="Cancelled">Cancel</option>
                                          <option value="No-Show">No-Show</option>
                                        </select>
                                      </div>
                                    )}
                                    <button
                                      onClick={() => openEditModal(schedule)}
                                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSchedule(schedule._id)}
                                      className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-4 space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Date:</span>
                                    <span className="text-gray-700">{new Date(schedule.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Time:</span>
                                    <span className="text-gray-700">{schedule.time}</span>
                                  </div>
                                  {(schedule as any).intervention_id && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Intervention ID:</span>
                                      <span className="text-gray-700 font-mono text-xs">{(schedule as any).intervention_id}</span>
                                    </div>
                                  )}
                                </div>
                                {schedule.notes && (
                                  <div className="mt-4">
                                    <span className="text-xs font-medium text-gray-500">Notes:</span>
                                    <div className="mt-1 rounded-lg bg-white p-3">
                                      <p className="text-sm text-gray-600">{schedule.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        ) : tab === 'Interventions' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Interventions</h2>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  value={interventionSearchQuery}
                  onChange={(e) => setInterventionSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-48 text-sm outline-none placeholder:text-gray-400"
                />
                {interventionSearchQuery && (
                  <button
                    onClick={() => setInterventionSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={interventionStatusFilter}
                onChange={(e) => setInterventionStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => {
                  setInterventionSearchQuery('');
                  setInterventionStatusFilter('All');
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X size={14} /> Clear
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(() => {
                const filteredInterventions = interventions.filter((intervention: Intervention) => {
                  const studentName = `${(intervention.student_id as any)?.first_name || ''} ${(intervention.student_id as any)?.last_name || ''}`.toLowerCase();
                  const studentId = (intervention.student_id as any)?.student_id?.toString() || '';
                  const matchesSearch = studentName.includes(interventionSearchQuery.toLowerCase()) ||
                    studentId.includes(interventionSearchQuery);
                  const matchesStatus = interventionStatusFilter === 'All' || intervention.status === interventionStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                // Group by intervention type
                const groupedInterventions = filteredInterventions.reduce((acc: Record<string, Intervention[]>, intervention: Intervention) => {
                  const type = toDisplayType(intervention.intervention_type) || 'Other';
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(intervention);
                  return acc;
                }, {});

                if (filteredInterventions.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                      <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-500">No interventions found.</p>
                    </div>
                  );
                }

                return Object.entries(groupedInterventions).map(([type, typeInterventions]) => (
                  <div key={type} className="mt-6">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">{type}</h3>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {typeInterventions.map((intervention: Intervention) => (
                        <div key={intervention._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                <AlertTriangle size={16} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{toDisplayType(intervention.intervention_type)}</p>
                                <p className="text-xs text-gray-500">
                                  {(intervention.student_id as any)?.first_name} {(intervention.student_id as any)?.last_name}
                                </p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              intervention.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              intervention.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                              intervention.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {intervention.status}
                            </span>
                          </div>
                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Start Date:</span>
                              <span className="text-gray-700">{new Date(intervention.start_date).toLocaleDateString()}</span>
                            </div>
                            {intervention.end_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">End Date:</span>
                                <span className="text-gray-700">{new Date(intervention.end_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {(intervention as any).intervention_id && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Intervention ID:</span>
                                <span className="text-gray-700 font-mono text-xs">{(intervention as any).intervention_id}</span>
                              </div>
                            )}
                          </div>
                          {intervention.description && (
                            <div className="mt-4 rounded-lg bg-white p-3">
                              <p className="text-xs text-gray-500 mb-1">Notes:</p>
                              <p className="text-sm text-gray-700">{intervention.description}</p>
                            </div>
                          )}
                          {(intervention as any).meeting_details && (
                            <div className="mt-4 rounded-lg bg-green-50 p-3">
                              <p className="text-xs text-gray-500 mb-1">Meeting Details:</p>
                              <p className="text-sm text-gray-700">{(intervention as any).meeting_details}</p>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setTaskForm({
                                title: '',
                                description: '',
                                student_id: intervention.student_id as string || '',
                                assigned_to: '',
                                intervention_id: (intervention as any).intervention_id || '',
                                due_date: '',
                                priority: 'Medium',
                                status: 'Pending',
                              });
                              setEditingTask(null);
                              setShowTaskModal(true);
                            }}
                            className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-600"
                          >
                            Add Task
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        ) : tab === 'Tasks' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Tasks</h2>
              <button
                onClick={() => openTaskModal()}
                className="flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <StickyNote size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No tasks assigned yet.</p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {tasks.map((task: Task) => (
                    <div key={task._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                            <StickyNote size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">
                              {(task.student_id as any)?.first_name} {(task.student_id as any)?.last_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.status}
                          </span>
                          <button
                            onClick={async () => {
                              const statuses = ['Pending', 'In Progress', 'Completed'];
                              const currentIndex = statuses.indexOf(task.status);
                              const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                              try {
                                await updateTask(task._id, { status: nextStatus as any });
                                const updatedTasks = await fetchTasks();
                                setTasks(updatedTasks);
                              } catch (err) {
                                console.error(err);
                                alert('Failed to update task status');
                              }
                            }}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                            title="Change Status"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => openTaskModal(task)}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Priority:</span>
                          <span className={`font-medium ${
                            task.priority === 'High' ? 'text-red-600' :
                            task.priority === 'Medium' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.due_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Due Date:</span>
                            <span className="text-gray-700">{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <div className="mt-4 rounded-lg bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">Description:</p>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : tab === 'Reports' ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Reports</h2>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                <Plus size={16} /> Generate Report
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by title, type, or student..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm"
                />
                {reportSearchQuery && (
                  <button
                    onClick={() => setReportSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="All">All Types</option>
                <option value="Attendance">Attendance</option>
                <option value="Academic">Academic</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Risk">Risk Assessment</option>
                <option value="Intervention">Intervention</option>
              </select>
              {(reportSearchQuery || reportTypeFilter !== 'All') && (
                <button
                  onClick={() => {
                    setReportSearchQuery('');
                    setReportTypeFilter('All');
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {filteredReports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    {reports.length === 0 ? 'No reports generated yet.' : 'No reports match your search.'}
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredReports.map((report: Report) => (
                    <div key={report._id} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{report.title}</p>
                            <p className="text-xs text-gray-500">{report.report_type}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          report.status === 'Generated' ? 'bg-green-100 text-green-700' :
                          report.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-700">{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        {(report.student_id as any) && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Student:</span>
                            <span className="text-gray-700">
                              {(report.student_id as any)?.first_name} {(report.student_id as any)?.last_name}
                            </span>
                          </div>
                        )}
                      </div>
                      {report.description && (
                        <div className="mt-4 rounded-lg bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">Description:</p>
                          <p className="text-sm text-gray-700">{report.description}</p>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleDownloadReport(report._id, report.title)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <Download size={14} /> Download CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-sm text-gray-500">This section is under development.</p>
          </div>
        )}

        {showAppointmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">New Schedule</h2>
                <button onClick={() => setShowAppointmentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleNewSchedule} className="space-y-4">
                <div className="relative">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Student</label>
                  <div className="relative">
                    <input
                      required
                      value={appointmentForm.student_name}
                      onChange={(e) => {
                        setAppointmentForm({ ...appointmentForm, student_name: e.target.value });
                        setStudentSearchQuery(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search and select student"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {showStudentDropdown && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {filteredStudentsForDropdown.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No students found</div>
                        ) : (
                          filteredStudentsForDropdown.map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                setAppointmentForm({
                                  ...appointmentForm,
                                  student_id: student.id,
                                  student_name: `${student.firstName} ${student.lastName}`,
                                });
                                setStudentSearchQuery('');
                                setShowStudentDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <div className="font-medium">{student.firstName} {student.lastName}</div>
                              <div className="text-xs text-gray-500">{student.grade} - {student.student_id}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
                    <input
                      required
                      type="date"
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
                    <input
                      required
                      type="time"
                      value={appointmentForm.time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
                  <select
                    required
                    value={appointmentForm.type}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="Mentoring">Mentoring</option>
                    <option value="Peer Tutoring">Peer Tutoring</option>
                    <option value="Counseling / Coaching">Counseling / Coaching</option>
                    <option value="Parent Conference">Parent Conference</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Intervention ID (Optional)</label>
                  <input
                    type="text"
                    value={appointmentForm.intervention_id || ''}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, intervention_id: e.target.value })}
                    placeholder="e.g., M202600001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    placeholder="Add any notes..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAppointmentModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingAppointment}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {addingAppointment ? 'Creating...' : 'Create Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showInterventionModal && selectedSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Complete Meeting & Add Intervention</h2>
                <button onClick={() => setShowInterventionModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4 rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">{selectedSchedule.student_name}</p>
                <p className="text-xs text-gray-500">{selectedSchedule.type} - {new Date(selectedSchedule.date).toLocaleDateString()} at {selectedSchedule.time}</p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await axios.post(`${API_URL}/schedules/${selectedSchedule._id}/complete-with-intervention`, interventionForm);
                  const updatedSchedules = await fetchSchedules(user?.email);
                  setSchedules(updatedSchedules);
                  setShowInterventionModal(false);
                  setSelectedSchedule(null);
                } catch (error) {
                  console.error('Error creating intervention:', error);
                  alert('Failed to create intervention');
                }
              }} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Meeting Details</label>
                  <textarea
                    value={interventionForm.meeting_details}
                    onChange={(e) => setInterventionForm({ ...interventionForm, meeting_details: e.target.value })}
                    placeholder="Describe what happened during the meeting..."
                    rows={4}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Intervention Type</label>
                  <select
                    value={interventionForm.intervention_type}
                    onChange={(e) => setInterventionForm({ ...interventionForm, intervention_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="Counseling / Coaching">Counseling / Coaching</option>
                    <option value="Academic">Academic</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Parent Conference">Parent Conference</option>
                    <option value="Mentoring">Mentoring</option>
                    <option value="Peer Tutoring">Peer Tutoring</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={interventionForm.description}
                    onChange={(e) => setInterventionForm({ ...interventionForm, description: e.target.value })}
                    placeholder="Brief description of the intervention..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Outcome</label>
                  <input
                    type="text"
                    value={interventionForm.outcome}
                    onChange={(e) => setInterventionForm({ ...interventionForm, outcome: e.target.value })}
                    placeholder="e.g., Student showed improvement"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInterventionModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await axios.post(`${API_URL}/schedules/${selectedSchedule._id}/complete-with-intervention`, {
                          ...interventionForm,
                          completeOnly: false,
                        });
                        const updatedSchedules = await fetchSchedules(user?.email);
                        setSchedules(updatedSchedules);
                        setShowInterventionModal(false);
                        setSelectedSchedule(null);
                      } catch (error) {
                        console.error('Error adding notes:', error);
                        alert('Failed to add notes');
                      }
                    }}
                    className="rounded-lg border border-green-700 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
                  >
                    Add Notes
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await axios.post(`${API_URL}/schedules/${selectedSchedule._id}/complete-with-intervention`, {
                          ...interventionForm,
                          completeOnly: true,
                        });
                        const updatedSchedules = await fetchSchedules(user?.email);
                        setSchedules(updatedSchedules);
                        setShowInterventionModal(false);
                        setSelectedSchedule(null);
                      } catch (error) {
                        console.error('Error completing intervention:', error);
                        alert('Failed to complete intervention');
                      }
                    }}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Complete
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{editingTask ? 'Edit Task' : 'New Task'}</h2>
                <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleNewTask} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                  <input
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Task title"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Student (Optional)</label>
                  <div className="relative">
                    <input
                      value={taskForm.student_id ? caseload.find(s => s.id === taskForm.student_id)?.firstName + ' ' + caseload.find(s => s.id === taskForm.student_id)?.lastName || '' : ''}
                      onChange={(e) => {
                        const student = caseload.find(s => `${s.firstName} ${s.lastName}`.toLowerCase() === e.target.value.toLowerCase());
                        if (student) {
                          setTaskForm({ ...taskForm, student_id: student.id });
                        }
                      }}
                      placeholder="Search and select student"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Intervention ID (Optional)</label>
                  <input
                    type="text"
                    value={taskForm.intervention_id}
                    onChange={(e) => setTaskForm({ ...taskForm, intervention_id: e.target.value })}
                    placeholder="e.g., C202600001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as 'Pending' | 'In Progress' | 'Completed' })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Edit Schedule</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSchedule} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Student</label>
                  <input
                    disabled
                    value={appointmentForm.student_name}
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
                    <input
                      required
                      type="date"
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
                    <input
                      required
                      type="time"
                      value={appointmentForm.time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
                  <select
                    required
                    value={appointmentForm.type}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="Mentoring">Mentoring</option>
                    <option value="Peer Tutoring">Peer Tutoring</option>
                    <option value="Counseling / Coaching">Counseling / Coaching</option>
                    <option value="Parent Conference">Parent Conference</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Intervention ID (Optional)</label>
                  <input
                    type="text"
                    value={appointmentForm.intervention_id || ''}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, intervention_id: e.target.value })}
                    placeholder="e.g., M202600001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    placeholder="Add any notes..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingAppointment}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {addingAppointment ? 'Updating...' : 'Update Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Generate Report</h2>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Report Type</label>
                  <select
                    required
                    value={reportForm.report_type}
                    onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="Attendance">Attendance Report</option>
                    <option value="Academic">Academic Report</option>
                    <option value="Behavioral">Behavioral Report</option>
                    <option value="Risk">Risk Assessment Report</option>
                    <option value="Intervention">Intervention Report</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Student</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search by name or ID..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {showStudentDropdown && studentSearchQuery && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {reportFilteredStudents.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No students found</div>
                        ) : (
                          reportFilteredStudents.map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleSelectReportStudent(student.id, `${student.firstName} ${student.lastName}`)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                            >
                              <div className="font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-gray-500">ID: {student.student_id}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingReport}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {generatingReport ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
