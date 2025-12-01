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
  const containerRef = useRef<HTMLDivElement>(null);
  const snapThreshold = 0.3;

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Navigate to the snapped option
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

  const displayPosition = isDragging ? dragPosition : currentIndex / (options.length - 1);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] font-bebas mb-2">
          {isDragging ? "Release to Navigate" : "Drag & Hold to Enter"}
        </p>
        <p className="text-primary text-xl font-bebas tracking-[0.2em]">
          {t(options[currentIndex].labelKey, options[currentIndex].fallback)}
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative h-20 bg-black/40 border-2 border-primary/40 backdrop-blur-sm"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Snap points indicators */}
        <div className="absolute inset-0 flex justify-between items-center px-2">
          {snapPositions.map((snap) => (
            <div
              key={snap.index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentIndex === snap.index
                  ? "bg-primary scale-150"
                  : "bg-primary/30"
              }`}
            />
          ))}
        </div>

        {/* Draggable element */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-16 h-16 transition-all duration-200 cursor-grab active:cursor-grabbing"
          style={{
            left: `calc(${displayPosition * 100}% - 32px)`,
          }}
        >
          <div className={`w-full h-full border-2 border-primary bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isDragging ? "scale-110 border-primary shadow-[0_0_20px_rgba(212,175,55,0.5)]" : ""
          }`}>
            <ArrowRight className="text-primary" size={32} />
          </div>
        </div>

        {/* Track line */}
        <div className="absolute top-1/2 left-2 right-2 h-px bg-primary/20" />
      </div>

      <div className="text-center mt-4 text-white/40 text-xs uppercase tracking-wider font-bebas">
        {options.map((opt, idx) => (
          <span
            key={opt.to}
            className={`inline-block mx-2 transition-colors duration-300 ${
              currentIndex === idx ? "text-primary" : ""
            }`}
          >
            {t(opt.labelKey, opt.fallback)}
          </span>
        ))}
      </div>
    </div>
  );
};
