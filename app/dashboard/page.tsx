import { Topbar } from "@/components/layout/Topbar";
import { DashboardOverview } from "@/components/DashboardOverview";

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <DashboardOverview />
      </div>
    </>
  );
}
