# Scripts Directory

This directory contains utility scripts for database management and debugging.

## Available Scripts

### 1. Fix User IDs

**File:** `fix-user-ids.js`

**Purpose:** Adds missing `id` field to existing users in the database.

**When to use:**

- After upgrading from an older version
- When users show as "Unknown" in the UI
- When user lookups are failing

**How to run:**

```bash
node --env-file=.env.local scripts/fix-user-ids.js
```

**What it does:**

- Finds all users without an `id` field
- Adds `id` field equal to `_id.toString()` for each user
- Ensures all future user lookups work correctly

**Output:**

```
🔧 Fixing user IDs...
✅ Connected to MongoDB
Found 6 users without 'id' field
✅ Updated user admin@example.com - added id: 690de8cbe2154eb8f2941039
✅ Updated user user@example.com - added id: 690df2c154dc56ea58e70a21
...
✅ Updated 6 users
✅ Disconnected from MongoDB
```

---

### 2. Debug Users

**File:** `debug-users.js`

**Purpose:** Displays all users and tickets in the database and checks if customer IDs match.

**When to use:**

- Troubleshooting user display issues
- Verifying database consistency
- Checking user-ticket relationships

**How to run:**

```bash
node --env-file=.env.local scripts/debug-users.js
```

**What it does:**

- Lists all users with their `_id`, `id`, email, name, and role
- Lists all tickets with their customer IDs
- Checks if each ticket's customer ID matches a user's `id`
- Reports any mismatches

**Output:**

```
🔍 Debugging user data...
✅ Connected to MongoDB

📋 Users in database:
Found 6 users

User:
  _id: 690de8cbe2154eb8f2941039
  id: 690de8cbe2154eb8f2941039
  email: admin@example.com
  name: Admin User
  role: admin
...

📋 Tickets in database:
Found 9 tickets
...

🔍 Checking customer ID matches:
✅ Ticket TICKET-0001 - Customer found: Admin User
✅ Ticket TICKET-0002 - Customer found: John Doe
...
```

---

### 3. Debug Comments

**File:** `debug-comments.js`

**Purpose:** Displays all comments and checks if user IDs match.

**When to use:**

- Troubleshooting comment author display issues
- Verifying comment-user relationships
- Checking database consistency

**How to run:**

```bash
node --env-file=.env.local scripts/debug-comments.js
```

**What it does:**

- Lists all comments with their user IDs
- Checks if each comment's user ID matches a user's `id`
- Reports any mismatches

**Output:**

```
🔍 Debugging comment data...
✅ Connected to MongoDB
Found 6 users

📋 Comments in database:
Found 1 comments

Comment:
  _id: 690f63ca4b73dedc080eafae
  userId: 690df2c154dc56ea58e70a21
  content: Solved...

🔍 Checking comment user ID matches:
✅ Comment 690f63ca4b73dedc080eafae - User found: Naziullah Shawn
```

---

### 4. Create Admin User

**File:** `create-admin.ts`

**Purpose:** Updates user roles to admin or support.

**When to use:**

- Creating admin users
- Promoting users to support role
- Initial setup

**How to run:**

```bash
node scripts/create-admin.ts
```

**What it does:**

- Updates specified users to admin or support role
- See `docs/CREATE_ADMIN_USER.md` for detailed instructions

---

### 5. Setup MongoDB Indexes

**File:** `setup-mongodb-indexes.js`

**Purpose:** Creates necessary database indexes for optimal query performance.

**When to use:**

- Initial setup after cloning the repository
- After database migrations
- When experiencing slow query performance
- When the `/api/users/by-ids` endpoint is slow

**How to run:**

```bash
node scripts/setup-mongodb-indexes.js
```

**What it does:**

- Creates indexes on `user` collection (id, email, role)
- Creates indexes on `tickets` collection (customerId, assignedTo, status, priority)
- Creates indexes on `session` collection (userId, expiresAt)
- Creates indexes on `account` collection (userId, providerId)
- Creates indexes on `verification` collection (identifier, expiresAt)
- Displays a summary of all created indexes

**Output:**

