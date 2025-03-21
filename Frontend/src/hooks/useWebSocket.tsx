import { useEffect, useRef, useCallback } from "react";

export function useWebSocket(
  url: string,
  {
    enabled = true,
    maxAttempts = 3,
    reconnectInterval = 5000,
    onOpen,
    onMessage,
    onError,
    onClose,
  }: {
    enabled?: boolean;
    maxAttempts?: number;
    reconnectInterval?: number;
    onOpen?: (ws: WebSocket) => void;
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onClose?: () => void;
  } = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(1);
  const isManuallyClosedRef = useRef(false);

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      isManuallyClosedRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    // Prevent multiple concurrent connections:
    if (wsRef.current) {
      console.log("WebSocket already connected, skipping...");
      return;
    }
    isManuallyClosedRef.current = false;

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => {
      attemptRef.current = 1;
      onOpen?.(socket);
    };

    socket.onmessage = (event) => {
      onMessage?.(event);
    };

    socket.onerror = (error) => {
      onError?.(error);
    };

    socket.onclose = () => {
      onClose?.();
      wsRef.current = null;

      // Auto-reconnect logic:
      if (!isManuallyClosedRef.current && enabled && attemptRef.current < maxAttempts) {
        setTimeout(() => {
          attemptRef.current++;
          connect();
        }, reconnectInterval);
      }
    };
  }, [url, enabled, maxAttempts, reconnectInterval, onOpen, onMessage, onError, onClose]);

  // Effect to manage connection on mount or when "enabled" changes
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      closeWebSocket();
    };
  }, [enabled, connect, closeWebSocket]);

  return { closeWebSocket };
}
