import { ObjectId } from "mongodb";

// =============================================================================
// USER TYPES
// =============================================================================

export type UserRole = "customer" | "support" | "admin";

/**
 * Account access status used for moderation / lifecycle management.
 * - `active`   – normal access (default for legacy users with no status field)
 * - `disabled` – temporarily deactivated; cannot sign in, reversible
 * - `banned`   – blocked (typically with a reason); cannot sign in
 */
export type AccountStatus = "active" | "disabled" | "banned";

export type NotificationClickBehavior = "detail" | "direct";

export interface UserPreferences {
  notifications?: {
    clickBehavior?: NotificationClickBehavior; // "detail" = go to detail page first, "direct" = go directly to resource
    channels?: {
      default?: "both" | "email" | "in_app" | "none";
      comment?: "both" | "email" | "in_app" | "none";
      meetingScheduled?: "both" | "email" | "in_app" | "none";
      meetingUpdated?: "both" | "email" | "in_app" | "none";
      attachment?: "both" | "email" | "in_app" | "none";
    };
  };
}

export interface User {
  _id: ObjectId;
  id: string; // Better-auth uses string IDs
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string;
  country?: string;
  phone?: string;
  envatoUsername?: string;
  role: UserRole;
  rbacRoleId?: string;
  rbacPermissionOverrides?: string[];
  /** Ticket department slugs a support agent covers (used for AI auto-assign). */
  departmentSlugs?: string[];
  /** Account access status. Unset is treated as "active" (legacy users). */
  status?: AccountStatus;
  /** Optional reason shown for disabled/banned accounts. */
  statusReason?: string;
  /** When the status was last changed. */
  statusUpdatedAt?: Date;
  /** Id of the admin/support user who last changed the status. */
  statusUpdatedBy?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// TICKET TYPES
// =============================================================================

export type TicketStatus =
  | "open"
  | "scheduled_meeting"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketCategory =
  | "bug"
  | "feature_request"
  | "technical_support"
  | "account"
  | "general"
  | "service"
  | (string & {});

// Purchase verification data from Envato API
export interface PurchaseVerification {
  verified: boolean;
  purchaseCode: string;
  buyer: string;
  purchaseDate: Date;
  supportedUntil?: Date;
  itemId?: string;
  itemName?: string;
  licenseType?: string;
  verifiedAt: Date;
}

export interface Ticket {
  _id: ObjectId;
  ticketNumber: string; // e.g., "TICKET-0001"
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  departmentSlug?: string;
  productSlug?: string;
  serviceSlug?: string;

  // Relationships
  customerId: string; // User ID who created the ticket
  assignedToId?: string; // Support/Admin user ID

  // Installation/customization-only fields (not used by generic tickets)
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  licenseKey?: string;

  // Purchase verification (from Envato API)
  purchaseVerification?: PurchaseVerification;

