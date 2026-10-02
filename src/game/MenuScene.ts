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
    bg.fillGradientStyle(0x1a3350, 0x1a3350, 0x0b1a2a, 0x071018, 1);
    bg.fillRect(0, 0, width, height);

    if (this.textures.exists('snowflake')) {
      this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 8000,
        speedY: { min: 20, max: 55 },
        speedX: { min: -15, max: 15 },
        scale: { min: 0.4, max: 1 },
        alpha: { start: 0.7, end: 0.05 },
        frequency: 100,
        quantity: 2,
      });
    } else {
      for (let i = 0; i < 50; i++) {
        const s = this.add.circle(
          Math.random() * width,
          Math.random() * height,
          1 + Math.random() * 2,
          0xffffff,
          0.4,
        );
        this.tweens.add({
          targets: s,
          y: height + 20,
          duration: 7000 + Math.random() * 6000,
          repeat: -1,
          onRepeat: () => {
            s.y = -10;
            s.x = Math.random() * width;
          },
        });
      }
    }

    if (this.textures.exists('b_generator')) {
      this.add.image(width / 2, height * 0.42, 'b_generator').setScale(0.85).setAlpha(0.95);
    }
    const glow = this.add.circle(width / 2, height * 0.42, 90, 0xff6a20, 0.18);
    this.tweens.add({
      targets: glow,
      alpha: 0.32,
      scale: 1.2,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.14, 'نجاة في الصقيع', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: Math.min(48, width / 11) + 'px',
        color: '#e8f4ff',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#4a90d9', 18, true, true);

    this.add
      .text(width / 2, height * 0.22, 'Ember Colony', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '15px',
        color: '#8ab0d0',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.58,
        'المولّد آخر دفءٍ في العالم.\nابنِ الخيام والورش، عيّن العمل، ومرّر قوانين تدوم.\nسيناريو موسّع: «الليلة الأولى» (~١٣ يومًا)',
        {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '14px',
          color: '#c5d8ea',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, height * 0.74, '▶  بدء الوردية (ضيف)', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '22px',
        color: '#0b1a2a',
        backgroundColor: '#7ec8ff',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#a8dcff' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#7ec8ff' }));
    btn.on('pointerdown', () => {
      Sfx.start();
      this.scene.start('Play');
    });

    this.add
      .text(width / 2, height * 0.86, 'تسجيل الدخول قريبًا · لعب فردي كضيف الآن', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '12px',
        color: '#6a849a',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.93, 'PWA · Kenney CC0 · Phaser 3', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '11px',
        color: '#4a6070',
      })
      .setOrigin(0.5);
  }
}
