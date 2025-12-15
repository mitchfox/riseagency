import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "h-1 w-16",
  md: "h-1.5 w-24",
  lg: "h-2 w-32",
};

export const LoadingSpinner = ({ size = "md", className, text }: LoadingSpinnerProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("bar-glossy rounded-full bg-primary/20", sizeClasses[size])} />
      {text && <span className="text-muted-foreground text-sm">{text}</span>}
    </div>
  );
};

interface PageLoadingProps {
  text?: string;
}

export const PageLoading = ({ text = "Loading..." }: PageLoadingProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="bar-glossy h-2 w-40 rounded-full bg-primary/20 mx-auto" />
        <p className="text-muted-foreground font-bebas uppercase tracking-wider">{text}</p>
      </div>
    </div>
  );
};
