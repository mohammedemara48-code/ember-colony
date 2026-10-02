import Phaser from 'phaser';
import { Sfx, bindAudioScene } from '../audio/Sfx';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    bindAudioScene(this);
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a2840, 0x152238, 0x070f1a, 0x050a12, 1);
    bg.fillRect(0, 0, width, height);

    // Soft aurora / cold sky wash
    const aurora = this.add.graphics();
    aurora.fillStyle(0x2a5080, 0.18);
    aurora.fillEllipse(width * 0.3, height * 0.15, width * 0.7, height * 0.35);
    aurora.fillStyle(0xc4a35a, 0.06);
    aurora.fillEllipse(width * 0.7, height * 0.25, width * 0.5, height * 0.3);

    if (this.textures.exists('snowflake')) {
      // Far parallax snow
      this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 12000,
        speedY: { min: 12, max: 28 },
        speedX: { min: -8, max: 8 },
        scale: { min: 0.25, max: 0.55 },
        alpha: { start: 0.35, end: 0.02 },
        frequency: 140,
        quantity: 1,
      });
      // Near snow
      this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 7000,
        speedY: { min: 40, max: 90 },
        speedX: { min: -25, max: 25 },
        scale: { min: 0.6, max: 1.4 },
        alpha: { start: 0.85, end: 0.05 },
        frequency: 70,
        quantity: 2,
      });
    }

    if (this.textures.exists('b_generator')) {
      this.add.image(width / 2, height * 0.4, 'b_generator').setScale(0.95).setAlpha(0.98);
    }
    const glow = this.add.circle(width / 2, height * 0.42, 130, 0xff6a20, 0.22);
    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      scale: 1.25,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });
    const glow2 = this.add.circle(width / 2, height * 0.42, 200, 0xffa028, 0.08);
    this.tweens.add({
      targets: glow2,
      alpha: 0.16,
      scale: 1.1,
      duration: 2400,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.1, 'نجاة في الصقيع', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: Math.min(52, width / 10) + 'px',
        color: '#f2e6d0',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#c4a35a', 22, true, true);

    this.add
      .text(width / 2, height * 0.18, 'Ember Colony  ·  HD Colony Survival', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '15px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.58,
        'المولّد آخر دفءٍ في العالم.\nابنِ المدينة، مرّر القوانين، واصمد حتى الفجر.\nسيناريو موسّع: «الليلة الأولى» (~١٣ يومًا)',
        {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '15px',
          color: '#d5e0ec',
          align: 'center',
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, height * 0.74, '▶  بدء الوردية (ضيف)', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '22px',
        color: '#1a1208',
        backgroundColor: '#e8b84a',
        padding: { x: 32, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#f0d080' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#e8b84a' }));
    btn.on('pointerdown', () => {
      Sfx.start();
      this.scene.start('Play');
    });

    this.add
      .text(width / 2, height * 0.86, 'تسجيل الدخول قريبًا · لعب فردي كضيف الآن', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '12px',
        color: '#7a8a9a',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.93, 'PWA · HD 2D · Phaser 3', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '11px',
        color: '#4a5560',
      })
      .setOrigin(0.5);

    // Vignette
    const vig = this.add.graphics().setDepth(100);
    vig.fillStyle(0x000000, 0.35);
    vig.fillRect(0, 0, width, height * 0.08);
    vig.fillRect(0, height * 0.92, width, height * 0.08);
  }
}
