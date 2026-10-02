import Phaser from 'phaser';

/** Preload Kenney + generated assets, then go to Menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 280, 16, 0x1a3050);
    const bar = this.add.rectangle(width / 2 - 138, height / 2, 4, 12, 0x7ec8ff).setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 36, '…جاري إشعال المولّد…', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '16px',
        color: '#c5d8ea',
      })
      .setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 4 + 272 * v;
    });

    // Generated buildings / tiles / particles
    const gen = [
      'tile_snow_0', 'tile_snow_1', 'tile_snow_2', 'tile_snow_3', 'tile_snow_4', 'tile_snow_5',
      'tile_heat', 'tile_ice',
      'b_generator', 'b_tent', 'b_gathering', 'b_cookhouse', 'b_coal', 'b_thumper',
      'b_workshop', 'b_medical', 'b_tree', 'b_snow',
      'snowflake', 'ember',
      'state_work', 'state_eat', 'state_sleep', 'state_freeze',
      'ui_panel', 'ui_btn', 'ui_btn_hot',
    ];
    for (const k of gen) this.load.image(k, `assets/gen/${k}.png`);

    // Ice-world decor (CC0 Kenney)
    const decor = [
      'tree.png', 'deadTree.png', 'igloo.png', 'iglooAlt.png',
      'rock.png', 'rockAlt.png', 'snowHillLow.png', 'tundraCenter.png',
      'snowBallBig.png', 'snowWave.png',
    ];
    for (const f of decor) {
      this.load.image(`decor_${f.replace('.png', '')}`, `assets/decor/${f}`);
    }

    // Citizen walk sheets: 4 cols × 4 rows, frame 32×40 (scaled 2× from 16×20)
    for (let i = 0; i < 4; i++) {
      this.load.spritesheet(`citizen_walk_${i}`, `assets/citizens/walk_${i}.png`, {
        frameWidth: 40,
        frameHeight: 52,
      });
    }

    // Audio (Kenney Interface Sounds CC0 + procedural ambient)
    const sfx = [
      'click_001', 'click_002', 'confirmation_001', 'drop_001', 'drop_002',
      'error_001', 'open_001', 'select_001', 'switch_001', 'bong_001',
      'question_001', 'maximize_001', 'click-a', 'tap-a',
    ];
    for (const s of sfx) this.load.audio(s, `assets/audio/${s}.ogg`);
    this.load.audio('wind_loop', 'assets/audio/wind_loop.ogg');
    this.load.audio('generator_hum', 'assets/audio/generator_hum.ogg');
    this.load.audio('storm_wind', 'assets/audio/storm_wind.ogg');
  }

  create() {
    // Animations: row 0 down, 1 left, 2 right, 3 up — 4 frames each
    for (let v = 0; v < 4; v++) {
      const key = `citizen_walk_${v}`;
      const dirs = ['down', 'left', 'right', 'up'] as const;
      dirs.forEach((dir, di) => {
        this.anims.create({
          key: `walk_${v}_${dir}`,
          frames: this.anims.generateFrameNumbers(key, {
            start: di * 4,
            end: di * 4 + 3,
          }),
          frameRate: 8,
          repeat: -1,
        });
        this.anims.create({
          key: `idle_${v}_${dir}`,
          frames: [{ key, frame: di * 4 }],
          frameRate: 1,
        });
      });
    }

    const splash = document.getElementById('boot-splash');
    if (splash) splash.classList.add('hidden');
    this.scene.start('Menu');
  }
}
