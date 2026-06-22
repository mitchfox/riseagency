import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MousePointer, Circle as CircleIcon, ArrowRight, MapPin, Hexagon, Minus, Square, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiagramToken = {
  id: string;
  kind: "player" | "cone" | "ball" | "gate";
  x: number; // 0-100
  y: number; // 0-100
  label?: string;
  color?: string;
};
export type DiagramArrow = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: "pass" | "run" | "dribble" | "shot";
};
// Static pitch markers drawn between two points: a plain line, a solid wall,
// and a small rebounder wall (think 1-2 metre bounce board the player passes
// against). All three are two-point shapes so they share the same drawing
// flow as arrows.
export type DiagramShape = {
  id: string;
  kind: "line" | "wall" | "rebounder";
  from: { x: number; y: number };
  to: { x: number; y: number };
};
export type DrillDiagram = {
  pitch: "full" | "half";
  orientation: "horizontal" | "vertical";
  tokens: DiagramToken[];
  arrows: DiagramArrow[];
  shapes?: DiagramShape[];
};

export const emptyDiagram = (): DrillDiagram => ({
  pitch: "half",
  orientation: "horizontal",
  tokens: [],
  arrows: [],
  shapes: [],
});

const uid = () => Math.random().toString(36).slice(2, 10);

const ARROW_STYLES: Record<DiagramArrow["kind"], { stroke: string; dash: string; label: string }> = {
  pass: { stroke: "#22c55e", dash: "0", label: "Pass" },
  run: { stroke: "#3b82f6", dash: "6 4", label: "Run" },
  dribble: { stroke: "#f59e0b", dash: "2 3", label: "Dribble" },
  shot: { stroke: "#ef4444", dash: "0", label: "Shot" },
};

const SHAPE_STYLES: Record<DiagramShape["kind"], { stroke: string; fill: string; width: number; label: string }> = {
  line: { stroke: "white", fill: "none", width: 0.6, label: "Line" },
  wall: { stroke: "#e5e7eb", fill: "#9ca3af", width: 1.6, label: "Wall" },
  rebounder: { stroke: "#fbbf24", fill: "#7c2d12", width: 1.4, label: "Rebounder" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  initial: DrillDiagram | null;
  onSave: (diagram: DrillDiagram) => void;
  title?: string;
}

type Tool = "select" | "player" | "cone" | "ball" | "gate" | "arrow" | "line" | "wall" | "rebounder";

export const DrillDiagramEditor = ({ open, onClose, initial, onSave, title = "Diagram" }: Props) => {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DrillDiagramInline
          initial={initial}
          onCancel={onClose}
          onSave={(d) => { onSave(d); onClose(); }}
        />
      </DialogContent>
    </Dialog>
  );
};

interface InlineProps {
  initial: DrillDiagram | null;
  onSave: (diagram: DrillDiagram) => void;
  onCancel?: () => void;
  /** Tightens the pitch to this max width (px). Defaults to 360 for inline use. */
  maxWidth?: number;
}

/**
 * Inline diagram editor body. Used directly inside drill cards so editors
 * don't have to open a full-screen dialog on desktop (the dialog was too
 * large to interact with on standard laptop screens).
 */
