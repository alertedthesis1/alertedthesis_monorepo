import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ShieldCheck, Search, BarChart3, LogOut, LayoutDashboard, Users, Settings } from 'lucide-react';
import { useAuth, Role } from '@/context/AuthContext';

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: '/admin', label: 'User Management' },
  ],
  faculty: [
    { href: '/faculty', label: 'Dashboard' },
    { href: '/students', label: 'Students' },
  ],
  counselor: [
    { href: '/counselor', label: 'My Caseload' },
    { href: '/analytics', label: 'Analytics' },
  ],
};

export default function AppHeader({ showSearch = true }: { showSearch?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;
  const nav = NAV_BY_ROLE[user.role];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={nav[0].href} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-700 text-white">
            <ShieldCheck size={20} />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold text-gray-900">AlertED</span>
            <span className="block text-[11px] text-gray-500">Predict. Prevent. Protect Students&apos; Future.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 lg:flex">
              <Search size={16} className="text-gray-400" />
              <input
                placeholder="Search students..."
                className="w-40 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-[11px] capitalize text-gray-500">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export { LayoutDashboard, Users, Settings, BarChart3 };
