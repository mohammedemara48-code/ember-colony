import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;
    const splash = document.getElementById('boot-splash');
    if (splash) splash.classList.add('hidden');

    // background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a3350, 0x1a3350, 0x0b1a2a, 0x0b1a2a, 1);
    bg.fillRect(0, 0, width, height);

    // snow flakes
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(
        Math.random() * width,
        Math.random() * height,
        1 + Math.random() * 2,
        0xffffff,
        0.35 + Math.random() * 0.4,
      );
      this.tweens.add({
        targets: s,
        y: s.y + height,
        x: s.x + (Math.random() * 40 - 20),
        duration: 6000 + Math.random() * 8000,
        repeat: -1,
        onRepeat: () => {
          s.y = -10;
          s.x = Math.random() * width;
        },
      });
    }

    // glow
    const glow = this.add.circle(width / 2, height * 0.42, 80, 0xff6a20, 0.15);
    this.tweens.add({
      targets: glow,
      alpha: 0.28,
      scale: 1.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(width / 2, height * 0.22, 'نجاة في الصقيع', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: Math.min(48, width / 12) + 'px',
        color: '#e8f4ff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#4a90d9', 16, true, true);

    this.add
      .text(width / 2, height * 0.32, 'Ember Colony', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '16px',
        color: '#8ab0d0',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.48,
        'المولّد آخر دفءٍ في العالم.\nأدرِ الموارد، احمِ السكان، واختر قوانينك بحكمة.\nسيناريو: «الليلة الأولى»',
        {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '15px',
          color: '#c5d8ea',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, height * 0.68, '▶  بدء الوردية', {
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
      .text(width / 2, height * 0.82, 'تسجيل الدخول قريبًا · لعب فردي الآن', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '12px',
        color: '#6a849a',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.9, 'PWA · Vite · Phaser 3 · TypeScript', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '11px',
        color: '#4a6070',
      })
      .setOrigin(0.5);
  }
}
