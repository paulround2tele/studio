"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { sessionWebSocketClient } from '@/lib/websocket/client';

interface WebSocketContextType {
  client: typeof sessionWebSocketClient | null;
  isConnected: boolean;
  reconnectAttempts: number;
}

const WebSocketContext = createContext<WebSocketContextType>({ 
  client: null, 
  isConnected: false, 
  reconnectAttempts: 0 
});

export const useWebSocketClient = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketClient must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * Simplified WebSocket Provider - Single Shared Connection
 * TASK-WS-005: Uses the simplified SessionWebSocketClient
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const clientRef = useRef<typeof sessionWebSocketClient | null>(null);

  useEffect(() => {
    // Use singleton instance
    clientRef.current = sessionWebSocketClient;
    
    // Set up connection state handlers
    const unsubscribeOpen = sessionWebSocketClient.on('open', () => {
      setIsConnected(true);
      setReconnectAttempts(0);
    });
    
    const unsubscribeClose = sessionWebSocketClient.on('close', () => {
      setIsConnected(false);
    });
    
    const unsubscribeReconnecting = sessionWebSocketClient.on('reconnecting', (data: any) => {
      setReconnectAttempts(data.attempt || 0);
    });

    // Connect
    sessionWebSocketClient.connect();

    return () => {
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeReconnecting();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ 
      client: clientRef.current, 
      isConnected, 
      reconnectAttempts 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
