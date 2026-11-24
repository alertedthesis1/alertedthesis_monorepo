import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

export default function SkeletonLoader({ className = '', count = 1 }: SkeletonLoaderProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
        />
      ))}
    </>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-start justify-between">
        <SkeletonLoader className="h-4 w-24" />
        <SkeletonLoader className="h-6 w-6 rounded-full" />
      </div>
      <SkeletonLoader className="mt-3 h-8 w-16" />
      <SkeletonLoader className="mt-1 h-3 w-32" />
    </div>
  );
}

export function StudentRowSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <SkeletonLoader className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <SkeletonLoader className="h-4 w-32" />
            <SkeletonLoader className="h-3 w-24" />
            <SkeletonLoader className="h-3 w-20" />
          </div>
        </div>
        <SkeletonLoader className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <SkeletonLoader className="h-3 w-16 mb-2" />
          <SkeletonLoader className="h-2 w-full" />
        </div>
        <div>
          <SkeletonLoader className="h-3 w-16 mb-2" />
          <SkeletonLoader className="h-2 w-12" />
        </div>
        <div>
          <SkeletonLoader className="h-3 w-16 mb-2" />
          <SkeletonLoader className="h-2 w-12" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SkeletonLoader className="h-10 w-full rounded-lg" />
        <SkeletonLoader className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
