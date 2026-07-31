import { useEffect, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

/**
 * Subscribes to one or more real-time channels emitted by the backend
 * indexer (e.g. 'marketplace:event', 'staking:fee_deposited', or a
 * per-user id for notifications) and invokes `onMessage` for each payload.
 * Reconnects automatically with backoff if the connection drops.
 */
export function useRealtime(channels, onMessage) {
  const socketRef = useRef(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let retryDelay = 1000;
    let stopped = false;
    let socket;

    function connect() {
      socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        retryDelay = 1000;
        channels.forEach((channel) => socket.send(JSON.stringify({ type: 'subscribe', channel })));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handlerRef.current?.(data);
        } catch (err) {
          // Ignore malformed frames rather than crashing the UI.
        }
      };

      socket.onclose = () => {
        if (stopped) return;
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      };
    }

    connect();

    return () => {
      stopped = true;
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(channels)]);
}
