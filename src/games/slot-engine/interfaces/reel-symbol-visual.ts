export interface ReelSymbolVisual {
  update(deltaSeconds: number, isWinning?: boolean): void;
  draw(centerX: number, centerY: number, width: number, height: number, blurAmount?: number, isWinning?: boolean): void;
  setSymbol?(symbol: string): void;
  setWinning?(isWinning: boolean): void;
}
