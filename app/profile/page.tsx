import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";

export default async function ProfileRedirectPage() {
  const session = await requireAuth();
  const role = (session.user as SessionUser).role || "customer";
  if (role === "admin" || role === "support") {
    redirect("/admin/profile");
  }
  redirect("/dashboard/profile");
}
