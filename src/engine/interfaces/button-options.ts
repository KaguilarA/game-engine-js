export interface ButtonOptions {
  onClick: () => void;
  shape?: 'rectangle' | 'circle';
  dimensions?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX?: number;
    pivotY?: number;
  };
}
