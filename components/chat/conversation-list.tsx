/**
 * Conversation List Component
 *
 * Displays a list of conversations with real-time updates.
 * Includes Messenger-style status filter tabs (All, Unread, Groups, Communities).
 */

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NameWithRole } from "@/components/shared/name-with-role";
import { useUserPresence } from "@/hooks/useUserPresence";
import type { ConversationWithParticipants } from "@/hooks/useRealtimeConversations";
import { Search, Users } from "lucide-react";

type FilterTab = "all" | "unread" | "groups";

interface ConversationListProps {
  userId: string;
  conversations: ConversationWithParticipants[];
  loading?: boolean;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string | null;
}

export function ConversationList({
  userId,
  conversations,
  loading = false,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const { isUserOnline } = useUserPresence(userId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Filter conversations based on search query and active tab
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply tab filter first
    switch (activeTab) {
      case "unread":
        filtered = filtered.filter(
          (conv) => conv.unreadCount && conv.unreadCount > 0
        );
        break;
      case "groups":
        filtered = filtered.filter(
          (conv) =>
            conv.type === "group" || (conv.participants?.length || 0) > 2
        );
        break;
      default:
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conversation) => {
        const otherParticipants = conversation.participants.filter(
          (p) => p.user_id !== userId
        );
        return otherParticipants.some((participant) =>
          participant.user_name?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [conversations, searchQuery, userId, activeTab]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "groups", label: "Groups" },
  ];

  if (loading) {
    return (
      <div className="space-y-2 px-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative px-2">
        <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search Messenger"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 px-2 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "No conversations found"
              : activeTab === "unread"
                ? "No unread messages"
                : activeTab === "groups"
                  ? "No group conversations"
                  : "No conversations yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Start a new conversation to get started"}
          </p>
        </div>
      ) : (
        filteredConversations.map((conversation) => {
          // Get other participants (not current user)
          const otherParticipants = conversation.participants.filter(
            (p) => p.user_id !== userId
          );
          const firstParticipant = otherParticipants[0];
          const isOnline = firstParticipant
            ? isUserOnline(firstParticipant.user_id)
            : false;
          const hasUnread =
            typeof conversation.unreadCount === "number" &&
            conversation.unreadCount > 0;

          return (
            <div
              key={conversation.id}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all",
                selectedConversationId === conversation.id
                  ? "bg-blue-50 dark:bg-blue-950/30"
                  : "hover:bg-accent/50"
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              {/* Avatar with presence indicator */}
              <div className="relative h-12 w-12 shrink-0">
                <Avatar className="h-12 w-12">
                  {otherParticipants.length > 1 ? (
                    // Group chat - show group icon
                    <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  ) : firstParticipant?.user_image ? (
                    // Direct message - show user avatar
                    <AvatarImage
                      src={firstParticipant.user_image}
                      alt={firstParticipant.user_name || "User"}
                    />
                  ) : null}
                  {otherParticipants.length === 1 && (
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold text-sm">
                      {firstParticipant?.user_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Presence badge */}
                {otherParticipants.length === 1 && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-card",
                      isOnline ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                )}
              </div>

              {/* Conversation info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm truncate",
                      hasUnread ? "font-bold" : "font-medium"
                    )}
                  >
                    {otherParticipants.length > 0
                      ? otherParticipants
                          .map((p) => p.user_name || p.user_id)
                          .join(", ")
                      : "Unnamed Conversation"}
                  </p>
                </div>

                {/* Last message preview + time */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p
                    className={cn(
                      "text-xs truncate flex-1",
                      hasUnread
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {conversation.lastMessage ? (
                      conversation.lastMessage.is_deleted ? (
                        <span className="italic">[Message deleted]</span>
                      ) : (
                        <>
                          {conversation.lastMessage.sender_id === userId && (
                            <span className="font-medium">You: </span>
                          )}
                          {conversation.lastMessage.content || (
                            <span className="italic">Attachment</span>
                          )}
                        </>
                      )
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                  {conversation.last_message_at && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                      · {formatDistanceToNow(
                        new Date(conversation.last_message_at),
                        { addSuffix: false }
                      ).replace("about ", "")}
                    </span>
                  )}
                </div>
              </div>

              {/* Unread indicator dot */}
              {hasUnread && (
                <div className="shrink-0">
                  <div className="h-3 w-3 rounded-full bg-blue-600" />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
