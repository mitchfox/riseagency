export type DesignElementType = 'text' | 'image' | 'shape' | 'line';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star' | 'arrow' | 'diamond';

export interface DesignElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
  // Text props
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  textDecoration?: string;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  // Shape props
  shapeType?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Image props
  src?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Line props
  x2?: number;
  y2?: number;
}

export interface DesignProject {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  backgroundImage?: string;
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedAsset {
  id: string;
  name: string;
  url: string;
  category: 'player-images' | 'logos' | 'backgrounds' | 'assets';
  createdAt: string;
}

export type Tool = 'select' | 'text' | 'shape' | 'line' | 'hand' | 'crop';

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export const CANVAS_PRESETS = [
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Facebook Post', width: 1200, height: 630 },
  { name: 'Twitter Post', width: 1600, height: 900 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'A4 Portrait', width: 2480, height: 3508 },
  { name: 'A4 Landscape', width: 3508, height: 2480 },
  { name: 'Custom', width: 1920, height: 1080 },
] as const;

export const FONT_FAMILIES = [
  'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New',
  'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
];

export const SHAPE_DEFAULTS: Record<ShapeType, Partial<DesignElement>> = {
  rectangle: { fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0, borderRadius: 0 },
  circle: { fill: '#ef4444', stroke: 'transparent', strokeWidth: 0 },
  triangle: { fill: '#22c55e', stroke: 'transparent', strokeWidth: 0 },
  star: { fill: '#eab308', stroke: 'transparent', strokeWidth: 0 },
  arrow: { fill: '#8b5cf6', stroke: 'transparent', strokeWidth: 0 },
  diamond: { fill: '#f97316', stroke: 'transparent', strokeWidth: 0 },
};
