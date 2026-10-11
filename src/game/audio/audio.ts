export class GameAudio {
  private context?: AudioContext;
  private musicTimer?: number;
  private note = 0;
  private mode: 'menu' | 'race' = 'menu';
  muted = false;

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  ui(): void { this.tone(520, 0.045, 'square', 0.035); }
  countdown(): void { this.tone(170, 0.12, 'triangle', 0.08); }
  go(): void { this.tone(720, 0.24, 'sawtooth', 0.09); }
  hit(): void { this.tone(85, 0.2, 'sawtooth', 0.1); }

  startMusic(mode: 'menu' | 'race' = 'menu'): void {
    this.unlock();
    if (this.musicTimer && this.mode === mode) return;
    this.stopMusic();
    this.mode = mode;
    this.note = 0;
    const menuLine = [110, 130.8, 164.8, 196, 164.8, 130.8, 98, 130.8];
    const raceLine = [55, 55, 82.4, 73.4, 55, 55, 98, 82.4];
    const line = mode === 'menu' ? menuLine : raceLine;
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const beat = this.note++ % line.length;
      if (mode === 'menu') {
        this.tone(line[beat]!, .42, beat % 3 ? 'sine' : 'triangle', .027);
        if (beat % 4 === 0) this.tone(line[beat]! / 2, .6, 'sine', .035);
        if (beat % 4 === 2) this.tone(line[beat]! * 1.5, .2, 'triangle', .013);
      } else {
        this.tone(line[beat]!, .14, beat % 2 ? 'triangle' : 'sawtooth', .045);
        if (beat % 2 === 0) this.tone(42, .07, 'sine', .07);
        if (beat % 4 === 2) this.tone(220 + Math.random() * 80, .035, 'square', .018);
      }
    }, mode === 'menu' ? 340 : 190);
  }

  stopMusic(): void {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}
