import { describe, expect, it } from 'vitest';
import { Reel } from './reel';
import { ReelBank } from './reel-bank';
import { ReelAnimationProfile } from './reel-animation-profile';

describe('Slot Machine Primitives (Reel & ReelBank)', () => {
  const symbols = ['CHERRY', 'BELL', 'SEVEN'];
  const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];

  it('manages reel spinning phases and settling', () => {
    const options = ReelAnimationProfile.createOptions(3);
    const reel = new Reel(['BELL', 'BELL', 'BELL'], getRandomSymbol, options);

    expect(reel.isActive()).toBe(false);
    expect(reel.symbols()).toEqual(['BELL', 'BELL', 'BELL']);
    expect(reel.rowCount).toBe(3);

    // Spin reel to target
    reel.startSpin(['SEVEN', 'SEVEN', 'SEVEN'], 10, 0.5);
    expect(reel.isActive()).toBe(true);

    // Simulate completion
    reel.update(1.0);
    expect(reel.isActive()).toBe(false);
    expect(reel.symbols()).toEqual(['SEVEN', 'SEVEN', 'SEVEN']);
  });

  it('manages a multi-reel ReelBank with synchronous settling state', () => {
    const bank = new ReelBank({
      reelCount: 3,
      rowCount: 3,
      randomSymbol: getRandomSymbol
    });

    expect(bank.reels.length).toBe(3);
    expect(bank.isSettled).toBe(true);

    // Start spin on all reels
    bank.startSpin();

    expect(bank.isSettled).toBe(false);

    // Fast stop
    bank.requestFastStop();

    // Advance in small steps through braking and settling phases.
    for (let frame = 0; frame < 50 && !bank.isSettled; frame++) bank.update(0.1);
    expect(bank.isSettled).toBe(true);
  });
});
