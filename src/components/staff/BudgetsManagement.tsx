import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PiggyBank, Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface Budget {
  id: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
}

const BUDGET_CATEGORIES = [
  'Operations',
  'Marketing',
  'Travel',
  'Equipment',
  'Salaries',
  'Legal',
  'Software',
  'Miscellaneous'
];

export const BudgetsManagement = ({ isAdmin }: { isAdmin: boolean }) => {
  const [budgets, setBudgets] = useState<Budget[]>([
    { id: '1', name: 'Marketing Campaign Q1', category: 'Marketing', allocated: 5000, spent: 3200, period: '2024' },
    { id: '2', name: 'Travel Budget', category: 'Travel', allocated: 10000, spent: 7500, period: '2024' },
    { id: '3', name: 'Software Subscriptions', category: 'Software', allocated: 2000, spent: 1800, period: '2024' },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    allocated: '',
    spent: '0',
    period: '2024'
  });

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingBudget = totalAllocated - totalSpent;

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.allocated) {
      toast.error('Please fill in required fields');
      return;
    }

    const newBudget: Budget = {
      id: editingBudget?.id || crypto.randomUUID(),
      name: formData.name,
      category: formData.category,
      allocated: parseFloat(formData.allocated),
      spent: parseFloat(formData.spent) || 0,
      period: formData.period
    };

    if (editingBudget) {
      setBudgets(prev => prev.map(b => b.id === editingBudget.id ? newBudget : b));
      toast.success('Budget updated');
    } else {
      setBudgets(prev => [newBudget, ...prev]);
      toast.success('Budget created');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', category: '', allocated: '', spent: '0', period: '2024' });
    setEditingBudget(null);
    setDialogOpen(false);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category,
      allocated: budget.allocated.toString(),
      spent: budget.spent.toString(),
      period: budget.period
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    toast.success('Budget deleted');
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6" />
            Budgets
          </h2>
          <p className="text-muted-foreground mt-1">Plan and track budget allocations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">£{totalAllocated.toLocaleString()}</div>
            </div>
            <p className="text-sm text-muted-foreground">Total Allocated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div className="text-2xl font-bold">£{totalSpent.toLocaleString()}</div>
            </div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              £{remainingBudget.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      <div className="grid gap-4">
        {budgets.map(budget => {
          const percentage = Math.min((budget.spent / budget.allocated) * 100, 100);
          const remaining = budget.allocated - budget.spent;

          return (
            <Card key={budget.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{budget.name}</h3>
                    <p className="text-sm text-muted-foreground">{budget.category} • {budget.period}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(budget.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>£{budget.spent.toLocaleString()} spent</span>
                    <span>£{budget.allocated.toLocaleString()} allocated</span>
                  </div>
                  <Progress value={percentage} className={`h-2 ${getProgressColor(percentage)}`} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{percentage.toFixed(0)}% used</span>
                    <span className={remaining >= 0 ? 'text-green-500' : 'text-destructive'}>
                      £{remaining.toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {budgets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No budgets created yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Budget Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Q1 Marketing Budget"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period</Label>
                <Select value={formData.period} onValueChange={v => setFormData(prev => ({ ...prev, period: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                    <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Allocated Amount (£)</Label>
                <Input
                  type="number"
                  value={formData.allocated}
                  onChange={e => setFormData(prev => ({ ...prev, allocated: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Amount Spent (£)</Label>
                <Input
                  type="number"
                  value={formData.spent}
                  onChange={e => setFormData(prev => ({ ...prev, spent: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingBudget ? 'Update' : 'Create'} Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
