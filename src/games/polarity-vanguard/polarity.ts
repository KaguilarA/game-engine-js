/**
 * Two projectile/player states that determine which shots can be absorbed.
 */
export type Polarity = 'light' | 'dark';

/**
 * Canvas colors associated with each polarity.
 */
export const POLARITY_COLORS: Record<Polarity, string> = {
  light: '#72dcff',
  dark: '#ff6584'
};

/**
 * Returns the other of the two available polarities.
 */
export function oppositePolarity(polarity: Polarity): Polarity {
  return polarity === 'light' ? 'dark' : 'light';
}
