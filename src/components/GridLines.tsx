/**
 * GridLines Component
 * 
 * A reusable component for displaying coordinate-based gridlines
 * to help with precise positioning during design and development.
 * 
 * Usage:
 * <GridLines 
 *   xInterval={100}  // Optional: spacing between vertical lines (default: 100)
 *   yInterval={100}  // Optional: spacing between horizontal lines (default: 100)
 *   maxWidth={1500}  // Optional: maximum width (default: 1500)
 *   maxHeight={670}  // Optional: maximum height (default: 670)
 *   color="rgba(255, 0, 0, 0.3)" // Optional: line color (default: red semi-transparent)
 *   showLabels={true} // Optional: show coordinate labels (default: true)
 * />
 */

interface GridLinesProps {
  xInterval?: number;
  yInterval?: number;
  maxWidth?: number;
  maxHeight?: number;
  color?: string;
  showLabels?: boolean;
}

export const GridLines = ({
  xInterval = 100,
  yInterval = 100,
  maxWidth = 1500,
  maxHeight = 670,
  color = "rgba(255, 0, 0, 0.3)",
  showLabels = true,
}: GridLinesProps) => {
  const verticalLines = [];
  const horizontalLines = [];

  // Generate vertical lines (x-axis)
  for (let x = 0; x <= maxWidth; x += xInterval) {
    verticalLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1="0"
        x2={x}
        y2={maxHeight}
        stroke={color}
        strokeWidth="1"
      />
    );
    if (showLabels) {
      verticalLines.push(
        <text
          key={`vt-${x}`}
          x={x}
          y="15"
          fill={color}
          fontSize="10"
          textAnchor="middle"
        >
          {x}
        </text>
      );
    }
  }

  // Generate horizontal lines (y-axis)
  for (let y = 0; y <= maxHeight; y += yInterval) {
    horizontalLines.push(
      <line
        key={`h-${y}`}
        x1="0"
        y1={y}
        x2={maxWidth}
        y2={y}
        stroke={color}
        strokeWidth="1"
      />
    );
    if (showLabels) {
      horizontalLines.push(
        <text
          key={`ht-${y}`}
          x="5"
          y={y + 4}
          fill={color}
          fontSize="10"
        >
          {y}
        </text>
      );
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: maxWidth, height: maxHeight }}
    >
      {verticalLines}
      {horizontalLines}
    </svg>
  );
};
