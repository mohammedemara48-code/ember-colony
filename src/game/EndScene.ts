import Phaser from 'phaser';
import type { EndReason } from '../sim/types';
import { Sfx } from '../audio/Sfx';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(data: { reason: EndReason; message: string; hope: number; discontent: number }) {
    const { width, height } = this.scale;
    const win = data.reason === 'survived';
    if (win) Sfx.win();
    else Sfx.lose();

    this.add.rectangle(0, 0, width, height, win ? 0x0a2030 : 0x1a0a10, 0.94).setOrigin(0);

    this.add
      .text(width / 2, height * 0.28, win ? 'نجوتم' : 'انتهت الليلة', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '40px',
        color: win ? '#7ec8ff' : '#ff8a8a',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, 'سيناريو «الليلة الأولى»', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '16px',
        color: '#9ab0c4',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.52, data.message || '', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '18px',
        color: '#e8f0f8',
        align: 'center',
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.64,
        `أمل ${Math.floor(data.hope)} · سخط ${Math.floor(data.discontent)}`,
        {
          fontFamily: 'Segoe UI, Tahoma, Arial',
          fontSize: '14px',
          color: '#8aa0b4',
        },
      )
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, height * 0.78, 'إعادة المحاولة', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '20px',
        color: '#0b1a2a',
        backgroundColor: '#7ec8ff',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      Sfx.click();
      this.scene.start('Play');
    });

    const menu = this.add
      .text(width / 2, height * 0.88, 'القائمة', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '14px',
        color: '#8ab0d0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menu.on('pointerdown', () => this.scene.start('Menu'));
  }
}
