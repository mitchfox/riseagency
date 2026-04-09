import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, SkipForward, SkipBack, Maximize, Minimize, Play, Pause, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { getPlaybackInstruction } from "@/lib/clipVideoUtils";

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

type DrawTool = "freehand" | "arrow" | "circle";

interface DrawElement {
  id: number;
  tool: DrawTool;
  colour: string;
  points: { x: number; y: number }[];
}

const DRAW_COLOURS = [
  { label: "Yellow", value: "#facc15" },
  { label: "Red", value: "#ef4444" },
  { label: "White", value: "#ffffff" },
  { label: "Blue", value: "#3b82f6" },
];

export const MatchClipPlayer = ({ analysisId, playerName, opponent, onClose }: MatchClipPlayerProps) => {
  const [clips, setClips] = useState<ClipAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClipList, setShowClipList] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipEnforcementRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Annotation state
  const [drawActive, setDrawActive] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("freehand");
  const [drawColour, setDrawColour] = useState("#facc15");
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentElementRef = useRef<DrawElement | null>(null);
  const nextIdRef = useRef(1);

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

  const startEnforcement = useCallback((start: number, end: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    clipEnforcementRef.current = window.setInterval(() => {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.currentTime >= end) {
        vid.currentTime = start;
      }
      if (vid.currentTime < start - 0.5) {
        vid.currentTime = start;
      }
    }, 100);
  }, []);

  const goToClip = useCallback((index: number) => {
    if (clipEnforcementRef.current) clearInterval(clipEnforcementRef.current);
    setCurrentIndex(index);
    setElements([]); // Clear annotations on clip change
  }, []);

  // Set up playback whenever currentClip changes
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

    return () => {
      vid.removeEventListener('loadeddata', onLoaded);
    };
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

  // --- Canvas drawing ---
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawActive) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    const el: DrawElement = { id: nextIdRef.current++, tool: drawTool, colour: drawColour, points: [pos] };
    currentElementRef.current = el;
    setDrawing(true);
  }, [drawActive, drawTool, drawColour]);

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !currentElementRef.current) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    currentElementRef.current.points.push(pos);
    renderCanvas([...elements, currentElementRef.current]);
  }, [drawing, elements]);

  const onPointerUp = useCallback(() => {
    if (!drawing || !currentElementRef.current) return;
    setElements(prev => [...prev, currentElementRef.current!]);
    currentElementRef.current = null;
    setDrawing(false);
  }, [drawing]);

  const renderCanvas = useCallback((els: DrawElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const el of els) {
      ctx.strokeStyle = el.colour;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.tool === "freehand") {
        if (el.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.tool === "arrow") {
        if (el.points.length < 2) continue;
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (el.tool === "circle") {
        if (el.points.length < 2) continue;
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, []);

  // Re-render canvas when elements change
  useEffect(() => {
    renderCanvas(elements);
  }, [elements, renderCanvas]);

  // Resize canvas to match video size
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const vid = videoRef.current;
      if (!canvas || !vid) return;
      const rect = vid.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      renderCanvas(elements);
    };
    resize();
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    if (videoRef.current) observer.observe(videoRef.current);
    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [elements, renderCanvas, currentClip]);

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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white">Loading clips...</div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white">No clips available for this report.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 shrink-0">
        <div className="text-white text-sm font-medium">
          {playerName} vs {opponent} — Clip {currentIndex + 1}/{clips.length}
        </div>
        <div className="flex items-center gap-1">
          {/* Annotation tools */}
          <Button
            size="sm"
            variant={drawActive ? "default" : "ghost"}
            className={`text-white hover:text-white/80 ${drawActive ? "bg-primary" : ""}`}
            onClick={() => setDrawActive(!drawActive)}
            title="Draw on screen"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {drawActive && (
            <>
              {(["freehand", "arrow", "circle"] as DrawTool[]).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={drawTool === t ? "default" : "ghost"}
                  className={`text-white text-xs px-2 ${drawTool === t ? "bg-white/20" : ""}`}
                  onClick={() => setDrawTool(t)}
                >
                  {t === "freehand" ? "✏️" : t === "arrow" ? "➡️" : "⭕"}
                </Button>
              ))}
              {DRAW_COLOURS.map(c => (
                <button
                  key={c.value}
                  className={`w-5 h-5 rounded-full border-2 ${drawColour === c.value ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setDrawColour(c.value)}
                  title={c.label}
                />
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white/80"
                onClick={() => setElements([])}
                title="Clear drawings"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="w-px h-5 bg-white/20 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            disabled={currentIndex === 0}
            onClick={() => goToClip(currentIndex - 1)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            disabled={currentIndex >= clips.length - 1}
            onClick={() => goToClip(currentIndex + 1)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-white/80"
            onClick={() => setShowClipList(!showClipList)}
          >
            {showClipList ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-white hover:text-white/80" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video + Canvas overlay */}
      <div className="flex-1 flex items-center justify-center bg-black min-h-0 relative">
        {currentClip && (
          <>
            <video
              ref={videoRef}
              key={currentClip.id}
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="max-h-full max-w-full"
              playsInline
            />
            {/* Drawing canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ pointerEvents: drawActive ? "auto" : "none", cursor: drawActive ? "crosshair" : "default" }}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            />
            {/* Floating action score badge */}
            {currentClip.action_score != null && String(currentClip.action_score) !== "" && (
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                <span className={`px-3 py-1.5 rounded-lg text-lg font-bold text-white shadow-lg ${getScoreColor(String(currentClip.action_score))}`}>
                  {currentClip.action_score}
                </span>
                <span className="text-white/70 text-xs bg-black/60 px-2 py-0.5 rounded">
                  {currentClip.action_type}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action info bar */}
      {currentClip && (
        <div className="px-4 py-2 bg-black/80 border-t border-white/10 flex items-center gap-3 shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getScoreColor(String(currentClip.action_score))}`}>
            {currentClip.action_score != null && String(currentClip.action_score) !== "" ? currentClip.action_score : "—"}
          </span>
          <span className="text-white text-sm font-medium">{currentClip.action_type}</span>
          {currentClip.minute && <span className="text-white/60 text-xs">{currentClip.minute}'</span>}
          <span className="text-white/40 text-xs ml-auto">Looping</span>
        </div>
      )}

      {/* Clip list */}
      {showClipList && (
        <div className="max-h-[200px] overflow-y-auto bg-black/90 border-t border-white/10 shrink-0">
          {clips.map((clip, i) => (
            <button
              key={clip.id}
              onClick={() => goToClip(i)}
              className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors ${
                i === currentIndex ? "bg-primary/20 text-primary" : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="w-6 text-center text-xs font-mono">{i + 1}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${getScoreColor(String(clip.action_score))}`}>
                {clip.action_score != null && String(clip.action_score) !== "" ? clip.action_score : "—"}
              </span>
              <span className="font-medium truncate">{clip.action_type}</span>
              {clip.minute && <span className="text-white/40 text-xs ml-auto">{clip.minute}'</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
