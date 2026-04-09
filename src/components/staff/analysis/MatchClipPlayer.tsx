import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, SkipForward, SkipBack, Maximize, Minimize, Play, Pause, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { getPlaybackInstruction } from "@/lib/clipVideoUtils";
import { AnnotationToolbar } from "@/components/staff/annotations/AnnotationToolbar";
import { AnnotationCanvas } from "@/components/staff/annotations/AnnotationCanvas";
import { AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { AnnotationTool } from "@/components/staff/annotations/AnnotationEditor";

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
  if (n < 0) return "bg-red-950";
  if (n < 0.4) return "bg-red-600";
  if (n < 0.8) return "bg-orange-500";
  if (n < 1.0) return "bg-yellow-400";
  if (n < 1.4) return "bg-lime-400";
  if (n < 1.8) return "bg-green-500";
  return "bg-green-700";
};

export const MatchClipPlayer = ({ analysisId, playerName, opponent, onClose }: MatchClipPlayerProps) => {
  const [clips, setClips] = useState<ClipAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClipList, setShowClipList] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipEnforcementRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Annotation state – temporary, never saved
  const [drawingMode, setDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('arrow');
  const [activeColor, setActiveColor] = useState('#C6A332');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [fillOpacity, setFillOpacity] = useState(0.3);
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Auto-pause when entering drawing mode, auto-play when leaving
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

  // Mouse wheel zoom (pass to annotation canvas via transform isn't needed – 
  // we use scroll to zoom the video area)
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => {
        const next = prev + (e.deltaY < 0 ? 0.2 : -0.2);
        return Math.min(Math.max(next, 1), 5);
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Esc: clear annotations and resume playback (don't leave player)
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, clips.length, goToClip, togglePlay, onClose, elements.length, drawingMode, clearAnnotations]);

  // After adding an annotation element, reset tool to select
  const handleToolUsed = useCallback(() => {
    setActiveTool('select');
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0c10] flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse">Loading clips...</div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0c10] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">No clips available for this report.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[#0a0c10] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#12151c] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-5 rounded-full bg-[#C6A332]" />
          <div>
            <span className="text-white text-sm font-medium">{playerName}</span>
            <span className="text-white/30 mx-2">vs</span>
            <span className="text-white/70 text-sm">{opponent}</span>
          </div>
          <span className="text-white/20 text-xs ml-2">
            Clip {currentIndex + 1} of {clips.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={drawingMode ? "default" : "ghost"}
            className={`text-white text-xs gap-1.5 ${drawingMode ? "bg-[#C6A332] hover:bg-[#C6A332]/90" : "hover:bg-white/10"}`}
            onClick={() => {
              if (drawingMode) {
                clearAnnotations();
                const vid = videoRef.current;
                if (vid && vid.paused) vid.play().then(() => setIsPlaying(true)).catch(() => {});
              } else {
                setDrawingMode(true);
              }
            }}
            title="Toggle drawing mode (D)"
          >
            <Pencil className="h-3.5 w-3.5" />
            {drawingMode ? "Exit Draw" : "Draw"}
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            disabled={currentIndex === 0} onClick={() => goToClip(currentIndex - 1)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            disabled={currentIndex >= clips.length - 1} onClick={() => goToClip(currentIndex + 1)}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setShowClipList(!showClipList)}>
            {showClipList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Left: annotation toolbar (visible when drawing) */}
        {drawingMode && (
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
        <div className="flex-1 relative flex items-center justify-center bg-[#0a0c10] min-h-0 overflow-hidden">
          {currentClip && (
            <>
              <video
                ref={videoRef}
                key={currentClip.id}
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="max-h-full max-w-full transition-transform duration-150"
                style={{ objectFit: 'contain', transform: `scale(${zoom})` }}
                playsInline
              />

              {/* SVG annotation canvas overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ transform: `scale(${zoom})` }}>
                <div className="relative" style={{ width: videoRef.current?.clientWidth || '100%', height: videoRef.current?.clientHeight || '100%' }}>
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
              </div>

              {/* Floating action score badge – always visible */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-20">
                {currentClip.action_score != null && String(currentClip.action_score) !== "" ? (
                  <>
                    <span className={`px-3 py-1.5 rounded-lg text-lg font-bold text-white shadow-lg ${getScoreColor(String(currentClip.action_score))}`}>
                      {currentClip.action_score}
                    </span>
                    <span className="text-white/70 text-[10px] bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                      {currentClip.action_type}
                    </span>
                  </>
                ) : (
                  <span className="text-white/50 text-[10px] bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                    {currentClip.action_type}
                  </span>
                )}
              </div>

              {/* Drawing mode indicator */}
              {drawingMode && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#C6A332]/90 text-white text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5 z-30 backdrop-blur-sm">
                  <Pencil className="w-3 h-3" /> Drawing — right-click or Esc to clear
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: clip list sidebar (when expanded) */}
        {showClipList && (
          <div className="w-64 bg-[#12151c] border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Clip List</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {clips.map((clip, i) => (
                <button
                  key={clip.id}
                  onClick={() => goToClip(i)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm transition-colors border-b border-white/[0.03] ${
                    i === currentIndex
                      ? "bg-[#C6A332]/10 border-l-2 border-l-[#C6A332]"
                      : "text-white/50 hover:bg-white/[0.03] border-l-2 border-l-transparent"
                  }`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white ${
                    clip.action_score != null && String(clip.action_score) !== ""
                      ? getScoreColor(String(clip.action_score))
                      : 'bg-white/10'
                  }`}>
                    {clip.action_score != null && String(clip.action_score) !== "" ? clip.action_score : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs block truncate ${i === currentIndex ? 'text-white' : ''}`}>
                      {clip.action_type}
                    </span>
                    {clip.minute && (
                      <span className="text-[10px] text-white/30">{clip.minute}'</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {currentClip && (
        <div className="px-4 py-2 bg-[#12151c] border-t border-white/5 flex items-center gap-3 shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getScoreColor(String(currentClip.action_score))}`}>
            {currentClip.action_score != null && String(currentClip.action_score) !== "" ? currentClip.action_score : "—"}
          </span>
          <span className="text-white text-sm font-medium">{currentClip.action_type}</span>
          {currentClip.minute && <span className="text-white/30 text-xs">{currentClip.minute}'</span>}
          {currentClip.description && (
            <span className="text-white/20 text-xs ml-2 truncate max-w-[300px]">{currentClip.description}</span>
          )}
          <span className="text-white/10 text-[10px] ml-auto">
            Space play/pause · ←→ clips · D draw · Right-click clear · Esc clear/close · Scroll zoom
          </span>
        </div>
      )}
    </div>
  );
};
