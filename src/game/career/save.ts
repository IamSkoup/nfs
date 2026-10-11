const STORAGE_KEY = 'savanna-underground-save-v1';
const SETUP_KEY = 'savanna-underground-setup-v1';

export interface GameSetup {
  style: 'classic' | 'sunset' | 'midnight' | 'snow';
  upgrades: { engine: number; grip: number; stamina: number; boost: number };
  graphics: 'low' | 'medium' | 'high';
  steering: number;
  timeOfDay: 'dawn' | 'day' | 'golden' | 'night';
  weather: 'clear' | 'dust' | 'storm';
  menuMusic: number;
  raceMusic: number;
}

const defaultSetup: GameSetup = {
  style: 'classic', upgrades: { engine: 0, grip: 0, stamina: 0, boost: 0 },
  graphics: 'high', steering: 1, timeOfDay: 'golden', weather: 'clear', menuMusic: 0, raceMusic: 0,
};

export function loadSetup(): GameSetup {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return structuredClone(defaultSetup);
    const data = JSON.parse(raw) as Partial<GameSetup>;
    return {
      ...defaultSetup,
      ...data,
      upgrades: { ...defaultSetup.upgrades, ...data.upgrades },
    };
  } catch {
    return structuredClone(defaultSetup);
  }
}

export function saveSetup(setup: GameSetup): void {
  localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
}

export interface CareerSave {
  wins: number;
  races: number;
  bestLap: number | null;
  bestSpeed: number;
  unlocked: number;
}

const freshSave: CareerSave = {
  wins: 0,
  races: 0,
  bestLap: null,
  bestSpeed: 0,
  unlocked: 1,
};

export function loadSave(): CareerSave {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...freshSave, ...JSON.parse(data) as Partial<CareerSave> } : { ...freshSave };
  } catch {
    return { ...freshSave };
  }
}

export function saveResult(result: { won: boolean; bestLap: number; speed: number }): CareerSave {
  const current = loadSave();
  const next: CareerSave = {
    races: current.races + 1,
    wins: current.wins + Number(result.won),
    bestLap: current.bestLap === null ? result.bestLap : Math.min(current.bestLap, result.bestLap),
    bestSpeed: Math.max(current.bestSpeed, result.speed),
    unlocked: Math.min(8, Math.max(current.unlocked, current.races + 2)),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
