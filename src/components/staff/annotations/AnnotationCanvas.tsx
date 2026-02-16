import { useRef, useState, useCallback, useEffect } from "react";
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
}

export const AnnotationCanvas = ({
  elements, setElements, activeTool, activeColor, strokeWidth,
  selectedId, setSelectedId, videoRef,
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);

    if (activeTool === 'select') {
      // Check if clicked on element
      const target = (e.target as SVGElement).closest('[data-element-id]');
      if (target) {
        const id = target.getAttribute('data-element-id')!;
        setSelectedId(id);
        const el = elements.find(el => el.id === id);
        if (el) {
          setDragging({ id, offX: pos.x - el.x, offY: pos.y - el.y });
        }
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
        id: crypto.randomUUID(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        color: activeColor,
        strokeWidth,
        text,
        fontSize: 3,
      }]);
      return;
    }

    if (activeTool === 'player-marker') {
      const num = prompt('Player number:');
      if (!num) return;
      setElements(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'player-marker',
        x: pos.x,
        y: pos.y,
        color: activeColor,
        strokeWidth,
        number: parseInt(num) || 0,
        radius: 2.5,
      }]);
      return;
    }

    setDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
    if (activeTool === 'freehand') {
      setFreehandPoints([pos]);
    }
  }, [activeTool, activeColor, strokeWidth, elements, getPos, setElements, setSelectedId]);

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
    const base = { id, color: activeColor, strokeWidth, opacity: 1 };

    switch (activeTool) {
      case 'line':
        setElements(prev => [...prev, { ...base, type: 'line', x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        break;
      case 'arrow':
        setElements(prev => [...prev, { ...base, type: 'arrow', x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        break;
      case 'curve':
        setElements(prev => [...prev, { ...base, type: 'curve', x: startPos.x, y: startPos.y, x2: currentPos.x, y2: currentPos.y }]);
        break;
      case 'rect':
        setElements(prev => [...prev, {
          ...base, type: 'rect',
          x: Math.min(startPos.x, currentPos.x), y: Math.min(startPos.y, currentPos.y),
          width: Math.abs(currentPos.x - startPos.x), height: Math.abs(currentPos.y - startPos.y),
        }]);
        break;
      case 'circle':
        const r = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
        setElements(prev => [...prev, { ...base, type: 'circle', x: startPos.x, y: startPos.y, radius: r }]);
        break;
      case 'spotlight': {
        const sr = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
        setElements(prev => [...prev, { ...base, type: 'spotlight', x: startPos.x, y: startPos.y, radius: sr, color: '#ffff00', opacity: 0.3 }]);
        break;
      }
      case 'freehand':
        if (freehandPoints.length > 2) {
          setElements(prev => [...prev, { ...base, type: 'freehand', x: 0, y: 0, points: freehandPoints }]);
        }
        setFreehandPoints([]);
        break;
    }
  }, [drawing, dragging, activeTool, startPos, currentPos, activeColor, strokeWidth, freehandPoints, setElements]);

  const renderElement = (el: AnnotationElement) => {
    const isSelected = el.id === selectedId;
    const selStyle = isSelected ? { filter: 'drop-shadow(0 0 3px rgba(168,85,247,0.8))' } : {};

    switch (el.type) {
      case 'line':
        return (
          <line
            key={el.id}
            data-element-id={el.id}
            x1={`${el.x}%`} y1={`${el.y}%`}
            x2={`${el.x2}%`} y2={`${el.y2}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      case 'arrow': {
        const markerId = `arrow-${el.id}`;
        return (
          <g key={el.id} data-element-id={el.id} style={{ cursor: 'pointer', ...selStyle }}>
            <defs>
              <marker id={markerId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={el.color} />
              </marker>
            </defs>
            <line
              x1={`${el.x}%`} y1={`${el.y}%`}
              x2={`${el.x2}%`} y2={`${el.y2}%`}
              stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
              markerEnd={`url(#${markerId})`}
            />
          </g>
        );
      }
      case 'curve': {
        const midX = (el.x + (el.x2 || 0)) / 2;
        const midY = Math.min(el.y, el.y2 || 0) - 10;
        return (
          <path
            key={el.id}
            data-element-id={el.id}
            d={`M ${el.x}% ${el.y}% Q ${midX}% ${midY}% ${el.x2}% ${el.y2}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round"
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      }
      case 'rect':
        return (
          <rect
            key={el.id}
            data-element-id={el.id}
            x={`${el.x}%`} y={`${el.y}%`}
            width={`${el.width}%`} height={`${el.height}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none"
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      case 'circle':
        return (
          <circle
            key={el.id}
            data-element-id={el.id}
            cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none"
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      case 'spotlight':
        return (
          <circle
            key={el.id}
            data-element-id={el.id}
            cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius}%`}
            fill={el.color} fillOpacity={el.opacity || 0.3} stroke={el.color} strokeWidth={1}
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      case 'text':
        return (
          <text
            key={el.id}
            data-element-id={el.id}
            x={`${el.x}%`} y={`${el.y}%`}
            fill={el.color}
            fontSize={`${el.fontSize || 3}%`}
            fontFamily="sans-serif"
            fontWeight="bold"
            style={{ cursor: 'pointer', ...selStyle }}
          >
            {el.text}
          </text>
        );
      case 'player-marker':
        return (
          <g key={el.id} data-element-id={el.id} style={{ cursor: 'pointer', ...selStyle }}>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${el.radius || 2.5}%`} fill={el.color} fillOpacity={0.85} stroke="white" strokeWidth={1.5} />
            <text x={`${el.x}%`} y={`${el.y}%`} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="2.2%" fontWeight="bold">
              {el.number}
            </text>
          </g>
        );
      case 'freehand':
        if (!el.points || el.points.length < 2) return null;
        const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ');
        return (
          <path
            key={el.id}
            data-element-id={el.id}
            d={d}
            stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"
            style={{ cursor: 'pointer', ...selStyle }}
          />
        );
      default:
        return null;
    }
  };

  // Render in-progress drawing
  const renderPreview = () => {
    if (!drawing) return null;
    switch (activeTool) {
      case 'line':
        return <line x1={`${startPos.x}%`} y1={`${startPos.y}%`} x2={`${currentPos.x}%`} y2={`${currentPos.y}%`} stroke={activeColor} strokeWidth={strokeWidth} strokeDasharray="4" opacity={0.7} />;
      case 'arrow':
        return <line x1={`${startPos.x}%`} y1={`${startPos.y}%`} x2={`${currentPos.x}%`} y2={`${currentPos.y}%`} stroke={activeColor} strokeWidth={strokeWidth} strokeDasharray="4" opacity={0.7} />;
      case 'rect': {
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x);
        const h = Math.abs(currentPos.y - startPos.y);
        return <rect x={`${x}%`} y={`${y}%`} width={`${w}%`} height={`${h}%`} stroke={activeColor} strokeWidth={strokeWidth} fill="none" strokeDasharray="4" opacity={0.7} />;
      }
      case 'circle': {
        const r = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
        return <circle cx={`${startPos.x}%`} cy={`${startPos.y}%`} r={`${r}%`} stroke={activeColor} strokeWidth={strokeWidth} fill="none" strokeDasharray="4" opacity={0.7} />;
      }
      case 'spotlight': {
        const r = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
        return <circle cx={`${startPos.x}%`} cy={`${startPos.y}%`} r={`${r}%`} fill="#ffff00" fillOpacity={0.2} stroke="#ffff00" strokeWidth={1} />;
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

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {elements.map(renderElement)}
      {renderPreview()}
    </svg>
  );
};
