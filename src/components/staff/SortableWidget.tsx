import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Maximize2, Minimize2, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import whiteMarbleOverlay from "@/assets/white-marble-overlay.png";
import { cn } from "@/lib/utils";

export interface WidgetLayout {
  id: string;
  row: number;
  order: number;
  widthPercent: number;
  heightPx: number;
}

interface SortableWidgetProps {
  id: string;
  layout: WidgetLayout;
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggleExpand: () => void;
  onResize: (id: string, widthPercent: number, heightPx: number) => void;
  children: React.ReactNode;
  rowHeight: number;
}

const MIN_WIDTH_PERCENT = 15;
const MAX_WIDTH_PERCENT = 100;
const MIN_HEIGHT_PX = 150;
const MAX_HEIGHT_PX = 800;

const WIDTH_SNAP_POINTS = [20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 100];
const SNAP_THRESHOLD = 3;

export const SortableWidget = ({
  id,
  layout,
  title,
  icon: Icon,
  expanded,
  onToggleExpand,
  onResize,
  children,
  rowHeight,
}: SortableWidgetProps) => {
  const { theme } = useTheme();
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ width?: number; height?: number } | null>(null);
  const [pendingResize, setPendingResize] = useState<{ width: number; height: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use refs to track current values for event handlers (avoids stale closure)
  const resizePreviewRef = useRef<{ width?: number; height?: number } | null>(null);
  
  // Select marble overlay based on theme
  const currentMarbleOverlay = theme === 'light' ? whiteMarbleOverlay : marbleOverlay;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${resizePreview?.width ?? layout.widthPercent}%`,
    height: `${resizePreview?.height ?? layout.heightPx}px`,
  };

  // Update preview and ref together
  const updateResizePreview = (newPreview: { width?: number; height?: number } | null) => {
    resizePreviewRef.current = newPreview;
    setResizePreview(newPreview);
  };

  const handleWidthResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingWidth(true);

    const startX = e.clientX;
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    const startWidthPercent = layout.widthPercent;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      let newWidth = Math.max(MIN_WIDTH_PERCENT, Math.min(MAX_WIDTH_PERCENT, startWidthPercent + deltaPercent));
      
      for (const snapPoint of WIDTH_SNAP_POINTS) {
        if (Math.abs(newWidth - snapPoint) <= SNAP_THRESHOLD) {
          newWidth = snapPoint;
          break;
        }
      }
      
      updateResizePreview({ ...resizePreviewRef.current, width: Math.round(newWidth) });
    };

    const handleMouseUp = () => {
      setIsResizingWidth(false);
      const currentPreview = resizePreviewRef.current;
      if (currentPreview?.width) {
        onResize(id, currentPreview.width, layout.heightPx);
      }
      updateResizePreview(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleHeightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingHeight(true);

    const startY = e.clientY;
    const startHeightPx = layout.heightPx;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, startHeightPx + deltaY));
      updateResizePreview({ ...resizePreviewRef.current, height: Math.round(newHeight) });
    };

    const handleMouseUp = () => {
      setIsResizingHeight(false);
      const currentPreview = resizePreviewRef.current;
      
      console.log("Height resize mouseUp:", { currentPreview, layoutHeight: layout.heightPx });
      
      if (currentPreview?.height && currentPreview.height !== layout.heightPx) {
        // Store pending resize and show confirmation dialog
        setPendingResize({
          width: currentPreview.width ?? layout.widthPercent,
          height: currentPreview.height,
        });
        setShowConfirmDialog(true);
        // Keep the preview visible until user confirms/cancels
      } else {
        updateResizePreview(null);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const confirmResize = () => {
    if (pendingResize) {
      console.log("Confirming resize:", pendingResize);
      onResize(id, pendingResize.width, pendingResize.height);
    }
    setShowConfirmDialog(false);
    setPendingResize(null);
    updateResizePreview(null);
  };

  const cancelResize = () => {
    console.log("Cancelling resize");
    setShowConfirmDialog(false);
    setPendingResize(null);
    updateResizePreview(null);
  };

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4 pt-20 overflow-auto">
        <Card className="h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${currentMarbleOverlay})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              mixBlendMode: "overlay",
            }}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none z-0"
              style={{
                backgroundImage: `url(${currentMarbleOverlay})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                mixBlendMode: "overlay",
              }}
            />
            <div className="flex items-center gap-2 relative z-10">
              <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">
                {title}
              </CardTitle>
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="h-10 w-10 p-0 bg-primary hover:bg-primary/90 shadow-lg relative z-10"
            >
              <Minimize2 className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pt-3 px-3 pb-3 relative z-10">
            {children}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate the display height - use pending resize if dialog is open, otherwise preview or layout
  const displayHeight = pendingResize?.height ?? resizePreview?.height ?? layout.heightPx;

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          (containerRef as any).current = node;
        }}
        style={{
          ...style,
          height: `${displayHeight}px`,
        }}
        className={cn(
          "relative transition-all duration-200 flex-shrink-0",
          isDragging && "opacity-50 z-50",
          (isResizingWidth || isResizingHeight) && "z-40"
        )}
      >
        <Card className="h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${currentMarbleOverlay})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              mixBlendMode: "overlay",
            }}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none z-0"
              style={{
                backgroundImage: `url(${currentMarbleOverlay})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                mixBlendMode: "overlay",
              }}
            />
            <div className="flex items-center gap-2 relative z-10">
              <div
                {...attributes}
                {...listeners}
                className="p-1 rounded cursor-grab hover:bg-primary/10 active:cursor-grabbing"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">
                {title}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="h-6 w-6 p-0 hover:bg-primary/10 relative z-20"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden hover:overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pt-3 px-3 pb-3 relative z-10">
            {children}
          </CardContent>
        </Card>

        {/* Width resize handle */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize transition-colors z-30",
            isResizingWidth ? "bg-primary/40" : "hover:bg-primary/20"
          )}
          onMouseDown={handleWidthResizeStart}
        />

        {/* Height resize handle */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize transition-colors z-30",
            isResizingHeight ? "bg-primary/40" : "hover:bg-primary/20"
          )}
          onMouseDown={handleHeightResizeStart}
        />

        {/* Corner resize handle */}
        <div
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize transition-colors z-30",
            (isResizingWidth || isResizingHeight) ? "bg-primary/40" : "hover:bg-primary/20"
          )}
          onMouseDown={(e) => {
            handleWidthResizeStart(e);
            handleHeightResizeStart(e);
          }}
        />

        {/* Resize preview indicator */}
        {(isResizingWidth || isResizingHeight || pendingResize) && (
          <div className="absolute top-2 right-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded z-50 font-mono shadow-lg">
            {resizePreview?.width ?? pendingResize?.width ?? layout.widthPercent}% × {displayHeight}px
          </div>
        )}
      </div>

      {/* Height resize confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={(open) => {
        if (!open) cancelResize();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Widget Resize</AlertDialogTitle>
            <AlertDialogDescription>
              Set <span className="font-semibold text-foreground">{title}</span> height to{" "}
              <span className="font-mono font-semibold text-primary">{pendingResize?.height}px</span>?
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                Previous height: {layout.heightPx}px
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelResize}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmResize}>
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
