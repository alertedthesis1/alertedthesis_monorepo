import React from 'react';
import { LucideIcon } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  icon?: LucideIcon;
}

export default function LoadingSpinner({
  size = 'md',
  color = 'border-green-700',
  text,
  fullScreen = false,
  icon: Icon,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-b-2',
    lg: 'h-16 w-16 border-b-4',
  };

  const content = (
    <div className="flex flex-col items-center justify-center">
      {Icon ? (
        <Icon size={size === 'lg' ? 64 : size === 'md' ? 40 : 24} className={`${color.replace('border-', 'text-')} animate-spin`} />
      ) : (
        <div className={`animate-spin rounded-full ${sizeClasses[size]} ${color}`} />
      )}
      {text && (
        <p className="mt-4 text-sm text-gray-500 font-medium">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
