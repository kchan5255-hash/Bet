import { HistoryDashboard } from "@/components/HistoryDashboard";
import { getHistoryDashboardData } from "@/lib/history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const data = getHistoryDashboardData();

  return (
    <div className="mx-auto max-w-3xl md:max-w-5xl px-4 md:px-6 pt-4 md:pt-8 pb-8">
      <HistoryDashboard data={data} />
    </div>
  );
}
