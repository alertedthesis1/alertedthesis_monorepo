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
const TOKEN_EXPIRY_KEY = 'alerted_token_expiry';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Set up axios interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear session
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const token = sessionStorage.getItem(TOKEN_KEY);
      const tokenExpiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

      if (raw && token && tokenExpiry) {
        // Check if token has expired
        const expiryTime = parseInt(tokenExpiry, 10);
        const now = Date.now();

        if (now > expiryTime) {
          // Token expired, clear session
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
          setUser(null);
        } else {
          // Token still valid
          setUser(JSON.parse(raw));
          // Set default auth header for all requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Set up auto-logout when token expires
          const timeUntilExpiry = expiryTime - now;
          timeoutId = setTimeout(() => {
            logout();
          }, timeUntilExpiry);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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

      // Set token expiry to 30 minutes from now
      const tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes in milliseconds

      setUser(authUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, tokenExpiry.toString());
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Set up auto-logout when token expires
      setTimeout(() => {
        logout();
      }, 30 * 60 * 1000);

      return { ok: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      return { ok: false, error: errorMessage };
    }
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
