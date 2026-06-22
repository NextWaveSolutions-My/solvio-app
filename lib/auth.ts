import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError } from "better-auth/api";
import { MongoClient, ObjectId } from "mongodb";

// MongoDB connection
const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri, { retryWrites: false });
const db = client.db(process.env.DATABASE_NAME || "support-app");

export const auth = betterAuth({
  database: mongodbAdapter(db),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !process.env.SKIP_EMAIL_VERIFICATION,
    async sendResetPassword({ user, url }) {
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `
          <h1>Reset your password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}">Reset Password</a>
          <p>If you didn't ask to reset your password, you can ignore this email.</p>
        `,
      });
    },
  },

  session: {
    expiresIn: parseInt(process.env.SESSION_MAX_AGE || "604800"), // 7 days default
    updateAge: 86400, // Update session every 24 hours
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false, // Don't allow users to set this directly
      },
      country: {
        type: "string",
        required: false,
        input: true, // Allow users to set this during registration
      },
      status: {
        type: "string",
        required: false,
        // Account access status ("active" | "disabled" | "banned").
        // Managed by admins via server actions — never set by the user.
        input: false,
      },
    },
  },

  // Block disabled/banned accounts from creating a session (i.e. logging in).
  // Active sessions are additionally revoked when an admin disables/bans a
  // user, and getSession() treats disabled/banned users as logged-out.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          try {
            const userId = (session as { userId?: string }).userId;
            if (!userId) return;
            const userDoc = await db.collection("user").findOne(
              ObjectId.isValid(userId)
                ? { $or: [{ id: userId }, { _id: new ObjectId(userId) }] }
                : { id: userId },
              { projection: { status: 1 } },
            );
            const status = (userDoc as { status?: string } | null)?.status;
            if (status === "disabled" || status === "banned") {
              throw new APIError("FORBIDDEN", {
                message:
                  status === "banned"
                    ? "Your account has been banned. Please contact support."
                    : "Your account has been disabled. Please contact support.",
              });
            }
          } catch (err) {
            // Re-throw our own block; otherwise fail open so a transient DB
            // error can't lock every user out of signing in.
            if (err instanceof APIError) throw err;
            console.error("Session status check failed:", err);
          }
        },
      },
    },
  },

  // Note: MongoDB adapter uses _id as the primary key
  // The 'id' field is automatically created by better-auth and should match _id
  // If you have existing users without 'id' field, run: node --env-file=.env.local scripts/fix-user-ids.js

  // Email configuration (if email notifications are enabled)
  ...(process.env.EMAIL_NOTIFICATIONS_ENABLED === "true" && {
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Send verification email using nodemailer
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          html: `
            <h1>Welcome to Support App!</h1>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${url}">Verify Email</a>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          `,
        });
      },
    },
  }),
});

export type Session = typeof auth.$Infer.Session;

// Extended user type with custom fields
export type SessionUser = Session["user"] & {
  role: "customer" | "support" | "admin";
  country?: string;
};
