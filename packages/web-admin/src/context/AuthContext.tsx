import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clearToken, getToken } from '../api/client.js';
import { decodeJWT } from '../lib/jwt.js';

export interface User {
  sub: string;
  role: string;
  adminRole?: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(getToken()),
  );
  const [user, setUser] = useState<User | null>(() => {
    const token = getToken();
    return token ? decodeJWT(token) : null;
  });

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // Keep context in sync when storage changes (multi-tab)
  useEffect(() => {
    const handler = () => {
      const token = getToken();
      setIsAuthenticated(Boolean(token));
      setUser(token ? decodeJWT(token) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function markAuthenticated(): void {
  // Token is already stored by api/auth.ts; just force a page reload so
  // AuthProvider re-reads localStorage.
  window.dispatchEvent(new Event('storage'));
}
