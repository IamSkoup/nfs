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

  constructor(parent: HTMLElement) {
    this.element.className = 'race-hud';
    this.element.innerHTML = `
      <div class="hud-top"><div class="hud-brand">SAVANNA <b>UNDERGROUND</b><small>PRIDE LANDS / CIRCUIT</small></div><div class="hud-position"><span>POSITION</span><strong id="hud-position">1/4</strong></div><div class="hud-lap"><span>LAP</span><strong id="hud-lap">1/3</strong></div></div>
      <div class="hud-speed"><strong id="hud-speed">00</strong><span>KM/H</span></div>
      <div class="hud-bottom"><div class="hud-meter"><label>STAMINA</label><div class="meter"><i id="hud-stamina"></i></div><label>BREATH</label><div class="meter breath"><i id="hud-breath"></i></div></div><div class="hud-progress"><label>RACE PROGRESS</label><div class="progress-track"><i id="hud-progress"></i></div><small id="hud-percent">00%</small></div><div class="hud-controls">WASD / ARROWS <span>RUN</span>　SHIFT <span>BURST</span>　SPACE <span>JUMP</span>　ESC <span>PAUSE</span></div></div>
      <div class="race-toast" id="race-toast"></div><div class="countdown" id="countdown"></div>`;
    parent.append(this.element);
    this.speed = this.element.querySelector('#hud-speed')!;
    this.position = this.element.querySelector('#hud-position')!;
    this.lap = this.element.querySelector('#hud-lap')!;
    this.progress = this.element.querySelector('#hud-progress')!;
    this.stamina = this.element.querySelector('#hud-stamina')!;
    this.breath = this.element.querySelector('#hud-breath')!;
    this.toast = this.element.querySelector('#race-toast')!;
  }

  update(speed: number, place: number, racers: number, lap: number, totalLaps: number, progress: number, stamina: number, breath: number): void {
    this.speed.textContent = Math.round(speed * 2.35).toString().padStart(2, '0');
    this.position.textContent = `${place}/${racers}`;
    this.lap.textContent = `${lap}/${totalLaps}`;
    this.progress.style.width = `${progress * 100}%`;
    this.stamina.style.width = `${stamina * 100}%`;
    this.breath.style.width = `${breath * 100}%`;
    this.element.querySelector('#hud-percent')!.textContent = `${Math.floor(progress * 100)}%`;
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
