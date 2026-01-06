import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Eraser, Pencil, Circle, X, ArrowRight, Trash2, 
  Download, Move, Undo
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DroppedItem {
  id: string;
  type: "football" | "x" | "o";
  x: number;
  y: number;
}

interface Arrow {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
}

type Tool = "select" | "draw" | "erase" | "arrow";

export const TacticsBoard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<DroppedItem[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [history, setHistory] = useState<{ items: DroppedItem[], arrows: Arrow[], paths: DrawPath[] }[]>([]);
  
  const saveToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-20), { items: [...items], arrows: [...arrows], paths: [...paths] }]);
  }, [items, arrows, paths]);
  
  const undo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setItems(lastState.items);
      setArrows(lastState.arrows);
      setPaths(lastState.paths);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const addItem = (type: "football" | "x" | "o") => {
    saveToHistory();
    const newItem: DroppedItem = {
      id: `${type}-${Date.now()}`,
      type,
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 100,
    };
    setItems(prev => [...prev, newItem]);
  };

  const clearBoard = () => {
    saveToHistory();
    setItems([]);
    setArrows([]);
    setPaths([]);
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pitch markings (simplified)
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    
    // Center circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Penalty areas
    ctx.strokeRect(0, canvas.height / 2 - 100, 80, 200);
    ctx.strokeRect(canvas.width - 80, canvas.height / 2 - 100, 80, 200);

    // Draw saved paths
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    paths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    });

    // Draw current path
    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }

    // Draw arrows
    arrows.forEach(arrow => {
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(arrow.startX, arrow.startY);
      ctx.lineTo(arrow.endX, arrow.endY);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
      const headLength = 15;
      
      ctx.beginPath();
      ctx.moveTo(arrow.endX, arrow.endY);
      ctx.lineTo(
        arrow.endX - headLength * Math.cos(angle - Math.PI / 6),
        arrow.endY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrow.endX - headLength * Math.cos(angle + Math.PI / 6),
        arrow.endY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = "#d4af37";
      ctx.fill();
    });

    // Draw temporary arrow
    if (arrowStart && activeTool === "arrow") {
      // Will be drawn on mouse move
    }

  }, [paths, currentPath, arrows, arrowStart, activeTool]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "draw") {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (activeTool === "arrow") {
      setArrowStart(coords);
    } else if (activeTool === "erase") {
      saveToHistory();
      // Check if clicking on an arrow
      const clickedArrowIndex = arrows.findIndex(arrow => {
        const dist = pointToLineDistance(coords, arrow);
        return dist < 15;
      });
      if (clickedArrowIndex !== -1) {
        setArrows(prev => prev.filter((_, i) => i !== clickedArrowIndex));
      }
      
      // Check if clicking on a path
      const clickedPathIndex = paths.findIndex(path => {
        return path.points.some(point => {
          const dist = Math.sqrt(Math.pow(point.x - coords.x, 2) + Math.pow(point.y - coords.y, 2));
          return dist < 20;
        });
      });
      if (clickedPathIndex !== -1) {
        setPaths(prev => prev.filter((_, i) => i !== clickedPathIndex));
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (isDrawing && activeTool === "draw") {
      setCurrentPath(prev => [...prev, coords]);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (isDrawing && activeTool === "draw") {
      if (currentPath.length >= 2) {
        saveToHistory();
        setPaths(prev => [...prev, { id: `path-${Date.now()}`, points: currentPath }]);
      }
      setCurrentPath([]);
      setIsDrawing(false);
    } else if (arrowStart && activeTool === "arrow") {
      if (Math.abs(coords.x - arrowStart.x) > 20 || Math.abs(coords.y - arrowStart.y) > 20) {
        saveToHistory();
        setArrows(prev => [
          ...prev,
          {
            id: `arrow-${Date.now()}`,
            startX: arrowStart.x,
            startY: arrowStart.y,
            endX: coords.x,
            endY: coords.y,
          },
        ]);
      }
      setArrowStart(null);
    }
  };

  const pointToLineDistance = (point: { x: number; y: number }, arrow: Arrow) => {
    const A = point.x - arrow.startX;
    const B = point.y - arrow.startY;
    const C = arrow.endX - arrow.startX;
    const D = arrow.endY - arrow.startY;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) { xx = arrow.startX; yy = arrow.startY; }
    else if (param > 1) { xx = arrow.endX; yy = arrow.endY; }
    else { xx = arrow.startX + param * C; yy = arrow.startY + param * D; }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleItemMouseDown = (e: React.MouseEvent, itemId: string) => {
    if (activeTool === "select") {
      e.stopPropagation();
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      
      setDraggingItem(itemId);
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left - item.x,
          y: e.clientY - rect.top - item.y,
        });
      }
    } else if (activeTool === "erase") {
      e.stopPropagation();
      saveToHistory();
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingItem && activeTool === "select") {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setItems(prev => prev.map(item => {
          if (item.id === draggingItem) {
            return {
              ...item,
              x: e.clientX - rect.left - dragOffset.x,
              y: e.clientY - rect.top - dragOffset.y,
            };
          }
          return item;
        }));
      }
    }
    handleCanvasMouseMove(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingItem) {
      saveToHistory();
    }
    setDraggingItem(null);
    handleCanvasMouseUp(e);
  };

  const downloadBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a new canvas with items overlaid
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the main canvas content
    ctx.drawImage(canvas, 0, 0);
    
    // Draw items
    items.forEach(item => {
      if (item.type === "football") {
        ctx.font = "24px Arial";
        ctx.fillText("⚽", item.x - 12, item.y + 8);
      } else if (item.type === "x") {
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("X", item.x - 10, item.y + 10);
      } else if (item.type === "o") {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    const link = document.createElement("a");
    link.download = `tactics-board-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL();
    link.click();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Tactics Board</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={downloadBoard}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" size="sm" onClick={clearBoard}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          {/* Tools */}
          <div className="flex items-center gap-1 pr-3 border-r">
            <Button
              variant={activeTool === "select" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTool("select")}
            >
              <Move className="h-4 w-4 mr-1" />
              Move
            </Button>
            <Button
              variant={activeTool === "draw" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTool("draw")}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Draw
            </Button>
            <Button
              variant={activeTool === "arrow" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTool("arrow")}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Arrow
            </Button>
            <Button
              variant={activeTool === "erase" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTool("erase")}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Erase
            </Button>
          </div>

          {/* Add items */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">Add:</span>
            <Button variant="outline" size="sm" onClick={() => addItem("football")}>
              ⚽ Ball
            </Button>
            <Button variant="outline" size="sm" onClick={() => addItem("x")} className="text-red-500">
              <X className="h-4 w-4 mr-1" />
              Player X
            </Button>
            <Button variant="outline" size="sm" onClick={() => addItem("o")} className="text-blue-500">
              <Circle className="h-4 w-4 mr-1" />
              Player O
            </Button>
          </div>
        </div>

        {/* Board */}
        <div
          ref={containerRef}
          className="relative border-2 border-border rounded-lg overflow-hidden bg-[#1a1a1a]"
          style={{ cursor: activeTool === "draw" ? "crosshair" : activeTool === "erase" ? "not-allowed" : "default" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="w-full h-auto"
            onMouseDown={handleCanvasMouseDown}
          />
          
          {/* Overlaid items */}
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                "absolute cursor-grab active:cursor-grabbing select-none transition-transform",
                activeTool === "erase" && "cursor-not-allowed hover:scale-125 hover:opacity-50"
              )}
              style={{ left: item.x - 16, top: item.y - 16 }}
              onMouseDown={(e) => handleItemMouseDown(e, item.id)}
            >
              {item.type === "football" && <span className="text-3xl">⚽</span>}
              {item.type === "x" && (
                <span className="text-3xl font-bold text-red-500">X</span>
              )}
              {item.type === "o" && (
                <div className="w-8 h-8 rounded-full border-4 border-blue-500" />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {activeTool === "select" && "Click and drag items to move them"}
          {activeTool === "draw" && "Click and drag to draw on the board"}
          {activeTool === "arrow" && "Click and drag to create an arrow"}
          {activeTool === "erase" && "Click on items, arrows, or drawings to erase them"}
        </p>
      </CardContent>
    </Card>
  );
};
