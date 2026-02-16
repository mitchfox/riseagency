import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Save, Download, Layers, Volume2, VolumeX, Maximize2,
} from "lucide-react";
import { AnnotationProject, AnnotationElement, AnnotationLayer } from "./AnnotationProjects";
import { AnnotationCanvas } from "./AnnotationCanvas";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { toast } from "sonner";

interface AnnotationEditorProps {
  project: AnnotationProject;
  onSave: (project: AnnotationProject) => void;
  onBack: () => void;
}

export type AnnotationTool =
  | 'select' | 'line' | 'arrow' | 'curve' | 'rect' | 'circle'
  | 'spotlight' | 'text' | 'freehand' | 'player-marker' | 'eraser';

export const AnnotationEditor = ({ project, onSave, onBack }: AnnotationEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [elements, setElements] = useState<AnnotationElement[]>(project.annotations?.[0]?.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Sync video time
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

  const handleSave = () => {
    const updated: AnnotationProject = {
      ...project,
      annotations: [{ id: 'main', frameStart: 0, frameEnd: duration, elements }],
    };
    onSave(updated);
    toast.success("Project saved");
  };

  const handleDelete = useCallback(() => {
    if (selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepFrame(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepFrame(1); }
      if (e.key === 'Escape') { setActiveTool('select'); setSelectedId(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, togglePlay, stepFrame]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#1e2330] rounded-lg overflow-hidden text-white">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161a24] border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium truncate flex-1">{project.name}</span>
        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save
        </Button>
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
          {/* Canvas area */}
          <div className="flex-1 relative bg-[#12151e] flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={project.videoUrl}
                className="max-w-full max-h-full"
                muted={muted}
                playsInline
                preload="auto"
                onClick={togglePlay}
              />
              <AnnotationCanvas
                elements={elements}
                setElements={setElements}
                activeTool={activeTool}
                activeColor={activeColor}
                strokeWidth={strokeWidth}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                videoRef={videoRef}
              />
            </div>
          </div>

          {/* Transport controls */}
          <div className="bg-[#161a24] border-t border-white/10 px-4 py-2 shrink-0 space-y-2">
            {/* Timeline scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60 font-mono w-20">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 1}
                step={0.01}
                onValueChange={([v]) => seek(v)}
                className="flex-1 [&_[role=slider]]:bg-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
              <span className="text-xs text-white/60 font-mono w-20 text-right">{formatTime(duration)}</span>
            </div>

            {/* Playback buttons */}
            <div className="flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => seek(0)}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => stepFrame(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => stepFrame(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => seek(duration)}>
                <SkipForward className="w-4 h-4" />
              </Button>

              <div className="mx-4 border-l border-white/10 h-6" />

              <Button variant="ghost" size="sm" className="text-xs text-white/60 hover:text-white font-mono h-7 px-2" onClick={cycleSpeed}>
                x{playbackRate}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar - selection info */}
        <div className="w-40 bg-[#161a24] border-l border-white/10 p-3 shrink-0 hidden lg:block">
          <p className="text-xs text-white/40">
            {selectedId ? 'Element selected' : 'Nothing selected'}
          </p>
          {selectedId && (
            <div className="mt-3 space-y-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          )}
          <div className="mt-6">
            <p className="text-xs text-white/40 mb-1">Layers</p>
            <div className="space-y-1">
              {elements.map((el, i) => (
                <div
                  key={el.id}
                  className={`text-xs px-2 py-1 rounded cursor-pointer truncate ${
                    el.id === selectedId ? 'bg-primary/20 text-primary' : 'text-white/50 hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedId(el.id)}
                >
                  {el.type} {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
