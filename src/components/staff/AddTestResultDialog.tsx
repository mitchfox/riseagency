import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddTestResultDialogProps {
  playerId: string;
  playerName: string;
  onSuccess: () => void;
}

const TEST_CATEGORIES = ['Strength', 'Power', 'Speed', 'Conditioning'];

const DEFAULT_TESTS: Record<string, string[]> = {
  Strength: ['Barbell Deep Squat', 'Trap Bar Deadlift', 'Barbell Bench Press'],
  Power: ['Standing Long Jump', 'Three-Leap', 'Squat Jump', 'Overhead Throw', 'Countermovement Jump'],
  Speed: ['10/20/30/40 Metre Sprint', 'CODAT'],
  Conditioning: ['vVO2max', 'Functional Threshold Power']
};

export function AddTestResultDialog({ playerId, playerName, onSuccess }: AddTestResultDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [testName, setTestName] = useState('');
  const [customTestName, setCustomTestName] = useState('');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    const finalTestName = testName === 'custom' ? customTestName.trim() : testName;
    
    if (!category || !finalTestName || !score.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('player_test_results')
        .insert({
          player_id: playerId,
          test_category: category,
          test_name: finalTestName,
          score: score.trim(),
          notes: notes.trim() || null,
          test_date: testDate,
          status
        });

      if (error) throw error;

      toast.success(status === 'draft' ? 'Draft saved!' : 'Test result added!');
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding test result:', error);
      toast.error('Failed to add test result');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory('');
    setTestName('');
    setCustomTestName('');
    setScore('');
    setNotes('');
    setTestDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Result
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Test Result for {playerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setTestName(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TEST_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category && (
            <div className="space-y-2">
              <Label>Test Name *</Label>
              <Select value={testName} onValueChange={setTestName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_TESTS[category]?.map(test => (
                    <SelectItem key={test} value={test}>{test}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Test...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {testName === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Test Name *</Label>
              <Input
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="Enter test name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Score *</Label>
            <Input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g., 120kg, 4.5s, 45cm"
            />
          </div>

          <div className="space-y-2">
            <Label>Test Date</Label>
            <Input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit('submitted')}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
