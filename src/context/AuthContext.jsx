import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, USER_STORAGE_KEY, getStoredToken, setStoredAuth } from '../data/api';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw =
      localStorage.getItem(USER_STORAGE_KEY) ||
      sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  // Verify stored JWT session against backend on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    let cancelled = false;
    api
      .getMe()
      .then((res) => {
        if (!cancelled && res?.user) {
          setUser(res.user);
        }
      })
      .catch((err) => {
        if (!cancelled && err?.status === 401) {
          setUser(null);
          setStoredAuth(null, null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password, _preferredRole = 'student', remember = true) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setStoredAuth(res.user, res.token, remember);
    return res.user;
  }, []);

  const facultyLogin = useCallback(async (email, password = 'faculty123', remember = true) => {
    const res = await api.facultyLogin({ email, password });
    setUser(res.user);
    setStoredAuth(res.user, res.token, remember);
    return res.user;
  }, []);

  const adminLogin = useCallback(async (email, password = 'admin123') => {
    const res = await api.adminLogin({ email, password });
    setUser(res.user);
    setStoredAuth(res.user, res.token, true);
    return res.user;
  }, []);

  const register = useCallback(async (userData) => {
    const res = await api.register(userData);
    setUser(res.user);
    setStoredAuth(res.user, res.token, true);
    return res.user;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
    const token = getStoredToken();
    if (token) setStoredAuth(res.user, token, true);
    return res.user;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return api.changePassword({ currentPassword, newPassword });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStoredAuth(null, null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        facultyLogin,
        adminLogin,
        register,
        updateProfile,
        changePassword,
        logout,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        isFaculty: user?.role === 'faculty',
        isStaff: user?.role === 'staff' || user?.role === 'faculty',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
