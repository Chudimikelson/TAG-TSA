import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clearToken, getToken } from '../api/client.js';

interface AuthState {
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getToken()),
  );

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const handler = () => setIsAuthenticated(Boolean(getToken()));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function markAuthenticated() {
  window.dispatchEvent(new Event('storage'));
}
