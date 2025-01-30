export type Breakpoint = 'lg' | 'xl' | '2xl' | '3xl';

export interface Position {
  left: number;
  top: number;
}

export interface ImagePosition {
  left: number;
  top: number;
}

export interface ButtonItem {
  id: number;
  type: 'button';
  label: string;
  path: string;
  hasMobileBird?: boolean;
  isAuth?: boolean;
  positions: Record<Breakpoint, Position>;
  imagePositions?: Record<Breakpoint, ImagePosition>;
}

export interface IconItem {
  id: number;
  type: 'icon';
  path: string;
  icon: React.ReactNode;
  positions: Record<Breakpoint, Position>;
}

export type MenuItem = ButtonItem | IconItem;