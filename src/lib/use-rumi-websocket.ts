"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL } from "./api";
import { WebSocketEvent } from "@/types/rumi";

interface UseRumiWebSocketOptions {
  onEvent?: (event: WebSocketEvent) => void;
  enabled?: boolean;
}

export function useRumiWebSocket({
  onEvent,
  enabled = true,
}: UseRumiWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload: WebSocketEvent = JSON.parse(event.data);
          onEventRef.current?.(payload);
        } catch (e) {
          console.warn("[Rumi WS] Failed to parse message:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 3 seconds if enabled
        if (enabled && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.warn("[Rumi WS] Connection error:", err);
        ws.close();
      };
    } catch (err) {
      console.warn("[Rumi WS] Could not establish connection:", err);
      if (enabled && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    }
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
