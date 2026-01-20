import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Save, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Json } from "@/integrations/supabase/types";

interface GradeThreshold {
  grade: string;
  min: number | null;
  max: number | null;
}

interface FormGradeConfig {
  id: string;
  metric_key: string;
  metric_name: string;
  description: string | null;
  thresholds: GradeThreshold[];
  created_at: string;
  updated_at: string;
}

const GRADE_COLORS: Record<string, string> = {
  'U': 'bg-red-900 text-white',
  'D': 'bg-red-600 text-white',
  'C-': 'bg-red-400 text-white',
  'C': 'bg-orange-600 text-white',
  'C+': 'bg-amber-500 text-black',
  'B-': 'bg-amber-400 text-black',
  'B': 'bg-green-600 text-white',
  'B+': 'bg-green-500 text-white',
  'A-': 'bg-green-400 text-black',
  'A': 'bg-emerald-500 text-white',
  'A+': 'bg-emerald-400 text-black',
  'A*': 'bg-rise-gold text-black border-2 border-rise-gold/70',
};

const ALL_GRADES = ['U', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'A*'];

export function FormGradesManagement() {
  const [configs, setConfigs] = useState<FormGradeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [editedConfigs, setEditedConfigs] = useState<Record<string, GradeThreshold[]>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('form_grade_configs')
      .select('*')
      .order('metric_name');

    if (error) {
      toast.error("Failed to load grade configurations");
      console.error(error);
    } else if (data) {
      // Parse the data with proper typing
      const parsedConfigs: FormGradeConfig[] = data.map(item => ({
        ...item,
        thresholds: (item.thresholds as unknown as GradeThreshold[]) || []
      }));
      setConfigs(parsedConfigs);
      
      // Initialize edited configs
      const edited: Record<string, GradeThreshold[]> = {};
      parsedConfigs.forEach(config => {
        edited[config.id] = config.thresholds;
      });
      setEditedConfigs(edited);
    }
    setLoading(false);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMetrics(newExpanded);
  };

  const updateThreshold = (configId: string, index: number, field: 'min' | 'max', value: string) => {
    const thresholds = [...(editedConfigs[configId] || [])];
    const numValue = value === '' ? null : parseFloat(value);
    thresholds[index] = { ...thresholds[index], [field]: numValue };
    setEditedConfigs({ ...editedConfigs, [configId]: thresholds });
  };

  const updateGrade = (configId: string, index: number, grade: string) => {
    const thresholds = [...(editedConfigs[configId] || [])];
    thresholds[index] = { ...thresholds[index], grade };
    setEditedConfigs({ ...editedConfigs, [configId]: thresholds });
  };

  const addThreshold = (configId: string) => {
    const thresholds = [...(editedConfigs[configId] || [])];
    const lastThreshold = thresholds[thresholds.length - 1];
    thresholds.push({
      grade: 'B',
      min: lastThreshold?.max || 0,
      max: null
    });
    setEditedConfigs({ ...editedConfigs, [configId]: thresholds });
  };

  const removeThreshold = (configId: string, index: number) => {
    const thresholds = [...(editedConfigs[configId] || [])];
    thresholds.splice(index, 1);
    setEditedConfigs({ ...editedConfigs, [configId]: thresholds });
  };

  const saveConfig = async (configId: string) => {
    setSaving(configId);
    const thresholds = editedConfigs[configId];

    const { error } = await supabase
      .from('form_grade_configs')
      .update({ thresholds: thresholds as unknown as Json })
      .eq('id', configId);

    if (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } else {
      toast.success("Grade configuration saved");
      // Update local state
      setConfigs(configs.map(c => 
        c.id === configId ? { ...c, thresholds } : c
      ));
    }
    setSaving(null);
  };

  const hasChanges = (configId: string) => {
    const original = configs.find(c => c.id === configId)?.thresholds;
    const edited = editedConfigs[configId];
    return JSON.stringify(original) !== JSON.stringify(edited);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Form Grades Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure the score thresholds for each grade level across all metrics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfigs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-3 pr-4">
          {configs.map((config) => (
            <Collapsible 
              key={config.id} 
              open={expandedMetrics.has(config.id)}
              onOpenChange={() => toggleExpanded(config.id)}
            >
              <Card className={hasChanges(config.id) ? 'border-amber-500' : ''}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <CardTitle className="text-base">{config.metric_name}</CardTitle>
                          <CardDescription className="text-xs">
                            {config.description || config.metric_key}
                          </CardDescription>
                        </div>
                        {hasChanges(config.id) && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {(editedConfigs[config.id] || []).slice(0, 6).map((t, i) => (
                            <Badge 
                              key={i} 
                              className={`text-xs px-1.5 py-0 ${GRADE_COLORS[t.grade] || 'bg-muted'}`}
                            >
                              {t.grade}
                            </Badge>
                          ))}
                          {(editedConfigs[config.id]?.length || 0) > 6 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              +{(editedConfigs[config.id]?.length || 0) - 6}
                            </Badge>
                          )}
                        </div>
                        {expandedMetrics.has(config.id) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="grid grid-cols-[100px_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
                        <div>Grade</div>
                        <div>Min Score</div>
                        <div>Max Score</div>
                        <div></div>
                      </div>

                      {/* Threshold rows */}
                      {(editedConfigs[config.id] || []).map((threshold, index) => (
                        <div key={index} className="grid grid-cols-[100px_1fr_1fr_40px] gap-2 items-center">
                          <select
                            value={threshold.grade}
                            onChange={(e) => updateGrade(config.id, index, e.target.value)}
                            className={`h-9 rounded-md border px-2 text-sm font-medium ${GRADE_COLORS[threshold.grade] || 'bg-muted'}`}
                          >
                            {ALL_GRADES.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="No min"
                            value={threshold.min === null ? '' : threshold.min}
                            onChange={(e) => updateThreshold(config.id, index, 'min', e.target.value)}
                            className="h-9"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="No max"
                            value={threshold.max === null ? '' : threshold.max}
                            onChange={(e) => updateThreshold(config.id, index, 'max', e.target.value)}
                            className="h-9"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removeThreshold(config.id, index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addThreshold(config.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Grade
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveConfig(config.id)}
                          disabled={!hasChanges(config.id) || saving === config.id}
                        >
                          {saving === config.id ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
