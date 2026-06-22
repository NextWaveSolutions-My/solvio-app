import { redirect } from "next/navigation";

interface LegacyClientsPageProps {
  searchParams: Promise<{
    search?: string;
    view?: string;
  }>;
}

export default async function LegacyClientsPage({
  searchParams,
}: LegacyClientsPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.view) {
    query.set("view", params.view);
  }

  const suffix = query.toString();
  redirect(suffix ? `/admin/customers?${suffix}` : "/admin/customers");
}
