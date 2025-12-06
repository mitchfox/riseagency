import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Copy, Check, MoreHorizontal, CheckCircle, CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  player_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  pdf_url: string | null;
  billing_month: string | null;
  amount_paid: number;
  converted_amount: number | null;
  converted_currency: string | null;
  created_at: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface Player {
  id: string;
  name: string;
  preferred_currency: string | null;
}

export const InvoiceManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<string>("invoices");
  
  // Inline editing for received amounts
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentValue, setEditingPaymentValue] = useState("");
  const [editingPaymentCurrency, setEditingPaymentCurrency] = useState("GBP");
  
  // Pay amount dialog
  const [payAmountDialogOpen, setPayAmountDialogOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("GBP");
  const [payMethod, setPayMethod] = useState("");
  
  // Simple conversion rates (GBP base)
  const conversionRates: Record<string, number> = {
    "GBP": 1,
    "EUR": 1.17,  // 1 GBP = 1.17 EUR
    "USD": 1.27   // 1 GBP = 1.27 USD
  };
  
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    // Convert to GBP first, then to target
    const inGBP = amount / conversionRates[fromCurrency];
    return inGBP * conversionRates[toCurrency];
  };

  const [formData, setFormData] = useState({
    player_id: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    amount: "",
    currency: "EUR",
    status: "pending",
    description: "",
    pdf_url: "",
    billing_month: "",
    amount_paid: "0",
    amount_paid_currency: "GBP",
    converted_amount: "",
    converted_currency: ""
  });

  // Get selected player's preferred currency
  const selectedPlayerData = players.find(p => p.id === formData.player_id);
  const playerPreferredCurrency = selectedPlayerData?.preferred_currency || "GBP";
  const showConversionFields = formData.currency && formData.currency !== playerPreferredCurrency;
  
  // Calculate converted amount_paid for display
  const amountPaidInInvoiceCurrency = formData.amount_paid && formData.amount_paid_currency !== formData.currency
    ? convertCurrency(parseFloat(formData.amount_paid) || 0, formData.amount_paid_currency, formData.currency)
    : parseFloat(formData.amount_paid) || 0;

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (selectedPlayer !== "all" && inv.player_id !== selectedPlayer) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    return true;
  });

  // Calculate totals for selected player
  const playerInvoices = selectedPlayer !== "all" 
    ? invoices.filter(inv => inv.player_id === selectedPlayer)
    : invoices;

  const totalOutstanding = playerInvoices
    .filter(inv => inv.status === "pending" || inv.status === "overdue")
    .reduce((acc, inv) => {
      const remaining = inv.amount - (inv.amount_paid || 0);
      if (remaining > 0) {
        if (inv.converted_amount && inv.converted_currency) {
          const convertedRemaining = inv.converted_amount - ((inv.amount_paid || 0) * (inv.converted_amount / inv.amount));
          if (!acc[inv.converted_currency]) acc[inv.converted_currency] = 0;
          acc[inv.converted_currency] += convertedRemaining;
        } else {
          if (!acc[inv.currency]) acc[inv.currency] = 0;
          acc[inv.currency] += remaining;
        }
      }
      return acc;
    }, {} as Record<string, number>);

  const totalReceived = playerInvoices.reduce((acc, inv) => {
    if ((inv.amount_paid || 0) > 0) {
      if (!acc[inv.currency]) acc[inv.currency] = 0;
      acc[inv.currency] += (inv.amount_paid || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    fetchPlayers();
    fetchInvoices();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, preferred_currency')
      .order('name');

    if (error) {
      toast.error("Error fetching players");
      return;
    }

    setPlayers(data || []);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (error) {
      toast.error("Error fetching invoices");
      setLoading(false);
      return;
    }

    setInvoices(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.player_id) {
      toast.error("Please select a player");
      return;
    }

    // Convert amount_paid to invoice currency if different
    const amountPaidConverted = formData.amount_paid_currency !== formData.currency
      ? convertCurrency(parseFloat(formData.amount_paid) || 0, formData.amount_paid_currency, formData.currency)
      : parseFloat(formData.amount_paid) || 0;

    const invoiceData = {
      player_id: formData.player_id,
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      status: formData.status,
      description: formData.description || null,
      pdf_url: formData.pdf_url || null,
      billing_month: formData.billing_month || null,
      amount_paid: amountPaidConverted,
      converted_amount: formData.converted_amount ? parseFloat(formData.converted_amount) : null,
      converted_currency: formData.converted_currency || null
    };

    if (editingInvoice) {
      const { error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', editingInvoice.id);

      if (error) {
        toast.error("Error updating invoice");
        return;
      }

      toast.success("Invoice updated successfully");
    } else {
      const { error } = await supabase
        .from('invoices')
        .insert([invoiceData]);

      if (error) {
        toast.error("Error creating invoice");
        return;
      }

      toast.success("Invoice created successfully");
    }

    setDialogOpen(false);
    resetForm();
    fetchInvoices();
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      player_id: invoice.player_id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description || "",
      pdf_url: invoice.pdf_url || "",
      billing_month: invoice.billing_month || "",
      amount_paid: (invoice.amount_paid || 0).toString(),
      amount_paid_currency: invoice.currency, // Default to invoice currency when editing
      converted_amount: invoice.converted_amount?.toString() || "",
      converted_currency: invoice.converted_currency || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Error deleting invoice");
      return;
    }

    toast.success("Invoice deleted successfully");
    fetchInvoices();
  };

  const handleDuplicate = (invoice: Invoice) => {
    const newNumber = `${invoice.invoice_number}-COPY`;
    
    setEditingInvoice(null);
    setFormData({
      player_id: invoice.player_id,
      invoice_number: newNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: invoice.due_date,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      status: "pending",
      description: invoice.description || "",
      pdf_url: invoice.pdf_url || "",
      billing_month: invoice.billing_month || "",
      amount_paid: "0",
      amount_paid_currency: "GBP",
      converted_amount: invoice.converted_amount?.toString() || "",
      converted_currency: invoice.converted_currency || ""
    });
    setDialogOpen(true);
  };

  const handleSavePayment = async (invoiceId: string, inputAmount: number, inputCurrency: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Convert the input amount to the invoice currency
    const convertedAmount = convertCurrency(inputAmount, inputCurrency, invoice.currency);
    const newStatus = convertedAmount >= invoice.amount ? "paid" : invoice.status;

    const { error } = await supabase
      .from('invoices')
      .update({ 
        amount_paid: convertedAmount,
        status: newStatus
      })
      .eq('id', invoiceId);

    if (error) {
      toast.error("Error updating payment");
      return;
    }

    toast.success(inputCurrency !== invoice.currency 
      ? `Payment updated (${inputAmount.toFixed(2)} ${inputCurrency} → ${convertedAmount.toFixed(2)} ${invoice.currency})`
      : "Payment updated"
    );
    setEditingPaymentId(null);
    setEditingPaymentCurrency("GBP");
    fetchInvoices();
  };

  // Settle invoice (mark as fully paid)
  const handleSettleInvoice = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ 
        amount_paid: invoice.amount,
        status: 'paid'
      })
      .eq('id', invoice.id);

    if (error) {
      toast.error("Error settling invoice");
      return;
    }

    toast.success("Invoice settled");
    fetchInvoices();
  };

  // Open pay amount dialog
  const openPayDialog = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    const remaining = invoice.amount - (invoice.amount_paid || 0);
    setPayAmount(remaining.toFixed(2));
    setPayCurrency(invoice.currency);
    setPayMethod("");
    setPayAmountDialogOpen(true);
  };

  // Handle pay amount submission
  const handlePayAmount = async () => {
    if (!payingInvoice) return;
    
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Convert to invoice currency if different
    const convertedAmount = convertCurrency(amount, payCurrency, payingInvoice.currency);
    const newTotal = (payingInvoice.amount_paid || 0) + convertedAmount;
    const newStatus = newTotal >= payingInvoice.amount ? "paid" : payingInvoice.status;

    const { error } = await supabase
      .from('invoices')
      .update({ 
        amount_paid: newTotal,
        status: newStatus
      })
      .eq('id', payingInvoice.id);

    if (error) {
      toast.error("Error recording payment");
      return;
    }

    // Also record in payments table
    await supabase.from('payments').insert({
      type: 'in',
      amount: amount,
      currency: payCurrency,
      description: `Payment for invoice ${payingInvoice.invoice_number}`,
      payment_method: payMethod || null,
      invoice_id: payingInvoice.id,
      player_id: payingInvoice.player_id,
      payment_date: new Date().toISOString().split('T')[0]
    });

    toast.success("Payment recorded");
    setPayAmountDialogOpen(false);
    setPayingInvoice(null);
    fetchInvoices();
  };

  const resetForm = () => {
    setEditingInvoice(null);
    setFormData({
      player_id: selectedPlayer !== "all" ? selectedPlayer : "",
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      amount: "",
      currency: "EUR",
      status: "pending",
      description: "",
      pdf_url: "",
      billing_month: "",
      amount_paid: "0",
      amount_paid_currency: "GBP",
      converted_amount: "",
      converted_currency: ""
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      paid: "default",
      overdue: "destructive",
      cancelled: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || "Unknown";
  };

  const handleNewInvoice = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    setActiveSubTab("invoices");
  };

  // Quick actions renderer
  const renderQuickActions = (invoice: Invoice) => {
    const remaining = invoice.amount - (invoice.amount_paid || 0);
    const isPaid = invoice.status === 'paid' || remaining <= 0;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isPaid && (
            <>
              <DropdownMenuItem onClick={() => openPayDialog(invoice)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSettleInvoice(invoice)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Settle Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => handleEdit(invoice)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDuplicate(invoice)}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {invoice.pdf_url && (
            <DropdownMenuItem onClick={() => window.open(invoice.pdf_url!, '_blank')}>
              <FileText className="w-4 h-4 mr-2" />
              View PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl md:text-2xl font-bold">Invoice Management</h2>
        {isAdmin && (
          <Button size="sm" className="w-full sm:w-auto md:h-10" onClick={handleNewInvoice}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Invoice</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      {/* Player Tabs */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedPlayer === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePlayerSelect("all")}
            className="flex-shrink-0"
          >
            All Players
          </Button>
          {players.map((player) => (
            <Button
              key={player.id}
              variant={selectedPlayer === player.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePlayerSelect(player.id)}
              className="flex-shrink-0"
            >
              {player.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Sub-tabs when a player is selected */}
      {selectedPlayer !== "all" && (
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="received">What's Been Received</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            {/* Status filter */}
            <div className="w-full sm:w-48">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Outstanding Card */}
            {Object.keys(totalOutstanding).length > 0 && (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Outstanding</span>
                    <div className="flex gap-4">
                      {Object.entries(totalOutstanding).map(([currency, amount]) => (
                        <span key={currency} className="text-lg font-bold text-destructive">
                          {amount.toFixed(2)} {currency}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoices Table */}
            {loading ? (
              <div className="text-center py-8">Loading invoices...</div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="w-full">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Month</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No invoices found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredInvoices.map((invoice) => {
                              const remaining = invoice.amount - (invoice.amount_paid || 0);
                              const isPartiallyPaid = (invoice.amount_paid || 0) > 0 && remaining > 0;
                              
                              return (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                                  <TableCell className="text-muted-foreground">{invoice.billing_month || "-"}</TableCell>
                                  <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell>{format(new Date(invoice.due_date), 'dd/MM/yyyy')}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span>{invoice.amount.toFixed(2)} {invoice.currency}</span>
                                      {invoice.converted_amount && invoice.converted_currency && (
                                        <span className="text-xs text-muted-foreground">
                                          ({invoice.converted_amount.toFixed(2)} {invoice.converted_currency})
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {isPartiallyPaid ? (
                                      <span className="text-primary font-medium">
                                        {(invoice.amount_paid || 0).toFixed(2)} / {invoice.amount.toFixed(2)}
                                      </span>
                                    ) : invoice.status === "paid" ? (
                                      <span className="text-green-500">Paid</span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 items-center">
                                      {invoice.status !== 'paid' && remaining > 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => openPayDialog(invoice)}
                                        >
                                          <DollarSign className="w-3 h-3 mr-1" />
                                          Pay
                                        </Button>
                                      )}
                                      {renderQuickActions(invoice)}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            {/* Total Received Card */}
            {Object.keys(totalReceived).length > 0 && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Received</span>
                    <div className="flex gap-4">
                      {Object.entries(totalReceived).map(([currency, amount]) => (
                        <span key={currency} className="text-lg font-bold text-green-500">
                          {amount.toFixed(2)} {currency}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Received Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Invoice Amount</TableHead>
                          <TableHead>Amount Received</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No invoices for this player
                            </TableCell>
                          </TableRow>
                        ) : (
                          playerInvoices.map((invoice) => {
                            const remaining = invoice.amount - (invoice.amount_paid || 0);
                            const isEditing = editingPaymentId === invoice.id;
                            
                            return (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                                <TableCell className="text-muted-foreground">{invoice.billing_month || "-"}</TableCell>
                                <TableCell>{invoice.amount.toFixed(2)} {invoice.currency}</TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={editingPaymentValue}
                                          onChange={(e) => setEditingPaymentValue(e.target.value)}
                                          className="w-24 h-8"
                                          autoFocus
                                        />
                                        <Select
                                          value={editingPaymentCurrency}
                                          onValueChange={setEditingPaymentCurrency}
                                        >
                                          <SelectTrigger className="w-20 h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="GBP">GBP</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={() => handleSavePayment(invoice.id, parseFloat(editingPaymentValue) || 0, editingPaymentCurrency)}
                                        >
                                          <Check className="w-4 h-4 text-green-500" />
                                        </Button>
                                      </div>
                                      {editingPaymentCurrency !== invoice.currency && parseFloat(editingPaymentValue) > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          ≈ {convertCurrency(parseFloat(editingPaymentValue) || 0, editingPaymentCurrency, invoice.currency).toFixed(2)} {invoice.currency}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span 
                                      className={`cursor-pointer hover:underline ${(invoice.amount_paid || 0) > 0 ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}
                                      onClick={() => {
                                        setEditingPaymentId(invoice.id);
                                        setEditingPaymentValue((invoice.amount_paid || 0).toString());
                                        setEditingPaymentCurrency(invoice.currency);
                                      }}
                                    >
                                      {(invoice.amount_paid || 0).toFixed(2)} {invoice.currency}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={remaining > 0 ? 'text-destructive font-medium' : 'text-green-500'}>
                                    {remaining > 0 ? `${remaining.toFixed(2)} ${invoice.currency}` : 'Fully Paid'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {!isEditing && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingPaymentId(invoice.id);
                                        setEditingPaymentValue((invoice.amount_paid || 0).toString());
                                        setEditingPaymentCurrency(invoice.currency);
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Show all invoices view when "All Players" selected */}
      {selectedPlayer === "all" && (
        <>
          <div className="w-full sm:w-48">
            <Label>Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Outstanding Card */}
          {Object.keys(totalOutstanding).length > 0 && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Outstanding</span>
                  <div className="flex gap-4">
                    {Object.entries(totalOutstanding).map(([currency, amount]) => (
                      <span key={currency} className="text-lg font-bold text-destructive">
                        {amount.toFixed(2)} {currency}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-8">Loading invoices...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[1100px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No invoices found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredInvoices.map((invoice) => {
                            const remaining = invoice.amount - (invoice.amount_paid || 0);
                            const isPartiallyPaid = (invoice.amount_paid || 0) > 0 && remaining > 0;
                            
                            return (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                                <TableCell>{getPlayerName(invoice.player_id)}</TableCell>
                                <TableCell className="text-muted-foreground">{invoice.billing_month || "-"}</TableCell>
                                <TableCell>{format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{format(new Date(invoice.due_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{invoice.amount.toFixed(2)} {invoice.currency}</span>
                                    {invoice.converted_amount && invoice.converted_currency && (
                                      <span className="text-xs text-muted-foreground">
                                        ({invoice.converted_amount.toFixed(2)} {invoice.converted_currency})
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isPartiallyPaid ? (
                                    <span className="text-primary font-medium">
                                      {(invoice.amount_paid || 0).toFixed(2)} / {invoice.amount.toFixed(2)}
                                    </span>
                                  ) : invoice.status === "paid" ? (
                                    <span className="text-green-500">Paid</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1 items-center">
                                    {invoice.status !== 'paid' && remaining > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => openPayDialog(invoice)}
                                      >
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                    {renderQuickActions(invoice)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player_id">Player *</Label>
              <Select
                value={formData.player_id}
                onValueChange={(value) => setFormData({ ...formData, player_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} ({player.preferred_currency || 'GBP'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CZK">CZK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conversion fields */}
            {showConversionFields && formData.player_id && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="converted_amount">
                    Converted Amount ({playerPreferredCurrency})
                  </Label>
                  <Input
                    id="converted_amount"
                    type="number"
                    step="0.01"
                    value={formData.converted_amount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      converted_amount: e.target.value,
                      converted_currency: playerPreferredCurrency 
                    })}
                    placeholder={`Amount in ${playerPreferredCurrency}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Player's Preferred Currency</Label>
                  <Input value={playerPreferredCurrency} disabled />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_month">Billing Month</Label>
                <Select
                  value={formData.billing_month}
                  onValueChange={(value) => setFormData({ ...formData, billing_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Select
                    value={formData.amount_paid_currency}
                    onValueChange={(value) => setFormData({ ...formData, amount_paid_currency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.amount_paid_currency !== formData.currency && parseFloat(formData.amount_paid) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {amountPaidInInvoiceCurrency.toFixed(2)} {formData.currency} (invoice currency)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Invoice description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf_url">PDF URL</Label>
              <Input
                id="pdf_url"
                type="url"
                value={formData.pdf_url}
                onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingInvoice ? "Update" : "Create"} Invoice
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Amount Dialog */}
      <Dialog open={payAmountDialogOpen} onOpenChange={setPayAmountDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {payingInvoice && `Invoice: ${payingInvoice.invoice_number}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={payCurrency} onValueChange={setPayCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayAmountDialogOpen(false)}>Cancel</Button>
              <Button onClick={handlePayAmount}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
