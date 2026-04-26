import { motion } from "framer-motion";
import riseLogo from "@/assets/logo.png";
import blackMarble from "@/assets/black-marble.png";
import { cn } from "@/lib/utils";

interface RiseBrandedLoaderProps {
  label?: string;
  className?: string;
  compact?: boolean;
  logoSize?: "sm" | "md" | "lg";
}

const logoSizes = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export const RiseBrandedLoader = ({ label, className, compact = false, logoSize = "lg" }: RiseBrandedLoaderProps) => {
  return (
    <div className={cn(compact ? "min-h-0" : "min-h-[100dvh]", "bg-black flex items-center justify-center relative overflow-hidden", className)}>
      {!compact && <div className="absolute inset-0">
        <img src={blackMarble} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative text-center flex flex-col items-center gap-5"
      >
        <motion.img
          src={riseLogo}
          alt="RISE Football Agency"
          className={cn(compact ? logoSizes[logoSize] : "w-20 h-20 md:w-28 md:h-28", "object-contain drop-shadow-2xl")}
          animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 140, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        />
        {label && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="font-bebas tracking-[0.4em] uppercase text-base md:text-lg text-primary drop-shadow-lg"
          >
            {label}
          </motion.p>
        )}
        <div className="flex gap-2.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
