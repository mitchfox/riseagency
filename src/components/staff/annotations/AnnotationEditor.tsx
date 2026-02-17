import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Save, Volume2, VolumeX, Trash2, Layers, Clock, Timer,
  Lock, Pencil, X,
} from "lucide-react";
import { AnnotationProject, AnnotationElement, Klip, ElementKeyframe } from "./AnnotationProjects";
import { AnnotationCanvas, TrackerState } from "./AnnotationCanvas";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { toast } from "sonner";

interface AnnotationEditorProps {
  project: AnnotationProject;
  onSave: (project: AnnotationProject) => void;
  onBack: () => void;
}

export type AnnotationTool =
  | 'select' | 'line' | 'arrow' | 'curve' | 'rect' | 'circle'
  | 'spotlight' | 'text' | 'freehand' | 'player-marker' | 'eraser'
  | 'vision-cone' | 'distance' | 'magnifier' | 'linked-line' | 'tracker';

const interpolateKeyframes = (keyframes: ElementKeyframe[], time: number): { x: number; y: number; opacity: number; scale: number } | null => {
  if (!keyframes || keyframes.length === 0) return null;
  if (time <= keyframes[0].time) return { x: keyframes[0].x, y: keyframes[0].y, opacity: keyframes[0].opacity ?? 1, scale: keyframes[0].scale ?? 1 };
  if (time >= keyframes[keyframes.length - 1].time) {
    const last = keyframes[keyframes.length - 1];
    return { x: last.x, y: last.y, opacity: last.opacity ?? 1, scale: last.scale ?? 1 };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i], b = keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        opacity: (a.opacity ?? 1) + ((b.opacity ?? 1) - (a.opacity ?? 1)) * t,
        scale: (a.scale ?? 1) + ((b.scale ?? 1) - (a.scale ?? 1)) * t,
      };
    }
  }
  return null;
};

