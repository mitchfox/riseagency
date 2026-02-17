import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Save, Volume2, VolumeX, Plus, Trash2, Layers, Download, Scissors, Eye, EyeOff,
  Clock, Timer,
} from "lucide-react";
import { AnnotationProject, AnnotationElement, VideoSegment } from "./AnnotationProjects";
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
  const [showLayers, setShowLayers] = useState(true);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [cuttingSegment, setCuttingSegment] = useState(false);
  const [cutStart, setCutStart] = useState<number | null>(null);

  // Segments
  const [segments, setSegments] = useState<VideoSegment[]>(project.segments || []);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(
    project.segments?.[0]?.id || null
  );

  // Trackers
  const [trackers, setTrackers] = useState<TrackerState[]>([]);

  const activeSegment = segments.find(s => s.id === activeSegmentId);

  // Filter elements based on current time relative to segment
  const allElements = activeSegment?.elements || [];
  const segmentOffset = activeSegment ? currentTime - activeSegment.startTime : 0;
  const visibleElements = allElements.filter(el => {
    if (el.appearAt === undefined) return true;
    const start = el.appearAt;
    const end = el.duration !== undefined ? start + el.duration : Infinity;
    return segmentOffset >= start && segmentOffset < end;
  });

  const setElements = useCallback((updater: React.SetStateAction<AnnotationElement[]>) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== activeSegmentId) return s;
      const newElements = typeof updater === 'function' ? updater(s.elements) : updater;
      return { ...s, elements: newElements };
    }));
  }, [activeSegmentId]);

  const segmentColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

  // Video events
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

  // Segment management
  const addSegment = useCallback(() => {
    const id = crypto.randomUUID();
    const seg: VideoSegment = {
      id,
      name: `Segment ${segments.length + 1}`,
      startTime: currentTime,
      endTime: Math.min(currentTime + 10, duration),
      elements: [],
      color: segmentColors[segments.length % segmentColors.length],
    };
    setSegments(prev => [...prev, seg]);
    setActiveSegmentId(id);
    toast.success("Segment created");
  }, [currentTime, duration, segments.length]);

  // Quick cut: mark in/out points
  const handleCut = useCallback(() => {
    if (!cuttingSegment) {
      setCuttingSegment(true);
      setCutStart(currentTime);
      toast.info("Mark-in set. Scrub to end point and click Cut again.");
    } else {
      if (cutStart !== null) {
        const start = Math.min(cutStart, currentTime);
        const end = Math.max(cutStart, currentTime);
        if (end - start < 0.1) {
          toast.error("Segment too short");
        } else {
          const id = crypto.randomUUID();
          const seg: VideoSegment = {
            id,
            name: `Cut ${segments.length + 1}`,
            startTime: start,
            endTime: end,
            elements: [],
            color: segmentColors[segments.length % segmentColors.length],
          };
          setSegments(prev => [...prev, seg]);
          setActiveSegmentId(id);
          toast.success(`Segment cut: ${formatTime(start)} → ${formatTime(end)}`);
        }
      }
      setCuttingSegment(false);
      setCutStart(null);
    }
  }, [cuttingSegment, cutStart, currentTime, segments.length]);

  const deleteSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    if (activeSegmentId === id) {
      setActiveSegmentId(segments.find(s => s.id !== id)?.id || null);
    }
  }, [activeSegmentId, segments]);

  const updateSegmentTimes = useCallback((id: string, start: number, end: number) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, startTime: start, endTime: end } : s));
  }, []);

  // Save
  const handleSave = () => {
    onSave({ ...project, segments });
    toast.success("Project saved");
  };

  const handleDelete = useCallback(() => {
    if (selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, setElements]);

  // Update selected element timing
  const updateElementTiming = useCallback((id: string, updates: Partial<AnnotationElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, [setElements]);

  // Update tracker positions when video time changes
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft' && !e.shiftKey) { e.preventDefault(); stepFrame(-1); }
      if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); stepFrame(1); }
      if (e.key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); stepFrame(-10); }
      if (e.key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); stepFrame(10); }
      if (e.key === 'Escape') { setActiveTool('select'); setSelectedId(null); setLinkSource(null); setCuttingSegment(false); setCutStart(null); }
      if (e.key === 'v') setActiveTool('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, togglePlay, stepFrame]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const fr = Math.floor((s % 1) * 30);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={() => setShowLayers(!showLayers)}>
            <Layers className="w-3.5 h-3.5" /> {showLayers ? 'Hide' : 'Show'} Panel
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left tools */}
        <AnnotationToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas */}
          <div className="flex-1 relative bg-[#12151e] flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={project.videoUrl}
                className="max-w-full max-h-full"
                muted={muted}
                playsInline
                preload="auto"
                onClick={togglePlay}
              />
              {activeSegment && (
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
                  segmentOffset={segmentOffset}
                />
              )}
              {!activeSegment && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <p className="text-white/60 text-sm">Create a segment below to begin annotating</p>
                </div>
              )}
            </div>
            {linkSource && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/80 text-white text-xs px-3 py-1 rounded-full">
                Click second element to link
              </div>
            )}
            {cuttingSegment && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500/80 text-white text-xs px-3 py-1 rounded-full animate-pulse">
                Cutting: mark-in at {formatTime(cutStart || 0)} — scrub to end and click Cut again
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
                {duration > 0 && segments.map(seg => (
                  <div
                    key={seg.id}
                    className={`absolute top-full mt-0.5 h-1.5 rounded-full cursor-pointer transition-opacity ${
                      seg.id === activeSegmentId ? 'opacity-100' : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      left: `${(seg.startTime / duration) * 100}%`,
                      width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
                      backgroundColor: seg.color,
                    }}
                    onClick={() => { setActiveSegmentId(seg.id); seek(seg.startTime); }}
                  />
                ))}
                {/* Cut region indicator */}
                {cuttingSegment && cutStart !== null && duration > 0 && (
                  <div
                    className="absolute top-full mt-0.5 h-1.5 rounded-full bg-red-500/40"
                    style={{
                      left: `${(Math.min(cutStart, currentTime) / duration) * 100}%`,
                      width: `${(Math.abs(currentTime - cutStart) / duration) * 100}%`,
                    }}
                  />
                )}
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

              <div className="mx-3 border-l border-white/10 h-5" />

              <Button
                variant="ghost"
                size="sm"
                className={`text-xs gap-1 h-6 px-2 ${cuttingSegment ? 'text-red-400 hover:text-red-300' : 'text-white/60 hover:text-white'}`}
                onClick={handleCut}
              >
                <Scissors className="w-3 h-3" /> {cuttingSegment ? 'Set End' : 'Cut'}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-white/60 hover:text-white gap-1 h-6 px-2" onClick={addSegment}>
                <Plus className="w-3 h-3" /> Segment
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        {showLayers && (
          <div className="w-56 bg-[#161a24] border-l border-white/10 shrink-0 flex flex-col overflow-hidden">
            {/* Segments */}
            <div className="p-3 border-b border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Segments</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {segments.length === 0 && (
                  <p className="text-xs text-white/30">No segments yet. Use Cut or + Segment below.</p>
                )}
                {segments.map(seg => (
                  <div
                    key={seg.id}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded cursor-pointer ${
                      seg.id === activeSegmentId ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    onClick={() => { setActiveSegmentId(seg.id); seek(seg.startTime); }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="truncate flex-1 text-white/70">{seg.name}</span>
                    <span className="text-white/30 text-[10px]">{formatTime(seg.startTime)}</span>
                    <button className="text-white/30 hover:text-red-400" onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Segment timing editor */}
              {activeSegment && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <Timer className="w-3 h-3" />
                    <span>Segment Range</span>
                  </div>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={activeSegment.startTime.toFixed(1)}
                      onChange={e => updateSegmentTimes(activeSegment.id, parseFloat(e.target.value) || 0, activeSegment.endTime)}
                      className="h-6 text-[10px] bg-white/5 border-white/10 text-white"
                    />
                    <span className="text-white/30 text-xs">→</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={activeSegment.endTime.toFixed(1)}
                      onChange={e => updateSegmentTimes(activeSegment.id, activeSegment.startTime, parseFloat(e.target.value) || 0)}
                      className="h-6 text-[10px] bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Elements / Layers */}
            <div className="p-3 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                Elements {activeSegment ? `(${allElements.length})` : ''}
              </p>
              {selectedId && (
                <Button variant="destructive" size="sm" className="w-full text-xs mb-2 h-7" onClick={handleDelete}>
                  Delete Selected
                </Button>
              )}
              <div className="space-y-0.5">
                {allElements.map((el) => {
                  const isVisible = visibleElements.includes(el);
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
                      </span>
                      {el.appearAt !== undefined && (
                        <span className="text-[9px] text-white/25">{el.appearAt.toFixed(1)}s</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Element timing controls */}
              {selectedElement && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>Element Timing</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-12">Appear</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={selectedElement.appearAt ?? ''}
                        placeholder="Start"
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          updateElementTiming(selectedElement.id, { appearAt: v });
                        }}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] text-white/40 w-12">Duration</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={selectedElement.duration ?? ''}
                        placeholder="∞"
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          updateElementTiming(selectedElement.id, { duration: v });
                        }}
                        className="h-6 text-[10px] bg-white/5 border-white/10 text-white flex-1"
                      />
                      <span className="text-[9px] text-white/30">s</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] text-white/40"
                      onClick={() => updateElementTiming(selectedElement.id, { appearAt: segmentOffset })}
                    >
                      Set appear to current time ({segmentOffset.toFixed(1)}s)
                    </Button>
                  </div>
                  {/* Magnifier zoom control */}
                  {selectedElement.type === 'magnifier' && (
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/40">Zoom Level</Label>
                      <Slider
                        value={[selectedElement.zoomLevel || 2]}
                        min={1.5}
                        max={5}
                        step={0.5}
                        onValueChange={([v]) => updateElementTiming(selectedElement.id, { zoomLevel: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{selectedElement.zoomLevel || 2}x zoom</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trackers */}
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
