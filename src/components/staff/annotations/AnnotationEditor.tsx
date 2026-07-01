import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Save, Volume2, VolumeX, Trash2, Layers, Clock, Timer,
  Lock, Pencil, X, Download, PenLine,
} from "lucide-react";
import { AnnotationProject, AnnotationElement, Klip, ElementKeyframe } from "./AnnotationProjects";
import { AnnotationCanvas } from "./AnnotationCanvas";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeVisibleElements, renderElementsToSVGString, waitForSeek } from "@/lib/annotationRenderUtils";

interface AnnotationEditorProps {
  project: AnnotationProject;
  onSave: (project: AnnotationProject) => void;
  onBack: () => void;
  /** When set, constrains video playback to this time range (clip-only mode) */
  clipConstraint?: { start: number; end: number };
  /** Auto-start playback once video is loaded */
  autoPlay?: boolean;
  /** Seek video to this time (seconds) once loaded */
  initialSeekTime?: number;
}

export type AnnotationTool =
  | 'select' | 'line' | 'arrow' | 'curved-arrow' | 'rect' | 'circle'
  | 'spotlight' | 'player-marker' | 'eraser'
  | 'vision-cone' | 'distance' | 'magnifier' | 'linked-line'
  | 'semi-circle' | 'point' | 'space-oval' | 'image-layer'
  | 'cylinder-spotlight' | 'text-banner' | 'ai-track';

// interpolateKeyframes moved to annotationRenderUtils.ts

