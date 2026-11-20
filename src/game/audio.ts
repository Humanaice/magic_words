import magicUrl from '../assets/sound/magic.wav';
import musicUrl from '../assets/sound/music.wav';

const MUTE_KEY = 'magic-words:muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Background music and the "magic" sound effect (from the front branch of the
 * original project). Audio elements are created lazily on the first user
 * gesture, and the music is not downloaded while muted.
 */
export class GameAudio {
  private music: HTMLAudioElement | null = null;
  private magic: HTMLAudioElement | null = null;
  private musicWanted = false;
  muted = readMuted();

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Storage unavailable (private mode): the setting just won't persist.
    }
    if (muted) this.music?.pause();
    else if (this.musicWanted) this.playMusic();
  }

  playMusic(): void {
    this.musicWanted = true;
    if (this.muted) return;
    if (!this.music) {
      this.music = new Audio(musicUrl);
      this.music.loop = true;
      this.music.volume = 0.5;
    }
    this.music.play().catch(() => undefined);
  }

  pauseMusic(): void {
    this.musicWanted = false;
    this.music?.pause();
  }

  stopMusic(): void {
    this.pauseMusic();
    if (this.music) this.music.currentTime = 0;
  }

  playMagic(): void {
    if (this.muted) return;
    this.magic ??= new Audio(magicUrl);
    this.magic.volume = 0.6;
    this.magic.currentTime = 0;
    this.magic.play().catch(() => undefined);
  }

  dispose(): void {
    this.stopMusic();
    this.music = null;
    this.magic = null;
  }
}
