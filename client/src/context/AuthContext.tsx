import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, role: UserRole) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, User> = {
  TUTOR: { id: 'usr_tutor', name: 'Dr. Alan Turing', email: 'turing@campus.edu', role: 'TUTOR', department: 'Computer Science' },
  STUDENT_REP: { id: 'usr_srep', name: 'Alex Johnson (Rep)', email: 'alex.rep@campus.edu', role: 'STUDENT_REP', department: 'Information Technology' },
  EVENT_MANAGER: { id: 'usr_event', name: 'Sarah Jenkins', email: 'events@campus.edu', role: 'EVENT_MANAGER', department: 'Student Affairs' },
  SECRETARY: { id: 'usr_sec', name: 'Michael Scott', email: 'secretary@campus.edu', role: 'SECRETARY', department: 'Administrative Office' },
  HOD: { id: 'usr_hod', name: 'Prof. Minerva McGonagall', email: 'hod.cs@campus.edu', role: 'HOD', department: 'Computer Science' },
  COE: { id: 'usr_coe', name: 'Dr. Charles Xavier', email: 'coe@campus.edu', role: 'COE', department: 'Examination Authority' },
  PRINCIPAL: { id: 'usr_principal', name: 'Dr. Albus Dumbledore', email: 'principal@campus.edu', role: 'PRINCIPAL', department: 'Executive Directorate' },
  SYSTEM_ADMIN: { id: 'usr_admin', name: 'Ada Lovelace (SysAdmin)', email: 'admin@campus.edu', role: 'SYSTEM_ADMIN', department: 'IT Infrastructure' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('roomwise_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.SYSTEM_ADMIN; // Default to System Admin for initial review
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('roomwise_auth_token') || 'demo_token_admin');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('roomwise_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('roomwise_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('roomwise_auth_token', token);
    } else {
      localStorage.removeItem('roomwise_auth_token');
    }
  }, [token]);

  const login = async (email: string, role: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      const authResult = await api.login(email, role);
      setUser(authResult.user);
      setToken(authResult.token);
    } catch {
      // Graceful fallback to demo user if backend offline
      const demoUser = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase()) || DEMO_USERS[role];
      setUser(demoUser);
      setToken(`demo_token_${role.toLowerCase()}`);
      setError(`Backend offline: Switched to local session for ${demoUser.name} (${role})`);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsRole = (role: UserRole) => {
    const demoUser = DEMO_USERS[role];
    setUser(demoUser);
    const mockToken = `demo_token_${role.toLowerCase()}`;
    setToken(mockToken);
    localStorage.setItem('roomwise_auth_token', mockToken);
    localStorage.setItem('roomwise_user', JSON.stringify(demoUser));
    setError(null);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('roomwise_auth_token');
    localStorage.removeItem('roomwise_user');
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        loginAsRole,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
