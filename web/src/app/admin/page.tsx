import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";

interface AdminPageProps {
  searchParams: Promise<{ secret?: string }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { secret } = await searchParams;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return <div style={{ color: "red", padding: 32 }}>ADMIN_SECRET 未設定（env 未載入）</div>;
  }

  if (secret !== adminSecret) {
    redirect("/");
  }

  return <AdminPanel secret={adminSecret} />;
}
