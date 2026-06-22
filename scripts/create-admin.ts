/**
 * Script to update user roles in MongoDB
 * Run with: node scripts/create-admin.ts
 */

import { MongoClient } from "mongodb";

async function updateUserRoles() {
  console.log("🔧 Updating user roles...\n");

  const uri = process.env.MONGODB_URI || "mongodb://137.74.41.20:27017";
  const dbName = process.env.DATABASE_NAME || "support-app";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(dbName);
    const usersCollection = db.collection("user");

    // Update roles for test users
    const updates = [
      { email: "admin@test.com", role: "admin" },
      { email: "support@test.com", role: "support" },
    ];

    for (const update of updates) {
      const result = await usersCollection.updateOne(
        { email: update.email },
        { $set: { role: update.role } }
      );

      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${update.email} to role: ${update.role}`);
      } else {
        console.log(
          `⚠️  User ${update.email} not found. Please register this user first.`
        );
      }
    }

    console.log("\n🎉 User roles updated successfully!\n");
    console.log("📝 Test Users:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Admin:");
    console.log("  Email: admin@test.com");
    console.log("  Password: (use the password you registered with)");
    console.log("  Access: Full admin panel access");
    console.log("");
    console.log("Support:");
    console.log("  Email: support@test.com");
    console.log("  Password: (use the password you registered with)");
    console.log("  Access: Ticket management (no user management)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🌐 Test URLs:");
    console.log("  Register: http://localhost:3000/register");
    console.log("  Login: http://localhost:3000/login");
    console.log("  Admin Panel: http://localhost:3000/admin");
    console.log("");
    console.log("📌 Next Steps:");
    console.log("1. If you haven't already, register users with these emails");
    console.log("2. Run this script again to update their roles");
    console.log("3. Log in and test the admin panel");
    console.log("");
  } catch (error) {
    console.error("❌ Error updating user roles:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

updateUserRoles();
