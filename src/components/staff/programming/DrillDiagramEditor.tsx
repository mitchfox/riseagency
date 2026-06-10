import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MousePointer, Circle as CircleIcon, ArrowRight, MapPin, Hexagon } from "lucide-react";
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
export type DrillDiagram = {
  pitch: "full" | "half";
  orientation: "horizontal" | "vertical";
  tokens: DiagramToken[];
  arrows: DiagramArrow[];
};

export const emptyDiagram = (): DrillDiagram => ({
  pitch: "half",
  orientation: "horizontal",
  tokens: [],
  arrows: [],
});

const uid = () => Math.random().toString(36).slice(2, 10);

const ARROW_STYLES: Record<DiagramArrow["kind"], { stroke: string; dash: string; label: string }> = {
  pass: { stroke: "#22c55e", dash: "0", label: "Pass" },
  run: { stroke: "#3b82f6", dash: "6 4", label: "Run" },
  dribble: { stroke: "#f59e0b", dash: "2 3", label: "Dribble" },
  shot: { stroke: "#ef4444", dash: "0", label: "Shot" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  initial: DrillDiagram | null;
  onSave: (diagram: DrillDiagram) => void;
  title?: string;
}

type Tool = "select" | "player" | "cone" | "ball" | "gate" | "arrow";

export const DrillDiagramEditor = ({ open, onClose, initial, onSave, title = "Diagram" }: Props) => {
  const [diagram, setDiagram] = useState<DrillDiagram>(emptyDiagram());
  const [tool, setTool] = useState<Tool>("select");
  const [arrowKind, setArrowKind] = useState<DiagramArrow["kind"]>("pass");
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (open) {
      setDiagram(initial ?? emptyDiagram());
      setTool("select");
      setArrowStart(null);
    }
  }, [open, initial]);

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
    if (tool === "select" || dragId) return;
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
    const kind = tool as DiagramToken["kind"];
    const label = kind === "player" ? String(diagram.tokens.filter(t => t.kind === "player").length + 1) : "";
    setDiagram(d => ({ ...d, tokens: [...d.tokens, { id: uid(), kind, x, y, label }] }));
  };

  const startDrag = (id: string) => (evt: React.MouseEvent) => {
    if (tool !== "select") return;
    evt.stopPropagation();
    setDragId(id);
  };

  const handleMouseMove = (evt: React.MouseEvent) => {
    if (!dragId) return;
    const { x, y } = toCoords(evt);
    setDiagram(d => ({ ...d, tokens: d.tokens.map(t => (t.id === dragId ? { ...t, x, y } : t)) }));
  };

  const removeToken = (id: string) =>
    setDiagram(d => ({ ...d, tokens: d.tokens.filter(t => t.id !== id) }));
  const removeArrow = (id: string) =>
    setDiagram(d => ({ ...d, arrows: d.arrows.filter(a => a.id !== id) }));

  const clearAll = () => setDiagram(d => ({ ...d, tokens: [], arrows: [] }));

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
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {tools.map(t => {
            const Icon = t.icon;
            return (
              <Button
                key={t.id}
                size="sm"
                variant={tool === t.id ? "default" : "outline"}
                onClick={() => { setTool(t.id); setArrowStart(null); }}
              >
                <Icon className="w-3.5 h-3.5 mr-1" /> {t.label}
              </Button>
            );
          })}
          {tool === "arrow" && (
            <Select value={arrowKind} onValueChange={(v: any) => setArrowKind(v)}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ARROW_STYLES) as DiagramArrow["kind"][]).map(k => (
                  <SelectItem key={k} value={k}>{ARROW_STYLES[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Select value={diagram.pitch} onValueChange={(v: any) => setDiagram(d => ({ ...d, pitch: v }))}>
              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="half">Half pitch</SelectItem>
                <SelectItem value="full">Full pitch</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={clearAll}><Trash2 className="w-3.5 h-3.5 mr-1" />Clear</Button>
          </div>
        </div>

        <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={cn("absolute inset-0 w-full h-full rounded-md border", tool !== "select" && "cursor-crosshair")}
            onClick={handleSvgClick}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDragId(null)}
            onMouseLeave={() => setDragId(null)}
          >
            {renderPitch()}

            {diagram.arrows.map(a => {
              const s = ARROW_STYLES[a.kind];
              return (
                <g key={a.id} onClick={(e) => { if (tool === "select") { e.stopPropagation(); removeArrow(a.id); } }}>
                  <defs>
                    <marker id={`arr-${a.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                      <path d="M0,0 L10,5 L0,10 z" fill={s.stroke} />
                    </marker>
                  </defs>
                  <line
                    x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y}
                    stroke={s.stroke} strokeWidth="0.8" strokeDasharray={s.dash}
                    markerEnd={`url(#arr-${a.id})`}
                  />
                </g>
              );
            })}

            {arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="1" fill="white" />
            )}

            {diagram.tokens.map(t => {
              const onPointerDown = startDrag(t.id);
              const onClickToken = (e: React.MouseEvent) => {
                if (tool === "select") { e.stopPropagation(); }
              };
              const onDouble = (e: React.MouseEvent) => { e.stopPropagation(); removeToken(t.id); };
              if (t.kind === "player") {
                return (
                  <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={{ cursor: tool === "select" ? "grab" : "default" }}>
                    <circle cx={t.x} cy={t.y} r="2.6" fill="#C6A332" stroke="white" strokeWidth="0.3" />
                    <text x={t.x} y={t.y + 0.9} textAnchor="middle" fontSize="2.4" fill="#0f0f0f" fontWeight="700">{t.label}</text>
                  </g>
                );
              }
              if (t.kind === "cone") {
                return (
                  <polygon
                    key={t.id}
                    points={`${t.x},${t.y - 2} ${t.x - 1.6},${t.y + 1.4} ${t.x + 1.6},${t.y + 1.4}`}
                    fill="#f59e0b"
                    stroke="white" strokeWidth="0.2"
                    onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble}
                    style={{ cursor: tool === "select" ? "grab" : "default" }}
                  />
                );
              }
              if (t.kind === "ball") {
                return (
                  <circle key={t.id} cx={t.x} cy={t.y} r="1.4" fill="white" stroke="black" strokeWidth="0.2"
                    onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble}
                    style={{ cursor: tool === "select" ? "grab" : "default" }}
                  />
                );
              }
              // gate: two cones
              return (
                <g key={t.id} onMouseDown={onPointerDown} onClick={onClickToken} onDoubleClick={onDouble} style={{ cursor: tool === "select" ? "grab" : "default" }}>
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
            : tool === "select" ? "Drag tokens to reposition. Double-click to remove."
            : "Click on the pitch to place."}
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