import { findPath, nearestWalkable } from './pathfinding';
import { NAMES_AR, thoughtFor } from './thoughts';
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

export const DEFAULT_CONFIG: SimConfig = {
  gridW: 28,
  gridH: 28,
  tileSize: 28,
  citizenCount: 20,
  scenarioSeconds: 120, // first night ~2 min playable
  dayNightCycle: 40,
  generatorHeatRadius: 6,
  startingCoal: 80,
  startingWood: 40,
  startingFood: 35,
  ambientDay: -15,
  ambientNight: -35,
  coldSnapTemp: -55,
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

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
  private assignTimer = 0;
  private eatTimer = 0;
  private hopeTick = 0;

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

  private placeBuilding(
    kind: Building['kind'],
    x: number,
    y: number,
    w: number,
    h: number,
    capacity: number,
    labelAr: string,
    blockWalk = true,
  ) {
    const b: Building = {
      id: id(kind),
      kind,
      x,
      y,
      w,
      h,
      workers: 0,
      capacity,
      labelAr,
    };
    this.buildings.push(b);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (yy < 0 || xx < 0 || yy >= this.config.gridH || xx >= this.config.gridW)
          continue;
        this.grid[yy][xx].buildingId = b.id;
        if (blockWalk && kind !== 'tent') this.grid[yy][xx].walkable = false;
        // tents stay walkable-ish at edge; block center
        if (kind === 'tent') {
          this.grid[yy][xx].walkable = false;
        }
      }
    }
    return b;
  }

  private placeBuildings() {
    const cx = Math.floor(this.config.gridW / 2);
    const cy = Math.floor(this.config.gridH / 2);

    this.placeBuilding('generator', cx - 1, cy - 1, 3, 3, 0, 'المولّد', true);

    // tents around generator
    const tentSpots = [
      [cx - 5, cy - 4],
      [cx + 3, cy - 4],
      [cx - 5, cy + 3],
      [cx + 3, cy + 3],
      [cx - 7, cy - 1],
      [cx + 5, cy - 1],
    ];
    for (const [tx, ty] of tentSpots) {
      this.placeBuilding('tent', tx!, ty!, 2, 2, 4, 'خيمة', true);
    }

    this.placeBuilding('gathering', cx - 9, cy - 8, 2, 2, 4, 'محطة جمع', true);
    this.placeBuilding('cookhouse', cx + 6, cy - 7, 2, 2, 3, 'مطبخ', true);
    this.placeBuilding('coal_pile', cx - 2, cy + 6, 2, 2, 4, 'كومة فحم', true);

    // decorative trees / snow piles (non-blocking mostly)
    for (let i = 0; i < 18; i++) {
      const tx = 1 + Math.floor(Math.random() * (this.config.gridW - 2));
      const ty = 1 + Math.floor(Math.random() * (this.config.gridH - 2));
      if (this.grid[ty][tx].buildingId) continue;
      if (Math.hypot(tx - cx, ty - cy) < 5) continue;
      this.placeBuilding(
        Math.random() < 0.5 ? 'tree' : 'snow',
        tx,
        ty,
        1,
        1,
        0,
        Math.random() < 0.5 ? 'شجرة متجمدة' : 'كومة ثلج',
        true,
      );
    }
  }

  private spawnCitizens() {
    const tents = this.buildings.filter((b) => b.kind === 'tent');
    const names = [...NAMES_AR].sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.config.citizenCount; i++) {
      const tent = tents[i % tents.length]!;
      const spot = nearestWalkable(this.grid, tent.x, tent.y, tent.w, tent.h) ?? {
        x: tent.x - 1,
        y: tent.y,
      };
      const c: Citizen = {
        id: id('c'),
        nameAr: names[i % names.length]!,
        x: spot.x + Math.random() * 0.3,
        y: spot.y + Math.random() * 0.3,
        destX: spot.x,
        destY: spot.y,
        path: [],
        pathIndex: 0,
        state: 'idle',
        job: 'none',
        workplaceId: null,
        homeId: tent.id,
        hunger: 10 + Math.random() * 20,
        cold: 5 + Math.random() * 15,
        hopeBias: -3 + Math.random() * 6,
        workCooldown: 0,
        thoughtCooldown: 2 + Math.random() * 4,
        currentThought: null,
        speed: 1.6 + Math.random() * 0.6,
      };
      this.citizens.push(c);
    }
  }

  private setupEvents() {
    this.events = [
      {
        id: 'law_1',
        kind: 'law',
        titleAr: 'قانون الطوارئ',
        bodyAr:
          'الليل يطول والجوع يقترب. هل تفرضون نوبة طوارئ لزيادة الإنتاج، أم عمل الأطفال لجمع المزيد؟ كلاهما يرفع السخط.',
        choices: [
          {
            id: 'emergency',
            labelAr: 'نوبة طوارئ (+إنتاج، +سخط)',
            effect: 'emergency',
          },
          {
            id: 'child',
            labelAr: 'عمل الأطفال (+خشب، ++سخط)',
            effect: 'child',
          },
          {
            id: 'refuse',
            labelAr: 'نرفض… نتحمل معًا (−أمل قليل)',
            effect: 'refuse',
          },
        ],
        fired: false,
        atProgress: 0.28,
      },
      {
        id: 'cold_snap',
        kind: 'cold_snap',
        titleAr: 'موجة صقيع!',
        bodyAr:
          'رياح القطب تهبط فجأة. الحرارة تنهار. أشعلوا الفحم… أو تجمّدوا.',
        choices: [
          {
            id: 'burn',
            labelAr: 'احرقوا الفحم بقوة (−فحم، +دفء)',
            effect: 'burn',
          },
          {
            id: 'endure',
            labelAr: 'اصمدوا (−أمل، برد أشد)',
            effect: 'endure',
          },
        ],
        fired: false,
        atProgress: 0.55,
      },
    ];
  }

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
    // tents add tiny indoor heat
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

  private setPath(c: Citizen, tx: number, ty: number) {
    const sx = Math.floor(c.x);
    const sy = Math.floor(c.y);
    const path = findPath(this.grid, sx, sy, tx, ty);
    c.path = path;
    c.pathIndex = 0;
    c.destX = tx;
    c.destY = ty;
    if (path.length) c.state = 'walking';
  }

  private moodWorkFactor(): number {
    const hope = this.resources.hope / 100;
    const disc = this.resources.discontent / 100;
    let f = 0.65 + hope * 0.45 - disc * 0.35;
    if (this.lawEmergencyShift) f *= 1.25;
    if (this.lawChildLabour) f *= 1.1;
    return Math.max(0.25, Math.min(1.4, f));
  }

  private chanceIdle(): boolean {
    const disc = this.resources.discontent;
    const hope = this.resources.hope;
    const p = Math.max(0, (disc - hope) * 0.004 + (disc > 60 ? 0.08 : 0));
    return Math.random() < p;
  }

  private assignJobs() {
    // reset worker counts
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
        // seek heat / home
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

      // assign to least-filled workplace
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
      // abstract bonus: phantom child gatherers
      this.resources.wood += 0.02;
    }
  }

  chooseEvent(choiceId: string) {
    const ev = this.activeEvent;
    if (!ev) return;
    const choice = ev.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    if (ev.kind === 'law') {
      if (choice.effect === 'emergency') {
        this.lawEmergencyShift = true;
        this.resources.discontent = Math.min(100, this.resources.discontent + 12);
        this.resources.hope = Math.max(0, this.resources.hope - 3);
        this.message = 'فُرضت نوبة الطوارئ. الإنتاج يرتفع والسخط أيضًا.';
      } else if (choice.effect === 'child') {
        this.lawChildLabour = true;
        this.resources.discontent = Math.min(100, this.resources.discontent + 20);
        this.resources.wood += 8;
        this.message = 'عمل الأطفال… الخشب يزيد، والقلوب تثقل.';
      } else {
        this.resources.hope = Math.max(0, this.resources.hope - 6);
        this.resources.discontent = Math.max(0, this.resources.discontent - 4);
        this.message = 'رفضتم القانون. الأمل يهتز… لكن الكرامة باقية.';
      }
    } else if (ev.kind === 'cold_snap') {
      this.coldSnapActive = true;
      this.coldSnapTimer = 28;
      if (choice.effect === 'burn') {
        this.resources.coal = Math.max(0, this.resources.coal - 25);
        this.generatorLevel = Math.min(3, this.generatorLevel + 1);
        this.message = 'الفحم يحترق بشدة. المولّد يزأر ضد الصقيع.';
      } else {
        this.resources.hope = Math.max(0, this.resources.hope - 10);
        this.message = 'لا فحم إضافي. اصمدوا… إن استطعتم.';
      }
      this.recomputeHeat();
    }

    ev.fired = true;
    this.activeEvent = null;
  }

  /** Advance simulation by dt seconds. */
  update(dt: number) {
    if (this.ended || this.activeEvent) return;

    this.time += dt;
    this.assignTimer -= dt;
    this.eatTimer -= dt;
    this.hopeTick -= dt;

    // generator coal burn
    if (this.generatorOn) {
      const burn = (0.35 + this.generatorLevel * 0.2) * dt;
      this.resources.coal -= burn;
      if (this.resources.coal <= 0) {
        this.resources.coal = 0;
        this.generatorOn = false;
        this.message = 'انقطع الفحم! المولّد يخمد…';
        this.recomputeHeat();
      }
    } else if (this.resources.coal > 5) {
      // auto restart if coal returns
      this.generatorOn = true;
      this.message = 'المولّد يعود للحياة.';
      this.recomputeHeat();
    }

    if (this.coldSnapActive) {
      this.coldSnapTimer -= dt;
      if (this.coldSnapTimer <= 0) {
        this.coldSnapActive = false;
        this.message = 'انحسرت موجة الصقيع… قليلًا.';
        this.recomputeHeat();
      }
    }

    // fire scripted events
    for (const ev of this.events) {
      if (!ev.fired && this.progress >= ev.atProgress) {
        this.activeEvent = ev;
        return;
      }
    }

    if (this.assignTimer <= 0) {
      this.assignJobs();
      this.assignTimer = 1.2;
    }

    const mood = this.moodWorkFactor();
    let freezingCount = 0;
    let deadHunger = 0;
    let deadCold = 0;

    for (const c of this.citizens) {
      const heat = this.heatAt(c.x, c.y);
      const ambient = this.ambientTemp;
      // effective temperature feel
      const warmth = heat * 50 + ambient; // heat 1 => +50C offset vs ambient
      if (warmth < -10) {
        c.cold = Math.min(100, c.cold + dt * (8 + Math.abs(warmth + 10) * 0.15));
      } else {
        c.cold = Math.max(0, c.cold - dt * (6 + heat * 10));
      }

      c.hunger = Math.min(100, c.hunger + dt * 1.8);

      if (c.cold > 85) {
        c.state = 'freezing';
        freezingCount++;
      }

      // movement along path
      if (c.path.length && c.pathIndex < c.path.length) {
        const target = c.path[c.pathIndex]!;
        const tx = target.x + 0.5;
        const ty = target.y + 0.5;
        const dx = tx - c.x;
        const dy = ty - c.y;
        const dist = Math.hypot(dx, dy);
        const step = c.speed * dt * (c.cold > 60 ? 0.7 : 1) * (c.hunger > 70 ? 0.85 : 1);
        if (dist <= step) {
          c.x = tx;
          c.y = ty;
          c.pathIndex++;
          if (c.pathIndex >= c.path.length) {
            c.path = [];
            if (c.state === 'eating') {
              if (this.resources.food >= 1) {
                this.resources.food -= 1;
                c.hunger = Math.max(0, c.hunger - 45);
              }
              c.state = 'idle';
            } else if (c.job !== 'none' && c.job !== 'rest') {
              c.state = 'working';
              c.workCooldown = 0.5;
            } else if (c.job === 'rest') {
              c.state = 'sleeping';
            } else {
              c.state = 'idle';
            }
          }
        } else {
          c.x += (dx / dist) * step;
          c.y += (dy / dist) * step;
          c.state = 'walking';
        }
      }

      // work production
      if (c.state === 'working' && c.workplaceId) {
        c.workCooldown -= dt;
        if (c.workCooldown <= 0) {
          c.workCooldown = 1.1 / mood;
          if (c.job === 'gather_wood') this.resources.wood += 0.45 * mood;
          if (c.job === 'mine_coal') this.resources.coal += 0.55 * mood;
          if (c.job === 'cook' && this.resources.rawFood >= 0.4) {
            this.resources.rawFood -= 0.4;
            this.resources.food += 0.55 * mood;
          } else if (c.job === 'cook') {
            // forage scraps
            this.resources.rawFood += 0.05;
          }
        }
      }

      // thoughts
      c.thoughtCooldown -= dt;
      if (c.thoughtCooldown <= 0) {
        c.currentThought = thoughtFor({
          cold: c.cold,
          hunger: c.hunger,
          hope: this.resources.hope,
          discontent: this.resources.discontent,
          state: c.state,
          heatHere: heat,
        });
        c.thoughtCooldown = 5 + Math.random() * 8;
      }

      if (c.hunger >= 100) deadHunger++;
      if (c.cold >= 100) deadCold++;
    }

    // passive raw food from wood scavenging abstraction
    if (this.resources.wood > 2) {
      // nothing
    }

    // hope / discontent ticks
    if (this.hopeTick <= 0) {
      this.hopeTick = 2;
      const avgCold =
        this.citizens.reduce((s, c) => s + c.cold, 0) / this.citizens.length;
      const avgHunger =
        this.citizens.reduce((s, c) => s + c.hunger, 0) / this.citizens.length;
      if (avgCold > 50) this.resources.hope -= 1.2;
      if (avgHunger > 55) this.resources.hope -= 0.8;
      if (heatAvg(this) > 0.35) this.resources.hope += 0.6;
      if (this.generatorOn) this.resources.hope += 0.3;
      if (!this.generatorOn) {
        this.resources.hope -= 2;
        this.resources.discontent += 1.5;
      }
      if (avgCold > 60) this.resources.discontent += 1.2;
      if (this.resources.food < 5) this.resources.discontent += 0.8;
      if (this.resources.hope > 70) this.resources.discontent -= 0.4;

      this.resources.hope = clamp(this.resources.hope, 0, 100);
      this.resources.discontent = clamp(this.resources.discontent, 0, 100);
    }

    // convert wood->raw occasionally at gathering (already via workers)

    // win / lose
    if (this.progress >= 1) {
      this.ended = true;
      this.endReason = 'survived';
      this.message = 'الفجر… نجوتُم من الليلة الأولى.';
      return;
    }
    if (this.resources.hope <= 0) {
      this.ended = true;
      this.endReason = 'hope_lost';
      this.message = 'انطفأ الأمل. تفرّقت المستوطنة.';
      return;
    }
    if (this.resources.discontent >= 100) {
      this.ended = true;
      this.endReason = 'discontent_revolt';
      this.message = 'تمرّد الجياع على المولّد.';
      return;
    }
    if (deadCold >= this.citizens.length * 0.45) {
      this.ended = true;
      this.endReason = 'frozen';
      this.message = 'الصقيع حصد أرواحًا كثيرة.';
      return;
    }
    if (deadHunger >= this.citizens.length * 0.5) {
      this.ended = true;
      this.endReason = 'starved';
      this.message = 'الجوع أنهى القصة.';
      return;
    }

    void freezingCount;
  }

  snapshot(): SimSnapshot {
    return {
      time: this.time,
      progress: this.progress,
      dayIndex: this.dayIndex,
      isNight: this.isNight,
      ambientTemp: this.ambientTemp,
      resources: { ...this.resources },
      citizensAlive: this.citizens.filter((c) => c.cold < 100 && c.hunger < 100)
        .length,
      citizensFreezing: this.citizens.filter((c) => c.cold > 80).length,
      generatorOn: this.generatorOn,
      generatorLevel: this.generatorLevel,
      activeEvent: this.activeEvent,
      ended: this.ended,
      endReason: this.endReason,
      coldSnapActive: this.coldSnapActive,
      message: this.message,
    };
  }

  /** Player can click to place — MVP uses pre-placed; keep API. */
  tryBoostGenerator() {
    if (this.resources.coal >= 10 && this.generatorLevel < 3) {
      this.resources.coal -= 10;
      this.generatorLevel++;
      this.recomputeHeat();
      this.message = 'تعزيز المولّد!';
      return true;
    }
    return false;
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function heatAvg(sim: SimState) {
  let s = 0;
  for (const c of sim.citizens) s += sim.heatAt(c.x, c.y);
  return s / Math.max(1, sim.citizens.length);
}

export type { JobKind };
