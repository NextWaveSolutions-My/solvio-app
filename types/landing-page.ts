import { ObjectId } from "mongodb";

export interface LandingNavLink {
  label: string;
  href: string;
}

export interface HeaderSection {
  navigationLinks: LandingNavLink[];
  signInText: string;
  ctaButtonText: string;
  ctaButtonLink: string;
  mobileCtaText: string;
}

export interface HeroMetric {
  id: string;
  value: string;
  label: string;
}

export interface HeroSection {
  eyebrow: string;
  headline: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  metrics: HeroMetric[];
}

export interface SupportPath {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge: string;
  link: string;
  colorClass: string;
  enabled: boolean;
  order: number;
}

export interface WorkflowStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface Capability {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge: string;
  link: string;
  enabled: boolean;
  order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  initials: string;
  imageUrl?: string;
  text: string;
  rating: number;
  enabled: boolean;
  order: number;
}

export interface Partner {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  enabled: boolean;
  order: number;
}

export interface ProofStat {
  id: string;
  value: string;
  label: string;
}

export interface ProofSection {
  eyebrow: string;
  headline: string;
  description: string;
  trustStatement: string;
  stats: ProofStat[];
  partners: Partner[];
  testimonials: Testimonial[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
  order: number;
}

export interface ContactCtaSection {
  eyebrow: string;
  headline: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  formTitle: string;
  formDescription: string;
}

export interface FooterSection {
  brandName: string;
  brandHighlight: string;
  tagline: string;
  copyright: string;
  links: {
    product: LandingNavLink[];
    resources: LandingNavLink[];
    company: LandingNavLink[];
    legal: LandingNavLink[];
  };
}

export interface LandingPageContent {
  _id?: ObjectId;
  header: HeaderSection;
  hero: HeroSection;
  supportPaths: SupportPath[];
  workflowSteps: WorkflowStep[];
  capabilities: Capability[];
  proof: ProofSection;
  faq: FAQItem[];
  contactCta: ContactCtaSection;
  footer: FooterSection;
  updatedAt: Date;
  updatedBy: string;
}

export interface LandingPageFormData {
  header?: Partial<HeaderSection>;
  hero?: Partial<HeroSection>;
  supportPaths?: SupportPath[];
  workflowSteps?: WorkflowStep[];
  capabilities?: Capability[];
  proof?: Partial<ProofSection>;
  faq?: FAQItem[];
  contactCta?: Partial<ContactCtaSection>;
  footer?: Partial<FooterSection>;
}

interface LegacyHeroSection {
  headline: string;
  highlightedText: string;
  subheadline: string;
  statsText: string;
  searchPlaceholder: string;
  categoryPlaceholder: string;
  buttonText: string;
}

interface LegacyQuickService {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
  colorClass: string;
  enabled: boolean;
  order: number;
}

interface LegacyServiceCategory {
  id: string;
  icon: string;
  title: string;
  description: string;
  badge: string;
  colorClass: string;
  link: string;
  enabled: boolean;
  order: number;
}

interface LegacyFeaturedService {
  id: string;
  company: string;
  icon: string;
  iconBg: string;
  title: string;
  type: string;
  description: string;
  price: string;
  priceUnit: string;
  location: string;
  link: string;
  enabled: boolean;
  order: number;
}

interface LegacyNewsletterSection {
  headline: string;
  highlightedText: string;
  description: string;
  inputPlaceholder: string;
  buttonText: string;
}

interface LegacyCTASection {
  headline: string;
  highlightedText: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  stats: Array<{
    icon: string;
    text: string;
    color: string;
  }>;
}

interface LegacyPartnersStats {
  headline: string;
  count: string;
}

export type RawLandingPageContent = Partial<LandingPageContent> & {
  hero?: Partial<HeroSection & LegacyHeroSection>;
  supportPaths?: SupportPath[];
  workflowSteps?: WorkflowStep[];
  capabilities?: Capability[];
  proof?: Partial<ProofSection>;
  faq?: FAQItem[];
  contactCta?: Partial<ContactCtaSection>;
  quickServices?: LegacyQuickService[];
  categories?: LegacyServiceCategory[];
  featuredServices?: LegacyFeaturedService[];
  testimonials?: Testimonial[];
  partners?: Partner[];
  partnersStats?: Partial<LegacyPartnersStats>;
  newsletter?: Partial<LegacyNewsletterSection>;
  cta?: Partial<LegacyCTASection>;
};

export const DEFAULT_LANDING_CONTENT: Omit<
  LandingPageContent,
  "_id" | "updatedAt" | "updatedBy"
> = {
  header: {
    navigationLinks: [
      { label: "Overview", href: "/#overview" },
      { label: "Support Paths", href: "/#support-paths" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact", href: "/#contact" },
    ],
    signInText: "Sign In",
    ctaButtonText: "Create Ticket",
    ctaButtonLink: "/dashboard/tickets/new",
    mobileCtaText: "Open Support",
  },

  hero: {
    eyebrow: "Customer support portal",
    headline: "Resolve product issues faster with tickets, docs, chat, and status updates in one place.",
    description:
      "Solvio gives customers a clear support path from first question to final resolution, with self-service resources, file sharing, live collaboration, and transparent follow-up.",
    primaryButtonText: "Create Ticket",
    primaryButtonLink: "/dashboard/tickets/new",
    secondaryButtonText: "Browse Knowledge Base",
    secondaryButtonLink: "/docs",
    metrics: [
      { id: "1", value: "120k+", label: "issues resolved" },
      { id: "2", value: "<24h", label: "average first reply" },
      { id: "3", value: "3 ways", label: "to get help fast" },
    ],
  },

  supportPaths: [
    {
      id: "1",
      icon: "Headphones",
      title: "Technical Support",
      description: "Open a ticket for product issues, account questions, or troubleshooting help.",
      badge: "Best for active customer issues",
      link: "/dashboard/tickets/new",
      colorClass: "bg-sky-100 text-sky-700",
      enabled: true,
      order: 1,
    },
    {
      id: "2",
      icon: "Download",
      title: "Installation Help",
      description: "Get guided setup support, environment checks, and deployment assistance.",
      badge: "Fast onboarding support",
      link: "/dashboard/tickets/new",
      colorClass: "bg-emerald-100 text-emerald-700",
      enabled: true,
      order: 2,
    },
    {
      id: "3",
      icon: "Wrench",
      title: "Customization Request",
      description: "Discuss feature tailoring, workflow changes, or scoped implementation support.",
      badge: "For custom requirements",
      link: "/dashboard/tickets/new",
      colorClass: "bg-amber-100 text-amber-700",
      enabled: true,
      order: 3,
    },
    {
      id: "4",
      icon: "Bug",
      title: "Report a Bug",
      description: "Share reproducible issues with screenshots and attachments for faster triage.",
      badge: "Track fixes clearly",
      link: "/dashboard/tickets/new",
      colorClass: "bg-rose-100 text-rose-700",
      enabled: true,
      order: 4,
    },
  ],

  workflowSteps: [
    {
      id: "1",
      icon: "FileText",
      title: "Submit your request",
      description: "Create a support ticket with category, priority, and the details your team needs.",
      enabled: true,
      order: 1,
    },
    {
      id: "2",
      icon: "Paperclip",
      title: "Attach context",
      description: "Upload screenshots, documents, or purchase details to speed up diagnosis.",
      enabled: true,
      order: 2,
    },
    {
      id: "3",
      icon: "MessageCircle",
      title: "Collaborate in real time",
      description: "Use comments, messaging, and notifications to stay aligned as work progresses.",
      enabled: true,
      order: 3,
    },
    {
      id: "4",
      icon: "CalendarClock",
      title: "Resolve or schedule next steps",
      description: "Track status changes, schedule meetings when needed, and close the loop with clarity.",
      enabled: true,
      order: 4,
    },
  ],

  capabilities: [
    {
      id: "1",
      icon: "Ticket",
      title: "Structured ticket management",
      description: "Track issue status, ownership, priority, and history from one shared record.",
      badge: "Clear progress for every request",
      link: "/dashboard/tickets",
      enabled: true,
      order: 1,
    },
    {
      id: "2",
      icon: "BookOpen",
      title: "Knowledge base access",
      description: "Let customers solve common questions through searchable documentation and guides.",
      badge: "Self-service before escalation",
      link: "/docs",
      enabled: true,
      order: 2,
    },
    {
      id: "3",
      icon: "MessageSquareText",
      title: "Real-time communication",
      description: "Keep conversations moving with comments, chat, and live follow-ups inside the portal.",
      badge: "Fewer back-and-forth delays",
      link: "/dashboard/messages",
      enabled: true,
      order: 3,
    },
    {
      id: "4",
      icon: "Paperclip",
      title: "File attachments",
      description: "Share screenshots, logs, and supporting files directly with each request.",
      badge: "Better issue context",
      link: "/dashboard/tickets/new",
      enabled: true,
      order: 4,
    },
    {
      id: "5",
      icon: "Bell",
      title: "Notifications and updates",
      description: "Stay informed when status changes, replies arrive, or meetings are scheduled.",
      badge: "Never miss follow-up",
      link: "/dashboard/notifications",
      enabled: true,
      order: 5,
    },
    {
      id: "6",
      icon: "ChartNoAxesCombined",
      title: "Team operations and analytics",
      description: "Support teams can assign work, monitor trends, and improve response performance.",
      badge: "Built for support staff too",
      link: "/admin",
      enabled: true,
      order: 6,
    },
  ],

  proof: {
    eyebrow: "Trusted workflows",
    headline: "Built for customers who need answers quickly and teams who need support operations that stay organized.",
    description:
      "Solvio combines self-service, responsive support, and internal coordination so requests do not disappear between teams.",
    trustStatement:
      "Customers can see progress clearly while support teams manage assignments, updates, and follow-up from one workspace.",
    stats: [
      { id: "1", value: "20,000+", label: "portal visits supported" },
      { id: "2", value: "98%", label: "tickets updated with clear status changes" },
      { id: "3", value: "24/7", label: "self-service help center access" },
    ],
    partners: [
      { id: "1", name: "airbnb", displayName: "Airbnb", enabled: true, order: 1 },
      { id: "2", name: "slack", displayName: "Slack", enabled: true, order: 2 },
      { id: "3", name: "discord", displayName: "Discord", enabled: true, order: 3 },
      { id: "4", name: "walmart", displayName: "Walmart", enabled: true, order: 4 },
      { id: "5", name: "notion", displayName: "Notion", enabled: true, order: 5 },
      { id: "6", name: "shopify", displayName: "Shopify", enabled: true, order: 6 },
    ],
    testimonials: [
      {
        id: "1",
        name: "Wade Warren",
        role: "Product Manager",
        initials: "WW",
        text: "The portal made it easy to submit our issue, attach the right files, and follow the fix without chasing updates.",
        rating: 5,
        enabled: true,
        order: 1,
      },
      {
        id: "2",
        name: "Jenny Wilson",
        role: "Operations Lead",
        initials: "JW",
        text: "We reduced support back-and-forth because the knowledge base and live ticket updates gave our team a much clearer path.",
        rating: 5,
        enabled: true,
        order: 2,
      },
    ],
  },

  faq: [
    {
      id: "1",
      question: "How do I submit a support request?",
      answer:
        "Open a new ticket from the portal, choose the right support path, describe the issue, and include any screenshots or files that help reproduce it.",
      enabled: true,
      order: 1,
    },
    {
      id: "2",
      question: "Can I track the progress of my issue?",
      answer:
        "Yes. Each request includes status updates, comments, attachments, and activity history so you can follow progress without emailing back and forth.",
      enabled: true,
      order: 2,
    },
    {
      id: "3",
      question: "Should I use the knowledge base or create a ticket?",
      answer:
        "Start with the knowledge base for setup steps, known issues, and guides. If your case needs help from the team, create a ticket directly from the portal.",
      enabled: true,
      order: 3,
    },
    {
      id: "4",
      question: "Can I attach files or screenshots?",
      answer:
        "Yes. Tickets support file uploads so you can share screenshots, logs, or other materials that make troubleshooting faster.",
      enabled: true,
      order: 4,
    },
    {
      id: "5",
      question: "What happens if the issue needs a meeting or custom work?",
      answer:
        "Support can schedule a meeting for deeper investigation, and customization requests can be discussed through the same portal so requirements and updates stay in one place.",
      enabled: true,
      order: 5,
    },
  ],

  contactCta: {
    eyebrow: "Need direct help?",
    headline: "Start with the fastest support path for your issue, then reach our team if you need hands-on help.",
    description:
      "Create a ticket for immediate tracking, browse the knowledge base for self-service answers, or send a message through the contact form for general questions.",
    primaryButtonText: "Create Ticket",
    primaryButtonLink: "/dashboard/tickets/new",
    secondaryButtonText: "Browse Knowledge Base",
    secondaryButtonLink: "/docs",
    formTitle: "Talk to our support team",
    formDescription:
      "Share your question and we will point you to the right support path or follow up with the next step.",
  },

  footer: {
    brandName: "Solvio",
    brandHighlight: "Support",
    tagline:
      "A customer support portal for tickets, documentation, collaboration, and follow-up that stays clear from first request to final resolution.",
    copyright: "© 2026 Solvio. All rights reserved.",
    links: {
      product: [
        { label: "Create Ticket", href: "/dashboard/tickets/new" },
        { label: "Messages", href: "/dashboard/messages" },
        { label: "Knowledge Base", href: "/docs" },
      ],
      resources: [
        { label: "Overview", href: "/#overview" },
        { label: "Features", href: "/#features" },
        { label: "FAQ", href: "/#faq" },
      ],
      company: [
        { label: "Home", href: "/" },
        { label: "Support Paths", href: "/#support-paths" },
        { label: "Contact", href: "/#contact" },
      ],
      legal: [
        { label: "Portal Access", href: "/login" },
        { label: "Create Account", href: "/register" },
        { label: "Contact Support", href: "/#contact" },
      ],
    },
  },
};

const heroHeadlineFromLegacy = (
  hero?: Partial<LegacyHeroSection>,
  fallback = DEFAULT_LANDING_CONTENT.hero.headline,
) => {
  if (!hero) return fallback;

  const parts = [hero.headline, hero.highlightedText, hero.subheadline]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : fallback;
};

const normalizeHero = (
  hero?: Partial<HeroSection & LegacyHeroSection>,
  header?: Partial<HeaderSection>,
): HeroSection => {
  const current = DEFAULT_LANDING_CONTENT.hero;
  const hasNewShape = Boolean(hero && "primaryButtonText" in hero);

  return {
    eyebrow: hero?.eyebrow ?? current.eyebrow,
    headline: hasNewShape
      ? hero?.headline || current.headline
      : heroHeadlineFromLegacy(hero, current.headline),
    description:
      hero?.description ||
      hero?.statsText ||
      current.description,
    primaryButtonText:
      hero?.primaryButtonText ||
      header?.ctaButtonText ||
      current.primaryButtonText,
    primaryButtonLink:
      hero?.primaryButtonLink ||
      header?.ctaButtonLink ||
      current.primaryButtonLink,
    secondaryButtonText:
      hero?.secondaryButtonText || current.secondaryButtonText,
    secondaryButtonLink:
      hero?.secondaryButtonLink || current.secondaryButtonLink,
    metrics:
      hero?.metrics && hero.metrics.length > 0
        ? hero.metrics
        : current.metrics,
  };
};

const normalizeSupportPaths = (
  supportPaths?: SupportPath[],
  quickServices?: LegacyQuickService[],
): SupportPath[] => {
  const source = supportPaths?.length
    ? supportPaths
    : quickServices?.map((item) => ({
        ...item,
        badge: "Popular support path",
      })) || [];

  return source.length > 0 ? source : DEFAULT_LANDING_CONTENT.supportPaths;
};

const normalizeCapabilities = (
  capabilities?: Capability[],
  categories?: LegacyServiceCategory[],
  featuredServices?: LegacyFeaturedService[],
): Capability[] => {
  if (capabilities?.length) return capabilities;
  if (categories?.length) return categories;
  if (featuredServices?.length) {
    return featuredServices.map((service, index) => ({
      id: service.id,
      icon: "Sparkles",
      title: service.title,
      description: service.description,
      badge: service.type || service.company,
      link: service.link || "#",
      enabled: service.enabled,
      order: service.order ?? index + 1,
    }));
  }

  return DEFAULT_LANDING_CONTENT.capabilities;
};

const normalizeProof = (
  proof?: Partial<ProofSection>,
  partners?: Partner[],
  testimonials?: Testimonial[],
  partnersStats?: Partial<LegacyPartnersStats>,
): ProofSection => {
  const current = DEFAULT_LANDING_CONTENT.proof;

  return {
    eyebrow: proof?.eyebrow || current.eyebrow,
    headline: proof?.headline || current.headline,
    description: proof?.description || current.description,
    trustStatement: proof?.trustStatement || current.trustStatement,
    stats:
      proof?.stats && proof.stats.length > 0
        ? proof.stats
        : [
            {
              id: current.stats[0].id,
              value: partnersStats?.count || current.stats[0].value,
              label: partnersStats?.headline || current.stats[0].label,
            },
            ...current.stats.slice(1),
          ],
    partners:
      proof?.partners && proof.partners.length > 0
        ? proof.partners
        : partners?.length
          ? partners
          : current.partners,
    testimonials:
      proof?.testimonials && proof.testimonials.length > 0
        ? proof.testimonials
        : testimonials?.length
          ? testimonials
          : current.testimonials,
  };
};

const normalizeContactCta = (
  contactCta?: Partial<ContactCtaSection>,
  cta?: Partial<LegacyCTASection>,
  newsletter?: Partial<LegacyNewsletterSection>,
): ContactCtaSection => {
  const current = DEFAULT_LANDING_CONTENT.contactCta;

  return {
    eyebrow: contactCta?.eyebrow || current.eyebrow,
    headline: contactCta?.headline || cta?.headline || current.headline,
    description:
      contactCta?.description ||
      cta?.description ||
      newsletter?.description ||
      current.description,
    primaryButtonText:
      contactCta?.primaryButtonText ||
      cta?.buttonText ||
      current.primaryButtonText,
    primaryButtonLink:
      contactCta?.primaryButtonLink ||
      cta?.buttonLink ||
      current.primaryButtonLink,
    secondaryButtonText:
      contactCta?.secondaryButtonText || current.secondaryButtonText,
    secondaryButtonLink:
      contactCta?.secondaryButtonLink || current.secondaryButtonLink,
    formTitle:
      contactCta?.formTitle ||
      newsletter?.headline ||
      current.formTitle,
    formDescription:
      contactCta?.formDescription ||
      newsletter?.description ||
      current.formDescription,
  };
};

export function normalizeLandingPageContent(
  raw?: RawLandingPageContent | null,
): LandingPageContent {
  const current = DEFAULT_LANDING_CONTENT;
  const header = raw?.header
    ? { ...current.header, ...raw.header }
    : current.header;

  return {
    _id: raw?._id,
    header,
    hero: normalizeHero(raw?.hero, header),
    supportPaths: normalizeSupportPaths(raw?.supportPaths, raw?.quickServices),
    workflowSteps:
      raw?.workflowSteps && raw.workflowSteps.length > 0
        ? raw.workflowSteps
        : current.workflowSteps,
    capabilities: normalizeCapabilities(
      raw?.capabilities,
      raw?.categories,
      raw?.featuredServices,
    ),
    proof: normalizeProof(
      raw?.proof,
      raw?.partners,
      raw?.testimonials,
      raw?.partnersStats,
    ),
    faq:
      raw?.faq && raw.faq.length > 0
        ? raw.faq
        : current.faq,
    contactCta: normalizeContactCta(
      raw?.contactCta,
      raw?.cta,
      raw?.newsletter,
    ),
    footer: raw?.footer
      ? {
          ...current.footer,
          ...raw.footer,
          links: {
            ...current.footer.links,
            ...(raw.footer.links ?? {}),
          },
        }
      : current.footer,
    updatedAt: raw?.updatedAt ?? new Date(),
    updatedBy: raw?.updatedBy ?? "system",
  };
}
