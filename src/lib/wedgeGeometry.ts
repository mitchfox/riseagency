/**
 * Wedge-Screen Geometry Calculations
 * Calculates where wedge edges intersect screen boundaries
 * and finds optimal content placement within available space
 */

interface Point {
  x: number;
  y: number;
}

interface ScreenBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface WedgeArea {
  polygon: Point[];
  centroid: Point;
  availableWidth: number;
  availableHeight: number;
}

/**
 * Find where a ray from center at given angle intersects the screen boundary
 */
export function findRayScreenIntersection(
  centerX: number,
  centerY: number,
  angleDeg: number,
  bounds: ScreenBounds
): Point {
  const angleRad = (angleDeg * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);
  
  // Find intersection with each edge and pick the closest valid one
  const intersections: { point: Point; t: number }[] = [];
  
  // Right edge (x = bounds.right)
  if (Math.abs(dirX) > 0.001) {
    const t = (bounds.right - centerX) / dirX;
    if (t > 0) {
      const y = centerY + t * dirY;
      if (y >= bounds.top && y <= bounds.bottom) {
        intersections.push({ point: { x: bounds.right, y }, t });
      }
    }
  }
  
  // Left edge (x = bounds.left)
  if (Math.abs(dirX) > 0.001) {
    const t = (bounds.left - centerX) / dirX;
    if (t > 0) {
      const y = centerY + t * dirY;
      if (y >= bounds.top && y <= bounds.bottom) {
        intersections.push({ point: { x: bounds.left, y }, t });
      }
    }
  }
  
  // Bottom edge (y = bounds.bottom)
  if (Math.abs(dirY) > 0.001) {
    const t = (bounds.bottom - centerY) / dirY;
    if (t > 0) {
      const x = centerX + t * dirX;
      if (x >= bounds.left && x <= bounds.right) {
        intersections.push({ point: { x, y: bounds.bottom }, t });
      }
    }
  }
  
  // Top edge (y = bounds.top)
  if (Math.abs(dirY) > 0.001) {
    const t = (bounds.top - centerY) / dirY;
    if (t > 0) {
      const x = centerX + t * dirX;
      if (x >= bounds.left && x <= bounds.right) {
        intersections.push({ point: { x, y: bounds.top }, t });
      }
    }
  }
  
  // Return closest intersection
  if (intersections.length === 0) {
    // Fallback - shouldn't happen with valid bounds
    return { x: centerX + dirX * 100, y: centerY + dirY * 100 };
  }
  
  intersections.sort((a, b) => a.t - b.t);
  return intersections[0].point;
}

/**
 * Get screen edge points between two intersection points (following the edge clockwise)
 */
function getEdgePointsBetween(
  start: Point,
  end: Point,
  bounds: ScreenBounds
): Point[] {
  const corners: Point[] = [
    { x: bounds.right, y: bounds.top },    // top-right
    { x: bounds.right, y: bounds.bottom }, // bottom-right
    { x: bounds.left, y: bounds.bottom },  // bottom-left
    { x: bounds.left, y: bounds.top },     // top-left
  ];
  
  // Find which edge each point is on
  const getEdgeIndex = (p: Point): number => {
    const eps = 1;
    if (Math.abs(p.x - bounds.right) < eps) return 0; // right edge
    if (Math.abs(p.y - bounds.bottom) < eps) return 1; // bottom edge
    if (Math.abs(p.x - bounds.left) < eps) return 2; // left edge
    if (Math.abs(p.y - bounds.top) < eps) return 3; // top edge
    return 0;
  };
  
  const startEdge = getEdgeIndex(start);
  const endEdge = getEdgeIndex(end);
  
  const points: Point[] = [];
  
  // Walk clockwise from start edge to end edge, adding corner points
  let currentEdge = startEdge;
  while (currentEdge !== endEdge) {
    points.push(corners[currentEdge]);
    currentEdge = (currentEdge + 1) % 4;
  }
  
  return points;
}

/**
 * Calculate the available area polygon for a wedge segment
 */
