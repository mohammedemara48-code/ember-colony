export type BuildingKind =
  | 'generator'
  | 'tent'
  | 'gathering'
  | 'cookhouse'
  | 'coal_pile'
  | 'tree'
  | 'snow';

export type CitizenState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'eating'
  | 'sleeping'
  | 'freezing';

export type JobKind = 'gather_wood' | 'mine_coal' | 'cook' | 'rest' | 'none';

export interface Cell {
  x: number;
  y: number;
  walkable: boolean;
  heat: number;
  buildingId: string | null;
}

export interface Building {
  id: string;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  workers: number;
  capacity: number;
  labelAr: string;
}

export interface Citizen {
  id: string;
  nameAr: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  state: CitizenState;
  job: JobKind;
  workplaceId: string | null;
  homeId: string | null;
  hunger: number; // 0 full … 100 starving
  cold: number; // 0 warm … 100 frozen
  hopeBias: number; // personal -10..10
  workCooldown: number;
  thoughtCooldown: number;
  currentThought: string | null;
  speed: number;
}

export interface Resources {
  coal: number;
  wood: number;
  food: number;
  rawFood: number;
  hope: number;
  discontent: number;
}

export interface SimConfig {
  gridW: number;
  gridH: number;
  tileSize: number;
  citizenCount: number;
  scenarioSeconds: number;
  dayNightCycle: number;
  generatorHeatRadius: number;
  startingCoal: number;
  startingWood: number;
  startingFood: number;
  ambientDay: number;
  ambientNight: number;
  coldSnapTemp: number;
}

export type EventKind = 'law' | 'cold_snap' | 'dawn' | 'none';

export interface GameEvent {
  id: string;
  kind: EventKind;
  titleAr: string;
  bodyAr: string;
  choices: { id: string; labelAr: string; effect: string }[];
  fired: boolean;
  atProgress: number; // 0..1 of scenario
}

export type EndReason =
  | 'survived'
  | 'hope_lost'
  | 'discontent_revolt'
  | 'starved'
  | 'frozen'
  | 'none';

export interface SimSnapshot {
  time: number;
  progress: number;
  dayIndex: number;
  isNight: boolean;
  ambientTemp: number;
  resources: Resources;
  citizensAlive: number;
  citizensFreezing: number;
  generatorOn: boolean;
  generatorLevel: number;
  activeEvent: GameEvent | null;
  ended: boolean;
  endReason: EndReason;
  coldSnapActive: boolean;
  message: string | null;
}
