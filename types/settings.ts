import { ObjectId } from "mongodb";

// =============================================================================
// SETTINGS TYPES
// =============================================================================

export interface SystemSettings {
  _id: ObjectId;

  // General Settings
  general: {
    siteName: string;
    siteDescription: string;
    supportEmail: string;
    companyName: string;
    timezone: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
  };

  // Ticket Settings
  tickets: {
    ticketNumberPrefix: string;
    defaultPriority: "low" | "medium" | "high" | "urgent";
    autoCloseResolvedTicketsDays: number;
    allowCustomerCloseTickets: boolean;
    requirePurchaseCode: boolean;
    enableInternalNotes: boolean;
    enableTicketTags: boolean;
  };

  // Email Settings
  email: {
    enabled: boolean;
    notifyOnNewTicket: boolean;
    notifyOnTicketUpdate: boolean;
    notifyOnNewComment: boolean;
    notifyOnTicketAssignment: boolean;
    notifyOnTicketResolution: boolean;
    adminNotificationEmail: string;
  };

  // File Upload Settings
  fileUploads: {
    enabled: boolean;
    maxFileSize: number; // in bytes
    maxFilesPerTicket: number;
    allowedFileTypes: string[];
  };

  // Security Settings
  security: {
    enableCsrfProtection: boolean;
    sessionMaxAge: number; // in seconds
    maxLoginAttempts: number;
    lockoutDuration: number; // in minutes
    requireEmailVerification: boolean;
    enableTwoFactorAuth: boolean;
  };

  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    ticketsPerHour: number;
    commentsPerHour: number;
  };

  // Appearance Settings
  appearance: {
    // Colors
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    /** Optional info color; falls back to primary if absent */
    infoColor?: string;

    // Logo & Branding
    logoUrl?: string;
    logoStorageKey?: string; // R2 storage key for uploaded logo
    logoDarkUrl?: string;
    logoDarkStorageKey?: string; // R2 storage key for uploaded dark mode logo
    faviconUrl?: string;
    faviconStorageKey?: string; // R2 storage key for uploaded favicon

    // Text Customization
    footerText?: string;
    copyrightText?: string;

    // Custom Styling
    customCss?: string;
  };

  // Integration Settings
  integrations: {
    envato: {
      enabled: boolean;
      apiToken?: string;
      username?: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      notifyOnNewTicket: boolean;
    };
    discord: {
      enabled: boolean;
      webhookUrl?: string;
      notifyOnNewTicket: boolean;
    };
    whatsapp: {
      enabled: boolean;
      phoneNumber?: string;
      defaultMessage?: string;
    };
  };

  announcements: {
    enabled: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "warning" | "maintenance";
    dismissible: boolean;
    showOn: {
      public: boolean;
      dashboard: boolean;
      admin: boolean;
      support: boolean;
    };
  };

  maintenance: {
    enabled: boolean;
    message: string;
    allowAdmin: boolean;
    allowSupport: boolean;
  };

  // Metadata
  updatedAt: Date;
  updatedBy: string; // User ID
}

export interface SettingsFormData {
  general?: Partial<SystemSettings["general"]>;
  tickets?: Partial<SystemSettings["tickets"]>;
  email?: Partial<SystemSettings["email"]>;
  fileUploads?: Partial<SystemSettings["fileUploads"]>;
  security?: Partial<SystemSettings["security"]>;
  rateLimiting?: Partial<SystemSettings["rateLimiting"]>;
  appearance?: Partial<SystemSettings["appearance"]>;
  integrations?: Partial<SystemSettings["integrations"]>;
  announcements?: Partial<SystemSettings["announcements"]>;
  maintenance?: Partial<SystemSettings["maintenance"]>;
}

// Default settings
export const DEFAULT_SETTINGS: Omit<
  SystemSettings,
  "_id" | "updatedAt" | "updatedBy"
> = {
  general: {
    siteName: "Support Ticket System",
    siteDescription: "Customer support and ticket management",
    supportEmail: "support@example.com",
    companyName: "Your Company",
    timezone: "UTC",
    dateFormat: "MMM dd, yyyy",
    timeFormat: "12h",
  },
  tickets: {
    ticketNumberPrefix: "TICKET",
    defaultPriority: "medium",
    autoCloseResolvedTicketsDays: 7,
    allowCustomerCloseTickets: false,
    requirePurchaseCode: false,
    enableInternalNotes: true,
    enableTicketTags: true,
  },
  email: {
    enabled: false,
    notifyOnNewTicket: true,
    notifyOnTicketUpdate: true,
    notifyOnNewComment: true,
    notifyOnTicketAssignment: true,
    notifyOnTicketResolution: true,
    adminNotificationEmail: "admin@example.com",
  },
  fileUploads: {
    enabled: false,
    maxFileSize: 20971520, // 20MB
    maxFilesPerTicket: 5,
    allowedFileTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ],
  },
  security: {
    enableCsrfProtection: true,
    sessionMaxAge: 604800, // 7 days
    maxLoginAttempts: 5,
    lockoutDuration: 30, // 30 minutes
    requireEmailVerification: false,
    enableTwoFactorAuth: false,
  },
  rateLimiting: {
    enabled: true,
    ticketsPerHour: 10,
    commentsPerHour: 50,
  },
  appearance: {
    // Colors
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    accentColor: "#10b981",
    successColor: "#10b981",
    warningColor: "#f59e0b",
    errorColor: "#ef4444",
    infoColor: "#0ea5e9",

    // Logo & Branding
    logoUrl: undefined,
    logoStorageKey: undefined,
    logoDarkUrl: undefined,
    logoDarkStorageKey: undefined,
    faviconUrl: undefined,
    faviconStorageKey: undefined,

    // Text Customization
    footerText: undefined,
    copyrightText: undefined,

    // Custom Styling
    customCss: undefined,
  },
  integrations: {
    envato: {
      enabled: false,
      apiToken: undefined,
      username: undefined,
    },
    slack: {
      enabled: false,
      webhookUrl: undefined,
      notifyOnNewTicket: false,
    },
    discord: {
      enabled: false,
      webhookUrl: undefined,
      notifyOnNewTicket: false,
    },
    whatsapp: {
      enabled: false,
      phoneNumber: undefined,
      defaultMessage: "Hello! I have a question about your products.",
    },
  },
  announcements: {
    enabled: false,
    title: "What’s new",
    message: "",
    variant: "info",
    dismissible: true,
    showOn: {
      public: false,
      dashboard: true,
      admin: true,
      support: true,
    },
  },
  maintenance: {
    enabled: false,
    message: "We’re performing maintenance right now. Please check back soon.",
    allowAdmin: true,
    allowSupport: true,
  },
};
