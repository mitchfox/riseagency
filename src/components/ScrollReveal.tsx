import { motion, Variants, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
}

export const ScrollReveal = ({ 
  children, 
  className = "",
  delay = 0,
  duration = 0.6,
  y = 30,
  once = true
}: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger children variant
export const ScrollRevealContainer = ({ 
  children, 
  className = "",
  staggerDelay = 0.1,
  once = true
}: { 
  children: ReactNode; 
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const ScrollRevealItem = ({ 
  children, 
  className = "",
  y = 30
}: { 
  children: ReactNode; 
  className?: string;
  y?: number;
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
