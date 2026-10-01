import Phaser from 'phaser';
import { isMuted, setMuted, Sfx, toggleMute } from '../audio/Sfx';
import { SimState } from '../sim/SimState';
import { ensureHudStyles, HudDom } from '../ui/HudDom';
import { EventModal } from './EventModal';
import { generateTextures } from './textures';

type CitizenSprite = Phaser.GameObjects.Sprite & { citizenId?: string };

export class PlayScene extends Phaser.Scene {
  private sim!: SimState;
  private hud!: HudDom;
  private modal!: EventModal;
  private citizenSprites = new Map<string, CitizenSprite>();
  private heatSprites: Phaser.GameObjects.Image[] = [];
  private buildingLabels: Phaser.GameObjects.Text[] = [];
  private selectedId: string | null = null;
  private snowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private mapOffsetX = 0;
  private mapOffsetY = 0;
  private msgClearAt = 0;
  private genGlow!: Phaser.GameObjects.Arc;

  constructor() {
    super('Play');
  }

  create() {
    ensureHudStyles();
    generateTextures(this);

    this.sim = new SimState();
    const { gridW, gridH, tileSize } = this.sim.config;
    const mapW = gridW * tileSize;
    const mapH = gridH * tileSize;
    this.mapOffsetX = (this.scale.width - mapW) / 2;
    this.mapOffsetY = (this.scale.height - mapH) / 2 + 20;

    // ground
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const px = this.mapOffsetX + x * tileSize;
        const py = this.mapOffsetY + y * tileSize;
        this.add.image(px, py, 'tile_snow').setOrigin(0).setDepth(0);
        // subtle checker
        if ((x + y) % 2 === 0) {
          this.add
            .rectangle(px, py, tileSize, tileSize, 0x9eb4c8, 0.12)
            .setOrigin(0)
            .setDepth(0);
        }
      }
    }

    // heat overlays
    this.heatSprites = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const px = this.mapOffsetX + x * tileSize;
        const py = this.mapOffsetY + y * tileSize;
        const img = this.add
          .image(px, py, 'tile_heat')
          .setOrigin(0)
          .setDepth(1)
          .setAlpha(0);
        this.heatSprites.push(img);
      }
    }

    // buildings
    for (const b of this.sim.buildings) {
      const cx = this.mapOffsetX + (b.x + b.w / 2) * tileSize;
      const cy = this.mapOffsetY + (b.y + b.h / 2) * tileSize;
      let key = 'b_tent';
      if (b.kind === 'generator') key = 'b_generator';
      else if (b.kind === 'gathering') key = 'b_gathering';
      else if (b.kind === 'cookhouse') key = 'b_cookhouse';
      else if (b.kind === 'coal_pile') key = 'b_coal';
      else if (b.kind === 'tree') key = 'b_tree';
      else if (b.kind === 'snow') key = 'b_snow';
      const spr = this.add.image(cx, cy, key).setDepth(5);
      if (b.kind === 'generator') spr.setDepth(8);
      if (b.kind === 'tree' || b.kind === 'snow') spr.setDepth(4);

      if (!['tree', 'snow'].includes(b.kind)) {
        const label = this.add
          .text(cx, cy + tileSize * b.h * 0.45, b.labelAr, {
            fontFamily: 'Segoe UI, Tahoma, Arial',
            fontSize: '11px',
            color: '#d0e4f8',
            backgroundColor: '#0a1828aa',
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5)
          .setDepth(20);
        this.buildingLabels.push(label);
      }
    }

    const gen = this.sim.buildings.find((b) => b.kind === 'generator')!;
    const gx = this.mapOffsetX + (gen.x + gen.w / 2) * tileSize;
    const gy = this.mapOffsetY + (gen.y + gen.h / 2) * tileSize;
    this.genGlow = this.add.circle(gx, gy, 70, 0xff6a20, 0.18).setDepth(2);
    this.tweens.add({
      targets: this.genGlow,
      alpha: 0.32,
      scale: 1.12,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    // citizens
    this.citizenSprites.clear();
    for (const c of this.sim.citizens) {
      const spr = this.add
        .sprite(0, 0, 'citizen_0')
        .setDepth(10)
        .setInteractive({ useHandCursor: true }) as CitizenSprite;
      spr.citizenId = c.id;
      spr.on('pointerdown', () => {
        this.selectedId = c.id;
        Sfx.click();
        c.thoughtCooldown = 0;
      });
      this.citizenSprites.set(c.id, spr);
    }

    // snow particles
    this.snowEmitter = this.add.particles(0, 0, 'snowflake', {
      x: { min: 0, max: this.scale.width },
      y: -10,
      lifespan: 8000,
      speedY: { min: 20, max: 60 },
      speedX: { min: -15, max: 15 },
      scale: { min: 0.4, max: 1.2 },
      alpha: { start: 0.7, end: 0.1 },
      quantity: 2,
      frequency: 120,
    });
    this.snowEmitter.setDepth(30);

    // camera drag
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || p.getDistance() < 2) return;
      // mild pan via scrolling container would be better; skip for MVP stability
    });

    // DOM HUD + modal
    const app = document.getElementById('app') ?? document.body;
    this.hud = new HudDom(app);
    this.modal = new EventModal(app);
    this.hud.onMute = () => {
      toggleMute();
      this.sim.muted = isMuted();
      Sfx.click();
    };
    this.hud.onBoost = () => {
      if (this.sim.tryBoostGenerator()) Sfx.place();
      else Sfx.click();
    };
    this.hud.onLogin = () => {
      Sfx.click();
      this.sim.message = 'تسجيل الدخول قريبًا — اللعب متاح بدون حساب.';
      this.msgClearAt = this.sim.time + 4;
    };
    this.modal.onChoose = (choiceId) => {
      this.sim.chooseEvent(choiceId);
      this.msgClearAt = this.sim.time + 5;
    };

    this.events.on('shutdown', () => this.cleanup());
    this.scale.on('resize', this.onResize, this);

    this.refreshHeat();
    this.syncSprites(0);
  }

  private onResize() {
    // keep playable; full re-layout skipped for MVP
  }

  private cleanup() {
    this.hud?.destroy();
    this.modal?.destroy();
    this.scale.off('resize', this.onResize, this);
  }

  private worldX(gx: number) {
    return this.mapOffsetX + gx * this.sim.config.tileSize;
  }
  private worldY(gy: number) {
    return this.mapOffsetY + gy * this.sim.config.tileSize;
  }

  private refreshHeat() {
    const { gridW, gridH } = this.sim.config;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const heat = this.sim.grid[y][x].heat;
        const img = this.heatSprites[y * gridW + x];
        if (img) img.setAlpha(heat * 0.55);
      }
    }
    this.genGlow.setVisible(this.sim.generatorOn);
    this.genGlow.setAlpha(this.sim.generatorOn ? 0.22 : 0);
  }

  private syncSprites(time: number) {
    const frame = Math.floor(time * 6) % 4;
    for (const c of this.sim.citizens) {
      const spr = this.citizenSprites.get(c.id);
      if (!spr) continue;
      spr.x = this.worldX(c.x);
      spr.y = this.worldY(c.y);
      if (c.cold > 75) spr.setTexture('citizen_cold');
      else if (c.state === 'walking' || c.state === 'working')
        spr.setTexture(`citizen_${frame}`);
      else spr.setTexture('citizen_0');
      spr.setTint(c.id === this.selectedId ? 0xa0e0ff : 0xffffff);
      spr.setAlpha(c.cold >= 100 || c.hunger >= 100 ? 0.25 : 1);
    }
  }

  update(_t: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const hadEvent = !!this.sim.activeEvent;
    this.sim.update(dt);

    if (this.sim.activeEvent && !hadEvent) {
      this.modal.show(this.sim.activeEvent);
      this.refreshHeat();
    }

    // periodic heat refresh
    if (Math.floor(this.sim.time * 2) !== Math.floor((this.sim.time - dt) * 2)) {
      this.refreshHeat();
    }

    this.syncSprites(this.sim.time);

    if (this.msgClearAt && this.sim.time > this.msgClearAt) {
      this.sim.message = null;
      this.msgClearAt = 0;
    }

    const snap = this.sim.snapshot();
    let thought: string | null = null;
    let thoughtName: string | null = null;
    if (this.selectedId) {
      const c = this.sim.citizens.find((x) => x.id === this.selectedId);
      if (c) {
        thought = c.currentThought;
        thoughtName = c.nameAr;
      }
    }

    this.hud.update({
      coal: snap.resources.coal,
      wood: snap.resources.wood,
      food: snap.resources.food,
      hope: snap.resources.hope,
      discontent: snap.resources.discontent,
      dayIndex: snap.dayIndex,
      isNight: snap.isNight,
      ambientTemp: snap.ambientTemp,
      progress: snap.progress,
      citizensAlive: snap.citizensAlive,
      citizensFreezing: snap.citizensFreezing,
      generatorOn: snap.generatorOn,
      generatorLevel: snap.generatorLevel,
      message: snap.message,
      muted: isMuted(),
      thought,
      thoughtName,
    });

    // night dim
    const nightAlpha = snap.isNight || snap.coldSnapActive ? 0.25 : 0.05;
    if (!(this as unknown as { _night?: Phaser.GameObjects.Rectangle })._night) {
      (this as unknown as { _night: Phaser.GameObjects.Rectangle })._night = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x041018, nightAlpha)
        .setOrigin(0)
        .setDepth(25)
        .setScrollFactor(0);
    } else {
      (this as unknown as { _night: Phaser.GameObjects.Rectangle })._night.setAlpha(
        nightAlpha,
      );
    }

    if (snap.coldSnapActive && this.snowEmitter) {
      this.snowEmitter.frequency = 40;
    } else if (this.snowEmitter) {
      this.snowEmitter.frequency = 120;
    }

    if (snap.ended) {
      this.cleanup();
      this.scene.start('End', {
        reason: snap.endReason,
        message: snap.message ?? '',
        hope: snap.resources.hope,
        discontent: snap.resources.discontent,
      });
    }
  }
}
