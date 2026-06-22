import React from "react";

/**
 * Shared RISE-brand slanted-edge container.
 *
 * Crops the top-right and bottom-left corners with a polygon clip so
 * the box reads as part of the RISE wedge motif. A subtle gold-tinted
 * gradient border surrounds the inner surface.
 *
 * Use this in place of the rounded card wrappers across the proposal
 * surfaces (Rise With Us hub + Club Outreach proposal) so the design
 * language stays consistent.
 */

const DEFAULT_SLANT = 18;

export const buildSlantClip = (slant: number = DEFAULT_SLANT) =>
  `polygon(0 0, calc(100% - ${slant}px) 0, 100% ${slant}px, 100% 100%, ${slant}px 100%, 0 calc(100% - ${slant}px))`;

export const slantClip = buildSlantClip(DEFAULT_SLANT);

export const solidBlackSlantSurface: React.CSSProperties = {
  background: "radial-gradient(circle at 20% 0%, #0c0c0c 0%, #050505 60%, #000 100%)",
};

export interface SlantedBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Diagonal cut size in px. Defaults to 18. */
  slant?: number;
  /** Show the gold gradient border around the box. Defaults to true. */
  bordered?: boolean;
  /** Inner padding utility classes; pass empty string to opt out. */
  innerClassName?: string;
  /** Override the inner surface style. */
  surfaceStyle?: React.CSSProperties;
}

export const SlantedBox = React.forwardRef<HTMLDivElement, SlantedBoxProps>(
  (
    {
      slant = DEFAULT_SLANT,
      bordered = true,
      className = "",
      innerClassName = "px-4 py-4 md:px-5 md:py-5",
      surfaceStyle,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const clip = buildSlantClip(slant);
    const innerSurface: React.CSSProperties = {
      ...solidBlackSlantSurface,
      ...surfaceStyle,
      clipPath: clip,
      WebkitClipPath: clip,
    };

    return (
      <div
        ref={ref}
        {...rest}
        className={`relative ${className}`}
        style={{ ...style, clipPath: clip, WebkitClipPath: clip }}
      >
        {bordered ? (
          <div
            className="relative h-full p-[1px]"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--gold)/0.55), hsl(var(--gold)/0.12) 55%, hsl(var(--gold)/0.35))",
            }}
          >
            <div className={`relative h-full ${innerClassName}`} style={innerSurface}>
              {children}
            </div>
          </div>
        ) : (
          <div className={`relative h-full ${innerClassName}`} style={innerSurface}>
            {children}
          </div>
        )}
      </div>
    );
  },
);

SlantedBox.displayName = "SlantedBox";

/**
 * Widow-killer: replaces the last space in a paragraph with a
 * non-breaking space so the closing word can't be orphaned on its
 * own line. Works across every language because we only touch the
 * final whitespace character.
 */
export function widont(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.replace(/\s+$/u, "");
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return trimmed;
  return trimmed.slice(0, lastSpace) + "\u00a0" + trimmed.slice(lastSpace + 1);
}
