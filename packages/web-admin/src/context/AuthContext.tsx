import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clearToken } from '../api/client.js';

interface AuthState {
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(localStorage.getItem('admin_token')),
  );

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  // Keep context in sync when storage changes (multi-tab)
  useEffect(() => {
    const handler = () =>
      setIsAuthenticated(Boolean(localStorage.getItem('admin_token')));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, logout }}>
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