export const AnnotationEditor = ({ project, onSave, onBack, clipConstraint, autoPlay, initialSeekTime }: AnnotationEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  // Persist last-used colour PER tool — so picking green for arrows doesn't
  // change the colour used for lines, and switching tools restores each
  // tool's last colour.
  const colourMapRef = useRef<Record<string, string>>((() => {
    try { return JSON.parse(localStorage.getItem('annotation-last-colour-by-tool') || '{}'); }
    catch { return {}; }
  })());
  const [activeColor, setActiveColor] = useState(() => {
    try {
      return colourMapRef.current['select']
        || colourMapRef.current['__last']
        || localStorage.getItem('annotation-last-colour')
        || '#C6A332';
    } catch { return '#C6A332'; }
  });
  const [strokeWidth, setStrokeWidth] = useState(() => {
    try { return parseFloat(localStorage.getItem('annotation-last-stroke') || '0.2') || 0.2; } catch { return 0.2; }
  });
  const [fillOpacity, setFillOpacity] = useState(0.15);

  // Persist colour and stroke changes — store per-tool AND keep a global
  // fallback so the most recent colour is also remembered.
  const handleSetActiveColor = useCallback((c: string) => {
    setActiveColor(c);
    try {
      colourMapRef.current[activeTool] = c;
      colourMapRef.current['__last'] = c;
      localStorage.setItem('annotation-last-colour-by-tool', JSON.stringify(colourMapRef.current));
      localStorage.setItem('annotation-last-colour', c);
    } catch {}
  }, [activeTool]);
  const handleSetStrokeWidth = useCallback((w: number) => {
    setStrokeWidth(w);
    try { localStorage.setItem('annotation-last-stroke', String(w)); } catch {}
  }, []);

  // When the active tool changes, restore that tool's last colour
  useEffect(() => {
    const stored = colourMapRef.current[activeTool];
    if (stored && stored !== activeColor) {
      setActiveColor(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);
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

  const [drawingMode, setDrawingMode] = useState(false);
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [drawingStartElements, setDrawingStartElements] = useState<AnnotationElement[]>([]);
  const [drawingTimestamp, setDrawingTimestamp] = useState(0);
  const [projectName, setProjectName] = useState(project.name);
  const [videoError, setVideoError] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [recentColours, setRecentColours] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('annotation-recent-colours') || '[]');
      return Array.from(new Set(Array.isArray(raw) ? raw : [])).slice(0, 8) as string[];
    } catch { return []; }
  });
  // Playback freeze state (separate from drawing mode freeze)
  const [playbackFreezeUrl, setPlaybackFreezeUrl] = useState<string | null>(null);
  const [playbackFreezeActive, setPlaybackFreezeActive] = useState(false);
  const [playbackFreezePhase, setPlaybackFreezePhase] = useState<'idle' | 'showing' | 'fading'>('idle');
  const triggeredTimesRef = useRef<Set<number>>(new Set());
  const playbackFreezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExportingRef = useRef(false);
  const playbackFreezeDurationRef = useRef(3);
  // Track which element IDs triggered the current freeze so we only show those
  const freezeElementIdsRef = useRef<Set<string>>(new Set());

  const activeKlip = klips.find(k => k.id === activeKlipId);
  const klipOffset = activeKlip ? currentTime - activeKlip.startTime : 0;
  // In drawing mode, use the frozen drawingTimestamp for visibility so the correct elements show
  const effectiveOffset = drawingMode && drawingTimestamp !== null ? drawingTimestamp - (activeKlip?.startTime ?? 0) : klipOffset;

  const allElements = activeKlip?.elements || [];

  const visibleElements = useMemo(() => {
    // Use the shared pure function
    const forceOpacity = drawingMode ? 1 : null;
    let computed = computeVisibleElements(allElements, effectiveOffset, { forceOpacity });

    // During playback freeze, only show the elements that triggered it
    if (playbackFreezeActive && freezeElementIdsRef.current.size > 0 && !drawingMode) {
      computed = computed.filter(el => freezeElementIdsRef.current.has(el.id));
    }

    // In drawing mode, ONLY show elements whose appearAt matches the drawing
    // timestamp — both quantised to the same frame so there's no drift.
    if (drawingMode) {
      const FRAME = 1 / 30;
      const drawOffset = drawingTimestamp - (activeKlip?.startTime ?? 0);
      const drawFrame = Math.round(drawOffset / FRAME);
      computed = computed.filter(el => {
        // Always show image layers — they must mask annotations at all times
        if (el.type === 'image-layer') return true;
        // Show only elements that share the SAME frame as the draw timestamp
        return Math.round(el.appearAt / FRAME) === drawFrame;
      });
    }

    // Map computed elements back to the shape AnnotationCanvas expects
    return computed.map(el => ({
      ...el,
      x: el.computedX,
      y: el.computedY,
      opacity: el.computedOpacity,
    }));
  }, [allElements, effectiveOffset, playbackFreezeActive, drawingMode, selectedId, drawingTimestamp, activeKlip]);

  const hasVisibleAnnotations = visibleElements.length > 0 && !drawingMode;

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

  // Use requestAnimationFrame for smoother time tracking during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let rafId: number;
    let prevTime = 0;
    const updateTime = () => {
      const t = video.currentTime;
      // Detect loop reset: time jumped backwards significantly — clear triggered annotations
      if (prevTime > 0 && t < prevTime - 0.5) {
        triggeredTimesRef.current.clear();
        freezeElementIdsRef.current.clear();
      }
      prevTime = t;
      setCurrentTime(t);
      // Enforce clip constraint end boundary during playback
      if (clipConstraint && t >= clipConstraint.end) {
        video.pause();
        video.currentTime = clipConstraint.end;
        setIsPlaying(false);
      }
      if (!video.paused) rafId = requestAnimationFrame(updateTime);
    };
    const onPlay = () => { rafId = requestAnimationFrame(updateTime); };
    const onPause = () => { cancelAnimationFrame(rafId); setCurrentTime(video.currentTime); };
    const onLoaded = () => setDuration(clipConstraint ? clipConstraint.end - clipConstraint.start : video.duration);
    const onEnded = () => { setIsPlaying(false); cancelAnimationFrame(rafId); };
    const onTime = () => setCurrentTime(video.currentTime);
    // Detect loop via 'seeking' event when the video loops natively
    const onSeeking = () => {
      if (video.loop && prevTime > 1 && video.currentTime < 0.5) {
        triggeredTimesRef.current.clear();
        freezeElementIdsRef.current.clear();
      }
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeking', onSeeking);
    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeking', onSeeking);
    };
  }, []);

  // Seek to initialSeekTime when video is ready
  useEffect(() => {
    if (initialSeekTime == null || initialSeekTime <= 0) return;
    const video = videoRef.current;
    if (!video) return;
    const doSeek = () => {
      if (video.readyState >= 1) {
        video.currentTime = initialSeekTime;
        video.pause();
      }
    };
    if (video.readyState >= 1) {
      doSeek();
    } else {
      video.addEventListener('loadedmetadata', doSeek, { once: true });
      return () => video.removeEventListener('loadedmetadata', doSeek);
    }
  }, [initialSeekTime]);

  useEffect(() => {
    if (isExportingRef.current) return;
    if (drawingMode || !activeKlip || playbackFreezeActive) return;
    const video = videoRef.current;
    if (!video || video.paused) return;

    // Check if any annotations just became visible that we haven't triggered yet
    const newVisible = visibleElements.filter(el => {
      const roundedTime = Math.round(el.appearAt * 1000) / 1000;
      return !triggeredTimesRef.current.has(roundedTime);
    });

    if (newVisible.length === 0) return;

    // Each distinct timestamp (>= 0.1s apart) gets its OWN freeze frame.
    // Use a sub-0.1s tolerance so even a 0.1s gap produces separate freezes,
    // while annotations created at the same instant still group together.
    const TIMESTAMP_GROUP_TOLERANCE = 0.05;
    const earliestNewAppearAt = Math.min(...newVisible.map(el => el.appearAt));

    // Group ONLY the newly-triggered annotations that share this trigger moment.
    // Earlier annotations whose duration window still overlaps must NOT bleed in,
    // and later annotations must NOT be silently consumed (which previously caused
    // a 0.5s-apart pair to render together on the second timestamp).
    const groupElements = newVisible.filter(el =>
      Math.abs(el.appearAt - earliestNewAppearAt) < TIMESTAMP_GROUP_TOLERANCE
    );

    // Mark ONLY the elements actually being shown in this freeze as triggered.
    // Anything outside the tolerance window stays untriggered so it gets its own
    // freeze frame when the playhead reaches it.
    groupElements.forEach(el => {
      const roundedTime = Math.round(el.appearAt * 1000) / 1000;
      triggeredTimesRef.current.add(roundedTime);
    });
    const freezeIds = new Set<string>(groupElements.map(el => el.id));
    freezeElementIdsRef.current = freezeIds;

    // Calculate the longest remaining duration among the grouped annotations
    const maxDuration = Math.max(
      ...groupElements.map(el => {
        const elDuration = el.duration ?? 3;
        const elapsed = effectiveOffset - el.appearAt;
        return Math.max(elDuration - elapsed, 0.5);
      })
    );
    playbackFreezeDurationRef.current = maxDuration;

    // Capture freeze frame - ensure video dimensions are valid
    let frameUrl: string | null = null;
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, vw, vh);
          frameUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    } catch {
      // CORS or other issue - proceed without freeze frame image
    }

    // Pause video and activate freeze (timer is handled by Effect B)
    video.pause();
    setIsPlaying(false);
    setPlaybackFreezeUrl(frameUrl);
    setPlaybackFreezeActive(true);
    setPlaybackFreezePhase('showing');
  }, [currentTime, drawingMode, activeKlip, playbackFreezeActive, visibleElements, effectiveOffset]);

  // Effect B: Resume timer — two-stage: showing → fading → idle
  useEffect(() => {
    if (isExportingRef.current) return;
    if (!playbackFreezeActive) return;

    const timer = setTimeout(() => {
      // Stage 1: start fading out
      setPlaybackFreezePhase('fading');

      // Stage 2: after fade-out completes, clear everything and resume
      const fadeTimer = setTimeout(() => {
        setPlaybackFreezeUrl(null);
        setPlaybackFreezeActive(false);
        setPlaybackFreezePhase('idle');
        const v = videoRef.current;
        if (v && v.currentTime < (v.duration || 0)) {
          v.play();
          setIsPlaying(true);
        }
      }, 400);

      playbackFreezeTimerRef.current = fadeTimer;
    }, playbackFreezeDurationRef.current * 1000);

    return () => {
      clearTimeout(timer);
      if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
    };
  }, [playbackFreezeActive]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // Clear playback freeze if manually resuming
      if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
      setPlaybackFreezeUrl(null);
      setPlaybackFreezeActive(false);
      setPlaybackFreezePhase('idle');
      // Resume from current position. Never silently restart from 0 — only
      // the SkipBack control should rewind. If the video is already at the
      // very end, nudge it back a hair so play() doesn't auto-rewind.
      const dur = video.duration || 0;
      if (dur > 0 && video.currentTime >= dur - 0.05) {
        video.currentTime = Math.max(0, dur - 0.05);
      }
      const resumeAt = video.currentTime;
      video.play().then(() => {
        // Some browsers reset currentTime when starting playback on a
        // looped/ended clip. Force it back if that happens.
        if (Math.abs(video.currentTime - resumeAt) > 0.25) {
          video.currentTime = resumeAt;
        }
      }).catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    // Clamp to clip constraint if set
    const clampedTime = clipConstraint
      ? Math.max(clipConstraint.start, Math.min(clipConstraint.end, time))
      : time;
    // Clear any active playback freeze on manual seek
    if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
    setPlaybackFreezeUrl(null);
    setPlaybackFreezeActive(false);
    setPlaybackFreezePhase('idle');
    triggeredTimesRef.current.clear();
    freezeElementIdsRef.current.clear();
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [clipConstraint]);

  const stepFrame = useCallback((dir: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const minT = clipConstraint?.start ?? 0;
    const maxT = clipConstraint?.end ?? video.duration;
    video.currentTime = Math.max(minT, Math.min(maxT, video.currentTime + dir * (1 / 30)));
  }, [clipConstraint]);

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
    onSave({ ...project, name: projectName, klips });
    toast.success("Project saved");
  };

  const drawSvgOverlay = useCallback(async (
    ctx: CanvasRenderingContext2D,
    elements: ReturnType<typeof computeVisibleElements>,
    vw: number,
    vh: number,
    video?: HTMLVideoElement | null,
  ) => {
    if (elements.length === 0) return;

    // Separate image-layer elements — these need direct canvas drawing, not SVG
    const imageLayers = elements.filter(el => el.type === 'image-layer');
    const otherElements = elements.filter(el => el.type !== 'image-layer');

    // 1) Draw non-image-layer annotations via SVG
    if (otherElements.length > 0) {
      const svgString = renderElementsToSVGString(otherElements, vw, vh);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, vw, vh); URL.revokeObjectURL(svgUrl); resolve(); };
        img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve(); };
        img.src = svgUrl;
      });
    }

    // 2) Draw image layers on top by re-stamping the video frame in those regions
    if (video && imageLayers.length > 0) {
      for (const il of imageLayers) {
        const sx = (il.computedX / 100) * vw;
        const sy = (il.computedY / 100) * vh;
        const sw = ((il.width || 10) / 100) * vw;
        const sh = ((il.height || 10) / 100) * vh;
        // Re-draw the video frame into this region, overwriting any annotations
        ctx.drawImage(video, sx, sy, sw, sh, sx, sy, sw, sh);
      }
    }
  }, []);

  const exportClip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !activeKlip) {
      toast.error("No clip to export");
      return;
    }

    isExportingRef.current = true;
    try {
      const wasPlaying = !video.paused;
      const savedTime = video.currentTime;
      const savedRate = video.playbackRate;
      video.pause();
      setIsPlaying(false);

      // Ensure metadata is loaded before reading dimensions
      if (video.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const onMeta = () => { video.removeEventListener('loadedmetadata', onMeta); clearTimeout(t); resolve(); };
          const t = setTimeout(() => { video.removeEventListener('loadedmetadata', onMeta); reject(new Error('Metadata timeout')); }, 5000);
          video.addEventListener('loadedmetadata', onMeta);
        });
      }

      if (!video.videoWidth || !video.videoHeight) {
        toast.error("Cannot read video dimensions — export aborted");
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d')!;

      const klipStart = activeKlip.startTime;
      const klipEnd = activeKlip.endTime;
      const klipDuration = klipEnd - klipStart;

      const stream = canvas.captureStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
        videoBitsPerSecond: 8_000_000,
      });
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const recordingDone = new Promise<Blob>(resolve => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      // Seek to start position once
      await waitForSeek(video, klipStart);

      toast.info("Exporting clip at real-time speed...", { id: 'export-progress' });
      mediaRecorder.start();

      const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

      if (supportsRVFC) {
        // ── Fast path: playback-driven capture ──
        video.playbackRate = 1;
        let lastProgressBucket = -1;

        await new Promise<void>((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            video.pause();
            video.removeEventListener('ended', onEnded);
            resolve();
          };

          const onEnded = () => finish();
          video.addEventListener('ended', onEnded);

          const handleFrame = async (_now: number, metadata: { mediaTime: number }) => {
            const mediaTime = metadata.mediaTime;

            if (mediaTime >= klipEnd || resolved) {
              finish();
              return;
            }

            // Draw video frame
            ctx.drawImage(video, 0, 0, vw, vh);

            // Compute and draw annotations synchronously
            const offset = mediaTime - klipStart;
            const computed = computeVisibleElements(allElements, offset);
            if (computed.length > 0) {
              await drawSvgOverlay(ctx, computed, vw, vh, video);
            }

            // Progress reporting at ~10% intervals
            const progressBucket = Math.floor(((mediaTime - klipStart) / klipDuration) * 10);
            if (progressBucket > lastProgressBucket) {
              lastProgressBucket = progressBucket;
              toast.info(`Exporting... ${progressBucket * 10}%`, { id: 'export-progress' });
            }

            if (!resolved) {
              (video as any).requestVideoFrameCallback(handleFrame);
            }
          };

          (video as any).requestVideoFrameCallback(handleFrame);
          video.play();
        });
      } else {
        // ── Fallback: seek-per-frame (slower but universal) ──
        const fps = 30;
        const totalFrames = Math.ceil(klipDuration * fps);

        for (let i = 0; i < totalFrames; i++) {
          const time = klipStart + (i / fps);
          const offset = i / fps;

          await waitForSeek(video, time);
          ctx.drawImage(video, 0, 0, vw, vh);

          const computed = computeVisibleElements(allElements, offset);
          await drawSvgOverlay(ctx, computed, vw, vh, video);

          await new Promise(r => setTimeout(r, 50));

          if (i % 30 === 0) {
            toast.info(`Exporting... ${Math.round((i / totalFrames) * 100)}%`, { id: 'export-progress' });
          }
        }
      }

      mediaRecorder.stop();
      const blob = await recordingDone;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      video.playbackRate = savedRate;
      video.currentTime = savedTime;
      if (wasPlaying) video.play();

      toast.success("Clip exported with annotations", { id: 'export-progress' });
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Export failed — try again");
    } finally {
      isExportingRef.current = false;
    }
  }, [activeKlip, projectName, allElements, drawSvgOverlay]);

  const startDrawing = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    // Save current elements so we can revert on cancel
    setDrawingStartElements(activeKlip?.elements || []);

    // Clear any leftover freeze/triggered state so the previous annotation
    // doesn't bleed into the new draw timestamp.
    if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
    setPlaybackFreezeUrl(null);
    setPlaybackFreezeActive(false);
    setPlaybackFreezePhase('idle');
    triggeredTimesRef.current.clear();
    freezeElementIdsRef.current.clear();

    // Capture the exact frame currently displayed — use requestVideoFrameCallback if available
    const captureFrame = () => {
      const exactTime = video.currentTime;
      setDrawingTimestamp(exactTime);
      // Clear selection so a freshly-drawn annotation is the only one in focus.
      setSelectedId(null);
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
    };

    // Use requestVideoFrameCallback for frame-accurate capture when available
    if ('requestVideoFrameCallback' in video) {
      (video as any).requestVideoFrameCallback((_now: number, metadata: any) => {
        if (metadata?.mediaTime != null) {
          (video as HTMLVideoElement).currentTime = metadata.mediaTime;
        }
        captureFrame();
      });
      video.currentTime = video.currentTime;
    } else {
      const v = video as HTMLVideoElement;
      if (v.readyState >= 2) {
        requestAnimationFrame(() => captureFrame());
      } else {
        const onSeeked = () => {
          v.removeEventListener('seeked', onSeeked);
          requestAnimationFrame(() => captureFrame());
        };
        v.addEventListener('seeked', onSeeked);
        v.currentTime = v.currentTime;
      }
    }
  }, [activeKlip]);

  const saveDrawing = useCallback(() => {
    setDrawingMode(false);
    setFreezeFrameUrl(null);
    setActiveTool('select');
    // Preserve selection of the just-drawn annotation. The canvas set
    // `selectedId` to the new element on placement, so we leave it alone here.
    // Clear all freeze/trigger state so newly drawn annotations are evaluated
    // against the resumed timeline as if from scratch — without this, the
    // previous annotation's freeze IDs bleed onto the next playback frame and
    // either prevent the new one from showing or show stale ones at the wrong
    // timestamp.
    if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
    setPlaybackFreezeUrl(null);
    setPlaybackFreezeActive(false);
    setPlaybackFreezePhase('idle');
    triggeredTimesRef.current.clear();
    freezeElementIdsRef.current.clear();
    // Elements are already in the klip — just close drawing mode
    handleSave();
    toast.success("Annotation saved");
    // Rewind 1.5 seconds before the just-drawn annotation timestamp so the
    // user sees it appear naturally on resume rather than immediately after
    // the freeze frame closes.
    const video = videoRef.current;
    if (video) {
      const target = Math.max(activeKlip?.startTime ?? 0, drawingTimestamp - 1.5);
      video.currentTime = target;
      if (video.currentTime < (video.duration || 0)) {
        video.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [handleSave, activeKlip, drawingTimestamp]);

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

  // After placing an annotation, switch to select. The canvas itself already
  // calls setSelectedId(id) with the freshly created element id — do NOT
  // override that here. Reading `klips` from this closure can be stale and
  // would re-select a previously-added element.
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

  // ── AI player tracker ────────────────────────────────────────────────────
  // When the user picks the 'ai-track' tool and clicks on a player in the
  // current frame, we capture frames across the active klip, send them to
  // the ai-track-player edge function, and apply the returned positions as
  // keyframes on a newly-created player marker.
  const [aiTracking, setAiTracking] = useState(false);
  const handleAiTrack = useCallback(async (xPct: number, yPct: number) => {
    const video = videoRef.current;
    if (!video || !activeKlip) {
      toast.error('No active clip to track within');
      return;
    }
    if (aiTracking) return;
    setAiTracking(true);
    const wasPaused = video.paused;
    video.pause();
    const originalTime = video.currentTime;

    try {
      // Sample one frame every 0.5s across the active klip — keep it light to
      // stay within model context limits.
      const sampleInterval = 0.5;
      const startT = activeKlip.startTime;
      const endT = activeKlip.endTime;
      const times: number[] = [];
      for (let t = startT; t <= endT + 0.001; t += sampleInterval) {
        times.push(Math.min(t, endT));
      }
      if (times.length > 30) {
        // Cap at 30 frames to keep request size manageable
        const stride = times.length / 30;
        const trimmed: number[] = [];
        for (let i = 0; i < 30; i++) trimmed.push(times[Math.floor(i * stride)]);
        times.length = 0;
        times.push(...trimmed);
      }

      // Render each frame to a 480-wide JPEG data URL
      const canvas = document.createElement('canvas');
      const targetW = 480;
      const aspect = (video.videoHeight || 9) / (video.videoWidth || 16);
      canvas.width = targetW;
      canvas.height = Math.round(targetW * aspect);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const frames: { time: number; dataUrl: string }[] = [];
      toast.loading(`Capturing ${times.length} frames…`, { id: 'ai-track' });
      for (const t of times) {
        await new Promise<void>((resolve) => {
          const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
          video.addEventListener('seeked', onSeeked, { once: true });
          video.currentTime = t;
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({ time: t - startT, dataUrl: canvas.toDataURL('image/jpeg', 0.7) });
      }

      toast.loading('Tracking player…', { id: 'ai-track' });
      const { data, error } = await supabase.functions.invoke('ai-track-player', {
        body: { frames, initialClick: { x: xPct, y: yPct } },
      });
      if (error) throw error;
      if (!data?.positions?.length) throw new Error('No positions returned');

      // Build a player-marker with keyframes (time = seconds into the klip)
      const positions = data.positions as { time: number; x: number; y: number; confidence: number }[];
      const newId = crypto.randomUUID();
      const first = positions[0];
      const newMarker: AnnotationElement = {
        id: newId,
        type: 'player-marker',
        x: first.x,
        y: first.y,
        color: activeColor,
        strokeWidth,
        radius: 1.8,
        number: 0,
        appearAt: 0,
        animateIn: 0.2,
        duration: activeKlip.endTime - activeKlip.startTime,
        keyframes: positions.map(p => ({ time: p.time, x: p.x, y: p.y })),
        isTrackingEvent: true,
      };
      setElements(prev => [...prev, newMarker]);
      setSelectedId(newId);
      setActiveTool('select');
      toast.success(`Tracked across ${positions.length} frames`, { id: 'ai-track' });
    } catch (err: any) {
      console.error('AI track failed:', err);
      toast.error(err?.message || 'AI tracker failed', { id: 'ai-track' });
    } finally {
      video.currentTime = originalTime;
      if (!wasPaused) video.play().catch(() => {});
      setAiTracking(false);
    }
  }, [activeKlip, aiTracking, activeColor, strokeWidth, setElements]);


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
      if (e.key === 'k' && e.ctrlKey) { e.preventDefault(); addKeyframe(); }
      // Tool hotkeys (only when not holding modifiers except ctrl for select)
      if (!e.altKey && !e.metaKey && !e.shiftKey) {
        if (e.key === 'Control') { setActiveTool('select'); return; }
        if (e.key === '1') setActiveTool('line');
        if (e.key === '2') setActiveTool('arrow');
        if (e.key === '3') setActiveTool('curved-arrow');
        if (e.key === 'l') setActiveTool('linked-line');
        if (e.key === 'c') setActiveTool('circle');
        if (e.key === 'd') setActiveTool('semi-circle');
        if (e.key === 's') setActiveTool('space-oval');
        if (e.key === 'p') setActiveTool('point');
        if (e.key === 'h') setActiveTool('spotlight');
        if (e.key === 'r') setActiveTool('distance');
        if (e.key === 'm') setActiveTool('magnifier');
        if (e.key === 'v') setActiveTool('vision-cone');
        if (e.key === 'b') setActiveTool('image-layer');
        if (e.key === 'e') setActiveTool('eraser');
        if (e.key === 'a') setActiveTool('ai-track');
      }
      // Stop propagation to prevent staff hotkeys from firing
      e.stopPropagation();
    };
    // Use capture phase so annotation shortcuts fire before staff-level handlers
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [handleDeleteElement, togglePlay, stepFrame, addKeyframe]);

  // Autoplay once video is loaded
  useEffect(() => {
    if (!autoPlay) return;
    const video = videoRef.current;
    if (!video) return;
    const onCanPlay = () => {
      video.removeEventListener('canplay', onCanPlay);
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    };
    if (video.readyState >= 3) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.addEventListener('canplay', onCanPlay);
    }
    return () => video.removeEventListener('canplay', onCanPlay);
  }, [autoPlay]);

  // Scroll-wheel zoom on the video container
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const pctX = ((e.clientX - rect.left) / rect.width) * 100;
      const pctY = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomLevel(prev => {
        const next = Math.min(10, Math.max(1, prev - e.deltaY * 0.002));
        if (next === 1) setZoomOrigin({ x: 50, y: 50 });
        else setZoomOrigin({ x: pctX, y: pctY });
        return next;
      });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const fr = Math.floor((s % 1) * 30);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(fr).padStart(2, '0')}`;
  };

  const selectedElement = allElements.find(el => el.id === selectedId);

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-[#1e2330] rounded-lg overflow-hidden text-white">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#161a24] border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {isRenaming ? (
          <Input
            autoFocus
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onBlur={() => setIsRenaming(false)}
            onKeyDown={e => { if (e.key === 'Enter') setIsRenaming(false); }}
            spellCheck={false}
            lang="en-GB"
            className="h-7 text-sm font-medium bg-white/5 border-white/10 text-white max-w-[200px]"
          />
        ) : (
          <span
            className="text-sm font-medium truncate flex-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsRenaming(true)}
            title="Click to rename"
          >
            {projectName}
          </span>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1 text-xs" onClick={() => setIsRenaming(true)} title="Rename">
            <PenLine className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1 text-xs" onClick={exportClip} title="Export clip">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={() => setShowPanel(!showPanel)}>
            <Layers className="w-3.5 h-3.5" /> {showPanel ? 'Hide' : 'Show'} Panel
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1.5 text-xs" onClick={handleSave}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex flex-1 min-h-0">
        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas — sizes to fit, leaving room below for toolbar to fill */}
          <div ref={videoContainerRef} className="relative bg-[#12151e] flex items-center justify-center overflow-hidden min-h-0 flex-1">
            <div className="relative max-w-full max-h-full" style={{
              aspectRatio: '16 / 9',
              width: '100%',
              height: 'auto',
              maxWidth: '100%',
              transform: `scale(${zoomLevel})`,
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
              transition: 'transform 0.1s ease-out',
            }}>
              <video
                ref={videoRef}
                src={clipConstraint ? `${project.videoUrl}#t=${clipConstraint.start},${clipConstraint.end}` : project.videoUrl}
                crossOrigin="anonymous"
                className={`w-full h-full object-fill block ${drawingMode ? 'invisible' : ''}`}
                muted={muted}
                playsInline
                preload="auto"
                loop
                onClick={drawingMode ? undefined : togglePlay}
                onError={() => {
                  if (project.videoUrl.startsWith('blob:')) {
                    setVideoError(true);
                    toast.error("Video file expired. Please re-upload.", { id: 'video-error', duration: 10000 });
                  }
                }}
              />
              {/* Play/pause overlay — shows when paused and not in drawing mode */}
              {!isPlaying && !drawingMode && !videoError && !playbackFreezeActive && (
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center z-30 cursor-pointer bg-black/20 hover:bg-black/30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  aria-label="Play"
                >
                  <div className="w-20 h-20 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                </button>
              )}
              {/* Re-upload overlay when video expired */}
              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 gap-3">
                  <p className="text-white/70 text-sm">Video file expired. Please re-upload to save it permanently.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white/30"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/*';
                      input.onchange = async (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        toast.loading('Uploading video...', { id: 'video-upload' });
                        const ext = file.name.split('.').pop() || 'mp4';
                        const storagePath = `${project.id}.${ext}`;
                        const { error } = await supabase.storage
                          .from('annotation-videos')
                          .upload(storagePath, file, { upsert: true });
                        if (error) {
                          toast.error('Upload failed: ' + error.message, { id: 'video-upload' });
                          return;
                        }
                        const { data: urlData } = supabase.storage
                          .from('annotation-videos')
                          .getPublicUrl(storagePath);
                        onSave({ ...project, name: projectName, videoUrl: urlData.publicUrl, videoName: file.name, klips });
                        setVideoError(false);
                        if (videoRef.current) videoRef.current.src = urlData.publicUrl;
                        toast.success('Video uploaded successfully', { id: 'video-upload' });
                      };
                      input.click();
                    }}
                  >
                    Re-upload Video
                  </Button>
                </div>
              )}
              {/* Drawing mode freeze frame */}
              {drawingMode && freezeFrameUrl && (
                <img
                  src={freezeFrameUrl}
                  className="absolute inset-0 w-full h-full object-fill"
                  alt="Freeze frame"
                  style={{ zIndex: 10 }}
                />
              )}
              {/* Playback freeze frame - shows captured frame during annotation display */}
              {playbackFreezeActive && playbackFreezeUrl && (
                <img
                  src={playbackFreezeUrl}
                  className="absolute inset-0 w-full h-full object-fill"
                  alt="Playback freeze frame"
                  style={{ zIndex: 10 }}
                />
              )}
              {activeKlip && (drawingMode || (visibleElements.length > 0 && playbackFreezeActive)) && (
                <div
                  className="absolute inset-0"
                  style={{
                    zIndex: 20,
                    pointerEvents: drawingMode ? 'auto' : 'none',
                    opacity: playbackFreezePhase === 'fading' ? 0 : 1,
                    transition: playbackFreezePhase === 'fading' ? 'opacity 0.4s ease-out' : 'none',
                  }}
                >
                  <AnnotationCanvas
                    elements={visibleElements}
                    setElements={setElements}
                    activeTool={drawingMode ? activeTool : 'select'}
                    activeColor={activeColor}
                    strokeWidth={strokeWidth}
                    fillOpacity={fillOpacity}
                    selectedId={drawingMode ? selectedId : null}
                    setSelectedId={drawingMode ? setSelectedId : () => {}}
                    videoRef={videoRef}
                    linkSource={linkSource}
                    setLinkSource={setLinkSource}
                    klipOffset={klipOffset}
                    // In drawing mode we want new elements' appearAt to be quantised
                    // to the frozen drawingTimestamp — not to a slightly-later
                    // wall-clock currentTime — so the annotation is guaranteed to
                    // be visible on the exact frame the user drew on.
                    onToolUsed={handleToolUsed}
                    isDrawingMode={drawingMode}
                    onAiTrack={handleAiTrack}
                  />
                </div>
              )}
            </div>
            {drawingMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 z-30">
                <Pencil className="w-3 h-3" /> Drawing Mode — use tools on the left
              </div>
            )}
            {linkSource && !drawingMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/80 text-white text-xs px-3 py-1 rounded-full">
                Click second element to link
              </div>
            )}
            {hasVisibleAnnotations && !drawingMode && (
              <div className="absolute top-2 right-2 bg-amber-500/80 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3" /> Annotation visible
              </div>
            )}
            {activeTool === 'ai-track' && !aiTracking && drawingMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-xs px-3 py-1 rounded-full">
                Click the player to AI-track them across the clip
              </div>
            )}
            {aiTracking && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
                <div className="bg-[#1a1f2e] border border-white/10 rounded-lg px-5 py-4 flex items-center gap-3">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-white/90">Tracking player with AI…</span>
                </div>
              </div>
            )}
          </div>

          {/* Transport controls */}
          <div className="bg-[#161a24] border-t border-white/10 px-4 py-2 shrink-0 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60 font-mono w-24">
                {clipConstraint ? formatTime(currentTime - clipConstraint.start) : formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[currentTime]}
                  min={clipConstraint?.start ?? 0}
                  max={clipConstraint?.end ?? (duration || 1)}
                  step={0.01}
                  onValueChange={([v]) => { if (!drawingMode) seek(v); }}
                  className={`[&_[role=slider]]:bg-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 ${drawingMode ? 'opacity-50 pointer-events-none' : ''}`}
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
                      onClick={() => {
                        if (activeKlip) {
                          const seekTime = activeKlip.startTime + el.appearAt;
                          const video = videoRef.current;
                          if (video) {
                            if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
                            setPlaybackFreezeActive(false);
                            setPlaybackFreezePhase('idle');
                            triggeredTimesRef.current.clear();
                            video.pause();
                            setIsPlaying(false);
                            setDrawingTimestamp(seekTime);
                            setCurrentTime(seekTime);
                            setDrawingStartElements(activeKlip.elements || []);
                            const onSeeked = () => {
                              video.removeEventListener('seeked', onSeeked);
                              try {
                                const canvas = document.createElement('canvas');
                                const vw = video.videoWidth;
                                const vh = video.videoHeight;
                                if (vw > 0 && vh > 0) {
                                  canvas.width = vw;
                                  canvas.height = vh;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(video, 0, 0);
                                    setFreezeFrameUrl(canvas.toDataURL('image/jpeg', 0.85));
                                  }
                                } else {
                                  setFreezeFrameUrl(null);
                                }
                              } catch {
                                setFreezeFrameUrl(null);
                              }
                              setDrawingMode(true);
                              setActiveTool('select');
                              setSelectedId(el.id);
                            };
                            video.addEventListener('seeked', onSeeked);
                            video.currentTime = seekTime;
                          }
                        }
                      }}
                      title={`${el.type} at ${el.appearAt.toFixed(1)}s`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-white/60 font-mono w-24 text-right">{formatTime(duration)}</span>
            </div>

            <div className={`flex items-center justify-center gap-1 pt-1 ${drawingMode ? 'opacity-40 pointer-events-none' : ''}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => seek(0)} disabled={drawingMode}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => stepFrame(-1)} disabled={drawingMode}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10" onClick={togglePlay} disabled={drawingMode}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => stepFrame(1)} disabled={drawingMode}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70" onClick={() => seek(duration)} disabled={drawingMode}>
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
                <div className="flex gap-1.5 mb-2">
                  <Button variant="destructive" size="sm" className="flex-1 text-xs h-7" onClick={handleDeleteElement}>
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-7 border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => {
                      const el = allElements.find(e => e.id === selectedId);
                      if (!el) return;
                      const newId = crypto.randomUUID();
                      const duplicate: AnnotationElement = {
                        ...el,
                        id: newId,
                        x: el.x + 3,
                        y: el.y + 3,
                        ...(el.x2 !== undefined ? { x2: (el.x2 ?? 0) + 3 } : {}),
                        ...(el.y2 !== undefined ? { y2: (el.y2 ?? 0) + 3 } : {}),
                      };
                      setElements(prev => [...prev, duplicate]);
                      setSelectedId(newId);
                      toast.success("Annotation duplicated");
                    }}
                  >
                    Duplicate
                  </Button>
                </div>
              )}
              <div className="space-y-0.5">
                {[...allElements].sort((a, b) => a.appearAt - b.appearAt).map((el) => {
                  const isVisible = visibleElements.some(v => v.id === el.id);
                  return (
                    <div
                      key={el.id}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded cursor-pointer ${
                        el.id === selectedId ? 'bg-primary/20 text-primary' : isVisible ? 'text-white/50 hover:bg-white/5' : 'text-white/20 hover:bg-white/5'
                      }`}
                      onClick={() => {
                        if (activeKlip) {
                          const seekTime = activeKlip.startTime + el.appearAt;
                          const video = videoRef.current;
                          if (video) {
                            // Clear any existing playback freeze
                            if (playbackFreezeTimerRef.current) clearTimeout(playbackFreezeTimerRef.current);
                            setPlaybackFreezeActive(false);
                            setPlaybackFreezePhase('idle');
                            triggeredTimesRef.current.clear();

                            video.pause();
                            setIsPlaying(false);
                            setDrawingTimestamp(seekTime);
                            setCurrentTime(seekTime);
                            setDrawingStartElements(activeKlip.elements || []);

                            // Wait for the video to actually seek before capturing the frame
                            const onSeeked = () => {
                              video.removeEventListener('seeked', onSeeked);
                              try {
                                const canvas = document.createElement('canvas');
                                const vw = video.videoWidth;
                                const vh = video.videoHeight;
                                if (vw > 0 && vh > 0) {
                                  canvas.width = vw;
                                  canvas.height = vh;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(video, 0, 0);
                                    setFreezeFrameUrl(canvas.toDataURL('image/jpeg', 0.85));
                                  }
                                } else {
                                  setFreezeFrameUrl(null);
                                }
                              } catch {
                                setFreezeFrameUrl(null);
                              }
                              setDrawingMode(true);
                              setActiveTool('select');
                              setSelectedId(el.id);
                            };
                            video.addEventListener('seeked', onSeeked);
                            video.currentTime = seekTime;
                          }
                        }
                      }}
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
                  {/* Colour — moved above Timing for faster access */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <span>Colour</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={e => {
                          const c = e.target.value;
                          updateElement(selectedElement.id, { color: c });
                          setRecentColours(prev => {
                            const updated = [c, ...prev.filter(x => x !== c)].slice(0, 8);
                            localStorage.setItem('annotation-recent-colours', JSON.stringify(updated));
                            return updated;
                          });
                        }}
                        className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                        title="Pick any colour"
                      />
                      <div
                        className="w-8 h-8 rounded border border-white/20"
                        style={{ backgroundColor: selectedElement.color }}
                      />
                      <span className="text-[9px] text-white/30 font-mono">{selectedElement.color}</span>
                    </div>
                    <div className="grid grid-cols-9 gap-1">
                      {[
                        { color: '#C6A332', label: 'Rise Gold' },
                        { color: '#dc2626', label: 'Red' },
                        { color: '#f97316', label: 'Orange' },
                        { color: '#facc15', label: 'Yellow' },
                        { color: '#22c55e', label: 'Green' },
                        { color: '#14532d', label: 'Dark Green' },
                        { color: '#ffffff', label: 'White' },
                        { color: '#000000', label: 'Black' },
                      ].map(({ color, label }) => (
                        <button
                          key={color}
                          title={label}
                          className={`aspect-square rounded-full border-2 transition-transform ${
                            selectedElement.color === color ? 'border-white scale-110' : 'border-white/10 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateElement(selectedElement.id, { color })}
                        />
                      ))}
                      <label className={`aspect-square rounded-full cursor-pointer border-2 transition-transform overflow-hidden ${
                        !['#C6A332', '#dc2626', '#f97316', '#facc15', '#22c55e', '#14532d', '#ffffff', '#000000'].includes(selectedElement.color)
                          ? 'border-white scale-110' : 'border-white/30 hover:scale-105'
                      }`} style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }}>
                        <input type="color" value={selectedElement.color} onChange={e => {
                          updateElement(selectedElement.id, { color: e.target.value });
                          setRecentColours(prev => {
                            const updated = Array.from(new Set([e.target.value, ...prev])).slice(0, 8);
                            localStorage.setItem('annotation-recent-colours', JSON.stringify(updated));
                            return updated;
                          });
                        }} className="sr-only" />
                      </label>
                    </div>
                    {(() => {
                      const brand = ['#C6A332', '#dc2626', '#f97316', '#facc15', '#22c55e', '#14532d', '#ffffff', '#000000'];
                      const uniqueRecents = Array.from(new Set(recentColours)).filter(c => !brand.includes(c));
                      if (uniqueRecents.length === 0) return null;
                      return (
                        <div>
                          <span className="text-[9px] text-white/25">Recent</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {uniqueRecents.slice(0, 8).map(c => (
                              <button
                                key={c}
                                className={`w-4 h-4 rounded-full border transition-transform ${
                                  selectedElement.color === c ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                                }`}
                                style={{ backgroundColor: c }}
                                onClick={() => updateElement(selectedElement.id, { color: c })}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Timing — moved below Colour */}
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>Timing</span>
                    </div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] text-white/40"
                      onClick={() => updateElement(selectedElement.id, { appearAt: klipOffset })}
                    >
                      Set appear to now ({klipOffset.toFixed(1)}s)
                    </Button>
                  </div>

                  {/* Size */}
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <span>Size</span>
                    </div>
                    {(selectedElement.type === 'circle' || selectedElement.type === 'spotlight') && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Width (rx)</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.width ?? selectedElement.radius ?? 2.5).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.width ?? selectedElement.radius ?? 2.5]}
                            min={0.5} max={30} step={0.5}
                            onValueChange={([v]) => updateElement(selectedElement.id, { width: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Height (ry)</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.height ?? selectedElement.radius ?? 2.5).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.height ?? selectedElement.radius ?? 2.5]}
                            min={0.5} max={30} step={0.5}
                            onValueChange={([v]) => updateElement(selectedElement.id, { height: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                      </>
                    )}
                    {(selectedElement.type === 'player-marker' || selectedElement.type === 'magnifier') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] text-white/40">Radius</Label>
                          <span className="text-[9px] text-white/30">{(selectedElement.radius ?? 2.5).toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[selectedElement.radius ?? 2.5]}
                          min={0.5} max={20} step={0.5}
                          onValueChange={([v]) => updateElement(selectedElement.id, { radius: v })}
                          className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                        />
                      </div>
                    )}
                    {(selectedElement.type === 'rect' || selectedElement.type === 'space-oval' || selectedElement.type === 'image-layer') && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Width</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.width ?? 10).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.width ?? 10]}
                            min={0.5} max={50} step={0.5}
                            onValueChange={([v]) => updateElement(selectedElement.id, { width: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Height</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.height ?? 10).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.height ?? 10]}
                            min={0.5} max={50} step={0.5}
                            onValueChange={([v]) => updateElement(selectedElement.id, { height: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                      </>
                    )}
                    {(selectedElement.type === 'text') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] text-white/40">Font Size</Label>
                          <span className="text-[9px] text-white/30">{(selectedElement.fontSize ?? 3).toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[selectedElement.fontSize ?? 3]}
                          min={1} max={20} step={0.5}
                          onValueChange={([v]) => updateElement(selectedElement.id, { fontSize: v })}
                          className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                        />
                      </div>
                    )}
                    {selectedElement.type === 'cylinder-spotlight' && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Beam Width</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.width ?? selectedElement.radius ?? 2.5).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.width ?? selectedElement.radius ?? 2.5]}
                            min={0.5} max={20} step={0.25}
                            onValueChange={([v]) => updateElement(selectedElement.id, { width: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Beam Height</Label>
                            <span className="text-[9px] text-white/30">{(selectedElement.height ?? 12).toFixed(1)}</span>
                          </div>
                          <Slider
                            value={[selectedElement.height ?? 12]}
                            min={2} max={60} step={1}
                            onValueChange={([v]) => updateElement(selectedElement.id, { height: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                        </div>
                      </>
                    )}
                    {selectedElement.type === 'text-banner' && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-white/40">Font Size</Label>
                            <span className="text-[9px] text-white/30">{Math.round((selectedElement.fontSize ?? 4.5) * 10.8)}px</span>
                          </div>
                          <Slider
                            value={[selectedElement.fontSize ?? 4.5]}
                            min={1} max={20} step={0.1}
                            onValueChange={([v]) => updateElement(selectedElement.id, { fontSize: v })}
                            className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                          />
                          <p className="text-[8px] text-white/25">Container stays the same size — only text scales.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] text-white/40 w-14">Font</Label>
                          <div className="flex gap-1 flex-1">
                            {(['tight', 'normal'] as const).map(f => (
                              <button
                                key={f}
                                className={`flex-1 text-[9px] py-1 rounded border ${
                                  ((selectedElement as any).fontStyle || 'tight') === f
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : 'border-white/10 text-white/40 hover:bg-white/5'
                                }`}
                                onClick={() => updateElement(selectedElement.id, { fontStyle: f } as any)}
                              >
                                {f === 'tight' ? 'Agrandir Tight' : 'Normal'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] text-white/40 w-14">Anchor</Label>
                          <div className="flex gap-1 flex-1">
                            {(['top', 'bottom'] as const).map(a => (
                              <button
                                key={a}
                                className={`flex-1 text-[9px] py-1 rounded border ${
                                  (selectedElement.anchor || 'bottom') === a
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : 'border-white/10 text-white/40 hover:bg-white/5'
                                }`}
                                onClick={() => updateElement(selectedElement.id, { anchor: a, y: a === 'top' ? 6 : 94 })}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] text-white/40 w-14">Text</Label>
                          <input
                            type="color"
                            value={selectedElement.color || '#ffffff'}
                            onChange={e => updateElement(selectedElement.id, { color: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            title="Text colour"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] text-white/40 w-14">Border</Label>
                          <input
                            type="color"
                            value={(selectedElement as any).borderColor || '#C6A332'}
                            onChange={e => updateElement(selectedElement.id, { borderColor: e.target.value } as any)}
                            className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            title="Border colour"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[9px] text-white/40 w-14">Background</Label>
                          <input
                            type="color"
                            value={(selectedElement as any).bgColor || '#000000'}
                            onChange={e => updateElement(selectedElement.id, { bgColor: e.target.value } as any)}
                            className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            title="Background colour"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[9px] text-white/40">Line Thickness</Label>
                        <span className="text-[9px] text-white/30">{selectedElement.strokeWidth.toFixed(1)}px</span>
                      </div>
                      <Slider
                        value={[selectedElement.strokeWidth]}
                        min={0.2} max={20} step={0.2}
                        onValueChange={([v]) => updateElement(selectedElement.id, { strokeWidth: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                    </div>
                  </div>

                  {/* Line Style (dash pattern) */}
                  {(['line', 'arrow', 'curved-arrow', 'linked-line'].includes(selectedElement.type)) && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-1 text-[10px] text-white/40">
                        <span>Line Style</span>
                      </div>
                      <div className="flex gap-1">
                        {([
                          { id: 'solid', label: '━━━' },
                          { id: 'dashed', label: '╌╌╌' },
                          { id: 'dotted', label: '···' },
                          { id: 'dash-dot', label: '╌·╌' },
                        ] as const).map(style => (
                          <button
                            key={style.id}
                            className={`flex-1 text-[9px] py-1 rounded border transition-colors ${
                              (selectedElement.dashPattern || 'solid') === style.id
                                ? 'bg-white/15 border-white/30 text-white'
                                : 'border-white/10 text-white/40 hover:bg-white/5'
                            }`}
                            onClick={() => updateElement(selectedElement.id, { dashPattern: style.id })}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Curved arrow: curve amount */}
                  {selectedElement.type === 'curved-arrow' && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <Label className="text-[9px] text-white/40">Curve Amount</Label>
                      <Slider
                        value={[selectedElement.curveOffset ?? -15]}
                        min={-40} max={40} step={1}
                        onValueChange={([v]) => updateElement(selectedElement.id, { curveOffset: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{selectedElement.curveOffset ?? -15}</span>
                    </div>
                  )}

                  {/* Semi-circle disc: width/height/rotation sliders */}
                  {selectedElement.type === 'semi-circle' && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <Label className="text-[9px] text-white/40">Disc Shape</Label>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] text-white/40">Width</Label>
                          <span className="text-[9px] text-white/30">{(selectedElement.width || selectedElement.radius || 4).toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[selectedElement.width || selectedElement.radius || 4]}
                          min={0.5} max={20} step={0.5}
                          onValueChange={([v]) => updateElement(selectedElement.id, { width: v })}
                          className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] text-white/40">Height</Label>
                          <span className="text-[9px] text-white/30">{(selectedElement.height || ((selectedElement.width || selectedElement.radius || 4) * 0.35)).toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[selectedElement.height || ((selectedElement.width || selectedElement.radius || 4) * 0.35)]}
                          min={0.5} max={10} step={0.5}
                          onValueChange={([v]) => updateElement(selectedElement.id, { height: v })}
                          className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[9px] text-white/40">Rotation</Label>
                          <span className="text-[9px] text-white/30">{selectedElement.angle ?? 0}°</span>
                        </div>
                        <Slider
                          value={[selectedElement.angle ?? 0]}
                          min={0} max={360} step={5}
                          onValueChange={([v]) => updateElement(selectedElement.id, { angle: v })}
                          className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                        />
                      </div>
                    </div>
                  )}

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
                        min={1} max={10} step={0.5}
                        onValueChange={([v]) => updateElement(selectedElement.id, { zoomLevel: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{selectedElement.zoomLevel || 2}x zoom</span>
                    </div>
                  )}

                  {(selectedElement.type === 'rect' || selectedElement.type === 'circle' || selectedElement.type === 'spotlight' || selectedElement.type === 'semi-circle' || selectedElement.type === 'vision-cone' || selectedElement.type === 'space-oval') && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <Label className="text-[9px] text-white/40">Fill Opacity</Label>
                      <Slider
                        value={[selectedElement.fillOpacity ?? 0.3]}
                        min={0} max={1} step={0.05}
                        onValueChange={([v]) => updateElement(selectedElement.id, { fillOpacity: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{Math.round((selectedElement.fillOpacity ?? 0.3) * 100)}%</span>
                    </div>
                  )}

                  {selectedElement.type === 'vision-cone' && (
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <Label className="text-[9px] text-white/40">Cone Spread</Label>
                      <Slider
                        value={[selectedElement.coneSpread ?? 40]}
                        min={10} max={180} step={5}
                        onValueChange={([v]) => updateElement(selectedElement.id, { coneSpread: v })}
                        className="[&_[role=slider]]:bg-white [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
                      />
                      <span className="text-[9px] text-white/30">{selectedElement.coneSpread ?? 40}°</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
        </div>

        {/* Bottom toolbar row — tools under video, colour+sliders under sidebar */}
        <div className="bg-[#12151e] border-t border-white/10 shrink-0 flex" style={{ height: '220px' }}>
          <div className="flex-1 min-w-0 overflow-hidden">
            <AnnotationToolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              activeColor={activeColor}
              setActiveColor={handleSetActiveColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={handleSetStrokeWidth}
              fillOpacity={fillOpacity}
              setFillOpacity={setFillOpacity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
