import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  icon: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  children?: React.ReactNode;
}

export default function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  iconColor = 'text-gray-400',
  valueColor = 'text-gray-900',
  children,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <Icon size={18} className={iconColor} />
      </div>
      <p className={`mt-3 text-3xl font-bold ${valueColor}`}>{value}</p>
      {caption && <p className="mt-1 text-xs text-gray-500">{caption}</p>}
      {children}
    </div>
  );
}