export const AnnotationEditor = ({ project, onSave, onBack }: AnnotationEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPanel, setShowPanel] = useState(true);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  // Single klip covering the full video — no segments UI
  const [klips, setKlips] = useState<Klip[]>(() => {
    if (project.klips && project.klips.length > 0) return project.klips;
    return [];
  });
  const [activeKlipId, setActiveKlipId] = useState<string | null>(project.klips?.[0]?.id || null);
  const [autoCreated, setAutoCreated] = useState(false);

  const [trackers, setTrackers] = useState<TrackerState[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [drawingStartElements, setDrawingStartElements] = useState<AnnotationElement[]>([]);
  const [drawingTimestamp, setDrawingTimestamp] = useState(0);

  const activeKlip = klips.find(k => k.id === activeKlipId);
  const klipOffset = activeKlip ? currentTime - activeKlip.startTime : 0;

  const allElements = activeKlip?.elements || [];

  const visibleElements = useMemo(() => {
    return allElements.filter(el => {
      const start = el.appearAt;
      const end = el.duration !== undefined ? start + el.duration : Infinity;
      return klipOffset >= start && klipOffset < end;
    }).map(el => {
      if (el.keyframes && el.keyframes.length > 0) {
        const interp = interpolateKeyframes(el.keyframes, klipOffset);
        if (interp) return { ...el, x: interp.x, y: interp.y, opacity: interp.opacity };
      }
      if (el.animateIn && el.animateIn > 0) {
        const elapsed = klipOffset - el.appearAt;
        if (elapsed < el.animateIn) {
          const opacity = (elapsed / el.animateIn) * (el.opacity ?? 1);
          return { ...el, opacity };
        }
      }
      if (el.animateOut && el.animateOut > 0 && el.duration) {
        const remaining = (el.appearAt + el.duration) - klipOffset;
        if (remaining < el.animateOut) {
          const opacity = (remaining / el.animateOut) * (el.opacity ?? 1);
          return { ...el, opacity };
        }
      }
      return el;
    });
  }, [allElements, klipOffset]);

  const shouldHoldFrame = useMemo(() => {
    return visibleElements.some(el => el.holdFrame);
  }, [visibleElements]);

  const setElements = useCallback((updater: React.SetStateAction<AnnotationElement[]>) => {
    setKlips(prev => prev.map(k => {
      if (k.id !== activeKlipId) return k;
      const newElements = typeof updater === 'function' ? updater(k.elements) : updater;
      return { ...k, elements: newElements };
    }));
  }, [activeKlipId]);

  const klipColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

  // Auto-create segment once duration is known
  useEffect(() => {
    if (duration > 0 && klips.length === 0 && !autoCreated) {
      const id = crypto.randomUUID();
      const klip: Klip = {
        id,
        name: 'Full Video',
        startTime: 0,
        endTime: duration,
        elements: [],
        color: klipColors[0],
      };
      setKlips([klip]);
      setActiveKlipId(id);
      setAutoCreated(true);
    }
  }, [duration, klips.length, autoCreated]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldHoldFrame && !video.paused) video.pause();
  }, [shouldHoldFrame]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); }
    else { video.pause(); setIsPlaying(false); }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const stepFrame = useCallback((dir: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + dir * (1 / 30)));
  }, []);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.25, 0.5, 1, 1.5, 2];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }, [playbackRate]);

  const deleteKlip = useCallback((id: string) => {
    setKlips(prev => prev.filter(k => k.id !== id));
    if (activeKlipId === id) {
      setActiveKlipId(klips.find(k => k.id !== id)?.id || null);
    }
  }, [activeKlipId, klips]);

  const handleSave = () => {
    onSave({ ...project, klips });
    toast.success("Project saved");
  };

  const startDrawing = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    setDrawingTimestamp(video.currentTime);
    // Save current elements so we can revert on cancel
    setDrawingStartElements(activeKlip?.elements || []);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setFreezeFrameUrl(canvas.toDataURL('image/jpeg', 0.85));
      }
    } catch {
      setFreezeFrameUrl(null);
    }
    setDrawingMode(true);
    setActiveTool('select');
  }, [activeKlip]);

  const saveDrawing = useCallback(() => {
    setDrawingMode(false);
    setFreezeFrameUrl(null);
    setActiveTool('select');
    setSelectedId(null);
    // Elements are already in the klip — just close drawing mode
    handleSave();
    toast.success("Annotation saved");
  }, [handleSave]);

  const cancelDrawing = useCallback(() => {
    // Revert elements to what they were before drawing started
    setKlips(prev => prev.map(k => {
      if (k.id !== activeKlipId) return k;
      return { ...k, elements: drawingStartElements };
    }));
    setDrawingMode(false);
    setFreezeFrameUrl(null);
    setActiveTool('select');
    setSelectedId(null);
  }, [activeKlipId, drawingStartElements]);

  const handleToolUsed = useCallback(() => {
    setActiveTool('select');
  }, []);

  const handleDeleteElement = useCallback(() => {
    if (selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, setElements]);

  const updateElement = useCallback((id: string, updates: Partial<AnnotationElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, [setElements]);

  const addKeyframe = useCallback(() => {
    if (!selectedId) return;
    const el = allElements.find(e => e.id === selectedId);
    if (!el) return;
    const kf: ElementKeyframe = { time: klipOffset, x: el.x, y: el.y, opacity: el.opacity, scale: 1 };
    const existing = el.keyframes || [];
    const updated = [...existing.filter(k => Math.abs(k.time - klipOffset) > 0.05), kf].sort((a, b) => a.time - b.time);
    updateElement(selectedId, { keyframes: updated });
    toast.success(`Keyframe added at ${klipOffset.toFixed(1)}s`);
  }, [selectedId, allElements, klipOffset, updateElement]);

  useEffect(() => {
    trackers.forEach(tracker => {
      if (!tracker.active) return;
      const el = allElements.find(e => e.id === tracker.elementId);
      if (el) {
        const time = videoRef.current?.currentTime || 0;
        const lastPos = tracker.positions[tracker.positions.length - 1];
        if (lastPos && (Math.abs(el.x - lastPos.x) > 0.5 || Math.abs(el.y - lastPos.y) > 0.5)) {
          setTrackers(prev => prev.map(t =>
            t.id === tracker.id ? { ...t, positions: [...t.positions, { time, x: el.x, y: el.y }] } : t
          ));
        }
      }
    });
  }, [currentTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDeleteElement(); }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft' && !e.shiftKey) { e.preventDefault(); stepFrame(-1); }
      if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); stepFrame(1); }
      if (e.key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); stepFrame(-10); }
      if (e.key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); stepFrame(10); }
      if (e.key === 'Escape') { setActiveTool('select'); setSelectedId(null); setLinkSource(null); }
      if (e.key === 'v') setActiveTool('select');
      if (e.key === 'k' && e.ctrlKey) { e.preventDefault(); addKeyframe(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDeleteElement, togglePlay, stepFrame, addKeyframe]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const fr = Math.floor((s % 1) * 30);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(fr).padStart(2, '0')}`;
  };

  const selectedElement = allElements.find(el => el.id === selectedId);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#1e2330] rounded-lg overflow-hidden text-white">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161a24] border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium truncate flex-1">{project.name}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={() => setShowPanel(!showPanel)}>
            <Layers className="w-3.5 h-3.5" /> {showPanel ? 'Hide' : 'Show'} Panel
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left tools - only visible in drawing mode */}
        {drawingMode && (
          <AnnotationToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            activeColor={activeColor}
            setActiveColor={setActiveColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
          />
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas */}
          <div className="flex-1 relative bg-[#12151e] flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={project.videoUrl}
                className={`max-w-full max-h-full ${drawingMode ? 'invisible' : ''}`}
                muted={muted}
                playsInline
                preload="auto"
                onClick={drawingMode ? undefined : togglePlay}
              />
              {drawingMode && freezeFrameUrl && (
                <img src={freezeFrameUrl} className="max-w-full max-h-full absolute inset-0 m-auto" alt="Freeze frame" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', zIndex: 10 }} />
              )}
              {activeKlip && drawingMode && (
                <AnnotationCanvas
                  elements={visibleElements}
                  setElements={setElements}
                  activeTool={activeTool}
                  activeColor={activeColor}
                  strokeWidth={strokeWidth}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  videoRef={videoRef}
                  trackers={trackers}
                  setTrackers={setTrackers}
                  linkSource={linkSource}
                  setLinkSource={setLinkSource}
                  klipOffset={klipOffset}
                  onToolUsed={handleToolUsed}
                />
              )}
            </div>
            {drawingMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 z-10">
                <Pencil className="w-3 h-3" /> Drawing Mode — use tools on the left
              </div>
            )}
            {linkSource && !drawingMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/80 text-white text-xs px-3 py-1 rounded-full">
                Click second element to link
              </div>
            )}
            {shouldHoldFrame && !drawingMode && (
              <div className="absolute top-2 right-2 bg-amber-500/80 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3" /> Frame held
              </div>
            )}
          </div>

          {/* Transport controls */}
          <div className="bg-[#161a24] border-t border-white/10 px-4 py-2 shrink-0 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60 font-mono w-24">{formatTime(currentTime)}</span>
              <div className="flex-1 relative">
                <Slider
                  value={[currentTime]}
                  max={duration || 1}
                  step={0.01}
                  onValueChange={([v]) => seek(v)}
                  className="[&_[role=slider]]:bg-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                />
                {duration > 0 && klips.map(klip => (
                  <div
                    key={klip.id}
                    className={`absolute top-full mt-0.5 h-1.5 rounded-full cursor-pointer transition-opacity ${
                      klip.id === activeKlipId ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      left: `${(klip.startTime / duration) * 100}%`,
                      width: `${((klip.endTime - klip.startTime) / duration) * 100}%`,
                      backgroundColor: klip.color,
                    }}
                    onClick={() => { setActiveKlipId(klip.id); seek(klip.startTime); }}
                  />
                ))}
                {activeKlip && duration > 0 && allElements.map(el => {
                  const elTime = activeKlip.startTime + el.appearAt;
                  return (
                    <div
                      key={el.id}
                      className={`absolute cursor-pointer rounded-full transition-all ${
                        el.id === selectedId ? 'ring-2 ring-white scale-125' : 'hover:scale-110'
                      }`}
                      style={{
                        top: 'calc(100% + 3px)',
                        left: `${(elTime / duration) * 100}%`,
                        width: '8px',
                        height: '8px',
                        backgroundColor: el.color,
                        transform: `translateX(-4px)${el.id === selectedId ? ' scale(1.25)' : ''}`,
                      }}
                      onClick={() => { setSelectedId(el.id); seek(elTime); }}
                      title={`${el.type} at ${el.appearAt.toFixed(1)}s`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-white/60 font-mono w-24 text-right">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-1 pt-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => seek(0)}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => stepFrame(-1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => stepFrame(1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => seek(duration)}>
                <SkipForward className="w-3.5 h-3.5" />
              </Button>

              <div className="mx-3 border-l border-white/10 h-5" />

              <Button variant="ghost" size="sm" className="text-xs text-white/60 hover:text-white font-mono h-6 px-2" onClick={cycleSpeed}>
                x{playbackRate}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>


              {selectedId && (
                <Button variant="ghost" size="sm" className="text-xs text-amber-400/70 hover:text-amber-300 gap-1 h-6 px-2" onClick={addKeyframe} title="Add keyframe (Ctrl+K)">
                  <Clock className="w-3 h-3" /> Keyframe
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        {showPanel && (
          <div className="w-60 bg-[#161a24] border-l border-white/10 shrink-0 flex flex-col overflow-hidden">
            {/* Draw / Save / Cancel buttons */}
            <div className="p-3 border-b border-white/10">
              {drawingMode ? (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                    onClick={saveDrawing}
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={cancelDrawing}
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 border-primary/50 text-primary hover:bg-primary/10"
                  onClick={startDrawing}
                >
                  <Pencil className="w-3.5 h-3.5" /> Draw on Frame
                </Button>
              )}
            </div>

            {/* Timeline Events (Elements) */}
            <div className="p-3 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                Annotations {activeKlip ? `(${allElements.length})` : ''}
              </p>
              {selectedId && (
                <Button variant="destructive" size="sm" className="w-full text-xs mb-2 h-7" onClick={handleDeleteElement}>
                  Delete Selected
                </Button>
              )}
              <div className="space-y-0.5">
                {allElements.map((el) => {
                  const isVisible = visibleElements.some(v => v.id === el.id);
                  return (
                    <div
                      key={el.id}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded cursor-pointer ${
                        el.id === selectedId ? 'bg-primary/20 text-primary' : isVisible ? 'text-white/50 hover:bg-white/5' : 'text-white/20 hover:bg-white/5'
                      }`}
                      onClick={() => setSelectedId(el.id)}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: el.color }} />
                      <span className="truncate flex-1">
                        {el.type}{el.text ? `: ${el.text}` : ''}{el.number !== undefined ? ` #${el.number}` : ''}
                        {el.holdFrame ? ' ⏸' : ''}
                        {el.keyframes && el.keyframes.length > 0 ? ` (${el.keyframes.length}kf)` : ''}
                      </span>
                      <span className="text-[9px] text-white/25">{el.appearAt.toFixed(1)}s</span>
                    </div>
                  );
                })}
              </div>

              {/* Element scripting controls */}
              {selectedElement && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>Timing</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-14">Appear</Label>
                      <Input
                        type="number" step="0.1" min="0"
                        value={selectedElement.appearAt.toFixed(1)}
                        onChange={e => updateElement(selectedElement.id, { appearAt: parseFloat(e.target.value) || 0 })}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-14">Duration</Label>
                      <Input
                        type="number" step="0.5" min="0.5"
                        value={selectedElement.duration ?? ''}
                        placeholder="∞"
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          updateElement(selectedElement.id, { duration: v });
                        }}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-14">Fade in</Label>
                      <Input
                        type="number" step="0.1" min="0"
                        value={selectedElement.animateIn ?? ''}
                        placeholder="0"
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          updateElement(selectedElement.id, { animateIn: v });
                        }}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-14">Fade out</Label>
                      <Input
                        type="number" step="0.1" min="0"
                        value={selectedElement.animateOut ?? ''}
                        placeholder="0"
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          updateElement(selectedElement.id, { animateOut: v });
                        }}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElement.holdFrame ?? false}
                          onChange={e => updateElement(selectedElement.id, { holdFrame: e.target.checked })}
                          className="w-3 h-3 rounded"
                        />
                        Hold frame (freeze video)
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] text-white/40"
                      onClick={() => updateElement(selectedElement.id, { appearAt: klipOffset })}
                    >
                      Set appear to now ({klipOffset.toFixed(1)}s)
                    </Button>
                  </div>

                  {selectedElement.keyframes && selectedElement.keyframes.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <p className="text-[10px] text-white/40">Keyframes ({selectedElement.keyframes.length})</p>
                      {selectedElement.keyframes.map((kf, i) => (
                        <div key={i} className="flex items-center gap-1 text-[9px] text-white/40 px-1">
                          <span className="w-10">{kf.time.toFixed(1)}s</span>
                          <span className="flex-1">({kf.x.toFixed(0)}, {kf.y.toFixed(0)})</span>
                          <button
                            className="text-white/20 hover:text-red-400"
                            onClick={() => {
                              const updated = selectedElement.keyframes!.filter((_, idx) => idx !== i);
                              updateElement(selectedElement.id, { keyframes: updated });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedElement.type === 'magnifier' && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <Label className="text-[9px] text-white/40">Zoom Level</Label>
                      <Slider
                        value={[selectedElement.zoomLevel || 2]}
                        min={1.5} max={5} step={0.5}
                        onValueChange={([v]) => updateElement(selectedElement.id, { zoomLevel: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{selectedElement.zoomLevel || 2}x zoom</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {trackers.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Trackers ({trackers.length})</p>
                <div className="space-y-0.5">
                  {trackers.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-xs text-white/50 px-2 py-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>Tracker {i + 1}</span>
                      <span className="text-white/30 ml-auto">{t.positions.length} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
