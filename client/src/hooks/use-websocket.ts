import { useEffect, useState, useRef } from 'react';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  error: string | null;
}

export default function useWebSocket(path: string): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}${path}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
          console.log('WebSocket connected');
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          setSocket(null);
          
          // Only attempt to reconnect if it wasn't a manual close
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              console.log(`WebSocket reconnection attempt ${reconnectAttemptsRef.current}`);
              connect();
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setError('Failed to connect after multiple attempts');
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection error');
        };

        setSocket(ws);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('Failed to create WebSocket connection');
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close(1000); // Normal closure
      }
    };
  }, [path]);

  return {
    socket,
    isConnected,
    error
  };
}
