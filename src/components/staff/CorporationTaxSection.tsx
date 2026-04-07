import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Download, Users, TrendingUp, PoundSterling, Building2 } from "lucide-react";
import { toast } from "sonner";

interface TaxRecord {
  id: string;
  staff_name: string;
  role: string;
  accounting_period_start: string;
  accounting_period_end: string;
  gross_salary: number;
  employer_ni: number;
  employer_pension: number;
  contractor_fees: number;
  service_type: string | null;
  dividends: number;
  director_loan_balance: number;
  benefits_in_kind: number;
  allowable_adjustment: number;
  disallowable_portion: number;
  notes: string | null;
}

const EMPTY_RECORD: Omit<TaxRecord, "id"> = {
  staff_name: "",
  role: "employee",
  accounting_period_start: new Date().getFullYear() + "-01-01",
  accounting_period_end: new Date().getFullYear() + "-12-31",
  gross_salary: 0,
  employer_ni: 0,
  employer_pension: 0,
  contractor_fees: 0,
  service_type: null,
  dividends: 0,
  director_loan_balance: 0,
  benefits_in_kind: 0,
  allowable_adjustment: 0,
  disallowable_portion: 0,
  notes: null,
};

interface CorporationTaxSectionProps {
  isAdmin: boolean;
}

