import { useEffect } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { ShaderAnimation } from "@/components/ui/shader-animation";

interface RepresentationEntryPulseProps {
  onComplete: () => void;
}

export const RepresentationEntryPulse = ({ onComplete }: RepresentationEntryPulseProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2000);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="presentation"
    >
      <div className="absolute inset-0 z-0">
        <ShaderAnimation />
      </div>
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