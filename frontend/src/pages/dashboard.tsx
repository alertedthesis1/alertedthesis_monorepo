import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Users,
  AlertTriangle,
  CalendarDays,
  StickyNote,
  Filter,
  ClipboardList,
  User,
  FileText,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import RiskBadge from '@/components/ui/RiskBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import EarlyWarningBadge from '@/components/ui/EarlyWarningBadge';
import { fetchDashboardStats, fetchStudents, fetchEarlyWarningBatchPredictions, fetchInsights, DashboardStats, StudentSummary, EarlyWarningPrediction } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [earlyWarnings, setEarlyWarnings] = useState<Record<string, EarlyWarningPrediction>>({});
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    let active = true;
    Promise.all([fetchDashboardStats(user?.email, selectedTerm, selectedYear), fetchStudents(user?.email, 1, 20, selectedTerm, selectedYear), fetchInsights()]).then(([s, list, insightsData]) => {
      if (!active) return;
      setStats(s);
      setStudents(list.data);
      setInsights(insightsData);
      
      // Fetch early warning predictions for high priority students
      const highPriorityIds = list.data.filter(s => s.riskLevel !== 'Low').map(s => s.id);
      if (highPriorityIds.length > 0) {
        fetchEarlyWarningBatchPredictions(highPriorityIds, selectedTerm, selectedYear).then(predictions => {
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
      
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user, selectedTerm, selectedYear]);

  const highPriority = students.filter((s) => s.riskLevel !== 'Low');

  return (
    <>
      <Head>
        <title>Dashboard - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user ? `, ${user.name.split(' ').slice(-1)[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-500">Real-time student risk monitoring overview</p>
        </div>

        {/* Term and Year Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
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

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={(stats?.totalStudents ?? 0).toLocaleString()} caption="Active enrollment" icon={Users}>
            <div className="mt-3 h-1 rounded-full bg-green-500/60" />
          </StatCard>
          <StatCard
            label="At Risk"
            value={stats?.atRisk ?? 0}
            caption={`${stats?.atRiskPercent ?? 0}% of total students`}
            icon={AlertTriangle}
            iconColor="text-red-500"
            valueColor="text-red-600"
          >
            <div className="mt-3 h-2 rounded-full bg-red-200" />
          </StatCard>
          <StatCard label="Interventions" value={stats?.interventions ?? 0} caption="This week" icon={CalendarDays} iconColor="text-green-600" />
          <StatCard
            label="Pending Tasks"
            value={stats?.tasks ?? 0}
            caption="Tasks awaiting completion"
            icon={StickyNote}
            iconColor="text-purple-600"
            valueColor="text-purple-600"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* High priority students */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h2 className="text-lg font-bold text-gray-900">High Priority Students</h2>
              </div>
              <p className="mb-4 text-sm text-gray-500">Students requiring immediate attention and intervention</p>

              <div className="space-y-4">
                {loading && <p className="text-sm text-gray-400">Loading students...</p>}
                {!loading && highPriority.length === 0 && (
                  <p className="text-sm text-gray-400">No high priority students.</p>
                )}
                {highPriority.map((s) => (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
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
                          <p className="text-xs text-gray-500">
                            {s.grade} - {s.section}
                          </p>
                          <p className="text-xs text-gray-400">Last active: {s.lastActive}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <RiskBadge level={s.riskLevel} />
                        {earlyWarnings[s.id] && (
                          <EarlyWarningBadge prediction={earlyWarnings[s.id]} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Risk Score</p>
                        <div className="mt-1 flex items-center gap-2">
                          <ProgressBar value={s.riskScore} className="flex-1" />
                          <span className="text-sm font-semibold text-gray-900">{s.riskScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Attendance</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{s.attendance}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">General Average</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{s.generalAverage}</p>
                      </div>
                    </div>

                    {s.keyConcerns.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs text-gray-500">Key Concerns:</p>
                        <div className="flex flex-wrap gap-2">
                          {s.keyConcerns.map((c) => (
                            <span key={c} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button className="rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800">
                        Schedule Meeting
                      </button>
                      <button
                        onClick={() => router.push(`/students/${s.id}`)}
                        className="rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-bold text-gray-900">Quick Actions</h3>
              <p className="mb-4 text-sm text-gray-500">Common tasks and interventions</p>
              <div className="space-y-2">
                {[
                  { icon: ClipboardList, label: 'Add Student Assessment' },
                  { icon: User, label: 'View Student Profiles' },
                  { icon: FileText, label: 'Generate Report' },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Icon size={16} className="text-gray-500" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-bold text-gray-900">Recent Insights</h3>
              <p className="mb-4 text-sm text-gray-500">AI-generated recommendations</p>
              <div className="space-y-3">
                {insights.length === 0 && <p className="text-sm text-gray-400">No insights available.</p>}
                {insights.map((i: any) => (
                  <div
                    key={i.title}
                    className={`rounded-lg border-l-4 p-3 ${
                      i.priority === 'high'
                        ? 'border-red-600 bg-red-50'
                        : i.priority === 'medium'
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-green-600 bg-green-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{i.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{i.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}