export const CorporationTaxSection = ({ isAdmin }: CorporationTaxSectionProps) => {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState<Omit<TaxRecord, "id">>(EMPTY_RECORD);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase
      .from("corporation_tax_records")
      .select("*")
      .order("staff_name") as { data: TaxRecord[] | null };
    setRecords(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSave = async () => {
    if (!form.staff_name.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (editingRecord) {
      const { error } = await supabase
        .from("corporation_tax_records")
        .update(form as any)
        .eq("id", editingRecord.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Record updated");
    } else {
      const { error } = await supabase
        .from("corporation_tax_records")
        .insert(form as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Record added");
    }
    setDialogOpen(false);
    setEditingRecord(null);
    setForm(EMPTY_RECORD);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("corporation_tax_records").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Record deleted");
    fetchRecords();
  };

  const openEdit = (r: TaxRecord) => {
    setEditingRecord(r);
    setForm({ ...r });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingRecord(null);
    setForm(EMPTY_RECORD);
    setDialogOpen(true);
  };

  // Aggregation
  const totals = useMemo(() => {
    const employees = records.filter(r => r.role === "employee");
    const contractors = records.filter(r => r.role === "contractor");
    const directors = records.filter(r => r.role === "director");

    const totalSalaries = [...employees, ...directors].reduce((s, r) => s + (r.gross_salary || 0), 0);
    const totalEmployerNI = [...employees, ...directors].reduce((s, r) => s + (r.employer_ni || 0), 0);
    const totalPension = [...employees, ...directors].reduce((s, r) => s + (r.employer_pension || 0), 0);
    const totalContractorFees = contractors.reduce((s, r) => s + (r.contractor_fees || 0), 0);
    const totalDividends = directors.reduce((s, r) => s + (r.dividends || 0), 0);
    const totalBIK = directors.reduce((s, r) => s + (r.benefits_in_kind || 0), 0);
    const totalDirectorLoans = directors.reduce((s, r) => s + (r.director_loan_balance || 0), 0);
    const totalAllowableAdj = records.reduce((s, r) => s + (r.allowable_adjustment || 0), 0);
    const totalDisallowable = records.reduce((s, r) => s + (r.disallowable_portion || 0), 0);

    const staffCosts = totalSalaries + totalEmployerNI + totalPension;
    const totalAllowable = staffCosts + totalContractorFees + totalAllowableAdj - totalDisallowable;

    return {
      staffCosts, totalSalaries, totalEmployerNI, totalPension,
      totalContractorFees, totalDividends, totalBIK, totalDirectorLoans,
      totalAllowableAdj, totalDisallowable, totalAllowable,
      employeeCount: employees.length, contractorCount: contractors.length, directorCount: directors.length,
    };
  }, [records]);

  // Export
  const exportCSV = () => {
    const headers = "Name,Role,Salary,Employer_NI,Pension,Contractor_Fees,Dividends,Director_Loan,Benefits,Allowable_Adjustment,Disallowable_Portion";
    const rows = records.map(r =>
      `"${r.staff_name}",${r.role},${r.gross_salary},${r.employer_ni},${r.employer_pension},${r.contractor_fees},${r.dividends},${r.director_loan_balance},${r.benefits_in_kind},${r.allowable_adjustment},${r.disallowable_portion}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corporation-tax-${records[0]?.accounting_period_start || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportJSON = () => {
    const period = records[0];
    const json = {
      accounting_period: period ? `${period.accounting_period_start}_to_${period.accounting_period_end}` : "unknown",
      staff: records.map(r => {
        const base: any = { name: r.staff_name, role: r.role };
        if (r.role === "employee" || r.role === "director") {
          base.salary = r.gross_salary;
          base.employer_ni = r.employer_ni;
          base.pension = r.employer_pension;
        }
        if (r.role === "contractor") base.contractor_fees = r.contractor_fees;
        if (r.role === "director") {
          base.dividends = r.dividends;
          base.director_loan = r.director_loan_balance;
          base.benefits_in_kind = r.benefits_in_kind;
        }
        if (r.allowable_adjustment) base.allowable_adjustment = r.allowable_adjustment;
        if (r.disallowable_portion) base.disallowable_portion = r.disallowable_portion;
        return base;
      }),
      totals: {
        staff_costs: totals.staffCosts,
        contractor_fees: totals.totalContractorFees,
        dividends: totals.totalDividends,
        total_allowable_expenses: totals.totalAllowable,
      },
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corporation-tax-${json.accounting_period}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported for TinyTax");
  };

  const fmt = (n: number) => "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 0 });

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading tax records...</div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="summary">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="records">Staff Records</TabsTrigger>
            <TabsTrigger value="directors">Director Extraction</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {isAdmin && (
              <Button size="sm" onClick={openNew} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Staff
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportJSON} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
          </div>
        </div>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Staff Costs</span>
                </div>
                <div className="text-2xl font-bold">{fmt(totals.staffCosts)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Salaries {fmt(totals.totalSalaries)} + NI {fmt(totals.totalEmployerNI)} + Pension {fmt(totals.totalPension)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Contractor Fees</span>
                </div>
                <div className="text-2xl font-bold">{fmt(totals.totalContractorFees)}</div>
                <p className="text-xs text-muted-foreground mt-1">{totals.contractorCount} contractor{totals.contractorCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <PoundSterling className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Dividends Paid</span>
                </div>
                <div className="text-2xl font-bold">{fmt(totals.totalDividends)}</div>
                <p className="text-xs text-muted-foreground mt-1">{totals.directorCount} director{totals.directorCount !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Allowable Expenses</span>
                </div>
                <div className="text-2xl font-bold">{fmt(totals.totalAllowable)}</div>
                <p className="text-xs text-muted-foreground mt-1">Impact on profit before tax</p>
              </CardContent>
            </Card>
          </div>

          {totals.totalDirectorLoans > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-yellow-400">Director Loan Accounts: {fmt(totals.totalDirectorLoans)}</p>
                <p className="text-xs text-muted-foreground">Outstanding loans may attract S455 tax if not repaid within 9 months of the accounting period end.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <div className="space-y-3">
            {records.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No staff tax records yet. Add staff members to begin.</p>
              </div>
            )}
            {records.map(r => (
              <Card key={r.id} className="group">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{r.staff_name}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">{r.role}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {(r.role === "employee" || r.role === "director") && (
                          <>
                            <span>Salary: {fmt(r.gross_salary)}</span>
                            <span>NI: {fmt(r.employer_ni)}</span>
                            <span>Pension: {fmt(r.employer_pension)}</span>
                          </>
                        )}
                        {r.role === "contractor" && (
                          <>
                            <span>Fees: {fmt(r.contractor_fees)}</span>
                            {r.service_type && <span>Service: {r.service_type}</span>}
                          </>
                        )}
                        {r.role === "director" && (
                          <>
                            <span>Dividends: {fmt(r.dividends)}</span>
                            <span>Loan: {fmt(r.director_loan_balance)}</span>
                            {r.benefits_in_kind > 0 && <span>BIK: {fmt(r.benefits_in_kind)}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Director Extraction Tab */}
        <TabsContent value="directors">
          <div className="space-y-4">
            {records.filter(r => r.role === "director").length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PoundSterling className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No directors added yet.</p>
              </div>
            ) : (
              records.filter(r => r.role === "director").map(r => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{r.staff_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="font-semibold">{fmt(r.gross_salary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dividends</p>
                        <p className="font-semibold">{fmt(r.dividends)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Extraction</p>
                        <p className="font-semibold">{fmt(r.gross_salary + r.dividends)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Loan Account</p>
                        <p className="font-semibold">{fmt(r.director_loan_balance)}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      {(() => {
                        const total = r.gross_salary + r.dividends;
                        const salaryPct = total > 0 ? (r.gross_salary / total) * 100 : 0;
                        return (
                          <div className="h-full flex">
                            <div className="bg-primary h-full" style={{ width: `${salaryPct}%` }} />
                            <div className="bg-green-500 h-full" style={{ width: `${100 - salaryPct}%` }} />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Salary</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Dividends</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingRecord(null); } else setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Staff Tax Record" : "Add Staff Tax Record"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Legal Name</Label>
              <Input value={form.staff_name} onChange={e => updateField("staff_name", e.target.value)} placeholder="Full legal name" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => updateField("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period Start</Label>
              <Input type="date" value={form.accounting_period_start} onChange={e => updateField("accounting_period_start", e.target.value)} />
            </div>
            <div>
              <Label>Period End</Label>
              <Input type="date" value={form.accounting_period_end} onChange={e => updateField("accounting_period_end", e.target.value)} />
            </div>

            {/* Employee & Director fields */}
            {(form.role === "employee" || form.role === "director") && (
              <>
                <div>
                  <Label>Gross Salary (Annual)</Label>
                  <Input type="number" value={form.gross_salary || ""} onChange={e => updateField("gross_salary", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Employer NI (Annual)</Label>
                  <Input type="number" value={form.employer_ni || ""} onChange={e => updateField("employer_ni", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Employer Pension</Label>
                  <Input type="number" value={form.employer_pension || ""} onChange={e => updateField("employer_pension", parseFloat(e.target.value) || 0)} />
                </div>
              </>
            )}

            {/* Contractor fields */}
            {form.role === "contractor" && (
              <>
                <div>
                  <Label>Total Fees Paid (Annual)</Label>
                  <Input type="number" value={form.contractor_fees || ""} onChange={e => updateField("contractor_fees", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Input value={form.service_type || ""} onChange={e => updateField("service_type", e.target.value)} placeholder="e.g. Consulting, Design" />
                </div>
              </>
            )}

            {/* Director fields */}
            {form.role === "director" && (
              <>
                <div>
                  <Label>Dividends (Annual)</Label>
                  <Input type="number" value={form.dividends || ""} onChange={e => updateField("dividends", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Director Loan Balance (Year-End)</Label>
                  <Input type="number" value={form.director_loan_balance || ""} onChange={e => updateField("director_loan_balance", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Benefits in Kind (Annual)</Label>
                  <Input type="number" value={form.benefits_in_kind || ""} onChange={e => updateField("benefits_in_kind", parseFloat(e.target.value) || 0)} />
                </div>
              </>
            )}

            {/* Adjustments */}
            <div>
              <Label>Allowable Adjustment</Label>
              <Input type="number" value={form.allowable_adjustment || ""} onChange={e => updateField("allowable_adjustment", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Disallowable Portion</Label>
              <Input type="number" value={form.disallowable_portion || ""} onChange={e => updateField("disallowable_portion", parseFloat(e.target.value) || 0)} />
            </div>

            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={e => updateField("notes", e.target.value)} placeholder="Optional notes for this record" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingRecord ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
