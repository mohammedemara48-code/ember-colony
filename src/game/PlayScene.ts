import Phaser from 'phaser';
import {
  isMuted,
  Sfx,
  toggleMute,
  startAmbience,
  stopAmbience,
  setStormAmbience,
  setGeneratorHum,
} from '../audio/Sfx';
import { BUILD_RECIPES } from '../sim/config';
import { SimState } from '../sim/SimState';
import type { Building, BuildingKind } from '../sim/types';
import { ensureHudStyles, HudDom } from '../ui/HudDom';
import { EventModal } from './EventModal';
import { ensureFallbackTextures } from './textures';

type CitizenSprite = Phaser.GameObjects.Sprite & { citizenId?: string };

const KIND_TEX: Record<string, string> = {
  generator: 'b_generator',
  tent: 'b_tent',
  gathering: 'b_gathering',
  cookhouse: 'b_cookhouse',
  coal_pile: 'b_coal',
  thumper: 'b_thumper',
  workshop: 'b_workshop',
  medical: 'b_medical',
  tree: 'b_tree',
  snow: 'b_snow',
};

export class PlayScene extends Phaser.Scene {
  private sim!: SimState;
  private hud!: HudDom;
  private modal!: EventModal;
  private mapRoot!: Phaser.GameObjects.Container;
  private citizenSprites = new Map<string, CitizenSprite>();
  private stateIcons = new Map<string, Phaser.GameObjects.Image>();
  private buildingSprites = new Map<string, Phaser.GameObjects.Image>();
  private heatSprites: Phaser.GameObjects.Image[] = [];
  private heatVisible = true;
  private selectedId: string | null = null;
  private snowEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private emberEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private mapOffsetX = 0;
  private mapOffsetY = 0;
  private msgClearAt = 0;
  private genGlow!: Phaser.GameObjects.Arc;
  private nightVeil!: Phaser.GameObjects.Rectangle;
  private heatRing!: Phaser.GameObjects.Graphics;
  private buildMode: BuildingKind | null = null;
  private ghost!: Phaser.GameObjects.Image;
  private lastStorm = false;
  private lastGenOn = true;

  constructor() {
    super('Play');
  }

