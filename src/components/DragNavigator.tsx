import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight } from "lucide-react";

interface NavOption {
  to: string;
  labelKey: string;
  fallback: string;
}

interface DragNavigatorProps {
  options: NavOption[];
}

export const DragNavigator = ({ options }: DragNavigatorProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Snap to nearest position and navigate
        const targetPos = currentIndex / (options.length - 1);
        setTargetPosition(targetPos);
        setDragPosition(targetPos);
        navigate(options[currentIndex].to);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      
      setDragPosition(percentage);
      
      // Calculate snap index
      const rawIndex = percentage * (options.length - 1);
      const snapIndex = Math.round(rawIndex);
      setCurrentIndex(snapIndex);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      
      setDragPosition(percentage);
      
      const rawIndex = percentage * (options.length - 1);
      const snapIndex = Math.round(rawIndex);
      setCurrentIndex(snapIndex);
    };

    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
    }

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDragging, navigate, options, currentIndex]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const snapPositions = options.map((_, index) => ({
    position: index / (options.length - 1),
    index,
  }));

  const displayPosition = isDragging ? dragPosition : targetPosition;

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <p className="text-white/60 text-sm uppercase tracking-[0.25em] font-bebas mb-1">
          {isDragging ? "Release to Navigate" : "Drag & Hold to Enter"}
        </p>
        <p className="text-primary text-xl font-bebas tracking-[0.2em]">
          {t(options[currentIndex].labelKey, options[currentIndex].fallback)}
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative h-24 bg-black/20 border border-primary/30 backdrop-blur-sm"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Snap points with labels */}
        <div className="absolute inset-0 flex justify-between items-end px-4 md:px-6 pb-2">
          {snapPositions.map((snap) => (
            <div key={snap.index} className="flex flex-col items-center">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 mb-1 ${
                  currentIndex === snap.index
                    ? "bg-primary scale-150"
                    : "bg-primary/30"
                }`}
              />
              <span className={`text-xs uppercase tracking-wider font-bebas transition-colors duration-300 whitespace-nowrap ${
                currentIndex === snap.index ? "text-primary" : "text-white/40"
              }`}>
                {t(options[snap.index].labelKey, options[snap.index].fallback)}
              </span>
            </div>
          ))}
        </div>

        {/* Draggable element */}
        <div
          className="absolute top-3 cursor-grab active:cursor-grabbing z-10"
          style={{
            left: `calc(${displayPosition * 100}% - 28px)`,
            transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className={`w-14 h-14 border-2 border-primary bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isDragging ? "scale-110 border-primary shadow-[0_0_20px_rgba(212,175,55,0.5)]" : ""
          }`}>
            <ArrowRight className="text-primary" size={28} />
          </div>
        </div>

        {/* Track line */}
        <div className="absolute top-10 left-4 md:left-6 right-4 md:right-6 h-px bg-primary/20" />
      </div>
    </div>
  );
};