export function calculateWedgeArea(
  centerX: number,
  centerY: number,
  startAngleDeg: number,
  endAngleDeg: number,
  menuRadius: number,
  bounds: ScreenBounds
): WedgeArea {
  // Find where wedge edges hit the screen
  const startIntersection = findRayScreenIntersection(centerX, centerY, startAngleDeg, bounds);
  const endIntersection = findRayScreenIntersection(centerX, centerY, endAngleDeg, bounds);
  
  // Points on the menu edge (arc approximation)
  const menuArcPoints: Point[] = [];
  const numArcPoints = 8;
  for (let i = 0; i <= numArcPoints; i++) {
    const angle = startAngleDeg + (endAngleDeg - startAngleDeg) * (i / numArcPoints);
    const rad = (angle * Math.PI) / 180;
    menuArcPoints.push({
      x: centerX + Math.cos(rad) * menuRadius,
      y: centerY + Math.sin(rad) * menuRadius,
    });
  }
  
  // Build polygon: menu arc -> start edge to screen -> screen edges -> end edge from screen
  const polygon: Point[] = [
    ...menuArcPoints,
    startIntersection,
    ...getEdgePointsBetween(startIntersection, endIntersection, bounds),
    endIntersection,
  ];
  
  // Calculate centroid of the available area (excluding menu circle area)
  // Use a simplified approach: find center of the wedge at 60% distance to screen
  const midAngle = (startAngleDeg + endAngleDeg) / 2;
  const midRad = (midAngle * Math.PI) / 180;
  const midScreenPoint = findRayScreenIntersection(centerX, centerY, midAngle, bounds);
  const distToScreen = Math.sqrt(
    Math.pow(midScreenPoint.x - centerX, 2) + 
    Math.pow(midScreenPoint.y - centerY, 2)
  );
  
  // Position content at optimal distance - between menu edge and screen edge
  // Use 35-45% of the way from menu to screen for best placement
  const optimalDistance = menuRadius + (distToScreen - menuRadius) * 0.4;
  
  const centroid: Point = {
    x: centerX + Math.cos(midRad) * optimalDistance,
    y: centerY + Math.sin(midRad) * optimalDistance,
  };
  
  // Calculate available dimensions within the wedge at this position
  // Width: perpendicular to the mid-angle direction
  const perpRad = midRad + Math.PI / 2;
  const angleSpanRad = ((endAngleDeg - startAngleDeg) * Math.PI) / 180;
  
  // Available width is roughly the arc length at the content distance
  const arcWidth = optimalDistance * Math.sin(angleSpanRad / 2) * 2;
  
  // Available height is the remaining distance to screen
  const remainingToScreen = distToScreen - optimalDistance;
  const remainingFromMenu = optimalDistance - menuRadius;
  const availableDepth = Math.min(remainingToScreen, remainingFromMenu) * 1.5;
  
  // Also clamp by screen boundaries
  const distToLeft = centroid.x - bounds.left;
  const distToRight = bounds.right - centroid.x;
  const distToTop = centroid.y - bounds.top;
  const distToBottom = bounds.bottom - centroid.y;
  
  const availableWidth = Math.min(arcWidth, distToLeft * 2, distToRight * 2, 320);
  const availableHeight = Math.min(availableDepth, distToTop * 2, distToBottom * 2, 220);
  
  return {
    polygon,
    centroid,
    availableWidth: Math.max(100, availableWidth),
    availableHeight: Math.max(80, availableHeight),
  };
}

/**
 * Calculate optimal content placement for a wedge
 */
export function calculateContentPlacement(
  centerX: number,
  centerY: number,
  startAngleDeg: number,
  endAngleDeg: number,
  menuRadius: number,
  screenWidth: number,
  screenHeight: number,
  edgePadding: number = 24
): {
  x: number;
  y: number;
  width: number;
  height: number;
  textAlign: 'left' | 'right' | 'center';
} {
  const bounds: ScreenBounds = {
    left: edgePadding,
    right: screenWidth - edgePadding,
    top: edgePadding,
    bottom: screenHeight - edgePadding,
  };
  
  const wedgeArea = calculateWedgeArea(
    centerX,
    centerY,
    startAngleDeg,
    endAngleDeg,
    menuRadius + 40, // Add buffer from menu edge
    bounds
  );
  
  // Determine text alignment based on position
  const midAngle = (startAngleDeg + endAngleDeg) / 2;
  const normalizedAngle = ((midAngle % 360) + 360) % 360;
  
  let textAlign: 'left' | 'right' | 'center';
  if (normalizedAngle > 90 && normalizedAngle < 270) {
    // Left side of screen
    textAlign = 'left';
  } else {
    // Right side of screen
    textAlign = 'right';
  }
  
  // Clamp content position to stay fully on screen
  const halfWidth = wedgeArea.availableWidth / 2;
  const halfHeight = wedgeArea.availableHeight / 2;
  
  const clampedX = Math.max(
    bounds.left + halfWidth,
    Math.min(bounds.right - halfWidth, wedgeArea.centroid.x)
  );
  const clampedY = Math.max(
    bounds.top + halfHeight,
    Math.min(bounds.bottom - halfHeight, wedgeArea.centroid.y)
  );
  
  return {
    x: clampedX - centerX, // Return relative to center
    y: clampedY - centerY,
    width: wedgeArea.availableWidth,
    height: wedgeArea.availableHeight,
    textAlign,
  };
}
