import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import type { ExpenseWithFormattedAmount } from "@shared/schema";

interface ExpenseDetailModalProps {
  expense: ExpenseWithFormattedAmount | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: number, note?: string) => Promise<void>;
  onReject: (id: number, note?: string) => Promise<void>;
  isLoading: boolean;
}

export function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading,
}: ExpenseDetailModalProps) {
  const [approvalNote, setApprovalNote] = useState("");

  if (!expense) return null;

  const handleApprove = async () => {
    await onApprove(expense.id, approvalNote);
    setApprovalNote("");
  };

  const handleReject = async () => {
    await onReject(expense.id, approvalNote);
    setApprovalNote("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Expense Details</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <Label className="text-sm font-medium text-slate-700">Employee</Label>
              <p className="mt-1 text-slate-900">{expense.employeeName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Department</Label>
              <p className="mt-1 text-slate-900">{expense.department}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Amount</Label>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{expense.formattedAmount}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Date</Label>
              <p className="mt-1 text-slate-900">{expense.formattedDate}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium text-slate-700">Description</Label>
              <p className="mt-1 text-slate-900">{expense.description}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Category</Label>
              <p className="mt-1 text-slate-900">{expense.category}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <div className="mt-1">
                {getStatusBadge(expense.status)}
              </div>
            </div>
          </div>

          {expense.receiptUrl && (
            <div className="mb-6">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Receipt</Label>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Receipt attachment</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                      View Receipt
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {expense.approvalNote && (
            <div className="mb-6">
              <Label className="text-sm font-medium text-slate-700">Previous Notes</Label>
              <p className="mt-1 text-slate-900 p-3 bg-slate-50 rounded border">{expense.approvalNote}</p>
            </div>
          )}

          {expense.status === "pending" && (
            <div className="border-t border-slate-200 pt-6">
              <div className="mb-4">
                <Label htmlFor="approvalNote" className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Note (Optional)
                </Label>
                <Textarea
                  id="approvalNote"
                  rows={3}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Add any notes or comments about this expense..."
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve Expense
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Expense
                </Button>
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
