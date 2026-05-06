import { create } from 'zustand';
import { clearToken, getToken } from '../api/client.js';

export interface TsoProfile {
  tsoId: string;
  name: string;
  phone: string;
}

interface AuthState {
  tso: TsoProfile | null;
  isAuthenticated: boolean;
  // Call after verifyOtp resolves to persist TSO profile in memory
  setTso: (tso: TsoProfile) => void;
  logout: () => Promise<void>;
  // Rehydrate from SecureStore on app launch
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  tso: null,
  isAuthenticated: false,

  setTso: (tso) => set({ tso, isAuthenticated: true }),

  logout: async () => {
    await clearToken();
    set({ tso: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const token = await getToken();
    if (token) {
      // Decode sub/name from JWT payload (no verify needed — server will re-validate)
      try {
        const [, payloadB64] = token.split('.');
        const payload = JSON.parse(atob(payloadB64)) as {
          sub: string;
          name?: string;
          phone?: string;
        };
        set({
          tso: { tsoId: payload.sub, name: payload.name ?? '', phone: payload.phone ?? '' },
          isAuthenticated: true,
        });
      } catch {
        await clearToken();
      }
    }
  },
}));
