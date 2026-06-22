import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import { FooterSection } from "@/types/landing-page";
import { Logo } from "@/components/ui/logo";

interface PublicFooterProps {
  content?: FooterSection;
}

const linkColumns = [
  { key: "product", title: "Product" },
  { key: "resources", title: "Resources" },
  { key: "company", title: "Company" },
  { key: "legal", title: "Legal" },
] as const;

export function PublicFooter({ content }: PublicFooterProps) {
  if (!content) return null;

  return (
    <footer className="relative bg-linear-to-b from-transparent via-muted/20 to-muted/40 px-4 pb-8 pt-16 dark:via-muted/10 dark:to-muted/20">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent"
      />
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-block">
              <Logo
                width={120}
                height={40}
                className="h-7 w-auto"
                showFallbackText
              />
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              {content.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Secure customer portal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Clock3 className="h-3 w-3 text-primary" />
                24/7 self-service
              </span>
            </div>
          </div>

          {/* Links Columns */}
          {linkColumns.map((column) => (
            <div key={column.key}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {column.title}
              </h4>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {content.links[column.key].map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      className="font-medium text-foreground/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-[12px] text-muted-foreground">
            {content.copyright}
          </p>
          <p className="text-[12px] font-semibold tracking-tight text-foreground/60">
            {content.brandName}
            <span className="text-primary"> {content.brandHighlight}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
