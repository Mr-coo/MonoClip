export interface TextGradient {
  type: 'linear' | 'radial';
  fromColor: string;
  toColor: string;
  angle: number;
}

export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  opacity: number;
  gradient: TextGradient | null;
  strokeColor: string;
  strokeWidth: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOpacity: number;
  bgColor: string;
  bgOpacity: number;
  bgPadding: number;
  bgRadius: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  content: 'Text',
  fontFamily: 'sans-serif',
  fontSize: 96,
  fontWeight: 400,
  letterSpacing: 0,
  lineHeight: 1.2,
  textAlign: 'center',
  color: '#ffffff',
  opacity: 1,
  gradient: null,
  strokeColor: '#000000',
  strokeWidth: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: '#000000',
  shadowOpacity: 0,
  bgColor: '#000000',
  bgOpacity: 0,
  bgPadding: 16,
  bgRadius: 8,
};

export const FONT_FAMILIES = [
  'sans-serif', 'serif', 'monospace', 'cursive',
  'Arial', 'Georgia', 'Verdana', 'Impact', 'Tahoma',
  'Times New Roman', 'Courier New', 'Trebuchet MS',
];

export const FONT_WEIGHTS: { value: number; label: string }[] = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'ExtraLight' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'ExtraBold' },
  { value: 900, label: 'Black' },
];
