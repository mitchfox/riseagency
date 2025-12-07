import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import { cn } from "@/lib/utils";

export interface WidgetLayout {
  id: string;
  row: number;
  order: number;
  widthPercent: number;
  heightPx: number; // Now using pixel-based height for free-form sizing
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
  rowHeight: number; // Used as minimum height reference
}

// Minimum constraints
const MIN_WIDTH_PERCENT = 15;
const MAX_WIDTH_PERCENT = 100;
const MIN_HEIGHT_PX = 150;
const MAX_HEIGHT_PX = 800;

// Width snap points for grid-like layouts
const WIDTH_SNAP_POINTS = [20, 25, 30, 33, 40, 50, 60, 66, 70, 75, 80, 100];
const SNAP_THRESHOLD = 3; // Snap when within 3% of a snap point

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
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ width?: number; height?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      
      // Snap to nearest snap point if within threshold
      for (const snapPoint of WIDTH_SNAP_POINTS) {
        if (Math.abs(newWidth - snapPoint) <= SNAP_THRESHOLD) {
          newWidth = snapPoint;
          break;
        }
      }
      
      setResizePreview({ width: Math.round(newWidth) });
    };

    const handleMouseUp = () => {
      setIsResizingWidth(false);
      if (resizePreview?.width) {
        onResize(id, resizePreview.width, layout.heightPx);
      }
      setResizePreview(null);
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
      // Free-form height in pixels
      const newHeight = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, startHeightPx + deltaY));
      setResizePreview({ height: Math.round(newHeight) });
    };

    const handleMouseUp = () => {
      setIsResizingHeight(false);
      if (resizePreview?.height) {
        onResize(id, layout.widthPercent, resizePreview.height);
      }
      setResizePreview(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4 pt-20 overflow-auto">
        <Card className="h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${marbleOverlay})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              mixBlendMode: "overlay",
            }}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none z-0"
              style={{
                backgroundImage: `url(${marbleOverlay})`,
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

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as any).current = node;
      }}
      style={style}
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
            backgroundImage: `url(${marbleOverlay})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            mixBlendMode: "overlay",
          }}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/30 px-3 py-2 relative z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${marbleOverlay})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              mixBlendMode: "overlay",
            }}
          />
          <div className="flex items-center gap-2 relative z-10">
            {/* Drag handle */}
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

      {/* Width resize handle - right edge */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize transition-colors z-30",
          isResizingWidth ? "bg-primary/40" : "hover:bg-primary/20"
        )}
        onMouseDown={handleWidthResizeStart}
      />

      {/* Height resize handle - bottom edge */}
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
      {resizePreview && (
        <div className="absolute top-2 right-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded z-50">
          {resizePreview.width && `${resizePreview.width}%`}
          {resizePreview.width && resizePreview.height && " × "}
          {resizePreview.height && `${resizePreview.height}px`}
        </div>
      )}
    </div>
  );
};
