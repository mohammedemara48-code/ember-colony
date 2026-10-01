import { findPath, nearestWalkable } from './pathfinding';
import type {
  Building,
  Cell,
  Citizen,
  EndReason,
  GameEvent,
  JobKind,
  Resources,
  SimConfig,
  SimSnapshot,
} from './types';
import { DEFAULT_CONFIG } from './config';
import { applySimUpdate } from './simUpdate';
import { placeBuilding, placeBuildings, spawnCitizens, setupEvents } from './simSetup';
import { chooseEvent as doChoose, snapshot as doSnap, tryBoostGenerator as doBoost } from './simActions';

export class SimState {
  readonly config: SimConfig;
  grid: Cell[][] = [];
  buildings: Building[] = [];
  citizens: Citizen[] = [];
  resources: Resources;
  time = 0;
  generatorOn = true;
  generatorLevel = 1;
  coldSnapActive = false;
  coldSnapTimer = 0;
  ended = false;
  endReason: EndReason = 'none';
  message: string | null = null;
  activeEvent: GameEvent | null = null;
  events: GameEvent[] = [];
  muted = false;
  lawChildLabour = false;
  lawEmergencyShift = false;
  foodRationStrict = false;
  assignTimer = 0;
  eatTimer = 0;
  hopeTick = 0;

  constructor(config: Partial<SimConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resources = {
      coal: this.config.startingCoal,
      wood: this.config.startingWood,
      food: this.config.startingFood,
      rawFood: 12,
      hope: 55,
      discontent: 18,
    };
    this.buildGrid();
    this.placeBuildings();
    this.spawnCitizens();
    this.setupEvents();
    this.recomputeHeat();
  }

  get progress() {
    return Math.min(1, this.time / this.config.scenarioSeconds);
  }

  get dayIndex() {
    return Math.floor(this.time / this.config.dayNightCycle) + 1;
  }

  get isNight() {
    const cycle = this.time % this.config.dayNightCycle;
    return cycle > this.config.dayNightCycle * 0.45;
  }

  get ambientTemp() {
    let base = this.isNight ? this.config.ambientNight : this.config.ambientDay;
    if (this.coldSnapActive) base = this.config.coldSnapTemp;
    return base;
  }

