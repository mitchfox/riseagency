import { cn } from "@/lib/utils";
import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";

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

/**
 * Site-wide full-page loader. Always uses the branded RISE loader
 * (black marble, pulsing logo, gold accent line, dot pulse). The
 * `text` prop is preserved for backwards compatibility but mapped to
 * the branded loader's own `label` so we never expose generic
 * "Loading..." copy.
 */
export const PageLoading = ({ text }: PageLoadingProps) => {
  // Treat the legacy default "Loading..." as no label, so we get the
 // branded "Loading" wordmark instead.
  const label =
    !text || text.trim().toLowerCase().replace(/\.+$/, "") === "loading"
      ? undefined
      : text;
  return <RiseBrandedLoader label={label} />;
};
