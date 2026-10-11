interface ProceduralTrack {
  name: string;
  bpm: number;
  notes: number[];
  bass: number;
  wave: OscillatorType;
  drums: boolean;
}

const menuTracks: ProceduralTrack[] = [
  { name: 'Amber Horizon', bpm: 88, notes: [110, 130.8, 164.8, 196, 164.8, 130.8, 98, 130.8], bass: 55, wave: 'sine', drums: false },
  { name: 'Baobab Lights', bpm: 102, notes: [146.8, 174.6, 220, 196, 164.8, 146.8, 130.8, 164.8], bass: 73.4, wave: 'triangle', drums: false },
  { name: 'Moon Over Pride Rock', bpm: 76, notes: [98, 123.5, 146.8, 185, 164.8, 146.8, 123.5, 110], bass: 49, wave: 'sine', drums: false },
];

const raceTracks: ProceduralTrack[] = [
  { name: 'Dustline', bpm: 148, notes: [55, 55, 82.4, 73.4, 55, 98, 82.4, 73.4], bass: 41.2, wave: 'sawtooth', drums: true },
  { name: 'Apex Predator', bpm: 164, notes: [65.4, 65.4, 98, 110, 82.4, 82.4, 123.5, 110], bass: 49, wave: 'square', drums: true },
  { name: 'Red Earth Rush', bpm: 136, notes: [73.4, 73.4, 110, 98, 82.4, 82.4, 123.5, 98], bass: 36.7, wave: 'sawtooth', drums: true },
  { name: 'Wildebeest Run', bpm: 176, notes: [49, 73.4, 98, 73.4, 55, 82.4, 110, 82.4], bass: 41.2, wave: 'triangle', drums: true },
  { name: 'Savanna Overdrive', bpm: 154, notes: [61.7, 61.7, 92.5, 82.4, 69.3, 69.3, 103.8, 92.5], bass: 46.2, wave: 'sawtooth', drums: true },
];

export class GameAudio {
  private context?: AudioContext;
  private musicTimer?: number;
  private note = 0;
  private mode: 'menu' | 'race' = 'menu';
  readonly selected = { menu: 0, race: 0 };
  muted = false;

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  ui(): void { this.tone(520, .045, 'square', .035); }
  countdown(): void { this.tone(170, .12, 'triangle', .08); }
  go(): void { this.tone(720, .24, 'sawtooth', .09); }
  hit(): void { this.tone(85, .2, 'sawtooth', .1); }

  trackList(mode: 'menu' | 'race'): string[] { return (mode === 'menu' ? menuTracks : raceTracks).map((track) => track.name); }

  startMusic(mode: 'menu' | 'race' = 'menu', selected = this.selected[mode]): void {
    this.unlock();
    const playlist = mode === 'menu' ? menuTracks : raceTracks;
    const index = THREEClamp(selected, 0, playlist.length - 1);
    this.selected[mode] = index;
    if (this.musicTimer && this.mode === mode && this.note > 0 && this.activeIndex === index) return;
    this.stopMusic();
    this.mode = mode;
    this.activeIndex = index;
    this.note = 0;
    const track = playlist[index]!;
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const beat = this.note++ % track.notes.length;
      const frequency = track.notes[beat]!;
      const interval = 60 / track.bpm;
      this.tone(frequency, interval * (mode === 'menu' ? 1.7 : .72), track.wave, mode === 'menu' ? .028 : .035);
      if (beat % 2 === 0) this.tone(track.bass, interval * .65, 'sine', mode === 'menu' ? .032 : .065);
      if (mode === 'menu' && beat % 4 === 2) this.tone(frequency * 1.5, interval * .8, 'triangle', .014);
      if (track.drums && beat % 2 === 0) this.tone(38, .055, 'sine', .06);
      if (track.drums && beat % 4 === 2) this.tone(180 + Math.random() * 120, .035, 'square', .018);
    }, 60000 / track.bpm);
  }

  private activeIndex = -1;

  selectTrack(mode: 'menu' | 'race', index: number): void {
    this.selected[mode] = index;
    if (this.mode === mode) this.startMusic(mode, index);
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
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

function THREEClamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.floor(value))); }
