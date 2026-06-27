import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin } from './api';
import { disconnectSocket } from './socket';
import { AuthUser } from './types';

const TOKEN_KEY = 'radiotaxi_token';
const USER_KEY = 'radiotaxi_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura sesión al arrancar
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn('No se pudo restaurar la sesión:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password);

    // Validación de rol: solo DRIVER o ADMIN pueden usar esta app
    if (res.user.role !== 'DRIVER' && res.user.role !== 'ADMIN') {
      throw new Error('Esta cuenta no es de conductor. Usa la app de cliente.');
    }

    await AsyncStorage.setItem(TOKEN_KEY, res.accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    disconnectSocket();
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
