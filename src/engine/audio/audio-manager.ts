import { signalValue, type SignalValue } from 'reactive-values';
import { MathUtils } from '../core';
import GameLoader from '../assets/loader';

/**
 * Centralized audio management for sound effects and background music.
 * @class AudioManager
 */
export class AudioManager {
  /**
   * Stores master volume multiplier.
   * @property {SignalValue<number>} masterVolume
   * @public
   * @readonly
   */
  public readonly masterVolume: SignalValue<number> = signalValue(1.0);

  /**
   * Stores sound effects volume multiplier.
   * @property {SignalValue<number>} sfxVolume
   * @public
   * @readonly
   */
  public readonly sfxVolume: SignalValue<number> = signalValue(1.0);

  /**
   * Stores background music volume multiplier.
   * @property {SignalValue<number>} bgmVolume
   * @public
   * @readonly
   */
  public readonly bgmVolume: SignalValue<number> = signalValue(0.7);

  /**
   * Stores whether audio is globally muted.
   * @property {SignalValue<boolean>} muted
   * @public
   * @readonly
   */
  public readonly muted: SignalValue<boolean> = signalValue(false);

  /**
   * Stores the current BGM audio element.
   * @property {HTMLAudioElement | undefined} currentBgm
   * @private
   */
  private currentBgm: HTMLAudioElement | undefined;

  /**
   * Stores the current BGM track name.
   * @property {SignalValue<string | undefined>} currentBgmName
   * @private
   * @readonly
   */
  private readonly currentBgmName: SignalValue<string | undefined> = signalValue<string | undefined>(undefined);

  /**
   * Stores the volume scaling factor for the active BGM.
   * @property {number} currentBgmScale
   * @private
   */
  private currentBgmScale = 1.0;

  /**
   * Stores whether BGM was active before window blur.
   * @property {boolean} bgmWasPlayingBeforeBlur
   * @private
   */
  private bgmWasPlayingBeforeBlur = false;

  /**
   * Creates an audio manager instance.
   * @public
   * @return {void}
   */
  public constructor() {
    this.installVisibilityListener();
  }

  /**
   * Plays a preloaded sound effect.
   * @public
   * @return {HTMLAudioElement | undefined}
   */
  public playSfx(name: string, volumeScale = 1.0): HTMLAudioElement | undefined {
    if (this.muted()) return undefined;

    try {
      const source = GameLoader.getAudio(name);
      const audio = source.cloneNode(true) as HTMLAudioElement;
      audio.currentTime = 0;

      const effectiveVolume = MathUtils.clamp(
        this.masterVolume() * this.sfxVolume() * volumeScale,
        0,
        1
      );
      audio.volume = effectiveVolume;

      const playback = audio.play();
      if (playback) {
        playback.catch((error: unknown) => {
          console.warn(`[AudioManager] Unable to play SFX "${name}":`, error);
        });
      }
      return audio;
    } catch (error) {
      console.warn(`[AudioManager] SFX "${name}" could not be loaded:`, error);
      return undefined;
    }
  }

  /**
   * Starts playing a background music track.
   * @public
   * @return {void}
   */
  public playBgm(name: string, loop = true, volumeScale = 1.0): void {
    if (this.currentBgmName() === name && this.currentBgm && !this.currentBgm.paused) {
      return;
    }

    this.stopBgm();

    try {
      const source = GameLoader.getAudio(name);
      this.currentBgm = source.cloneNode(true) as HTMLAudioElement;
      this.currentBgmName.set(name);
      this.currentBgmScale = volumeScale;
      this.currentBgm.loop = loop;
      this.applyBgmVolume();

      if (!this.muted()) {
        const playback = this.currentBgm.play();
        if (playback) {
          playback.catch((error: unknown) => {
            console.warn(`[AudioManager] Unable to play BGM "${name}":`, error);
          });
        }
      }
    } catch (error) {
      console.warn(`[AudioManager] BGM "${name}" could not be loaded:`, error);
    }
  }

  /**
   * Stops the active background music track.
   * @public
   * @return {void}
   */
  public stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = undefined;
      this.currentBgmName.set(undefined);
    }
  }

  /**
   * Pauses the active background music track.
   * @public
   * @return {void}
   */
  public pauseBgm(): void {
    if (this.currentBgm && !this.currentBgm.paused) {
      this.currentBgm.pause();
    }
  }

  /**
   * Resumes the paused background music track.
   * @public
   * @return {void}
   */
  public resumeBgm(): void {
    if (this.currentBgm && this.currentBgm.paused && !this.muted()) {
      const playback = this.currentBgm.play();
      if (playback) {
        playback.catch((error: unknown) => {
          console.warn(`[AudioManager] Unable to resume BGM "${this.currentBgmName()}":`, error);
        });
      }
    }
  }

  /**
   * Sets the master volume multiplier.
   * @public
   * @return {void}
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume.set(MathUtils.clamp(volume, 0, 1));
    this.applyBgmVolume();
  }

  /**
   * Sets the SFX volume multiplier.
   * @public
   * @return {void}
   */
  public setSfxVolume(volume: number): void {
    this.sfxVolume.set(MathUtils.clamp(volume, 0, 1));
  }

  /**
   * Sets the BGM volume multiplier.
   * @public
   * @return {void}
   */
  public setBgmVolume(volume: number): void {
    this.bgmVolume.set(MathUtils.clamp(volume, 0, 1));
    this.applyBgmVolume();
  }

  /**
   * Sets whether all audio is muted.
   * @public
   * @return {void}
   */
  public setMuted(muted: boolean): void {
    this.muted.set(muted);
    if (muted) {
      if (this.currentBgm && !this.currentBgm.paused) {
        this.currentBgm.pause();
      }
    } else {
      this.applyBgmVolume();
      if (this.currentBgm && this.currentBgm.paused) {
        void this.currentBgm.play().catch(() => {});
      }
    }
  }

  /**
   * Toggles the current muted state.
   * @public
   * @return {boolean}
   */
  public toggleMute(): boolean {
    const next = !this.muted();
    this.setMuted(next);
    return next;
  }

  /**
   * Calculates and applies effective volume to active BGM audio.
   * @private
   * @return {void}
   */
  private applyBgmVolume(): void {
    if (this.currentBgm) {
      const effectiveVolume = this.muted()
        ? 0
        : MathUtils.clamp(this.masterVolume() * this.bgmVolume() * this.currentBgmScale, 0, 1);
      this.currentBgm.volume = effectiveVolume;
    }
  }

  /**
   * Attaches window visibility listener.
   * @private
   * @return {void}
   */
  private installVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.currentBgm && !this.currentBgm.paused) {
          this.bgmWasPlayingBeforeBlur = true;
          this.currentBgm.pause();
        } else {
          this.bgmWasPlayingBeforeBlur = false;
        }
      } else {
        if (this.bgmWasPlayingBeforeBlur && !this.muted()) {
          this.resumeBgm();
        }
        this.bgmWasPlayingBeforeBlur = false;
      }
    });
  }
}

const GameAudio = new AudioManager();
export default GameAudio;
