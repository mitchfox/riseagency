import { useState, useRef, useCallback, useEffect } from 'react';
import type { DesignElement } from './types';

interface CanvasElementProps {
  element: DesignElement;
  isSelected: boolean;
  zoom: number;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<DesignElement>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrag: (id: string, x: number, y: number, ctrlKey?: boolean) => void;
}

export function CanvasElement({
  element, isSelected, zoom, onSelect, onUpdate, onDragStart, onDragEnd, onDrag
}: CanvasElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, elX: 0, elY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, elX: 0, elY: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  const [bgUnlocked, setBgUnlocked] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (element.locked || isEditing) return;
    // Background elements require double-click to unlock first
    if (element.isBackground && !bgUnlocked) return;
    e.stopPropagation();
    onSelect(element.id, e.shiftKey);
    setIsDragging(true);
    onDragStart();
    dragStart.current = { x: e.clientX, y: e.clientY, elX: element.x, elY: element.y };
  }, [element, isEditing, onSelect, onDragStart, bgUnlocked]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (element.locked) return;
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: element.width, h: element.height, elX: element.x, elY: element.y };
  }, [element]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = (e.clientX - dragStart.current.x) / zoom;
        const dy = (e.clientY - dragStart.current.y) / zoom;
        onDrag(element.id, dragStart.current.elX + dx, dragStart.current.elY + dy, e.ctrlKey || e.metaKey);
      }
      if (isResizing && resizeHandle) {
        const dx = (e.clientX - resizeStart.current.x) / zoom;
        const dy = (e.clientY - resizeStart.current.y) / zoom;
        const proportional = !e.ctrlKey && !e.metaKey;
        const aspectRatio = resizeStart.current.w / resizeStart.current.h;

        let newW = resizeStart.current.w;
        let newH = resizeStart.current.h;
        let newX = resizeStart.current.elX;
        let newY = resizeStart.current.elY;

        const isCorner = ['nw', 'ne', 'se', 'sw'].includes(resizeHandle);

        if (resizeHandle.includes('e')) newW = Math.max(20, resizeStart.current.w + dx);
        if (resizeHandle.includes('w')) { newW = Math.max(20, resizeStart.current.w - dx); newX = resizeStart.current.elX + (resizeStart.current.w - newW); }
        if (resizeHandle.includes('s')) newH = Math.max(20, resizeStart.current.h + dy);
        if (resizeHandle.includes('n')) { newH = Math.max(20, resizeStart.current.h - dy); newY = resizeStart.current.elY + (resizeStart.current.h - newH); }

        // Proportional constraint for corners (unless Ctrl held)
        if (proportional && isCorner) {
          if (resizeHandle === 'se' || resizeHandle === 'ne') {
            newH = newW / aspectRatio;
            if (resizeHandle === 'ne') newY = resizeStart.current.elY + resizeStart.current.h - newH;
          } else {
            newW = newH * aspectRatio;
            if (resizeHandle === 'nw') { newX = resizeStart.current.elX + resizeStart.current.w - newW; newY = resizeStart.current.elY + resizeStart.current.h - newH; }
            if (resizeHandle === 'sw') { newX = resizeStart.current.elX + resizeStart.current.w - newW; }
          }
        }

        onUpdate(element.id, { width: Math.max(20, newW), height: Math.max(20, newH), x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, isResizing, resizeHandle, zoom, element.id, onDrag, onUpdate, onDragEnd]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.isBackground && !bgUnlocked) {
      setBgUnlocked(true);
      onSelect(element.id, false);
      return;
    }
    if (element.type === 'text' && !element.locked) {
      setIsEditing(true);
      setTimeout(() => textRef.current?.focus(), 50);
    }
  }, [element, bgUnlocked, onSelect]);

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
    if (textRef.current) {
      onUpdate(element.id, { text: textRef.current.innerText });
    }
  }, [element.id, onUpdate]);

  const renderShape = () => {
    const { shapeType, fill = '#3b82f6', stroke = 'transparent', strokeWidth = 0, borderRadius = 0 } = element;
    switch (shapeType) {
      case 'circle':
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <ellipse cx={element.width/2} cy={element.height/2} rx={element.width/2 - (strokeWidth||0)} ry={element.height/2 - (strokeWidth||0)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'triangle':
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={`${element.width/2},${strokeWidth||0} ${element.width - (strokeWidth||0)},${element.height - (strokeWidth||0)} ${strokeWidth||0},${element.height - (strokeWidth||0)}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'star': {
        const cx = element.width / 2, cy = element.height / 2;
        const outerR = Math.min(cx, cy) - (strokeWidth||0);
        const innerR = outerR * 0.4;
        const points = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      }
      case 'diamond':
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={`${element.width/2},${strokeWidth||0} ${element.width-(strokeWidth||0)},${element.height/2} ${element.width/2},${element.height-(strokeWidth||0)} ${strokeWidth||0},${element.height/2}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      case 'hexagon': {
        const hx = element.width / 2, hy = element.height / 2;
        const hr = Math.min(hx, hy) - (strokeWidth||0);
        const hpts = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          return `${hx + hr * Math.cos(angle)},${hy + hr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={hpts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      }
      case 'pentagon': {
        const px = element.width / 2, py = element.height / 2;
        const pr = Math.min(px, py) - (strokeWidth||0);
        const ppts = Array.from({ length: 5 }, (_, i) => {
          const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
          return `${px + pr * Math.cos(angle)},${py + pr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={ppts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      }
      case 'arrow':
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`}>
            <polygon points={`0,${element.height*0.3} ${element.width*0.6},${element.height*0.3} ${element.width*0.6},0 ${element.width},${element.height/2} ${element.width*0.6},${element.height} ${element.width*0.6},${element.height*0.7} 0,${element.height*0.7}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      default: // rectangle
        return (
          <div className="w-full h-full" style={{ backgroundColor: fill, border: strokeWidth ? `${strokeWidth}px solid ${stroke}` : 'none', borderRadius: `${borderRadius}px` }} />
        );
    }
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            ref={textRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleTextBlur}
            onKeyDown={e => { if (e.key === 'Escape') { setIsEditing(false); textRef.current?.blur(); } }}
            className="w-full h-full outline-none overflow-hidden"
            style={{
              fontSize: `${element.fontSize}px`,
              fontFamily: element.fontFamily,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textAlign: element.textAlign,
              textDecoration: element.textDecoration,
              textTransform: element.textTransform || 'none',
              color: element.color,
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              lineHeight: element.lineHeight || 1.2,
              textShadow: element.textShadow || undefined,
              cursor: isEditing ? 'text' : 'move',
              userSelect: isEditing ? 'text' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            {element.text}
          </div>
        );
      case 'image':
        return (
          <img
            src={element.src}
            alt={element.name}
            className="w-full h-full pointer-events-none"
            style={{
              objectFit: element.objectFit || 'contain',
              borderRadius: element.borderRadius ? `${element.borderRadius}px` : undefined,
              filter: element.filter && element.filter !== 'none' ? element.filter : undefined,
              imageRendering: 'auto' as const,
            }}
            draggable={false}
          />
        );
      case 'shape':
        return renderShape();
      case 'line':
        return <div className="w-full" style={{ height: `${element.strokeWidth || 2}px`, backgroundColor: element.fill || '#000', marginTop: (element.height - (element.strokeWidth || 2)) / 2 }} />;
      default:
        return null;
    }
  };

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const handlePositions: Record<string, React.CSSProperties> = {
    nw: { top: -7, left: -7, cursor: 'nwse-resize' },
    n: { top: -7, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
    ne: { top: -7, right: -7, cursor: 'nesw-resize' },
    e: { top: '50%', right: -7, transform: 'translateY(-50%)', cursor: 'ew-resize' },
    se: { bottom: -7, right: -7, cursor: 'nwse-resize' },
    s: { bottom: -7, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
    sw: { bottom: -7, left: -7, cursor: 'nesw-resize' },
    w: { top: '50%', left: -7, transform: 'translateY(-50%)', cursor: 'ew-resize' },
  };

  if (!element.visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.opacity,
        cursor: element.locked ? 'default' : isDragging ? 'grabbing' : 'move',
        zIndex: isSelected ? 999 : 'auto',
        outline: isSelected ? '4px solid #a855f7' : 'none',
        outlineOffset: '2px',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {renderContent()}
      {isSelected && !element.locked && (
        <>
          {handles.map(h => (
            <div
              key={h}
              onMouseDown={e => handleResizeMouseDown(e, h)}
              style={{
                position: 'absolute',
                width: 14,
                height: 14,
                backgroundColor: '#a855f7',
                border: '2px solid white',
                borderRadius: '50%',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                ...handlePositions[h],
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
