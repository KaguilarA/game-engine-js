export type Polarity = 'light' | 'dark';

export const POLARITY_COLORS: Record<Polarity, string> = {
  light: '#72dcff',
  dark: '#ff6584'
};

export function oppositePolarity(polarity: Polarity): Polarity {
  return polarity === 'light' ? 'dark' : 'light';
}
