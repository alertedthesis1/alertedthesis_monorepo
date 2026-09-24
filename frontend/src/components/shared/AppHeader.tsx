import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ShieldCheck, Search, BarChart3, LogOut, LayoutDashboard, Users, Settings, Bell, X, AlertTriangle, Menu } from 'lucide-react';
import { useAuth, Role } from '@/context/AuthContext';
import { fetchFacultyNotifications, fetchUnreadNotificationCount, markNotificationAsRead, FacultyNotification } from '@/lib/api';

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
  const notificationRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<FacultyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (!user) return null;
  const nav = NAV_BY_ROLE[user.role];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Fetch notifications and unread count
  useEffect(() => {
    if (user?.email) {
      fetchFacultyNotifications(user.email).then(setNotifications).catch(console.error);
      fetchUnreadNotificationCount(user.email).then(setUnreadCount).catch(console.error);
    }
  }, [user?.email]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleNotificationClick = async (notification: FacultyNotification) => {
    // Mark as read
    if (!notification.read && user?.email) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to the link if provided
    if (notification.link) {
      router.push(notification.link);
      setShowNotifications(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'consecutive_absence':
      case 'attendance_alert':
        return <AlertTriangle size={14} className="text-red-600" />;
      case 'risk_alert':
        return <AlertTriangle size={14} className="text-orange-600" />;
      case 'academic_alert':
        return <AlertTriangle size={14} className="text-blue-600" />;
      case 'behavioral_alert':
        return <AlertTriangle size={14} className="text-purple-600" />;
      case 'intervention_alert':
        return <AlertTriangle size={14} className="text-green-600" />;
      default:
        return <AlertTriangle size={14} className="text-gray-600" />;
    }
  };

  const getNotificationBgColor = (priority: string, read: boolean) => {
    if (read) return 'bg-white';
    switch (priority) {
      case 'high':
        return 'bg-red-50';
      case 'medium':
        return 'bg-amber-50';
      case 'low':
        return 'bg-blue-50';
      default:
        return 'bg-white';
    }
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
            <span className="hidden sm:block text-[11px] text-gray-500">Early Warning and Prevention System for Students at Risk</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
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

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`border-b border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          getNotificationBgColor(notification.priority, notification.read)
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-1 ${
                            notification.read ? 'bg-gray-100' : 
                            notification.priority === 'high' ? 'bg-red-100' : 
                            notification.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.student_name && (
                              <p className="mt-1 text-xs text-gray-500">
                                Student: {notification.student_name}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-gray-400">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden rounded-lg border border-gray-200 p-2 hover:bg-gray-100"
            aria-label="Menu"
          >
            <Menu size={20} className="text-gray-600" />
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-[11px] capitalize text-gray-500">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3">
          <nav className="flex flex-col gap-2">
            {nav.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-[11px] capitalize text-gray-500">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export { LayoutDashboard, Users, Settings, BarChart3 };
