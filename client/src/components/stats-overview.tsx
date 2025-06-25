import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Check, X, DollarSign } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";

interface Stats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalAmount: string;
}

export function StatsOverview() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                <div className="ml-4">
                  <div className="h-4 w-16 bg-slate-200 rounded mb-2"></div>
                  <div className="h-8 w-12 bg-slate-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Pending",
      value: stats?.pendingCount || 0,
      icon: Clock,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Approved",
      value: stats?.approvedCount || 0,
      icon: Check,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Rejected",
      value: stats?.rejectedCount || 0,
      icon: X,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      title: "Total Amount",
      value: stats?.totalAmount || "$0.00",
      icon: DollarSign,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title} className="shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