export const DrillDiagramInline = ({ initial, onSave, onCancel, maxWidth = 360 }: InlineProps) => {
  const [diagram, setDiagram] = useState<DrillDiagram>(emptyDiagram());
  const [tool, setTool] = useState<Tool>("select");
  const [arrowKind, setArrowKind] = useState<DiagramArrow["kind"]>("pass");
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragShape, setDragShape] = useState<{ id: string; offX: number; offY: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const draggedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const init = initial ?? emptyDiagram();
    setDiagram({ ...init, shapes: init.shapes ?? [] });
    setTool("select");
    setArrowStart(null);
    setShapeStart(null);
    setSelectedId(null);
  }, [initial]);

  const toCoords = (evt: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const e = "touches" in evt ? evt.touches[0] : evt;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleSvgClick = (evt: React.MouseEvent) => {
    // Suppress the click that follows a drag/release on a token or shape so
    // we don't accidentally place a new item where the user just dropped one.
    if (draggedRef.current) { draggedRef.current = false; return; }
    if (dragId || dragShape) return;
    if (tool === "select") { setSelectedId(null); return; }
    const { x, y } = toCoords(evt);
    if (tool === "arrow") {
      if (!arrowStart) {
        setArrowStart({ x, y });
      } else {
        setDiagram(d => ({ ...d, arrows: [...d.arrows, { id: uid(), from: arrowStart, to: { x, y }, kind: arrowKind }] }));
        setArrowStart(null);
      }
      return;
    }
    if (tool === "line" || tool === "wall" || tool === "rebounder") {
      if (!shapeStart) {
        setShapeStart({ x, y });
      } else {
        setDiagram(d => ({
          ...d,
          shapes: [...(d.shapes ?? []), { id: uid(), kind: tool, from: shapeStart, to: { x, y } }],
        }));
        setShapeStart(null);
      }
      return;
    }
    const kind = tool as DiagramToken["kind"];
    const label = kind === "player" ? String(diagram.tokens.filter(t => t.kind === "player").length + 1) : "";
    setDiagram(d => ({ ...d, tokens: [...d.tokens, { id: uid(), kind, x, y, label }] }));
  };

  // Dragging works from any tool when the press starts on an existing item.
  // This makes the editor feel more like a normal canvas — you don't have to
  // remember to switch back to the Select tool just to nudge a token.
  const startDragToken = (id: string) => (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setDragId(id);
    setSelectedId(id);
    draggedRef.current = false;
  };

  const startDragShape = (id: string) => (evt: React.MouseEvent) => {
    evt.stopPropagation();
    const { x, y } = toCoords(evt);
    const sh = (diagram.shapes ?? []).find(s => s.id === id);
    if (!sh) return;
    const mx = (sh.from.x + sh.to.x) / 2;
    const my = (sh.from.y + sh.to.y) / 2;
    setDragShape({ id, offX: x - mx, offY: y - my });
    setSelectedId(id);
    draggedRef.current = false;
  };

  const handleMouseMove = (evt: React.MouseEvent) => {
    if (dragId) {
      const { x, y } = toCoords(evt);
      draggedRef.current = true;
      setDiagram(d => ({ ...d, tokens: d.tokens.map(t => (t.id === dragId ? { ...t, x, y } : t)) }));
      return;
    }
    if (dragShape) {
      const { x, y } = toCoords(evt);
      draggedRef.current = true;
      setDiagram(d => ({
        ...d,
        shapes: (d.shapes ?? []).map(s => {
          if (s.id !== dragShape.id) return s;
          const mx = (s.from.x + s.to.x) / 2;
          const my = (s.from.y + s.to.y) / 2;
          const dx = x - dragShape.offX - mx;
          const dy = y - dragShape.offY - my;
          return { ...s, from: { x: s.from.x + dx, y: s.from.y + dy }, to: { x: s.to.x + dx, y: s.to.y + dy } };
        }),
      }));
    }
  };

  const endDrag = () => { setDragId(null); setDragShape(null); };

  const removeToken = (id: string) =>
    setDiagram(d => ({ ...d, tokens: d.tokens.filter(t => t.id !== id) }));
  const removeArrow = (id: string) =>
    setDiagram(d => ({ ...d, arrows: d.arrows.filter(a => a.id !== id) }));
  const removeShape = (id: string) =>
    setDiagram(d => ({ ...d, shapes: (d.shapes ?? []).filter(s => s.id !== id) }));

  const clearAll = () => setDiagram(d => ({ ...d, tokens: [], arrows: [], shapes: [] }));

  const renderPitch = () => {
    const isHalf = diagram.pitch === "half";
    return (
      <g>
        <rect x="0" y="0" width="100" height="100" fill="hsl(140 45% 25%)" />
        {/* outer line */}
        <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
        {isHalf ? (
          <>
            {/* halfway top */}
            <line x1="2" y1="98" x2="98" y2="98" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
            {/* penalty area at the top */}
            <rect x="22" y="2" width="56" height="22" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
            <rect x="36" y="2" width="28" height="9" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
            <circle cx="50" cy="16" r="0.8" fill="white" />
          </>
        ) : (
          <>
            <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
            <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
            <rect x="22" y="2" width="56" height="18" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="0.3" />
            <rect x="22" y="80" width="56" height="18" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="0.3" />
          </>
        )}
      </g>
    );
  };

  const tools: { id: Tool; label: string; icon: any }[] = [
    { id: "select", label: "Select", icon: MousePointer },
    { id: "player", label: "Player", icon: CircleIcon },
    { id: "cone", label: "Cone", icon: Hexagon },
    { id: "ball", label: "Ball", icon: CircleIcon },
    { id: "gate", label: "Gate", icon: MapPin },
    { id: "arrow", label: "Arrow", icon: ArrowRight },
    { id: "line", label: "Line", icon: Minus },
    { id: "wall", label: "Wall", icon: Square },
    { id: "rebounder", label: "Rebounder", icon: RectangleHorizontal },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
          {tools.map(t => {
            const Icon = t.icon;
            return (
              <Button
                key={t.id}
                size="sm"
                variant={tool === t.id ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => { setTool(t.id); setArrowStart(null); setShapeStart(null); setSelectedId(null); }}
              >
                <Icon className="w-3 h-3 mr-1" /> {t.label}
              </Button>
            );
          })}
          {tool === "arrow" && (
            <Select value={arrowKind} onValueChange={(v: any) => setArrowKind(v)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ARROW_STYLES) as DiagramArrow["kind"][]).map(k => (
                  <SelectItem key={k} value={k}>{ARROW_STYLES[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Select value={diagram.pitch} onValueChange={(v: any) => setDiagram(d => ({ ...d, pitch: v }))}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="half">Half pitch</SelectItem>
                <SelectItem value="full">Full pitch</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={clearAll}><Trash2 className="w-3 h-3 mr-1" />Clear</Button>
          </div>
      </div>

      <div className="relative w-full" style={{ aspectRatio: "3 / 4", maxWidth }}>
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={cn("absolute inset-0 w-full h-full rounded-md border touch-none", tool !== "select" && "cursor-crosshair")}
            onClick={handleSvgClick}
            onMouseMove={handleMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            {renderPitch()}

            {(diagram.shapes ?? []).map(s => {
              const st = SHAPE_STYLES[s.kind];
              const isSelected = selectedId === s.id;
              const dx = s.to.x - s.from.x;
              const dy = s.to.y - s.from.y;
              const len = Math.max(0.001, Math.hypot(dx, dy));
              const nx = -dy / len;
              const ny = dx / len;
              const half = st.width / 2;
              const handleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedId(s.id);
              };
              const handleDouble = (e: React.MouseEvent) => { e.stopPropagation(); removeShape(s.id); };
              if (s.kind === "line") {
                return (
                  <g key={s.id} onMouseDown={startDragShape(s.id)} onClick={handleClick} onDoubleClick={handleDouble} style={{ cursor: "grab" }}>
                    {/* fat invisible hit area for easier grabbing */}
                    <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke="transparent" strokeWidth="4" />
                    <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke={st.stroke} strokeWidth={st.width} strokeDasharray="3 2" strokeLinecap="round" opacity={0.9} />
                    {isSelected && <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke="#C6A332" strokeWidth={st.width + 0.6} opacity={0.4} />}
                  </g>
                );
              }
              // wall + rebounder draw as a thick rotated rectangle so the
              // shape conveys depth (you can see which side the ball bounces).
              const p1 = { x: s.from.x + nx * half, y: s.from.y + ny * half };
              const p2 = { x: s.to.x + nx * half, y: s.to.y + ny * half };
              const p3 = { x: s.to.x - nx * half, y: s.to.y - ny * half };
              const p4 = { x: s.from.x - nx * half, y: s.from.y - ny * half };
              const pts = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
              return (
                <g key={s.id} onMouseDown={startDragShape(s.id)} onClick={handleClick} onDoubleClick={handleDouble} style={{ cursor: "grab" }}>
                  {/* invisible thick hit area */}
                  <line x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke="transparent" strokeWidth={Math.max(5, st.width + 3)} />
                  <polygon points={pts} fill={st.fill} stroke={st.stroke} strokeWidth="0.25" />
                  {s.kind === "rebounder" && (
                    // brick-like hash marks down the centre to read as a bounce board
                    <line x1={(s.from.x + s.to.x) / 2 - dx * 0.18} y1={(s.from.y + s.to.y) / 2 - dy * 0.18}
                          x2={(s.from.x + s.to.x) / 2 + dx * 0.18} y2={(s.from.y + s.to.y) / 2 + dy * 0.18}
                          stroke="#fde68a" strokeWidth="0.25" strokeDasharray="0.6 0.6" />
                  )}
                  {isSelected && <polygon points={pts} fill="none" stroke="#C6A332" strokeWidth="0.4" />}
                </g>
              );
            })}

            {diagram.arrows.map(a => {
              const s = ARROW_STYLES[a.kind];
              const isSelected = selectedId === a.id;
              return (
                <g key={a.id}
                   onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}
                   onDoubleClick={(e) => { e.stopPropagation(); removeArrow(a.id); }}>
                  <defs>
                    <marker id={`arr-${a.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                      <path d="M0,0 L10,5 L0,10 z" fill={s.stroke} />
                    </marker>
                  </defs>
                  {/* invisible hit area */}
                  <line x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke="transparent" strokeWidth="4" />
                  <line
                    x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y}
                    stroke={s.stroke} strokeWidth="0.8" strokeDasharray={s.dash}
                    markerEnd={`url(#arr-${a.id})`}
                  />
                  {isSelected && <line x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke="#C6A332" strokeWidth="1.6" opacity={0.35} />}
                </g>
              );
            })}

            {(arrowStart || shapeStart) && (
              <circle cx={(arrowStart || shapeStart)!.x} cy={(arrowStart || shapeStart)!.y} r="1" fill="white" />
            )}

            {diagram.tokens.map(t => {
              const onPointerDown = startDragToken(t.id);
              const onClickToken = (e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(t.id); };
              const onDouble = (e: React.MouseEvent) => { e.stopPropagation(); removeToken(t.id); };
              const isSelected = selectedId === t.id;
              const commonStyle = { cursor: dragId === t.id ? "grabbing" : "grab" } as React.CSSProperties;
              if (t.kind === "player") {
                return (
                  <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={commonStyle}>
                    {/* invisible larger hit area makes it easier to grab on touch */}
                    <circle cx={t.x} cy={t.y} r="4.5" fill="transparent" />
                    {isSelected && <circle cx={t.x} cy={t.y} r="3.6" fill="none" stroke="#C6A332" strokeWidth="0.4" />}
                    <circle cx={t.x} cy={t.y} r="2.6" fill="#C6A332" stroke="white" strokeWidth="0.3" />
                    <text x={t.x} y={t.y + 0.9} textAnchor="middle" fontSize="2.4" fill="#0f0f0f" fontWeight="700">{t.label}</text>
                  </g>
                );
              }
              if (t.kind === "cone") {
                return (
                  <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={commonStyle}>
                    <circle cx={t.x} cy={t.y} r="4" fill="transparent" />
                    {isSelected && <circle cx={t.x} cy={t.y} r="3" fill="none" stroke="#C6A332" strokeWidth="0.4" />}
                    <polygon
                      points={`${t.x},${t.y - 2} ${t.x - 1.6},${t.y + 1.4} ${t.x + 1.6},${t.y + 1.4}`}
                      fill="#f59e0b" stroke="white" strokeWidth="0.2"
                    />
                  </g>
                );
              }
              if (t.kind === "ball") {
                return (
                  <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={commonStyle}>
                    <circle cx={t.x} cy={t.y} r="3.5" fill="transparent" />
                    {isSelected && <circle cx={t.x} cy={t.y} r="2.4" fill="none" stroke="#C6A332" strokeWidth="0.4" />}
                    <circle cx={t.x} cy={t.y} r="1.4" fill="white" stroke="black" strokeWidth="0.2" />
                  </g>
                );
              }
              // gate: two cones
              return (
                <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={commonStyle}>
                  <rect x={t.x - 4} y={t.y - 2.5} width="8" height="5" fill="transparent" />
                  {isSelected && <rect x={t.x - 3.2} y={t.y - 1.8} width="6.4" height="3.6" fill="none" stroke="#C6A332" strokeWidth="0.3" />}
                  <circle cx={t.x - 2} cy={t.y} r="1" fill="#f59e0b" />
                  <circle cx={t.x + 2} cy={t.y} r="1" fill="#f59e0b" />
                </g>
              );
            })}
          </svg>
        </div>
        <p className="text-xs text-muted-foreground">
          {tool === "arrow"
            ? arrowStart ? "Click the end point to finish the arrow." : "Click the start point of the arrow."
            : tool === "line" || tool === "wall" || tool === "rebounder"
            ? shapeStart ? `Click the end point to finish the ${tool}.` : `Click the start point of the ${tool}. Walls and rebounders are placed between two points.`
            : tool === "select" ? "Drag tokens to reposition. Double-click to remove."
            : "Click on the pitch to place. You can drag any item at any time."}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(diagram); onClose(); }}><Plus className="w-3.5 h-3.5 mr-1" />Save diagram</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ViewProps {
  diagram: DrillDiagram | null;
  className?: string;
}

export const DrillDiagramView = ({ diagram, className }: ViewProps) => {
  if (!diagram) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("w-full rounded-md border", className)} style={{ aspectRatio: "3 / 4" }}>
      <rect x="0" y="0" width="100" height="100" fill="hsl(140 45% 25%)" />
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
      {diagram.pitch === "half" ? (
        <>
          <rect x="22" y="2" width="56" height="22" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
          <rect x="36" y="2" width="28" height="9" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.3" />
        </>
      ) : (
        <>
          <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
        </>
      )}
      {diagram.arrows.map(a => {
        const s = ARROW_STYLES[a.kind];
        return (
          <g key={a.id}>
            <defs>
              <marker id={`v-arr-${a.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={s.stroke} />
              </marker>
            </defs>
            <line x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke={s.stroke} strokeWidth="0.8" strokeDasharray={s.dash} markerEnd={`url(#v-arr-${a.id})`} />
          </g>
        );
      })}
      {(diagram.shapes ?? []).map(s => {
        const st = SHAPE_STYLES[s.kind];
        const dx = s.to.x - s.from.x;
        const dy = s.to.y - s.from.y;
        const len = Math.max(0.001, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const half = st.width / 2;
        if (s.kind === "line") {
          return <line key={s.id} x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y} stroke={st.stroke} strokeWidth={st.width} strokeDasharray="3 2" strokeLinecap="round" opacity={0.9} />;
        }
        const p1 = { x: s.from.x + nx * half, y: s.from.y + ny * half };
        const p2 = { x: s.to.x + nx * half, y: s.to.y + ny * half };
        const p3 = { x: s.to.x - nx * half, y: s.to.y - ny * half };
        const p4 = { x: s.from.x - nx * half, y: s.from.y - ny * half };
        return (
          <g key={s.id}>
            <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`} fill={st.fill} stroke={st.stroke} strokeWidth="0.25" />
            {s.kind === "rebounder" && (
              <line x1={(s.from.x + s.to.x) / 2 - dx * 0.18} y1={(s.from.y + s.to.y) / 2 - dy * 0.18}
                    x2={(s.from.x + s.to.x) / 2 + dx * 0.18} y2={(s.from.y + s.to.y) / 2 + dy * 0.18}
                    stroke="#fde68a" strokeWidth="0.25" strokeDasharray="0.6 0.6" />
            )}
          </g>
        );
      })}
      {diagram.tokens.map(t => {
        if (t.kind === "player") {
          return (
            <g key={t.id}>
              <circle cx={t.x} cy={t.y} r="2.6" fill="#C6A332" stroke="white" strokeWidth="0.3" />
              <text x={t.x} y={t.y + 0.9} textAnchor="middle" fontSize="2.4" fill="#0f0f0f" fontWeight="700">{t.label}</text>
            </g>
          );
        }
        if (t.kind === "cone") {
          return <polygon key={t.id} points={`${t.x},${t.y - 2} ${t.x - 1.6},${t.y + 1.4} ${t.x + 1.6},${t.y + 1.4}`} fill="#f59e0b" stroke="white" strokeWidth="0.2" />;
        }
        if (t.kind === "ball") {
          return <circle key={t.id} cx={t.x} cy={t.y} r="1.4" fill="white" stroke="black" strokeWidth="0.2" />;
        }
        return (
          <g key={t.id}>
            <circle cx={t.x - 2} cy={t.y} r="1" fill="#f59e0b" />
            <circle cx={t.x + 2} cy={t.y} r="1" fill="#f59e0b" />
          </g>
        );
      })}
    </svg>
  );
};