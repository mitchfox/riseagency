import { useState, useEffect, useMemo } from "react";
import { computeAllStatAverages } from "@/lib/statAggregation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { METRIC_CATEGORIES, ALL_METRICS, getMetricsForPosition, getMetricCategoriesForPosition } from "@/components/staff/ComparisonPlayerData";

interface GoalTrackingProps {
  playerData: any;
  fixtureAnalyses: any[];
  formWindow: number;
}

interface PlayerGoal {
  id: string;
  player_id: string;
  metric_key: string;
  target_value: number;
}

export const GoalTracking = ({ playerData, fixtureAnalyses, formWindow }: GoalTrackingProps) => {
  const [goals, setGoals] = useState<PlayerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMetric, setNewMetric] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const playerId = playerData?.id;

  useEffect(() => {
    if (!playerId) return;
    fetchGoals();
  }, [playerId]);

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from("player_goals")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at");

    if (!error && data) setGoals(data);
    setLoading(false);
  };

  const activeMetrics = useMemo(() => getMetricsForPosition(playerData?.position), [playerData?.position]);
  const activeCategories = useMemo(() => getMetricCategoriesForPosition(playerData?.position), [playerData?.position]);

  const currentAverages = useMemo(() => {
    const windowAnalyses = fixtureAnalyses.slice(0, formWindow);
    return computeAllStatAverages(windowAnalyses, activeMetrics);
  }, [fixtureAnalyses, formWindow, activeMetrics]);

  const handleAddGoal = async () => {
    if (!newMetric || !newTarget || !playerId) return;
    setSaving(true);
    
    const { data, error } = await supabase
      .from("player_goals")
      .upsert({
        player_id: playerId,
        metric_key: newMetric,
        target_value: parseFloat(newTarget),
      }, { onConflict: "player_id,metric_key" })
      .select()
      .single();

    if (error) {
      toast.error("Failed to save goal");
    } else if (data) {
      setGoals(prev => {
        const existing = prev.findIndex(g => g.metric_key === newMetric);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
      setNewMetric("");
      setNewTarget("");
      toast.success("Goal saved");
    }
    setSaving(false);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase.from("player_goals").delete().eq("id", goalId);
    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success("Goal removed");
    }
  };

  const usedMetrics = goals.map(g => g.metric_key);
  const availableMetrics = activeMetrics.filter(m => !usedMetrics.includes(m.key));

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Add new goal */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
        <Select value={newMetric} onValueChange={setNewMetric}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select metric..." />
          </SelectTrigger>
          <SelectContent>
            {METRIC_CATEGORIES.map(cat => (
              <div key={cat.category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.category}</div>
                {cat.metrics.filter(m => !usedMetrics.includes(m.key)).map(m => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}{m.key.endsWith('_pct') ? '' : ' / Game'}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="Target value"
          value={newTarget}
          onChange={e => setNewTarget(e.target.value)}
          className="w-full sm:w-32"
        />
        <Button onClick={handleAddGoal} disabled={!newMetric || !newTarget || saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Add Goal
        </Button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No goals set yet. Add a target above to start tracking your progress.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const metric = ALL_METRICS.find(m => m.key === goal.metric_key);
            const current = currentAverages[goal.metric_key];
            const isPercentage = goal.metric_key.endsWith('_pct');
            const progress = current != null && goal.target_value > 0
              ? Math.min(100, (current / goal.target_value) * 100)
              : 0;
            const isAchieved = current != null && current >= goal.target_value;

            return (
              <div key={goal.id} className={`p-4 rounded-lg border ${isAchieved ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm">{metric?.label || goal.metric_key}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {isPercentage ? '' : '/ Game'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-lg font-bold">
                        {current != null ? current.toFixed(2) : '--'}
                      </span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-sm text-muted-foreground">
                        {goal.target_value}{isPercentage ? '%' : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Progress value={progress} className={`h-3 ${isAchieved ? '[&>div]:bg-green-500' : ''}`} />
                {isAchieved && (
                  <p className="text-xs text-green-600 mt-1 font-medium">Target achieved!</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
