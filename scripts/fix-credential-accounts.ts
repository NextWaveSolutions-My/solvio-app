/**
 * Fix Credential Accounts Script
 * Ensures credential accounts use accountId = userId and are properly linked.
 *
 * Run:
 *   npx tsx scripts/fix-credential-accounts.ts
 *   or npm run fix:credential
 */
import * as fs from "fs";
import * as path from "path";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";

// Load env from .env.local if present
try {
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
} catch {
  // ignore
}

async function run() {
  console.log("🔧 Normalizing credential accounts (accountId=userId)...");
  const accounts = await getCollection("account");
  const users = await getCollection("user");

  const cursor = accounts.find({ providerId: "credential" } as any);
  let fixed = 0;
  let skipped = 0;
  let missing = 0;

  for await (const acc of cursor) {
    const userId = acc.userId?.toString?.() ?? acc.userId;
    if (!userId) {
      skipped++;
      continue;
    }
    // Ensure user exists
    let user = await users.findOne({ id: userId } as any);
    if (!user) {
      if (ObjectId.isValid(userId)) {
        user = await users.findOne({ _id: new ObjectId(userId) } as any);
      }
    }
    if (!user) {
      missing++;
      continue;
    }
    // If accountId differs from userId, fix it
    const currentAccountId = acc.accountId?.toString?.() ?? acc.accountId;
    if (currentAccountId !== userId) {
      await accounts.updateOne({ _id: acc._id } as any, {
        $set: { accountId: userId, updatedAt: new Date() },
      });
      fixed++;
      console.log(`✔️ Fixed account ${acc._id.toString()} for user ${userId}`);
    } else {
      skipped++;
    }
  }

  console.log("━".repeat(50));
  console.log("✅ Normalization complete");
  console.log(`Fixed:   ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Missing: ${missing} (credential account has no matching user)`);
  console.log("━".repeat(50));
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Normalization failed:", err);
  process.exit(1);
});
