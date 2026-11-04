export const RESOURCES = [
  'food',
  'wood',
  'stone',
  'knowledge',
  'grain',
  'leather',
  'tools',
  'copper',
  'bronze',
  'gold',
  'iron',
  'coal',
  'steel',
  'cloth',
  'paper',
  'medicine',
  'oil',
  'energy',
  'electronics',
  'alloys',
  'fuel',
  'data',
  'crystals',
] as const;
export type Resource = (typeof RESOURCES)[number];
export type Stock = Record<Resource, number>;
export type Cost = Partial<Stock>;
export type Category = 'housing' | 'production' | 'community' | 'defense' | 'paths';
export type Terrain = 'grass' | 'forest' | 'rock' | 'water' | 'sand';
export type Language = 'de' | 'en' | 'es' | 'fr';
export interface Point {
  x: number;
  y: number;
}
export interface BuildingDef {
  id: string;
  category: Category;
  size: number;
  cost: Cost;
  time: number;
  color: string;
  roof: string;
  housing?: number;
  storage?: number;
  stores?: Resource[];
  output?: Cost;
  input?: Cost;
  workers?: number;
  research?: string;
  near?: Terrain;
  hp?: number;
  range?: number;
  damage?: number;
  age?: number;
  service?: 'health' | 'education' | 'culture';
  serviceValue?: number;
}
export interface Building extends Point {
  id: number;
  type: string;
  level: number;
  remaining: number;
  hp: number;
  rotation: number;
  paused?: boolean;
}
export interface Worker extends Point {
  id: number;
  home: number;
  assigned: number | null;
  task: 'idle' | 'gather' | 'build' | 'deliver' | 'flee';
  target: number | null;
  path: Point[];
  timer: number;
  cargo: Cost;
  resource: Resource;
  serviceCargo?: { kind: 'health' | 'education' | 'culture'; amount: number };
}
export interface Soldier extends Point {
  id: number;
  type: string;
  hp: number;
  path: Point[];
  cooldown: number;
  target: string | null;
  order?: 'defend' | 'attack' | 'hold' | 'move' | 'retreat';
}
export interface Region extends Point {
  id: string;
  discovered: boolean;
  explored: boolean;
  enemy: number;
  maxEnemy: number;
  reward: Cost;
  progress: number;
  kind?: 'woods' | 'ruins' | 'traders' | 'raiders';
  tier?: number;
  seed?: number;
}
export interface ResearchDef {
  id: string;
  cost: Cost;
  time: number;
  requires: string[];
  age?: number;
  population?: number;
  building?: string;
}
export interface UnitDef {
  id: string;
  age: number;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  cooldown: number;
  cost: Cost;
  siege?: boolean;
}
export type CityData = Pick<
  GameState,
  | 'seed'
  | 'resources'
  | 'cleared'
  | 'buildings'
  | 'workers'
  | 'soldiers'
  | 'nextId'
  | 'populationTimer'
  | 'happiness'
  | 'raidTimer'
  | 'raid'
  | 'services'
>;
export interface Colony {
  id: string;
  data: CityData;
}
export interface TradeRoute {
  id: number;
  from: string;
  to: string;
  resource: Resource;
  amount: number;
  cargo: number;
  remaining: number;
  repeat: boolean;
  paused: boolean;
}
export interface GameState {
  version: number;
  seed: number;
  time: number;
  age: number;
  resources: Stock;
  cleared: number[];
  buildings: Building[];
  workers: Worker[];
  soldiers: Soldier[];
  regions: Region[];
  research: string[];
  researching: { id: string; remaining: number } | null;
  missions: string[];
  lifetime: Stock;
  nextId: number;
  populationTimer: number;
  happiness: number;
  services: { health: number; education: number; culture: number };
  activeCity: string;
  colonies: Colony[];
  routes: TradeRoute[];
  campaign: { launched: boolean; launchRemaining: number };
  lastActive: number;
  raidTimer: number;
  raid: { hp: number; x: number; y: number } | null;
  stats: { built: number; upgraded: number; explored: number; defeated: number; traded: number };
  settings: {
    language: Language;
    sound: boolean;
    quality: 'high' | 'low';
    difficulty: 'peaceful' | 'normal' | 'hard';
    offline: boolean;
  };
}
