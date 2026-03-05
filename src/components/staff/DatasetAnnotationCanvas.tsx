import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export interface BBox {
  x: number; // normalised 0-1
  y: number;
  width: number;
  height: number;
  label: string;
}

interface Props {
  imageUrl: string;
  annotations: BBox[];
  onChange: (annotations: BBox[]) => void;
}

export const DatasetAnnotationCanvas = ({ imageUrl, annotations, onChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [currentLabel, setCurrentLabel] = useState("player");
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

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
      setStartPos(pos);
      setCurrentPos(pos);
      setDrawing(true);
    },
    [getNormalisedPos]
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

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);

    // Ignore tiny boxes (accidental clicks)
    if (w > 0.01 && h > 0.01) {
      onChange([...annotations, { x, y, width: w, height: h, label: currentLabel }]);
    }

    setDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  }, [drawing, startPos, currentPos, annotations, currentLabel, onChange]);

  const removeAnnotation = useCallback(
    (idx: number) => {
      onChange(annotations.filter((_, i) => i !== idx));
    },
    [annotations, onChange]
  );

  // Draw preview rect
  const previewRect =
    drawing && startPos && currentPos
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
    goalkeeper: "hsl(142, 76%, 36%)",
  };

  return (
    <div className="space-y-3">
      {/* Label selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Label:</span>
        {["player", "ball", "goalkeeper"].map((label) => (
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
        className="relative select-none cursor-crosshair border rounded-lg overflow-hidden bg-black"
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
        {annotations.map((ann, idx) => (
          <div
            key={idx}
            className="absolute border-2 pointer-events-none"
            style={{
              left: `${ann.x * 100}%`,
              top: `${ann.y * 100}%`,
              width: `${ann.width * 100}%`,
              height: `${ann.height * 100}%`,
              borderColor: LABEL_COLORS[ann.label] || "hsl(var(--accent))",
            }}
          >
            <span
              className="absolute -top-5 left-0 text-[10px] px-1 rounded font-bold text-white"
              style={{ backgroundColor: LABEL_COLORS[ann.label] || "hsl(var(--accent))" }}
            >
              {ann.label}
            </span>
          </div>
        ))}

        {/* Preview rect */}
        {previewRect && (
          <div
            className="absolute border-2 border-dashed pointer-events-none"
            style={{
              ...previewRect,
              borderColor: LABEL_COLORS[currentLabel] || "hsl(var(--accent))",
              backgroundColor: `${LABEL_COLORS[currentLabel] || "hsl(var(--accent))"}20`,
            }}
          />
        )}
      </div>

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {annotations.map((ann, idx) => (
            <Badge key={idx} variant="outline" className="gap-1 text-xs">
              {ann.label}
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
