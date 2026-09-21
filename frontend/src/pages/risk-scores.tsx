import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Users, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import RiskScoreFilterComponent from '@/components/ui/RiskScoreFilter';
import { fetchRiskScores, RiskScoreData, RiskScoreFilter } from '@/lib/api';

export default function RiskScoresPage() {
  const [riskScores, setRiskScores] = useState<RiskScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RiskScoreFilter>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRiskScores();
  }, [filters]);

  const loadRiskScores = async () => {
    setLoading(true);
    try {
      const result = await fetchRiskScores(filters);
      setRiskScores(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading risk scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: RiskScoreFilter) => {
    setFilters(newFilters);
  };

  const handleClearFilter = () => {
    setFilters({});
  };

  const getRiskCount = (level: string) => {
    return riskScores.filter(r => r.risk_level === level).length;
  };

  const averageRiskScore = riskScores.length > 0
    ? Math.round(riskScores.reduce((sum, r) => sum + r.risk_score, 0) / riskScores.length)
    : 0;

  return (
    <>
      <Head>
        <title>Risk Scores - AlertED</title>
      </Head>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Risk Scores</h1>
            <p className="text-sm text-gray-500">Student risk assessment by term and date</p>
          </div>
          <RiskScoreFilterComponent
            onFilterChange={handleFilterChange}
            onClear={handleClearFilter}
            currentFilters={filters}
          />
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">Total Students</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-sm text-gray-600">High Risk</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{getRiskCount('High')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <span className="text-sm text-gray-600">Average Risk Score</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-600">{averageRiskScore}%</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-green-500" />
              <span className="text-sm text-gray-600">Medium Risk</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-yellow-600">{getRiskCount('Medium')}</p>
          </div>
        </div>

        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.term && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                Term: {filters.term}
                <button onClick={() => setFilters({ ...filters, term: undefined })} className="ml-1 hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
            {filters.year && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                Year: {filters.year}
                <button onClick={() => setFilters({ ...filters, year: undefined })} className="ml-1 hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
            {filters.risk_level && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                Risk Level: {filters.risk_level}
                <button onClick={() => setFilters({ ...filters, risk_level: undefined })} className="ml-1 hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
            {(filters.start_date || filters.end_date) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                Date Range
                <button onClick={() => setFilters({ ...filters, start_date: undefined, end_date: undefined })} className="ml-1 hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Risk Scores Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Term/Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Risk Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Academic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Attendance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading risk scores...
                    </td>
                  </tr>
                ) : riskScores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      No risk scores found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  riskScores.map((score) => (
                    <tr key={score._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {score.student_id.first_name} {score.student_id.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{score.student_id.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-900">{score.term || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{score.year || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={score.risk_level} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={score.risk_score} className="w-24" />
                          <span className="text-sm font-semibold text-gray-900">{score.risk_score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-900">{score.academic_factor}%</p>
                          {score.detailed_factors && (
                            <p className="text-xs text-gray-500">
                              GPA: {score.detailed_factors.gpa.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-900">{score.attendance_factor}%</p>
                          {score.detailed_factors && (
                            <p className="text-xs text-gray-500">
                              Rate: {score.detailed_factors.attendanceRate}%
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">
                          {new Date(score.prediction_date).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}