import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, PoundSterling, TrendingUp, CreditCard, BarChart3, AlertCircle, FilePlus, Receipt, Building2, Calculator, FileText, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LLMGuide from "@/components/llm-guide";
import ModuleLogo from "@/components/module-logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface MoneyDashboardMetrics {
  monthlyRevenue: number;
  expenses: number;
  profitLoss: number;
  vatDue: number;
  overdueInvoices: number;
}

interface Transaction {
  id: string;
  description: string;
  amount: string;
  category: 'income' | 'expense';
  date: string;
  subcategory?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  description: string;
  totalAmount: string;
  status: string;
  dueDate: string;
}

interface TaxCalculation {
  profit: number;
  taxRate: number;
  estimatedTax: number;
  allowances: number;
}

const transactionSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.enum(['income', 'expense']),
  subcategory: z.string().optional(),
  date: z.string().min(1, "Date is required")
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email().optional().or(z.literal("")),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  vatAmount: z.string().optional(),
  dueDate: z.string().optional()
});

type TransactionFormData = z.infer<typeof transactionSchema>;
type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function ChironMoney() {
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<MoneyDashboardMetrics>({
    queryKey: ['/api/money/dashboard']
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/money/transactions']
  });

  const { data: taxCalculation } = useQuery<TaxCalculation>({
    queryKey: ['/api/money/calculations/corporation-tax']
  });

  const transactionForm = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: '',
      category: 'income',
      subcategory: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const invoiceForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      clientName: '',
      clientEmail: '',
      description: '',
      amount: '',
      vatAmount: '',
      dueDate: ''
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const response = await fetch('/api/money/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create transaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/money/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/money/transactions'] });
      toast({ title: "Success", description: "Transaction created successfully" });
      setShowTransactionDialog(false);
      transactionForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const totalAmount = data.vatAmount ? 
        (parseFloat(data.amount) + parseFloat(data.vatAmount)).toString() : 
        data.amount;
      
      const response = await fetch('/api/money/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, totalAmount }),
      });
      if (!response.ok) throw new Error('Failed to create invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/money/dashboard'] });
      toast({ title: "Success", description: "Invoice created successfully" });
      setShowInvoiceDialog(false);
      invoiceForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-clinical-gray hover:text-chiron-blue">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center space-x-3">
              <ModuleLogo moduleName="money" icon={PoundSterling} />
              <h1 className="text-xl font-semibold text-slate-900">ChironMoney</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
            Bank Connection Required
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Financial Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800">
                    <strong>Disclaimer:</strong> ChironMoney provides financial estimates for informational purposes only and is not a substitute for professional accounting advice. Please consult with a qualified accountant for financial decisions.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Financial Metrics */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Monthly Revenue</h3>
                  <TrendingUp className="w-5 h-5 text-medical-green" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? '...' : formatCurrency(metrics?.monthlyRevenue || 0)}
                </p>
                <p className="text-sm text-medical-green">+12% vs last month</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Expenses</h3>
                  <CreditCard className="w-5 h-5 text-chiron-orange" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? '...' : formatCurrency(metrics?.expenses || 0)}
                </p>
                <p className="text-sm text-clinical-gray">This month</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">Profit/Loss</h3>
                  <BarChart3 className="w-5 h-5 text-chiron-blue" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? '...' : formatCurrency(metrics?.profitLoss || 0)}
                </p>
                <p className="text-sm text-medical-green">
                  {metrics?.monthlyRevenue && metrics.monthlyRevenue > 0 ? 
                    `${((metrics.profitLoss / metrics.monthlyRevenue) * 100).toFixed(1)}% margin` : 
                    'No data'
                  }
                </p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-clinical-gray">VAT Due</h3>
                  <FileText className="w-5 h-5 text-alert-red" />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {metricsLoading ? '...' : formatCurrency(metrics?.vatDue || 0)}
                </p>
                <p className="text-sm text-alert-red">Due in 12 days</p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                    >
                      <FilePlus className="w-8 h-8 text-chiron-blue" />
                      <span className="text-sm font-medium text-slate-700">Create Invoice</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Invoice</DialogTitle>
                    </DialogHeader>
                    <Form {...invoiceForm}>
                      <form onSubmit={invoiceForm.handleSubmit((data) => createInvoiceMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="invoiceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Invoice Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={invoiceForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={invoiceForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount (£) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={invoiceForm.control}
                            name="vatAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>VAT Amount (£)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-4">
                          <Button type="button" variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createInvoiceMutation.isPending}>
                            {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                    >
                      <Receipt className="w-8 h-8 text-chiron-blue" />
                      <span className="text-sm font-medium text-slate-700">Log Expense</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Transaction</DialogTitle>
                    </DialogHeader>
                    <Form {...transactionForm}>
                      <form onSubmit={transactionForm.handleSubmit((data) => createTransactionMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={transactionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={transactionForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount (£) *</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={transactionForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={transactionForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-4">
                          <Button type="button" variant="outline" onClick={() => setShowTransactionDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createTransactionMutation.isPending}>
                            {createTransactionMutation.isPending ? 'Saving...' : 'Save Transaction'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  disabled
                >
                  <Building2 className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">Connect Bank</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center p-4 h-auto space-y-2 hover:bg-slate-50"
                  disabled
                >
                  <Calculator className="w-8 h-8 text-chiron-blue" />
                  <span className="text-sm font-medium text-slate-700">Tax Calculator</span>
                </Button>
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card className="p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
                <Button variant="outline" size="sm" disabled>View All</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 font-medium text-clinical-gray">Date</th>
                      <th className="py-2 font-medium text-clinical-gray">Description</th>
                      <th className="py-2 font-medium text-clinical-gray">Category</th>
                      <th className="py-2 font-medium text-clinical-gray text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-clinical-gray">
                          No transactions found. Add your first transaction above.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Sample transactions for demonstration */}
                        <tr>
                          <td className="py-3 text-slate-900">Dec 15</td>
                          <td className="py-3 text-slate-900">Patient Consultation Fee</td>
                          <td className="py-3">
                            <Badge className="bg-green-100 text-medical-green border-green-200">Income</Badge>
                          </td>
                          <td className="py-3 text-right text-medical-green font-medium">+£180.00</td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-900">Dec 14</td>
                          <td className="py-3 text-slate-900">Medical Supplies Purchase</td>
                          <td className="py-3">
                            <Badge className="bg-orange-100 text-chiron-orange border-orange-200">Expense</Badge>
                          </td>
                          <td className="py-3 text-right text-slate-900 font-medium">-£245.50</td>
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-900">Dec 14</td>
                          <td className="py-3 text-slate-900">Private Health Check</td>
                          <td className="py-3">
                            <Badge className="bg-green-100 text-medical-green border-green-200">Income</Badge>
                          </td>
                          <td className="py-3 text-right text-medical-green font-medium">+£350.00</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Tax & Compliance Alerts */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tax & Compliance Alerts</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-alert-red mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">VAT Return Due Soon</p>
                    <p className="text-xs text-red-600">VAT return for Q4 due on 31st December (12 days remaining)</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-alert-red border-red-300 hover:bg-red-50" disabled>
                    Submit
                  </Button>
                </div>
                
                <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Calculator className="w-5 h-5 text-amber-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Corporation Tax Estimation</p>
                    <p className="text-xs text-amber-600">
                      Estimated liability: {taxCalculation ? formatCurrency(taxCalculation.estimatedTax) : '£0.00'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50" disabled>
                    Calculate
                  </Button>
                </div>
                
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Building2 className="w-5 h-5 text-chiron-blue mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Open Banking Integration</p>
                    <p className="text-xs text-blue-600">Connect your business bank account for automatic transaction imports</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-chiron-blue border-blue-300 hover:bg-blue-50" disabled>
                    Connect
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* LLM Financial Guide */}
          <div className="lg:col-span-1">
            <LLMGuide
              title="Financial Assistant"
              subtitle="Tax & accounting guidance"
              initialMessage="I can help you with VAT submissions, corporation tax calculations, and expense categorization. Your VAT return is due soon - shall I help you prepare it?"
              placeholder="Ask about finances..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
