import { useRef, useState, useCallback } from "react";
import { AnnotationElement } from "./AnnotationProjects";
import { AnnotationTool } from "./AnnotationEditor";

interface AnnotationCanvasProps {
  elements: AnnotationElement[];
  setElements: React.Dispatch<React.SetStateAction<AnnotationElement[]>>;
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  linkSource: string | null;
  setLinkSource: (id: string | null) => void;
  klipOffset?: number;
  onToolUsed?: () => void;
  isDrawingMode?: boolean;
}

/** Convert dashPattern to SVG strokeDasharray */
const getDashArray = (pattern?: string, sw?: number): string | undefined => {
  const w = sw || 3;
  switch (pattern) {
    case 'dashed': return `${w * 4} ${w * 2}`;
    case 'dotted': return `${w} ${w * 2}`;
    case 'dash-dot': return `${w * 4} ${w * 1.5} ${w} ${w * 1.5}`;
    default: return undefined;
  }
};

export const AnnotationCanvas = ({
  elements, setElements, activeTool, activeColor, strokeWidth, fillOpacity,
  selectedId, setSelectedId, videoRef, linkSource, setLinkSource, klipOffset = 0,
  onToolUsed, isDrawingMode = false,
}: AnnotationCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ id: string; endpoint: 'start' | 'end' } | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startPos: { x: number; y: number };
    startEl: { x: number; y: number; width?: number; height?: number; radius?: number; x2?: number; y2?: number; fontSize?: number };
  } | null>(null);

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

    if (activeTool === 'player-marker') {
      const num = prompt('Player number:');
      if (!num) return;
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'player-marker', x: pos.x, y: pos.y,
        color: activeColor, strokeWidth, number: parseInt(num) || 0, radius: 1.8, appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    if (activeTool === 'point') {
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'point', x: pos.x, y: pos.y,
        color: activeColor, strokeWidth, radius: 1, appearAt: klipOffset, ...defaultTiming,
      }]);
      // Don't call onToolUsed — keep point tool active for rapid placement
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
        color: '#ffffff', strokeWidth: 1.5, radius: 6, opacity: 1,
        zoomLevel: 2, fillOpacity: 0.9, appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    if (activeTool === 'image-layer') {
      // Image layer: create a rect-like clipping region the user will drag to shape
      setElements(prev => [...prev, {
        id: crypto.randomUUID(), type: 'image-layer',
        x: pos.x - 5, y: pos.y - 5,
        width: 10, height: 10,
        color: '#ffffff', strokeWidth: 1, opacity: 1, fillOpacity: 1,
        layerZIndex: 100,
        appearAt: klipOffset, ...defaultTiming,
      }]);
      onToolUsed?.();
      return;
    }

    setDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  }, [activeTool, activeColor, strokeWidth, fillOpacity, elements, getPos, setElements, setSelectedId, linkSource, setLinkSource, videoRef, klipOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    if (resizing) {
      const dx = pos.x - resizing.startPos.x;
      const dy = pos.y - resizing.startPos.y;
      const h = resizing.handle;
      const s = resizing.startEl;

      setElements(prev => prev.map(el => {
        if (el.id !== resizing.id) return el;

        // Circle/spotlight/player-marker/semi-circle: resize radius
        if (el.radius !== undefined && (el.type === 'circle' || el.type === 'spotlight' || el.type === 'player-marker' || el.type === 'semi-circle')) {
          const delta = h.includes('e') || h.includes('s') ? Math.max(dx, dy) : Math.min(dx, dy);
          const isCorner = h.length === 2;
          const scaleFactor = isCorner ? delta : (h === 'e' || h === 'w' ? dx : dy);
          return { ...el, radius: Math.max(0.5, (s.radius ?? 2) + scaleFactor * (h.includes('w') || h.includes('n') ? -1 : 1)) };
        }

        // Rect / space-oval / image-layer: resize width/height
        if (el.type === 'rect' || el.type === 'space-oval' || el.type === 'image-layer') {
          const isCorner = h.length === 2;
          let newW = s.width ?? 1;
          let newH = s.height ?? 1;
          let newX = s.x;
          let newY = s.y;

          if (h.includes('e')) newW = Math.max(1, (s.width ?? 1) + dx);
          if (h.includes('w')) { newW = Math.max(1, (s.width ?? 1) - dx); newX = s.x + dx; }
          if (h.includes('s')) newH = Math.max(1, (s.height ?? 1) + dy);
          if (h.includes('n')) { newH = Math.max(1, (s.height ?? 1) - dy); newY = s.y + dy; }

          // Corner handles: allow independent width/height (no aspect ratio lock)
          if (isCorner) {
            // Both dimensions change freely based on mouse delta
          }
          return { ...el, x: newX, y: newY, width: newW, height: newH };
        }

        // Lines/arrows: move endpoints
        if (el.x2 !== undefined && el.y2 !== undefined) {
          if (h === 'se' || h === 'e' || h === 's') {
            return { ...el, x2: (s.x2 ?? 0) + dx, y2: (s.y2 ?? 0) + dy };
          }
          if (h === 'nw' || h === 'w' || h === 'n') {
            return { ...el, x: s.x + dx, y: s.y + dy };
          }
        }

        return el;
      }));
      return;
    }
    if (draggingEndpoint) {
      setElements(prev => prev.map(el => {
        if (el.id !== draggingEndpoint.id) return el;
        if (draggingEndpoint.endpoint === 'start') {
          return { ...el, x: pos.x, y: pos.y };
        } else {
          return { ...el, x2: pos.x, y2: pos.y };
        }
      }));
      return;
    }
    if (dragging) {
      setElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: pos.x - dragging.offX, y: pos.y - dragging.offY } : el
      ));
      return;
    }
    if (!drawing) return;
    setCurrentPos(pos);
  }, [drawing, dragging, draggingEndpoint, resizing, activeTool, getPos, setElements]);

  const handleMouseUp = useCallback(() => {
    if (resizing) { setResizing(null); return; }
    if (draggingEndpoint) { setDraggingEndpoint(null); return; }
    if (dragging) { setDragging(null); return; }
    if (!drawing) return;
    setDrawing(false);

    const id = crypto.randomUUID();
    const base = { id, color: activeColor, strokeWidth, opacity: 1, appearAt: klipOffset, ...defaultTiming };

    switch (activeTool) {
      case 'line':
        setElements(prev => [...prev, { ...base, type: 'line' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y, dashPattern: 'solid' as const }]);
        onToolUsed?.();
        break;
      case 'arrow':
        setElements(prev => [...prev, { ...base, type: 'arrow' as const, x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y, dashPattern: 'solid' as const }]);
        onToolUsed?.();
        break;
      case 'curved-arrow': {
        setElements(prev => [...prev, {
          ...base, type: 'curved-arrow' as const,
          x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y,
          curveOffset: -15, dashPattern: 'solid' as const,
        }]);
        onToolUsed?.();
        break;
      }
      case 'rect':
        setElements(prev => [...prev, {
          ...base, type: 'rect' as const,
          x: Math.min(startPos.x, currentPos.x), y: Math.min(startPos.y, currentPos.y),
          width: Math.abs(currentPos.x - startPos.x), height: Math.abs(currentPos.y - startPos.y),
          fillOpacity,
        }]);
        onToolUsed?.();
        break;
      case 'circle': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const r = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        setElements(prev => [...prev, { ...base, type: 'circle' as const, x: cx, y: cy, radius: r, fillOpacity }]);
        onToolUsed?.();
        break;
      }
      case 'semi-circle': {
        // Flat oval disc: placed at click position
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const rx = Math.abs(currentPos.x - startPos.x) / 2 || 4;
        const ry = Math.abs(currentPos.y - startPos.y) / 2 || 1.5;
        setElements(prev => [...prev, {
          ...base, type: 'semi-circle' as const, x: cx, y: cy,
          width: rx, height: ry, radius: rx,
          fillOpacity: fillOpacity || 0.5,
          angle: 0,
        }]);
        onToolUsed?.();
        break;
      }
      case 'space-oval': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const w = Math.abs(currentPos.x - startPos.x) || 15;
        const h = Math.abs(currentPos.y - startPos.y) || 8;
        setElements(prev => [...prev, {
          ...base, type: 'space-oval' as const, x: cx, y: cy,
          width: w, height: h,
          fillOpacity: fillOpacity || 0.25,
        }]);
        onToolUsed?.();
        break;
      }
      case 'spotlight': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        // Use the larger dimension so it's always a circle by default
        const sr = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        setElements(prev => [...prev, {
          ...base, type: 'spotlight' as const, x: cx, y: cy, radius: sr || 5,
          color: '#ffff00', fillOpacity: fillOpacity || 0.15,
        }]);
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
          coneLength: coneLength || 15, angle, coneSpread: 40,
          fillOpacity: fillOpacity || 0.2,
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
    }
  }, [drawing, dragging, activeTool, startPos, currentPos, activeColor, strokeWidth, fillOpacity, setElements, klipOffset]);

  // Compute animation CSS for elements
  const getAnimStyle = (el: AnnotationElement): React.CSSProperties => {
    const style: React.CSSProperties = { cursor: 'pointer' };
    if (el.opacity !== undefined && el.opacity < 1) {
      style.opacity = el.opacity;
    }
    return style;
  };

  // Choose contrasting text colour for player marker
  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Sort elements so image-layer types ALWAYS render last (on top of everything)
  const sortedElements = [...elements].sort((a, b) => {
    const isALayer = a.type === 'image-layer' ? 1 : 0;
    const isBLayer = b.type === 'image-layer' ? 1 : 0;
    return isALayer - isBLayer;
  });

  const renderElement = (el: AnnotationElement) => {
    const isSelected = el.id === selectedId;
    const baseStyle = getAnimStyle(el);
    const selStyle = baseStyle;

    const anim = !isDrawingMode;

    switch (el.type) {
      case 'line':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <line
              x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)}
            >
              {anim && <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />}
              {anim && <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />}
            </line>
          </g>
        );
      case 'arrow': {
        const mid = `arrow-${el.id}`;
        const mw = Math.max(6, el.strokeWidth * 2.5);
        const mh = Math.max(4, el.strokeWidth * 1.8);
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <marker id={mid} markerWidth={mw} markerHeight={mh} refX={mw} refY={mh / 2} orient="auto">
                <polygon points={`0 0, ${mw} ${mh / 2}, 0 ${mh}`} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round" markerEnd={`url(#${mid})`}
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)}
            >
              {anim && <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />}
              {anim && <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />}
            </line>
          </g>
        );
      }
      case 'curved-arrow': {
        const mid = `carrow-${el.id}`;
        const cmw = Math.max(6, el.strokeWidth * 2.5);
        const cmh = Math.max(4, el.strokeWidth * 1.8);
        const offset = el.curveOffset ?? -15;
        // Control point perpendicular to midpoint
        const mx = ((el.x) + (el.x2 ?? el.x)) / 2;
        const my = ((el.y) + (el.y2 ?? el.y)) / 2;
        const dx = (el.x2 ?? el.x) - el.x;
        const dy = (el.y2 ?? el.y) - el.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const cx = mx + nx * offset;
        const cy = my + ny * offset;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <marker id={mid} markerWidth={cmw} markerHeight={cmh} refX={cmw} refY={cmh / 2} orient="auto">
                <polygon points={`0 0, ${cmw} ${cmh / 2}, 0 ${cmh}`} fill={el.color} />
              </marker>
            </defs>
            <path
              d={`M ${el.x} ${el.y} Q ${cx} ${cy} ${el.x2 ?? el.x} ${el.y2 ?? el.y}`}
              stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round"
              markerEnd={`url(#${mid})`}
              strokeDasharray={getDashArray(el.dashPattern, el.strokeWidth)}
            />
          </g>
        );
      }
      case 'rect':
        return (
          <rect key={el.id} data-element-id={el.id}
            x={`${el.x}%`} y={`${el.y}%`} width={`${el.width}%`} height={`${el.height}%`}
            stroke={el.color} strokeWidth={el.strokeWidth}
            fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0}
            style={selStyle}
          >
            {anim && <animate attributeName="stroke-dashoffset" from={`${((el.width || 0) + (el.height || 0)) * 4}`} to="0" dur="0.4s" fill="freeze" />}
          </rect>
        );
      case 'circle':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle
              cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
              stroke={el.color} strokeWidth={el.strokeWidth}
              fill={el.fillOpacity ? el.color : 'none'} fillOpacity={el.fillOpacity || 0}
            >
              {anim && <animate attributeName="r" from="0" to={`${el.radius}%`} dur="0.3s" fill="freeze" />}
            </circle>
          </g>
        );
      case 'semi-circle': {
        const rx = el.width || el.radius || 4;
        const ry = el.height || (rx * 0.35);
        const rotation = el.angle || 0;
        const startAngle = -50 * (Math.PI / 180);
        const endAngle = 230 * (Math.PI / 180);
        const x1 = el.x + rx * Math.cos(startAngle);
        const y1 = el.y + ry * Math.sin(startAngle);
        const x2 = el.x + rx * Math.cos(endAngle);
        const y2 = el.y + ry * Math.sin(endAngle);
        const gradId = `disc-grad-${el.id}`;
        const glowId = `disc-glow-${el.id}`;
        const pathD = `M ${x1} ${y1} A ${rx} ${ry} 0 1 1 ${x2} ${y2}`;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}
            transform={`rotate(${rotation}, ${el.x}, ${el.y})`}>
            <defs>
              <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
                x1={`${el.x - rx}`} y1={`${el.y}`} x2={`${el.x + rx}`} y2={`${el.y}`}>
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
            {/* Ground shadow */}
            <ellipse
              cx={el.x} cy={el.y + ry * 0.2}
              rx={rx * 0.9} ry={ry * 0.6}
              fill="rgba(0,0,0,0.18)" stroke="none"
            />
            {/* Outer glow */}
            <path
              d={pathD}
              fill="none"
              stroke={el.color}
              strokeWidth={el.strokeWidth * 3}
              strokeOpacity={0.12}
              strokeLinecap="round"
            />
            {/* Main arc with animated glossy gradient */}
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={el.strokeWidth}
              strokeLinecap="round"
              filter={`url(#${glowId})`}
            />
            {/* Inner highlight for glossy depth */}
            <path
              d={pathD}
              fill="none"
              stroke="white"
              strokeWidth={Math.max(el.strokeWidth * 0.3, 0.8)}
              strokeOpacity={0.25}
              strokeLinecap="round"
            />
          </g>
        );
      }
      case 'space-oval': {
        // Hatched/striped oval with glossy highlight animation
        const rx = (el.width || 15) / 2;
        const ry = (el.height || 8) / 2;
        const patId = `hatch-${el.id}`;
        const sGradId = `space-grad-${el.id}`;
        const sGlowId = `space-glow-${el.id}`;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <pattern id={patId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke={el.color} strokeWidth="1.5" strokeOpacity={el.fillOpacity || 0.25} />
              </pattern>
              <linearGradient id={sGradId} gradientUnits="userSpaceOnUse"
                x1={`${el.x - rx}`} y1={`${el.y}`} x2={`${el.x + rx}`} y2={`${el.y}`}>
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
            {/* Ground shadow */}
            <ellipse
              cx={el.x} cy={el.y + ry * 0.15}
              rx={rx * 0.85} ry={ry * 0.5}
              fill="rgba(0,0,0,0.12)" stroke="none"
            />
            {/* Hatched fill */}
            <ellipse
              cx={el.x} cy={el.y}
              rx={rx} ry={ry}
              fill={`url(#${patId})`}
              stroke="none"
            >
              {anim && <animate attributeName="rx" from="0" to={String(rx)} dur="0.3s" fill="freeze" />}
              {anim && <animate attributeName="ry" from="0" to={String(ry)} dur="0.3s" fill="freeze" />}
            </ellipse>
            {/* Outer glow */}
            <ellipse
              cx={el.x} cy={el.y}
              rx={rx} ry={ry}
              fill="none"
              stroke={el.color} strokeWidth={el.strokeWidth * 2}
              strokeOpacity={0.1}
            />
            {/* Glossy border */}
            <ellipse
              cx={el.x} cy={el.y}
              rx={rx} ry={ry}
              fill="none"
              stroke={`url(#${sGradId})`}
              strokeWidth={el.strokeWidth * 0.5}
              strokeDasharray="3 2"
              filter={`url(#${sGlowId})`}
            />
            {/* Inner highlight */}
            <ellipse
              cx={el.x} cy={el.y}
              rx={rx * 0.85} ry={ry * 0.7}
              fill="none"
              stroke="white" strokeWidth={0.5}
              strokeOpacity={0.15}
            />
          </g>
        );
      }
      case 'spotlight': {
        const r = el.radius || 5;
        const maskId = `spot-mask-${el.id}`;
        const spotGradId = `spot-grad-${el.id}`;
        const spotGlowId = `spot-glow-${el.id}`;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r}%`} fill="black" />
              </mask>
              <linearGradient id={spotGradId} gradientUnits="userSpaceOnUse"
                x1={`${el.x - r}%`} y1={`${el.y}%`} x2={`${el.x + r}%`} y2={`${el.y}%`}>
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
            {/* Outer glow ring */}
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r * 1.08}%`}
              fill="none" stroke={el.color} strokeWidth={el.strokeWidth || 1} strokeOpacity={0.1}
            />
            {/* Main glossy ring */}
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r}%`}
              fill="none" stroke={`url(#${spotGradId})`} strokeWidth={el.strokeWidth || 1}
              filter={`url(#${spotGlowId})`}
            />
            {/* Inner highlight */}
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r * 0.95}%`}
              fill="none" stroke="white" strokeWidth={Math.max((el.strokeWidth || 1) * 0.3, 0.3)} strokeOpacity={0.2}
            />
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

        const x1 = el.x + len * Math.cos(rad1);
        const y1 = el.y + len * Math.sin(rad1);
        const x2 = el.x + len * Math.cos(rad2);
        const y2 = el.y + len * Math.sin(rad2);

        const largeArc = spread > 180 ? 1 : 0;
        const gradientId = `vc-grad-${el.id}`;

        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <radialGradient id={gradientId}
                gradientUnits="userSpaceOnUse"
                cx={el.x} cy={el.y} r={len}>
                <stop offset="0%" stopColor={el.color} stopOpacity={el.fillOpacity || 0.3} />
                <stop offset="70%" stopColor={el.color} stopOpacity={(el.fillOpacity || 0.3) * 0.6} />
                <stop offset="100%" stopColor={el.color} stopOpacity={0.05} />
              </radialGradient>
            </defs>
            <path
              d={`M ${el.x} ${el.y} L ${x1} ${y1} A ${len} ${len} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={`url(#${gradientId})`}
              stroke={el.color} strokeWidth={1} strokeOpacity={0.4}
            >
              {anim && <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" />}
            </path>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="0.8%" fill={el.color} fillOpacity={0.8}>
              {anim && <animate attributeName="r" from="0" to="0.8%" dur="0.2s" fill="freeze" />}
            </circle>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${x1}%`} y2={`${y1}%`}
              stroke={el.color} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 2" />
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${x2}%`} y2={`${y2}%`}
              stroke={el.color} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 2" />
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
              {anim && <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />}
              {anim && <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />}
            </line>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="0.5%" fill={el.color} />
            <circle cx={`${el.x2}%`} cy={`${el.y2}%`} r="0.5%" fill={el.color} />
            <text x={`${mx}%`} y={`${my - 1}%`} fill={el.color} fontSize="1.8%" textAnchor="middle" fontWeight="bold">
              {dist}
            </text>
          </g>
        );
      }
      case 'magnifier': {
        const zoom = el.zoomLevel || 2;
        const r = el.radius || 8;
        const clipId = `mag-clip-${el.id}`;
        const video = videoRef.current;
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
            {video && svgRef.current && (() => {
              const svgRect = svgRef.current!.getBoundingClientRect();
              const svgW = svgRect.width;
              const svgH = svgRect.height;
              // Magnifier centre in pixels
              const cxPx = (el.x / 100) * svgW;
              const cyPx = (el.y / 100) * svgH;
              // Magnifier radius in pixels
              const rPx = (r / 100) * svgW;
              const diameter = rPx * 2;
              // Video natural dimensions
              const vw = video.videoWidth || svgW;
              const vh = video.videoHeight || svgH;
              // Scale video so it covers the SVG area, then apply zoom
              const scaleX = (svgW / vw) * zoom;
              const scaleY = (svgH / vh) * zoom;
              const vidW = vw * scaleX;
              const vidH = vh * scaleY;
              // Offset so the magnifier centre maps to the centre of the circle
              const left = diameter / 2 - cxPx * (svgW / vw) * zoom;
              const top = diameter / 2 - cyPx * (svgH / vh) * zoom;
              return (
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
                        width: `${vidW}px`, height: `${vidH}px`,
                        left: `${left}px`,
                        top: `${top}px`,
                        pointerEvents: 'none',
                      }}
                      ref={(v) => { if (v && video) v.currentTime = video.currentTime; }}
                    />
                  </div>
                </foreignObject>
              );
            })()}
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${r}%`}
              fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.9}>
              {anim && <animate attributeName="r" from="0" to={`${r}%`} dur="0.3s" fill="freeze" />}
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
        const sw = el.strokeWidth || 1;
        const dotR = Math.max(1.5, sw * 1.2);
        const mSize = dotR * 2 + 1;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <marker id={mid} markerWidth={mSize} markerHeight={mSize} refX={mSize / 2} refY={mSize / 2}>
                <circle cx={mSize / 2} cy={mSize / 2} r={dotR} fill={el.color} />
              </marker>
            </defs>
            <line x1={`${el.x}%`} y1={`${el.y}%`} x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 1.5}`}
              markerStart={`url(#${mid})`} markerEnd={`url(#${mid})`}>
              {anim && <animate attributeName="x2" from={`${el.x}%`} to={`${el.x2}%`} dur="0.3s" fill="freeze" />}
              {anim && <animate attributeName="y2" from={`${el.y}%`} to={`${el.y2}%`} dur="0.3s" fill="freeze" />}
            </line>
          </g>
        );
      }
      case 'player-marker': {
        const textColor = getContrastColor(el.color);
        const markerR = el.radius || 2.5;
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle cx={el.x} cy={el.y} r={markerR} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={0.3}>
              {anim && <animate attributeName="r" from="0" to={String(markerR)} dur="0.25s" fill="freeze" calcMode="spline" keySplines="0.34 1.56 0.64 1" />}
            </circle>
            <text x={el.x} y={el.y} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize={markerR * 1.2} fontWeight="bold">
              {el.number ?? ''}
            </text>
          </g>
        );
      }
      case 'point':
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <circle cx={el.x} cy={el.y} r={el.radius || 1} fill={el.color} fillOpacity={0.9}
              stroke="white" strokeWidth={0.3}>
              {anim && <animate attributeName="r" from="0" to={String(el.radius || 1)} dur="0.2s" fill="freeze" />}
            </circle>
          </g>
        );
      case 'image-layer': {
        // Image layer: clips part of the video frame and renders it on top (always highest z)
        const video = videoRef.current;
        const w = el.width || 10;
        const h = el.height || 10;
        const clipId = `img-layer-${el.id}`;
        let videoSrc = '';
        if (video) {
          try { videoSrc = video.currentSrc || ''; } catch { /* no-op */ }
        }
        return (
          <g key={el.id} data-element-id={el.id} style={selStyle}>
            <defs>
              <clipPath id={clipId}>
                <rect x={`${el.x}%`} y={`${el.y}%`} width={`${w}%`} height={`${h}%`} />
              </clipPath>
            </defs>
            {video && (
              <foreignObject
                x={`${el.x}%`} y={`${el.y}%`}
                width={`${w}%`} height={`${h}%`}
                style={{ pointerEvents: 'none' }}
              >
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                  <video
                    src={videoSrc} muted playsInline
                    style={{
                      position: 'absolute',
                      width: `${100 / (w / 100)}%`,
                      height: `${100 / (h / 100)}%`,
                      left: `${-(el.x / w) * 100}%`,
                      top: `${-(el.y / h) * 100}%`,
                      pointerEvents: 'none',
                    }}
                    ref={(v) => { if (v && video) v.currentTime = video.currentTime; }}
                  />
                </div>
              </foreignObject>
            )}
            {/* Drag handle overlay — transparent but receives pointer events */}
            <rect
              x={`${el.x}%`} y={`${el.y}%`} width={`${w}%`} height={`${h}%`}
              fill="transparent" stroke="none"
              style={{ cursor: 'move' }}
            />
            {/* Selection border */}
            <rect
              x={`${el.x}%`} y={`${el.y}%`} width={`${w}%`} height={`${h}%`}
              fill="none" stroke={isSelected ? '#a855f7' : 'rgba(255,255,255,0.4)'} strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? undefined : '4 2'}
              pointerEvents="none"
            />
          </g>
        );
      }
      default:
        return null;
    }
  };

  const renderPreview = () => {
    if (!drawing) return null;
    switch (activeTool) {
      case 'line':
      case 'arrow':
      case 'curved-arrow':
      case 'distance':
        return <line x1={`${startPos.x}%`} y1={`${startPos.y}%`} x2={`${currentPos.x}%`} y2={`${currentPos.y}%`}
          stroke={activeColor} strokeWidth={strokeWidth} strokeDasharray="4" opacity={0.7} />;
      case 'rect': {
        const x = Math.min(startPos.x, currentPos.x), y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x), h = Math.abs(currentPos.y - startPos.y);
        return <rect x={`${x}%`} y={`${y}%`} width={`${w}%`} height={`${h}%`}
          stroke={activeColor} strokeWidth={strokeWidth} fill={activeColor} fillOpacity={fillOpacity * 0.5}
          strokeDasharray="4" opacity={0.7} />;
      }
      case 'circle':
      case 'spotlight': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const r = Math.max(Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y)) / 2;
        const previewColor = activeTool === 'spotlight' ? '#ffff00' : activeColor;
        return <circle cx={`${cx}%`} cy={`${cy}%`} r={`${r}%`}
          stroke={previewColor} strokeWidth={strokeWidth}
          fill={previewColor} fillOpacity={fillOpacity * 0.3}
          strokeDasharray="4" opacity={0.7} />;
      }
      case 'semi-circle':
      case 'space-oval': {
        const cx = (startPos.x + currentPos.x) / 2;
        const cy = (startPos.y + currentPos.y) / 2;
        const rx = Math.abs(currentPos.x - startPos.x) / 2 || 2;
        const ry = Math.abs(currentPos.y - startPos.y) / 2 || 1;
        return <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          stroke={activeColor} strokeWidth={strokeWidth * 0.5}
          fill={activeColor} fillOpacity={fillOpacity * 0.3}
          strokeDasharray="3 2" opacity={0.7} />;
      }
      case 'vision-cone': {
        const dx = currentPos.x - startPos.x, dy = currentPos.y - startPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const spread = 40 * Math.PI / 180 / 2;
        const x1 = startPos.x + len * Math.cos(angle - spread);
        const y1 = startPos.y + len * Math.sin(angle - spread);
        const x2 = startPos.x + len * Math.cos(angle + spread);
        const y2 = startPos.y + len * Math.sin(angle + spread);
        return <path d={`M ${startPos.x} ${startPos.y} L ${x1} ${y1} A ${len} ${len} 0 0 1 ${x2} ${y2} Z`}
          fill={activeColor} fillOpacity={0.15} stroke={activeColor} strokeWidth={1} opacity={0.7} />;
      }
      default:
        return null;
    }
  };

  const renderResizeHandles = () => {
    if (activeTool !== 'select' || !selectedId) return null;
    const el = elements.find(e => e.id === selectedId);
    if (!el) return null;

    const handleSize = 8;
    const hitSize = 20;
    type HandleDef = { handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'; x: number; y: number; cursor: string };
    let handles: HandleDef[] = [];
    let bbox: { x: number; y: number; w: number; h: number } | null = null;

    if ((el.type === 'rect' || el.type === 'space-oval' || el.type === 'image-layer') && el.width !== undefined && el.height !== undefined) {
      const x = el.x, y = el.y, w = el.width, h = el.height;
      bbox = { x, y, w, h };
      handles = [
        { handle: 'nw', x, y, cursor: 'nwse-resize' },
        { handle: 'ne', x: x + w, y, cursor: 'nesw-resize' },
        { handle: 'sw', x, y: y + h, cursor: 'nesw-resize' },
        { handle: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
        { handle: 'n', x: x + w / 2, y, cursor: 'ns-resize' },
        { handle: 's', x: x + w / 2, y: y + h, cursor: 'ns-resize' },
        { handle: 'e', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
        { handle: 'w', x, y: y + h / 2, cursor: 'ew-resize' },
      ];
    } else if ((el.type === 'circle' || el.type === 'spotlight' || el.type === 'player-marker' || el.type === 'semi-circle') && el.radius !== undefined) {
      const r = el.radius;
      bbox = { x: el.x - r, y: el.y - r, w: r * 2, h: r * 2 };
      handles = [
        { handle: 'ne', x: el.x + r, y: el.y - r, cursor: 'nesw-resize' },
        { handle: 'se', x: el.x + r, y: el.y + r, cursor: 'nwse-resize' },
        { handle: 'sw', x: el.x - r, y: el.y + r, cursor: 'nesw-resize' },
        { handle: 'nw', x: el.x - r, y: el.y - r, cursor: 'nwse-resize' },
        { handle: 'e', x: el.x + r, y: el.y, cursor: 'ew-resize' },
        { handle: 'w', x: el.x - r, y: el.y, cursor: 'ew-resize' },
        { handle: 'n', x: el.x, y: el.y - r, cursor: 'ns-resize' },
        { handle: 's', x: el.x, y: el.y + r, cursor: 'ns-resize' },
      ];
    } else if (el.x2 !== undefined && el.y2 !== undefined) {
      // Line/arrow endpoint handles — these use draggingEndpoint for proper click-release
      const epHandleSize = handleSize;
      const epHitSize = hitSize;
      const svgRect2 = svgRef.current?.getBoundingClientRect();
      const sw2 = svgRect2?.width || 1;
      const sh2 = svgRect2?.height || 1;
      const epHSX = (epHandleSize / sw2) * 100;
      const epHSY = (epHandleSize / sh2) * 100;
      const epHitX = (epHitSize / sw2) * 100;
      const epHitY = (epHitSize / sh2) * 100;

      const endpoints = [
        { key: 'start' as const, x: el.x, y: el.y },
        { key: 'end' as const, x: el.x2, y: el.y2 },
      ];

      return (
        <g>
          {endpoints.map(ep => (
            <g key={ep.key}>
              <rect
                x={`${ep.x - epHitX / 2}%`}
                y={`${ep.y - epHitY / 2}%`}
                width={`${epHitX}%`}
                height={`${epHitY}%`}
                fill="transparent"
                style={{ cursor: 'move' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingEndpoint({ id: el.id, endpoint: ep.key });
                }}
              />
              <rect
                x={`${ep.x - epHSX / 2}%`}
                y={`${ep.y - epHSY / 2}%`}
                width={`${epHSX}%`}
                height={`${epHSY}%`}
                rx="1" ry="1"
                fill="white"
                stroke="#a855f7"
                strokeWidth={2}
                style={{ cursor: 'move', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                pointerEvents="none"
              />
            </g>
          ))}
        </g>
      );
    }

    if (handles.length === 0) return null;

    const svgRect = svgRef.current?.getBoundingClientRect();
    const svgW = svgRect?.width || 1;
    const svgH = svgRect?.height || 1;
    const hSizePctX = (handleSize / svgW) * 100;
    const hSizePctY = (handleSize / svgH) * 100;
    const hitSizePctX = (hitSize / svgW) * 100;
    const hitSizePctY = (hitSize / svgH) * 100;

    return (
      <g>
        {bbox && (
          <rect
            x={`${bbox.x}%`} y={`${bbox.y}%`}
            width={`${bbox.w}%`} height={`${bbox.h}%`}
            fill="none" stroke="#a855f7" strokeWidth={1.5}
            strokeDasharray="6 3" opacity={0.8}
            pointerEvents="none"
          />
        )}
        {handles.map(h => (
          <g key={h.handle}>
            <rect
              x={`${h.x - hitSizePctX / 2}%`}
              y={`${h.y - hitSizePctY / 2}%`}
              width={`${hitSizePctX}%`}
              height={`${hitSizePctY}%`}
              fill="transparent"
              style={{ cursor: h.cursor }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizing({
                  id: el.id,
                  handle: h.handle,
                  startPos: getPos(e),
                  startEl: { x: el.x, y: el.y, width: el.width, height: el.height, radius: el.radius, x2: el.x2, y2: el.y2, fontSize: el.fontSize },
                });
              }}
            />
            <rect
              x={`${h.x - hSizePctX / 2}%`}
              y={`${h.y - hSizePctY / 2}%`}
              width={`${hSizePctX}%`}
              height={`${hSizePctY}%`}
              rx="1" ry="1"
              fill="white"
              stroke="#a855f7"
              strokeWidth={2}
              style={{ cursor: h.cursor, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
              pointerEvents="none"
            />
          </g>
        ))}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
      style={{ cursor: resizing || draggingEndpoint ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {sortedElements.map(renderElement)}
      {renderPreview()}
      {renderResizeHandles()}
    </svg>
  );
};