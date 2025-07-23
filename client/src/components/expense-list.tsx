import { supabase } from '../lib/supabaseClient';

async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}



import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Paperclip, Plus } from "lucide-react";
import { ExpenseDetailModal } from "./expense-detail-modal";
import { ExpenseFormModal } from "./expense-form";
import { getAuthHeader } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseWithFormattedAmount } from "@shared/schema";

export function ExpenseList() {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithFormattedAmount | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<ExpenseWithFormattedAmount[]>({
    queryKey: ["/api/expenses", { status: statusFilter }],
    queryFn: async () => {
      const authHeaders = getAuthHeader();
      const headers: Record<string, string> = {};
      
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch(`/api/expenses?status=${statusFilter}`, {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const authHeaders = getAuthHeader();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch(`/api/expenses/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status, approvalNote: note }),
      });
      if (!response.ok) throw new Error("Failed to update expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSelectedExpense(null);
    },
  });

  const handleApprove = async (id: number, note?: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "approved", note });
      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve expense",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: number, note?: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "rejected", note });
      toast({
        title: "Success",
        description: "Expense rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject expense",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border-b border-slate-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                  <div>
                    <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                  </div>
                </div>
                <div>
                  <div className="h-6 w-16 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {statusFilter === "pending" ? "Pending" : statusFilter === "approved" ? "Approved" : "Rejected"} Expenses
            </h2>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsExpenseFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {expenses.length === 0 ? (
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No {statusFilter} expenses found</p>
          </CardContent>
        ) : (
          <>
            {expenses.map((expense) => (
              <div 
                key={expense.id} 
                className="p-6 border-b border-slate-100 hover:bg-slate-25 transition-colors cursor-pointer"
                onClick={() => setSelectedExpense(expense)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-sm font-medium">
                        {expense.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{expense.employeeName}</h3>
                      <p className="text-sm text-slate-500">{expense.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">{expense.formattedAmount}</p>
                    <p className="text-sm text-slate-500">{expense.formattedDate}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-sm text-slate-700">{expense.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(expense.status)}
                      <span className="text-sm text-slate-500">•</span>
                      <span className="text-sm text-slate-500">{expense.category}</span>
                      {expense.receiptUrl && (
                        <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                          <Paperclip className="h-3 w-3 mr-1" />
                          View Receipt
                        </Button>
                      )}
                    </div>
                    
                    {expense.status === "pending" && (
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                          onClick={() => handleReject(expense.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                          onClick={() => handleApprove(expense.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="px-6 py-4 bg-slate-50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Showing {expenses.length} {statusFilter} expenses
                </span>
                <Button variant="link" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        isLoading={updateStatusMutation.isPending}
      />

      <ExpenseFormModal
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
      />
    </>
  );
}
