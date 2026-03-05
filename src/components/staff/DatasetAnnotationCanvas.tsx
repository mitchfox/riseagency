import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Square, Circle, Minus } from "lucide-react";

export interface BBox {
  x: number; // normalised 0-1
  y: number;
  width: number;
  height: number;
  label: string;
  mode?: "box" | "point" | "line"; // annotation type
  x2?: number; // line end point
  y2?: number;
}

type AnnotationMode = "box" | "point" | "line";

interface Props {
  imageUrl: string;
  annotations: BBox[];
  onChange: (annotations: BBox[]) => void;
  actionTypes?: string[];
}

export const DatasetAnnotationCanvas = ({ imageUrl, annotations, onChange, actionTypes = [] }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [currentLabel, setCurrentLabel] = useState("player");
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<AnnotationMode>("box");

  const getNormalisedPos = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = getNormalisedPos(e);

      if (mode === "point") {
        // Single click = place point
        onChange([...annotations, {
          x: pos.x - 0.005, y: pos.y - 0.005,
          width: 0.01, height: 0.01,
          label: currentLabel,
          mode: "point",
        }]);
        return;
      }

      setStartPos(pos);
      setCurrentPos(pos);
      setDrawing(true);
    },
    [getNormalisedPos, mode, annotations, currentLabel, onChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      setCurrentPos(getNormalisedPos(e));
    },
    [drawing, getNormalisedPos]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing || !startPos || !currentPos) {
      setDrawing(false);
      return;
    }

    if (mode === "line") {
      const dist = Math.sqrt(
        Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2)
      );
      if (dist > 0.01) {
        onChange([...annotations, {
          x: startPos.x, y: startPos.y,
          width: 0, height: 0,
          x2: currentPos.x, y2: currentPos.y,
          label: currentLabel,
          mode: "line",
        }]);
      }
    } else {
      // box mode
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      if (w > 0.01 && h > 0.01) {
        onChange([...annotations, { x, y, width: w, height: h, label: currentLabel, mode: "box" }]);
      }
    }

    setDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  }, [drawing, startPos, currentPos, annotations, currentLabel, onChange, mode]);

  const removeAnnotation = useCallback(
    (idx: number) => {
      onChange(annotations.filter((_, i) => i !== idx));
    },
    [annotations, onChange]
  );

  // Draw preview
  const previewRect =
    drawing && startPos && currentPos && mode === "box"
      ? {
          left: `${Math.min(startPos.x, currentPos.x) * 100}%`,
          top: `${Math.min(startPos.y, currentPos.y) * 100}%`,
          width: `${Math.abs(currentPos.x - startPos.x) * 100}%`,
          height: `${Math.abs(currentPos.y - startPos.y) * 100}%`,
        }
      : null;

  const LABEL_COLORS: Record<string, string> = {
    player: "hsl(var(--primary))",
    ball: "hsl(var(--destructive))",
  };

  const allLabels = ["player", "ball", ...actionTypes.filter(t => t !== "player" && t !== "ball")];
  const getLabelColor = (label: string) => LABEL_COLORS[label] || "hsl(var(--accent))";

  const MODE_OPTIONS: { value: AnnotationMode; icon: typeof Square; label: string }[] = [
    { value: "box", icon: Square, label: "Box" },
    { value: "point", icon: Circle, label: "Point" },
    { value: "line", icon: Minus, label: "Line" },
  ];

  return (
    <div className="space-y-3">
      {/* Mode + Label selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          {MODE_OPTIONS.map((m) => {
            const Icon = m.icon;
            return (
              <Button
                key={m.value}
                variant={mode === m.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(m.value)}
                className="h-7 text-xs gap-1 px-2"
              >
                <Icon className="h-3 w-3" />
                {m.label}
              </Button>
            );
          })}
        </div>

        <span className="text-sm font-medium">Label:</span>
        {allLabels.slice(0, 8).map((label) => (
          <Button
            key={label}
            variant={currentLabel === label ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentLabel(label)}
            className="text-xs capitalize"
          >
            {label}
          </Button>
        ))}
        {allLabels.length > 8 && (
          <select
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            className="h-8 text-xs border rounded px-2 bg-background"
          >
            {allLabels.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}
        <Input
          value={currentLabel}
          onChange={(e) => setCurrentLabel(e.target.value)}
          placeholder="Custom label..."
          className="w-32 h-8 text-xs"
        />
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={`relative select-none border rounded-lg overflow-hidden bg-black ${mode === "point" ? "cursor-crosshair" : "cursor-crosshair"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (drawing) handleMouseUp(); }}
      >
        <img
          src={imageUrl}
          alt="Frame"
          className="w-full block"
          draggable={false}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />

        {/* Existing annotations */}
        {annotations.map((ann, idx) => {
          const color = getLabelColor(ann.label);

          if (ann.mode === "point") {
            return (
              <div
                key={idx}
                className="absolute pointer-events-none"
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: "10px",
                  height: "10px",
                  marginLeft: "-5px",
                  marginTop: "-5px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: "2px solid white",
                }}
              >
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] px-1 rounded font-bold text-white whitespace-nowrap"
                  style={{ backgroundColor: color }}
                >
                  {ann.label}
                </span>
              </div>
            );
          }

          if (ann.mode === "line" && ann.x2 != null && ann.y2 != null) {
            return (
              <svg
                key={idx}
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line
                  x1={ann.x * 100}
                  y1={ann.y * 100}
                  x2={ann.x2 * 100}
                  y2={ann.y2 * 100}
                  stroke={color}
                  strokeWidth="0.4"
                  strokeLinecap="round"
                />
                <circle cx={ann.x * 100} cy={ann.y * 100} r="0.5" fill={color} />
                <circle cx={ann.x2 * 100} cy={ann.y2 * 100} r="0.5" fill={color} />
                <text
                  x={((ann.x + ann.x2) / 2) * 100}
                  y={((ann.y + ann.y2) / 2) * 100 - 1.5}
                  fill="white"
                  fontSize="2.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  paintOrder="stroke"
                  stroke={color}
                  strokeWidth="0.8"
                >
                  {ann.label}
                </text>
              </svg>
            );
          }

          // Default: box
          return (
            <div
              key={idx}
              className="absolute border-2 pointer-events-none"
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                width: `${ann.width * 100}%`,
                height: `${ann.height * 100}%`,
                borderColor: color,
              }}
            >
              <span
                className="absolute -top-5 left-0 text-[10px] px-1 rounded font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {ann.label}
              </span>
            </div>
          );
        })}

        {/* Preview rect (box mode) */}
        {previewRect && (
          <div
            className="absolute border-2 border-dashed pointer-events-none"
            style={{
              ...previewRect,
              borderColor: getLabelColor(currentLabel),
              backgroundColor: `${getLabelColor(currentLabel)}20`,
            }}
          />
        )}

        {/* Preview line */}
        {drawing && startPos && currentPos && mode === "line" && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1={startPos.x * 100}
              y1={startPos.y * 100}
              x2={currentPos.x * 100}
              y2={currentPos.y * 100}
              stroke={getLabelColor(currentLabel)}
              strokeWidth="0.4"
              strokeDasharray="1"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {annotations.map((ann, idx) => (
            <Badge key={idx} variant="outline" className="gap-1 text-xs">
              {ann.mode === "point" ? "●" : ann.mode === "line" ? "━" : "▢"} {ann.label}
              <button onClick={() => removeAnnotation(idx)} className="ml-1 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
