import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeader } from "@/lib/auth";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { Upload, FileText, Calculator } from "lucide-react";

const expenseFormSchema = insertExpenseSchema.omit({
  employeeId: true,
  employeeName: true,
  employeeEmail: true,
  department: true,
}).extend({
  amount: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
  mileageDistance: z.string().optional(),
  mileageStartLocation: z.string().optional(),
  mileageEndLocation: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseFormModal({ isOpen, onClose }: ExpenseFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("regular");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mileage rate
  const { data: mileageRateData } = useQuery({
    queryKey: ["/api/mileage-rate"],
    enabled: isOpen && activeTab === "mileage",
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      category: "Other",
      expenseDate: new Date().toISOString().split('T')[0],
      receiptUrl: "",
      receiptFileName: "",
      mileageDistance: "",
      mileageStartLocation: "",
      mileageEndLocation: "",
    },
  });

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        if (file.size <= 5 * 1024 * 1024) { // 5MB limit
          setSelectedFile(file);
          form.setValue("receiptFileName", file.name);
        } else {
          toast({
            title: "File too large",
            description: "Please select a file smaller than 5MB",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF or image file",
          variant: "destructive",
        });
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Calculate mileage amount
  const calculateMileageAmount = () => {
    const distance = parseFloat(form.watch("mileageDistance") || "0");
    const rate = (mileageRateData as any)?.rate || 0.655;
    return distance * rate;
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const authHeaders = getAuthHeader();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }

      let submissionData = { ...data };

      // Handle file upload
      if (selectedFile) {
        const fileData = await convertFileToBase64(selectedFile);
        submissionData.receiptFileData = fileData;
        submissionData.receiptFileType = selectedFile.type;
      }

      // Handle mileage calculation
      if (activeTab === "mileage" && data.mileageDistance) {
        const calculatedAmount = calculateMileageAmount();
        submissionData.amount = calculatedAmount.toFixed(2);
        submissionData.mileageRate = ((mileageRateData as any)?.rate || 0.655).toString();
      }
      
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers,
        body: JSON.stringify(submissionData),
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
      // Validation for different expense types
      if (activeTab === "mileage") {
        if (!data.mileageDistance || !data.mileageStartLocation || !data.mileageEndLocation) {
          toast({
            title: "Missing information",
            description: "Please fill in all mileage fields",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (!data.amount) {
          toast({
            title: "Amount required",
            description: "Please enter an expense amount",
            variant: "destructive",
          });
          return;
        }
      }
      
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
    "Mileage",
    "Other",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit New Expense</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regular" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Regular Expense
            </TabsTrigger>
            <TabsTrigger value="mileage" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Mileage Expense
            </TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <TabsContent value="regular" className="space-y-6">
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

              {/* Receipt Upload Section */}
              <div className="space-y-4">
                <Label>Receipt</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload PDF/Image
                    </Button>
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <FileText className="w-4 h-4" />
                        {selectedFile.name}
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-xs text-slate-500">
                    Upload a PDF or image file (max 5MB)
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>OR</span>
                  <hr className="flex-1" />
                </div>

                <div>
                  <Label htmlFor="receiptUrl">Receipt URL</Label>
                  <Input
                    id="receiptUrl"
                    type="url"
                    placeholder="https://example.com/receipt.pdf"
                    {...form.register("receiptUrl")}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Link to receipt from Google Drive or another service
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mileage" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mileageDistance">Distance (miles)</Label>
                  <Input
                    id="mileageDistance"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    {...form.register("mileageDistance")}
                  />
                  {form.formState.errors.mileageDistance && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.mileageDistance.message}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mileageStartLocation">Start Location</Label>
                  <Input
                    id="mileageStartLocation"
                    placeholder="e.g., Office, Home"
                    {...form.register("mileageStartLocation")}
                  />
                </div>
                
                <div>
                  <Label htmlFor="mileageEndLocation">End Location</Label>
                  <Input
                    id="mileageEndLocation"
                    placeholder="e.g., Client site, Meeting venue"
                    {...form.register("mileageEndLocation")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Business Purpose</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the business purpose for travel..."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* Mileage Rate Info */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calculator className="w-4 h-4" />
                  <span className="font-medium">Mileage Calculation</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Rate: ${((mileageRateData as any)?.rate || 0.655).toFixed(3)} per mile</div>
                  <div>Distance: {form.watch("mileageDistance") || "0"} miles</div>
                  <div className="font-medium text-blue-700 dark:text-blue-300">
                    Calculated Amount: ${calculateMileageAmount().toFixed(2)}
                  </div>
                </div>
              </div>
            </TabsContent>

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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}