  create() {
    ensureHudStyles();
    ensureFallbackTextures(this);
    startAmbience(this);

    this.sim = new SimState();
    const { gridW, gridH, tileSize } = this.sim.config;
    const mapW = gridW * tileSize;
    const mapH = gridH * tileSize;
    this.mapOffsetX = Math.max(40, (this.scale.width - mapW) / 2);
    this.mapOffsetY = Math.max(60, (this.scale.height - mapH) / 2 + 10);

    this.cameras.main.setBackgroundColor('#0a1624');
    this.mapRoot = this.add.container(0, 0);

    // Ground tiles with variation
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const px = this.mapOffsetX + x * tileSize;
        const py = this.mapOffsetY + y * tileSize;
        const key = `tile_snow_${(x * 3 + y * 7) % 6}`;
        const tile = this.add.image(px, py, key).setOrigin(0).setDisplaySize(tileSize, tileSize);
        this.mapRoot.add(tile);
        if ((x + y) % 5 === 0) {
          const ice = this.add
            .image(px, py, 'tile_ice')
            .setOrigin(0)
            .setDisplaySize(tileSize, tileSize)
            .setAlpha(0.22);
          this.mapRoot.add(ice);
        }
      }
    }

    // Heat overlays
    this.heatSprites = [];
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const px = this.mapOffsetX + x * tileSize;
        const py = this.mapOffsetY + y * tileSize;
        const img = this.add
          .image(px, py, 'tile_heat')
          .setOrigin(0)
          .setDisplaySize(tileSize, tileSize)
          .setAlpha(0)
          .setDepth(1);
        this.heatSprites.push(img);
      }
    }

    this.heatRing = this.add.graphics().setDepth(2);

    // Buildings
    for (const b of this.sim.buildings) this.spawnBuildingSprite(b);

    // Extra Kenney decor sprinkled
    this.scatterDecor();

    const gen = this.sim.buildings.find((b) => b.kind === 'generator')!;
    const gx = this.worldX(gen.x + gen.w / 2);
    const gy = this.worldY(gen.y + gen.h / 2);
    this.genGlow = this.add.circle(gx, gy, 90, 0xff6a20, 0.2).setDepth(2);
    this.tweens.add({
      targets: this.genGlow,
      alpha: 0.38,
      scale: 1.15,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    this.emberEmitter = this.add.particles(gx, gy - 20, 'ember', {
      lifespan: 1400,
      speed: { min: 10, max: 40 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      frequency: 80,
      blendMode: 'ADD',
    });
    this.emberEmitter.setDepth(9);

    // Citizens
    this.citizenSprites.clear();
    for (const c of this.sim.citizens) {
      const spr = this.add
        .sprite(0, 0, `citizen_walk_${c.variant}`, 0)
        .setDepth(10)
        .setInteractive({ useHandCursor: true }) as CitizenSprite;
      spr.citizenId = c.id;
      spr.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.buildMode) return;
        p.event.stopPropagation();
        this.selectedId = c.id;
        Sfx.select();
        c.thoughtCooldown = 0;
      });
      this.citizenSprites.set(c.id, spr);
      const icon = this.add.image(0, 0, 'state_work').setDepth(12).setScale(0.7).setVisible(false);
      this.stateIcons.set(c.id, icon);
    }

    // Snow weather
    this.snowEmitter = this.add.particles(0, 0, 'snowflake', {
      x: { min: 0, max: this.scale.width },
      y: -12,
      lifespan: 9000,
      speedY: { min: 24, max: 70 },
      speedX: { min: -20, max: 20 },
      scale: { min: 0.35, max: 1.1 },
      alpha: { start: 0.75, end: 0.05 },
      quantity: 2,
      frequency: 90,
    });
    this.snowEmitter.setDepth(40).setScrollFactor(0);

    this.nightVeil = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x030a12, 0.08)
      .setOrigin(0)
      .setDepth(25)
      .setScrollFactor(0);

    // Build ghost
    this.ghost = this.add
      .image(0, 0, 'b_tent')
      .setAlpha(0.55)
      .setDepth(50)
      .setVisible(false);

    // Pointer for build place
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.buildMode) return;
      const recipe = BUILD_RECIPES.find((r) => r.kind === this.buildMode)!;
      const gx = Math.floor((p.worldX - this.mapOffsetX) / this.sim.config.tileSize);
      const gy = Math.floor((p.worldY - this.mapOffsetY) / this.sim.config.tileSize);
      this.ghost
        .setTexture(recipe.tex)
        .setVisible(true)
        .setPosition(
          this.worldX(gx + recipe.w / 2),
          this.worldY(gy + recipe.h / 2),
        );
      this.ghost.setTint(0xffffff);
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) {
        this.setBuildMode(null);
        return;
      }
      if (!this.buildMode || p.y < 56) return;
      const recipe = BUILD_RECIPES.find((r) => r.kind === this.buildMode)!;
      const gx = Math.floor((p.worldX - this.mapOffsetX) / this.sim.config.tileSize);
      const gy = Math.floor((p.worldY - this.mapOffsetY) / this.sim.config.tileSize);
      const before = this.sim.buildings.length;
      if (this.sim.tryPlaceBuilding(this.buildMode, gx, gy)) {
        Sfx.build();
        const nb = this.sim.buildings[this.sim.buildings.length - 1]!;
        if (this.sim.buildings.length > before) this.spawnBuildingSprite(nb);
        this.msgClearAt = this.sim.time + 3;
        this.refreshHeat();
      } else {
        Sfx.lose();
        this.sim.message = 'لا يمكن البناء هنا أو الموارد غير كافية.';
        this.msgClearAt = this.sim.time + 2.5;
      }
      void recipe;
    });

    const app = document.getElementById('app') ?? document.body;
    this.hud = new HudDom(app);
    this.modal = new EventModal(app);
    this.hud.onMute = () => {
      toggleMute();
      this.sim.muted = isMuted();
      Sfx.click();
    };
    this.hud.onBoost = () => {
      if (this.sim.tryBoostGenerator()) {
        Sfx.place();
        this.refreshHeat();
      } else Sfx.click();
      this.msgClearAt = this.sim.time + 3;
    };
    this.hud.onLogin = () => {
      Sfx.click();
      this.sim.message = 'تسجيل الدخول قريبًا — اللعب متاح كضيف دون حساب.';
      this.msgClearAt = this.sim.time + 4;
    };
    this.hud.onToggleHeat = () => {
      this.heatVisible = !this.heatVisible;
      Sfx.switch();
      this.refreshHeat();
    };
    this.hud.onSelectBuild = (kind) => {
      this.setBuildMode(kind);
      Sfx.open();
    };
    this.hud.onEnactLaw = (id) => {
      if (this.sim.enactLaw(id)) Sfx.event();
      else Sfx.click();
      this.msgClearAt = this.sim.time + 3;
    };
    this.modal.onChoose = (choiceId) => {
      this.sim.chooseEvent(choiceId);
      this.msgClearAt = this.sim.time + 5;
      this.refreshHeat();
      Sfx.event();
    };

    this.events.on('shutdown', () => this.cleanup());
    this.refreshHeat();
    this.syncSprites(0);
  }

  private setBuildMode(kind: BuildingKind | null) {
    this.buildMode = kind;
    this.ghost.setVisible(!!kind);
    if (kind) {
      const r = BUILD_RECIPES.find((x) => x.kind === kind)!;
      this.ghost.setTexture(r.tex);
    }
  }

  private scatterDecor() {
    const keys = [
      'decor_tree',
      'decor_deadTree',
      'decor_rock',
      'decor_rockAlt',
      'decor_snowHillLow',
      'decor_snowBallBig',
      'decor_igloo',
    ];
    const { gridW, gridH, tileSize } = this.sim.config;
    let n = 0;
    for (let i = 0; i < 40 && n < 14; i++) {
      const x = 1 + Math.floor(Math.random() * (gridW - 2));
      const y = 1 + Math.floor(Math.random() * (gridH - 2));
      if (this.sim.grid[y][x].buildingId) continue;
      if (Math.hypot(x - gridW / 2, y - gridH / 2) < 5) continue;
      const key = keys[n % keys.length]!;
      if (!this.textures.exists(key)) continue;
      const img = this.add
        .image(this.worldX(x + 0.5), this.worldY(y + 0.5), key)
        .setDepth(3)
        .setScale(tileSize / 70);
      this.mapRoot.add(img);
      n++;
    }
  }

  private spawnBuildingSprite(b: Building) {
    const tex = KIND_TEX[b.kind] ?? 'b_tent';
    const cx = this.worldX(b.x + b.w / 2);
    const cy = this.worldY(b.y + b.h / 2);
    const spr = this.add.image(cx, cy, tex).setDepth(b.kind === 'generator' ? 8 : 5);
    // Fit roughly to footprint
    const maxW = b.w * this.sim.config.tileSize * 1.05;
    const maxH = b.h * this.sim.config.tileSize * 1.15;
    const scale = Math.min(maxW / spr.width, maxH / spr.height);
    spr.setScale(scale);
    this.buildingSprites.set(b.id, spr);

    if (!['tree', 'snow'].includes(b.kind)) {
      this.add
        .text(cx, cy + this.sim.config.tileSize * b.h * 0.42, b.labelAr, {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '11px',
          color: '#d8ecff',
          backgroundColor: '#0a1828cc',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(20);
    }
  }

  private cleanup() {
    stopAmbience();
    this.hud?.destroy();
    this.modal?.destroy();
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
        if (img) img.setAlpha(this.heatVisible ? heat * 0.5 : 0);
      }
    }
    this.genGlow.setVisible(this.sim.generatorOn);
    this.emberEmitter.setVisible(this.sim.generatorOn);

    // Heat radius ring
    this.heatRing.clear();
    if (this.heatVisible && this.sim.generatorOn) {
      const gen = this.sim.buildings.find((b) => b.kind === 'generator');
      if (gen) {
        const snap = this.sim.snapshot();
        const r = snap.heatRadius * this.sim.config.tileSize;
        const cx = this.worldX(gen.x + gen.w / 2);
        const cy = this.worldY(gen.y + gen.h / 2);
        this.heatRing.lineStyle(2, 0xff8a3a, 0.35);
        this.heatRing.strokeCircle(cx, cy, r);
        this.heatRing.lineStyle(1, 0xffc080, 0.15);
        this.heatRing.strokeCircle(cx, cy, r * 0.65);
      }
    }
  }

  private syncSprites(_time: number) {
    const dirName = ['down', 'left', 'right', 'up'] as const;
    for (const c of this.sim.citizens) {
      const spr = this.citizenSprites.get(c.id);
      const icon = this.stateIcons.get(c.id);
      if (!spr) continue;
      spr.x = this.worldX(c.x);
      spr.y = this.worldY(c.y);
      const dir = dirName[c.facing] ?? 'down';
      const moving = c.state === 'walking';
      const anim = moving ? `walk_${c.variant}_${dir}` : `idle_${c.variant}_${dir}`;
      if (spr.anims.currentAnim?.key !== anim) {
        if (this.anims.exists(anim)) spr.play(anim, true);
      }
      if (c.cold > 75) spr.setTint(0xa8d8ff);
      else if (c.id === this.selectedId) spr.setTint(0xa0e0ff);
      else spr.clearTint();
      spr.setAlpha(c.cold >= 100 || c.hunger >= 100 || c.health <= 0 ? 0.2 : 1);

      if (icon) {
        let key: string | null = null;
        if (c.state === 'working') key = 'state_work';
        else if (c.state === 'eating') key = 'state_eat';
        else if (c.state === 'sleeping') key = 'state_sleep';
        else if (c.state === 'freezing' || c.cold > 80) key = 'state_freeze';
        if (key) {
          icon.setTexture(key).setVisible(true).setPosition(spr.x, spr.y - 22);
        } else icon.setVisible(false);
      }
    }
  }

  update(_t: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const hadEvent = !!this.sim.activeEvent;
    this.sim.update(dt);

    if (this.sim.activeEvent && !hadEvent) {
      this.modal.show(this.sim.activeEvent);
      Sfx.event();
      this.refreshHeat();
    }

    if (Math.floor(this.sim.time * 2) !== Math.floor((this.sim.time - dt) * 2)) {
      this.refreshHeat();
    }

    this.syncSprites(this.sim.time);

    if (this.msgClearAt && this.sim.time > this.msgClearAt) {
      this.sim.message = null;
      this.msgClearAt = 0;
    }

    const snap = this.sim.snapshot();

    if (snap.stormActive !== this.lastStorm) {
      this.lastStorm = snap.stormActive;
      setStormAmbience(snap.stormActive);
      if (snap.stormActive) Sfx.cold();
    }
    if (snap.generatorOn !== this.lastGenOn) {
      this.lastGenOn = snap.generatorOn;
      setGeneratorHum(snap.generatorOn);
    }

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
      steel: snap.resources.steel,
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
      laws: snap.laws,
      stormActive: snap.stormActive,
      buildMode: this.buildMode,
      showHeat: this.heatVisible,
    });

    // Day/night lighting tint
    let nightAlpha = 0.06;
    if (snap.isNight) nightAlpha = 0.28;
    if (snap.coldSnapActive) nightAlpha = 0.34;
    if (snap.stormActive) nightAlpha = 0.45;
    this.nightVeil.setFillStyle(snap.stormActive ? 0x081018 : 0x041018, nightAlpha);
    this.nightVeil.setSize(this.scale.width, this.scale.height);

    this.snowEmitter.frequency = snap.stormActive ? 28 : snap.coldSnapActive ? 50 : 90;
    this.snowEmitter.quantity = snap.stormActive ? 4 : 2;

    if (snap.ended) {
      if (snap.endReason === 'survived') Sfx.win();
      else Sfx.lose();
      this.cleanup();
      this.scene.start('End', {
        reason: snap.endReason,
        message: snap.message ?? '',
        hope: snap.resources.hope,
        discontent: snap.resources.discontent,
        dayIndex: snap.dayIndex,
        alive: snap.citizensAlive,
      });
    }
  }
}
