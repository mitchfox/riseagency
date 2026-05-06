import { RiseBrandedLoader } from "@/components/RiseBrandedLoader";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import logo from "@/assets/logo.png";

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
 * Site-wide full-page loader. Uses the RISE shader animation with the
 * pulsing logo overlay so route transitions stay branded and never
 * fall back to plain text or "...".
 */
export const PageLoading = (_: PageLoadingProps) => {
  return (
    <div className="fixed inset-0 z-[150] bg-black overflow-hidden">
      <div className="absolute inset-0">
        <ShaderAnimation />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={logo}
          alt="RISE"
          className="h-16 md:h-20 animate-pulse drop-shadow-2xl"
        />
      </div>
    </div>
  );
};
