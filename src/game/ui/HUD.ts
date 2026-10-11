import * as THREE from 'three';
import { Track } from '../tracks/track';

export class HUD {
  readonly element = document.createElement('div');
  private speed!: HTMLElement;
  private position!: HTMLElement;
  private lap!: HTMLElement;
  private progress!: HTMLElement;
  private stamina!: HTMLElement;
  private breath!: HTMLElement;
  private toast!: HTMLElement;
  private toastTimer = 0;
  private map!: HTMLCanvasElement;

  constructor(parent: HTMLElement, private track: Track) {
    this.element.className = 'race-hud';
    this.element.innerHTML = `
      <div class="hud-top"><div class="hud-brand">SAVANNA <b>UNDERGROUND</b><small>PRIDE LANDS / CIRCUIT</small></div><div class="hud-position"><span>POSITION</span><strong id="hud-position">1/4</strong></div><div class="hud-lap"><span>LAP</span><strong id="hud-lap">1/3</strong></div></div>
      <div class="hud-map"><label>TRACK POSITION</label><canvas width="180" height="140"></canvas></div>
      <div class="hud-speed"><strong id="hud-speed">00</strong><span>KM/H</span></div>
      <div class="hud-bottom"><div class="hud-meter"><label>STAMINA</label><div class="meter"><i id="hud-stamina"></i></div><label>BREATH</label><div class="meter breath"><i id="hud-breath"></i></div></div><div class="hud-progress"><label>RACE PROGRESS</label><div class="progress-track"><i id="hud-progress"></i></div><small id="hud-percent">00%</small></div><div class="hud-controls">WASD / ARROWS <span>RUN</span>　SHIFT <span>BURST</span>　SPACE <span>JUMP</span>　ESC <span>PAUSE</span><br>PAD: STICK <span>STEER</span>　RT <span>RUN</span>　LT <span>BRAKE</span>　A <span>JUMP</span>　X <span>BURST</span></div></div>
      <div class="race-toast" id="race-toast"></div><div class="countdown" id="countdown"></div>`;
    parent.append(this.element);
    this.speed = this.element.querySelector('#hud-speed')!;
    this.position = this.element.querySelector('#hud-position')!;
    this.lap = this.element.querySelector('#hud-lap')!;
    this.progress = this.element.querySelector('#hud-progress')!;
    this.stamina = this.element.querySelector('#hud-stamina')!;
    this.breath = this.element.querySelector('#hud-breath')!;
    this.toast = this.element.querySelector('#race-toast')!;
    this.map = this.element.querySelector('canvas')!;
    this.drawMap([]);
  }

  update(speed: number, place: number, racers: number, lap: number, totalLaps: number, progress: number, stamina: number, breath: number, runnerProgress: number[] = []): void {
    const modeName = this.track.mode === 'circuit' ? 'PRIDE LANDS / CIRCUIT' : this.track.mode === 'sprint' ? 'OUTLANDS / SPRINT' : 'DRY RIVER / DRAG';
    this.element.querySelector('.hud-brand small')!.textContent = modeName;
    this.speed.textContent = Math.round(speed * 2.35).toString().padStart(2, '0');
    this.position.textContent = `${place}/${racers}`;
    this.lap.textContent = `${lap}/${totalLaps}`;
    this.progress.style.width = `${progress * 100}%`;
    this.stamina.style.width = `${stamina * 100}%`;
    this.breath.style.width = `${breath * 100}%`;
    this.element.querySelector('#hud-percent')!.textContent = `${Math.floor(progress * 100)}%`;
    this.drawMap(runnerProgress);
  }

  private drawMap(runnerProgress: number[]): void {
    const ctx = this.map.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.map;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(18,19,15,.58)';
    ctx.fillRect(0, 0, width, height);
    const points = this.track.curve.getPoints(180);
    const xs = points.map((p) => p.x), zs = points.map((p) => p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const scale = Math.min((width - 34) / (maxX - minX), (height - 28) / (maxZ - minZ));
    const ox = (width - (maxX - minX) * scale) / 2, oy = (height - (maxZ - minZ) * scale) / 2;
    const xy = (p: THREE.Vector3): [number, number] => [ox + (p.x - minX) * scale, height - oy - (p.z - minZ) * scale];
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(230,199,136,.24)';
    ctx.lineWidth = 13;
    ctx.beginPath();
    points.forEach((p, i) => { const [x, y] = xy(p); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    if (this.track.mode === 'circuit') ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#d4b477';
    ctx.lineWidth = 2;
    ctx.stroke();
    runnerProgress.forEach((progress, i) => {
      const [x, y] = xy(this.track.sample(progress));
      ctx.fillStyle = i === 0 ? '#ff8d28' : '#d9e4b4';
      ctx.beginPath();
      ctx.arc(x, y, i === 0 ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  announce(message: string, duration = 1.1): void {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    this.toastTimer = duration;
  }

  tick(dt: number): void {
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) this.toast.classList.remove('visible');
  }

  countdownText(value: string): void {
    this.element.querySelector('#countdown')!.textContent = value;
  }
}
