import React from 'react';

export default function ProgressBar({
  value,
  color = 'bg-green-700',
  track = 'bg-green-100',
  className = '',
}: {
  value: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track} ${className}`}>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
