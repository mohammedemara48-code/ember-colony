export type BuildingKind =
  | 'generator'
  | 'tent'
  | 'gathering'
  | 'cookhouse'
  | 'coal_pile'
  | 'thumper'
  | 'workshop'
  | 'medical'
  | 'tree'
  | 'snow';

export type CitizenState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'eating'
  | 'sleeping'
  | 'freezing'
  | 'healing';

export type JobKind =
  | 'gather_wood'
  | 'mine_coal'
  | 'cook'
  | 'craft'
  | 'heal'
  | 'rest'
  | 'none';

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
  hp?: number;
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
  hunger: number;
  cold: number;
  health: number;
  hopeBias: number;
  workCooldown: number;
  thoughtCooldown: number;
  currentThought: string | null;
  speed: number;
  facing: 0 | 1 | 2 | 3; // down left right up
  variant: number;
}

export interface Resources {
  coal: number;
  wood: number;
  food: number;
  rawFood: number;
  steel: number;
  hope: number;
  discontent: number;
}

export interface BuildRecipe {
  kind: BuildingKind;
  labelAr: string;
  wood: number;
  coal: number;
  food: number;
  steel: number;
  w: number;
  h: number;
  capacity: number;
  tex: string;
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
  stormTemp: number;
}

export type EventKind = 'law' | 'cold_snap' | 'storm' | 'dawn' | 'none';

export interface GameEvent {
  id: string;
  kind: EventKind;
  titleAr: string;
  bodyAr: string;
  choices: { id: string; labelAr: string; effect: string }[];
  fired: boolean;
  atProgress: number;
}

export type EndReason =
  | 'survived'
  | 'hope_lost'
  | 'discontent_revolt'
  | 'starved'
  | 'frozen'
  | 'storm'
  | 'none';

export interface LawState {
  emergencyShift: boolean;
  childLabour: boolean;
  foodRation: boolean;
  radicalTreatment: boolean;
  faithKeepers: boolean;
}

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
  stormActive: boolean;
  message: string | null;
  laws: LawState;
  heatRadius: number;
}
