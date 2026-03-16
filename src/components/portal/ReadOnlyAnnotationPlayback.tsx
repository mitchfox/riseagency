import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { computeVisibleElements, type ComputedAnnotationElement } from "@/lib/annotationRenderUtils";
import type { AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared read-only annotation playback component.
 * Mirrors the editor's rendering and freeze/pause behaviour exactly.
 */

interface Props {
  videoUrl: string;
  annotationProjectId?: string;
  preloadedElements?: AnnotationElement[];
  className?: string;
}

function parseClipFragment(url: string): { cleanUrl: string; clipStart: number; clipEnd: number | null } {
  const match = url.match(/#t=([\d.]+)(?:,([\d.]+))?$/);
  if (!match) return { cleanUrl: url, clipStart: 0, clipEnd: null };
  return {
    cleanUrl: url.replace(/#t=.*$/, ''),
    clipStart: parseFloat(match[1]) || 0,
    clipEnd: match[2] ? parseFloat(match[2]) : null,
  };
}

const getDashArray = (pattern?: string, sw?: number): string | undefined => {
  const w = sw || 3;
  switch (pattern) {
    case 'dashed': return `${w * 4} ${w * 2}`;
    case 'dotted': return `${w} ${w * 2}`;
    case 'dash-dot': return `${w * 4} ${w * 1.5} ${w} ${w * 1.5}`;
    default: return undefined;
  }
};

const getContrastColor = (hex: string): string => {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  } catch { return '#ffffff'; }
};

export const ReadOnlyAnnotationPlayback = ({ videoUrl, annotationProjectId, preloadedElements, className = "" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [visibleEls, setVisibleEls] = useState<ComputedAnnotationElement[]>([]);
  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [freezePhase, setFreezePhase] = useState<'idle' | 'showing' | 'fading'>('idle');

  // Use refs to avoid RAF dependency on state
  const freezeActiveRef = useRef(false);
  const triggeredTimesRef = useRef<Set<string>>(new Set());
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freezeDurationRef = useRef(3);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);
  const lastFreezeTriggerTimeRef = useRef<number>(-1);
  const internalLoopRef = useRef(false);

  const { cleanUrl, clipStart, clipEnd } = useMemo(() => parseClipFragment(videoUrl), [videoUrl]);

  // Load annotation project
  useEffect(() => {
    if (preloadedElements) {
      setElements(preloadedElements);
      return;
    }
    if (!annotationProjectId) { setElements([]); return; }
    supabase
      .from("annotation_projects")
      .select("klips")
      .eq("id", annotationProjectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.klips && Array.isArray(data.klips)) {
          const allEls = (data.klips as any[]).flatMap((klip: any) => (klip.elements || []));
          setElements(allEls);
        }
      });
  }, [annotationProjectId, preloadedElements]);

  useEffect(() => {
    triggeredTimesRef.current.clear();
    lastFreezeTriggerTimeRef.current = -1;
    lastTimeRef.current = -1;
    internalLoopRef.current = false;
  }, [cleanUrl, clipStart, clipEnd, annotationProjectId, preloadedElements]);

  // Handle clip fragment: seek to start, loop at end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      if (clipStart > 0) video.currentTime = clipStart;
    };

    const onTimeUpdate = () => {
      if (clipEnd !== null && video.currentTime >= clipEnd) {
        internalLoopRef.current = true;
        video.currentTime = clipStart;
      }

      const now = video.currentTime;
      const loopedNaturally = video.loop && video.duration > 0 && lastTimeRef.current > Math.max(video.duration - 1, 0) && now < 1;

      // Reset trigger history on genuine backward seeks only, not on automatic loops or freeze resume.
      if (!freezeActiveRef.current && lastTimeRef.current > 0 && now < lastTimeRef.current - 0.5) {
        if (!internalLoopRef.current && !loopedNaturally) {
          triggeredTimesRef.current.clear();
          lastFreezeTriggerTimeRef.current = -1;
        }
      }

      internalLoopRef.current = false;
      lastTimeRef.current = now;
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [clipStart, clipEnd]);

  // Freeze start helper — stored in ref to avoid RAF effect dependency churn
  const startFreezeRef = useRef<(computed: ComputedAnnotationElement[], video: HTMLVideoElement) => void>(() => {});

  const startFreeze = useCallback((computed: ComputedAnnotationElement[], video: HTMLVideoElement) => {
    // Calculate freeze duration
    const relTime = video.currentTime - clipStart;
    const maxDur = Math.max(
      1.5,
      ...computed.map(el => {
        const remaining = el.duration !== undefined ? (el.appearAt + el.duration) - relTime : 3;
        return Math.min(remaining, 8);
      })
    );
    freezeDurationRef.current = maxDur;

    // Capture frame
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setFreezeFrameUrl(canvas.toDataURL('image/jpeg', 0.85));
      }
    } catch { /* cross-origin */ }

    video.pause();
    freezeActiveRef.current = true;
    setFreezeActive(true);
    setFreezePhase('showing');
    setVisibleEls(computed);

    // Schedule resume
    if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    freezeTimerRef.current = setTimeout(() => {
      setFreezePhase('fading');
      fadeTimerRef.current = setTimeout(() => {
        setFreezeFrameUrl(null);
        freezeActiveRef.current = false;
        setFreezeActive(false);
        setFreezePhase('idle');
        if (video.currentTime < (video.duration || 0)) {
          video.play().catch(() => {});
        }
      }, 400);
    }, maxDur * 1000);
  }, [clipStart]);

  // Keep ref in sync
  useEffect(() => {
    startFreezeRef.current = startFreeze;
  }, [startFreeze]);

  // Main playback loop — stable deps only (elements, clipStart)
  // startFreeze accessed via ref to prevent effect teardown/recreation
  useEffect(() => {
    if (!elements || elements.length === 0) return;
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      if (freezeActiveRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const relTime = video.currentTime - clipStart;
      const computed = computeVisibleElements(elements as AnnotationElement[], relTime, { forceOpacity: null });

      // Check for new annotations that haven't triggered a freeze yet
      if (!video.paused && computed.length > 0) {
        const newElements = computed.filter(el => {
          return !triggeredTimesRef.current.has(el.id) &&
                 el.appearAt > lastFreezeTriggerTimeRef.current;
        });

        if (newElements.length > 0) {
          // Gate by the latest logical trigger point in the current visible batch,
          // not just the paused playhead time.
          lastFreezeTriggerTimeRef.current = Math.max(relTime, ...computed.map(el => el.appearAt));
          newElements.forEach(el => triggeredTimesRef.current.add(el.id));
          startFreezeRef.current(computed, video);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      setVisibleEls(computed);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [elements, clipStart]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Render element — matches AnnotationCanvas visuals exactly ──
  const renderElement = (el: ComputedAnnotationElement) => {
    const x = el.computedX;
    const y = el.computedY;
    const opacity = el.computedOpacity;
    if (opacity <= 0) return null;

    switch (el.type) {
      case 'line': {
        const ldx = (el.x2 ?? x) - x;
        const ldy = (el.y2 ?? y) - y;
        const lineLen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
        return (
          <g key={el.id} opacity={opacity}>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth) || `${lineLen}`}
            >
              <animate attributeName="stroke-dashoffset" from={`${lineLen}`} to="0" dur="3s" fill="freeze" />
            </line>
          </g>
        );
      }

      case 'arrow': {
        const mid = `ro-arrow-${el.id}`;
        const mw = Math.max(el.strokeWidth * 3, el.strokeWidth * 2.5);
        const mh = Math.max(el.strokeWidth * 2, el.strokeWidth * 1.8);
        const adx = (el.x2 ?? x) - x;
        const ady = (el.y2 ?? y) - y;
        const arrowLen = Math.sqrt(adx * adx + ady * ady) || 1;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={mw} markerHeight={mh} refX={mw} refY={mh / 2} orient="auto">
                <polygon points={`0 0, ${mw} ${mh / 2}, 0 ${mh}`} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round" markerEnd={`url(#${mid})`}
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth) || `${arrowLen}`}
            >
              <animate attributeName="stroke-dashoffset" from={`${arrowLen}`} to="0" dur="3s" fill="freeze" />
            </line>
          </g>
        );
      }

      case 'curved-arrow': {
        const mid = `ro-carrow-${el.id}`;
        const cmw = Math.max(el.strokeWidth * 3, el.strokeWidth * 2.5);
        const cmh = Math.max(el.strokeWidth * 2, el.strokeWidth * 1.8);
        const offset = el.curveOffset ?? -15;
        const mx = (x + (el.x2 ?? x)) / 2;
        const my = (y + (el.y2 ?? y)) / 2;
        const dx = (el.x2 ?? x) - x;
        const dy = (el.y2 ?? y) - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        const curveLen = len * 1.3;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={cmw} markerHeight={cmh} refX={cmw} refY={cmh / 2} orient="auto">
                <polygon points={`0 0, ${cmw} ${cmh / 2}, 0 ${cmh}`} fill={el.color} />
              </marker>
            </defs>
            <path d={`M ${x} ${y} Q ${cx} ${cy} ${el.x2 ?? x} ${el.y2 ?? y}`}
              stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round"
              markerEnd={`url(#${mid})`}
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth) || `${curveLen}`}
            >
              <animate attributeName="stroke-dashoffset" from={`${curveLen}`} to="0" dur="3s" fill="freeze" />
            </path>
          </g>
        );
      }

      case 'rect': {
        const perim = ((el.width || 0) + (el.height || 0)) * 2;
        const dash = `${perim * 0.08} ${perim * 0.04}`;
        return (
          <g key={el.id} opacity={opacity}>
            <rect x={`${x}%`} y={`${y}%`} width={`${el.width}%`} height={`${el.height}%`}
              stroke={el.color} strokeWidth={el.strokeWidth}
              fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0}
              strokeDasharray={dash}>
              <animate attributeName="stroke-dashoffset" from={`${perim}`} to="0" dur="8s" repeatCount="indefinite" />
            </rect>
          </g>
        );
      }

      case 'circle': {
        const rx = el.width ?? el.radius ?? 1;
        const ry = el.height ?? el.radius ?? 1;
        const perim = 2 * Math.PI * Math.max(rx, ry);
        const dash = `${perim * 0.08} ${perim * 0.04}`;
        return (
          <g key={el.id} opacity={opacity}>
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`}
              stroke={el.color} strokeWidth={el.strokeWidth}
              fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0}
              strokeDasharray={dash}>
              <animate attributeName="rx" from="0" to={`${rx}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="ry" from="0" to={`${ry}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="stroke-dashoffset" from={`${perim}`} to="0" dur="8s" repeatCount="indefinite" />
            </ellipse>
          </g>
        );
      }

      case 'semi-circle': {
        const rx = el.width || el.radius || 4;
        const ry = el.height || (rx * 0.35);
        const rotation = el.angle || 0;
        const startAngle = -50 * (Math.PI / 180);
        const endAngle = 230 * (Math.PI / 180);
        const x1 = x + rx * Math.cos(startAngle);
        const y1 = y + ry * Math.sin(startAngle);
        const x2p = x + rx * Math.cos(endAngle);
        const y2p = y + ry * Math.sin(endAngle);
        const gradId = `ro-disc-grad-${el.id}`;
        const glowId = `ro-disc-glow-${el.id}`;
        const pathD = `M ${x1} ${y1} A ${rx} ${ry} 0 1 1 ${x2p} ${y2p}`;
        return (
          <g key={el.id} opacity={opacity} transform={`rotate(${rotation}, ${x}, ${y})`}>
            <defs>
              <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
                x1={`${x - rx}`} y1={`${y}`} x2={`${x + rx}`} y2={`${y}`}>
                <stop offset="0%" stopColor={el.color} stopOpacity={0.6}>
                  <animate attributeName="stop-opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="20%" stopColor="white" stopOpacity={0.95}>
                  <animate attributeName="offset" values="0.05;0.45;0.85;0.45;0.05" dur="2.4s" repeatCount="indefinite" />
                </stop>
                <stop offset="40%" stopColor={el.color} stopOpacity={1}>
                  <animate attributeName="stop-opacity" values="1;0.7;1" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="70%" stopColor="white" stopOpacity={0.7}>
                  <animate attributeName="offset" values="0.85;0.55;0.15;0.55;0.85" dur="2.4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor={el.color} stopOpacity={0.6}>
                  <animate attributeName="stop-opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <ellipse cx={x} cy={y + ry * 0.2} rx={rx * 0.9} ry={ry * 0.6} fill="rgba(0,0,0,0.18)" stroke="none" />
            <path d={pathD} fill="none" stroke={el.color} strokeWidth={el.strokeWidth * 3} strokeOpacity={0.12} strokeLinecap="round" />
            <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth={el.strokeWidth} strokeLinecap="round" filter={`url(#${glowId})`} />
            <path d={pathD} fill="none" stroke="white" strokeWidth={Math.max(el.strokeWidth * 0.3, 0.8)} strokeOpacity={0.25} strokeLinecap="round" />
          </g>
        );
      }

      case 'space-oval': {
        const rx = (el.width || 15) / 2;
        const ry = (el.height || 8) / 2;
        const patId = `ro-hatch-${el.id}`;
        const sGradId = `ro-space-grad-${el.id}`;
        const sGlowId = `ro-space-glow-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <pattern id={patId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke={el.color} strokeWidth="1.5" strokeOpacity={el.fillOpacity || 0.25} />
              </pattern>
              <linearGradient id={sGradId} gradientUnits="userSpaceOnUse"
                x1={`${x - rx}`} y1={`${y}`} x2={`${x + rx}`} y2={`${y}`}>
                <stop offset="0%" stopColor={el.color} stopOpacity={0.4}>
                  <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="30%" stopColor="white" stopOpacity={0.6}>
                  <animate attributeName="offset" values="0.05;0.45;0.85;0.45;0.05" dur="2.4s" repeatCount="indefinite" />
                </stop>
                <stop offset="60%" stopColor={el.color} stopOpacity={0.7}>
                  <animate attributeName="stop-opacity" values="0.7;0.4;0.7" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor={el.color} stopOpacity={0.4}>
                  <animate attributeName="stop-opacity" values="0.4;0.8;0.4" dur="1.8s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <filter id={sGlowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <ellipse cx={x} cy={y + ry * 0.15} rx={rx * 0.85} ry={ry * 0.5} fill="rgba(0,0,0,0.12)" stroke="none" />
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${patId})`} stroke="none">
              <animate attributeName="rx" from="0" to={String(rx)} dur="0.3s" fill="freeze" />
              <animate attributeName="ry" from="0" to={String(ry)} dur="0.3s" fill="freeze" />
            </ellipse>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={el.color} strokeWidth={el.strokeWidth * 2} strokeOpacity={0.1} />
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="none" stroke={`url(#${sGradId})`}
              strokeWidth={el.strokeWidth * 0.5} strokeDasharray="3 2" filter={`url(#${sGlowId})`} />
            <ellipse cx={x} cy={y} rx={rx * 0.85} ry={ry * 0.7} fill="none" stroke="white" strokeWidth={0.5} strokeOpacity={0.15} />
          </g>
        );
      }

      case 'spotlight': {
        const rx = el.width ?? el.radius ?? 5;
        const ry = el.height ?? el.radius ?? 5;
        const maskId = `ro-spot-${el.id}`;
        const spotGradId = `ro-spot-grad-${el.id}`;
        const spotGlowId = `ro-spot-glow-${el.id}`;
        const spotPerim = 2 * Math.PI * Math.max(rx, ry);
        const spotDash = `${spotPerim * 0.08} ${spotPerim * 0.04}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`} fill="black" />
              </mask>
              <linearGradient id={spotGradId} gradientUnits="userSpaceOnUse"
                x1={`${x - rx}%`} y1={`${y}%`} x2={`${x + rx}%`} y2={`${y}%`}>
                <stop offset="0%" stopColor={el.color} stopOpacity={0.5}>
                  <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="white" stopOpacity={0.8}>
                  <animate attributeName="offset" values="0.05;0.45;0.85;0.45;0.05" dur="2.4s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor={el.color} stopOpacity={0.9}>
                  <animate attributeName="stop-opacity" values="0.9;0.5;0.9" dur="1.8s" repeatCount="indefinite" />
                </stop>
                <stop offset="75%" stopColor="white" stopOpacity={0.6}>
                  <animate attributeName="offset" values="0.85;0.55;0.15;0.55;0.85" dur="2.4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor={el.color} stopOpacity={0.5}>
                  <animate attributeName="stop-opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
              <filter id={spotGlowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="black" fillOpacity={el.fillOpacity || 0.15} mask={`url(#${maskId})`} />
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx * 1.08}%`} ry={`${ry * 1.08}%`}
              fill="none" stroke={el.color} strokeWidth={el.strokeWidth || 1} strokeOpacity={0.1} />
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`}
              fill="none" stroke={`url(#${spotGradId})`} strokeWidth={el.strokeWidth || 1}
              filter={`url(#${spotGlowId})`} strokeDasharray={spotDash}>
              <animate attributeName="stroke-dashoffset" from={`${spotPerim}`} to="0" dur="8s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx * 0.95}%`} ry={`${ry * 0.95}%`}
              fill="none" stroke="white" strokeWidth={Math.max((el.strokeWidth || 1) * 0.3, 0.3)} strokeOpacity={0.2} />
          </g>
        );
      }

      case 'vision-cone': {
        const len = el.coneLength || 15;
        const angle = el.angle || 0;
        const spread = el.coneSpread || 40;
        const halfSpread = spread / 2;
        const rad1 = ((angle - halfSpread) * Math.PI) / 180;
        const rad2 = ((angle + halfSpread) * Math.PI) / 180;
        const vx1 = x + len * Math.cos(rad1);
        const vy1 = y + len * Math.sin(rad1);
        const vx2 = x + len * Math.cos(rad2);
        const vy2 = y + len * Math.sin(rad2);
        const largeArc = spread > 180 ? 1 : 0;
        const gradientId = `ro-vc-grad-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <radialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={len}>
                <stop offset="0%" stopColor={el.color} stopOpacity={el.fillOpacity || 0.3} />
                <stop offset="70%" stopColor={el.color} stopOpacity={(el.fillOpacity || 0.3) * 0.6} />
                <stop offset="100%" stopColor={el.color} stopOpacity={0.05} />
              </radialGradient>
            </defs>
            <path d={`M ${x} ${y} L ${vx1} ${vy1} A ${len} ${len} 0 ${largeArc} 1 ${vx2} ${vy2} Z`}
              fill={`url(#${gradientId})`} stroke={el.color} strokeWidth={1} strokeOpacity={0.4}>
              <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" />
            </path>
            <circle cx={`${x}%`} cy={`${y}%`} r="0.8%" fill={el.color} fillOpacity={0.8}>
              <animate attributeName="r" from="0" to="0.8%" dur="0.2s" fill="freeze" />
            </circle>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${vx1}%`} y2={`${vy1}%`}
              stroke={el.color} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 2" />
            <line x1={`${x}%`} y1={`${y}%`} x2={`${vx2}%`} y2={`${vy2}%`}
              stroke={el.color} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 2" />
          </g>
        );
      }

      case 'distance': {
        const dx = (el.x2 || 0) - x;
        const dy = (el.y2 || 0) - y;
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
        const mx = (x + (el.x2 || 0)) / 2;
        const my = (y + (el.y2 || 0)) / 2;
        return (
          <g key={el.id} opacity={opacity}>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={1.5} strokeDasharray="4 2">
              <animate attributeName="x2" from={`${x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="y2" from={`${y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />
            </line>
            <circle cx={`${x}%`} cy={`${y}%`} r="0.5%" fill={el.color} />
            <circle cx={`${el.x2}%`} cy={`${el.y2}%`} r="0.5%" fill={el.color} />
            <text x={`${mx}%`} y={`${my - 1}%`} fill={el.color} fontSize="1.8%" textAnchor="middle" fontWeight="bold">{dist}</text>
          </g>
        );
      }

      case 'player-marker': {
        const textColor = getContrastColor(el.color);
        const markerR = el.radius || 2.5;
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={x} cy={y} r={markerR} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={0.3}>
              <animate attributeName="r" from="0" to={String(markerR)} dur="0.25s" fill="freeze" calcMode="spline" keySplines="0.34 1.56 0.64 1" />
            </circle>
            <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize={markerR * 1.2} fontWeight="bold">
              {el.number ?? ''}
            </text>
          </g>
        );
      }

      case 'point':
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={x} cy={y} r={el.radius || 1} fill={el.color} fillOpacity={0.9} stroke="white" strokeWidth={0.3}>
              <animate attributeName="r" from="0" to={String(el.radius || 1)} dur="1s" fill="freeze" />
            </circle>
          </g>
        );

      case 'linked-line': {
        const mid = `ro-lnk-${el.id}`;
        const sw = el.strokeWidth || 1;
        const dotR = Math.max(1.5, sw * 1.2);
        const mSize = dotR * 2 + 1;
        const lnkDash = `${sw * 3} ${sw * 1.5}`;
        const lnkTotalDash = sw * 3 + sw * 1.5;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={mSize} markerHeight={mSize} refX={mSize / 2} refY={mSize / 2}>
                <circle cx={mSize / 2} cy={mSize / 2} r={dotR} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={sw} strokeDasharray={lnkDash}
              markerStart={`url(#${mid})`} markerEnd={`url(#${mid})`}>
              <animate attributeName="stroke-dashoffset" from={`${lnkTotalDash}`} to="0" dur="3.6s" repeatCount="indefinite" />
            </line>
          </g>
        );
      }

      case 'magnifier': {
        const r = el.radius || 3;
        const magCircPerim = 2 * Math.PI * r;
        const magDash = `${magCircPerim * 0.12} ${magCircPerim * 0.06}`;
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={`${x}%`} cy={`${y}%`} r={`${r}%`}
              fill="rgba(0,0,0,0.3)" stroke="white" strokeWidth={0.8} strokeOpacity={0.9}
              strokeDasharray={magDash}>
              <animate attributeName="r" from="0" to={`${r}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="stroke-dashoffset" from={`${magCircPerim}`} to="0" dur="8s" repeatCount="indefinite" />
            </circle>
            <text x={`${x}%`} y={`${(y || 0) - r - 0.8}%`}
              fill="white" fontSize="1.2%" textAnchor="middle" opacity={0.6}>
              🔍 {el.zoomLevel || 1.5}x
            </text>
          </g>
        );
      }

      case 'image-layer':
        return (
          <g key={el.id} opacity={opacity}>
            <rect x={`${x}%`} y={`${y}%`} width={`${el.width || 10}%`} height={`${el.height || 10}%`}
              fill="none" stroke="white" strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 2" />
          </g>
        );

      default:
        return null;
    }
  };

  const hasAnnotations = elements.length > 0;
  const renderedVisibleEls = freezeActive
    ? visibleEls
    : visibleEls.filter((el) => !triggeredTimesRef.current.has(el.id));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {freezeActive && freezeFrameUrl && (
        <img
          src={freezeFrameUrl}
          className="absolute inset-0 w-full h-full object-fill z-[1]"
          alt=""
          style={{
            opacity: freezePhase === 'fading' ? 0 : 1,
            transition: 'opacity 0.4s ease-out',
          }}
        />
      )}
      <video
        ref={videoRef}
        src={cleanUrl}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="w-full"
        style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'fill' }}
      />
      {hasAnnotations && renderedVisibleEls.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            objectFit: 'fill',
            zIndex: 2,
            opacity: freezePhase === 'fading' ? 0 : 1,
            transition: freezePhase === 'fading' ? 'opacity 0.4s ease-out' : 'none',
          }}
        >
          {renderedVisibleEls.map(renderElement)}
        </svg>
      )}
    </div>
  );
};
