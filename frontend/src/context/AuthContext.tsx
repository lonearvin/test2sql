import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';
import { authAPI } from '@/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch {
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authAPI.login({ username, password });
    setToken(response.access_token);
    const userData: User = {
      id: response.user_id,
      username: response.username,
      email: '',
      role: response.role,
      is_active: true,
      created_at: '',
      updated_at: '',
    };
    setUser(userData);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    await authAPI.register({ username, email, password });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};