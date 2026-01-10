import { cn } from "@/lib/utils";

interface MarqueeProps {
  text?: string;
  className?: string;
  speed?: number; // seconds for one loop
  separator?: string;
}

export const Marquee = ({ 
  text = "REALISE POTENTIAL", 
  className = "",
  speed = 40, // Slower speed for more natural feel
  separator = " • "
}: MarqueeProps) => {
  // Create repeated text for seamless loop
  const repeatedText = `${text}${separator}`.repeat(10);

  return (
    <div className={cn("w-full overflow-hidden bg-transparent py-3 md:py-4", className)}>
      <div className="relative flex">
        <div 
          className="flex whitespace-nowrap animate-marquee"
          style={{ 
            animationDuration: `${speed}s`,
          }}
        >
          <span className="text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-[0.15em] text-foreground/60 px-4">
            {repeatedText}
          </span>
          <span className="text-lg md:text-2xl lg:text-3xl font-bebas uppercase tracking-[0.15em] text-foreground/60 px-4">
            {repeatedText}
          </span>
        </div>
      </div>
    </div>
  );
};
