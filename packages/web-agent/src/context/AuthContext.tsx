import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, clearToken } from '../api/client.js';

export interface TsoProfile {
  tsoId: string;
  name: string;
  phone: string;
}

interface AuthState {
  tso: TsoProfile | null;
  isAuthenticated: boolean;
  setTso: (tso: TsoProfile, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tso, setTsoState] = useState<TsoProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = decodeJwtPayload(token);
      const exp = payload['exp'] as number | undefined;
      if (exp && exp * 1000 > Date.now()) {
        // We don't have name/phone in the JWT; store them separately
        const stored = localStorage.getItem('agent_profile');
        if (stored) {
          try {
            setTsoState(JSON.parse(stored) as TsoProfile);
            setIsAuthenticated(true);
          } catch {
            // corrupt storage — require re-login
          }
        }
      } else {
        clearToken();
      }
    }
  }, []);

  function setTso(profile: TsoProfile, _token: string) {
    localStorage.setItem('agent_profile', JSON.stringify(profile));
    setTsoState(profile);
    setIsAuthenticated(true);
  }

  function logout() {
    clearToken();
    localStorage.removeItem('agent_profile');
    setTsoState(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ tso, isAuthenticated, setTso, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
