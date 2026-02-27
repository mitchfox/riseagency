import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUp, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export const MobileScrollButtons = () => {
  const isMobile = useIsMobile();
  const [showButtons, setShowButtons] = useState(false);
  const previousScrollRef = useRef<number>(0);
  const lastScrollRef = useRef<number>(0);

  const handleScroll = useCallback(() => {
    const currentScroll = window.scrollY;
    setShowButtons(currentScroll > 300);
    lastScrollRef.current = currentScroll;
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile, handleScroll]);

  if (!isMobile) return null;

  const scrollToTop = () => {
    previousScrollRef.current = window.scrollY;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToPrevious = () => {
    const target = previousScrollRef.current;
    previousScrollRef.current = window.scrollY;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {showButtons && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 right-3 z-40 flex flex-col gap-2"
        >
          <button
            onClick={returnToPrevious}
            className="h-10 w-10 rounded-full bg-muted/90 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
            aria-label="Return to previous position"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={scrollToTop}
            className="h-10 w-10 rounded-full bg-primary/90 backdrop-blur-sm border border-primary/50 shadow-lg flex items-center justify-center text-primary-foreground active:scale-90 transition-transform"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
