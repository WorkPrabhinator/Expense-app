import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

const expenseFormSchema = insertExpenseSchema.omit({
  employeeId: true,
  employeeName: true,
  employeeEmail: true,
  department: true,
}).extend({
  amount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseFormModal({ isOpen, onClose }: ExpenseFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      category: "Other",
      expenseDate: new Date().toISOString().split('T')[0],
      receiptUrl: "",
      receiptFileName: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const authHeaders = getAuthHeader();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Expense submitted successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await createExpenseMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "Meals & Entertainment",
    "Transportation",
    "Lodging",
    "Travel",
    "Office Supplies",
    "Equipment",
    "Software",
    "Training",
    "Other",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                type="date"
                {...form.register("expenseDate")}
              />
              {form.formState.errors.expenseDate && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.expenseDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the expense..."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.watch("category")}
              onValueChange={(value) => form.setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="receiptUrl">Receipt URL (Optional)</Label>
            <Input
              id="receiptUrl"
              type="url"
              placeholder="https://example.com/receipt.pdf"
              {...form.register("receiptUrl")}
            />
            <p className="text-sm text-slate-500 mt-1">
              If you have uploaded your receipt to Google Drive or another service, paste the link here
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createExpenseMutation.isPending}
            >
              {isSubmitting ? "Submitting..." : "Submit Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}