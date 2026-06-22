/**
 * Messages Client Component
 *
 * Client-side component that handles the messaging interface.
 * Facebook Messenger-style 3-column layout with functional Media & files panel.
 */

"use client";

import type { UserRole } from "@/types";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageInput } from "@/components/chat/message-input";
import { MessageThread } from "@/components/chat/message-thread";
import { ConversationList } from "@/components/chat/conversation-list";
import {
  Plus,
  MessageSquare,
  User,
  BellOff,
  Search,
  ChevronRight,
  ChevronDown,
  Lock,
  Image as ImageIcon,
  Shield,
  Settings,
  Info,
  Phone,
  Video,
  ArrowLeft,
  FileText,
  FileIcon,
  Link as LinkIcon,
  Download,
  X,
} from "lucide-react";
import { useRealtimeConversations } from "@/hooks/useRealtimeConversations";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog";
import { NameWithRole } from "@/components/shared/name-with-role";
import type { Message, MessageAttachment } from "@/types/realtime";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessagesClientProps {
  userId: string;
  userRole: UserRole;
}

type RightPanelView = "profile" | "media";
type MediaTab = "media" | "files" | "links";

export function MessagesClient({
  userId,
  userRole,
}: MessagesClientProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showNewConversationDialog, setShowNewConversationDialog] =
    useState(false);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("profile");
  const [mediaTab, setMediaTab] = useState<MediaTab>("media");
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const {
    conversations,
    loading: conversationsLoading,
    refreshConversations,
  } =
    useRealtimeConversations(userId);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  // Auto-select the first conversation after load (and recover if selected one is removed)
  useEffect(() => {
    if (conversationsLoading) return;

    if (conversations.length === 0) {
      if (selectedConversationId !== null) {
        setSelectedConversationId(null);
      }
      return;
    }

    // Hold selection while waiting for a freshly created conversation to appear.
    if (pendingConversationId) {
      const pendingConversationExists = conversations.some(
        (conversation) => conversation.id === pendingConversationId
      );

      if (pendingConversationExists) {
        if (selectedConversationId !== pendingConversationId) {
          setSelectedConversationId(pendingConversationId);
          setReplyToMessage(null);
        }
        setPendingConversationId(null);
      }
      return;
    }

    const hasValidSelection =
      selectedConversationId !== null &&
      conversations.some((conversation) => conversation.id === selectedConversationId);

    if (!hasValidSelection) {
      setSelectedConversationId(conversations[0].id);
      setReplyToMessage(null);
    }
  }, [
    conversations,
    conversationsLoading,
    pendingConversationId,
    selectedConversationId,
  ]);

  // Get the other participant details for the right panel
  const selectedParticipant = useMemo(() => {
    if (!selectedConversation) return null;
    const others = selectedConversation.participants.filter(
      (p) => p.user_id !== userId
    );
    return others[0] || null;
  }, [selectedConversation, userId]);

  const isGroupChat = useMemo(() => {
    if (!selectedConversation) return false;
    return (
      selectedConversation.type === "group" ||
      (selectedConversation.participants?.length || 0) > 2
    );
  }, [selectedConversation]);

  // Fetch conversation messages for media panel
  const fetchConversationMessages = useCallback(async (conversationId: string) => {
    setLoadingMedia(true);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const payload = (await response.json()) as { messages: Message[] };
        setConversationMessages(payload.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages for media:", error);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  // Fetch messages when media panel is opened or conversation changes
  useEffect(() => {
    if (rightPanelView === "media" && selectedConversationId) {
      fetchConversationMessages(selectedConversationId);
    }
  }, [rightPanelView, selectedConversationId, fetchConversationMessages]);

  // Reset right panel when conversation changes
  useEffect(() => {
    setRightPanelView("profile");
    setMediaTab("media");
  }, [selectedConversationId]);

  // Extract all attachments from conversation messages, grouped by month
  const { mediaItems, fileItems, linkItems } = useMemo(() => {
    const allAttachments: { attachment: MessageAttachment; message: Message }[] = [];

    for (const msg of conversationMessages) {
      if (msg.is_deleted) continue;
      for (const att of msg.attachments) {
        allAttachments.push({ attachment: att, message: msg });
      }
    }

    // Sort newest first
    allAttachments.sort(
      (a, b) =>
        new Date(b.attachment.created_at).getTime() -
        new Date(a.attachment.created_at).getTime()
    );

    const media = allAttachments.filter(
      (item) =>
        item.attachment.file_type === "image" ||
        item.attachment.file_type === "video"
    );

    const files = allAttachments.filter(
      (item) =>
        item.attachment.file_type !== "image" &&
        item.attachment.file_type !== "video"
    );

    // Extract URLs from message content
    const links: { url: string; message: Message }[] = [];
    const urlRegex = /https?:\/\/[^\s]+/g;
    for (const msg of conversationMessages) {
      if (msg.is_deleted || !msg.content) continue;
      const matches = msg.content.match(urlRegex);
      if (matches) {
        for (const url of matches) {
          links.push({ url, message: msg });
        }
      }
    }

    return { mediaItems: media, fileItems: files, linkItems: links };
  }, [conversationMessages]);

  // Group items by month
  function groupByMonth<T extends { message: Message }>(items: T[]) {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      const date = new Date(item.message.created_at);
      const key = format(date, "MMMM yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      {/* Full-Height 3-Column Messenger Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px] h-[calc(100vh-theme(spacing.14)-2rem)] md:h-[calc(100vh-theme(spacing.14)-3rem)] rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
        {/* ============ LEFT COLUMN: Conversations List ============ */}
        <div className="flex flex-col overflow-hidden border-r border-border/50 bg-card">
          {/* Header */}
          <div className="px-4 py-3 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">Chats</h2>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-accent"
                  onClick={() => setShowNewConversationDialog(true)}
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Conversation List with built-in search and tabs */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <ConversationList
              userId={userId}
              conversations={conversations}
              loading={conversationsLoading}
              onSelectConversation={(id) => {
                setSelectedConversationId(id);
                setReplyToMessage(null);
              }}
              selectedConversationId={selectedConversationId}
            />
          </div>
        </div>

        {/* ============ CENTER COLUMN: Chat Thread ============ */}
        <div className="flex flex-col overflow-hidden">
          {selectedConversationId ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-2.5 border-b border-border/50 bg-card shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConversation?.participants
                      .filter((p) => p.user_id !== userId)
                      .slice(0, 1)
                      .map((participant) => (
                        <div
                          key={participant.user_id}
                          className="flex items-center gap-2.5"
                        >
                          <div className="relative">
                            <Avatar className="h-9 w-9">
                              {participant.user_image && (
                                <AvatarImage
                                  src={participant.user_image}
                                  alt={participant.user_name || "User"}
                                />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {participant.user_name?.[0]?.toUpperCase() ||
                                  "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold leading-tight">
                              <NameWithRole
                                name={participant.user_name || "User"}
                                role={participant.user_role}
                                className="text-sm font-semibold"
                                badgeClassName="h-4 px-2 text-[10px]"
                              />
                            </h2>
                            <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                              Active now
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      title="Audio call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      title="Video call"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-muted/20">
                <MessageThread
                  conversationId={selectedConversationId}
                  userId={userId}
                  participants={selectedConversation?.participants}
                  onReplyToMessage={setReplyToMessage}
                />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t border-border/50 bg-card shrink-0">
                <MessageInput
                  conversationId={selectedConversationId}
                  userId={userId}
                  replyToMessage={replyToMessage}
                  onCancelReply={() => setReplyToMessage(null)}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/10">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center mb-5">
                <MessageSquare className="h-9 w-9 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No conversation selected
              </h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                Choose a conversation from the sidebar or start a new one to begin messaging
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                onClick={() => setShowNewConversationDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          )}
        </div>

        {/* ============ RIGHT COLUMN: Profile & Media Panel ============ */}
        <div
          className={cn(
            "hidden xl:flex flex-col overflow-hidden border-l border-border/50 bg-card",
            !selectedConversationId && "xl:hidden"
          )}
        >
          {selectedParticipant && rightPanelView === "profile" && (
            <>
              {/* Profile Section */}
              <div className="flex flex-col items-center pt-6 pb-4 px-4 shrink-0">
                <Avatar className="h-20 w-20 mb-3">
                  {selectedParticipant.user_image && (
                    <AvatarImage
                      src={selectedParticipant.user_image}
                      alt={selectedParticipant.user_name || "User"}
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {selectedParticipant.user_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-base font-semibold text-center">
                  {selectedParticipant.user_name || "User"}
                </h3>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                  Active now
                </p>
              </div>

              {/* Encryption Badge */}
              <div className="flex items-center justify-center gap-1.5 px-4 pb-4 shrink-0">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  End-to-end encrypted
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6 px-4 pb-5 shrink-0">
                <button className="flex flex-col items-center gap-1.5 group" type="button">
                  <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-muted transition-colors">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Profile</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 group" type="button">
                  <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-muted transition-colors">
                    <BellOff className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Mute</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 group" type="button">
                  <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center group-hover:bg-muted transition-colors">
                    <Search className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Search</span>
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto px-2">
                <MenuLink icon={Info} label="Chat info" />
                <MenuLink icon={Settings} label="Customize chat" />
                <MenuLink
                  icon={ImageIcon}
                  label="Media & files"
                  onClick={() => setRightPanelView("media")}
                />
                <MenuLink icon={Shield} label="Privacy & support" />
              </div>

              {/* Participant info for group chats */}
              {isGroupChat && (
                <div className="px-4 py-3 border-t border-border/50 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation?.participants.length} participants in this group
                  </p>
                  <div className="mt-2 space-y-2">
                    {selectedConversation?.participants.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {p.user_image && (
                            <AvatarImage src={p.user_image} alt={p.user_name || "User"} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {p.user_name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">
                          {p.user_id === userId ? "You" : p.user_name || "User"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ============ MEDIA & FILES VIEW ============ */}
          {selectedParticipant && rightPanelView === "media" && (
            <div className="flex flex-col h-full">
              {/* Media Panel Header */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-border/50 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-accent shrink-0"
                  onClick={() => setRightPanelView("profile")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-semibold">Media, files and links</h3>
              </div>

              {/* Media Tabs */}
              <div className="flex border-b border-border/50 shrink-0">
                {(["media", "files", "links"] as MediaTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMediaTab(tab)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium capitalize transition-colors relative",
                      mediaTab === tab
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {mediaTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Media Content */}
              <div className="flex-1 overflow-y-auto">
                {loadingMedia ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  </div>
                ) : mediaTab === "media" ? (
                  /* ===== MEDIA TAB ===== */
                  mediaItems.length === 0 ? (
                    <EmptyMediaState icon={ImageIcon} text="No media shared yet" />
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupByMonth(mediaItems)).map(
                        ([month, items]) => (
                          <div key={month} className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                              {month}
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                              {items.map(({ attachment }) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="aspect-square relative overflow-hidden rounded bg-muted group"
                                >
                                  {attachment.file_type === "image" ? (
                                    <img
                                      src={attachment.file_url}
                                      alt={attachment.file_name}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Video className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )
                ) : mediaTab === "files" ? (
                  /* ===== FILES TAB ===== */
                  fileItems.length === 0 ? (
                    <EmptyMediaState icon={FileIcon} text="No files shared yet" />
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupByMonth(fileItems)).map(
                        ([month, items]) => (
                          <div key={month} className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                              {month}
                            </p>
                            <div className="space-y-1">
                              {items.map(({ attachment }) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                                >
                                  <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                                    {attachment.file_type === "pdf" ? (
                                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                      <FileIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {attachment.file_name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatFileSize(attachment.file_size)}
                                    </p>
                                  </div>
                                  <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )
                ) : (
                  /* ===== LINKS TAB ===== */
                  linkItems.length === 0 ? (
                    <EmptyMediaState icon={LinkIcon} text="No links shared yet" />
                  ) : (
                    <div className="p-2">
                      {Object.entries(
                        groupByMonth(linkItems.map((l) => ({ ...l, attachment: null })))
                      ).length === 0 ? (
                        <EmptyMediaState icon={LinkIcon} text="No links shared yet" />
                      ) : (
                        linkItems.map(({ url, message }, idx) => (
                          <a
                            key={`${message.id}-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group mb-1"
                          >
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                              <LinkIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-blue-600 dark:text-blue-400">
                                {url}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(message.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </a>
                        ))
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={showNewConversationDialog}
        onOpenChange={setShowNewConversationDialog}
        currentUserId={userId}
        currentUserRole={userRole}
        onConversationCreated={(conversationId) => {
          setPendingConversationId(conversationId);
          setSelectedConversationId(null);
          void refreshConversations();
          setShowNewConversationDialog(false);
        }}
      />
    </>
  );
}

/** Reusable menu link item for the right panel */
function MenuLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/** Empty state for media panels */
function EmptyMediaState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
