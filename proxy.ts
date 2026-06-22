import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const adminCustomizationEditMatch = pathname.match(
    /^\/admin\/customization\/([^/]+)\/edit\/?$/,
  );
  if (adminCustomizationEditMatch) {
    return redirectTo(
      request,
      `/admin/services/customization/${adminCustomizationEditMatch[1]}`,
    );
  }

  const adminInstallationEditMatch = pathname.match(
    /^\/admin\/installation\/([^/]+)\/edit\/?$/,
  );
  if (adminInstallationEditMatch) {
    return redirectTo(
      request,
      `/admin/services/installation/${adminInstallationEditMatch[1]}`,
    );
  }

  if (
    pathname === "/admin/customization" ||
    pathname.startsWith("/admin/customization/")
  ) {
    return redirectTo(
      request,
      pathname.replace(/^\/admin\/customization/, "/admin/services/customization"),
    );
  }

  if (
    pathname === "/admin/installation" ||
    pathname.startsWith("/admin/installation/")
  ) {
    return redirectTo(
      request,
      pathname.replace(/^\/admin\/installation/, "/admin/services/installation"),
    );
  }

  if (
    pathname === "/dashboard/customization" ||
    pathname.startsWith("/dashboard/customization/")
  ) {
    return redirectTo(
      request,
      pathname.replace(
        /^\/dashboard\/customization/,
        "/dashboard/services/customization",
      ),
    );
  }

  if (
    pathname === "/dashboard/installation" ||
    pathname.startsWith("/dashboard/installation/")
  ) {
    return redirectTo(
      request,
      pathname.replace(
        /^\/dashboard\/installation/,
        "/dashboard/services/installation",
      ),
    );
  }

  if (
    pathname === "/support-agent/customization" ||
    pathname.startsWith("/support-agent/customization/")
  ) {
    return redirectTo(
      request,
      pathname.replace(
        /^\/support-agent\/customization/,
        "/support-agent/services/customization",
      ),
    );
  }

  if (
    pathname === "/support-agent/installation" ||
    pathname.startsWith("/support-agent/installation/")
  ) {
    return redirectTo(
      request,
      pathname.replace(
        /^\/support-agent\/installation/,
        "/support-agent/services/installation",
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/customization/:path*",
    "/admin/installation/:path*",
    "/dashboard/customization/:path*",
    "/dashboard/installation/:path*",
    "/support-agent/customization/:path*",
    "/support-agent/installation/:path*",
  ],
};
