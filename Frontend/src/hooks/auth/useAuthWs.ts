import { useEffect, useRef } from 'react';
import { useAuthStore }      from '@/stores/Auth/authStore';
import { callLogout }        from '@/api/Auth/auth';     

/**
 * Keeps an auth-WebSocket alive, replies to health-check pings,
 * auto-reconnects with exponential back-off, and handles server-initiated
 * logout messages and other WebSocket lifecycle events.
 */
export function useAuthWs() {
  // Select individual primitive states and stable actions for dependencies
  const accessToken = useAuthStore(s => s.accessToken);
  const sessionId = useAuthStore(s => s.sessionId);
  const persoid = useAuthStore(s => s.persoid); // Using primitive persoid directly
  const wsMac = useAuthStore(s => s.wsMac);
  const clearStoreAction = useAuthStore(s => s.clear); // The clear action from the store
  const setWsReady = useAuthStore(s => s.setIsWsReady);   // Action to set WebSocket ready state

  const wsRef      = useRef<WebSocket>();
  const backoffRef = useRef(1_000); // Initial backoff delay for retries
  const tRef       = useRef<NodeJS.Timeout>(); // Timeout ID for retry scheduling

  /* ① Connect once — triggered by changes in sessionId, persoid, wsMac, or clearStoreAction */
  useEffect(() => {
    // Guard: Only proceed if all necessary parameters for connection are available
    if (!sessionId || !persoid || !wsMac) {
      console.log('[WS] Prerequisites for WebSocket connection not met (sessionId, persoid, or wsMac missing).');
      // Ensure WebSocket is marked as not ready if it was previously, and cleanup any existing connection.
      if (wsRef.current) {
        wsRef.current.close(1000, 'Auth params became invalid');
        wsRef.current = undefined;
      }
      setWsReady(false);
      return;
    }

    // Guard: If a WebSocket connection instance already exists, don't try to create another.
    // This hook instance should manage only one WebSocket.
    if (wsRef.current) {
      // This typically shouldn't be hit if dependencies are stable,
      // as cleanup would clear wsRef.current first.
      console.log('[WS] Connection attempt skipped: wsRef.current already exists.');
      return;
    }

    /** Opens a socket (used on mount & back-off retry) */
    const open = () => {
      // Clear any pending retry timeout before attempting a new connection
      if (tRef.current) clearTimeout(tRef.current);

      // Double-check auth params right before connecting, in case they were cleared during a delay
      const currentSessionId = useAuthStore.getState().sessionId;
      const currentPersoid = useAuthStore.getState().persoid;
      const currentWsMac = useAuthStore.getState().wsMac;

      if (!currentSessionId || !currentPersoid || !currentWsMac) {
          console.log('[WS] Auth details became invalid before scheduled (re)connect. Aborting open.');
          setWsReady(false);
          return;
      }

      const base =
        import.meta.env.MODE === 'development'
          ? 'ws://localhost:5000/ws/auth'   // Use local dev server for WebSocket in development
          : 'wss://ebudget.se/ws/auth';     // Use production server for WebSocket in production

      const url =
        `${base}?sid=${encodeURIComponent(currentSessionId)}` +
        `&pid=${encodeURIComponent(currentPersoid)}` +
        `&mac=${encodeURIComponent(currentWsMac)}`;

      console.log('[WS 🔌 CONNECTING TO]', url);
      setWsReady(false); // Mark as not ready while connecting
      const ws = new WebSocket(url, ['hmac-v1']);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS ✅ CONNECTED]');
        backoffRef.current = 1_000; // Reset backoff delay on successful connection
        // Do not setWsReady(true) here; wait for the server's "ready" message
      };

      ws.onmessage = async (ev) => {
        const receivedData = ev.data;
        console.log('[WS ← RECEIVED]', receivedData);

        if (receivedData === 'ready') {
          console.log('[WS] Server acknowledged: Connection is ready.');
          setWsReady(true); // Now the connection is truly ready for use
          return;
        }

        if (receivedData === 'ping') {
          const pongMessage = 'pong';
          console.log('[WS → SENT]', pongMessage);
          ws.send(pongMessage);
          return;
        }

        if (receivedData === 'LOGOUT') {
          console.log('[WS] Received LOGOUT command from server. Initiating full client logout...');
          setWsReady(false); // WS no longer ready
          try {
            await callLogout(); // Handles API call, store clear, and redirect
          } catch (logoutError) {
            console.error('[WS] Error during callLogout operation triggered by server LOGOUT:', logoutError);
            // Fallback to ensure client state is cleared and redirected if callLogout failed critically
            if (useAuthStore.getState().accessToken) {
              useAuthStore.getState().clear();
              if (window.location.pathname !== '/login') window.location.href = '/login';
            }
          }
          // The callLogout and subsequent store clear will trigger useEffect cleanup for the WebSocket
          return;
        }

        if (receivedData === 'reauth-ok') {
          console.log('[WS] In-band re-authentication successful (reauth-ok).');
          return;
        }

        if (receivedData === 'reauth-fail') {
          console.error('[WS] In-band re-authentication failed by server (reauth-fail). Token may be invalid.');
          // TODO: Lets consider what action to take: notify user, attempt full logout via callLogout()?
          // For now, just logging. Depending on severity, you might call 'await callLogout();'
          return;
        }

        if (typeof receivedData === 'string' && receivedData.startsWith('Echo: ')) {
          // Already logged by the generic "[WS ← RECEIVED]"
          return;
        }

        console.warn('[WS ? UNHANDLED MESSAGE FROM SERVER]', receivedData);
      };

      ws.onerror = (event) => { // WebSocket ErrorEvent
        console.error('[WS ❌ ERROR]', event);
        // ws.onclose will also be called, usually with a non-1000 code
        // setWsReady(false) will be handled in onclose
      };

      ws.onclose = (ev) => {
        console.log(`[WS 🚫 CLOSED] Code: ${ev.code}, Reason: "${ev.reason || 'No reason given'}", WasClean: ${ev.wasClean}`);
        wsRef.current = undefined;
        setWsReady(false); // Set to not ready when closed for any reason

        // Only retry if the closure was not intentional (e.g., not normal or going away)
        // and if auth parameters still suggest a connection is desired.
        if (ev.code !== 1000 && ev.code !== 1001) {
          const currentAuth = useAuthStore.getState();
          if (currentAuth.sessionId && currentAuth.persoid && currentAuth.wsMac) {
            const retryDelay = backoffRef.current;
            console.log(`[WS] Connection closed unexpectedly. Retrying in ${retryDelay / 1000}s...`);
            tRef.current = setTimeout(open, retryDelay);
            backoffRef.current = Math.min(retryDelay * 2, 30_000);
          } else {
            console.log('[WS] Auth details missing after unexpected close. Not retrying.');
            clearTimeout(tRef.current); // Ensure no pending retry if auth details were cleared
          }
        } else {
          console.log('[WS] Connection closed gracefully or intentionally. No retry.');
          clearTimeout(tRef.current); // Clear any scheduled retry from a previous non-graceful close
        }
      };
    };

    open(); // Initial connection attempt for this effect run

    // Cleanup function
    return () => {
      console.log('[WS] useEffect cleanup running...');
      clearTimeout(tRef.current); // Clear any pending retry timeouts
      if (wsRef.current) {
        console.log('[WS] Closing WebSocket due to useEffect cleanup (deps changed or unmount). URL:', wsRef.current.url);
        wsRef.current.onopen = null;    // Detach handlers to prevent them
        wsRef.current.onmessage = null; // from firing on a closed socket
        wsRef.current.onerror = null;   // or during the closing process
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'useEffect cleanup'); // 1000 for normal closure
        wsRef.current = undefined;
      }
      setWsReady(false); // Ensure ready state is false on cleanup
    };
  }, [sessionId, persoid, wsMac, clearStoreAction, setWsReady]); // Stable primitive dependencies + stable store actions

  /* ② push fresh JWTs in-band */
  useEffect(() => {
    const {
      accessToken: currentAccessToken,
      isWsReady: currentWsReadyState, // Use the specific WebSocket ready state
      authProviderInitialized: currentAuthProviderInitialized // Check if AuthProvider is done
    } = useAuthStore.getState();

    // Ensure WebSocket itself is reported as ready by this hook,
    // AuthProvider is initialized, and we have an access token.
    if (wsRef.current?.readyState === WebSocket.OPEN &&
        currentWsReadyState &&
        currentAuthProviderInitialized && // Ensure auth system is stable
        currentAccessToken) {
      const authMessage = `AUTH-REFRESH ${currentAccessToken}`;
      console.log('[WS → SENT]', authMessage);
      wsRef.current.send(authMessage);
    }
    // Dependencies: accessToken changing is the primary trigger.
    // isWsReady and authProviderInitialized are checked on each run.
  }, [accessToken]); // Re-run when accessToken changes
}