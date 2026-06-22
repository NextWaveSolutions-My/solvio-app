/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Setup MongoDB Indexes
 *
 * This script creates necessary indexes for optimal query performance.
 * Run with: node scripts/setup-mongodb-indexes.js
 *
 * The script automatically loads environment variables from .env.local
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");

  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file not found");
    console.error(`Expected location: ${envPath}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    // Skip comments and empty lines
    if (line.trim().startsWith("#") || !line.trim()) {
      return;
    }

    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });

  console.log("✅ Loaded environment variables from .env.local\n");
}

async function setupIndexes() {
  // Load environment variables first
  loadEnvFile();

  console.log("🔧 Setting up MongoDB indexes...\n");

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || "support-app";

  if (!uri) {
    console.error("❌ MONGODB_URI not found in .env.local");
    console.error("Please add MONGODB_URI to your .env.local file");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(dbName);

    // ========================================================================
    // USER COLLECTION INDEXES
    // ========================================================================
    console.log("📋 Setting up indexes for 'user' collection...");
    const usersCollection = db.collection("user");

    // Index on 'id' field (used for lookups by better-auth)
    await usersCollection.createIndex({ id: 1 }, { name: "idx_user_id" });
    console.log("  ✅ Created index: idx_user_id");

    // Index on 'email' field (used for login and lookups)
    await usersCollection.createIndex(
      { email: 1 },
      { name: "idx_user_email", unique: true }
    );
    console.log("  ✅ Created index: idx_user_email (unique)");

    // Index on 'role' field (used for filtering users by role)
    await usersCollection.createIndex({ role: 1 }, { name: "idx_user_role" });
    console.log("  ✅ Created index: idx_user_role");

    // ========================================================================
    // TICKETS COLLECTION INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for 'tickets' collection...");
    const ticketsCollection = db.collection("tickets");

    // Index on 'customerId' field
    await ticketsCollection.createIndex(
      { customerId: 1 },
      { name: "idx_tickets_customer_id" }
    );
    console.log("  ✅ Created index: idx_tickets_customer_id");

    // Index on 'assignedToId' field
    await ticketsCollection.createIndex(
      { assignedToId: 1 },
      { name: "idx_tickets_assigned_to_id" }
    );
    console.log("  ✅ Created index: idx_tickets_assigned_to_id");

    // Index on 'status' field
    await ticketsCollection.createIndex(
      { status: 1 },
      { name: "idx_tickets_status" }
    );
    console.log("  ✅ Created index: idx_tickets_status");

    // Index on 'priority' field
    await ticketsCollection.createIndex(
      { priority: 1 },
      { name: "idx_tickets_priority" }
    );
    console.log("  ✅ Created index: idx_tickets_priority");

    // Compound index for common queries (status + priority + createdAt)
    await ticketsCollection.createIndex(
      { status: 1, priority: -1, createdAt: -1 },
      { name: "idx_tickets_status_priority_created" }
    );
    console.log("  ✅ Created index: idx_tickets_status_priority_created");

    // ========================================================================
    // SESSION COLLECTION INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for 'session' collection...");
    const sessionsCollection = db.collection("session");

    // Index on 'userId' field
    await sessionsCollection.createIndex(
      { userId: 1 },
      { name: "idx_session_user_id" }
    );
    console.log("  ✅ Created index: idx_session_user_id");

    // Index on 'expiresAt' field (for cleanup)
    await sessionsCollection.createIndex(
      { expiresAt: 1 },
      { name: "idx_session_expires_at" }
    );
    console.log("  ✅ Created index: idx_session_expires_at");

    // ========================================================================
    // ACCOUNT COLLECTION INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for 'account' collection...");
    const accountsCollection = db.collection("account");

    // Index on 'userId' field
    await accountsCollection.createIndex(
      { userId: 1 },
      { name: "idx_account_user_id" }
    );
    console.log("  ✅ Created index: idx_account_user_id");

    // Compound index on userId + providerId
    await accountsCollection.createIndex(
      { userId: 1, providerId: 1 },
      { name: "idx_account_user_provider" }
    );
    console.log("  ✅ Created index: idx_account_user_provider");

    // ========================================================================
    // VERIFICATION COLLECTION INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for 'verification' collection...");
    const verificationCollection = db.collection("verification");

    // Index on 'identifier' field (email)
    await verificationCollection.createIndex(
      { identifier: 1 },
      { name: "idx_verification_identifier" }
    );
    console.log("  ✅ Created index: idx_verification_identifier");

    // Index on 'expiresAt' field (for cleanup)
    await verificationCollection.createIndex(
      { expiresAt: 1 },
      { name: "idx_verification_expires_at" }
    );
    console.log("  ✅ Created index: idx_verification_expires_at");

    // ========================================================================
    // CHAT COLLECTION INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for chat collections...");

    const conversationsCollection = db.collection("conversations");
    await conversationsCollection.createIndex(
      { id: 1 },
      { name: "idx_conversations_id", unique: true }
    );
    console.log("  ✅ Created index: idx_conversations_id (unique)");

    await conversationsCollection.createIndex(
      { participantIds: 1, lastMessageAt: -1 },
      { name: "idx_conversations_participants_last_message" }
    );
    console.log(
      "  ✅ Created index: idx_conversations_participants_last_message"
    );

    const messagesCollection = db.collection("messages");
    await messagesCollection.createIndex(
      { id: 1 },
      { name: "idx_messages_id", unique: true }
    );
    console.log("  ✅ Created index: idx_messages_id (unique)");

    await messagesCollection.createIndex(
      { conversationId: 1, createdAt: 1 },
      { name: "idx_messages_conversation_created_at" }
    );
    console.log("  ✅ Created index: idx_messages_conversation_created_at");

    await messagesCollection.createIndex(
      { conversationId: 1, senderId: 1, createdAt: -1 },
      { name: "idx_messages_conversation_sender_created_at" }
    );
    console.log(
      "  ✅ Created index: idx_messages_conversation_sender_created_at"
    );

    // ========================================================================
    // COMMENTS & NOTIFICATIONS INDEXES
    // ========================================================================
    console.log("\n📋 Setting up indexes for comments and notifications...");

    const commentsCollection = db.collection("comments");
    await commentsCollection.createIndex(
      { ticketId: 1, createdAt: 1 },
      { name: "idx_comments_ticket_created_at" }
    );
    console.log("  ✅ Created index: idx_comments_ticket_created_at");

    const notificationsCollection = db.collection("notifications");
    await notificationsCollection.createIndex(
      { userId: 1, sentAt: -1 },
      { name: "idx_notifications_user_sent_at" }
    );
    console.log("  ✅ Created index: idx_notifications_user_sent_at");

    await notificationsCollection.createIndex(
      { userId: 1, read: 1, sentAt: -1 },
      { name: "idx_notifications_user_read_sent_at" }
    );
    console.log("  ✅ Created index: idx_notifications_user_read_sent_at");

    const pushSubscriptionsCollection = db.collection("push_subscriptions");
    await pushSubscriptionsCollection.createIndex(
      { endpoint: 1 },
      { name: "idx_push_subscriptions_endpoint", unique: true }
    );
    console.log("  ✅ Created index: idx_push_subscriptions_endpoint (unique)");

    await pushSubscriptionsCollection.createIndex(
      { userId: 1, updatedAt: -1 },
      { name: "idx_push_subscriptions_user_updated_at" }
    );
    console.log("  ✅ Created index: idx_push_subscriptions_user_updated_at");

    // ========================================================================
    // AI SUPPORT AGENT INDEXES
    // ========================================================================
    console.log("\n🤖 Setting up indexes for the AI support agent...");

    // Unified knowledge index. The { sourceType, sourceId } pair is the upsert
    // key (findOneAndUpdate) and must be unique so concurrent mirrors can't
    // create duplicate rows; it also serves sourceType-only filters as a prefix.
    const aiKnowledgeCollection = db.collection("ai_knowledge_embeddings");
    await aiKnowledgeCollection.createIndex(
      { sourceType: 1, sourceId: 1 },
      { name: "idx_ai_knowledge_source", unique: true }
    );
    console.log("  ✅ Created index: idx_ai_knowledge_source (unique)");

    // Source-scoped bulk deletes (a whole web source / file).
    await aiKnowledgeCollection.createIndex(
      { webSourceId: 1 },
      { name: "idx_ai_knowledge_web_source" }
    );
    console.log("  ✅ Created index: idx_ai_knowledge_web_source");

    await aiKnowledgeCollection.createIndex(
      { fileId: 1 },
      { name: "idx_ai_knowledge_file" }
    );
    console.log("  ✅ Created index: idx_ai_knowledge_file");

    // Per-site retrieval scoping: filter rows by sourceType + owning site
    // (absent siteId ⇒ Global). Sparse so global rows aren't all indexed.
    await aiKnowledgeCollection.createIndex(
      { sourceType: 1, siteId: 1 },
      { name: "idx_ai_knowledge_source_type_site", sparse: true }
    );
    console.log("  ✅ Created index: idx_ai_knowledge_source_type_site");

    // Keyword (BM25-style) leg of hybrid search. Matches the spec created lazily
    // at runtime by ensureTextIndex() so the two never conflict.
    await aiKnowledgeCollection.createIndex(
      { title: "text", content: "text" },
      { name: "knowledge_text_index", weights: { title: 3, content: 1 } }
    );
    console.log("  ✅ Created index: knowledge_text_index (text)");

    // Curated Q&A pairs: reindex filters by isActive; regenerate filters by
    // embeddingStatus.
    const aiPairsCollection = db.collection("ai_training_pairs");
    await aiPairsCollection.createIndex(
      { isActive: 1 },
      { name: "idx_ai_pairs_active" }
    );
    console.log("  ✅ Created index: idx_ai_pairs_active");

    await aiPairsCollection.createIndex(
      { embeddingStatus: 1 },
      { name: "idx_ai_pairs_embedding_status" }
    );
    console.log("  ✅ Created index: idx_ai_pairs_embedding_status");

    // Sites: resolve the embed snippet's key → site on every scoped chat.
    const aiSitesCollection = db.collection("ai_sites");
    await aiSitesCollection.createIndex(
      { key: 1 },
      { name: "idx_ai_sites_key", unique: true }
    );
    console.log("  ✅ Created index: idx_ai_sites_key (unique)");

    // Admin list collections: filter by status, order by recency.
    const aiWebSourcesCollection = db.collection("ai_web_sources");
    await aiWebSourcesCollection.createIndex(
      { status: 1, createdAt: -1 },
      { name: "idx_ai_web_sources_status_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_web_sources_status_created_at");

    const aiFilesCollection = db.collection("ai_files");
    await aiFilesCollection.createIndex(
      { status: 1, createdAt: -1 },
      { name: "idx_ai_files_status_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_files_status_created_at");

    await aiFilesCollection.createIndex(
      { createdAt: -1 },
      { name: "idx_ai_files_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_files_created_at");

    const aiEvalCasesCollection = db.collection("ai_eval_cases");
    await aiEvalCasesCollection.createIndex(
      { createdAt: -1 },
      { name: "idx_ai_eval_cases_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_eval_cases_created_at");

    await aiEvalCasesCollection.createIndex(
      { siteId: 1, createdAt: -1 },
      { name: "idx_ai_eval_cases_site_created_at", sparse: true }
    );
    console.log("  ✅ Created index: idx_ai_eval_cases_site_created_at");

    const aiEvalRunsCollection = db.collection("ai_eval_runs");
    await aiEvalRunsCollection.createIndex(
      { createdAt: -1 },
      { name: "idx_ai_eval_runs_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_eval_runs_created_at");

    // Chatbot logs: highest-write AI collection. Recent-logs list sorts by
    // recency; analytics counts filter by matched + time window; the
    // unanswered-questions report groups unmatched logs by normalized text.
    const aiChatLogsCollection = db.collection("ai_chat_logs");
    await aiChatLogsCollection.createIndex(
      { createdAt: -1 },
      { name: "idx_ai_chat_logs_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_chat_logs_created_at");

    await aiChatLogsCollection.createIndex(
      { matched: 1, createdAt: -1 },
      { name: "idx_ai_chat_logs_matched_created_at" }
    );
    console.log("  ✅ Created index: idx_ai_chat_logs_matched_created_at");

    await aiChatLogsCollection.createIndex(
      { questionNormalized: 1 },
      { name: "idx_ai_chat_logs_question_normalized" }
    );
    console.log("  ✅ Created index: idx_ai_chat_logs_question_normalized");

    await aiChatLogsCollection.createIndex(
      { siteId: 1, host: 1, createdAt: -1 },
      { name: "idx_ai_chat_logs_site_host_created_at", sparse: true }
    );
    console.log("  ✅ Created index: idx_ai_chat_logs_site_host_created_at");

    await aiChatLogsCollection.createIndex(
      { feedback: 1, createdAt: -1 },
      { name: "idx_ai_chat_logs_feedback_created_at", sparse: true }
    );
    console.log("  ✅ Created index: idx_ai_chat_logs_feedback_created_at");

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n✅ All indexes created successfully!");
    console.log("\n📊 Index Summary:");

    const collections = [
      "user",
      "tickets",
      "session",
      "account",
      "verification",
      "conversations",
      "messages",
      "comments",
      "notifications",
      "push_subscriptions",
      "ai_knowledge_embeddings",
      "ai_training_pairs",
      "ai_web_sources",
      "ai_files",
      "ai_sites",
      "ai_eval_cases",
      "ai_eval_runs",
      "ai_chat_logs",
    ];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      console.log(`\n${collectionName}:`);
      indexes.forEach((index) => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error setting up indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupIndexes();
