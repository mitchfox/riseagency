import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import logo from "@/assets/logo.png";

/**
 * Entry overlay for /representation. The same central RISE pulse and
 * shader wave used by the global PageTransition, but guaranteed to
 * play in full BEFORE the intro mounts so the user never sees several
 * loaders fighting each other for a fraction of a second.
 *
 * Keep this 100% opaque and on top of everything until it is done.
 */
interface Props {
  duration?: number; // total ms to stay on screen
  onComplete: () => void;
}

export const RepresentationEntryOverlay = ({ duration = 2200, onComplete }: Props) => {
  useEffect(() => {
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  return (
    <motion.div
      key="rep-entry"
      className="fixed inset-0 z-[300] bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute inset-0">
        <ShaderAnimation />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.img
          src={logo}
          alt="RISE"
          className="h-20 md:h-28"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 1, 1], scale: [0.8, 1, 1.08, 1, 1] }}
          transition={{ duration: duration / 1000, times: [0, 0.18, 0.5, 0.7, 1], ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
};

export default RepresentationEntryOverlay;