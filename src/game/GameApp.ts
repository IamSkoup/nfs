import * as THREE from 'three';
import { Fuli } from './player/Fuli';
import { createRacers } from './ai/Racer';
import { RaceMode, Track } from './tracks/track';
import { applyEnvironmentSettings, createWorld, updateEnvironment } from './world/createWorld';
import { InputController } from './physics/input';
import { CircuitRace, RaceResult } from './races/race';
import { HUD } from './ui/HUD';
import { GameAudio } from './audio/audio';
import { GameSetup, loadSave, loadSetup, saveResult, saveSetup } from './career/save';

type Screen = 'menu' | 'race' | 'result' | 'pause' | 'stats' | 'events' | 'quick' | 'garage' | 'settings' | 'music';

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
  private setup: GameSetup = loadSetup();

  constructor(private root: HTMLElement) {
    this.root.className = 'game-shell';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.input.steeringSensitivity = this.setup.steering;
    this.player.setStyle(this.setup.style);
    this.root.append(this.renderer.domElement);

    createWorld(this.scene, this.track);
    applyEnvironmentSettings(this.scene, this.setup.timeOfDay, this.setup.weather);
    this.scene.add(this.player.root);
    this.player.root.userData.player = true;
    this.player.root.position.copy(this.track.sample(.19, 0));
    this.hud = new HUD(this.root, this.track);
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
    this.applyGraphics();
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
      const targetFov = 58 + Math.min(12, this.race.runners[0]!.speed * .32);
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
    updateEnvironment(this.scene, this.camera, dt);
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
      <section class="main-menu"><div class="menu-caption">PRIDE LANDS GARAGE <span>01 / 06</span></div>
        <button data-action="quick"><b>01</b><span>QUICK RACE <small>CIRCUIT / SPRINT / DRAG</small></span><i>›</i></button>
        <button data-action="garage"><b>02</b><span>RUNNER GARAGE <small>TUNING / STYLING</small></span><i>›</i></button>
        <button data-action="settings"><b>03</b><span>SETTINGS <small>GRAPHICS / WEATHER / CONTROLS</small></span><i>›</i></button>
        <button data-action="music"><b>04</b><span>MUSIC SELECT <small>3 MENU / 5 RACE MIXES</small></span><i>›</i></button>
        <button data-action="events"><b>05</b><span>CAREER / EVENT MAP</span><i>›</i></button>
        <button data-action="stats"><b>06</b><span>RACE RECORD</span><i>›</i></button>
        <div class="menu-footer"><span>WASD / ARROWS TO RUN</span><span>SPACE TO JUMP</span><span>SHIFT TO BURST</span></div>
      </section>
      <footer class="bottomline"><span>FULI / PRIDE LANDS</span><span>PRESS ENTER TO RACE</span><span>BUILD 0.1.0 / WEBGL</span></footer>`;
    this.ui.innerHTML = '<div class="corner-mark">SU<span>®</span></div><div class="vertical-label">SAVANNA UNDERGROUND　/　PRIDE LANDS</div><div class="status-corner">NIGHT RUNNER<br>SEASON 01 / EVENT 01</div>';
    this.overlay.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => button.addEventListener('click', () => {
      this.audio.unlock(); this.audio.ui();
      const action = button.dataset.action;
      if (action === 'race') this.startRace();
      if (action === 'quick') this.renderQuickRaces();
      if (action === 'garage') this.renderGarage();
      if (action === 'settings') this.renderSettings();
      if (action === 'music') this.renderMusic();
      if (action === 'events') this.renderEvents();
      if (action === 'stats') this.renderStats();
    }));
    this.overlay.addEventListener('keydown', () => undefined);
    this.audio.startMusic('menu', this.setup.menuMusic);
  }

  private renderQuickRaces(): void {
    this.screen = 'quick';
    this.overlay.innerHTML = `<div class="subscreen garage-screen"><div class="subhead"><span>QUICK RACE / ALL EVENTS UNLOCKED</span><button data-action="back">ESC / BACK</button></div><h2>CHOOSE YOUR <em>RUN.</em></h2><p class="subcopy">Все форматы доступны сразу. В кольце три круга, спринт и драг идут до финиша.</p><div class="race-mode-grid">
      <button class="mode-card circuit-card" data-mode="circuit"><b>01 / CIRCUIT</b><strong>PRIDE ROCK LOOP</strong><span>3 круга · связка быстрых поворотов · камни и брёвна</span><i>START EVENT　›</i></button>
      <button class="mode-card sprint-card" data-mode="sprint"><b>02 / SPRINT</b><strong>OUTLANDS RUN</strong><span>Маршрутная гонка · длинные дуги · препятствия на пути</span><i>START EVENT　›</i></button>
      <button class="mode-card drag-card" data-mode="drag"><b>03 / DRAG</b><strong>DRY RIVER STRIP</strong><span>Прямая дистанция · разгон · финишный рывок</span><i>START EVENT　›</i></button>
      </div><div class="garage-foot"><span>ENGINE ${this.setup.upgrades.engine}/3</span><span>GRIP ${this.setup.upgrades.grip}/3</span><span>ALL TUNING UNLOCKED</span></div></div>`;
    this.overlay.querySelector('[data-action="back"]')!.addEventListener('click', () => this.renderMenu());
    this.overlay.querySelectorAll<HTMLElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => this.startRace(button.dataset.mode as RaceMode)));
  }

  private renderGarage(): void {
    this.screen = 'garage';
    const styles = [
      ['classic', 'PRIDE CLASSIC', 'Gold coat / red neckerchief'],
      ['sunset', 'SUNSET RUNNER', 'Warm fur / racing scarf / goggles'],
      ['midnight', 'NIGHT STRIPE', 'Cool silver coat / violet gear'],
      ['snow', 'DUST GHOST', 'Pale coat / blue scarf / goggles'],
    ];
    const upgradeNames: Record<string, string> = { engine: 'STRIDE POWER', grip: 'CORNER GRIP', stamina: 'ENDURANCE', boost: 'BURST CONTROL' };
    const upgrades = Object.entries(this.setup.upgrades).map(([key, level]) => `<div class="upgrade-row"><div><small>FULLY UNLOCKED</small><strong>${upgradeNames[key]}</strong></div><span class="upgrade-level">LV ${level}/3</span><button data-upgrade="${key}">${level >= 3 ? 'MAX' : 'UPGRADE　+'}</button></div>`).join('');
    this.overlay.innerHTML = `<div class="subscreen garage-screen"><div class="subhead"><span>RUNNER GARAGE / ALL PARTS UNLOCKED</span><button data-action="back">ESC / BACK</button></div><h2>BUILD YOUR <em>STYLE.</em></h2><div class="style-grid">${styles.map(([id, name, description]) => `<button data-style="${id}" class="style-card ${this.setup.style === id ? 'selected' : ''}"><i class="style-swatch swatch-${id}"></i><strong>${name}</strong><small>${description}</small><span>${this.setup.style === id ? 'EQUIPPED' : 'EQUIP'}</span></button>`).join('')}</div><div class="upgrade-list">${upgrades}</div><div class="garage-foot"><span>ENGINE +${this.setup.upgrades.engine * 1.7} TOP SPEED</span><span>GRIP +${this.setup.upgrades.grip * 10}%</span><span>NO CAREER GRIND / EVERYTHING OPEN</span></div></div>`;
    this.overlay.querySelector('[data-action="back"]')!.addEventListener('click', () => this.renderMenu());
    this.overlay.querySelectorAll<HTMLElement>('[data-style]').forEach((button) => button.addEventListener('click', () => {
      this.setup.style = button.dataset.style as GameSetup['style'];
      saveSetup(this.setup);
      this.player.setStyle(this.setup.style);
      this.renderGarage();
    }));
    this.overlay.querySelectorAll<HTMLElement>('[data-upgrade]').forEach((button) => button.addEventListener('click', () => {
      const key = button.dataset.upgrade as keyof GameSetup['upgrades'];
      this.setup.upgrades[key] = Math.min(3, this.setup.upgrades[key] + 1);
      saveSetup(this.setup);
      this.renderGarage();
    }));
  }

  private renderSettings(): void {
    this.screen = 'settings';
    this.overlay.innerHTML = `<div class="subscreen settings-screen"><div class="subhead"><span>GAME SETTINGS / SAVED IN THIS BROWSER</span><button data-action="back">ESC / BACK</button></div><h2>SET THE <em>SCENE.</em></h2><div class="settings-grid">
      <label>GRAPHICS QUALITY<select id="setting-graphics"><option value="low">Performance</option><option value="medium">Balanced</option><option value="high">Ultra</option></select><small>Render scale, shadows and shadow detail.</small></label>
      <label>TIME OF DAY<select id="setting-time"><option value="dawn">Dawn</option><option value="day">Bright day</option><option value="golden">Golden hour</option><option value="night">Night</option></select><small>Changes the savanna sky, sun and ambient light.</small></label>
      <label>WEATHER<select id="setting-weather"><option value="clear">Clear</option><option value="dust">Dust haze</option><option value="storm">Rainstorm</option></select><small>Dust changes visibility; storms add rain and cloud.</small></label>
      <label>STEERING SENSITIVITY <strong id="setting-steering-value">${this.setup.steering.toFixed(1)}×</strong><input id="setting-steering" type="range" min="0.6" max="1.8" step="0.1" value="${this.setup.steering}"><small>Keyboard and controller stick. Keyboard: WASD/arrows · Space jump · Shift burst.</small></label>
      </div><div class="settings-note"><b>CONTROLLER</b><span>Left stick steer · RT run · LT / B brake · A jump · X burst · Esc pause</span></div></div>`;
    this.overlay.querySelector('[data-action="back"]')!.addEventListener('click', () => this.renderMenu());
    const graphics = this.overlay.querySelector<HTMLSelectElement>('#setting-graphics')!;
    const time = this.overlay.querySelector<HTMLSelectElement>('#setting-time')!;
    const weather = this.overlay.querySelector<HTMLSelectElement>('#setting-weather')!;
    graphics.value = this.setup.graphics;
    time.value = this.setup.timeOfDay;
    weather.value = this.setup.weather;
    graphics.addEventListener('change', () => { this.setup.graphics = graphics.value as GameSetup['graphics']; this.applyGraphics(); saveSetup(this.setup); });
    time.addEventListener('change', () => { this.setup.timeOfDay = time.value as GameSetup['timeOfDay']; applyEnvironmentSettings(this.scene, this.setup.timeOfDay, this.setup.weather); saveSetup(this.setup); });
    weather.addEventListener('change', () => { this.setup.weather = weather.value as GameSetup['weather']; applyEnvironmentSettings(this.scene, this.setup.timeOfDay, this.setup.weather); saveSetup(this.setup); });
    const steering = this.overlay.querySelector<HTMLInputElement>('#setting-steering')!;
    steering.addEventListener('input', () => {
      this.setup.steering = Number(steering.value);
      this.input.steeringSensitivity = this.setup.steering;
      this.overlay.querySelector('#setting-steering-value')!.textContent = `${this.setup.steering.toFixed(1)}×`;
      saveSetup(this.setup);
    });
  }

  private applyGraphics(): void {
    const level = this.setup.graphics;
    this.renderer.shadowMap.enabled = level !== 'low';
    this.renderer.shadowMap.type = level === 'high' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    const env = this.scene.userData.environment as { sun?: THREE.DirectionalLight } | undefined;
    if (env?.sun) {
      env.sun.shadow.map?.dispose();
      env.sun.shadow.map = null;
      env.sun.shadow.needsUpdate = true;
      env.sun.shadow.mapSize.set(level === 'high' ? 2048 : 1024, level === 'high' ? 2048 : 1024);
    }
    const ratio = level === 'low' ? 1 : level === 'medium' ? 1.35 : 1.65;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
    this.renderer.setSize(innerWidth, innerHeight);
  }

  private renderMusic(): void {
    this.screen = 'music';
    const menu = this.audio.trackList('menu').map((name, i) => `<button class="track-choice ${this.setup.menuMusic === i ? 'selected' : ''}" data-audio="menu" data-track="${i}"><b>0${i + 1}</b><span>${name}</span><i>${this.setup.menuMusic === i ? 'SELECTED' : 'PREVIEW'}</i></button>`).join('');
    const race = this.audio.trackList('race').map((name, i) => `<button class="track-choice ${this.setup.raceMusic === i ? 'selected' : ''}" data-audio="race" data-track="${i}"><b>0${i + 1}</b><span>${name}</span><i>${this.setup.raceMusic === i ? 'SELECTED' : 'PREVIEW'}</i></button>`).join('');
    this.overlay.innerHTML = `<div class="subscreen music-screen"><div class="subhead"><span>PROCEDURAL SOUNDTRACK / 8 ORIGINAL MIXES</span><button data-action="back">ESC / BACK</button></div><h2>PICK THE <em>PACE.</em></h2><div class="music-columns"><section><h3>MENU / 3 TRACKS</h3>${menu}</section><section><h3>RACE / 5 TRACKS</h3>${race}</section></div><div class="settings-note"><b>ORIGINAL SYNTH MIXES</b><span>Each selection is generated in-game. Menu and race playlists are stored separately.</span></div></div>`;
    this.overlay.querySelector('[data-action="back"]')!.addEventListener('click', () => this.renderMenu());
    this.overlay.querySelectorAll<HTMLElement>('[data-audio]').forEach((button) => button.addEventListener('click', () => {
      const mode = button.dataset.audio as 'menu' | 'race';
      const index = Number(button.dataset.track);
      if (mode === 'menu') this.setup.menuMusic = index; else this.setup.raceMusic = index;
      saveSetup(this.setup);
      this.audio.selectTrack(mode, index);
      this.audio.startMusic(mode, index);
      this.renderMusic();
    }));
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
      if (action === 'quick') this.renderQuickRaces();
    }));
  }

  private startRace(mode: RaceMode = 'circuit'): void {
    this.track.setMode(mode);
    for (const child of [...this.scene.children]) if (child.userData.track) this.scene.remove(child);
    this.scene.add(this.track.buildMesh());
    this.audio.unlock();
    this.audio.muted = false;
    this.audio.startMusic('race', this.setup.raceMusic);
    this.player = new Fuli();
    this.player.setStyle(this.setup.style);
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
    const modeTitle = mode === 'circuit' ? 'PRIDE ROCK LOOP' : mode === 'sprint' ? 'OUTLANDS RUN' : 'DRY RIVER STRIP';
    const distance = mode === 'circuit' ? 'THREE LAPS' : 'POINT TO POINT';
    this.overlay.innerHTML = `<div class="race-intro"><div>QUICK RACE　/　${mode.toUpperCase()}</div><strong>${modeTitle}</strong><span>THE PRIDE LANDS　/　${distance}　/　4 RUNNERS</span></div><button class="quiet-back" data-action="quit">ESC　/　QUIT RUN</button>`;
    this.overlay.querySelector('[data-action="quit"]')!.addEventListener('click', () => this.renderMenu());
    this.screen = 'race';
    this.race = new CircuitRace(this.track, this.player, opponents, this.input, this.hud, (result) => this.showResult(result), () => this.showPause(), this.setup.upgrades, () => this.audio.hit());
    const start = this.player.root.position;
    const tangent = this.track.tangent(0);
    this.camera.position.copy(start).addScaledVector(tangent, -15).add(new THREE.Vector3(0, 7.2, 0));
    this.camera.lookAt(start.clone().add(new THREE.Vector3(0, 1.1, 0)));
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
    const eventName = result.mode === 'circuit' ? 'CIRCUIT' : result.mode === 'sprint' ? 'SPRINT' : 'DRAG RACE';
    this.overlay.innerHTML = `<div class="result-card"><div class="result-kicker">${eventName} / FINISH</div><h2>${title}</h2><div class="result-runner">FULI</div><div class="result-rule"></div><div class="result-stats"><span>BEST TIME<b>${formatTime(result.bestLap)}</b></span><span>TOP SPEED<b>${Math.round(result.speed * 2.35)} KM/H</b></span><span>CAREER WINS<b>${this.resultSave.wins.toString().padStart(2,'0')}</b></span></div><p>${result.won ? 'THE PACK SAW THAT. NEXT RUN, THEY WILL BE READY.' : 'THE SAVANNA DOES NOT WAIT. RUN IT AGAIN.'}</p><button data-action="again">RUN AGAIN <i>›</i></button><button data-action="menu">RETURN TO MENU <i>›</i></button></div>`;
    this.overlay.querySelector('[data-action="again"]')!.addEventListener('click', () => this.startRace(result.mode));
    this.overlay.querySelector('[data-action="menu"]')!.addEventListener('click', () => this.renderMenu());
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${sec}`;
}