  private buildGrid() {
    const { gridW, gridH } = this.config;
    this.grid = [];
    for (let y = 0; y < gridH; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < gridW; x++) {
        row.push({ x, y, walkable: true, heat: 0, buildingId: null });
      }
      this.grid.push(row);
    }
  }

  private placeBuilding(kind: any, x: number, y: number, w: number, h: number, capacity: number, labelAr: string, blockWalk = true) {
    return placeBuilding(this, kind, x, y, w, h, capacity, labelAr, blockWalk);
  }
  private placeBuildings() { placeBuildings(this); }
  private spawnCitizens() { spawnCitizens(this); }
  private setupEvents() { setupEvents(this); }
  recomputeHeat() {
    const { gridW, gridH, generatorHeatRadius } = this.config;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        this.grid[y][x].heat = 0;
      }
    }
    if (!this.generatorOn) return;
    const gen = this.buildings.find((b) => b.kind === 'generator');
    if (!gen) return;
    const gx = gen.x + gen.w / 2;
    const gy = gen.y + gen.h / 2;
    const radius = generatorHeatRadius + (this.generatorLevel - 1) * 1.5;
    const power = this.coldSnapActive ? 0.75 : 1;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy);
        if (d <= radius) {
          this.grid[y][x].heat = Math.max(
            0,
            (1 - d / radius) * power * (0.7 + this.generatorLevel * 0.15),
          );
        }
      }
    }
    for (const b of this.buildings) {
      if (b.kind !== 'tent') continue;
      for (let yy = b.y; yy < b.y + b.h; yy++) {
        for (let xx = b.x; xx < b.x + b.w; xx++) {
          if (yy >= 0 && xx >= 0 && yy < gridH && xx < gridW) {
            this.grid[yy][xx].heat = Math.max(this.grid[yy][xx].heat, 0.35);
          }
        }
      }
    }
  }

  heatAt(x: number, y: number) {
    const ix = Math.max(0, Math.min(this.config.gridW - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(this.config.gridH - 1, Math.floor(y)));
    return this.grid[iy][ix].heat;
  }

  setPath(c: Citizen, tx: number, ty: number) {
    const sx = Math.floor(c.x);
    const sy = Math.floor(c.y);
    const path = findPath(this.grid, sx, sy, tx, ty);
    c.path = path;
    c.pathIndex = 0;
    c.destX = tx;
    c.destY = ty;
    if (path.length) c.state = 'walking';
  }

  moodWorkFactor(): number {
    const hope = this.resources.hope / 100;
    const disc = this.resources.discontent / 100;
    let f = 0.65 + hope * 0.45 - disc * 0.35;
    if (this.lawEmergencyShift) f *= 1.25;
    if (this.lawChildLabour) f *= 1.1;
    return Math.max(0.25, Math.min(1.4, f));
  }

  chanceIdle(): boolean {
    const disc = this.resources.discontent;
    const hope = this.resources.hope;
    const p = Math.max(0, (disc - hope) * 0.004 + (disc > 60 ? 0.08 : 0));
    return Math.random() < p;
  }

  assignJobs() {
    for (const b of this.buildings) b.workers = 0;

    const workplaces = this.buildings.filter((b) =>
      ['gathering', 'cookhouse', 'coal_pile'].includes(b.kind),
    );

    for (const c of this.citizens) {
      if (c.state === 'freezing' && c.cold > 90) continue;
      if (c.hunger > 75) {
        const cook = this.buildings.find((b) => b.kind === 'cookhouse');
        if (cook && this.resources.food > 0) {
          const spot = nearestWalkable(this.grid, cook.x, cook.y, cook.w, cook.h);
          if (spot) {
            c.job = 'none';
            c.workplaceId = null;
            c.state = 'eating';
            this.setPath(c, spot.x, spot.y);
          }
        }
        continue;
      }

      if (c.cold > 80) {
        const home = this.buildings.find((b) => b.id === c.homeId);
        if (home) {
          const spot = nearestWalkable(this.grid, home.x, home.y, home.w, home.h);
          if (spot) {
            c.job = 'rest';
            c.state = 'walking';
            this.setPath(c, spot.x, spot.y);
          }
        }
        continue;
      }

      if (this.chanceIdle() && c.state !== 'working') {
        c.job = 'none';
        c.workplaceId = null;
        c.state = 'idle';
        c.path = [];
        continue;
      }

      if (c.state === 'working' || c.state === 'walking') {
        const wp = workplaces.find((b) => b.id === c.workplaceId);
        if (wp) wp.workers++;
        continue;
      }

      workplaces.sort((a, b) => a.workers / a.capacity - b.workers / b.capacity);
      const target = workplaces.find((b) => b.workers < b.capacity);
      if (!target) {
        c.state = 'idle';
        continue;
      }
      const spot = nearestWalkable(
        this.grid,
        target.x,
        target.y,
        target.w,
        target.h,
      );
      if (!spot) continue;
      target.workers++;
      c.workplaceId = target.id;
      c.job =
        target.kind === 'gathering'
          ? 'gather_wood'
          : target.kind === 'coal_pile'
            ? 'mine_coal'
            : 'cook';
      this.setPath(c, spot.x, spot.y);
    }

    if (this.lawChildLabour) {
      this.resources.wood += 0.02;
    }
  }

  /** Advance simulation by dt seconds. */
  update(dt: number) {
    applySimUpdate(this, dt);
  }

  /** Player can click to place — MVP uses pre-placed; keep API. */

  chooseEvent(choiceId: string) { doChoose(this, choiceId); }
  snapshot() { return doSnap(this); }
  tryBoostGenerator() { return doBoost(this); }
}

export type { JobKind };
