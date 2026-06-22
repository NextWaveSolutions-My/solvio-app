const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

// Load environment variables
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

// Import better-auth's hashPassword
async function hashPassword(password) {
  const { hashPassword } = await import("better-auth/crypto");
  return await hashPassword(password);
}

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: node scripts/reset-password.js <email> <password>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || "support-app";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection("user");
    const accountsCollection = db.collection("account");

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = user.id || user._id.toString();
    console.log(`Found user: ${email}`);
    console.log(`User ID: ${userId}\n`);

    // Hash password with better-auth
    console.log("Hashing password with better-auth/crypto...");
    const hashedPassword = await hashPassword(newPassword);
    console.log(`✓ Password hashed\n`);

    // Update account
    const result = await accountsCollection.updateOne(
      { userId, providerId: "credential" },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Password updated successfully!`);
      console.log(`\nYou can now log in with:`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${newPassword}`);
    } else {
      console.error(`❌ Failed to update password`);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetPassword();
