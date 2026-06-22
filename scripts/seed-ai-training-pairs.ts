import * as fs from "fs";
import * as path from "path";
import { MongoClient, ObjectId } from "mongodb";

type SeedPair = {
  category: string;
  question: string;
  answer: string;
};

const TRAINING_PAIRS: SeedPair[] = [
  {
    category: "solvio-overview",
    question: "What is Solvio?",
    answer:
      "Solvio is a support ticket and customer support platform that combines ticket tracking, knowledge base, real-time messaging, notifications, and team workflows in one system.",
  },
  {
    category: "solvio-overview",
    question: "What does Solvio do?",
    answer:
      "Solvio helps teams manage customer support with tickets, threaded conversations, attachments, knowledge base content, notifications, and role-based workflows.",
  },
  {
    category: "solvio-overview",
    question: "Who is Solvio for?",
    answer:
      "Solvio is designed for teams that need a structured support workflow with customers, support staff, and admins working inside the same connected system.",
  },
  {
    category: "solvio-features",
    question: "What features does Solvio include?",
    answer:
      "Solvio includes ticket tracking, threaded comments, file attachments, knowledge base browsing, real-time messaging, notifications, role-based access, analytics, and support workflow tools.",
  },
  {
    category: "solvio-features",
    question: "Does Solvio have a knowledge base?",
    answer:
      "Yes. Solvio includes a searchable knowledge base so customers can find setup guides, known issues, and common answers before opening a ticket.",
  },
  {
    category: "solvio-features",
    question: "Can customers create tickets in Solvio?",
    answer:
      "Yes. Customers can create support tickets, follow updates, comment on their tickets, and upload attachments when enabled.",
  },
  {
    category: "solvio-features",
    question: "Does Solvio support live messaging?",
    answer:
      "Yes. Solvio includes real-time messaging and notifications so customers and support teams can communicate without losing context.",
  },
  {
    category: "solvio-features",
    question: "Can I upload files or screenshots in Solvio?",
    answer:
      "Yes. Solvio supports file attachments so users can share screenshots, logs, and supporting files during support conversations.",
  },
  {
    category: "solvio-features",
    question: "Does Solvio support meetings or follow-up discussions?",
    answer:
      "Yes. Solvio supports moving complex issues into deeper follow-up while keeping the request history connected to the same workflow.",
  },
  {
    category: "solvio-roles",
    question: "What user roles does Solvio have?",
    answer:
      "Solvio uses customer, support, and admin roles. Customers manage their own requests, support staff handle operations, and admins have full control.",
  },
  {
    category: "solvio-roles",
    question: "Can support agents see all tickets?",
    answer:
      "Support users can view and manage tickets according to their role permissions, while admins have full access across the system.",
  },
  {
    category: "solvio-setup",
    question: "What do I need to run Solvio?",
    answer:
      "To run Solvio you need Node.js 20 or later, MongoDB, Git, and a persistent Node hosting environment for production.",
  },
  {
    category: "solvio-setup",
    question: "What environment variables are required for Solvio?",
    answer:
      "At minimum Solvio needs MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL, and ADMIN_EMAIL configured in your environment file.",
  },
  {
    category: "solvio-setup",
    question: "How do I install Solvio?",
    answer:
      "The basic setup is: install dependencies with pnpm install, copy .env.example to .env.local, add the required environment variables, run pnpm run setup:indexes, then start the app with pnpm run dev.",
  },
  {
    category: "solvio-setup",
    question: "How do I create the first admin account in Solvio?",
    answer:
      "Set ADMIN_EMAIL in your environment, then sign up using that same email address. That account becomes the admin user.",
  },
  {
    category: "solvio-setup",
    question: "How do I start Solvio in development?",
    answer:
      "After configuring the environment and indexes, start Solvio in development with pnpm run dev.",
  },
  {
    category: "solvio-hosting",
    question: "Can I deploy Solvio on serverless hosting?",
    answer:
      "Solvio's realtime features depend on a long-running Socket.IO server process, so it should be deployed on a persistent Node environment such as a VPS, container, or similar host.",
  },
  {
    category: "solvio-hosting",
    question: "Why is realtime not working in production?",
    answer:
      "Realtime issues usually happen when the app is not running as a long-lived Node process. Solvio's Socket.IO server needs persistent hosting and should be started with the custom app server.",
  },
  {
    category: "solvio-hosting",
    question: "How do I start Solvio in production?",
    answer:
      "Build the app with pnpm run build and start it with pnpm run start on a persistent Node host.",
  },
  {
    category: "solvio-troubleshooting",
    question: "Why can't Solvio connect to MongoDB?",
    answer:
      "If MongoDB connection fails, verify MONGODB_URI and your database configuration in the environment file.",
  },
  {
    category: "propertypro-overview",
    question: "What is PropertyPro?",
    answer:
      "PropertyPro is a complete property management system for managing properties, tenants, leases, invoices, payments, messaging, events, maintenance, and reporting.",
  },
  {
    category: "propertypro-overview",
    question: "What does PropertyPro include?",
    answer:
      "PropertyPro includes property management, tenant management, lease workflows, payment processing, maintenance tools, messaging, event management, analytics, and role-based access.",
  },
  {
    category: "propertypro-overview",
    question: "Who is PropertyPro built for?",
    answer:
      "PropertyPro is designed for property managers, landlords, and real estate professionals who need a scalable and modern management platform.",
  },
  {
    category: "propertypro-features",
    question: "Can PropertyPro manage multiple properties and units?",
    answer:
      "Yes. PropertyPro supports unlimited properties and units with detailed property profiles, tracking, filtering, and management tools.",
  },
  {
    category: "propertypro-features",
    question: "Does PropertyPro include tenant management?",
    answer:
      "Yes. PropertyPro supports tenant applications, screening, communication, document management, and a self-service tenant portal.",
  },
  {
    category: "propertypro-features",
    question: "Does PropertyPro support lease management?",
    answer:
      "Yes. PropertyPro includes lease creation, renewals, automated workflows, digital agreements, and lease tracking.",
  },
  {
    category: "propertypro-features",
    question: "How does payment processing work in PropertyPro?",
    answer:
      "PropertyPro supports secure payment processing with Stripe integration, automated billing, payment tracking, multiple payment methods, and receipt history.",
  },
  {
    category: "propertypro-features",
    question: "Does PropertyPro have maintenance management?",
    answer:
      "Yes. PropertyPro includes maintenance request handling, work order workflows, vendor management, priority tracking, photo documentation, and cost tracking.",
  },
  {
    category: "propertypro-features",
    question: "Does PropertyPro support messaging and announcements?",
    answer:
      "Yes. PropertyPro includes real-time messaging, group chats, one-to-one conversations, announcements, and notification tracking.",
  },
  {
    category: "propertypro-features",
    question: "Can PropertyPro manage events and appointments?",
    answer:
      "Yes. PropertyPro includes event management features such as RSVP tracking, automated reminders, and Google Calendar sync.",
  },
  {
    category: "propertypro-features",
    question: "Does PropertyPro include reports and analytics?",
    answer:
      "Yes. PropertyPro includes real-time dashboards, financial reports, occupancy insights, and performance analytics.",
  },
  {
    category: "propertypro-tech",
    question: "What tech stack does PropertyPro use?",
    answer:
      "PropertyPro is built with Next.js 15, TypeScript, Tailwind CSS, MongoDB, NextAuth, and Stripe, with support for integrations such as Cloudflare R2, Twilio, Nodemailer, and Google Calendar.",
  },
  {
    category: "propertypro-tech",
    question: "Is PropertyPro mobile responsive?",
    answer:
      "Yes. PropertyPro is designed to be fully responsive and usable across desktop and mobile devices.",
  },
  {
    category: "propertypro-tech",
    question: "What user roles are available in PropertyPro?",
    answer:
      "PropertyPro includes admin, manager, and tenant roles with different permissions for operations, reporting, and self-service access.",
  },
  {
    category: "propertypro-customization",
    question: "Can I customize PropertyPro?",
    answer:
      "Yes. PropertyPro includes source code and is designed with a modern, extensible architecture so it can be customized for project needs.",
  },
  {
    category: "propertypro-licensing",
    question: "Does PropertyPro include source code?",
    answer:
      "Yes. PropertyPro includes the full Next.js source code along with the core features and screens.",
  },
  {
    category: "general-scope",
    question: "What can you help me with?",
    answer:
      "I can help with Solvio and PropertyPro product information, setup steps, hosting requirements, core features, and common support questions.",
  },
  {
    category: "general-scope",
    question: "Hello",
    answer:
      "Hi! I can help with Solvio and PropertyPro features, setup, hosting, and support questions. What would you like to know?",
  },
  {
    category: "general-scope",
    question: "Hi",
    answer:
      "Hi! I can help with Solvio and PropertyPro features, setup, hosting, and support questions. What would you like to know?",
  },
];

