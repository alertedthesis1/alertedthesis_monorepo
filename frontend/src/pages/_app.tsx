import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import { AuthProvider, useAuth, Role } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import AppHeader from '@/components/shared/AppHeader';
import NotificationContainer from '@/components/ui/NotificationContainer';

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
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    );
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
    <NotificationProvider>
      <AuthProvider>
        <Guard>
          <main className="min-h-screen bg-white">
            <Component {...pageProps} />
          </main>
          <NotificationContainer />
        </Guard>
      </AuthProvider>
    </NotificationProvider>
  );
}
