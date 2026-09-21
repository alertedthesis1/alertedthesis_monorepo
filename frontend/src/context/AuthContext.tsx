import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export type Role = 'admin' | 'counselor' | 'faculty';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  section?: string;
}

interface Credential {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'alerted_user';
const TOKEN_KEY = 'alerted_token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (raw && token) {
        setUser(JSON.parse(raw));
        // Set default auth header for all requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role: Role) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user: userData } = response.data;

      // Check if role matches
      if (userData.role !== role) {
        return { ok: false, error: `These credentials are not valid for the ${role} portal.` };
      }

      const authUser: AuthUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
      };

      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      localStorage.setItem(TOKEN_KEY, token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { ok: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      return { ok: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const DEMO_ACCOUNTS = [
  {
    email: 'admin@sjc.edu.ph',
    password: 'admin123',
    role: 'admin' as Role,
  },
  {
    email: 'counselor@sjc.edu.ph',
    password: 'counselor123',
    role: 'counselor' as Role,
  },
  {
    email: 'faculty@sjc.edu.ph',
    password: 'faculty123',
    role: 'faculty' as Role,
  },
];
