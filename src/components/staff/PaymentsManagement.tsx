import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Building2, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface Payment {
  id: string;
  type: 'in' | 'out';
  amount: number;
  currency: string;
  description: string | null;
  payment_method: string | null;
  reference: string | null;
  invoice_id: string | null;
  player_id: string | null;
  payment_date: string;
  created_at: string;
}

interface BankDetail {
  id: string;
  title: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  iban: string | null;
  swift_bic: string | null;
  paypal_email: string | null;
  payment_type: 'bank_transfer' | 'paypal' | 'card' | 'other';
  notes: string | null;
  is_default: boolean;
}

interface Player {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  player_id: string;
}

export const PaymentsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState<'ins' | 'outs' | 'bank_details'>('ins');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    type: 'in' as 'in' | 'out',
    amount: '',
    currency: 'GBP',
    description: '',
    payment_method: '',
    reference: '',
    invoice_id: '',
    player_id: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  // Bank details dialog
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);
  const [bankFormData, setBankFormData] = useState({
    title: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    sort_code: '',
    iban: '',
    swift_bic: '',
    paypal_email: '',
    payment_type: 'bank_transfer' as 'bank_transfer' | 'paypal' | 'card' | 'other',
    notes: '',
    is_default: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPayments(), fetchBankDetails(), fetchPlayers(), fetchInvoices()]);
    setLoading(false);
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) {
      toast.error("Error fetching payments");
      return;
    }
    setPayments((data || []) as Payment[]);
  };

  const fetchBankDetails = async () => {
    const { data, error } = await supabase
      .from('bank_details')
      .select('*')
      .order('is_default', { ascending: false });

    if (error) {
      toast.error("Error fetching bank details");
      return;
    }
    setBankDetails((data || []) as BankDetail[]);
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .order('name');

    if (!error) setPlayers(data || []);
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, player_id')
      .order('invoice_date', { ascending: false });

    if (!error) setInvoices(data || []);
  };

  // Payment CRUD
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData = {
      type: paymentFormData.type,
      amount: parseFloat(paymentFormData.amount),
      currency: paymentFormData.currency,
      description: paymentFormData.description || null,
      payment_method: paymentFormData.payment_method || null,
      reference: paymentFormData.reference || null,
      invoice_id: paymentFormData.invoice_id || null,
      player_id: paymentFormData.player_id || null,
      payment_date: paymentFormData.payment_date
    };

    if (editingPayment) {
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', editingPayment.id);

      if (error) {
        toast.error("Error updating payment");
        return;
      }
      toast.success("Payment updated");
    } else {
      const { error } = await supabase
        .from('payments')
        .insert([paymentData]);

      if (error) {
        toast.error("Error creating payment");
        return;
      }
      toast.success("Payment recorded");
    }

    setPaymentDialogOpen(false);
    resetPaymentForm();
    fetchPayments();
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Delete this payment record?")) return;

    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting payment");
      return;
    }
    toast.success("Payment deleted");
    fetchPayments();
  };

  const resetPaymentForm = () => {
    setEditingPayment(null);
    setPaymentFormData({
      type: activeTab === 'outs' ? 'out' : 'in',
      amount: '',
      currency: 'GBP',
      description: '',
      payment_method: '',
      reference: '',
      invoice_id: '',
      player_id: '',
      payment_date: new Date().toISOString().split('T')[0]
    });
  };

  const openPaymentDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormData({
        type: payment.type,
        amount: payment.amount.toString(),
        currency: payment.currency,
        description: payment.description || '',
        payment_method: payment.payment_method || '',
        reference: payment.reference || '',
        invoice_id: payment.invoice_id || '',
        player_id: payment.player_id || '',
        payment_date: payment.payment_date
      });
    } else {
      resetPaymentForm();
    }
    setPaymentDialogOpen(true);
  };

  // Bank details CRUD
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bankData = {
      title: bankFormData.title,
      bank_name: bankFormData.bank_name || null,
      account_name: bankFormData.account_name || null,
      account_number: bankFormData.account_number || null,
      sort_code: bankFormData.sort_code || null,
      iban: bankFormData.iban || null,
      swift_bic: bankFormData.swift_bic || null,
      paypal_email: bankFormData.paypal_email || null,
      payment_type: bankFormData.payment_type,
      notes: bankFormData.notes || null,
      is_default: bankFormData.is_default
    };

    if (editingBankDetail) {
      const { error } = await supabase
        .from('bank_details')
        .update(bankData)
        .eq('id', editingBankDetail.id);

      if (error) {
        toast.error("Error updating bank details");
        return;
      }
      toast.success("Bank details updated");
    } else {
      const { error } = await supabase
        .from('bank_details')
        .insert([bankData]);

      if (error) {
        toast.error("Error creating bank details");
        return;
      }
      toast.success("Bank details added");
    }

    setBankDialogOpen(false);
    resetBankForm();
    fetchBankDetails();
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Delete these bank details?")) return;

    const { error } = await supabase.from('bank_details').delete().eq('id', id);
    if (error) {
      toast.error("Error deleting bank details");
      return;
    }
    toast.success("Bank details deleted");
    fetchBankDetails();
  };

  const resetBankForm = () => {
    setEditingBankDetail(null);
    setBankFormData({
      title: '',
      bank_name: '',
      account_name: '',
      account_number: '',
      sort_code: '',
      iban: '',
      swift_bic: '',
      paypal_email: '',
      payment_type: 'bank_transfer',
      notes: '',
      is_default: false
    });
  };

  const openBankDialog = (bank?: BankDetail) => {
    if (bank) {
      setEditingBankDetail(bank);
      setBankFormData({
        title: bank.title,
        bank_name: bank.bank_name || '',
        account_name: bank.account_name || '',
        account_number: bank.account_number || '',
        sort_code: bank.sort_code || '',
        iban: bank.iban || '',
        swift_bic: bank.swift_bic || '',
        paypal_email: bank.paypal_email || '',
        payment_type: bank.payment_type,
        notes: bank.notes || '',
        is_default: bank.is_default
      });
    } else {
      resetBankForm();
    }
    setBankDialogOpen(true);
  };

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return '-';
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown';
  };

  const getInvoiceNumber = (invoiceId: string | null) => {
    if (!invoiceId) return '-';
    const invoice = invoices.find(i => i.id === invoiceId);
    return invoice?.invoice_number || 'Unknown';
  };

  const insPayments = payments.filter(p => p.type === 'in');
  const outsPayments = payments.filter(p => p.type === 'out');

  const totalIns = insPayments.reduce((acc, p) => {
    if (!acc[p.currency]) acc[p.currency] = 0;
    acc[p.currency] += p.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalOuts = outsPayments.reduce((acc, p) => {
    if (!acc[p.currency]) acc[p.currency] = 0;
    acc[p.currency] += p.amount;
    return acc;
  }, {} as Record<string, number>);

  const getPaymentMethodBadge = (method: string | null) => {
    if (!method) return null;
    const colors: Record<string, string> = {
      bank_transfer: 'bg-blue-500/20 text-blue-500',
      card: 'bg-purple-500/20 text-purple-500',
      paypal: 'bg-yellow-500/20 text-yellow-500'
    };
    return (
      <Badge variant="outline" className={colors[method] || ''}>
        {method.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ins" className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Money In</span>
            <span className="sm:hidden">In</span>
          </TabsTrigger>
          <TabsTrigger value="outs" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Money Out</span>
            <span className="sm:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="bank_details" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Bank Details</span>
            <span className="sm:hidden">Bank</span>
          </TabsTrigger>
        </TabsList>

        {/* Money In Tab */}
        <TabsContent value="ins" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Money In (Payments Received)</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => { resetPaymentForm(); setPaymentFormData(prev => ({ ...prev, type: 'in' })); setPaymentDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>

          {Object.keys(totalIns).length > 0 && (
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Received</span>
                  <div className="flex gap-4">
                    {Object.entries(totalIns).map(([currency, amount]) => (
                      <span key={currency} className="text-lg font-bold text-green-500">
                        {amount.toFixed(2)} {currency}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Invoice</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    insPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{getPlayerName(payment.player_id)}</TableCell>
                        <TableCell className="font-medium text-green-500">
                          +{payment.amount.toFixed(2)} {payment.currency}
                        </TableCell>
                        <TableCell>{getPaymentMethodBadge(payment.payment_method)}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.reference || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{getInvoiceNumber(payment.invoice_id)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openPaymentDialog(payment)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeletePayment(payment.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Money Out Tab */}
        <TabsContent value="outs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Money Out (Expenses)</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => { resetPaymentForm(); setPaymentFormData(prev => ({ ...prev, type: 'out' })); setPaymentDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Record Expense
              </Button>
            )}
          </div>

          {Object.keys(totalOuts).length > 0 && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Spent</span>
                  <div className="flex gap-4">
                    {Object.entries(totalOuts).map(([currency, amount]) => (
                      <span key={currency} className="text-lg font-bold text-destructive">
                        {amount.toFixed(2)} {currency}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outsPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No expenses recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    outsPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{payment.description || '-'}</TableCell>
                        <TableCell className="font-medium text-destructive">
                          -{payment.amount.toFixed(2)} {payment.currency}
                        </TableCell>
                        <TableCell>{getPaymentMethodBadge(payment.payment_method)}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.reference || '-'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openPaymentDialog(payment)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeletePayment(payment.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details Tab */}
        <TabsContent value="bank_details" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payment Details for Clients</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => openBankDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {bankDetails.map((bank) => (
              <Card key={bank.id} className={bank.is_default ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {bank.payment_type === 'bank_transfer' && <Building2 className="h-5 w-5" />}
                      {bank.payment_type === 'paypal' && <CreditCard className="h-5 w-5" />}
                      {bank.payment_type === 'card' && <CreditCard className="h-5 w-5" />}
                      {bank.title}
                      {bank.is_default && <Badge variant="secondary">Default</Badge>}
                    </CardTitle>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openBankDialog(bank)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteBank(bank.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {bank.payment_type === 'bank_transfer' && (
                    <>
                      {bank.bank_name && <div><span className="text-muted-foreground">Bank:</span> {bank.bank_name}</div>}
                      {bank.account_name && <div><span className="text-muted-foreground">Account Name:</span> {bank.account_name}</div>}
                      {bank.account_number && <div><span className="text-muted-foreground">Account Number:</span> {bank.account_number}</div>}
                      {bank.sort_code && <div><span className="text-muted-foreground">Sort Code:</span> {bank.sort_code}</div>}
                      {bank.iban && <div><span className="text-muted-foreground">IBAN:</span> {bank.iban}</div>}
                      {bank.swift_bic && <div><span className="text-muted-foreground">SWIFT/BIC:</span> {bank.swift_bic}</div>}
                    </>
                  )}
                  {bank.payment_type === 'paypal' && bank.paypal_email && (
                    <div><span className="text-muted-foreground">PayPal:</span> {bank.paypal_email}</div>
                  )}
                  {bank.notes && <div className="text-muted-foreground italic">{bank.notes}</div>}
                </CardContent>
              </Card>
            ))}

            {bankDetails.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No payment details configured
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit' : 'Record'} Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={paymentFormData.type} onValueChange={(v) => setPaymentFormData(prev => ({ ...prev, type: v as 'in' | 'out' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Money In</SelectItem>
                    <SelectItem value="out">Money Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={paymentFormData.currency} onValueChange={(v) => setPaymentFormData(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paymentFormData.type === 'in' && (
              <div>
                <Label>Player</Label>
                <Select value={paymentFormData.player_id} onValueChange={(v) => setPaymentFormData(prev => ({ ...prev, player_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentFormData.type === 'in' && paymentFormData.player_id && (
              <div>
                <Label>Invoice</Label>
                <Select value={paymentFormData.invoice_id} onValueChange={(v) => setPaymentFormData(prev => ({ ...prev, invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Link to invoice" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {invoices.filter(i => i.player_id === paymentFormData.player_id).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentFormData.payment_method} onValueChange={(v) => setPaymentFormData(prev => ({ ...prev, payment_method: v }))}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reference</Label>
              <Input
                value={paymentFormData.reference}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Transaction reference"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={paymentFormData.description}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingPayment ? 'Update' : 'Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Details Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBankDetail ? 'Edit' : 'Add'} Payment Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={bankFormData.title}
                onChange={(e) => setBankFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Main Bank Account, PayPal"
                required
              />
            </div>

            <div>
              <Label>Payment Type *</Label>
              <Select value={bankFormData.payment_type} onValueChange={(v) => setBankFormData(prev => ({ ...prev, payment_type: v as typeof bankFormData.payment_type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bankFormData.payment_type === 'bank_transfer' && (
              <>
                <div>
                  <Label>Bank Name</Label>
                  <Input value={bankFormData.bank_name} onChange={(e) => setBankFormData(prev => ({ ...prev, bank_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input value={bankFormData.account_name} onChange={(e) => setBankFormData(prev => ({ ...prev, account_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Account Number</Label>
                    <Input value={bankFormData.account_number} onChange={(e) => setBankFormData(prev => ({ ...prev, account_number: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Sort Code</Label>
                    <Input value={bankFormData.sort_code} onChange={(e) => setBankFormData(prev => ({ ...prev, sort_code: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input value={bankFormData.iban} onChange={(e) => setBankFormData(prev => ({ ...prev, iban: e.target.value }))} />
                </div>
                <div>
                  <Label>SWIFT/BIC</Label>
                  <Input value={bankFormData.swift_bic} onChange={(e) => setBankFormData(prev => ({ ...prev, swift_bic: e.target.value }))} />
                </div>
              </>
            )}

            {bankFormData.payment_type === 'paypal' && (
              <div>
                <Label>PayPal Email</Label>
                <Input type="email" value={bankFormData.paypal_email} onChange={(e) => setBankFormData(prev => ({ ...prev, paypal_email: e.target.value }))} />
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea value={bankFormData.notes} onChange={(e) => setBankFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={bankFormData.is_default}
                onChange={(e) => setBankFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_default" className="cursor-pointer">Set as default payment method</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBankDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingBankDetail ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManagement;
