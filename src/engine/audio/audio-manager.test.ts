import { describe, expect, it } from 'vitest';
import { AudioManager } from './audio-manager';

describe('AudioManager', () => {
  it('manages volumes and clamps values within [0, 1]', () => {
    const audio = new AudioManager();

    audio.setMasterVolume(0.5);
    expect(audio.masterVolume()).toBe(0.5);

    audio.setMasterVolume(1.8);
    expect(audio.masterVolume()).toBe(1.0);

    audio.setMasterVolume(-0.2);
    expect(audio.masterVolume()).toBe(0.0);

    audio.setSfxVolume(0.8);
    expect(audio.sfxVolume()).toBe(0.8);

    audio.setBgmVolume(0.4);
    expect(audio.bgmVolume()).toBe(0.4);
  });

  it('manages mute and toggleMute', () => {
    const audio = new AudioManager();

    expect(audio.muted()).toBe(false);
    expect(audio.toggleMute()).toBe(true);
    expect(audio.muted()).toBe(true);

    expect(audio.toggleMute()).toBe(false);
    expect(audio.muted()).toBe(false);

    audio.setMuted(true);
    expect(audio.muted()).toBe(true);
  });
});
