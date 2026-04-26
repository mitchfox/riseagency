import { useEffect } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

interface RepresentationEntryPulseProps {
  onComplete: () => void;
}

export const RepresentationEntryPulse = ({ onComplete }: RepresentationEntryPulseProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3200);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="presentation"
    >
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[1px] w-[1px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70 shadow-[0_0_48px_hsl(var(--gold)/0.85)]"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 2200], opacity: [0, 1, 0] }}
        transition={{ duration: 2.35, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50"
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{ scale: [0.25, 1.8, 5.8], opacity: [0, 0.72, 0] }}
        transition={{ duration: 2.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.img
        src={logo}
        alt="RISE"
        className="relative z-10 h-16 w-auto object-contain drop-shadow-2xl md:h-20"
        initial={{ opacity: 0, scale: 0.78 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.78, 1, 1.1, 0.96] }}
        transition={{ duration: 2.4, times: [0, 0.2, 0.62, 1], ease: "easeInOut" }}
      />
    </motion.div>
  );
};

export default RepresentationEntryPulse;