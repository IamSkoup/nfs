const STORAGE_KEY = 'savanna-underground-save-v1';

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
