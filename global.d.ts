import type { Server } from "socket.io";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@/lib/socket/types";
import type { TypingIndicator } from "@/types/realtime";

// Type declarations for CSS imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

declare global {
  var __socketServer:
    | Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >
    | undefined;
  var __presenceEntries:
    | Map<
        string,
        {
          sockets: Set<string>;
          status: "online" | "away";
          lastSeen: Date;
        }
      >
    | undefined;
  var __typingEntries:
    | Map<string, Map<string, TypingIndicator>>
    | undefined;
  var __typingTimeouts: Map<string, NodeJS.Timeout> | undefined;
}
