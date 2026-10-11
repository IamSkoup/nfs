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
    const had = this.pressed.has(key);
    this.pressed.delete(key);
    return had;
  }

  axis(): number {
    let axis = Number(this.state.right) - Number(this.state.left);
    const pad = navigator.getGamepads?.()[0];
    if (pad) axis = Math.abs(pad.axes[0] ?? 0) > 0.16 ? pad.axes[0] : axis;
    return axis;
  }

  accelerating(): boolean {
    const pad = navigator.getGamepads?.()[0];
    return this.state.accelerate || Boolean(pad && (pad.buttons[7]?.value ?? 0) > 0.2);
  }
}
