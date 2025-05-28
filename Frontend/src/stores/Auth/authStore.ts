import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserDto } from '@myTypes/User/UserDto'

interface AuthSlice {
  accessToken    : string | null      // JWT token for authentication
  sessionId      : string | null      // Session ID for tracking user sessions
  persoid        : string | null;     // Personal ID for user identification
  wsMac          : string | null      // MAC address for WebSocket connection
  user           : UserDto | null     // User data, null if not authenticated
  isLoading      : boolean            // Indicates if the store is currently loading data
  wsEnabled      : boolean            // Indicates if WebSocket is enabled
  ready     : boolean                 // Indicates if the Websocket is ready for use
  setReady  : (v: boolean) => void    // Sets the readiness state for WebSocket

  /* actions */
  setAuth      : (tok: string, sid: string, pid: string, mac: string, ) => void
  mergeUser    : (u:UserDto)=>void
  setLoad      : (b:boolean)=>void
  setWs        : (b:boolean)=>void
  clear        : ()=>void

  /* derived */
  isTokenValid : () => boolean
}

type Persisted = Pick<AuthSlice,
  'accessToken' | 'sessionId' | 'persoid' | 'wsMac' | 'user'>;

/**
 * Extracts the `exp` claim from a JWT and returns the timestamp in seconds.
 * Returns null if parsing fails.
 */
function getTokenExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthSlice>()(
  persist(
    (set, get) => ({
      accessToken   : null,
      sessionId     : null,
      persoid       : null, 
      wsMac         : null,
      user          : null,
      firstTimeLogin: false,
      isLoading     : false,
      wsEnabled     : false,
      ready   : false,

      setReady: (v) => set({ ready: v }),

     /** called by login|refresh */
    setAuth: (tok: string, sid: string, pid: string, mac: string ) => {
       set({
         accessToken   : tok,
         sessionId     : sid,
         persoid       : pid,
         wsMac         : mac,
         wsEnabled     : true,
       });
                       
      },

      mergeUser: (u) => set({ user: u }),
      setLoad  : (b) => set({ isLoading: b }),
      setWs    : (b) => set({ wsEnabled: b }),

      clear: () => {
        console.log('[AuthStore] Clearing authentication state and WebSocket params.'); 
        set({
          accessToken   : null,
          sessionId     : null,
          persoid       : null, 
          wsMac         : null, 
          user          : null,
          wsEnabled     : false,
          ready         : false, 
          isLoading: false, // Todo: should this be true? (evaluate)
        });
      },


      isTokenValid: () => {
        const token = get().accessToken
        if (!token) return false
        const exp = getTokenExp(token)
        return exp ? Date.now() < exp * 1000 : false
      },
    }),
    {
      name       : 'auth',
      partialize : (state): Persisted => ({
        accessToken: state.accessToken,
        sessionId  : state.sessionId,
        persoid    : state.persoid,
        user       : state.user,
        wsMac      : state.wsMac,
      }),
      storage    : createJSONStorage(() => localStorage),

    }
  )
)
