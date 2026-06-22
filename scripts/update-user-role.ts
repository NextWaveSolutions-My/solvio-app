/**
 * Script to update a user's role
 * Usage: npx tsx scripts/update-user-role.ts <email> <role>
 * Example: npx tsx scripts/update-user-role.ts user@example.com support
 */

import { getCollection } from "@/lib/db";

async function updateUserRole(email: string, role: "customer" | "support" | "admin") {
  try {
    const usersCollection = await getCollection("user");
    
    const result = await usersCollection.updateOne(
      { email },
      { $set: { role } }
    );

    if (result.matchedCount === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    if (result.modifiedCount === 0) {
      console.log(`ℹ️  User "${email}" already has role "${role}"`);
    } else {
      console.log(`✅ Successfully updated user "${email}" to role "${role}"`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const role = process.argv[3] as "customer" | "support" | "admin";

if (!email || !role) {
  console.error("Usage: npx tsx scripts/update-user-role.ts <email> <role>");
  console.error("Example: npx tsx scripts/update-user-role.ts user@example.com support");
  console.error("Valid roles: customer, support, admin");
  process.exit(1);
}

if (!["customer", "support", "admin"].includes(role)) {
  console.error(`Invalid role: ${role}`);
  console.error("Valid roles: customer, support, admin");
  process.exit(1);
}

updateUserRole(email, role);

