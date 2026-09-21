import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Target,
  Users,
  TrendingUp,
  CalendarDays,
  ArrowLeft,
  BarChart3,
  AlertTriangle,
  StickyNote,
  Lightbulb,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import StatCard from '@/components/ui/StatCard';
import { fetchAnalytics, AnalyticsOverview, fetchDashboardStats, DashboardStats, fetchAnalyticsInsights, AnalyticsInsight } from '@/lib/api';

export default function Analytics() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAnalytics(), fetchDashboardStats(), fetchAnalyticsInsights()]).then(([d, stats, insightsData]) => {
      if (active) {
        setData(d);
        setDashboardStats(stats);
        setInsights(insightsData);
        setLoadingInsights(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    );
  }

  const analyticsStats = data.summary;
  const riskTrend = data.riskTrend;
  const riskDistribution = data.riskDistribution;
  const interventionEffectiveness = data.interventionEffectiveness;
  const attendancePattern = data.attendancePattern;

  return (
    <>
      <Head>
        <title>Analytics & Reports - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-green-700" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analytics &amp; Reports</h1>
              <p className="text-xs text-gray-500">Data-driven insights for student success</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Students" value={dashboardStats?.totalStudents ?? 0} caption="Active enrollment" icon={Users} iconColor="text-green-600" valueColor="text-green-600" />
          <StatCard label="At Risk" value={dashboardStats?.atRisk ?? 0} caption={`${dashboardStats?.atRiskPercent ?? 0}% of total students`} icon={AlertTriangle} iconColor="text-red-500" valueColor="text-red-600" />
          <StatCard label="Interventions" value={dashboardStats?.interventions ?? 0} caption="This week" icon={CalendarDays} iconColor="text-green-600" />
          <StatCard label="Pending Tasks" value={dashboardStats?.tasks ?? 0} caption="Tasks awaiting completion" icon={StickyNote} iconColor="text-purple-600" valueColor="text-purple-600" />
        </div>

        {/* AI Insights Section */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-green-700" />
            <h2 className="text-lg font-bold text-gray-900">AI-Powered Insights</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">Data-driven recommendations and alerts based on current analytics</p>

          {loadingInsights ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-green-700" />
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-gray-400">No insights available at this time.</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${
                    insight.type === 'alert'
                      ? 'border-red-200 bg-red-50'
                      : insight.type === 'success'
                      ? 'border-green-200 bg-green-50'
                      : insight.type === 'recommendation'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {insight.type === 'alert' && <AlertTriangle size={16} className="text-red-600" />}
                      {insight.type === 'success' && <CheckCircle size={16} className="text-green-600" />}
                      {insight.type === 'recommendation' && <Lightbulb size={16} className="text-blue-600" />}
                      {insight.type === 'trend' && <TrendingUp size={16} className="text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            insight.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : insight.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {insight.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{insight.description}</p>
                      {insight.actionable && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                            <Info size={12} /> Action Required
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-bold text-gray-900">Risk Trend Analysis</h2>
            <p className="mb-4 text-sm text-gray-500">Student risk levels over the academic year</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={riskTrend} stackOffset="none">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 1400]} />
                <Tooltip />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#16a34a" fill="#34d399" name="Low Risk" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#fbbf24" name="Medium Risk" />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#dc2626" fill="#f87171" name="High Risk" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> High Risk</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Medium Risk</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Low Risk</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-bold text-gray-900">Current Risk Distribution</h2>
            <p className="mb-4 text-sm text-gray-500">Student population by risk level</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.value}%`}>
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              {riskDistribution.map((d) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name} {d.value}%
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-bold text-gray-900">Intervention Effectiveness</h2>
            <p className="mb-4 text-sm text-gray-500">Success rates by intervention type</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={interventionEffectiveness}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" fill="#16a34a" radius={[4, 4, 0, 0]} name="Success rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-base font-bold text-gray-900">Attendance Pattern Analysis</h2>
            <p className="mb-4 text-sm text-gray-500">Daily attendance rates and dropout risk correlation</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={attendancePattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[70, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#16a34a" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
