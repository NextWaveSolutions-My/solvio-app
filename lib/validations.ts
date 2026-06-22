import { z } from "zod";

// =============================================================================
// AUTH VALIDATIONS
// =============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    country: z.string().min(1, "Please select a country"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// =============================================================================
// USER MANAGEMENT VALIDATIONS (Admin)
// =============================================================================

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
    role: z.enum(["customer", "support", "admin"]),
    rbacRoleId: z.string().optional().or(z.literal("")),
    country: z.string().optional(),
    departmentSlugs: z.array(z.string().max(80)).max(20).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) =>
      data.role !== "support" ||
      (!!data.departmentSlugs && data.departmentSlugs.length > 0),
    {
      message: "Select at least one department for a support agent",
      path: ["departmentSlugs"],
    }
  );

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["customer", "support", "admin"]),
    rbacRoleId: z.string().optional().or(z.literal("")),
    country: z.string().optional(),
    departmentSlugs: z.array(z.string().max(80)).max(20).optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      )
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If password is provided, confirmPassword must match
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) =>
      data.role !== "support" ||
      (!!data.departmentSlugs && data.departmentSlugs.length > 0),
    {
      message: "Select at least one department for a support agent",
      path: ["departmentSlugs"],
    }
  );

// =============================================================================
// PROFILE VALIDATIONS
// =============================================================================

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must be at most 20 characters")
    .regex(/^[+]?[\d\s\-()]+$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  envatoUsername: z
    .string()
    .min(3, "Envato username must be at least 3 characters")
    .max(30, "Envato username must be at most 30 characters")
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Only letters, numbers and underscores are allowed"
    )
    .optional()
    .or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  image: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// =============================================================================
// TICKET VALIDATIONS
// =============================================================================

// Shared primitives
const purchaseCodeField = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      const purchaseCodeRegex =
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      return purchaseCodeRegex.test(val);
    },
    {
      message:
        "Invalid purchase code format. Must be a valid Envato purchase code (UUID format).",
    }
  );

// Common fields on tickets + installation + customization
const commonRequestFields = {
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must not exceed 5000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  purchaseCode: purchaseCodeField,
  timezone: z.string().optional(),
};

// Unified base — `createTicket` server action is shared across tickets,
// installation, and customization. Generic tickets use `productSlug` (wired to
// the admin-managed `ticket_products` catalog); installation/customization use
// the free-text `productName`/`productVersion` fields. Fields not relevant to
// a given kind are simply left empty by the form.
const ticketBaseSchema = z.object({
  ...commonRequestFields,
  departmentSlug: z.string().max(50).optional().or(z.literal("")),
  productSlug: z.string().max(100).optional().or(z.literal("")),
  productName: z.string().optional(),
  productVersion: z.string().optional(),
});

// Customer-created support tickets (generic tickets collection)
export const createTicketSchema = ticketBaseSchema.extend({
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category must not exceed 50 characters")
    .refine((val) => val !== "service", {
      message: "Invalid category",
    }),
});

// Public (un-authenticated) support tickets created from /support/new. Same
// shape as `createTicketSchema` plus the guest's name + email.
export const createPublicTicketSchema = createTicketSchema.extend({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(200, "Email must not exceed 200 characters"),
});

// Guest reply posted from the public ticket portal (/support/ticket/<token>).
export const guestCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must not exceed 5000 characters"),
});

// Customer-created installation requests (separate collection)
export const createInstallationRequestSchema = ticketBaseSchema;

// Customer-created customization requests (separate collection)
export const createCustomizationRequestSchema = ticketBaseSchema;

export const adminCreateTicketSchema = ticketBaseSchema.extend({
  customerId: z.string().min(1, "Customer is required"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category must not exceed 50 characters")
    .refine((val) => val !== "service", {
      message: "Invalid category",
    }),
});

export const updateTicketSchema = z.object({
  status: z
    .enum([
      "open",
      "scheduled_meeting",
      "in_progress",
      "waiting_on_customer",
      "resolved",
      "closed",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCustomizationSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must not exceed 5000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  productName: z.string().optional(),
  productVersion: z.string().optional(),
});

export const updateInstallationSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must not exceed 5000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  productName: z.string().optional(),
  productVersion: z.string().optional(),
});

// =============================================================================
// COMMENT VALIDATIONS
// =============================================================================

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must not exceed 2000 characters"),
  isInternal: z.boolean().optional().default(false),
  parentCommentId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
});

// =============================================================================
// MEETING VALIDATIONS
// =============================================================================

export const createMeetingSchema = z.object({
  platform: z.enum(["zoom", "google_meet"], {
    message: "Please select a meeting platform",
  }),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  scheduledAt: z.coerce.date(),
  duration: z
    .number()
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration must not exceed 8 hours")
    .optional(),
  meetingLink: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  timezone: z.string().optional(),
});

export const updateMeetingSchema = z.object({
  platform: z.enum(["zoom", "google_meet"]).optional(),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters")
    .optional(),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  scheduledAt: z.coerce.date().optional(),
  duration: z
    .number()
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration must not exceed 8 hours")
    .optional(),
  meetingLink: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  timezone: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  cancellationReason: z.string().max(500).optional(),
});

// =============================================================================
// FILTER VALIDATIONS
// =============================================================================

export const ticketFiltersSchema = z.object({
  status: z
    .union([
      z.enum([
        "open",
        "scheduled_meeting",
        "in_progress",
        "waiting_on_customer",
        "resolved",
        "closed",
      ]),
      z.array(
        z.enum([
          "open",
          "scheduled_meeting",
          "in_progress",
          "waiting_on_customer",
          "resolved",
          "closed",
        ])
      ),
    ])
    .optional(),
  priority: z
    .union([
      z.enum(["low", "medium", "high", "urgent"]),
      z.array(z.enum(["low", "medium", "high", "urgent"])),
    ])
    .optional(),
  category: z
    .union([
      z.enum([
        "bug",
        "feature_request",
        "technical_support",
        "account",
        "general",
      ]),
      z.array(
        z.enum([
          "bug",
          "feature_request",
          "technical_support",
          "account",
          "general",
        ])
      ),
    ])
    .optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
