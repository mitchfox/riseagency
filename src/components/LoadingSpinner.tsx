import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export const LoadingSpinner = ({ size = "md", className, text }: LoadingSpinnerProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        <div className={cn("rounded-full border-4 border-muted animate-pulse", sizeClasses[size])} />
        <div className={cn("absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin", sizeClasses[size])} />
      </div>
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
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-muted animate-pulse" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm">{text}</p>
      </div>
    </div>
  );
};
