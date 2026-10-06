import type { Squad } from './Squad';
import { fmt } from './gates';

/** Helper counts/levels a reward can read or raise. */
export interface HelperState {
  drones: number;
  dogLevel: number;
  planeLevel: number;
  falcons: number;
}

export interface RewardHost {
  squad: Squad;
  helpers: HelperState;
  addDrone(): void;
  upgradeDog(): void;
  upgradePlane(): void;
  addFalcon(): void;
}

export interface Reward {
  id: string;
  title: string;
  icon: string; // texture key
  desc(h: RewardHost): string;
  available(h: RewardHost): boolean;
  apply(h: RewardHost): void;
}

export const REWARDS: Reward[] = [
  {
    id: 'reinforcements',
    title: 'Posiłki',
    icon: 'loot_soldier',
    desc: h => `+${reinforcements(h.squad.count)} żołnierzy`,
    available: () => true,
    apply: h => { h.squad.count += reinforcements(h.squad.count); },
  },
  {
    id: 'trigger',
    title: 'Karabin maszynowy',
    icon: 'loot_fire',
    desc: h => `Szybkość strzelania: ${fmt(h.squad.fireRate)} → ${fmt(h.squad.fireRate * 1.4)} /s`,
    available: () => true,
    apply: h => { h.squad.fireRate *= 1.4; },
  },
  {
    id: 'ammo',
    title: 'Ciężka amunicja',
    icon: 'loot_dmg',
    desc: h => `Moc pocisku: ${fmt(h.squad.damage)} → ${fmt(h.squad.damage * 1.5)}`,
    available: () => true,
    apply: h => { h.squad.damage *= 1.5; },
  },
  {
    id: 'barrel',
    title: 'Podwójna lufa',
    icon: 'bullet',
    desc: h => `${h.squad.multishot + 1} pociski z każdego karabinu`,
    available: h => h.squad.multishot < 3,
    apply: h => { h.squad.multishot += 1; },
  },
  {
    id: 'shield',
    title: 'Tarcza',
    icon: 'icon_shield',
    desc: h => `Blokuje 3 trafienia (masz ${h.squad.shield} → ${h.squad.shield + 3})`,
    available: () => true,
    apply: h => { h.squad.shield += 3; },
  },
  {
    id: 'magnet',
    title: 'Magnes',
    icon: 'icon_magnet',
    desc: () => 'Łupy przyciągane z większej odległości',
    available: h => h.squad.magnet < 180,
    apply: h => { h.squad.magnet += 60; },
  },
  {
    id: 'drone',
    title: 'Dron bojowy',
    icon: 'drone',
    desc: h => (h.helpers.drones ? `Kolejny dron (masz ${h.helpers.drones})` : 'Lata obok i strzela do wrogów'),
    available: h => h.helpers.drones < 3,
    apply: h => h.addDrone(),
  },
  {
    id: 'dog',
    title: 'Pies bojowy',
    icon: 'dog',
    desc: h => (h.helpers.dogLevel ? `Silniejszy pies (poz. ${h.helpers.dogLevel + 1})` : 'Rzuca się na wrogów przed oddziałem'),
    available: h => h.helpers.dogLevel < 3,
    apply: h => h.upgradeDog(),
  },
  {
    id: 'plane',
    title: 'Nalot',
    icon: 'plane',
    desc: h => (h.helpers.planeLevel ? `Częstsze naloty (poz. ${h.helpers.planeLevel + 1})` : 'Samolot bombarduje grupy wrogów'),
    available: h => h.helpers.planeLevel < 3,
    apply: h => h.upgradePlane(),
  },
  {
    id: 'falcon',
    title: 'Sokół zbieracz',
    icon: 'falcon',
    desc: h => (h.helpers.falcons ? 'Drugi sokół' : 'Przynosi łupy, także z drugiej strony drogi'),
    available: h => h.helpers.falcons < 2,
    apply: h => h.addFalcon(),
  },
];

function reinforcements(count: number): number {
  return Math.max(8, Math.round(count * 0.3));
}

export function rollRewards(h: RewardHost, n = 3): Reward[] {
  const pool = REWARDS.filter(r => r.available(h));
  const out: Reward[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}
