import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ShieldCheck, UserCog, HeartHandshake, Eye, EyeOff } from 'lucide-react';
import { useAuth, Role, DEMO_ACCOUNTS } from '@/context/AuthContext';

const ROLES: { key: Role; label: string; icon: typeof UserCog; desc: string }[] = [
  { key: 'admin', label: 'Admin', icon: UserCog, desc: 'System & user management' },
  { key: 'counselor', label: 'Counselor', icon: HeartHandshake, desc: 'Manage caseload' },
  { key: 'faculty', label: 'Faculty', icon: UserCog, desc: 'Student management' },
];

const LANDING: Record<Role, string> = {
  admin: '/admin',
  counselor: '/counselor',
  faculty: '/faculty',
};

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password, role);
    if (res.ok) {
      router.push(LANDING[role]);
    } else {
      setError(res.error || 'Login failed.');
    }
  };

  const fillDemo = () => {
    const demo = DEMO_ACCOUNTS.find((d) => d.role === role);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
      setError('');
    }
  };

  return (
    <>
      <Head>
        <title>Sign in - AlertED</title>
      </Head>
      <div className="flex min-h-screen">
        <div className="hidden w-1/2 flex-col justify-between bg-green-800 p-12 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck size={24} />
            </span>
            <div>
              <p className="text-xl font-bold">AlertED</p>
              <p className="text-xs text-green-100">Predict. Prevent. Protect Students&apos; Future.</p>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Early warning system for student dropout prevention
            </h1>
            <p className="mt-4 max-w-md text-green-100">
              AlertED uses machine learning over attendance, academic performance, and behavior
              reports to generate risk levels for counselors and faculty at St. Joseph College.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-green-50">
              <li className="flex items-center gap-2">• Real-time risk tracking with color-coded alerts</li>
              <li className="flex items-center gap-2">• Visual insights on trends and model accuracy</li>
              <li className="flex items-center gap-2">• ML-generated dropout risk scores</li>
            </ul>
          </div>
          <p className="text-xs text-green-200">© {new Date().getFullYear()} St. Joseph College</p>
        </div>

        <div className="flex w-full items-center justify-center bg-gray-50 p-6 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-700 text-white">
                  <ShieldCheck size={20} />
                </span>
                <p className="text-xl font-bold text-gray-900">AlertED</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">Sign in to your portal</h2>
            <p className="mt-1 text-sm text-gray-500">Select your role and enter your credentials.</p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setRole(r.key);
                      setError('');
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ${
                      active
                        ? 'border-green-700 bg-green-50 text-green-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-semibold">{r.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@sjc.edu.ph"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Sign in as {ROLES.find((r) => r.key === role)?.label}
              </button>
            </form>

            <button
              onClick={fillDemo}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Use demo {role} credentials
            </button>

            {/* <div className="mt-6 rounded-lg bg-gray-100 p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-600">Demo accounts</p>
              <p className="mt-1">admin@sjc.edu.ph / admin123</p>
              <p>counselor@sjc.edu.ph / counselor123</p>
              <p>faculty@sjc.edu.ph / faculty123</p>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
}
