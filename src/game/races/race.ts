import * as THREE from 'three';
import { Fuli } from '../player/Fuli';
import { Racer } from '../ai/Racer';
import { Track } from '../tracks/track';
import { InputController } from '../physics/input';
import { HUD } from '../ui/HUD';

export interface RaceResult { won: boolean; bestLap: number; speed: number; place: number; }

export class CircuitRace {
  readonly totalLaps = 3;
  readonly runners: Array<{ name: string; runner: Fuli; player: boolean; progress: number; speed: number; lateral: number; phase: number; personality?: Racer['personality'] }>;
  elapsed = 0;
  countdown = 3.5;
  finished = false;
  paused = false;
  bestLap = Infinity;
  lapStarted = 0;
  maxSpeed = 0;
  stamina = 1;
  breath = 1;
  private lateralVelocity = 0;
  private airborne = 0;
  private lastLap = 0;
  private finishCallback: (result: RaceResult) => void;
  private pauseCallback: () => void;
  private fastestRun = 18.2;

  constructor(
    private track: Track,
    player: Fuli,
    opponents: Racer[],
    private input: InputController,
    private hud: HUD,
    onFinish: (result: RaceResult) => void,
    onPause: () => void,
  ) {
    this.finishCallback = onFinish;
    this.pauseCallback = onPause;
    this.runners = [
      { name: 'FULI', runner: player, player: true, progress: 0, speed: 0, lateral: -3.2, phase: 0 },
      ...opponents.map((r) => ({ name: r.name, runner: r.runner, player: false, progress: r.progress, speed: 0, lateral: r.lateral, phase: r.phase, personality: r.personality })),
    ];
    this.placeRunners();
  }

  update(dt: number): void {
    if (this.finished) return;
    if (this.input.consume('pause')) { this.paused = !this.paused; this.pauseCallback(); }
    if (this.paused) return;
    if (this.input.consume('restart')) { this.reset(); this.hud.announce('RACE RESTARTED'); return; }
    this.elapsed += dt;
    this.hud.tick(dt);
    if (this.countdown > 0) {
      const old = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (now !== old && now > 0) this.hud.countdownText(String(now));
      if (this.countdown <= 0) {
        this.hud.countdownText('GO!');
        window.setTimeout(() => this.hud.countdownText(''), 700);
        this.hud.announce('RUN!', 1);
      } else if (old === 4) this.hud.countdownText('3');
      return;
    }
    const player = this.runners[0]!;
    const axis = this.input.axis();
    const accel = this.input.accelerating();
    const brake = this.input.state.brake;
    const max = this.fastestRun * (0.68 + (this.stamina * 0.32));
    player.speed += (accel ? 14.2 : -3.9) * dt;
    if (brake) player.speed -= 18 * dt;
    if (this.input.state.boost && this.stamina > 0.06 && accel) {
      player.speed += 13 * dt;
      this.stamina = Math.max(0, this.stamina - dt * .24);
    } else {
      this.stamina = Math.min(1, this.stamina + dt * (player.speed < 7 ? .15 : .035));
    }
    player.speed = THREE.MathUtils.clamp(player.speed, 0, max);
    this.maxSpeed = Math.max(this.maxSpeed, player.speed);
    const speedFactor = THREE.MathUtils.clamp(player.speed / max, .1, 1);
    const turnRate = (1.2 + (1 - speedFactor) * 2.4) * (0.5 + this.stamina * .5);
    this.lateralVelocity += axis * turnRate * dt * (1 - speedFactor * .28);
    this.lateralVelocity *= Math.exp(-4.8 * dt);
    player.lateral += this.lateralVelocity * dt * 6;
    const edge = Math.abs(player.lateral) > 8.8;
    player.lateral = THREE.MathUtils.clamp(player.lateral, -14, 14);
    if (edge) player.speed = Math.max(0, player.speed - 7 * dt);
    if (this.input.consume('jump') && this.airborne <= 0 && player.speed > 2) this.airborne = .7;
    if (this.airborne > 0) this.airborne -= dt;
    player.progress += player.speed * dt / this.track.length;
    this.updateOpponents(dt);
    this.placeRunners();
    this.updateLapAndFinish(player);
    this.hud.update(player.speed, this.getPlace(), this.runners.length, Math.min(this.totalLaps, Math.floor(player.progress) + 1), this.totalLaps, player.progress / this.totalLaps, this.stamina, this.breath);
    const target = 0.68 + player.speed / Math.max(1, max) * .3;
    this.breath = THREE.MathUtils.damp(this.breath, target, 2.8, dt);
    if (brake || (edge && axis)) this.hud.announce(edge ? 'WATCH THE EDGE' : '', .2);
    this.lastLap = Math.floor(player.progress);
  }

