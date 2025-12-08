import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Plus, Edit, Trash2, Upload, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

interface TaxRecord {
  id: string;
  tax_year: string;
  type: string;
  description: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'filed' | 'paid';
  notes?: string;
}

interface TaxDocument {
  id: string;
  name: string;
  tax_year: string;
  type: string;
  uploaded_at: string;
}

export const TaxRecordsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("2024-25");

  const TAX_YEARS = ['2024-25', '2023-24', '2022-23', '2021-22'];
  const TAX_TYPES = ['Income Tax', 'Corporation Tax', 'VAT', 'National Insurance', 'Capital Gains', 'Other'];

  const [formData, setFormData] = useState<{
    tax_year: string;
    type: string;
    description: string;
    amount: string;
    due_date: string;
    status: 'pending' | 'filed' | 'paid';
    notes: string;
  }>({
    tax_year: '2024-25',
    type: '',
    description: '',
    amount: '',
    due_date: '',
    status: 'pending',
    notes: ''
  });

  const handleSubmit = () => {
    if (!formData.type || !formData.description) {
      toast.error('Please fill in required fields');
      return;
    }

    const newRecord: TaxRecord = {
      id: crypto.randomUUID(),
      tax_year: formData.tax_year,
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      due_date: formData.due_date,
      status: formData.status,
      notes: formData.notes
    };

    setRecords(prev => [newRecord, ...prev]);
    toast.success('Tax record added');
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tax_year: '2024-25',
      type: '',
      description: '',
      amount: '',
      due_date: '',
      status: 'pending',
      notes: ''
    });
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Record deleted');
  };

  const filteredRecords = records.filter(r => r.tax_year === selectedYear);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400">Paid</Badge>;
      case 'filed':
        return <Badge className="bg-blue-500/20 text-blue-400">Filed</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 md:h-6 md:w-6" />
            Tax Records
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage tax obligations and documents</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_YEARS.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">Tax Records</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="deadlines">Key Deadlines</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax records for {selectedYear}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          £{record.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{record.due_date || '-'}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Upload tax documents for record keeping</p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" className="mt-6">
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  UK Tax Deadlines 2024-25
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Self Assessment Registration</p>
                    <p className="text-sm text-muted-foreground">For new businesses</p>
                  </div>
                  <Badge>5 Oct 2025</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Paper Tax Return Deadline</p>
                    <p className="text-sm text-muted-foreground">2023-24 tax year</p>
                  </div>
                  <Badge>31 Oct 2024</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Online Tax Return Deadline</p>
                    <p className="text-sm text-muted-foreground">2023-24 tax year</p>
                  </div>
                  <Badge>31 Jan 2025</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Payment on Account</p>
                    <p className="text-sm text-muted-foreground">Second payment</p>
                  </div>
                  <Badge>31 Jul 2025</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Record Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tax Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tax Year</Label>
                <Select value={formData.tax_year} onValueChange={v => setFormData(prev => ({ ...prev, tax_year: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_YEARS.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v: 'pending' | 'filed' | 'paid') => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
