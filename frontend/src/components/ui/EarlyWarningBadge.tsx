import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { EarlyWarningPrediction } from '@/lib/api';

interface EarlyWarningBadgeProps {
  prediction: EarlyWarningPrediction;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function EarlyWarningBadge({ prediction, size = 'md', showDetails = false }: EarlyWarningBadgeProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Critical':
      case 'High':
        return <AlertTriangle size={size === 'sm' ? 12 : 16} />;
      case 'Medium':
        return <TrendingUp size={size === 'sm' ? 12 : 16} />;
      case 'Low':
        return <CheckCircle size={size === 'sm' ? 12 : 16} />;
      default:
        return <AlertTriangle size={size === 'sm' ? 12 : 16} />;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={`inline-flex items-center gap-1.5 rounded-full border ${getRiskColor(prediction.overall_risk_level)} ${sizeClasses[size]}`}>
        {getRiskIcon(prediction.overall_risk_level)}
        <span className="font-medium">{prediction.overall_risk_level}</span>
      </div>

      {showDetails && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Dropout Risk</p>
              <p className="text-sm font-semibold text-gray-900">{prediction.dropout_risk}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Academic Risk</p>
              <p className="text-sm font-semibold text-gray-900">{prediction.academic_failure_risk}%</p>
            </div>
          </div>

          {prediction.risk_factors.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-medium text-gray-700">Risk Factors</p>
              <div className="flex flex-wrap gap-1">
                {prediction.risk_factors.map((factor, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {prediction.recommended_actions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-700">Recommended Actions</p>
              <ul className="space-y-1">
                {prediction.recommended_actions.slice(0, 3).map((action, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="mt-0.5 text-green-600">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