  private updateOpponents(dt: number): void {
    const player = this.runners[0]!;
    for (let i = 1; i < this.runners.length; i++) {
      const racer = this.runners[i]!;
      const p = racer.personality!;
      const curve = this.track.tangent(racer.progress).angleTo(this.track.tangent(racer.progress + .002));
      const cornerPenalty = Math.max(0, curve - p.cornerSkill * .12) * 3.8;
      const ahead = racer.progress - player.progress;
      const calmCatchup = ahead < -.018 ? .6 : 0;
      const target = p.topSpeed - cornerPenalty + calmCatchup;
      racer.phase += dt;
      const error = Math.sin(racer.phase * 1.7) * p.mistakeChance * 40;
      racer.speed = THREE.MathUtils.damp(racer.speed, target + error, p.acceleration * 1.5, dt);
      racer.progress += racer.speed * dt / this.track.length;
      racer.lateral = THREE.MathUtils.damp(racer.lateral, Math.sin(racer.phase * .8) * (1.7 + p.aggression), 1.4, dt);
    }
  }

  private placeRunners(): void {
    for (const racer of this.runners) {
      const p = this.track.sample(racer.progress, racer.lateral, racer.player && this.airborne > 0 ? Math.sin((.7 - this.airborne) / .7 * Math.PI) * 2.1 : 0);
      racer.runner.root.position.copy(p);
      const tangent = this.track.tangent(racer.progress);
      racer.runner.root.rotation.y = Math.atan2(tangent.x, -tangent.z);
      racer.runner.update(.016, racer.speed, racer.player && this.airborne > 0, racer.player ? this.input.axis() : 0);
    }
  }

  private updateLapAndFinish(player: CircuitRace['runners'][number]): void {
    const lap = Math.floor(player.progress);
    if (lap > this.lastLap && lap > 0) {
      const lapTime = this.elapsed - this.lapStarted;
      this.bestLap = Math.min(this.bestLap, lapTime);
      this.lapStarted = this.elapsed;
      this.hud.announce(lap < this.totalLaps ? `LAP ${lap + 1}` : 'FINAL LAP', 1.5);
    }
    if (player.progress >= this.totalLaps) {
      this.finished = true;
      const place = this.getPlace();
      this.finishCallback({ won: place === 1, bestLap: Number.isFinite(this.bestLap) ? this.bestLap : this.elapsed, speed: this.maxSpeed, place });
    }
  }

  private getPlace(): number {
    const sorted = [...this.runners].sort((a, b) => b.progress - a.progress);
    return sorted.findIndex((r) => r.player) + 1;
  }

  private reset(): void {
    this.elapsed = 0; this.countdown = 3.5; this.finished = false; this.paused = false;
    this.bestLap = Infinity; this.lapStarted = 0; this.maxSpeed = 0; this.stamina = 1;
    for (let i = 0; i < this.runners.length; i++) {
      const r = this.runners[i]!;
      r.progress = i * .002;
      r.speed = 0; r.lateral = (i - 1.5) * 2.2;
    }
    this.lastLap = 0;
    this.hud.countdownText('3');
    this.placeRunners();
  }
}
