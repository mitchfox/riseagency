import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calculator, Plus, Edit, Trash2, Receipt, Loader2, Upload, Image, CheckCircle2, XCircle, ExternalLink, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { format } from "date-fns";

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  vendor: string | null;
  paid_by_user_id: string | null;
  paid_by_name: string;
  receipt_url: string | null;
  tax_deductible: boolean;
  reimbursed: boolean;
  reimbursed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface ReimbursementBalance {
  name: string;
  userId: string | null;
  owed: number;
  reimbursed: number;
  outstanding: number;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Marketing',
  'Legal & Professional',
  'Equipment',
  'Utilities',
  'Insurance',
  'Other'
];

export const ExpensesManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [staffMembers, setStaffMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'reimbursements'>('expenses');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    currency: 'GBP',
    vendor: '',
    paid_by_name: '',
    paid_by_user_id: '',
    tax_deductible: true,
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchStaffMembers();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } else {
      setExpenses((data || []) as Expense[]);
    }
    setLoading(false);
  };

  const fetchStaffMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null)
      .order('full_name');
    setStaffMembers((data || []).filter(p => p.full_name) as { id: string; full_name: string }[]);
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `receipts/${fileName}`;

    const { error } = await supabase.storage
      .from('receipt-uploads')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('receipt-uploads')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.description || !formData.amount || !formData.paid_by_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);

    let receipt_url = editingExpense?.receipt_url || null;

    if (receiptFile) {
      setUploading(true);
      receipt_url = await uploadReceipt(receiptFile);
      setUploading(false);
    }

    const { data: { user } } = await supabase.auth.getUser();

    const expenseData = {
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      vendor: formData.vendor || null,
      paid_by_name: formData.paid_by_name,
      paid_by_user_id: formData.paid_by_user_id || null,
      receipt_url,
      tax_deductible: formData.tax_deductible,
      notes: formData.notes || null,
      created_by: user?.id || null,
    };

    if (editingExpense) {
      const { error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', editingExpense.id);

      if (error) {
        toast.error('Failed to update expense');
        console.error(error);
      } else {
        toast.success('Expense updated');
      }
    } else {
      const { error } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (error) {
        toast.error('Failed to add expense');
        console.error(error);
      } else {
        toast.success('Expense added');
      }
    }

    setSaving(false);
    resetForm();
    fetchExpenses();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      currency: 'GBP',
      vendor: '',
      paid_by_name: '',
      paid_by_user_id: '',
      tax_deductible: true,
      notes: ''
    });
    setEditingExpense(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setDialogOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      currency: expense.currency,
      vendor: expense.vendor || '',
      paid_by_name: expense.paid_by_name,
      paid_by_user_id: expense.paid_by_user_id || '',
      tax_deductible: expense.tax_deductible,
      notes: expense.notes || ''
    });
    setReceiptPreview(expense.receipt_url || null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete expense');
    } else {
      toast.success('Expense deleted');
      fetchExpenses();
    }
  };

  const toggleReimbursed = async (expense: Expense) => {
    const newReimbursed = !expense.reimbursed;
    const { error } = await supabase
      .from('expenses')
      .update({
        reimbursed: newReimbursed,
        reimbursed_at: newReimbursed ? new Date().toISOString() : null
      })
      .eq('id', expense.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(newReimbursed ? 'Marked as reimbursed' : 'Marked as not reimbursed');
      fetchExpenses();
    }
  };

  const handleStaffSelect = (userId: string) => {
    if (userId === 'custom') {
      setFormData(prev => ({ ...prev, paid_by_user_id: '', paid_by_name: '' }));
      return;
    }
    const staff = staffMembers.find(s => s.id === userId);
    if (staff) {
      setFormData(prev => ({
        ...prev,
        paid_by_user_id: staff.id,
        paid_by_name: staff.full_name
      }));
    }
  };

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUnreimbursed = expenses.filter(e => !e.reimbursed).reduce((sum, e) => sum + e.amount, 0);

  // Calculate reimbursement balances per person
  const reimbursementBalances: ReimbursementBalance[] = (() => {
    const map = new Map<string, ReimbursementBalance>();
    expenses.forEach(e => {
      const key = e.paid_by_name;
      if (!map.has(key)) {
        map.set(key, { name: key, userId: e.paid_by_user_id, owed: 0, reimbursed: 0, outstanding: 0 });
      }
      const entry = map.get(key)!;
      entry.owed += e.amount;
      if (e.reimbursed) {
        entry.reimbursed += e.amount;
      }
      entry.outstanding = entry.owed - entry.reimbursed;
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
  })();

  const currencySymbol = (c: string) => c === 'GBP' ? '£' : c === 'EUR' ? '€' : '$';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5 md:h-6 md:w-6" />
            Expenses
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track expenses and reimbursements</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'expenses' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('expenses')}
        >
          <Receipt className="h-4 w-4 mr-2" />
          All Expenses
        </Button>
        <Button
          variant={activeTab === 'reimbursements' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('reimbursements')}
        >
          <Users className="h-4 w-4 mr-2" />
          Reimbursements
        </Button>
      </div>

      {activeTab === 'reimbursements' ? (
        /* Reimbursement Balances */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">£{totalUnreimbursed.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{reimbursementBalances.filter(b => b.outstanding > 0).length}</div>
                <p className="text-sm text-muted-foreground">People Owed</p>
              </CardContent>
            </Card>
          </div>

          {reimbursementBalances.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reimbursementBalances.map(balance => (
                <Card key={balance.name}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{balance.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Total spent: £{balance.owed.toFixed(2)} · Reimbursed: £{balance.reimbursed.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        {balance.outstanding > 0 ? (
                          <>
                            <p className="text-lg font-bold text-destructive">£{balance.outstanding.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">outstanding</p>
                          </>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Settled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">£{totalExpenses.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filteredExpenses.length}</div>
                <p className="text-sm text-muted-foreground">Entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">
                  £{totalUnreimbursed.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Unreimbursed</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex gap-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <LoadingSpinner size="md" className="py-8" />
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses recorded yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Expense
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Paid By</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Reimbursed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map(expense => (
                        <TableRow key={expense.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-medium">{expense.paid_by_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {currencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {expense.receipt_url ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(expense.receipt_url!, '_blank')}
                              >
                                <Image className="h-4 w-4 text-primary" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => toggleReimbursed(expense)}
                            >
                              {expense.reimbursed ? (
                                <Badge className="bg-green-500/20 text-green-500 cursor-pointer">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="cursor-pointer">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No
                                </Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(expense)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(expense.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Who Paid */}
            <div>
              <Label>Who Paid? *</Label>
              <Select
                value={formData.paid_by_user_id || 'custom'}
                onValueChange={handleStaffSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Someone else...</SelectItem>
                </SelectContent>
              </Select>
              {(!formData.paid_by_user_id || formData.paid_by_user_id === '') && (
                <Input
                  className="mt-2"
                  value={formData.paid_by_name}
                  onChange={e => setFormData(prev => ({ ...prev, paid_by_name: e.target.value }))}
                  placeholder="Enter name"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What was this expense for?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={formData.currency} onValueChange={v => setFormData(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Vendor/Supplier</Label>
              <Input
                value={formData.vendor}
                onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                placeholder="Optional"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <Label>Receipt / Screenshot</Label>
              <div
                className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {receiptPreview ? (
                  <div className="space-y-2">
                    <img src={receiptPreview} alt="Receipt" className="max-h-32 mx-auto rounded" />
                    <p className="text-xs text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click or tap to upload receipt</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.tax_deductible}
                onCheckedChange={v => setFormData(prev => ({ ...prev, tax_deductible: v }))}
              />
              <Label>Tax Deductible</Label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingExpense ? 'Update' : 'Add'} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
