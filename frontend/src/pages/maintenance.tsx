import React from 'react';
import Head from 'next/head';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';

interface MaintenancePageProps {
  type?: 'maintenance' | 'error' | 'loading';
  message?: string;
}

export default function MaintenancePage({ type = 'maintenance', message }: MaintenancePageProps) {
  const getContent = () => {
    switch (type) {
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'System Error',
          subtitle: 'Something went wrong',
          description: message || 'We encountered an unexpected error. Our team has been notified and is working to resolve this issue.',
          actionText: 'Try Again',
        };
      case 'loading':
        return {
          icon: RefreshCw,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Loading...',
          subtitle: 'Please wait',
          description: 'We are preparing your dashboard. This should only take a moment.',
          actionText: null,
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: 'System Maintenance',
          subtitle: 'We\'ll be back soon',
          description: message || 'AlertED is currently undergoing scheduled maintenance to improve your experience. We apologize for any inconvenience.',
          actionText: 'Refresh Page',
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>{content.title} - AlertED</title>
        <meta name="description" content={content.description} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="max-w-md w-full">
          <div className={`rounded-2xl border ${content.borderColor} ${content.bgColor} p-8 shadow-lg`}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full ${content.bgColor} border ${content.borderColor} flex items-center justify-center`}>
                {type === 'loading' ? (
                  <Icon size={40} className={content.iconColor + ' animate-spin'} />
                ) : (
                  <Icon size={40} className={content.iconColor} />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{content.title}</h1>
              <p className="text-lg font-medium text-slate-600 mb-4">{content.subtitle}</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">{content.description}</p>

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img src="/images/alerted-logo.png" alt="AlertED Logo" className="h-12 w-auto" />
              </div>

              {/* Action Button */}
              {content.actionText && (
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-green-800 hover:bg-green-900 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <RefreshCw size={18} className="mr-2" />
                  {content.actionText}
                </button>
              )}

              {/* Support Info */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-400">
                  Need help? Contact the <span className="font-medium text-slate-600">St. Joseph College Guidance Office</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} St. Joseph College – Olongapo Inc.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
