import { Fuli } from '../player/Fuli';
import { Track } from '../tracks/track';

export interface RacerPersonality {
  aggression: number;
  cornerSkill: number;
  stamina: number;
  acceleration: number;
  topSpeed: number;
  mistakeChance: number;
}

export interface Racer {
  name: string;
  runner: Fuli;
  progress: number;
  speed: number;
  lateral: number;
  personality: RacerPersonality;
  phase: number;
}

const profiles: RacerPersonality[] = [
  { aggression: .72, cornerSkill: .62, stamina: .68, acceleration: 1.2, topSpeed: 17.3, mistakeChance: .012 },
  { aggression: .46, cornerSkill: .91, stamina: .82, acceleration: .95, topSpeed: 16.7, mistakeChance: .008 },
  { aggression: .83, cornerSkill: .58, stamina: .96, acceleration: 1.03, topSpeed: 16.1, mistakeChance: .018 },
];

export function createRacers(track: Track): Racer[] {
  const names = ['Kito', 'Duma', 'Zuri'];
  const styles = ['sunset', 'midnight', 'snow'];
  return names.map((name, i) => {
    const runner = new Fuli();
    runner.setStyle(styles[i]!);
    const progress = i * 0.002;
    const lateral = track.mode === 'drag' ? (i - 1) * 3.5 : (i - 1) * 3.2;
    runner.root.position.copy(track.sample(progress, lateral));
    return { name, runner, progress, speed: 0, lateral, personality: profiles[i]!, phase: Math.random() * 8 };
  });
}
