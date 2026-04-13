import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, SkipForward, SkipBack, Maximize, Minimize, Play, Pause, ChevronDown, ChevronUp, Pencil, ArrowUpDown, ListOrdered, Layers } from "lucide-react";
import { getPlaybackInstruction } from "@/lib/clipVideoUtils";
import { AnnotationToolbar } from "@/components/staff/annotations/AnnotationToolbar";
import { AnnotationCanvas } from "@/components/staff/annotations/AnnotationCanvas";
import { AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { AnnotationTool } from "@/components/staff/annotations/AnnotationEditor";
import { useIsMobile } from "@/hooks/use-mobile";

interface MatchClipPlayerProps {
  analysisId: string;
  playerName: string;
  opponent: string;
  onClose: () => void;
}

interface ClipAction {
  id: string;
  action_type: string;
  action_score: string;
  minute: string;
  description: string;
  video_url: string;
  clip_start: number | null;
  clip_end: number | null;
}

const getScoreColor = (score: string) => {
  const n = parseFloat(score);
  if (isNaN(n)) return "bg-muted";
  if (n <= -1) return "bg-red-900";
  if (n < -0.5) return "bg-red-700";
  if (n < 0) return "bg-red-500";
  if (n === 0) return "bg-gray-500";
  if (n < 0.5) return "bg-orange-500";
  if (n < 1.0) return "bg-yellow-500";
  if (n < 1.5) return "bg-lime-500";
  if (n < 2.0) return "bg-green-500";
  return "bg-emerald-600";
};

const ACTION_CATEGORY_RULES: { group: string; patterns: string[] }[] = [
  { group: 'Key Actions', patterns: ['goal', 'assist', 'key pass', 'penalty', 'big chance', 'chance created'] },
  { group: 'Passing', patterns: ['pass', 'through ball', 'ball retention', 'switch', 'distribution'] },
  { group: 'Movement', patterns: ['offer', 'movement', 'run', 'carry', 'progressive carry', 'rotation'] },
  { group: 'Shooting', patterns: ['shot', 'headed shot', 'shot assist', 'shot blocked'] },
  { group: 'Crossing & Wide Play', patterns: ['cross', 'attacking cross', 'front post', 'back post', 'wide', 'overlap'] },
  { group: 'Pressing & Pressure', patterns: ['press', 'applied pressure', 'defensive positioning', 'closing down'] },
  { group: 'Regains & Interceptions', patterns: ['regain', 'interception', 'recovery', 'ball recovery', 'turnover won'] },
  { group: 'Defending', patterns: ['tackle', 'clearance', 'block', 'header', 'duel', 'aerial', 'defensive'] },
  { group: 'Dribbling', patterns: ['dribble', 'take on', 'take-on', 'skill'] },
];

const GROUP_ORDER = [
  'Key Actions', 'Passing', 'Movement', 'Shooting', 'Crossing & Wide Play',
  'Pressing & Pressure', 'Regains & Interceptions', 'Defending', 'Dribbling', 'Other'
];

function getActionGroup(type: string): string {
  const lower = type.toLowerCase();
  for (const rule of ACTION_CATEGORY_RULES) {
    if (rule.patterns.some(p => lower.includes(p))) return rule.group;
  }
  return 'Other';
}

type SortMode = 'match' | 'score' | 'type';



export const MatchClipPlayer = ({ analysisId, playerName, opponent, onClose }: MatchClipPlayerProps) => {
  const [clips, setClips] = useState<ClipAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClipList, setShowClipList] = useState(false);
  const [clipListSort, setClipListSort] = useState<SortMode>('match');
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipEnforcementRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Annotation state – temporary, never saved
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('arrow');
  const [activeColor, setActiveColor] = useState('#C6A332');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [fillOpacity, setFillOpacity] = useState(0.3);
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  useEffect(() => {
    const fetchClips = async () => {
      const { data, error } = await supabase
        .from("performance_report_actions")
        .select("id, action_type, action_score, minute, notes, video_url, clip_start, clip_end")
        .eq("analysis_id", analysisId)
        .not("video_url", "is", null)
        .order("action_number", { ascending: true });

      if (error) console.error("Clip fetch error:", error);
      setClips((data || []).map((c: any) => ({ ...c, description: c.notes || '' })).filter((c: any) => c.video_url));
      setLoading(false);
    };
    fetchClips();
  }, [analysisId]);

  useEffect(() => {
    return () => {
      if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    };
  }, []);

  const currentClip = clips[currentIndex];

  const avgScoreForType = useMemo(() => {
    if (!currentClip?.action_type) return null;
    const currentType = (currentClip.action_type || '').toLowerCase();
    if (!currentType) return null;
    const matching = clips.filter(c => {
      const t = (c.action_type || '').toLowerCase();
      return t === currentType || t.includes(currentType) || currentType.includes(t);
    });
    if (matching.length === 0) return null;
    const scores = matching.map(c => parseFloat(String(c.action_score))).filter(n => !isNaN(n));
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }, [currentClip, clips]);

  const sortedClipIndices = useMemo(() => {
    const indices = clips.map((_, i) => i);
    if (clipListSort === 'score') {
      return [...indices].sort((a, b) => {
        const sa = parseFloat(String(clips[b].action_score)) || -999;
        const sb = parseFloat(String(clips[a].action_score)) || -999;
        return sa - sb;
      });
    }
    if (clipListSort === 'type') {
      return [...indices].sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(getActionGroup(clips[a].action_type));
        const gb = GROUP_ORDER.indexOf(getActionGroup(clips[b].action_type));
        if (ga !== gb) return ga - gb;
        return a - b;
      });
    }
    return indices;
  }, [clips, clipListSort]);

  const clearAnnotations = useCallback(() => {
    setElements([]);
    setSelectedId(null);
    setDrawingMode(false);
  }, []);

  const startEnforcement = useCallback((start: number, end: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    clipEnforcementRef.current = window.setInterval(() => {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.currentTime >= end) vid.currentTime = start;
      if (vid.currentTime < start - 0.5) vid.currentTime = start;
    }, 100);
  }, []);

  const goToClip = useCallback((index: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    setCurrentIndex(index);
    setElements([]);
    setSelectedId(null);
    setDrawingMode(false);
  }, []);

  // Auto-pause when entering drawing mode
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (drawingMode && !vid.paused) {
      vid.pause();
      setIsPlaying(false);
    }
  }, [drawingMode]);

  useEffect(() => {
    const vid = videoRef.current;
    const clip = currentClip;
    if (!vid || !clip) return;

    const instruction = getPlaybackInstruction(clip);
    if (instruction.mode === 'blocked') return;

    vid.src = instruction.src;
    vid.load();

    const onLoaded = () => {
      if (instruction.mode === 'clipped') {
        vid.currentTime = instruction.clipStart;
        startEnforcement(instruction.clipStart, instruction.clipEnd);
      }
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    vid.addEventListener('loadeddata', onLoaded, { once: true });
    return () => vid.removeEventListener('loadeddata', onLoaded);
  }, [currentClip, startEnforcement]);

  const handleVideoEnded = useCallback(() => {
    const vid = videoRef.current;
    const clip = currentClip;
    if (!vid || !clip) return;
    const instruction = getPlaybackInstruction(clip);
    if (instruction.mode === 'clipped') {
      vid.currentTime = instruction.clipStart;
    } else {
      vid.currentTime = 0;
    }
    vid.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentClip]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    } else {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Right-click to clear annotations
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      if (elements.length > 0) {
        clearAnnotations();
        const vid = videoRef.current;
        if (vid && vid.paused) {
          vid.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [elements.length, clearAnnotations]);

  // Mouse wheel zoom - prevent page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom(prev => {
        const next = prev + (e.deltaY < 0 ? 0.2 : -0.2);
        return Math.min(Math.max(next, 1), 5);
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Left-click on video to toggle drawing mode
  const handleVideoAreaClick = useCallback((e: React.MouseEvent) => {
    if (drawingMode) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) return;
    
    const vid = videoRef.current;
    if (vid && !vid.paused) {
      vid.pause();
      setIsPlaying(false);
    }
    setDrawingMode(true);
  }, [drawingMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (elements.length > 0 || drawingMode) {
          clearAnnotations();
          const vid = videoRef.current;
          if (vid && vid.paused) {
            vid.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        } else {
          onClose();
        }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'ArrowRight' && currentIndex < clips.length - 1) goToClip(currentIndex + 1);
      if (e.key === 'ArrowLeft' && currentIndex > 0) goToClip(currentIndex - 1);
      if (e.key === 'd' || e.key === 'D') {
        setDrawingMode(prev => {
          if (prev) { setElements([]); setSelectedId(null); }
          return !prev;
        });
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId && drawingMode) {
        e.preventDefault();
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, clips.length, goToClip, togglePlay, onClose, elements.length, drawingMode, clearAnnotations, selectedId]);

  const handleToolUsed = useCallback(() => {
    setActiveTool('select');
  }, []);

  // Lock body scroll while clip player is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#0a0c10] flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse">Loading clips...</div>
      </div>,
      document.body
    );
  }

  if (clips.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-[#0a0c10] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">No clips available for this report.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#0a0c10] flex flex-col" style={{ overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-[#12151c] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-1.5 h-5 rounded-full bg-[#C6A332] shrink-0" />
          <div className="truncate">
            <span className="text-white text-sm font-medium">{playerName}</span>
            <span className="text-white/30 mx-1 md:mx-2">vs</span>
            <span className="text-white/70 text-sm">{opponent}</span>
          </div>
          <span className="text-white/20 text-xs shrink-0">
            {currentIndex + 1}/{clips.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1">
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            disabled={currentIndex === 0} onClick={() => goToClip(currentIndex - 1)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            disabled={currentIndex >= clips.length - 1} onClick={() => goToClip(currentIndex + 1)}>
            <SkipForward className="h-4 w-4" />
          </Button>

          {!isMobile && (
            <>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-[#C6A332] hover:text-[#C6A332] hover:bg-[#C6A332]/10 h-8 w-8 p-0 ml-0.5"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: annotation toolbar (visible when drawing, hide on mobile to save space) */}
        {drawingMode && !isMobile && (
          <AnnotationToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            activeColor={activeColor}
            setActiveColor={setActiveColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            fillOpacity={fillOpacity}
            setFillOpacity={setFillOpacity}
          />
        )}

        {/* Centre: video + annotation overlay */}
        <div
          className="flex-1 relative flex items-center justify-center bg-[#0a0c10] min-h-0 overflow-hidden cursor-crosshair"
          onClick={handleVideoAreaClick}
        >
          {currentClip && (
            <>
              <div className="relative w-full aspect-video max-h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                <video
                  ref={videoRef}
                  key={currentClip.id}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-fill block"
                  playsInline
                />

                {/* Annotation canvas — matches video exactly via object-fill parity */}
                <div style={{ pointerEvents: drawingMode ? 'auto' : 'none' }} className="absolute inset-0">
                  <AnnotationCanvas
                    elements={elements}
                    setElements={setElements}
                    activeTool={drawingMode ? activeTool : 'select'}
                    activeColor={activeColor}
                    strokeWidth={strokeWidth}
                    fillOpacity={fillOpacity}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    videoRef={videoRef}
                    linkSource={linkSource}
                    setLinkSource={setLinkSource}
                    klipOffset={0}
                    isDrawingMode={drawingMode}
                    onToolUsed={handleToolUsed}
                  />
                </div>
              </div>

              {/* Floating action score badge */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col items-end gap-1 z-20">
                {currentClip.action_score != null && String(currentClip.action_score) !== "" ? (
                  <>
                    <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-base md:text-lg font-bold text-white shadow-lg ${getScoreColor(String(currentClip.action_score))}`}>
                      {currentClip.action_score}
                    </span>
                    <span className="text-white/70 text-[9px] md:text-[10px] bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                      {currentClip.action_type}
                    </span>
                    {avgScoreForType && (
                      <span className="text-white/40 text-[8px] md:text-[9px] bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                        Avg: {avgScoreForType}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-white/50 text-[9px] md:text-[10px] bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                    {currentClip.action_type}
                  </span>
                )}
              </div>

              {/* Drawing mode indicator */}
              {drawingMode && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#C6A332]/90 text-white text-[9px] md:text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5 z-30 backdrop-blur-sm">
                  <Pencil className="w-3 h-3" /> {isMobile ? 'Drawing' : 'Drawing — right-click or Esc to clear'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom bar – action info + expandable clip list */}
      {currentClip && (
        <div className="bg-[#12151c] border-t border-white/5 shrink-0">
          {/* Action info row */}
          <div className="px-3 md:px-4 py-2 flex items-center gap-2 md:gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white shrink-0 ${getScoreColor(String(currentClip.action_score))}`}>
              {currentClip.action_score != null && String(currentClip.action_score) !== "" ? currentClip.action_score : "—"}
            </span>
            <span className="text-white text-xs md:text-sm font-medium truncate">{currentClip.action_type}</span>
            {currentClip.minute && <span className="text-white/30 text-xs shrink-0">{currentClip.minute}'</span>}
            {!isMobile && currentClip.description && (
              <span className="text-white/20 text-xs ml-2 truncate max-w-[300px]">{currentClip.description}</span>
            )}

            <div className="ml-auto flex items-center gap-1">
              {!isMobile && (
                <span className="text-white/10 text-[10px] hidden lg:inline">
                  Click to draw · Right-click clear · ←→ clips · Space play · Scroll zoom
                </span>
              )}
              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white hover:bg-white/10 text-[10px] gap-1 h-7"
                onClick={() => setShowClipList(!showClipList)}>
                {showClipList ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                {showClipList ? 'Hide' : 'All'}
              </Button>
            </div>
          </div>

          {/* Expandable clip list */}
          {showClipList && (
            <div className="border-t border-white/5">
              <div className="flex items-center gap-1 px-3 md:px-4 py-1.5 border-b border-white/5">
                <span className="text-[10px] text-white/30 uppercase tracking-wider mr-2">Sort:</span>
                {(['match', 'score', 'type'] as SortMode[]).map(mode => (
                  <Button
                    key={mode}
                    size="sm" variant="ghost"
                    className={`text-[10px] h-6 px-2 ${clipListSort === mode ? 'text-[#C6A332] bg-[#C6A332]/10' : 'text-white/40 hover:text-white'}`}
                    onClick={() => setClipListSort(mode)}
                  >
                    {mode === 'match' && <><ListOrdered className="w-3 h-3 mr-1" /> Match</>}
                    {mode === 'score' && <><ArrowUpDown className="w-3 h-3 mr-1" /> Score</>}
                    {mode === 'type' && <><Layers className="w-3 h-3 mr-1" /> Type</>}
                  </Button>
                ))}
              </div>
              <div className="max-h-[35vh] md:max-h-[200px] overflow-y-auto">
                {clipListSort === 'type' ? (
                  (() => {
                    const groups: Record<string, number[]> = {};
                    clips.forEach((clip, i) => {
                      const g = getActionGroup(clip.action_type);
                      if (!groups[g]) groups[g] = [];
                      groups[g].push(i);
                    });
                    return GROUP_ORDER.filter(g => groups[g]?.length).map(group => (
                      <div key={group}>
                        <div className="px-4 py-1 bg-white/[0.02] border-b border-white/5">
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">{group}</span>
                        </div>
                        {groups[group].map(i => (
                          <ClipListItem key={clips[i].id} clip={clips[i]} index={i} isActive={i === currentIndex} onClick={() => goToClip(i)} />
                        ))}
                      </div>
                    ));
                  })()
                ) : (
                  sortedClipIndices.map(i => (
                    <ClipListItem key={clips[i].id} clip={clips[i]} index={i} isActive={i === currentIndex} onClick={() => goToClip(i)} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

const ClipListItem = ({ clip, index, isActive, onClick }: { clip: ClipAction; index: number; isActive: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 md:px-4 py-2 flex items-center gap-2 text-sm transition-colors border-b border-white/[0.03] ${
      isActive
        ? "bg-[#C6A332]/10 border-l-2 border-l-[#C6A332]"
        : "text-white/50 hover:bg-white/[0.03] border-l-2 border-l-transparent"
    }`}
  >
    <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white ${
      clip.action_score != null && String(clip.action_score) !== ""
        ? getScoreColor(String(clip.action_score))
        : 'bg-white/10'
    }`}>
      {clip.action_score != null && String(clip.action_score) !== "" ? clip.action_score : index + 1}
    </span>
    <span className={`text-xs truncate ${isActive ? 'text-white' : ''}`}>
      {clip.action_type}
    </span>
    {clip.minute && (
      <span className="text-[10px] text-white/30 ml-auto shrink-0">{clip.minute}'</span>
    )}
  </button>
);
