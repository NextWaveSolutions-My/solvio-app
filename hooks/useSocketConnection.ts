"use client";

import { useEffect, useState } from "react";

import { getSocketClient } from "@/lib/socket/client";

export function useSocketConnection(userId: string | null) {
  const [isConnected, setIsConnected] = useState(() =>
    userId ? getSocketClient().connected : false
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    const socket = getSocketClient();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [userId]);

  return {
    socket: userId ? getSocketClient() : null,
    isConnected: userId ? getSocketClient().connected || isConnected : false,
  };
}
