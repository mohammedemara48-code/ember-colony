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

type CitizenSprite = Phaser.GameObjects.Sprite & {
  citizenId?: string;
  dispX?: number;
  dispY?: number;
};

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
  private snowFar!: Phaser.GameObjects.Particles.ParticleEmitter;
  private snowNear!: Phaser.GameObjects.Particles.ParticleEmitter;
  private emberEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private mapOffsetX = 0;
  private mapOffsetY = 0;
  private msgClearAt = 0;
  private genGlow!: Phaser.GameObjects.Arc;
  private genGlowOuter!: Phaser.GameObjects.Arc;
  private nightVeil!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Graphics;
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
    this.mapOffsetX = Math.max(24, (this.scale.width - mapW) / 2);
    this.mapOffsetY = Math.max(72, (this.scale.height - mapH) / 2 + 8);

    const fit = Math.min(1, (this.scale.width - 20) / mapW, (this.scale.height - 100) / mapH);
    if (fit < 0.98) {
      this.cameras.main.setZoom(Math.max(0.55, fit));
    }

    this.cameras.main.setBackgroundColor('#070f1a');
    this.mapRoot = this.add.container(0, 0);

    const ground = this.add.graphics();
    ground.fillStyle(0x1a2838, 1);
    ground.fillRect(this.mapOffsetX - 24, this.mapOffsetY - 24, mapW + 48, mapH + 48);
    ground.fillStyle(0x0c1622, 0.5);
    ground.fillRect(this.mapOffsetX - 8, this.mapOffsetY - 8, mapW + 16, mapH + 16);
    this.mapRoot.add(ground);

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
            .setAlpha(0.2);
          this.mapRoot.add(ice);
        }
      }
    }

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
          .setDepth(1)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.heatSprites.push(img);
      }
    }

    this.heatRing = this.add.graphics().setDepth(2);

    for (const b of this.sim.buildings) this.spawnBuildingSprite(b);
    this.scatterDecor();

    const gen = this.sim.buildings.find((b) => b.kind === 'generator')!;
    const gx = this.worldX(gen.x + gen.w / 2);
    const gy = this.worldY(gen.y + gen.h / 2);
    this.genGlowOuter = this.add.circle(gx, gy, 160, 0xff8a30, 0.1).setDepth(2);
    this.genGlow = this.add.circle(gx, gy, 110, 0xff6a20, 0.22).setDepth(2);
    this.tweens.add({
      targets: this.genGlow,
      alpha: 0.42,
      scale: 1.18,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: this.genGlowOuter,
      alpha: 0.2,
      scale: 1.12,
      duration: 2200,
      yoyo: true,
      repeat: -1,
    });

    this.emberEmitter = this.add.particles(gx, gy - 36, 'ember', {
      lifespan: 1600,
      speed: { min: 14, max: 48 },
      angle: { min: 240, max: 300 },
      scale: { start: 1.2, end: 0.15 },
      alpha: { start: 0.95, end: 0 },
      frequency: 60,
      blendMode: 'ADD',
    });
    this.emberEmitter.setDepth(9);

    this.citizenSprites.clear();
    for (const c of this.sim.citizens) {
      const spr = this.add
        .sprite(0, 0, `citizen_walk_${c.variant}`, 0)
        .setDepth(10)
        .setScale(0.95)
        .setInteractive({ useHandCursor: true }) as CitizenSprite;
      spr.citizenId = c.id;
      spr.dispX = this.worldX(c.x);
      spr.dispY = this.worldY(c.y);
      spr.setPosition(spr.dispX, spr.dispY);
      spr.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (this.buildMode) return;
        p.event.stopPropagation();
        this.selectedId = c.id;
        Sfx.select();
        c.thoughtCooldown = 0;
      });
      this.citizenSprites.set(c.id, spr);
      const icon = this.add.image(0, 0, 'state_work').setDepth(12).setScale(0.85).setVisible(false);
      this.stateIcons.set(c.id, icon);
    }

    this.snowFar = this.add.particles(0, 0, 'snowflake', {
      x: { min: 0, max: this.scale.width },
      y: -16,
      lifespan: 14000,
      speedY: { min: 16, max: 36 },
      speedX: { min: -12, max: 12 },
      scale: { min: 0.3, max: 0.65 },
      alpha: { start: 0.4, end: 0.04 },
      quantity: 1,
      frequency: 110,
    });
    this.snowFar.setDepth(35).setScrollFactor(0);

    this.snowNear = this.add.particles(0, 0, 'snowflake', {
      x: { min: 0, max: this.scale.width },
      y: -16,
      lifespan: 7500,
      speedY: { min: 45, max: 110 },
      speedX: { min: -35, max: 35 },
      scale: { min: 0.7, max: 1.6 },
      alpha: { start: 0.85, end: 0.05 },
      quantity: 2,
      frequency: 70,
    });
    this.snowNear.setDepth(45).setScrollFactor(0);

    this.nightVeil = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x030a12, 0.08)
      .setOrigin(0)
      .setDepth(25)
      .setScrollFactor(0);

    this.vignette = this.add.graphics().setDepth(48).setScrollFactor(0);
    this.drawVignette();

    this.ghost = this.add.image(0, 0, 'b_tent').setAlpha(0.55).setDepth(50).setVisible(false);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.buildMode) return;
      const recipe = BUILD_RECIPES.find((r) => r.kind === this.buildMode)!;
      const gx = Math.floor((p.worldX - this.mapOffsetX) / this.sim.config.tileSize);
      const gy = Math.floor((p.worldY - this.mapOffsetY) / this.sim.config.tileSize);
      this.ghost
        .setTexture(recipe.tex)
        .setVisible(true)
        .setPosition(this.worldX(gx + recipe.w / 2), this.worldY(gy + recipe.h / 2));
      this.ghost.setTint(0xffffff);
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) {
        this.setBuildMode(null);
        return;
      }
      if (!this.buildMode || p.y < 64) return;
      const before = this.sim.buildings.length;
      const gx = Math.floor((p.worldX - this.mapOffsetX) / this.sim.config.tileSize);
      const gy = Math.floor((p.worldY - this.mapOffsetY) / this.sim.config.tileSize);
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
    this.syncSprites(0, 1);
  }

  private drawVignette() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, 0.45);
    this.vignette.fillRect(0, 0, w, 28);
    this.vignette.fillRect(0, h - 36, w, 36);
    this.vignette.fillStyle(0x000000, 0.25);
    this.vignette.fillRect(0, 0, 40, h);
    this.vignette.fillRect(w - 40, 0, 40, h);
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
      'decor_tree','decor_deadTree','decor_rock','decor_rockAlt',
      'decor_snowHillLow','decor_snowHill','decor_snowBallBig','decor_igloo','decor_iceBlock',
    ];
    const { gridW, gridH, tileSize } = this.sim.config;
    let n = 0;
    for (let i = 0; i < 55 && n < 22; i++) {
      const x = 1 + Math.floor(Math.random() * (gridW - 2));
      const y = 1 + Math.floor(Math.random() * (gridH - 2));
      if (this.sim.grid[y][x].buildingId) continue;
      if (Math.hypot(x - gridW / 2, y - gridH / 2) < 5) continue;
      const key = keys[n % keys.length]!;
      if (!this.textures.exists(key)) continue;
      const img = this.add
        .image(this.worldX(x + 0.5), this.worldY(y + 0.5), key)
        .setDepth(3)
        .setScale((tileSize / 70) * 1.35)
        .setAlpha(0.92);
      this.mapRoot.add(img);
      n++;
    }
  }

  private spawnBuildingSprite(b: Building) {
    const tex = KIND_TEX[b.kind] ?? 'b_tent';
    const cx = this.worldX(b.x + b.w / 2);
    const cy = this.worldY(b.y + b.h / 2);
    const spr = this.add.image(cx, cy, tex).setDepth(b.kind === 'generator' ? 8 : 5);
    const maxW = b.w * this.sim.config.tileSize * (b.kind === 'generator' ? 1.15 : 1.08);
    const maxH = b.h * this.sim.config.tileSize * (b.kind === 'generator' ? 1.35 : 1.2);
    const scale = Math.min(maxW / spr.width, maxH / spr.height);
    spr.setScale(scale);
    this.buildingSprites.set(b.id, spr);

    if (!['tree', 'snow'].includes(b.kind)) {
      this.add
        .text(cx, cy + this.sim.config.tileSize * b.h * 0.42, b.labelAr, {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '12px',
          color: '#f0e6d4',
          backgroundColor: '#0a1420cc',
          padding: { x: 6, y: 3 },
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
        if (img) img.setAlpha(this.heatVisible ? heat * 0.55 : 0);
      }
    }
    this.genGlow.setVisible(this.sim.generatorOn);
    this.genGlowOuter.setVisible(this.sim.generatorOn);
    this.emberEmitter.setVisible(this.sim.generatorOn);

    this.heatRing.clear();
    if (this.heatVisible && this.sim.generatorOn) {
      const gen = this.sim.buildings.find((b) => b.kind === 'generator');
      if (gen) {
        const snap = this.sim.snapshot();
        const r = snap.heatRadius * this.sim.config.tileSize;
        const cx = this.worldX(gen.x + gen.w / 2);
        const cy = this.worldY(gen.y + gen.h / 2);
        this.heatRing.lineStyle(3, 0xff8a3a, 0.4);
        this.heatRing.strokeCircle(cx, cy, r);
        this.heatRing.lineStyle(1.5, 0xffc080, 0.2);
        this.heatRing.strokeCircle(cx, cy, r * 0.65);
      }
    }
  }

  private syncSprites(_time: number, lerpT: number) {
    const dirName = ['down', 'left', 'right', 'up'] as const;
    const t = Math.min(1, Math.max(0.08, lerpT));
    for (const c of this.sim.citizens) {
      const spr = this.citizenSprites.get(c.id);
      const icon = this.stateIcons.get(c.id);
      if (!spr) continue;
      const tx = this.worldX(c.x);
      const ty = this.worldY(c.y);
      spr.dispX = (spr.dispX ?? tx) + (tx - (spr.dispX ?? tx)) * t;
      spr.dispY = (spr.dispY ?? ty) + (ty - (spr.dispY ?? ty)) * t;
      spr.x = spr.dispX;
      spr.y = spr.dispY;
      const dir = dirName[c.facing] ?? 'down';
      const moving = c.state === 'walking';
      const anim = moving ? `walk_${c.variant}_${dir}` : `idle_${c.variant}_${dir}`;
      if (spr.anims.currentAnim?.key !== anim) {
        if (this.anims.exists(anim)) spr.play(anim, true);
      }
      if (c.cold > 75) spr.setTint(0xa8d8ff);
      else if (c.id === this.selectedId) spr.setTint(0xffe0a0);
      else spr.clearTint();
      spr.setAlpha(c.cold >= 100 || c.hunger >= 100 || c.health <= 0 ? 0.2 : 1);

      if (icon) {
        let key: string | null = null;
        if (c.state === 'working') key = 'state_work';
        else if (c.state === 'eating') key = 'state_eat';
        else if (c.state === 'sleeping') key = 'state_sleep';
        else if (c.state === 'freezing' || c.cold > 80) key = 'state_freeze';
        if (key) {
          icon.setTexture(key).setVisible(true).setPosition(spr.x, spr.y - 36);
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

    this.syncSprites(this.sim.time, 1 - Math.pow(0.001, dt));

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

    let nightAlpha = 0.06;
    if (snap.isNight) nightAlpha = 0.3;
    if (snap.coldSnapActive) nightAlpha = 0.36;
    if (snap.stormActive) nightAlpha = 0.48;
    this.nightVeil.setFillStyle(snap.stormActive ? 0x081018 : 0x041018, nightAlpha);
    this.nightVeil.setSize(this.scale.width, this.scale.height);
    this.drawVignette();

    this.snowFar.frequency = snap.stormActive ? 50 : 110;
    this.snowNear.frequency = snap.stormActive ? 22 : snap.coldSnapActive ? 45 : 70;
    this.snowNear.quantity = snap.stormActive ? 4 : 2;

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
