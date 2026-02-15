import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Wallet, Receipt, AlertCircle } from "lucide-react";

interface FinancialSnapshot {
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalExpenses: number;
  currency: string;
}

export const FinancialOverviewWidget = () => {
  const [data, setData] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancials = async () => {
      try {
        const [invoicesRes, expensesRes] = await Promise.all([
          supabase.from("invoices").select("amount, amount_paid, status, due_date, currency"),
          supabase.from("expenses").select("amount, reimbursed"),
        ]);

        const invoices = invoicesRes.data || [];
        const expenses = expensesRes.data || [];
        const today = new Date();

        // Total received = sum of amount_paid across all invoices
        const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);

        // Outstanding = total invoiced minus total paid (for non-paid invoices)
        const totalOutstanding = invoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid || 0)), 0);

        // Overdue = outstanding on invoices past due date
        const totalOverdue = invoices
          .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < today)
          .reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid || 0)), 0);

        // Total expenses
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Use most common currency from invoices
        const currency = invoices.length > 0 ? (invoices[0].currency || "EUR") : "EUR";

        setData({ totalReceived, totalOutstanding, totalOverdue, totalExpenses, currency });
      } catch (err) {
        console.error("Error fetching financial overview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancials();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Unable to load financial data
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    const symbol = data.currency === "GBP" ? "£" : data.currency === "USD" ? "$" : "€";
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const items = [
    {
      label: "Received",
      value: formatAmount(data.totalReceived),
      icon: TrendingUp,
      colorClass: "text-emerald-600",
      bgClass: "from-emerald-500/10 to-emerald-600/10",
      borderClass: "border-emerald-500/30",
    },
    {
      label: "Outstanding",
      value: formatAmount(data.totalOutstanding),
      icon: Wallet,
      colorClass: "text-amber-600",
      bgClass: "from-amber-500/10 to-amber-600/10",
      borderClass: "border-amber-500/30",
    },
    {
      label: "Overdue",
      value: data.totalOverdue > 0 ? formatAmount(data.totalOverdue) : "—",
      icon: AlertCircle,
      colorClass: "text-rose-600",
      bgClass: "from-rose-500/10 to-rose-600/10",
      borderClass: "border-rose-500/30",
    },
    {
      label: "Expenses",
      value: data.totalExpenses > 0 ? formatAmount(data.totalExpenses) : "—",
      icon: Receipt,
      colorClass: "text-blue-600",
      bgClass: "from-blue-500/10 to-blue-600/10",
      borderClass: "border-blue-500/30",
    },
    {
      label: "Net Position",
      value: formatAmount(data.totalReceived - data.totalExpenses),
      icon: data.totalReceived - data.totalExpenses >= 0 ? TrendingUp : TrendingDown,
      colorClass: data.totalReceived - data.totalExpenses >= 0 ? "text-emerald-600" : "text-rose-600",
      bgClass: "from-primary/20 to-primary/5",
      borderClass: "border-primary/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 h-full">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col justify-center p-3 bg-gradient-to-br ${item.bgClass} rounded border ${item.borderClass}`}
        >
          <div className={`text-sm md:text-lg font-bold ${item.colorClass}`}>{item.value}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
};
