import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getSocket } from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      const socket = getSocket();
      if (!socket.connected) socket.connect();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const socket = getSocket();
    const handleSessionExpired = () => {
      // If we receive this, another device logged in or password was reset
      setUser(null);
      socket.disconnect();
      window.location.href = '/login?expired=true';
    };
    socket.on('session:expired', handleSessionExpired);
    return () => {
      socket.off('session:expired', handleSessionExpired);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    getSocket().connect();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    getSocket().connect();
    return data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    getSocket().disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
