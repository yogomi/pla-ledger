import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import i18n from '../i18n';

interface User {
  id: string;
  email: string;
  name: string;
  locale: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, locale: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(r => {
          setUser(r.data.data.user);
          const locale = r.data.data.user.locale || 'en';
          i18n.changeLanguage(locale);
          localStorage.setItem('locale', locale);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = r.data.data;
    localStorage.setItem('token', t);
    localStorage.setItem('locale', u.locale || 'en');
    i18n.changeLanguage(u.locale || 'en');
    setToken(t);
    setUser(u);
  };

  const signup = async (email: string, password: string, name: string, locale: string) => {
    const r = await api.post('/auth/signup', { email, password, name, locale });
    const { token: t, user: u } = r.data.data;
    localStorage.setItem('token', t);
    localStorage.setItem('locale', u.locale || 'en');
    i18n.changeLanguage(u.locale || 'en');
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('locale');
    setToken(null);
    setUser(null);
    i18n.changeLanguage('en');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
