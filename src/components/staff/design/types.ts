export type DesignElementType = 'text' | 'image' | 'shape' | 'line';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star' | 'arrow' | 'diamond' | 'hexagon' | 'pentagon';

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
  textShadow?: string;
  textOutline?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  isBackground?: boolean;
  // Shape props
  shapeType?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // Image props
  src?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Image filters
  filter?: string;
  // Line props
  x2?: number;
  y2?: number;
}

export interface DesignPage {
  id: string;
  name: string;
  elements: DesignElement[];
  background: string;
  backgroundImage?: string;
}

export interface DesignProject {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  backgroundImage?: string;
  elements: DesignElement[];
  pages?: DesignPage[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  colours: string[];
  fonts: string[];
  logos: string[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  background: string;
  elements: Partial<DesignElement>[];
  thumbnail?: string;
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
  'Agrandir Tight',
];

export const SHAPE_DEFAULTS: Record<ShapeType, Partial<DesignElement>> = {
  rectangle: { fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0, borderRadius: 0 },
  circle: { fill: '#ef4444', stroke: 'transparent', strokeWidth: 0 },
  triangle: { fill: '#22c55e', stroke: 'transparent', strokeWidth: 0 },
  star: { fill: '#eab308', stroke: 'transparent', strokeWidth: 0 },
  arrow: { fill: '#8b5cf6', stroke: 'transparent', strokeWidth: 0 },
  diamond: { fill: '#f97316', stroke: 'transparent', strokeWidth: 0 },
  hexagon: { fill: '#06b6d4', stroke: 'transparent', strokeWidth: 0 },
  pentagon: { fill: '#d946ef', stroke: 'transparent', strokeWidth: 0 },
};

export const IMAGE_FILTERS = [
  { name: 'None', value: 'none' },
  { name: 'Grayscale', value: 'grayscale(100%)' },
  { name: 'Sepia', value: 'sepia(100%)' },
  { name: 'Blur', value: 'blur(3px)' },
  { name: 'Brightness', value: 'brightness(1.3)' },
  { name: 'Contrast', value: 'contrast(1.5)' },
  { name: 'Saturate', value: 'saturate(2)' },
  { name: 'Hue Rotate', value: 'hue-rotate(90deg)' },
  { name: 'Invert', value: 'invert(100%)' },
  { name: 'Duotone', value: 'grayscale(100%) sepia(100%) hue-rotate(180deg) saturate(2)' },
  { name: 'Vintage', value: 'sepia(50%) contrast(1.1) brightness(0.9)' },
  { name: 'Pixelate', value: 'contrast(1.5) brightness(1.1)' },
];

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'social-announcement',
    name: 'Social Announcement',
    category: 'Social Media',
    width: 1080,
    height: 1080,
    background: '#1a1a2e',
    elements: [
      { type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 1080, height: 1080, fill: '#1a1a2e', opacity: 1 },
      { type: 'text', text: 'ANNOUNCEMENT', x: 140, y: 200, width: 800, height: 80, fontSize: 64, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
      { type: 'shape', shapeType: 'rectangle', x: 340, y: 300, width: 400, height: 4, fill: '#e94560' },
      { type: 'text', text: 'Your message here', x: 140, y: 400, width: 800, height: 200, fontSize: 36, fontFamily: 'Agrandir Tight', color: '#cccccc', textAlign: 'center' },
    ],
  },
  {
    id: 'match-day',
    name: 'Match Day',
    category: 'Sports',
    width: 1080,
    height: 1080,
    background: '#0f3460',
    elements: [
      { type: 'text', text: 'MATCH DAY', x: 190, y: 100, width: 700, height: 100, fontSize: 80, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
      { type: 'text', text: 'VS', x: 440, y: 450, width: 200, height: 80, fontSize: 72, fontFamily: 'Agrandir Tight', color: '#e94560', textAlign: 'center' },
      { type: 'text', text: 'Saturday, 3:00 PM', x: 240, y: 850, width: 600, height: 50, fontSize: 28, fontFamily: 'Agrandir Tight', color: '#aaaaaa', textAlign: 'center' },
    ],
  },
  {
    id: 'player-spotlight',
    name: 'Player Spotlight',
    category: 'Sports',
    width: 1080,
    height: 1920,
    background: '#16213e',
    elements: [
      { type: 'shape', shapeType: 'rectangle', x: 0, y: 1400, width: 1080, height: 520, fill: '#0f3460' },
      { type: 'text', text: 'PLAYER SPOTLIGHT', x: 90, y: 100, width: 900, height: 80, fontSize: 48, fontFamily: 'Agrandir Tight', color: '#e94560', textAlign: 'center' },
      { type: 'text', text: 'Player Name', x: 90, y: 1480, width: 900, height: 80, fontSize: 56, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
      { type: 'text', text: 'Position | #00', x: 90, y: 1580, width: 900, height: 50, fontSize: 28, fontFamily: 'Agrandir Tight', color: '#aaaaaa', textAlign: 'center' },
    ],
  },
  {
    id: 'minimalist-quote',
    name: 'Minimalist Quote',
    category: 'Social Media',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    elements: [
      { type: 'text', text: '"', x: 100, y: 200, width: 100, height: 150, fontSize: 200, fontFamily: 'Agrandir Tight', color: '#e0e0e0' },
      { type: 'text', text: 'Your inspirational quote goes here', x: 150, y: 350, width: 780, height: 250, fontSize: 42, fontFamily: 'Agrandir Tight', fontStyle: 'italic', color: '#333333', textAlign: 'center' },
      { type: 'shape', shapeType: 'rectangle', x: 440, y: 650, width: 200, height: 3, fill: '#333333' },
      { type: 'text', text: '— Author Name', x: 250, y: 700, width: 580, height: 50, fontSize: 24, fontFamily: 'Agrandir Tight', color: '#666666', textAlign: 'center' },
    ],
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    category: 'Video',
    width: 1280,
    height: 720,
    background: '#ff0000',
    elements: [
      { type: 'shape', shapeType: 'rectangle', x: 0, y: 0, width: 1280, height: 720, fill: '#1a1a1a' },
      { type: 'text', text: 'VIDEO TITLE', x: 80, y: 200, width: 600, height: 120, fontSize: 72, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff' },
      { type: 'text', text: 'Subtitle text here', x: 80, y: 340, width: 600, height: 60, fontSize: 32, fontFamily: 'Agrandir Tight', color: '#cccccc' },
    ],
  },
  {
    id: 'gradient-story',
    name: 'Gradient Story',
    category: 'Social Media',
    width: 1080,
    height: 1920,
    background: '#667eea',
    elements: [
      { type: 'text', text: 'SWIPE UP', x: 290, y: 1600, width: 500, height: 60, fontSize: 36, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
      { type: 'text', text: 'Your Story Title', x: 90, y: 700, width: 900, height: 100, fontSize: 64, fontFamily: 'Agrandir Tight', fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
      { type: 'text', text: 'Add description here', x: 140, y: 850, width: 800, height: 60, fontSize: 28, fontFamily: 'Agrandir Tight', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    ],
  },
];
