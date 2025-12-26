import { ReactNode } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import marbleOverlay from "@/assets/smudged-marble-overlay.png";
import whiteMarbleOverlay from "@/assets/white-marble-overlay.png";
import { cn } from "@/lib/utils";

interface StaffCardHeaderProps {
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export const StaffCardHeader = ({
  children,
  className,
  titleClassName,
  title,
  icon,
  actions,
}: StaffCardHeaderProps) => {
  const { theme } = useTheme();
  const currentMarbleOverlay = theme === 'light' ? whiteMarbleOverlay : marbleOverlay;

  // If title is provided, render the standard layout
  if (title) {
    return (
      <CardHeader className={cn("relative overflow-hidden", className)}>
        <div
          className="absolute inset-0 opacity-30 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${currentMarbleOverlay})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            mixBlendMode: "overlay",
          }}
        />
        <div className="flex items-center justify-between relative z-10">
          <CardTitle className={cn("flex items-center gap-2", titleClassName)}>
            {icon}
            {title}
          </CardTitle>
          {actions}
        </div>
      </CardHeader>
    );
  }

  // Otherwise, render children with marble background
  return (
    <CardHeader className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-0 opacity-30 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${currentMarbleOverlay})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "overlay",
        }}
      />
      <div className="relative z-10">{children}</div>
    </CardHeader>
  );
};
