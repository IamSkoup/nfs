import * as THREE from 'three';
import { Fuli } from './player/Fuli';
import { createRacers } from './ai/Racer';
import { Track } from './tracks/track';
import { createWorld } from './world/createWorld';
import { InputController } from './physics/input';
import { CircuitRace, RaceResult } from './races/race';
import { HUD } from './ui/HUD';
import { GameAudio } from './audio/audio';
import { loadSave, saveResult } from './career/save';

type Screen = 'menu' | 'race' | 'result' | 'pause' | 'stats' | 'events';

export class GameApp {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, .1, 1600);
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private track = new Track();
  private input = new InputController();
  private audio = new GameAudio();
  private player = new Fuli();
  private race?: CircuitRace;
  private hud: HUD;
  private screen: Screen = 'menu';
  private overlay: HTMLDivElement;
  private stage: HTMLDivElement;
  private ui: HTMLDivElement;
  private menuTime = 0;
  private resultSave = loadSave();

  constructor(private root: HTMLElement) {
    this.root.className = 'game-shell';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.root.append(this.renderer.domElement);

    createWorld(this.scene, this.track);
    this.scene.add(this.player.root);
    this.player.root.userData.player = true;
    this.player.root.position.copy(this.track.sample(.19, 0));
    this.hud = new HUD(this.root);
    this.hud.element.style.display = 'none';
    this.overlay = document.createElement('div');
    this.overlay.className = 'screen-layer';
    this.root.append(this.overlay);
    this.stage = document.createElement('div');
    this.stage.className = 'menu-stage';
    this.root.append(this.stage);
    this.ui = document.createElement('div');
    this.ui.className = 'ui-layer';
    this.root.append(this.ui);
    this.resize();
    this.renderMenu();
    addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.handleGlobalKeys);
    requestAnimationFrame(this.frame);
  }

  private handleGlobalKeys = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && this.screen === 'pause') {
      this.input.consume('pause');
      this.resume();
    }
    if (event.code === 'Enter' && this.screen === 'menu') { this.audio.unlock(); this.startRace(); }
  };

  private resize = (): void => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  };

  private frame = (): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(this.clock.getDelta(), .04);
    this.menuTime += dt;
    if (this.screen === 'race' && this.race) {
      this.race.update(dt);
      this.root.classList.toggle('at-speed', this.race.runners[0]!.speed > 13.5);
      const p = this.player.root.position;
      const tangent = this.track.tangent(this.race.runners[0]!.progress);
      const desired = p.clone().addScaledVector(tangent, -15).add(new THREE.Vector3(0, 7.2, 0));
      this.camera.position.lerp(desired, 1 - Math.exp(-3.4 * dt));
      this.camera.lookAt(p.clone().add(new THREE.Vector3(0, 1.1, 0)));
      const targetFov = 58 + Math.min(12, this.player.root.position.length() * .02 + this.race.runners[0]!.speed * .32);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 2, dt);
      this.camera.updateProjectionMatrix();
    } else {
      const target = this.player.root.position;
      const angle = this.menuTime * .09;
      this.camera.position.set(target.x + Math.sin(angle) * 20, 8.5 + Math.sin(angle * .6) * .8, target.z + Math.cos(angle) * 20);
      this.camera.lookAt(target.clone().add(new THREE.Vector3(0, 1.3, 0)));
      this.player.update(dt, 0, false, 0);
      this.root.classList.remove('at-speed');
    }
    this.renderer.render(this.scene, this.camera);
  };

  private renderMenu(): void {
    this.screen = 'menu';
    this.race = undefined;
    for (const child of [...this.scene.children]) if (child.userData.racer) this.scene.remove(child);
    this.player.root.position.copy(this.track.sample(.19));
    this.stage.style.display = 'block';
    this.hud.element.style.display = 'none';
    this.overlay.className = 'screen-layer';
    this.overlay.innerHTML = `
      <div class="menu-vignette"></div>
      <header class="topline"><span>THE PRIDE LANDS</span><span>AN ORIGINAL FAN-MADE GAME</span><span>EST. 2003 / REIMAGINED</span></header>
      <section class="brand-block"><div class="brand-kicker">RUN FAST. BREATHE RIGHT.</div><h1>SAVANNA<br><em>UNDERGROUND</em></h1><div class="brand-rule"><i></i> PRIDE LANDS RACING DIVISION <i></i></div></section>
      <section class="main-menu"><div class="menu-caption">SELECT MODE <span>01 / 04</span></div>
        <button data-action="events"><b>01</b><span>CAREER / EVENT MAP</span><i>›</i></button>
        <button data-action="race"><b>02</b><span>QUICK CIRCUIT</span><i>›</i></button>
        <button data-action="stats"><b>03</b><span>RACE RECORD</span><i>›</i></button>
        <button data-action="music"><b>04</b><span>SAVANNA TRAX <small>PROCEDURAL MIX</small></span><i class="music-state">ON</i></button>
        <div class="menu-footer"><span>WASD / ARROWS TO RUN</span><span>SPACE TO JUMP</span><span>SHIFT TO BURST</span></div>
      </section>
      <footer class="bottomline"><span>FULI / PRIDE LANDS</span><span>PRESS ENTER TO RACE</span><span>BUILD 0.1.0 / WEBGL</span></footer>`;
    this.ui.innerHTML = '<div class="corner-mark">SU<span>®</span></div><div class="vertical-label">SAVANNA UNDERGROUND　/　PRIDE LANDS</div><div class="status-corner">NIGHT RUNNER<br>SEASON 01 / EVENT 01</div>';
    this.overlay.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => button.addEventListener('click', () => {
      this.audio.unlock(); this.audio.ui();
      const action = button.dataset.action;
      if (action === 'race') this.startRace();
      if (action === 'events') this.renderEvents();
      if (action === 'stats') this.renderStats();
      if (action === 'music') this.toggleMusic(button);
    }));
    this.overlay.addEventListener('keydown', () => undefined);
    this.audio.startMusic();
  }

  private toggleMusic(button: Element): void {
    this.audio.muted = !this.audio.muted;
    button.querySelector('.music-state')!.textContent = this.audio.muted ? 'OFF' : 'ON';
  }

  private renderEvents(): void {
    this.screen = 'events';
    const save = loadSave();
    this.overlay.innerHTML = `<div class="subscreen"><div class="subhead"><span>CAREER / EVENT MAP</span><button data-action="back">ESC / BACK</button></div><h2>PRIDE LANDS <em>RACE GRID</em></h2><p class="subcopy">В локальной серии заезды открываются один за другим. Первая точка уже ждёт.</p><div class="event-map"><div class="map-lines"></div><button class="event-node active" data-action="race" style="left:22%;top:67%"><b>01</b><span>PRIDE ROCK SPRINT</span><small>OPEN / CIRCUIT</small></button><button class="event-node ${save.unlocked > 1 ? 'active' : ''}" data-action="race" style="left:49%;top:42%"><b>02</b><span>DRY RIVER RUN</span><small>${save.unlocked > 1 ? 'OPEN' : 'LOCKED'}</small></button><button class="event-node ${save.unlocked > 2 ? 'active' : ''}" data-action="race" style="left:76%;top:68%"><b>03</b><span>GOLDEN GRASS</span><small>${save.unlocked > 2 ? 'OPEN' : 'LOCKED'}</small></button><div class="map-label label-rock">PRIDE ROCK</div><div class="map-label label-water">WATERING HOLE</div><div class="map-label label-gorge">ROCKY GORGE</div></div><div class="event-details"><span>EVENT 01　/　CIRCUIT</span><strong>THE FIRST LAP</strong><p>Три круга по пыльной тропе у Скалы Предков. Кито, Дума и Зури уже на старте.</p><button class="primary-button" data-action="race">ENTER EVENT <i>›</i></button></div></div>`;
    this.bindActions();
  }

  private renderStats(): void {
    this.screen = 'stats';
    const s = loadSave();
    const winRate = s.races ? Math.round(s.wins / s.races * 100) : 0;
    this.overlay.innerHTML = `<div class="subscreen"><div class="subhead"><span>RACE RECORD / SEASON 01</span><button data-action="back">ESC / BACK</button></div><h2>THE <em>RANKINGS</em></h2><div class="stats-layout"><div class="stat-sheet"><div><small>RACES RUN</small><b>${s.races.toString().padStart(2,'0')}</b></div><div><small>WINS</small><b>${s.wins.toString().padStart(2,'0')}</b></div><div><small>WIN RATE</small><b>${winRate}<i>%</i></b></div><div><small>TOP SPEED</small><b>${Math.round(s.bestSpeed * 2.35)}<i>KM/H</i></b></div><div><small>BEST LAP</small><b>${s.bestLap === null ? '--:--.---' : formatTime(s.bestLap)}</b></div></div><div class="ranking"><div class="ranking-title">SPRINT / CIRCUIT / DRAG / KNOCKOUT</div><ol><li><span>01</span><b>?</b><em>UNKNOWN</em></li><li><span>02</span><b>JENGO</b><em>OUTLANDS</em></li><li><span>03</span><b>ASHA</b><em>WATERING HOLE</em></li><li><span>04</span><b>NURU</b><em>DRY RIVER</em></li><li class="player-rank"><span>10</span><b>FULI</b><em>PRIDE LANDS</em></li></ol></div></div><div class="event-details"><span>CAREER STATUS</span><strong>${s.races ? 'THE PACK KNOWS YOUR NAME.' : 'A NEW RUNNER ENTERS THE CIRCUIT.'}</strong><p>Результаты сохраняются локально в этом браузере.</p></div></div>`;
    this.bindActions();
  }

  private bindActions(): void {
    this.overlay.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => button.addEventListener('click', () => {
      this.audio.ui();
      const action = button.dataset.action;
      if (action === 'race') this.startRace();
      if (action === 'back') this.renderMenu();
    }));
  }

  private startRace(): void {
    this.audio.unlock();
    this.audio.startMusic();
    this.audio.muted = false;
    this.player = new Fuli();
    for (const child of [...this.scene.children]) if (child.userData.racer || child.userData.player) this.scene.remove(child);
    this.scene.add(this.player.root);
    this.player.root.userData.player = true;
    const opponents = createRacers(this.track);
    for (const opponent of opponents) {
      opponent.runner.root.userData.racer = true;
      this.scene.add(opponent.runner.root);
    }
    this.hud.element.style.display = 'block';
    this.stage.style.display = 'none';
    this.ui.innerHTML = '';
    this.overlay.className = 'screen-layer race-screen';
    this.overlay.innerHTML = `<div class="race-intro"><div>EVENT 01　/　CIRCUIT</div><strong>THE FIRST LAP</strong><span>PRIDE ROCK　/　THREE LAPS　/　4 RUNNERS</span></div><button class="quiet-back" data-action="quit">ESC　/　QUIT RUN</button>`;
    this.overlay.querySelector('[data-action="quit"]')!.addEventListener('click', () => this.renderMenu());
    this.screen = 'race';
    this.race = new CircuitRace(this.track, this.player, opponents, this.input, this.hud, (result) => this.showResult(result), () => this.showPause());
  }

  private showPause(): void {
    if (!this.race) return;
    if (this.race.paused) {
      this.screen = 'pause';
      this.overlay.className = 'screen-layer modal-screen';
      this.overlay.innerHTML = `<div class="modal"><div class="modal-kicker">RACE PAUSED / ESC TO RESUME</div><h2>TAKE A <em>BREATH.</em></h2><button data-action="resume">RESUME RUN <i>›</i></button><button data-action="menu">RETURN TO MENU <i>›</i></button></div>`;
      this.overlay.querySelector('[data-action="resume"]')!.addEventListener('click', () => this.resume());
      this.overlay.querySelector('[data-action="menu"]')!.addEventListener('click', () => this.renderMenu());
    } else this.resume();
  }

  private resume(): void {
    if (!this.race) return;
    this.race.paused = false;
    this.screen = 'race';
    this.overlay.className = 'screen-layer race-screen';
    this.overlay.innerHTML = '';
  }

  private showResult(result: RaceResult): void {
    this.resultSave = saveResult(result);
    this.screen = 'result';
    this.audio.ui();
    this.overlay.className = 'screen-layer result-screen';
    const title = result.won ? '1ST' : `${result.place}${result.place === 2 ? 'ND' : result.place === 3 ? 'RD' : 'TH'}`;
    this.overlay.innerHTML = `<div class="result-card"><div class="result-kicker">PRIDE ROCK / CIRCUIT COMPLETE</div><h2>${title}</h2><div class="result-runner">FULI</div><div class="result-rule"></div><div class="result-stats"><span>BEST LAP<b>${formatTime(result.bestLap)}</b></span><span>TOP SPEED<b>${Math.round(result.speed * 2.35)} KM/H</b></span><span>CAREER WINS<b>${this.resultSave.wins.toString().padStart(2,'0')}</b></span></div><p>${result.won ? 'THE PACK SAW THAT. NEXT RUN, THEY WILL BE READY.' : 'THE SAVANNA DOES NOT WAIT. RUN IT AGAIN.'}</p><button data-action="again">RUN AGAIN <i>›</i></button><button data-action="menu">RETURN TO MENU <i>›</i></button></div>`;
    this.overlay.querySelector('[data-action="again"]')!.addEventListener('click', () => this.startRace());
    this.overlay.querySelector('[data-action="menu"]')!.addEventListener('click', () => this.renderMenu());
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${sec}`;
}
