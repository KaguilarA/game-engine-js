import { describe, expect, it } from 'vitest';
import { Label } from './label';
import { NumberLabel } from './number-label';

describe('UI Labels', () => {
  it('manages reactive text and styles in Label', () => {
    const label = new Label('Hello World', { fontSize: 20, color: '#ff0000' });

    expect(label.getText()).toBe('Hello World');

    label.setText('New Text');
    expect(label.getText()).toBe('New Text');

    label.setStyle({ color: '#00ff00', fontSize: 30 });
    // Dimensions height scales with font size
    expect(label.dimensions.getHeight()).toBeGreaterThan(0);
  });

  it('formats numeric values and currency in NumberLabel', () => {
    const numLabel = new NumberLabel(1250.5, {}, { mode: 'currency', currency: 'USD' });

    expect(numLabel.getValue()).toBe(1250.5);
    expect(numLabel.getText()).toContain('1,250.50');

    numLabel.setValue(42);
    expect(numLabel.getValue()).toBe(42);
  });
});
