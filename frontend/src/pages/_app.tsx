import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider, useAuth, Role } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { MaintenanceProvider, useMaintenance } from '@/context/MaintenanceContext';
import AppHeader from '@/components/shared/AppHeader';
import NotificationContainer from '@/components/ui/NotificationContainer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MaintenancePage from './maintenance';

const PUBLIC_ROUTES = ['/login', '/'];

const ROLE_ACCESS: Record<string, Role[]> = {
  '/faculty': ['faculty'],
  '/analytics': ['faculty', 'counselor'],
  '/counselor': ['counselor'],
  '/admin': ['admin'],
  '/students/[id]': ['faculty', 'counselor'],
};

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isMaintenanceMode, maintenanceState } = useMaintenance();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(router.pathname);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }
    if (user && router.pathname === '/login') {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else if (user.role === 'counselor') {
        router.replace('/counselor');
      } else {
        router.replace('/faculty');
      }
      return;
    }
    if (user) {
      const allowed = ROLE_ACCESS[router.pathname];
      if (allowed && !allowed.includes(user.role)) {
        if (user.role === 'admin') {
          router.replace('/admin');
        } else if (user.role === 'counselor') {
          router.replace('/counselor');
        } else {
          router.replace('/faculty');
        }
      }
    }
  }, [user, loading, router, isPublic]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <MaintenancePage type="error" />;
  }

  if (isMaintenanceMode) {
    return <MaintenancePage type={maintenanceState.type} message={maintenanceState.message} />;
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading AlertED..." />;
  }

  if (!user && !isPublic) return null;

  return (
    <>
      {user && !isPublic && <AppHeader showSearch={false} />}
      {children}
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <NotificationProvider>
        <MaintenanceProvider>
          <AuthProvider>
            <Guard>
              <main className="min-h-screen bg-white">
                <Component {...pageProps} />
              </main>
              <NotificationContainer />
            </Guard>
          </AuthProvider>
        </MaintenanceProvider>
      </NotificationProvider>
    </>
  );
}
