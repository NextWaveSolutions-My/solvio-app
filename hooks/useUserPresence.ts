"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocketConnection } from "@/hooks/useSocketConnection";
import type { UserPresenceState } from "@/types/realtime";

export function useUserPresence(userId: string | null) {
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresenceState>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const { socket } = useSocketConnection(userId);

  useEffect(() => {
    if (!socket || !userId) {
      return;
    }

    const handleSnapshot = (presence: UserPresenceState[]) => {
      const nextMap = new Map<string, UserPresenceState>();
      presence.forEach((entry) => {
        nextMap.set(entry.user_id, entry);
      });
      setPresenceMap(nextMap);
      setLoading(false);
    };

    const handleUpdate = (presence: UserPresenceState) => {
      setPresenceMap((current) => {
        const next = new Map(current);

        if (presence.status === "offline") {
          next.delete(presence.user_id);
        } else {
          next.set(presence.user_id, presence);
        }

        return next;
      });
      setLoading(false);
    };

    socket.on("presence:snapshot", handleSnapshot);
    socket.on("presence:updated", handleUpdate);

    return () => {
      socket.off("presence:snapshot", handleSnapshot);
      socket.off("presence:updated", handleUpdate);
    };
  }, [socket, userId]);

  const getUserPresence = useCallback(
    (targetUserId: string) =>
      (socket && userId ? presenceMap : new Map()).get(targetUserId) || null,
    [presenceMap, socket, userId]
  );

  const isUserOnline = useCallback(
    (targetUserId: string) =>
      ((socket && userId ? presenceMap : new Map()).get(targetUserId)?.status ||
        "offline") === "online",
    [presenceMap, socket, userId]
  );

  return {
    presenceMap: socket && userId ? presenceMap : new Map(),
    loading: socket && userId ? loading : false,
    getUserPresence,
    isUserOnline,
  };
}
