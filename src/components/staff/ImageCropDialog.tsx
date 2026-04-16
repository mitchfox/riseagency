import { useState, useCallback } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eraser } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  title?: string;
  showBackgroundRemoval?: boolean;
  cropHeight?: number;
  /**
   * When true, draws the same dark fade (top) and gold arch (bottom) overlays
   * that appear on the live pre-match hero so staff can crop to what is
   * actually visible after the overlays are applied.
   */
  showHeroSafeAreas?: boolean;
}

const removeBackground = (imageData: ImageData, threshold: number = 240): ImageData => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0;
    }
  }
  return imageData;
};

const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area,
  shouldRemoveBackground: boolean = false
): Promise<Blob> => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  if (shouldRemoveBackground) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const processedData = removeBackground(imageData);
    ctx.putImageData(processedData, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, "image/png", 1);
  });
};

export const ImageCropDialog = ({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio,
  title = "Crop Image",
  showBackgroundRemoval = false,
  cropHeight,
  showHeroSafeAreas = false,
}: ImageCropDialogProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [removeBackgroundEnabled, setRemoveBackgroundEnabled] = useState(false);

  const isFlexibleAspect = aspectRatio === undefined;

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels, removeBackgroundEnabled);
      onCropComplete(croppedBlob);
      onOpenChange(false);
      setRemoveBackgroundEnabled(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const handleSkip = async () => {
    try {
      const response = await fetch(imageSrc);
      const originalBlob = await response.blob();

      if (removeBackgroundEnabled) {
        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => { image.onload = resolve; });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2d context");

        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const processedData = removeBackground(imageData);
        ctx.putImageData(processedData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            onCropComplete(blob);
            onOpenChange(false);
            setRemoveBackgroundEnabled(false);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
          }
        }, "image/png", 1);
      } else {
        onCropComplete(originalBlob);
        onOpenChange(false);
        setRemoveBackgroundEnabled(false);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      }
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {cropHeight && (
            <p className="text-sm text-muted-foreground">
              Height: {cropHeight}px
            </p>
          )}
        </DialogHeader>

        <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            restrictPosition={false}
            minZoom={0.1}
          />
          {showHeroSafeAreas && (
            <div className="pointer-events-none absolute inset-0 z-10">
              {/* Top dark fade — matches live hero overlay (~24% of 400px) */}
              <div
                className="absolute top-0 left-0 right-0"
                style={{
                  height: '24%',
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                }}
              />
              {/* Bottom gold arch — matches live hero arch (~30% of 400px) */}
              <svg
                className="absolute bottom-0 left-0 right-0 w-full"
                viewBox="0 0 400 120"
                preserveAspectRatio="none"
                style={{ height: '30%' }}
              >
                <defs>
                  <linearGradient id="cropGoldFade" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                    <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,20 Q200,70 400,20 L400,120 L0,120 Z" fill="url(#cropGoldFade)" />
                <path d="M0,50 Q200,90 400,50 L400,120 L0,120 Z" fill="hsl(var(--primary))" fillOpacity="0.9" />
              </svg>
              {/* Safe-area frame outlining the truly visible band */}
              <div
                className="absolute left-0 right-0 border-y-2 border-dashed border-white/70"
                style={{ top: '24%', bottom: '30%' }}
              >
                <span className="absolute top-1 left-2 text-[10px] font-semibold uppercase tracking-wider text-white bg-black/60 px-1.5 py-0.5 rounded">
                  Visible area
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label>Zoom {isFlexibleAspect && "(zoom out to include more)"}</Label>
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={0.3}
              max={5}
              step={0.05}
              className="w-full"
            />
          </div>

          {showBackgroundRemoval && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Eraser className="w-4 h-4" />
                <div>
                  <Label>Remove White Background</Label>
                  <p className="text-xs text-muted-foreground">Auto-remove light backgrounds</p>
                </div>
              </div>
              <Switch
                checked={removeBackgroundEnabled}
                onCheckedChange={setRemoveBackgroundEnabled}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            {removeBackgroundEnabled ? "Apply BG Removal Only" : "Skip Crop"}
          </Button>
          <Button onClick={handleSave}>
            {removeBackgroundEnabled ? "Crop & Remove BG" : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
