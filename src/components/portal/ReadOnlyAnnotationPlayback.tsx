import { useRef, useEffect, useState, useMemo } from "react";
import { computeVisibleElements, type ComputedAnnotationElement } from "@/lib/annotationRenderUtils";
import type { AnnotationElement } from "@/components/staff/annotations/AnnotationProjects";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared read-only annotation playback component.
 * Mirrors the editor's playback behaviour exactly:
 *  - computeVisibleElements for timing/visibility
 *  - freeze/pause when annotations appear, resume after duration
 *  - Renders via SVG using the same element rendering as AnnotationCanvas (all types supported)
 *  - Handles #t= clip fragments for deterministic timing
 */

interface Props {
  videoUrl: string;
  annotationProjectId?: string;
  /** If elements are already loaded externally, pass them directly */
  preloadedElements?: AnnotationElement[];
  /** Extra class for the container div */
  className?: string;
}

/** Parse #t=start,end from a video URL */
function parseClipFragment(url: string): { cleanUrl: string; clipStart: number; clipEnd: number | null } {
  const match = url.match(/#t=([\d.]+)(?:,([\d.]+))?$/);
  if (!match) return { cleanUrl: url, clipStart: 0, clipEnd: null };
  return {
    cleanUrl: url.replace(/#t=.*$/, ''),
    clipStart: parseFloat(match[1]) || 0,
    clipEnd: match[2] ? parseFloat(match[2]) : null,
  };
}

/** Get dash array for stroke patterns */
const getDashArray = (pattern?: string, sw?: number): string | undefined => {
  const w = sw || 3;
  switch (pattern) {
    case 'dashed': return `${w * 4} ${w * 2}`;
    case 'dotted': return `${w} ${w * 2}`;
    case 'dash-dot': return `${w * 4} ${w * 1.5} ${w} ${w * 1.5}`;
    default: return undefined;
  }
};

export const ReadOnlyAnnotationPlayback = ({ videoUrl, annotationProjectId, preloadedElements, className = "" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [visibleEls, setVisibleEls] = useState<ComputedAnnotationElement[]>([]);
  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [freezePhase, setFreezePhase] = useState<'idle' | 'showing' | 'fading'>('idle');
  const triggeredTimesRef = useRef<Set<number>>(new Set());
  const freezeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freezeDurationRef = useRef(3);
  const freezeElementIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);

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

  // Handle clip fragment: seek to start, loop at end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      if (clipStart > 0) {
        video.currentTime = clipStart;
      }
    };

    const onTimeUpdate = () => {
      if (clipEnd !== null && video.currentTime >= clipEnd) {
        video.currentTime = clipStart;
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [clipStart, clipEnd]);

  // Main playback loop: compute visible elements + trigger freeze
  useEffect(() => {
    if (!elements || elements.length === 0) return;
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      if (freezeActive) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Relative time from clip start — this is what the editor uses
      const relTime = video.currentTime - clipStart;

      const computed = computeVisibleElements(elements as AnnotationElement[], relTime, { forceOpacity: null });

      // Check for freeze trigger
      if (!video.paused && computed.length > 0) {
        // Check if any new annotation just appeared that we haven't triggered for
        const newElements = computed.filter(el => {
          const roundedAppear = Math.round(el.appearAt * 4) / 4; // 0.25s resolution
          return !triggeredTimesRef.current.has(roundedAppear);
        });

        if (newElements.length > 0) {
          // Mark these times as triggered
          newElements.forEach(el => {
            triggeredTimesRef.current.add(Math.round(el.appearAt * 4) / 4);
          });

          // Freeze: capture frame, pause, show annotations
          const freezeIds = new Set(computed.map(el => el.id));
          freezeElementIdsRef.current = freezeIds;

          // Calculate freeze duration from longest visible annotation
          const maxDur = Math.max(
            1.5,
            ...computed.map(el => {
              const remaining = el.duration !== undefined ? (el.appearAt + el.duration) - relTime : 3;
              return Math.min(remaining, 8);
            })
          );
          freezeDurationRef.current = maxDur;

          // Capture freeze frame
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameUrl = canvas.toDataURL('image/jpeg', 0.85);
              setFreezeFrameUrl(frameUrl);
            }
          } catch { /* cross-origin — skip frame capture */ }

          video.pause();
          setFreezeActive(true);
          setFreezePhase('showing');

          // Only show freeze-triggered elements
          const frozenComputed = computed.filter(el => freezeIds.has(el.id));
          setVisibleEls(frozenComputed);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      setVisibleEls(computed);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [elements, clipStart, freezeActive]);

  // Freeze resume timer (mirrors editor exactly)
  useEffect(() => {
    if (!freezeActive) return;

    const timer = setTimeout(() => {
      setFreezePhase('fading');
      const fadeTimer = setTimeout(() => {
        setFreezeFrameUrl(null);
        setFreezeActive(false);
        setFreezePhase('idle');
        const v = videoRef.current;
        if (v && v.currentTime < (v.duration || 0)) {
          v.play().catch(() => {});
        }
      }, 400);
      freezeTimerRef.current = fadeTimer;
    }, freezeDurationRef.current * 1000);

    return () => {
      clearTimeout(timer);
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    };
  }, [freezeActive]);

  // Render SVG element — supports ALL types matching AnnotationCanvas
  const renderElement = (el: ComputedAnnotationElement) => {
    const x = el.computedX;
    const y = el.computedY;
    const opacity = el.computedOpacity;
    if (opacity <= 0) return null;

    switch (el.type) {
      case 'line': {
        const dx = (el.x2 ?? x) - x;
        const dy = (el.y2 ?? y) - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return (
          <g key={el.id} opacity={opacity}>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth) || `${len}`}
              strokeDashoffset={0}>
              <animate attributeName="stroke-dashoffset" from={`${len}`} to="0" dur="3s" fill="freeze" />
            </line>
          </g>
        );
      }

      case 'arrow': {
        const mid = `ro-arrow-${el.id}`;
        const mw = Math.max(el.strokeWidth * 3, el.strokeWidth * 2.5);
        const mh = Math.max(el.strokeWidth * 2, el.strokeWidth * 1.8);
        const dx = (el.x2 ?? x) - x;
        const dy = (el.y2 ?? y) - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth={mw} markerHeight={mh} refX={mw} refY={mh / 2} orient="auto">
                <polygon points={`0 0, ${mw} ${mh / 2}, 0 ${mh}`} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round" markerEnd={`url(#${mid})`}
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth) || `${len}`}
              strokeDashoffset={0}>
              <animate attributeName="stroke-dashoffset" from={`${len}`} to="0" dur="3s" fill="freeze" />
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
              strokeDashoffset={0}>
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

      case 'space-oval': {
        const rx = (el.width || 15) / 2;
        const ry = (el.height || 8) / 2;
        const patId = `ro-hatch-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <pattern id={patId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke={el.color} strokeWidth="1.5" strokeOpacity={el.fillOpacity || 0.25} />
              </pattern>
            </defs>
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`}
              fill={`url(#${patId})`} stroke={el.color} strokeWidth={el.strokeWidth * 0.5}
              strokeOpacity={0.5} strokeDasharray="3 2" />
          </g>
        );
      }

      case 'spotlight': {
        const rx = el.width ?? el.radius ?? 5;
        const ry = el.height ?? el.radius ?? 5;
        const maskId = `ro-spot-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`} fill="black" />
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="black" fillOpacity={el.fillOpacity || 0.3} mask={`url(#${maskId})`} />
            <ellipse cx={`${x}%`} cy={`${y}%`} rx={`${rx}%`} ry={`${ry}%`} fill="none" stroke={el.color} strokeWidth={2} strokeOpacity={0.6} />
          </g>
        );
      }

      case 'player-marker': {
        const r = parseInt(el.color.slice(1, 3), 16);
        const g = parseInt(el.color.slice(3, 5), 16);
        const b = parseInt(el.color.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const textColor = lum > 0.5 ? '#000000' : '#ffffff';
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={`${x}%`} cy={`${y}%`} r={`${el.radius || 2.5}%`} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={1.5} />
            <text x={`${x}%`} y={`${y}%`} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize="2.2%" fontWeight="bold">{el.number ?? ''}</text>
          </g>
        );
      }

      case 'point':
        return (
          <circle key={el.id} cx={`${x}%`} cy={`${y}%`} r={`${el.radius || 1}%`}
            fill={el.color} fillOpacity={0.9} stroke="white" strokeWidth={1.5} opacity={opacity} />
        );

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
        return (
          <g key={el.id} opacity={opacity}>
            <path d={`M ${x}% ${y}% L ${vx1}% ${vy1}% A ${len} ${len} 0 0 1 ${vx2}% ${vy2}% Z`}
              fill={el.color} fillOpacity={el.fillOpacity || 0.2} stroke={el.color} strokeWidth={1} strokeOpacity={0.4} />
            <circle cx={`${x}%`} cy={`${y}%`} r="0.8%" fill={el.color} fillOpacity={0.8} />
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
        const x2 = x + rx * Math.cos(endAngle);
        const y2 = y + ry * Math.sin(endAngle);
        return (
          <g key={el.id} opacity={opacity} transform={`rotate(${rotation}, ${x}%, ${y}%)`}>
            <path d={`M ${x1}% ${y1}% A ${rx}% ${ry}% 0 1 1 ${x2}% ${y2}%`}
              fill="none" stroke={el.color} strokeWidth={el.strokeWidth} strokeOpacity={0.9} strokeLinecap="round" />
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
              stroke={el.color} strokeWidth={1.5} strokeDasharray="4 2" />
            <circle cx={`${x}%`} cy={`${y}%`} r="0.5%" fill={el.color} />
            <circle cx={`${el.x2}%`} cy={`${el.y2}%`} r="0.5%" fill={el.color} />
            <text x={`${mx}%`} y={`${(my || 0) - 1}%`} fill={el.color} fontSize="1.8%" textAnchor="middle" fontWeight="bold">{dist}</text>
          </g>
        );
      }

      case 'linked-line': {
        const mid = `ro-lnk-${el.id}`;
        return (
          <g key={el.id} opacity={opacity}>
            <defs>
              <marker id={mid} markerWidth="6" markerHeight="6" refX="3" refY="3">
                <circle cx="3" cy="3" r="2.5" fill={el.color} />
              </marker>
            </defs>
            <line x1={`${x}%`} y1={`${y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeDasharray="6 3"
              markerStart={`url(#${mid})`} markerEnd={`url(#${mid})`} />
          </g>
        );
      }

      case 'magnifier': {
        const r = el.radius || 8;
        return (
          <g key={el.id} opacity={opacity}>
            <circle cx={`${x}%`} cy={`${y}%`} r={`${r}%`} fill="none" stroke="white" strokeWidth={2.5} strokeOpacity={0.9} />
            <text x={`${x}%`} y={`${(y || 0) - r - 1}%`} fill="white" fontSize="1.5%" textAnchor="middle" opacity={0.7}>🔍 {el.zoomLevel || 2}x</text>
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Freeze frame image — shown behind SVG when frozen */}
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
      {hasAnnotations && visibleEls.length > 0 && (
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
          {visibleEls.map(renderElement)}
        </svg>
      )}
    </div>
  );
};
