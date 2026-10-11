export interface InputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  boost: boolean;
  pause: boolean;
  restart: boolean;
}

const keyMap: Record<string, keyof InputState> = {
  KeyW: 'accelerate', ArrowUp: 'accelerate',
  KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', ShiftLeft: 'boost', ShiftRight: 'boost',
  Escape: 'pause', KeyR: 'restart',
};

export class InputController {
  readonly state: InputState = {
    accelerate: false, brake: false, left: false, right: false,
    jump: false, boost: false, pause: false, restart: false,
  };
  private pressed = new Set<string>();
  private padJumpWasDown = false;

  constructor() {
    window.addEventListener('keydown', (event) => {
      const key = keyMap[event.code];
      if (!key) return;
      event.preventDefault();
      if (!event.repeat && (key === 'pause' || key === 'restart' || key === 'jump')) this.pressed.add(key);
      this.state[key] = true;
    });
    window.addEventListener('keyup', (event) => {
      const key = keyMap[event.code];
      if (key) this.state[key] = false;
    });
    window.addEventListener('blur', () => {
      for (const key of Object.keys(this.state) as (keyof InputState)[]) this.state[key] = false;
    });
  }

  consume(key: 'pause' | 'restart' | 'jump'): boolean {
    let had = this.pressed.has(key);
    this.pressed.delete(key);
    if (key === 'jump') {
      const down = (navigator.getGamepads?.()[0]?.buttons[0]?.pressed ?? false);
      had ||= down && !this.padJumpWasDown;
      this.padJumpWasDown = down;
    }
    return had;
  }

  axis(): number {
    let axis = Number(this.state.right) - Number(this.state.left);
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const raw = pad.axes[0] ?? 0;
      const deadzone = .14;
      const normalized = Math.abs(raw) <= deadzone ? 0 : Math.sign(raw) * ((Math.abs(raw) - deadzone) / (1 - deadzone));
      axis = normalized || axis;
    }
    return axis;
  }

  accelerating(): boolean {
    const pad = navigator.getGamepads?.()[0];
    return this.state.accelerate || Boolean(pad && (pad.buttons[7]?.value ?? 0) > 0.2);
  }

  braking(): boolean {
    const pad = navigator.getGamepads?.()[0];
    return this.state.brake || Boolean(pad && ((pad.buttons[6]?.value ?? 0) > .2 || pad.buttons[1]?.pressed));
  }

  boosting(): boolean {
    const pad = navigator.getGamepads?.()[0];
    return this.state.boost || Boolean(pad?.buttons[2]?.pressed);
  }
}
