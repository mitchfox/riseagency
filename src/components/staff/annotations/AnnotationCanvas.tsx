import { useRef, useState, useCallback } from "react";
import { AnnotationElement } from "./AnnotationProjects";
import { AnnotationTool } from "./AnnotationEditor";

interface AnnotationCanvasProps {
  elements: AnnotationElement[];
  setElements: React.Dispatch<React.SetStateAction<AnnotationElement[]>>;
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  trackers: TrackerState[];
  setTrackers: React.Dispatch<React.SetStateAction<TrackerState[]>>;
  linkSource: string | null;
  setLinkSource: (id: string | null) => void;
  klipOffset?: number;
  onToolUsed?: () => void;
}

export interface TrackerState {
  id: string;
  elementId: string;
  color: string;
  positions: { time: number; x: number; y: number }[];
  active: boolean;
}

export const AnnotationCanvas = ({
  elements, setElements, activeTool, activeColor, strokeWidth,
  selectedId, setSelectedId, videoRef, trackers, setTrackers, linkSource, setLinkSource, klipOffset = 0,
  onToolUsed,
}: AnnotationCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);

  const getPos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  // Default animation: 0.4s fade in, 3s duration
  const defaultTiming = { animateIn: 0.4, duration: 3 };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);

    if (activeTool === 'select') {
      const target = (e.target as SVGElement).closest('[data-element-id]');
      if (target) {
        const id = target.getAttribute('data-element-id')!;
        setSelectedId(id);
        const el = elements.find(el => el.id === id);
        if (el) setDragging({ id, offX: pos.x - el.x, offY: pos.y - el.y });
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      const target = (e.target as SVGElement).closest('[data-element-id]');
      if (target) {
        const id = target.getAttribute('data-element-id')!;
        setElements(prev => prev.filter(el => el.id !== id));
      }
      return;
    }

    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (!text) return;
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'text', x: pos.x, y: pos.y,
        color: activeColor, strokeWidth, text, fontSize: 3, appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    if (activeTool === 'player-marker') {
      const num = prompt('Player number:');
      if (!num) return;
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'player-marker', x: pos.x, y: pos.y,
        color: activeColor, strokeWidth, number: parseInt(num) || 0, radius: 2.5, appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    if (activeTool === 'tracker') {
      const trackerId = crypto.randomUUID();
      const elementId = crypto.randomUUID();
      const time = videoRef.current?.currentTime || 0;
      setElements(prev => [...prev, {
        id: elementId, type: 'circle', x: pos.x, y: pos.y,
        color: activeColor, strokeWidth: 2, radius: 1.5, opacity: 0.9, appearAt: klipOffset, ...defaultTiming,
      }]);
      setTrackers(prev => [...prev, {
        id: trackerId, elementId, color: activeColor, active: true,
        positions: [{ time, x: pos.x, y: pos.y }],
      }]);
      onToolUsed?.();
      return;
    }

    if (activeTool === 'linked-line') {
      const target = (e.target as SVGElement).closest('[data-element-id]');
      if (target) {
        const id = target.getAttribute('data-element-id')!;
        if (!linkSource) {
          setLinkSource(id);
        } else {
          const el1 = elements.find(el => el.id === linkSource);
          const el2 = elements.find(el => el.id === id);
          if (el1 && el2) {
            setElements(prev => [...prev, {
              id: crypto.randomUUID(), type: 'linked-line',
              x: el1.x, y: el1.y, x2: el2.x, y2: el2.y,
              color: activeColor, strokeWidth, linkedTo: id, appearAt: klipOffset, ...defaultTiming,
            }]);
          }
          setLinkSource(null);
        }
      }
      return;
    }

    if (activeTool === 'magnifier') {
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'magnifier', x: pos.x, y: pos.y,
        color: '#ffffff', strokeWidth: 2, radius: 8, opacity: 1,
        zoomLevel: 2, appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    setDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
    if (activeTool === 'freehand') {
      setFreehandPoints([pos]);
    }
  }, [activeTool, activeColor, strokeWidth, elements, getPos, setElements, setSelectedId, trackers, linkSource, setLinkSource, setTrackers, videoRef, klipOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    if (dragging) {
      setElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: pos.x - dragging.offX, y: pos.y - dragging.offY } : el
      ));
      return;
    }
    if (!drawing) return;
    setCurrentPos(pos);
    if (activeTool === 'freehand') {
      setFreehandPoints(prev => [...prev, pos]);
    }
  }, [drawing, dragging, activeTool, getPos, setElements]);

  const handleMouseUp = useCallback(() => {
    if (dragging) { setDragging(null); return; }
    if (!drawing) return;
    setDrawing(false);

    const id = crypto.randomUUID();
    const base = { id, color: activeColor, strokeWidth, opacity: 1, appearAt: klipOffset, ...defaultTiming };

    switch (activeTool) {
      case 'line':
        setElements(prev => [...prev, { ...base, type: 'line' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        onToolUsed?.();
        break;
      case 'arrow':
        setElements(prev => [...prev, { ...base, type: 'arrow' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        onToolUsed?.();
        break;
      case 'curve':
        setElements(prev => [...prev, { ...base, type: 'curve' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        onToolUsed?.();
        break;
      case 'rect':
        setElements(prev => [...prev, {
          ...base, type: 'rect' as const,
          x: Math.min(startPos.x, currentPos.x), y: Math.min(startPos.y, currentPos.y),
          width: Math.abs(currentPos.x - startPos.x), height: Math.abs(currentPos.y - startPos.y),
        }]);
        onToolUsed?.();
        break;
      case 'circle': {
        // Draw as ellipse bounded by drag rect, rendered as circle using average radius
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const r = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        setElements(prev => [...prev, { ...base, type: 'circle' as const, x: cx, y: cy, radius: r }]);
        onToolUsed?.();
        break;
      }
      case 'spotlight': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const sr = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        setElements(prev => [...prev, { ...base, type: 'spotlight' as const, x: cx, y: cy, radius: sr, color: '#ffff00', opacity: 0.3 }]);
        onToolUsed?.();
        break;
      }
      case 'vision-cone': {
        const dx = currentPos.x - startPos.x;
        const dy = currentPos.y - startPos.y;
        const coneLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setElements(prev => [...prev, {
          ...base, type: 'vision-cone' as const, x: startPos.x, y: startPos.y,
          coneLength, angle, opacity: 0.25,
        }]);
        onToolUsed?.();
        break;
      }
      case 'distance':
        setElements(prev => [...prev, {
          ...base, type: 'distance' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y,
        }]);
        onToolUsed?.();
        break;
      case 'freehand':
        if (freehandPoints.length > 2) {
          setElements(prev => [...prev, { ...base, type: 'freehand' as const, x: 0, y: 0, points: freehandPoints }]);
          onToolUsed?.();
        }
        setFreehandPoints([]);
        break;
    }
  }, [drawing, dragging, activeTool, startPos, currentPos, activeColor, strokeWidth, freehandPoints, setElements, klipOffset]);

  // Compute animation CSS for elements
  const getAnimStyle = (el: AnnotationElement): React.CSSProperties => {
    const style: React.CSSProperties = { cursor: 'pointer' };
    
    // Animate opacity
    if (el.opacity !== undefined && el.opacity < 1) {
      style.opacity = el.opacity;
    }
    
    return style;
  };

  const renderElement = (el: AnnotationElement) => {
    const isSelected = el.id === selectedId;
    const baseStyle = getAnimStyle(el);
    const selStyle: React.CSSProperties = isSelected
      ? { ...baseStyle, filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.9))' }
      : baseStyle;

    // SVG animation attributes for visual entry effects
    const animateChildren = (el.animateIn && el.animateIn > 0) ? (
      <>
        <animate attributeName="opacity" from="0" to={String(el.opacity ?? 1)} dur={`${el.animateIn}s`} fill="freeze" />
      </>
    ) : null;

    switch (el.type) {
      case 'line':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <line
              x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
            >
              {/* Animated drawing effect */}
              <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />
            </line>
          </g>
        );
      case 'arrow': {
        const mid = `arrow-${el.id}`;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <marker id={mid} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={el.color}>
                  <animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="0.2s" fill="freeze" />
                </polygon>
              </marker>
            </defs>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round" markerEnd={`url(#${mid})`}>
              <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />
            </line>
          </g>
        );
      }
      case 'curve': {
        const midX = (el.x + (el.x2 || 0)) / 2;
        const midY = Math.min(el.y, el.y2 || 0) - 10;
        const pathD = `M ${el.x}% ${el.y}% Q ${midX}% ${midY}% ${el.x2}% ${el.y2}%`;
        return (
          <path key={el.id} data-element-id={el.id}
            d={pathD}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round"
            style={selStyle}
            strokeDasharray="500"
            strokeDashoffset="500"
          >
            <animate attributeName="stroke-dashoffset" from="500" to="0" dur="0.5s" fill="freeze" />
          </path>
        );
      }
      case 'rect':
        return (
          <rect key={el.id} data-element-id={el.id}
            x={`${el.x}%`} y={`${el.y}%`} width={`${el.width}%`} height={`${el.height}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none"
            style={selStyle}
            strokeDasharray={`${((el.width || 0) + (el.height || 0)) * 4}`}
            strokeDashoffset={`${((el.width || 0) + (el.height || 0)) * 4}`}
          >
            <animate attributeName="stroke-dashoffset" from={`${((el.width || 0) + (el.height || 0)) * 4}`} to="0" dur="0.4s" fill="freeze" />
          </rect>
        );
      case 'circle':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle
              cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} fill="none"
            >
              {/* Spinning draw-in effect */}
              <animate attributeName="r" from="0" to={`${el.radius}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" />
            </circle>
          </g>
        );
      case 'spotlight':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle
              cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
              fill={el.color} fillOpacity={el.opacity || 0.3} stroke={el.color} strokeWidth={1}
            >
              {/* Drop-in effect: scale from 0 */}
              <animate attributeName="r" from="0" to={`${el.radius}%`} dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.34 1.56 0.64 1" />
              <animate attributeName="fill-opacity" from="0" to={String(el.opacity || 0.3)} dur="0.4s" fill="freeze" />
            </circle>
            {/* Pulse ring for emphasis */}
            <circle
              cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
              fill="none" stroke={el.color} strokeWidth={2} strokeOpacity={0.5}
            >
              <animate attributeName="r" from={`${(el.radius || 5) * 0.5}%`} to={`${(el.radius || 5) * 1.3}%`} dur="0.6s" fill="freeze" />
              <animate attributeName="stroke-opacity" from="0.8" to="0" dur="0.6s" fill="freeze" />
            </circle>
          </g>
        );
      case 'vision-cone': {
        const len = el.coneLength || 15;
        const angle = el.angle || 0;
        const spread = 30;
        const rad1 = ((angle - spread) * Math.PI) / 180;
        const rad2 = ((angle + spread) * Math.PI) / 180;
        const x1 = el.x + len * Math.cos(rad1);
        const y1 = el.y + len * Math.sin(rad1);
        const x2 = el.x + len * Math.cos(rad2);
        const y2 = el.y + len * Math.sin(rad2);
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <path
              d={`M ${el.x}% ${el.y}% L ${x1}% ${y1}% A ${len} ${len} 0 0 1 ${x2}% ${y2}% Z`}
              fill={el.color} fillOpacity={el.opacity || 0.25} stroke={el.color} strokeWidth={1} strokeOpacity={0.5}
            >
              <animate attributeName="fill-opacity" from="0" to={String(el.opacity || 0.25)} dur="0.4s" fill="freeze" />
            </path>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="0.6%" fill={el.color}>
              <animate attributeName="r" from="0" to="0.6%" dur="0.2s" fill="freeze" />
            </circle>
          </g>
        );
      }
      case 'distance': {
        const dx = (el.x2 || 0) - el.x;
        const dy = (el.y2 || 0) - el.y;
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
        const mx = (el.x + (el.x2 || 0)) / 2;
        const my = (el.y + (el.y2 || 0)) / 2;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={1.5} strokeDasharray="4 2">
              <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />
            </line>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="0.5%" fill={el.color} />
            <circle cx={`${el.x2}%`} cy={`${el.y2}%`} r="0.5%" fill={el.color}>
              <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" />
            </circle>
            <text x={`${mx}%`} y={`${my - 1}%`} fill={el.color} fontSize="1.8%" textAnchor="middle" fontWeight="bold">
              {dist}
              <animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="0.3s" fill="freeze" />
            </text>
          </g>
        );
      }
      case 'magnifier': {
        const zoom = el.zoomLevel || 2;
        const r = el.radius || 8;
        const clipId = `mag-clip-${el.id}`;
        const video = videoRef.current;
        const svg = svgRef.current;
        let videoSrc = '';
        if (video) {
          try { videoSrc = video.currentSrc || ''; } catch { /* no-op */ }
        }
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <clipPath id={clipId}>
                <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r}%`} />
              </clipPath>
            </defs>
            {video && svg && (
              <foreignObject
                x={`${el.x - r}%`} y={`${el.y - r}%`}
                width={`${r * 2}%`} height={`${r * 2}%`}
                clipPath={`url(#${clipId})`}
                style={{ pointerEvents: 'none' }}
              >
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '50%', position: 'relative' }}>
                  <video
                    src={videoSrc} muted playsInline
                    style={{
                      position: 'absolute',
                      width: `${zoom * 100}%`, height: `${zoom * 100}%`,
                      left: `${50 - (el.x / 100) * zoom * 100}%`,
                      top: `${50 - (el.y / 100) * zoom * 100}%`,
                      pointerEvents: 'none',
                    }}
                    ref={(v) => { if (v && video) v.currentTime = video.currentTime; }}
                  />
                </div>
              </foreignObject>
            )}
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r}%`}
              fill="none" stroke="white" strokeWidth={2.5} strokeOpacity={0.9}>
              <animate attributeName="r" from="0" to={`${r}%`} dur="0.3s" fill="freeze" />
            </circle>
            <text x={`${el.x}%`} y={`${(el.y || 0) - r - 1}%`}
              fill="white" fontSize="1.5%" textAnchor="middle" opacity={0.7}>
              🔍 {zoom}x
            </text>
          </g>
        );
      }
      case 'linked-line': {
        const mid = `lnk-${el.id}`;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <marker id={mid} markerWidth="6" markerHeight="6" refX="3" refY="3">
                <circle cx="3" cy="3" r="2.5" fill={el.color} />
              </marker>
            </defs>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeDasharray="6 3"
              markerStart={`url(#${mid})`} markerEnd={`url(#${mid})`}>
              <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />
              <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />
            </line>
          </g>
        );
      }
      case 'text':
        return (
          <text key={el.id} data-element-id={el.id}
            x={`${el.x}%`} y={`${el.y}%`} fill={el.color}
            fontSize={`${el.fontSize || 3}%`} fontFamily="sans-serif" fontWeight="bold"
            style={selStyle}>
            {el.text}
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" />
          </text>
        );
      case 'player-marker':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius || 2.5}%`} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={1.5}>
              <animate attributeName="r" from="0" to={`${el.radius || 2.5}%`} dur="0.25s" fill="freeze" calcMode="spline" keySplines="0.34 1.56 0.64 1" />
            </circle>
            <text x={`${el.x}%`} y={`${el.y}%`} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="2.2%" fontWeight="bold">
              {el.number}
              <animate attributeName="opacity" from="0" to="1" dur="0.15s" begin="0.15s" fill="freeze" />
            </text>
          </g>
        );
      case 'freehand':
        if (!el.points || el.points.length < 2) return null;
        const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ');
        return (
          <path key={el.id} data-element-id={el.id}
            d={d} stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"
            style={selStyle}
            strokeDasharray="1000" strokeDashoffset="1000"
          >
            <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="0.5s" fill="freeze" />
          </path>
        );
      default:
        return null;
    }
  };

  const renderPreview = () => {
    if (!drawing) return null;
    switch (activeTool) {
      case 'line':
      case 'arrow':
      case 'distance':
        return <line x1={`${startPos.x}%`} y1={`${startPos.y}%`} x2={`${currentPos.x}%`} y2={`${currentPos.y}%`}
          stroke={activeColor} strokeWidth={strokeWidth} strokeDasharray="4" opacity={0.7} />;
      case 'rect': {
        const x = Math.min(startPos.x, currentPos.x), y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x), h = Math.abs(currentPos.y - startPos.y);
        return <rect x={`${x}%`} y={`${y}%`} width={`${w}%`} height={`${h}%`}
          stroke={activeColor} strokeWidth={strokeWidth} fill="none" strokeDasharray="4" opacity={0.7} />;
      }
      case 'circle':
      case 'spotlight': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const r = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        return <circle cx={`${cx}%`} cy={`${cy}%`} r={`${r}%`}
          stroke={activeTool === 'spotlight' ? '#ffff00' : activeColor} strokeWidth={strokeWidth}
          fill={activeTool === 'spotlight' ? '#ffff00' : 'none'} fillOpacity={activeTool === 'spotlight' ? 0.15 : 0}
          strokeDasharray="4" opacity={0.7} />;
      }
      case 'vision-cone': {
        const dx = currentPos.x - startPos.x, dy = currentPos.y - startPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const spread = 30 * Math.PI / 180;
        const x1 = startPos.x + len * Math.cos(angle - spread);
        const y1 = startPos.y + len * Math.sin(angle - spread);
        const x2 = startPos.x + len * Math.cos(angle + spread);
        const y2 = startPos.y + len * Math.sin(angle + spread);
        return <path d={`M ${startPos.x}% ${startPos.y}% L ${x1}% ${y1}% L ${x2}% ${y2}% Z`}
          fill={activeColor} fillOpacity={0.15} stroke={activeColor} strokeWidth={1} opacity={0.7} />;
      }
      case 'freehand': {
        if (freehandPoints.length < 2) return null;
        const d = freehandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ');
        return <path d={d} stroke={activeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" opacity={0.7} />;
      }
      default:
        return null;
    }
  };

  const renderTrackers = () => {
    return trackers.map(tracker => {
      if (tracker.positions.length < 2) return null;
      const d = tracker.positions.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ');
      return (
        <path key={tracker.id} d={d}
          stroke={tracker.color} strokeWidth={1.5} fill="none" strokeLinecap="round"
          strokeDasharray="3 2" opacity={0.5} />
      );
    });
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair', zIndex: 20 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderTrackers()}
      {elements.map(renderElement)}
      {renderPreview()}
    </svg>
  );
};
