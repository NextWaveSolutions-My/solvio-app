import { redirect } from "next/navigation";

interface LegacyClientDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LegacyClientDetailPage({
  params,
}: LegacyClientDetailPageProps) {
  const { id } = await params;
  redirect(`/admin/customers/${id}`);
}
