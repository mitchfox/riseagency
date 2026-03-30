import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatScoreWithFrequency } from "@/lib/utils";
import { canonicalActionType } from "@/lib/playerActionFrequency";
import { ScoreDropdown } from "./ScoreDropdown";
import { ZonePitchSelector, type ZonePoint } from "@/components/report/ZonePitchSelector";
import type { RecordedStat } from "./ActionStatRecorder";

interface PerformanceAction {
  id?: string;
  action_number: number;
  minute: string;
  action_score: string;
  action_type: string;
  action_description: string;
  notes: string;
  video_url?: string | null;
  recorded_stat?: RecordedStat | RecordedStat[] | null;
  zone?: number | null;
  zone_details?: ZonePoint[] | null;
}

interface R90Rating {
  score: number | string;
  title: string;
  description: string;
}

interface ActionTypeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: PerformanceAction[];
  updateAction: (index: number, field: keyof PerformanceAction, value: any) => void;
  onSave: () => void;
  saving: boolean;
  allR90Ratings: R90Rating[];
  openR90Viewer: (actionIndex: number) => void;
  actionTypes: string[];
  actionTypeFrequencyMap: Record<string, number>;
  getDescriptionsForType: (type: string) => string[];
}

export const ActionTypeEditor = ({
  open,
  onOpenChange,
  actions,
  updateAction,
  onSave,
  saving,
  allR90Ratings,
  openR90Viewer,
  actionTypes,
  actionTypeFrequencyMap,
  getDescriptionsForType,
}: ActionTypeEditorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");

  // Group actions by action_type category
  const groupedActions = useMemo(() => {
    const groups: Record<string, { action: PerformanceAction; index: number }[]> = {};
    actions.forEach((action, index) => {
      const type = action.action_type ? canonicalActionType(action.action_type) : "Uncategorised";
      if (!groups[type]) groups[type] = [];
      groups[type].push({ action, index });
    });
    // Sort categories alphabetically, Uncategorised last
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === "Uncategorised") return 1;
      if (b === "Uncategorised") return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [actions]);

  const categoriesToShow = selectedCategory
    ? groupedActions.filter(([cat]) => cat === selectedCategory)
    : groupedActions;

  const toggleExpanded = (index: number) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-background border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Action Type Editor</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-sm">ACTION EDIT</span>
            <span className="text-xs text-muted-foreground">
              {actions.length} actions · {groupedActions.length} categories
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Update Report"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category sidebar */}
          <div className="w-48 md:w-56 border-r shrink-0 flex flex-col">
            <div className="p-2 border-b">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1 space-y-0.5">
                {groupedActions.map(([category, items]) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-between text-xs h-8"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span className="truncate">{category}</span>
                    <span className="text-[10px] opacity-70 ml-1">{items.length}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {categoriesToShow.map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                    {category}
                    <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {items.map(({ action, index }) => (
                      <Collapsible
                        key={index}
                        open={expandedActions.has(index)}
                        onOpenChange={() => toggleExpanded(index)}
                      >
                        <div className="border rounded-md bg-card">
                          <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent/50 transition-colors">
                            {expandedActions.has(index) ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="font-mono text-xs font-bold text-primary">#{action.action_number}</span>
                            <span className="text-xs text-muted-foreground">{action.minute ? `${action.minute}'` : ""}</span>
                            <span className="text-xs truncate flex-1">{action.action_description || "No description"}</span>
                            <span className="text-xs font-mono font-semibold text-amber-600 shrink-0">
                              {action.action_score || "—"}
                            </span>
                            {action.video_url && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">clip</span>
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-1 space-y-2 border-t">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-16">
                                  <Input
                                    value={action.minute}
                                    onChange={(e) => updateAction(index, "minute", e.target.value)}
                                    placeholder="Min"
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="flex-1 min-w-[120px] max-w-[200px]">
                                  <Input
                                    value={action.action_type}
                                    onChange={(e) => updateAction(index, "action_type", e.target.value)}
                                    onBlur={() => {
                                      if (action.action_type) updateAction(index, "action_type", canonicalActionType(action.action_type));
                                    }}
                                    placeholder="Action type"
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <ScoreDropdown
                                  value={action.action_score}
                                  onChange={(val) => updateAction(index, "action_score", val)}
                                  className="w-20"
                                  inputClassName="h-7 text-xs border-[hsl(43,49%,61%)]/50"
                                />
                                <ZonePitchSelector
                                  value={action.zone_details || (action.zone ? [{ zone: action.zone }] : [])}
                                  onChange={(zd) => {
                                    updateAction(index, 'zone_details', zd as any);
                                    updateAction(index, 'zone', (zd.length ? zd[0].zone : null) as any);
                                  }}
                                  actionType={action.action_type}
                                  compact
                                />
                                <Button
                                  onClick={() => openR90Viewer(index)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                >
                                  <Search className="h-3 w-3 text-primary" />
                                </Button>
                              </div>
                              <Input
                                value={action.action_description}
                                onChange={(e) => updateAction(index, "action_description", e.target.value)}
                                placeholder="Description"
                                className="h-7 text-xs"
                              />
                              <Input
                                value={action.notes}
                                onChange={(e) => updateAction(index, "notes", e.target.value)}
                                placeholder="Notes"
                                className="h-7 text-xs"
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