```
✅ Loaded environment variables from .env.local

🔧 Setting up MongoDB indexes...

✅ Connected to MongoDB

📋 Setting up indexes for 'user' collection...
  ✅ Created index: idx_user_id
  ✅ Created index: idx_user_email (unique)
  ✅ Created index: idx_user_role

...

✅ All indexes created successfully!
```

**Performance Impact:**

- User lookups: 2.4s → 50-200ms (12x faster)
- Ticket queries: Significantly faster filtering and sorting
- Session lookups: Faster authentication checks

**Safety:**

- Safe to run multiple times (idempotent)
- Automatically loads environment variables from `.env.local`
- Does not modify existing data, only creates indexes

---

### 6. Fix Ticket Status

**File:** `fix-ticket-status.ts`

**Purpose:** Converts hyphenated ticket status values to underscored format.

**When to use:**

- After upgrading to the new status format
- When seeing "Cannot read properties of undefined (reading 'variant')" errors
- When ticket status badges are not displaying correctly

**How to run:**

```bash
npx tsx scripts/fix-ticket-status.ts
```

**What it does:**

- Finds all tickets with hyphenated status values (`in-progress`, `waiting-for-customer`)
- Converts them to underscored format (`in_progress`, `waiting_on_customer`)
- Updates ticket history records to match

**Status mappings:**

- `in-progress` → `in_progress`
- `waiting-for-customer` → `waiting_on_customer`

**Output:**

```
Starting ticket status migration...
Updated 5 tickets from "in-progress" to "in_progress"
Updated 0 tickets from "waiting-for-customer" to "waiting_on_customer"
Updated 3 history records (from) from "in-progress" to "in_progress"
Updated 2 history records (to) from "in-progress" to "in_progress"

✅ Migration completed successfully!
Total tickets updated: 5
Total history records updated: 5

✅ Done!
```

**Safety:**

- Only updates records with hyphenated status values
- Safe to run multiple times (idempotent)
- Does not affect correctly formatted records

---

## Environment Variables

All scripts require the following environment variables:

- `MONGODB_URI` - MongoDB connection string
- `DATABASE_NAME` - Database name (defaults to "support-app")

**Note:** Most scripts now automatically load environment variables from `.env.local`, so you can run them with just `node scripts/script-name.js` instead of `node --env-file=.env.local scripts/script-name.js`.

---

## Troubleshooting

### "Unknown User" or "Unknown Customer" in UI

**Solution:**

1. Run the debug script to check if users have `id` field:

   ```bash
   node --env-file=.env.local scripts/debug-users.js
   ```

2. If users are missing `id` field, run the fix script:

   ```bash
   node --env-file=.env.local scripts/fix-user-ids.js
   ```

3. Restart your development server

### Cannot connect to MongoDB

**Check:**

1. `MONGODB_URI` is set in `.env.local`
2. MongoDB server is running
3. Network connectivity to MongoDB server

**Test connection:**

```bash
mongosh $MONGODB_URI
```

### Script fails with "MODULE_NOT_FOUND"

**Solution:**
Make sure you're using the `.js` version of the scripts, not `.ts`:

```bash
# ✅ Correct
node --env-file=.env.local scripts/debug-users.js

# ❌ Wrong
node --env-file=.env.local scripts/debug-users.ts
```

---

## Best Practices

1. **Always backup your database** before running migration scripts
2. **Test scripts on development** environment first
3. **Run debug scripts** before and after migrations to verify changes
4. **Keep scripts in version control** for team collaboration
5. **Document any new scripts** you create in this README

---

## Adding New Scripts

When creating new scripts:

1. Use `.js` extension for Node.js scripts
2. Add `--env-file=.env.local` support for environment variables
3. Include error handling and user-friendly output
4. Add documentation to this README
5. Test thoroughly before committing

**Template:**

```javascript
/**
 * Script description
 * Run with: node scripts/your-script.js
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

async function yourFunction() {
  // Load environment variables first
  loadEnvFile();

  console.log("🔧 Starting...\n");

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

    // Your code here

    console.log("\n✅ Complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

yourFunction();
```
