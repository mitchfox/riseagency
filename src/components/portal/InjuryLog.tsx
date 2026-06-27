import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InjuryLogProps {
  playerId: string;
  readOnly?: boolean;
}

interface InjuryEntry {
  id: string;
  player_id: string;
  date: string;
  body_area: string;
  description: string | null;
  severity: string;
  status: string;
  created_at: string;
}

const BODY_AREAS = [
  "Head", "Neck", "Shoulder", "Upper Back", "Lower Back", "Chest",
  "Upper Arm", "Elbow", "Forearm", "Wrist", "Hand",
  "Hip", "Glutes", "Groin", "Quadriceps", "Hamstring", "Knee",
  "Calf", "Shin", "Ankle", "Foot", "Achilles"
];

const SEVERITY_COLOURS: Record<string, string> = {
  minor: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  moderate: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  severe: "bg-red-500/10 text-red-600 border-red-500/30",
};

export const InjuryLog = ({ playerId, readOnly = false }: InjuryLogProps) => {
  const [entries, setEntries] = useState<InjuryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newBodyArea, setNewBodyArea] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState("minor");

  useEffect(() => {
    if (!playerId) return;
    fetchEntries();
  }, [playerId]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("player_injury_log")
      .select("*")
      .eq("player_id", playerId)
      .order("date", { ascending: false });

    if (!error && data) setEntries(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newBodyArea) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("player_injury_log")
      .insert({
        player_id: playerId,
        date: newDate,
        body_area: newBodyArea,
        description: newDescription || null,
        severity: newSeverity,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add entry");
    } else if (data) {
      setEntries(prev => [data, ...prev]);
      setShowForm(false);
      setNewBodyArea("");
      setNewDescription("");
      setNewSeverity("minor");
      toast.success("Injury logged");
    }
    setSaving(false);
  };

  const handleRecover = async (id: string) => {
    const { error } = await supabase
      .from("player_injury_log")
      .update({ status: "recovered" })
      .eq("id", id);

    if (!error) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "recovered" } : e));
      toast.success("Marked as recovered");
    }
  };

  const activeEntries = entries.filter(e => e.status === "active");
  const recoveredEntries = entries.filter(e => e.status === "recovered");

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Injury Log</h4>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Log Injury
          </Button>
        </div>
      )}

      {readOnly && <h4 className="font-semibold text-sm">Injury Log</h4>}

      {showForm && !readOnly && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <Select value={newBodyArea} onValueChange={setNewBodyArea}>
              <SelectTrigger><SelectValue placeholder="Body area..." /></SelectTrigger>
              <SelectContent>
                {BODY_AREAS.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newSeverity} onValueChange={setNewSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Describe the injury or niggle..."
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="resize-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!newBodyArea || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Active injuries */}
      {activeEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
          {activeEntries.map(entry => (
            <div key={entry.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-sm">{entry.body_area}</span>
                  <Badge variant="outline" className={`text-xs ${SEVERITY_COLOURS[entry.severity] || ''}`}>
                    {entry.severity}
                  </Badge>
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground ml-6">{entry.description}</p>
                )}
                <p className="text-xs text-muted-foreground ml-6">{format(new Date(entry.date), "dd MMM yyyy")}</p>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={() => handleRecover(entry.id)} className="text-green-600 hover:text-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Recovered
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recovered injuries */}
      {recoveredEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recovered</p>
          {recoveredEntries.slice(0, 5).map(entry => (
            <div key={entry.id} className="flex items-start p-3 rounded-lg border bg-card/50 opacity-60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm line-through">{entry.body_area}</span>
                  <Badge variant="outline" className="text-xs">{entry.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground ml-6">{format(new Date(entry.date), "dd MMM yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Log any tweaks or recurring injuries so we can keep them in mind when programming
        </div>
      )}
    </div>
  );
};
