import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, ChevronLeft, ChevronRight, Save, Search, ChevronDown } from "lucide-react";
import { ZonePitchSelector, type ZonePoint } from "@/components/report/ZonePitchSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatScoreWithFrequency } from "@/lib/utils";
import { canonicalActionType } from "@/lib/playerActionFrequency";
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

interface VideoActionEditorProps {
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

export const VideoActionEditor = ({
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
}: VideoActionEditorProps) => {
  // Only show actions that have a video clip
  const clippedIndices = actions
    .map((a, i) => ({ action: a, index: i }))
    .filter(({ action }) => action.video_url);

  const [currentPos, setCurrentPos] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedScores, setSelectedScores] = useState<Set<number>>(new Set());
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [descPopoverOpen, setDescPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPos(0);
      setSearchFilter("");
      setSelectedScores(new Set());
    }
  }, [open]);

  if (!clippedIndices.length) return null;

  const safePos = Math.min(currentPos, clippedIndices.length - 1);
  const { action: current, index: realIndex } = clippedIndices[safePos];

  const handlePrev = () => {
    if (safePos > 0) setCurrentPos(safePos - 1);
    setSearchFilter("");
    setSelectedScores(new Set());
  };

  const handleNext = () => {
    if (safePos < clippedIndices.length - 1) setCurrentPos(safePos + 1);
    setSearchFilter("");
    setSelectedScores(new Set());
  };

  const filteredScores = searchFilter.trim()
    ? allR90Ratings.filter(s =>
        s.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none">
        <DialogTitle className="sr-only">Video Action Editor</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-primary font-bold text-sm">VIDEO EDITOR</span>
            <span className="text-xs text-white/60">
              {safePos + 1} / {clippedIndices.length} clipped actions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSave}
              disabled={saving}
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Update Report"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:text-white hover:bg-white/20 h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Video area with nav arrows */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
          {/* Left arrow */}
          <button
            onClick={handlePrev}
            disabled={safePos === 0}
            className="absolute left-2 z-10 bg-black/50 hover:bg-black/70 disabled:opacity-20 text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <video
            ref={videoRef}
            key={current.video_url}
            src={current.video_url!}
            preload="auto"
            crossOrigin="anonymous"
            controls
            className="w-full h-full object-contain"
            onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          />

          {/* Right arrow */}
          <button
            onClick={handleNext}
            disabled={safePos === clippedIndices.length - 1}
            className="absolute right-2 z-10 bg-black/50 hover:bg-black/70 disabled:opacity-20 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Editing fields */}
        <div className="bg-card border-t border-border/30 px-4 py-3 shrink-0 overflow-y-auto max-h-[45vh]">
          <div className="space-y-3 max-w-4xl mx-auto">
            {/* Row 1: Action #, Minute, Type, Score */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-primary shrink-0">
                #{current.action_number}
              </span>
              <div className="w-20">
                <Input
                  type="text"
                  value={current.minute}
                  onChange={(e) => updateAction(realIndex, "minute", e.target.value)}
                  placeholder="Min"
                  className="h-8 text-sm"
                />
              </div>
              <div className="relative flex-1 min-w-[140px] max-w-[200px]">
                <Input
                  value={current.action_type}
                  onChange={(e) => {
                    updateAction(realIndex, "action_type", e.target.value);
                    setTypePopoverOpen(true);
                  }}
                  onFocus={() => setTypePopoverOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setTypePopoverOpen(false), 200);
                    if (current.action_type) updateAction(realIndex, "action_type", canonicalActionType(current.action_type));
                  }}
                  placeholder="Action type"
                  className="h-8 text-sm pr-7"
                />
                {current.action_type && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      updateAction(realIndex, "action_type", "");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {typePopoverOpen && (
                  <div className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {actionTypes
                      .filter(type => !current.action_type || type.toLowerCase().includes(current.action_type.toLowerCase()))
                      .slice(0, 15)
                      .map((type) => (
                        <button
                          key={type}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex justify-between items-center"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateAction(realIndex, "action_type", type);
                            setTypePopoverOpen(false);
                          }}
                        >
                          <span>{type}</span>
                          <span className="text-xs text-muted-foreground">{actionTypeFrequencyMap[type] || 0}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  step="0.00001"
                  value={current.action_score}
                  onChange={(e) => updateAction(realIndex, "action_score", e.target.value)}
                  placeholder="Score"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
              <Textarea
                value={current.action_description}
                onChange={(e) => {
                  updateAction(realIndex, "action_description", e.target.value);
                  setDescPopoverOpen(true);
                }}
                onFocus={() => {
                  if (current.action_type && getDescriptionsForType(current.action_type).length > 0) {
                    setDescPopoverOpen(true);
                  }
                }}
                onBlur={() => setTimeout(() => setDescPopoverOpen(false), 200)}
                placeholder="Describe the action"
                className="text-sm min-h-[40px]"
                rows={2}
              />
              {descPopoverOpen && current.action_type && getDescriptionsForType(current.action_type).length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                  {getDescriptionsForType(current.action_type)
                    .filter(desc => !current.action_description || desc.toLowerCase().includes(current.action_description.toLowerCase()))
                    .slice(0, 10)
                    .map((desc, di) => (
                      <button
                        key={di}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateAction(realIndex, "action_description", desc);
                          setDescPopoverOpen(false);
                        }}
                      >
                        {desc}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Row 3: Notes */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Textarea
                value={current.notes}
                onChange={(e) => updateAction(realIndex, "notes", e.target.value)}
                placeholder="Optional notes"
                className="text-sm min-h-[40px]"
                rows={2}
              />
            </div>

            {/* Row 4: Zone + R90 Search */}
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-md border border-[hsl(43,49%,61%)]/30 bg-background px-2 py-1.5">
                <ZonePitchSelector
                  value={current.zone_details || (current.zone ? [{ zone: current.zone }] : [])}
                  onChange={(zd) => {
                    updateAction(realIndex, 'zone_details', zd as any);
                    updateAction(realIndex, 'zone', (zd.length ? zd[0].zone : null) as any);
                  }}
                  actionType={current.action_type}
                />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search R90..."
                  className="h-8 text-xs flex-1"
                />
                <Button
                  onClick={() => openR90Viewer(realIndex)}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs shrink-0"
                >
                  <Search className="h-3.5 w-3.5 text-primary mr-1" />
                  R90
                </Button>
              </div>
            </div>

            {/* R90 Search Results */}
            {searchFilter.trim() && (
              <div className="p-2 bg-muted/20 space-y-1 max-h-32 overflow-y-auto rounded border">
                {filteredScores.map((item, scoreIdx) => {
                  const isSelected = selectedScores.has(scoreIdx);
                  return (
                    <div key={scoreIdx} className="flex items-start gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedScores);
                          if (checked) {
                            newSelected.add(scoreIdx);
                          } else {
                            newSelected.delete(scoreIdx);
                          }
                          setSelectedScores(newSelected);

                          const totalScore = Array.from(newSelected).reduce((sum, idx) => {
                            const score = filteredScores[idx]?.score;
                            const numScore = typeof score === 'number' ? score : (typeof score === 'string' && !isNaN(parseFloat(score)) ? parseFloat(score) : 0);
                            return sum + numScore;
                          }, 0);
                          updateAction(realIndex, "action_score", totalScore.toString());
                        }}
                        className="mt-0.5"
                      />
                      <label className="font-mono flex-1 cursor-pointer text-xs text-muted-foreground">
                        {item.title} {formatScoreWithFrequency(item.score)}
                      </label>
                    </div>
                  );
                })}
                {filteredScores.length === 0 && (
                  <p className="text-muted-foreground text-center py-1 text-xs">No matching scores</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
