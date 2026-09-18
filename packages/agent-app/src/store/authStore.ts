import { create } from 'zustand';
import { clearToken, getToken } from '../api/client';

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  throw new Error('Base64 decoder unavailable');
}

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

type JwtPayload = {
  sub?: string;
  name?: string;
  phone?: string;
  exp?: number;
};

export const useAuthStore = create<AuthState>((set) => ({
  tso: null,
  isAuthenticated: false,

  setTso: (tso) => set({ tso, isAuthenticated: true }),

  logout: async () => {
    await clearToken();
    set({ tso: null, isAuthenticated: false });
  },

  hydrate: async () => {
    // Avoid indefinite startup blocking if secure storage hangs.
    const token = await Promise.race<string | null>([
      getToken(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);

    if (token) {
      // Decode sub/name from JWT payload (no verify needed — server will re-validate)
      try {
        const [, payloadB64] = token.split('.');
        if (!payloadB64) throw new Error('Invalid JWT payload');
        const payload = JSON.parse(decodeBase64Url(payloadB64)) as JwtPayload;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const isExpired = typeof payload.exp === 'number' && payload.exp <= nowSeconds;
        if (isExpired || !payload.sub) {
          await clearToken();
          set({ tso: null, isAuthenticated: false });
          return;
        }
        set({
          tso: { tsoId: payload.sub, name: payload.name ?? '', phone: payload.phone ?? '' },
          isAuthenticated: true,
        });
      } catch {
        await clearToken();
        set({ tso: null, isAuthenticated: false });
      }
      return;
    }

    set({ tso: null, isAuthenticated: false });
  },
}));
