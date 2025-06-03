import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserDto } from '@myTypes/User/UserDto';
import { api } from '@/api/axios'; // Assuming this is your configured axios instance

// Define the AuthSlice interface with distinct readiness flags
interface AuthSlice {
  accessToken: string | null;
  sessionId: string | null;
  persoid: string | null;
  wsMac: string | null;
  user: UserDto | null;
  isLoading: boolean;            // For operational loading (e.g., login process)
  rememberMe: boolean;

  // AuthProvider readiness
  authProviderInitialized: boolean;
  setAuthProviderInitialized: (isInitialized: boolean) => void;

  // WebSocket readiness
  isWsReady: boolean;
  setIsWsReady: (isReady: boolean) => void;

  wsEnabled: boolean; // Retaining this from your original if it has a distinct purpose

  /* actions */
  setAuth: (tok: string, sid: string, pid: string, mac: string | null, remember: boolean) => void;
  mergeUser: (u: UserDto) => void;
  setOpLoading: (isLoading: boolean) => void;
  setWsEnabledStatus: (isEnabled: boolean) => void; // Clarified name if 'wsEnabled' is a status
  clear: () => void;

  /* derived */
  isTokenValid: () => boolean;
}

// Persisted type should only include what needs to be saved to localStorage
type Persisted = Pick<AuthSlice,
  'accessToken' | 'sessionId' | 'persoid' | 'wsMac' | 'user' | 'rememberMe'>;

function getTokenExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthSlice>()(
  persist(
    (set, get) => ({
      accessToken: null,
      sessionId: null,
      persoid: null,
      wsMac: null,
      user: null,
      isLoading: false,
      rememberMe: false,
      wsEnabled: false, // Assuming default

      authProviderInitialized: false, // For AuthProvider
      setAuthProviderInitialized: (isInitialized) => set({ authProviderInitialized: isInitialized }),

      isWsReady: false, // For WebSocket
      setIsWsReady: (isReady) => set({ isWsReady: isReady }),

      setAuth: (tok, sid, pid, mac, remember) => {
        set({
          accessToken: tok,
          sessionId: sid,
          persoid: pid,
          wsMac: mac,
          rememberMe: remember,
          isLoading: false,
          // wsEnabled: true, // Setting wsEnabled here might be appropriate if login implies WS should be active
          // authProviderInitialized is set by AuthProvider itself after its checks
          // isWsReady is set by useAuthWs
        });
        if (!remember) {
          sessionStorage.setItem('appSessionActive', 'true');
        } else {
          sessionStorage.removeItem('appSessionActive');
        }
      },

      mergeUser: (u) => set((state) => ({ user: { ...state.user, ...u } })),
      setOpLoading: (isLoading) => set({ isLoading: isLoading }),
      setWsEnabledStatus: (isEnabled) => set({ wsEnabled: isEnabled }),

      clear: () => {
        console.log('[AuthStore] Clearing authentication state.');
        set({
          accessToken: null,
          sessionId: null,
          persoid: null,
          wsMac: null,
          user: null,
          isLoading: false,
          rememberMe: false,
          authProviderInitialized: true, // After clear, AuthProvider is "initialized" to show login/public state
          isWsReady: false,              // WebSocket is no longer ready
          wsEnabled: false,              // WebSocket should probably be disabled
        });
        sessionStorage.removeItem('appSessionActive');
        if (api && api.defaults.headers.common.Authorization) {
          delete api.defaults.headers.common.Authorization;
        }
      },

      isTokenValid: () => {
        const token = get().accessToken;
        if (!token) return false;
        const exp = getTokenExp(token);
        return exp ? Date.now() < exp * 1000 : false;
      },
    }),
    {
      name: 'auth',
      partialize: (state): Persisted => ({
        accessToken: state.accessToken,
        sessionId: state.sessionId,
        persoid: state.persoid,
        user: state.user,
        wsMac: state.wsMac,
        rememberMe: state.rememberMe,
      }), // authProviderInitialized and isWsReady are not persisted
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset transient readiness flags on rehydration; AuthProvider and useAuthWs will set them.
          state.authProviderInitialized = false;
          state.isWsReady = false;
          state.isLoading = false;
        }
      },
    }
  )
);