import React from 'react';
import { RiskLevel } from '@/types';

const STYLES: Record<RiskLevel, string> = {
  High: 'bg-red-600 text-white',
  Medium: 'bg-amber-400 text-amber-950',
  Low: 'bg-green-600 text-white',
};

export default function RiskBadge({
  level,
  label,
}: {
  level: RiskLevel;
  label?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STYLES[level]}`}>
      {label ?? `${level} Risk`}
    </span>
  );
}
