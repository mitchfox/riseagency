import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const LoadingSpinner = ({ size = "md", className, text }: LoadingSpinnerProps) => {
  return <RiseBrandedLoader className={className} compact label={text} logoSize={size} />;
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
