import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('roomwise_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('roomwise_auth_token');
      if (!savedToken) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const currentUser = await api.getMe();
        if (active) {
          setUser(currentUser);
          setToken(savedToken);
        }
      } catch {
        if (active) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('roomwise_auth_token');
          localStorage.removeItem('roomwise_user');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, []);

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

  useEffect(() => {
    if (token) {
      localStorage.setItem('roomwise_auth_token', token);
    } else {
      localStorage.removeItem('roomwise_auth_token');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authResult = await api.login(email, password);
      setUser(authResult.user);
      setToken(authResult.token);
    } catch (err) {
      setUser(null);
      setToken(null);
      setError(err instanceof Error ? err.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void api.logout();
    setUser(null);
    setToken(null);
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
