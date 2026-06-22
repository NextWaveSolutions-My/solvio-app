/**
 * Seed Demo Accounts Script
 * Creates demo users for admin, support-agent, and customer roles
 *
 * Run with: npm run seed:demo
 * Or directly: npx tsx scripts/seed-demo-accounts.ts
 */

import { MongoClient, ObjectId } from "mongodb";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Demo account configurations
const DEMO_ACCOUNTS = [
  {
    email: "admin@demo.com",
    name: "Demo Admin",
    role: "admin",
    country: "United States",
    password: "admin123",
  },
  {
    email: "support@demo.com",
    name: "Demo Support Agent",
    role: "support",
    country: "United States",
    password: "support123",
  },
  {
    email: "customer@demo.com",
    name: "Demo Customer",
    role: "customer",
    country: "United States",
    password: "customer123",
  },
];

async function seedDemoAccounts() {
  console.log("🌱 Seeding demo accounts...\n");

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || "support-app";

  if (!uri) {
    console.error("❌ Error: MONGODB_URI environment variable is not set.");
    console.error(
      "   Make sure you have a .env.local file with MONGODB_URI defined."
    );
    console.error("\n   Example: MONGODB_URI=mongodb://your-server:27017");
    process.exit(1);
  }

  console.log(`📦 Database: ${dbName}`);
  console.log(
    `🔗 Connecting to: ${uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}\n`
  );

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(dbName);
    const usersCollection = db.collection("user");
    const accountsCollection = db.collection("account");

    // Import better-auth for proper user creation
    const { auth } = await import("../lib/auth");
    const { hashPassword } = await import("better-auth/crypto");

    const results = {
      created: [] as string[],
      skipped: [] as string[],
    };

    for (const account of DEMO_ACCOUNTS) {
      const existingUser = await usersCollection.findOne({
        email: account.email,
      });

      if (existingUser) {
        // For demo accounts, we delete and recreate to ensure correct credentials
        const userId = existingUser.id || existingUser._id.toString();

        // Delete existing account credentials
        await accountsCollection.deleteMany({ userId });

        // Delete the user
        await usersCollection.deleteOne({ email: account.email });

        console.log(
          `🗑️  Deleted existing ${account.email} for fresh recreation`
        );
      }

      // Create user using better-auth's signUpEmail API
      console.log(`🔐 Creating ${account.email} via better-auth...`);

      try {
        // Use better-auth's API to create the user properly
        await auth.api.signUpEmail({
          body: {
            email: account.email,
            password: account.password,
            name: account.name,
          },
        });

        // Update the user with role and other fields
        await usersCollection.updateOne(
          { email: account.email },
          {
            $set: {
              role: account.role,
              country: account.country,
              emailVerified: true, // Demo accounts are pre-verified
              updatedAt: new Date(),
            },
          }
        );

        results.created.push(account.email);
        console.log(`✅ Created ${account.email} - Role: ${account.role}`);
      } catch (error: any) {
        console.error(`❌ Failed to create ${account.email}:`, error.message);
      }
    }

    // Print summary
    console.log("\n" + "━".repeat(50));
    console.log("📊 SEED SUMMARY");
    console.log("━".repeat(50));
    console.log(`Created: ${results.created.length}`);
    console.log(`Skipped: ${results.skipped.length}`);

    console.log("\n" + "━".repeat(50));
    console.log("📝 DEMO ACCOUNTS");
    console.log("━".repeat(50));

    console.log("\n👤 Admin Account:");
    console.log("   Email:    admin@demo.com");
    console.log("   Password: admin123");
    console.log("   Access:   Full admin panel access");

    console.log("\n👥 Support Agent Account:");
    console.log("   Email:    support@demo.com");
    console.log("   Password: support123");
    console.log("   Access:   Ticket management (no user management)");

    console.log("\n🧑‍💻 Customer Account:");
    console.log("   Email:    customer@demo.com");
    console.log("   Password: customer123");
    console.log("   Access:   Customer dashboard, create tickets");

    console.log("\n" + "━".repeat(50));
    console.log("🌐 TEST URLS");
    console.log("━".repeat(50));
    console.log("Login:        http://localhost:3000/login");
    console.log("Admin Panel:  http://localhost:3000/admin");
    console.log("Dashboard:    http://localhost:3000/dashboard");
    console.log("━".repeat(50));

    console.log("\n🎉 Demo accounts seeded successfully!\n");
  } catch (error) {
    console.error("❌ Error seeding demo accounts:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

seedDemoAccounts();
