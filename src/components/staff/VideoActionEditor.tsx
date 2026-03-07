import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, ChevronLeft, ChevronRight, Save, Search, ChevronDown, SkipForward } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="fixed inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 w-screen h-screen max-w-none max-h-none p-0 bg-black border-0 rounded-none flex flex-col overflow-hidden z-[200] data-[state=open]:!animate-none data-[state=closed]:!animate-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Video Action Editor</DialogTitle>

        {/* Top safe spacer bar */}
        <div className="w-full h-10 md:h-0 bg-black shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <span className="text-primary font-bold text-xs md:text-sm shrink-0">CLIP EDIT</span>
            <span className="text-xs text-white/60 shrink-0">
              {safePos + 1}/{clippedIndices.length}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-white/70 hover:text-white hover:bg-white/20 text-xs">
                  <SkipForward className="h-3 w-3" />
                  Jump to
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[300]" align="start">
                <ScrollArea className="max-h-60">
                  <div className="space-y-0.5">
                    {clippedIndices.map(({ action, index }, pos) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentPos(pos);
                          setSearchFilter("");
                          setSelectedScores(new Set());
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center gap-2 ${pos === safePos ? 'bg-primary/20 text-primary font-semibold' : ''}`}
                      >
                        <span className="font-mono font-bold">#{action.action_number}</span>
                        <span className="truncate text-muted-foreground">{action.action_type || 'Untitled'}</span>
                        {action.minute && <span className="ml-auto text-muted-foreground shrink-0">{action.minute}'</span>}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
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

        {/* Video area with nav arrows + zone overlay */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
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

          <button
            onClick={handleNext}
            disabled={safePos === clippedIndices.length - 1}
            className="absolute right-2 z-10 bg-black/50 hover:bg-black/70 disabled:opacity-20 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Zone overlay top-right */}
          <div className="absolute top-3 right-3 z-20">
            <div className="rounded-md border border-[hsl(43,49%,61%)]/30 bg-black/60 backdrop-blur-sm px-2 py-1.5">
              <ZonePitchSelector
                value={current.zone_details || (current.zone ? [{ zone: current.zone }] : [])}
                onChange={(zd) => {
                  updateAction(realIndex, 'zone_details', zd as any);
                  updateAction(realIndex, 'zone', (zd.length ? zd[0].zone : null) as any);
                }}
                actionType={current.action_type}
                popoverClassName="z-[300]"
              />
            </div>
          </div>
        </div>

        {/* Compact editing fields */}
        <div className="bg-card border-t border-border/30 px-3 md:px-4 py-2 md:py-2.5 shrink-0">
          <div className="space-y-1.5 md:space-y-2 max-w-5xl mx-auto">
            {/* Row 1: Action #, Minute, Type, Score — stacks better on mobile */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span className="text-xs md:text-sm font-bold text-primary shrink-0">
                #{current.action_number}
              </span>
              <div className="w-16 md:w-20">
                <Input
                  type="text"
                  value={current.minute}
                  onChange={(e) => updateAction(realIndex, "minute", e.target.value)}
                  placeholder="Min"
                  className="h-7 md:h-8 text-xs md:text-sm"
                />
              </div>
              <div className="relative flex-1 min-w-[100px] md:min-w-[140px] max-w-[200px]">
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
                  className="h-7 md:h-8 text-xs md:text-sm pr-6"
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
                  <div className="absolute z-50 mt-1 w-56 md:w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {actionTypes
                      .filter(type => !current.action_type || type.toLowerCase().includes(current.action_type.toLowerCase()))
                      .slice(0, 15)
                      .map((type) => (
                        <button
                          key={type}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs md:text-sm rounded hover:bg-accent flex justify-between items-center"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateAction(realIndex, "action_type", type);
                            setTypePopoverOpen(false);
                          }}
                        >
                          <span className="truncate">{type}</span>
                          <span className="text-xs text-muted-foreground ml-1">{actionTypeFrequencyMap[type] || 0}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="w-20 md:w-24">
                <Input
                  type="number"
                  step="0.00001"
                  value={current.action_score}
                  onChange={(e) => updateAction(realIndex, "action_score", e.target.value)}
                  placeholder="Score"
                  className="h-7 md:h-8 text-xs md:text-sm border-[hsl(43,49%,61%)]/50 focus-visible:ring-[hsl(43,49%,61%)]/30"
                />
              </div>
              <div className="flex items-center gap-1 md:gap-1.5 ml-auto">
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="R90..."
                  className="h-7 md:h-8 text-xs w-20 md:w-36"
                />
                <Button
                  onClick={() => openR90Viewer(realIndex)}
                  size="sm"
                  variant="ghost"
                  className="h-7 md:h-8 text-xs shrink-0 px-2"
                >
                  <Search className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                  <span className="hidden md:inline ml-1">R90</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Description + Notes — stack on mobile */}
            <div className="flex flex-col md:flex-row items-start gap-1.5 md:gap-3">
              <div className="relative w-full md:flex-1">
                <Input
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
                  placeholder="Description"
                  className="h-7 md:h-8 text-xs md:text-sm"
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
              <div className="w-full md:flex-1">
                <Input
                  value={current.notes}
                  onChange={(e) => updateAction(realIndex, "notes", e.target.value)}
                  placeholder="Notes"
                  className="h-7 md:h-8 text-xs md:text-sm"
                />
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

        {/* Bottom safe spacer bar */}
        <div className="w-full h-8 md:h-0 bg-card shrink-0" />
      </DialogContent>
    </Dialog>
  );
};
