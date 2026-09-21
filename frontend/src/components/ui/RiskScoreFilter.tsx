import React, { useState } from 'react';
import { Calendar, Filter, X } from 'lucide-react';
import { RiskScoreFilter } from '@/lib/api';

interface RiskScoreFilterProps {
  onFilterChange: (filters: RiskScoreFilter) => void;
  onClear: () => void;
  currentFilters: RiskScoreFilter;
}

export default function RiskScoreFilterComponent({ onFilterChange, onClear, currentFilters }: RiskScoreFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<RiskScoreFilter>(currentFilters);

  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const handleApplyFilter = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    const clearedFilters: RiskScoreFilter = {};
    setFilters(clearedFilters);
    onClear();
    setIsOpen(false);
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          hasActiveFilters
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter size={16} />
        {hasActiveFilters ? 'Filters Active' : 'Filter Risk Scores'}
        {hasActiveFilters && <X size={14} onClick={(e) => { e.stopPropagation(); handleClearFilter(); }} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filter Risk Scores</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Term Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Term</label>
              <select
                value={filters.term || ''}
                onChange={(e) => setFilters({ ...filters, term: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Terms</option>
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <select
                value={filters.year || ''}
                onChange={(e) => setFilters({ ...filters, year: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value || undefined })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value || undefined })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Risk Level</label>
              <select
                value={filters.risk_level || ''}
                onChange={(e) => setFilters({ ...filters, risk_level: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClearFilter}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleApplyFilter}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}