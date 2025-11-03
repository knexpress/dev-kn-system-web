'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { UserProfile, DepartmentData } from '@/lib/types';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  userProfile: UserProfile | null;
  department: DepartmentData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  department: null,
  loading: true,
  login: async () => ({ success: false, error: 'Auth not ready' }),
  logout: () => {},
});

const SESSION_STORAGE_KEY = 'knex-user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUserProfile(userData);
        
        // Ensure API client has the token if user is logged in
        const storedToken = localStorage.getItem('authToken');
        if (storedToken && !apiClient.getToken()) {
          apiClient.setToken(storedToken);
        }
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
        setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      const result = await apiClient.login(email, password);
      
      console.log('Login result:', result);
      console.log('Login result.success:', result.success);
      console.log('Login result.data:', result.data);
      
      if (!result.success) {
        setLoading(false);
        return { success: false, error: result.error || 'Login failed' };
      }
      
      // Extract user and token from result.data
      const data = result.data as any;
      const userData = data?.user || data;
      const token = data?.token;
      
      console.log('Extracted userData:', userData);
      console.log('Extracted token:', !!token);
      
      if (userData && token) {
        // Store user data in sessionStorage
        setUserProfile(userData);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));
        }
        
        // Store token in API client (which stores it in localStorage)
        apiClient.setToken(token);
        
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: result.error || 'Login failed - invalid response structure' };
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    setUserProfile(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    // Clear API client token
    apiClient.clearToken();
  }, []);

  const department = userProfile ? userProfile.department : null;

  return (
    <AuthContext.Provider value={{ userProfile, department, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
