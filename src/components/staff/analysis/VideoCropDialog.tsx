import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { Crop, Loader2, RotateCcw } from "lucide-react";

export interface CropRect {
  top: number;    // percent from top
  right: number;  // percent from right
  bottom: number; // percent from bottom
  left: number;   // percent from left
}

interface VideoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  onCropComplete: (crop: CropRect) => void;
  initialCrop?: CropRect | null;
}

type HandleType = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const MIN_INSET = 0; // min inset percent
const MAX_CROP = 90; // max total crop on any axis (keep at least 10% visible)

const HANDLES: { type: HandleType; cursor: string; style: React.CSSProperties }[] = [
  { type: "nw", cursor: "nwse-resize", style: { top: -5, left: -5 } },
  { type: "n", cursor: "ns-resize", style: { top: -5, left: "50%", transform: "translateX(-50%)" } },
  { type: "ne", cursor: "nesw-resize", style: { top: -5, right: -5 } },
  { type: "e", cursor: "ew-resize", style: { top: "50%", right: -5, transform: "translateY(-50%)" } },
  { type: "se", cursor: "nwse-resize", style: { bottom: -5, right: -5 } },
  { type: "s", cursor: "ns-resize", style: { bottom: -5, left: "50%", transform: "translateX(-50%)" } },
  { type: "sw", cursor: "nesw-resize", style: { bottom: -5, left: -5 } },
  { type: "w", cursor: "ew-resize", style: { top: "50%", left: -5, transform: "translateY(-50%)" } },
];

const DEFAULT_CROP: CropRect = { top: 0, right: 0, bottom: 0, left: 0 };

export const VideoCropDialog = ({
  open,
  onOpenChange,
  videoUrl,
  onCropComplete,
  initialCrop,
}: VideoCropDialogProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropRect>(initialCrop || DEFAULT_CROP);
  const [videoDims, setVideoDims] = useState({ width: 1920, height: 1080 });

  const interactionRef = useRef<{
    mode: "move" | "resize";
    handle?: HandleType;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setCrop(initialCrop || DEFAULT_CROP);
    }
  }, [open, initialCrop]);

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setVideoDims({ width: v.videoWidth, height: v.videoHeight });
    v.currentTime = 1;
  };

  const clampCrop = (c: CropRect): CropRect => ({
    top: Math.max(MIN_INSET, Math.min(c.top, MAX_CROP - (100 - c.bottom - 10))),
    right: Math.max(MIN_INSET, Math.min(c.right, MAX_CROP - (100 - c.left - 10))),
    bottom: Math.max(MIN_INSET, Math.min(c.bottom, MAX_CROP - (100 - c.top - 10))),
    left: Math.max(MIN_INSET, Math.min(c.left, MAX_CROP - (100 - c.right - 10))),
  });

  // Simpler clamp: ensure visible area >= 10% on each axis
  const safeCrop = (c: CropRect): CropRect => {
    let { top, right, bottom, left } = c;
    top = Math.max(0, top);
    right = Math.max(0, right);
    bottom = Math.max(0, bottom);
    left = Math.max(0, left);
    // Ensure at least 10% visible on each axis
    if (top + bottom > 90) { top = Math.min(top, 90 - bottom); bottom = Math.min(bottom, 90 - top); }
    if (left + right > 90) { left = Math.min(left, 90 - right); right = Math.min(right, 90 - left); }
    return { top, right, bottom, left };
  };

  const getContainerSize = () => {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1 };
    return { w: el.clientWidth, h: el.clientHeight };
  };

  const onPointerDown = (e: React.PointerEvent, mode: "move" | "resize", handle?: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    interactionRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const { w, h } = getContainerSize();
    const dx = ((e.clientX - interaction.startX) / w) * 100;
    const dy = ((e.clientY - interaction.startY) / h) * 100;
    const sc = interaction.startCrop;

    if (interaction.mode === "move") {
      // Moving the visible area = adjusting all insets together
      setCrop(safeCrop({
        top: sc.top + dy,
        bottom: sc.bottom - dy,
        left: sc.left + dx,
        right: sc.right - dx,
      }));
      return;
    }

    const handle = interaction.handle!;
    let { top, right, bottom, left } = sc;

    // Each handle adjusts the corresponding inset(s)
    if (handle.includes("n")) top = sc.top + dy;
    if (handle.includes("s")) bottom = sc.bottom - dy;
    if (handle.includes("w")) left = sc.left + dx;
    if (handle.includes("e")) right = sc.right - dx;

    setCrop(safeCrop({ top, right, bottom, left }));
  }, []);

  const onPointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  const resetCrop = () => setCrop(DEFAULT_CROP);

  // Visible area dimensions in pixels
  const visW = Math.round(((100 - crop.left - crop.right) / 100) * videoDims.width);
  const visH = Math.round(((100 - crop.top - crop.bottom) / 100) * videoDims.height);

  const handleSave = () => {
    // If crop is essentially zero, don't save
    const isZero = crop.top < 0.5 && crop.right < 0.5 && crop.bottom < 0.5 && crop.left < 0.5;
    onCropComplete(isZero ? { top: 0, right: 0, bottom: 0, left: 0 } : crop);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Video</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag sides or corners to hide parts of the frame. The crop is applied visually — no re-encoding needed.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative bg-black rounded-lg overflow-hidden select-none"
            style={{ touchAction: "none" }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <video
              src={videoUrl.split("#")[0]}
              onLoadedMetadata={handleVideoLoaded}
              className="w-full h-auto block"
              crossOrigin="anonymous"
              muted
              playsInline
              preload="auto"
              autoPlay
              loop
            />

            {/* Dark overlay regions (the cropped-out parts) */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top */}
              <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${crop.top}%` }} />
              {/* Bottom */}
              <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: `${crop.bottom}%` }} />
              {/* Left */}
              <div className="absolute bg-black/60" style={{ top: `${crop.top}%`, left: 0, width: `${crop.left}%`, bottom: `${crop.bottom}%` }} />
              {/* Right */}
              <div className="absolute bg-black/60" style={{ top: `${crop.top}%`, right: 0, width: `${crop.right}%`, bottom: `${crop.bottom}%` }} />
            </div>

            {/* Crop selection box (the visible area) */}
            <div
              className="absolute border-2 border-primary"
              style={{
                top: `${crop.top}%`,
                left: `${crop.left}%`,
                right: `${crop.right}%`,
                bottom: `${crop.bottom}%`,
                cursor: "move",
              }}
              onPointerDown={(e) => onPointerDown(e, "move")}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-0 right-0 border-t border-primary/30" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-primary/30" />
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-primary/30" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-primary/30" />
              </div>

              {/* Resize handles */}
              {HANDLES.map((h) => (
                <div
                  key={h.type}
                  className="absolute w-[10px] h-[10px] bg-primary rounded-sm border border-primary-foreground z-10"
                  style={{ ...h.style, cursor: h.cursor }}
                  onPointerDown={(e) => onPointerDown(e, "resize", h.type)}
                />
              ))}

              {/* Dimension label */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
                {visW} × {visH}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <Button variant="ghost" size="sm" onClick={resetCrop}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Crop className="w-4 h-4 mr-1" />
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Utility: Apply a CropRect as a CSS clip-path inset to a video container.
 * Use this on the wrapper div around the video to visually crop it.
 */
export const getCropStyle = (crop?: CropRect | null): React.CSSProperties => {
  if (!crop || (crop.top === 0 && crop.right === 0 && crop.bottom === 0 && crop.left === 0)) {
    return {};
  }
  return {
    clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
  };
};