  // Metadata
  tags?: string[];
  timezone?: string; // Customer's timezone
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Guest (AI chatbot widget / public form) fields — present only when isGuest = true
  isGuest?: boolean;
  guestName?: string;
  guestEmail?: string;
  // Secret bearer token that lets a guest view + reply to their ticket via the
  // public portal at /support/ticket/<token>. Generated for guest tickets only.
  guestAccessToken?: string;
}

// Specialized request types that live in their own collections
export interface InstallationRequest extends Omit<Ticket, "category"> {
  category: "technical_support";
}

export interface CustomizationRequest extends Omit<Ticket, "category"> {
  category: "feature_request";
}

export interface Service {
  _id: ObjectId;
  name: string;
  slug: string;
  href: string;
  iconKey: string;
  roles: UserRole[];
  isActive: boolean;
  sortOrder: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface TicketCategoryDefinition {
  _id: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface TicketDepartmentDefinition {
  _id: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface TicketProductDefinition {
  _id: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// =============================================================================
// COMMENT TYPES
// =============================================================================

export interface Comment {
  _id: ObjectId;
  id?: string; // String ID for client-side use
  ticketId: string; // Ticket ObjectId as string
  userId: string; // User ID who created the comment
  content: string;
  isInternal: boolean; // Internal notes visible only to support/admin
  parentCommentId?: string; // For threaded replies
  attachments?: string[]; // Array of attachment IDs
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// ATTACHMENT TYPES
// =============================================================================

export interface Attachment {
  _id: ObjectId;
  ticketId: ObjectId;
  commentId?: string;
  userId: string;
  filename: string;
  originalFilename: string;
  fileSize: number; // in bytes
  mimeType: string;
  storageKey: string;
  url: string; // Storage URL (Vercel Blob, S3, etc.)
  uploadedAt: Date;
}

// =============================================================================
// MEETING TYPES
// =============================================================================

export type MeetingPlatform = "zoom" | "google_meet";

export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface Meeting {
  _id: ObjectId;
  ticketId: string; // Ticket ObjectId as string
  userId: string; // User ID who scheduled the meeting (admin/support)
  platform: MeetingPlatform;
  title: string;
  description?: string;
  scheduledAt: Date; // Meeting date and time
  duration?: number; // Duration in minutes
  meetingLink?: string; // Zoom/Google Meet link
  timezone?: string; // Timezone for the meeting
  status: MeetingStatus;
  commentId?: string; // Optional: link to a specific comment
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  rescheduleRequest?: {
    requestedBy: string; // User ID who requested reschedule (customer)
    requestedAt: Date;
    preferredTime: Date;
    reason?: string;
    status: "pending" | "approved" | "rejected";
  };
  customerConfirmation?: {
    confirmed: boolean;
    confirmedAt?: Date;
    confirmedBy?: string; // Customer user ID
  };
}

// =============================================================================
// TICKET HISTORY TYPES
// =============================================================================

export type TicketHistoryAction =
  | "created"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "unassigned"
  | "comment_added"
  | "comment_edited"
  | "attachment_added"
  | "resolved"
  | "closed"
  | "reopened"
  | "meeting_scheduled"
  | "meeting_updated"
  | "meeting_completed"
  | "meeting_cancelled";

export interface TicketHistory {
  _id: ObjectId;
  ticketId: string;
  userId: string;
  action: TicketHistoryAction;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// FORM TYPES (for react-hook-form)
// =============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  country: string;
  password: string;
  confirmPassword: string;
}

export interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  departmentSlug?: string;
  productSlug?: string;
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  timezone?: string;
}

export interface CreateInstallationRequestFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  timezone?: string;
}

export interface CreateCustomizationRequestFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  timezone?: string;
}

export interface AdminCreateTicketFormData extends CreateTicketFormData {
  customerId: string; // Admin selects which customer the ticket is for
}

export interface CommentFormData {
  content: string;
  isInternal?: boolean;
  parentCommentId?: string;
  attachmentIds?: string[];
}

export interface MeetingFormData {
  platform: MeetingPlatform;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration?: number;
  meetingLink?: string;
  timezone?: string;
}

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  rbacRoleId?: string;
  country?: string;
  departmentSlugs?: string[];
}

export interface UpdateUserFormData {
  name: string;
  email: string;
  role: UserRole;
  rbacRoleId?: string;
  country?: string;
  departmentSlugs?: string[];
  password?: string;
  confirmPassword?: string;
}

export interface UpdateProfileFormData {
  name: string;
  email: string;
  phone?: string;
  envatoUsername?: string;
  country?: string;
  image?: string;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateTicketFormData {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string;
  tags?: string[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// STATISTICS TYPES (for admin dashboard)
// =============================================================================

export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  resolved: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    bug: number;
    feature_request: number;
    technical_support: number;
    account: number;
    general: number;
  };
  averageResponseTime?: number; // in hours
  averageResolutionTime?: number; // in hours
}

export interface UserStatistics {
  totalUsers: number;
  customers: number;
  support: number;
  admins: number;
  newUsersThisMonth: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory | TicketCategory[];
  assignedToId?: string;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type NotificationType =
  | "comment"
  | "ticket_status"
  | "ticket_assignment"
  | "ticket_mention"
  | "meeting_scheduled"
  | "meeting_reminder"
  | "meeting_cancelled"
  | "new_ticket"
  | "new_message"
  | "installation_status"
  | "customization_status"
  | "attachment"
  | "meeting_updated";

export interface Notification {
  _id: ObjectId;
  userId: string; // User who receives the notification
  type: NotificationType;
  title: string;
  body: string;
  data: {
    ticketId?: string;
    ticketNumber?: string;
    commentId?: string;
    meetingId?: string;
    meetingTitle?: string;
    scheduledAt?: string;
    conversationId?: string;
    messageId?: string;
    installationId?: string;
    customizationId?: string;
    oldStatus?: string;
    newStatus?: string;
    url: string; // URL to navigate to
  };
  read: boolean;
  sentAt: Date;
  readAt?: Date;
}

// =============================================================================
// PUSH NOTIFICATION TYPES
// =============================================================================

export interface PushSubscription {
  _id: ObjectId;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  lastUsedAt: Date;
}

// =============================================================================
// PRESENCE TYPES
// =============================================================================

export type UserStatus = "online" | "offline" | "away";

export interface UserPresence {
  _id: ObjectId;
  userId: string;
  status: UserStatus;
  lastSeen: Date;
  socketId?: string;
  updatedAt: Date;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

export interface KBCategory {
  _id: ObjectId;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface KBArticle {
  _id: ObjectId;
  categoryId: string;
  categorySlug: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// =============================================================================
// AI TRAINING TYPES
// =============================================================================

/** @deprecated kept for back-compat with stored settings; use chatProvider/embeddingProvider */
export type AIProvider = "openai";
export type AIChatProviderKind = "openai" | "ollama";
export type AIEmbeddingProviderKind = "openai" | "ollama";
/**
 * Free-form model name. OpenAI examples: "gpt-4o-mini", "gpt-4o",
 * "gpt-4.1-mini", "gpt-4.1-nano". Ollama examples: "llama3.1", "qwen2.5".
 */
export type AIChatModel = string;
/**
 * Free-form embedding model name. OpenAI: "text-embedding-3-small" (1536),
 * "text-embedding-3-large" (3072). Ollama: "nomic-embed-text" (768).
 */
export type AIEmbeddingModel = string;
export type AIVectorSearchMethod = "local" | "qdrant";
export type AIEmbeddingStatus = "pending" | "generated" | "failed";

export interface AIFeatureFlags {
  chatbot: boolean;
  agentSuggest: boolean;
  ticketClassify: boolean;
}

export type AIChatbotPosition = "bottom-right" | "bottom-left";

export interface AIChatbotConfig {
  welcomeMessage: string;
  fallbackMessage: string;
  placeholder: string;
  position: AIChatbotPosition;
  primaryColor: string;
  /** Secondary brand color used for the header gradient + send button. */
  accentColor: string;
  /** Title shown in the widget header. Falls back to businessName. */
  headerTitle: string;
  /** Small footer label, e.g. "Powered by Acme". */
  footerText: string;
  /** Hosted image URL shown as the header avatar. Empty = Sparkles icon. */
  headerAvatarUrl: string;
  /** Expanded embed iframe width, in pixels. */
  widgetWidth: number;
  /** Expanded embed iframe height, in pixels. */
  widgetHeight: number;
  rateLimitPerMinute: number;
  ticketRateLimitPerHour: number;
  showPoweredBy: boolean;
}

/** @deprecated runtime no-op since the agentic loop replaced strict/hybrid */
export type AIGenerativeMode = "off" | "strict" | "hybrid";

/**
 * A "site" is a knowledge scope, not a tenant: one admin / one database, but
 * sources (web crawls, files, Q&A pairs) can be assigned to a site so the
 * widget embedded on that site answers only from its sources + global ones.
 * The embed snippet carries the site `key`; the chat API resolves key → site.
 */
export interface AISite {
  _id: ObjectId;
  name: string;
  /** Opaque key embedded in the widget snippet (e.g. "ste_ab12…"). Unique. */
  key: string;
  /** Optional allowlist of host origins this key may be embedded on. */
  domains?: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AISitePublic {
  _id: string;
  name: string;
  key: string;
  domains: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AIKnowledgeSourceType =
  | "qa"
  | "kb"
  | "service"
  | "resolved_ticket"
  | "web_page"
  | "file";

export interface AIKnowledgeEmbedding {
  _id: ObjectId;
  sourceType: AIKnowledgeSourceType;
  sourceId: string;
  title: string;
  content: string;
  embedding: number[];
  /** Dimensionality of `embedding`; used to guard against model changes. */
  embeddingDim: number;
  /** Embedding model that produced `embedding` (e.g. text-embedding-3-small). */
  embeddingModel: string;
  /** For `web_page` chunks: the parent {@link AIWebSource} id they belong to. */
  webSourceId?: string;
  /** For `web_page` chunks: the page URL the chunk was extracted from. */
  url?: string;
  /** For `file` chunks: the parent {@link AIFile} id they belong to. */
  fileId?: string;
  /**
   * Owning {@link AISite} id. Absent ⇒ Global (answerable on every embedded
   * site). Retrieval scopes results to the request's site OR global rows.
   */
  siteId?: string;
  updatedAt: Date;
}

export type AIWebSourceStatus = "queued" | "crawling" | "ready" | "failed";

/**
 * A website the operator added as a knowledge source. A background crawl walks
 * the domain, chunks each page and writes `web_page` rows into
 * {@link AIKnowledgeEmbedding}, so the agent's search can answer from it.
 */
export interface AIWebSource {
  _id: ObjectId;
  /** Display name shown in the admin list. */
  name: string;
  /** Entry URL the crawl starts from. */
  url: string;
  /** Normalized host used to scope the crawl (entire-domain). */
  host: string;
  /** Owning {@link AISite} id; absent ⇒ Global. */
  siteId?: string;
  status: AIWebSourceStatus;
  /** Hard cap on pages fetched per crawl. */
  maxPages: number;
  /**
   * Firecrawl job id for the in-flight crawl, persisted so a server restart
   * mid-crawl can reconnect to the still-running cloud job instead of losing
   * the work. Null once the crawl + indexing fully finishes.
   */
  firecrawlJobId?: string | null;
  /** Pages successfully fetched and parsed in the last crawl. */
  pagesIndexed: number;
  /** Total embedded chunks produced by the last crawl. */
  chunksIndexed: number;
  /** Live progress while `status === "crawling"`. */
  progress?: { visited: number; total: number; phase: string } | null;
  error?: string | null;
  lastCrawledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface AIWebSourcePublic {
  _id: string;
  name: string;
  url: string;
  host: string;
  siteId?: string;
  status: AIWebSourceStatus;
  maxPages: number;
  pagesIndexed: number;
  chunksIndexed: number;
  progress?: { visited: number; total: number; phase: string } | null;
  error?: string | null;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AIFileStatus = "processing" | "ready" | "failed";

/**
 * An uploaded document (PDF, spreadsheet, doc, text) added as a knowledge
 * source. On upload it is parsed to text, chunked and embedded into
 * {@link AIKnowledgeEmbedding} as `file` rows. The original bytes are not
 * retained — re-embedding works from the stored chunks.
 */
export interface AIFile {
  _id: ObjectId;
  /** Display name (defaults to the original filename). */
  name: string;
  filename: string;
  /** Normalized kind: pdf | spreadsheet | document | text. */
  fileType: string;
  sizeBytes: number;
  status: AIFileStatus;
  chunksIndexed: number;
  /** Owning {@link AISite} id; absent ⇒ Global. */
  siteId?: string;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AIFilePublic {
  _id: string;
  name: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  status: AIFileStatus;
  chunksIndexed: number;
  siteId?: string;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Evaluation / answer-quality measurement ───────────────────────────────

export type AIEvalVerdict = "pass" | "partial" | "fail";
export type AIEvalRunStatus = "running" | "completed" | "failed";

/** A graded test: a question plus the answer the agent should produce. */
export interface AIEvalCase {
  _id: ObjectId;
  question: string;
  expectedAnswer: string;
  category?: string;
  /** Optional site scope to test this case against; absent = global/all scope. */
  siteId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AIEvalCasePublic {
  _id: string;
  question: string;
  expectedAnswer: string;
  category?: string;
  siteId?: string;
  createdAt: string;
  updatedAt: string;
}

/** One case scored within a run (LLM-as-judge vs the expected answer). */
export interface AIEvalCaseResult {
  caseId: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  siteId?: string;
  /** 0–100 correctness/completeness vs expected, from the judge model. */
  score: number;
  verdict: AIEvalVerdict;
  reasoning: string;
  outcome: AIChatOutcome;
  toolsUsed: string[];
  iterations: number;
  latencyMs: number;
}

export interface AIEvalRun {
  _id: ObjectId;
  status: AIEvalRunStatus;
  totalCases: number;
  passed: number;
  partial: number;
  failed: number;
  /** Mean score across cases (0–100). */
  avgScore: number;
  /** Score at/above which a case counts as a pass. */
  passThreshold: number;
  results: AIEvalCaseResult[];
  error?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
  createdBy: string;
}

export interface AIEvalRunPublic {
  _id: string;
  status: AIEvalRunStatus;
  totalCases: number;
  passed: number;
  partial: number;
  failed: number;
  avgScore: number;
  passThreshold: number;
  results: AIEvalCaseResult[];
  error?: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AIAgentConfig {
  enabled: boolean;
  maxIterations: number;
  /** When false the resolved_ticket knowledge source is excluded (PII control). */
  indexResolvedTickets: boolean;
}

export interface AIKnowledgeSearchResult {
  sourceType: AIKnowledgeSourceType;
  sourceId: string;
  title: string;
  content: string;
  score: number;
  /** Public URL of the source page, when one exists (web_page chunks). */
  url?: string;
}

/** Index size + search-backend snapshot used to recommend Qdrant at scale. */
export interface RetrievalIndexHealth {
  /** Total vectors stored in the knowledge index. */
  vectorCount: number;
  /** Configured vector search method. */
  method: AIVectorSearchMethod;
  /** True when Qdrant is selected AND reachable (env configured). */
  qdrantActive: boolean;
  /** Vector count above which local cosine should move to Qdrant. */
  warnThreshold: number;
  /** True when effectively on local cosine and the index is past the threshold. */
  recommendQdrant: boolean;
}

export interface AISettings {
  _id: ObjectId;
  /** @deprecated use chatProvider/embeddingProvider */
  provider: AIProvider;
  apiKeyEncrypted: string;
  chatModel: AIChatModel;
  embeddingModel: AIEmbeddingModel;
  confidenceThreshold: number;
  maxTokens: number;
  temperature: number;
  features: AIFeatureFlags;
  businessName: string;
  businessDescription: string;
  systemPrompt: string;
  vectorSearchMethod: AIVectorSearchMethod;
  chatbot: AIChatbotConfig;
  /** @deprecated runtime no-op since the agentic loop replaced strict/hybrid */
  generativeMode: AIGenerativeMode;
  // ─── Provider abstraction (OpenAI / Ollama, independently selectable) ───
  chatProvider: AIChatProviderKind;
  embeddingProvider: AIEmbeddingProviderKind;
  ollamaBaseUrl: string;
  ollamaChatModel?: string;
  ollamaEmbeddingModel?: string;
  ollamaApiKeyEncrypted?: string;
  agent: AIAgentConfig;
  /** Set when the embedding provider/model changed and the index is stale. */
  reindexRequired?: boolean;
  /** Retrieval strategy: pure vector, or vector + keyword fused (hybrid). */
  searchMode?: AISearchMode;
  /** Re-rank fused candidates with the chat model for higher precision. */
  rerankEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

/** Retrieval strategy for knowledge search. */
export type AISearchMode = "vector" | "hybrid";

export interface AISettingsPublic {
  chatModel: AIChatModel;
  embeddingModel: AIEmbeddingModel;
  confidenceThreshold: number;
  maxTokens: number;
  temperature: number;
  features: AIFeatureFlags;
  businessName: string;
  businessDescription: string;
  systemPrompt: string;
  vectorSearchMethod: AIVectorSearchMethod;
  chatbot: AIChatbotConfig;
  generativeMode: AIGenerativeMode;
  chatProvider: AIChatProviderKind;
  embeddingProvider: AIEmbeddingProviderKind;
  ollamaBaseUrl: string;
  ollamaChatModel: string;
  ollamaEmbeddingModel: string;
  agent: AIAgentConfig;
  reindexRequired: boolean;
  searchMode: AISearchMode;
  rerankEnabled: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string;
  hasOllamaApiKey: boolean;
}

export interface AIChatbotPublicConfig {
  enabled: boolean;
  welcomeMessage: string;
  fallbackMessage: string;
  placeholder: string;
  position: AIChatbotPosition;
  primaryColor: string;
  accentColor: string;
  headerTitle: string;
  footerText: string;
  headerAvatarUrl: string;
  widgetWidth: number;
  widgetHeight: number;
  businessName: string;
  showPoweredBy: boolean;
}

export type AIChatOutcome =
  | "answered_kb"
  | "answered_faq"
  | "answered_resolved_ticket"
  | "answered_general"
  | "escalated_ticket"
  | "no_answer";

export interface AIChatToolCall {
  name: string;
  /** Arguments with any PII-ish free text omitted/trimmed for the log. */
  argsRedacted?: Record<string, unknown>;
  ok: boolean;
}

/**
 * A citation surfaced to the customer beneath an answer: the title and public
 * URL of a knowledge source the agent retrieved while answering. Only sources
 * that carry a URL (indexed web pages) are cited, so every citation is
 * clickable and verifiable.
 */
export interface AIChatSource {
  title: string;
  url: string;
}

export interface AIChatLog {
  _id: ObjectId;
  visitorId: string;
  sessionId: string;
  userId?: string;
  /** Resolved site scope used for retrieval; absent = global/all scope. */
  siteId?: string;
  /** Embed snippet key presented by the widget, retained for diagnostics. */
  siteKey?: string;
  /** Host origin where the widget is embedded, when available. */
  host?: string;
  question: string;
  questionNormalized: string;
  /** Derived from `outcome` (answered_* => true) for back-compat analytics. */
  matched: boolean;
  outcome: AIChatOutcome;
  matchScore?: number;
  matchedPairId?: string;
  answer?: string;
  toolCalls?: AIChatToolCall[];
  /** Clickable web-page citations shown with the answer (if any). */
  sources?: AIChatSource[];
  iterations?: number;
  createdTicketId?: string;
  fallbackUsed?: boolean;
  ticketId?: string;
  feedback?: "up" | "down" | null;
  userAgent?: string;
  createdAt: Date;
}

export interface AIChatAnalyticsStats {
  total: number;
  matched: number;
  unmatched: number;
  escalated: number;
  matchRate: number;
  feedbackTotal: number;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackAccuracy: number | null;
  last24h: number;
  last7d: number;
  last30d: number;
}

export interface AIDomainAccuracyStats {
  key: string;
  siteId?: string;
  siteName: string;
  host?: string;
  total: number;
  answered: number;
  noAnswer: number;
  escalated: number;
  matchRate: number;
  feedbackTotal: number;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackAccuracy: number | null;
  lastSeen: Date;
}

export interface AIChatUnansweredGroup {
  question: string;
  count: number;
  lastSeen: Date;
}

export interface AITrainingPair {
  _id: ObjectId;
  question: string;
  answer: string;
  category: string;
  /** Owning {@link AISite} id; absent ⇒ Global. */
  siteId?: string;
  embedding?: number[];
  isActive: boolean;
  matchCount: number;
  lastMatchedAt: Date | null;
  embeddingStatus: AIEmbeddingStatus;
  embeddingError: string | null;
  /** Dimensionality of `embedding`; guards against embedding-model changes. */
  embeddingDim?: number;
  /** Embedding model that produced `embedding`. */
  embeddingModel?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface AITrainingPairPublic {
  _id: string;
  question: string;
  answer: string;
  category: string;
  siteId?: string;
  isActive: boolean;
  matchCount: number;
  lastMatchedAt: string | null;
  embeddingStatus: AIEmbeddingStatus;
  embeddingError: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AIMatchResult {
  _id: string;
  question: string;
  answer: string;
  category: string;
  score: number;
}

export interface AITestMatchResult {
  matched: boolean;
  reason?: string;
  bestMatch?: {
    question: string;
    answer: string;
    category: string;
    score: number;
  };
  allMatches: Array<{ question: string; score: number }>;
  threshold: number;
}
