import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mail, FileText, Circle } from "lucide-react";
import { ExpenseFormModal } from "./expense-form-modal";

export function ActionsSidebar() {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  
  const recentActivity = [
    {
      id: 1,
      message: "You approved $156.50 expense from Tom Wilson",
      time: "2 hours ago",
      type: "approved",
    },
    {
      id: 2,
      message: "New expense submitted by Lisa Chen",
      time: "4 hours ago",
      type: "submitted",
    },
    {
      id: 3,
      message: "You rejected $45.00 expense from Mark Davis",
      time: "1 day ago",
      type: "rejected",
    },
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case "approved":
        return "bg-emerald-400";
      case "submitted":
        return "bg-amber-400";
      case "rejected":
        return "bg-red-400";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Submit Expense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => setIsExpenseFormOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Receipt
          </Button>
          <Button variant="outline" className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Email to receipts@agency.com
          </Button>
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            Google Form
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${getActivityColor(activity.type)} mt-2`} />
              <div>
                <p className="text-sm text-slate-700">{activity.message}</p>
                <p className="text-xs text-slate-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Gmail Integration</span>
            <div className="flex items-center">
              <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 mr-2" />
              <span className="text-xs text-emerald-600">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Google Sheets</span>
            <div className="flex items-center">
              <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 mr-2" />
              <span className="text-xs text-emerald-600">Synced</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Slack Notifications</span>
            <div className="flex items-center">
              <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 mr-2" />
              <span className="text-xs text-emerald-600">Online</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExpenseFormModal 
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
      />
    </div>
  );
}