function loadEnvFile(fileName: string) {
  const envPath = path.join(__dirname, "..", fileName);
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function seedAITrainingPairs() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || "support-app";

  if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("ai_training_pairs");
    const now = new Date();
    const actor = "seed:ai-training-pairs";

    let created = 0;
    let updated = 0;

    for (const pair of TRAINING_PAIRS) {
      const existing = await collection.findOne({
        question: {
          $regex: `^${escapeRegex(pair.question)}$`,
          $options: "i",
        },
      });

      if (existing) {
        await collection.updateOne(
          { _id: existing._id },
          {
            $set: {
              question: pair.question.trim(),
              answer: pair.answer.trim(),
              category: pair.category,
              isActive: true,
              updatedAt: now,
              updatedBy: actor,
            },
          }
        );
        updated++;
        continue;
      }

      await collection.insertOne({
        _id: new ObjectId(),
        question: pair.question.trim(),
        answer: pair.answer.trim(),
        category: pair.category,
        isActive: true,
        matchCount: 0,
        lastMatchedAt: null,
        embeddingStatus: "pending",
        embeddingError: null,
        createdAt: now,
        updatedAt: now,
        createdBy: actor,
        updatedBy: actor,
      });
      created++;
    }

    console.log(`Seeded AI training pairs into "${dbName}".`);
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(
      "Next steps: regenerate embeddings and reindex the knowledge base from the AI Support Agent admin page."
    );
  } catch (error) {
    console.error("Failed to seed AI training pairs:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

void seedAITrainingPairs();
