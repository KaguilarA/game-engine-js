export interface GameChoice {
  title: string;
  description: string;
  start: (onReturnToMenu: () => void) => void;
}
