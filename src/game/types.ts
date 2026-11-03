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
}
export interface Building extends Point {
  id: number;
  type: string;
  level: number;
  remaining: number;
  hp: number;
  rotation: number;
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
}
export interface Soldier extends Point {
  id: number;
  type: 'guard' | 'archer';
  hp: number;
  path: Point[];
  cooldown: number;
  target: string | null;
}
export interface Region extends Point {
  id: string;
  discovered: boolean;
  explored: boolean;
  enemy: number;
  maxEnemy: number;
  reward: Cost;
  progress: number;
}
export interface ResearchDef {
  id: string;
  cost: Cost;
  time: number;
  requires: string[];
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
  raidTimer: number;
  raid: { hp: number; x: number; y: number } | null;
  stats: { built: number; upgraded: number; explored: number; defeated: number; traded: number };
  settings: { language: Language; sound: boolean; quality: 'high' | 'low' };
}
