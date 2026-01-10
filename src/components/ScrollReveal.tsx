import { motion } from "framer-motion";
import { ReactNode } from "react";

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
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.1 }}
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
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.1 }}
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
