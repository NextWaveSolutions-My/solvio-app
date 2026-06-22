import type { NextConfig } from "next";

/**
 * Domains allowed to embed the chat widget (`/embed`) in an iframe.
 * Set EMBED_ALLOWED_ORIGINS to a comma/space separated list of origins,
 * e.g. "https://acme.com https://shop.acme.com". Unset = embeddable anywhere.
 */
const embedFrameAncestors = (() => {
  const raw = process.env.EMBED_ALLOWED_ORIGINS?.trim();
  if (!raw) return "*";
  const origins = raw
    .split(/[\s,]+/)
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length > 0 ? `'self' ${origins.join(" ")}` : "*";
})();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${embedFrameAncestors};`,
          },
        ],
      },
    ];
  },
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb", // Increase from default 1MB to 20MB for file uploads
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
