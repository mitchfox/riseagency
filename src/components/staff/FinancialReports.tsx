import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, FileText, Download, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface InvoiceSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
}

interface PaymentSummary {
  income: number;
  expenses: number;
  net: number;
}

export const FinancialReports = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("this-month");
  const [loading, setLoading] = useState(true);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary>({ total: 0, paid: 0, pending: 0, overdue: 0 });
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({ income: 0, expenses: 0, net: 0 });

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status, due_date');

      if (invoices) {
        const today = new Date();
        const summary: InvoiceSummary = {
          total: invoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
          paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0),
          pending: invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0),
          overdue: invoices.filter(inv => inv.status === 'pending' && new Date(inv.due_date) < today).reduce((sum, inv) => sum + Number(inv.amount), 0)
        };
        setInvoiceSummary(summary);
      }

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, type');

      if (payments) {
        const income = payments.filter(p => p.type === 'in').reduce((sum, p) => sum + Number(p.amount), 0);
        const expenses = payments.filter(p => p.type === 'out').reduce((sum, p) => sum + Number(p.amount), 0);
        setPaymentSummary({
          income,
          expenses,
          net: income - expenses
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }: { title: string; value: string; icon: any; trend?: string; color?: string }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
            Financial Reports
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Overview of financial performance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoice Summary</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Revenue"
                value={`£${paymentSummary.income.toLocaleString()}`}
                icon={TrendingUp}
                color="text-green-500"
              />
              <StatCard
                title="Total Expenses"
                value={`£${paymentSummary.expenses.toLocaleString()}`}
                icon={TrendingDown}
                color="text-destructive"
              />
              <StatCard
                title="Net Profit"
                value={`£${paymentSummary.net.toLocaleString()}`}
                icon={DollarSign}
                color={paymentSummary.net >= 0 ? 'text-green-500' : 'text-destructive'}
              />
              <StatCard
                title="Outstanding Invoices"
                value={`£${invoiceSummary.pending.toLocaleString()}`}
                icon={FileText}
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoice Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-green-500">£{invoiceSummary.paid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium text-yellow-500">£{invoiceSummary.pending.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Overdue</span>
                    <span className="font-medium text-destructive">£{invoiceSummary.overdue.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">£{invoiceSummary.total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cash Flow Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Money In</span>
                    <span className="font-medium text-green-500">+£{paymentSummary.income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Money Out</span>
                    <span className="font-medium text-destructive">-£{paymentSummary.expenses.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-medium">Net Cash Flow</span>
                    <span className={`font-bold ${paymentSummary.net >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                      {paymentSummary.net >= 0 ? '+' : ''}£{paymentSummary.net.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Detailed invoice reports coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashflow" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cash flow charts coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
