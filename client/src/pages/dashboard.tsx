import { AppHeader } from "@/components/app-header";
import { StatsOverview } from "../components/stats-overview";
import { ExpenseList } from "@/components/expense-list";
import { ActionsSidebar } from "@/components/actions-sidebar";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <ExpenseList />
          </div>
          <div className="lg:col-span-1">
            <ActionsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
