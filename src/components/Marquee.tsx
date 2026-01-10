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
  speed = 20,
  separator = " • "
}: MarqueeProps) => {
  // Create repeated text for seamless loop
  const repeatedText = `${text}${separator}`.repeat(10);

  return (
    <div className={cn("w-full overflow-hidden bg-primary py-4 md:py-6", className)}>
      <div className="relative flex">
        <div 
          className="flex whitespace-nowrap animate-marquee"
          style={{ 
            animationDuration: `${speed}s`,
          }}
        >
          <span className="text-2xl md:text-4xl lg:text-5xl font-bebas uppercase tracking-[0.2em] text-primary-foreground px-4">
            {repeatedText}
          </span>
          <span className="text-2xl md:text-4xl lg:text-5xl font-bebas uppercase tracking-[0.2em] text-primary-foreground px-4">
            {repeatedText}
          </span>
        </div>
      </div>
    </div>
  );
};
