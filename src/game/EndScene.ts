import Phaser from 'phaser';
import { Sfx, bindAudioScene } from '../audio/Sfx';

type EndData = {
  reason: string;
  message: string;
  hope: number;
  discontent: number;
  dayIndex?: number;
  alive?: number;
};

const REASON_AR: Record<string, string> = {
  survived: 'نجاة — الفجر',
  hope_lost: 'هزيمة — انطفأ الأمل',
  discontent_revolt: 'هزيمة — تمرّد',
  starved: 'هزيمة — جوع',
  frozen: 'هزيمة — صقيع',
  storm: 'هزيمة — العاصفة',
};

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(data: EndData) {
    bindAudioScene(this);
    const { width, height } = this.scale;
    const win = data.reason === 'survived';

    this.add.rectangle(0, 0, width, height, win ? 0x0a2030 : 0x1a0a10, 1).setOrigin(0);

    this.add
      .text(width / 2, height * 0.18, REASON_AR[data.reason] ?? data.reason, {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '28px',
        color: win ? '#7ec8ff' : '#e08080',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.32, data.message || '', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '16px',
        color: '#c8d8e8',
        align: 'center',
        wordWrap: { width: Math.min(480, width * 0.85) },
      })
      .setOrigin(0.5);

    const debrief = [
      `اليوم الذي وصلت إليه: ${data.dayIndex ?? '—'}`,
      `السكان الأحياء: ${data.alive ?? '—'}`,
      `الأمل النهائي: ${Math.round(data.hope)}`,
      `السخط النهائي: ${Math.round(data.discontent)}`,
      '',
      win
        ? 'أحسنت — المستوطنة صمدت حتى انقشاع الليلة الأولى.'
        : 'راجع توزيع الوظائف، نطاق الدفء، والقوانين… ثم أعد المحاولة.',
    ].join('\n');

    this.add
      .text(width / 2, height * 0.52, debrief, {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '14px',
        color: '#9ab0c4',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(width / 2, height * 0.78, 'إعادة الوردية', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '20px',
        color: '#0b1a2a',
        backgroundColor: win ? '#7ec8ff' : '#e0a080',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      Sfx.click();
      this.scene.start('Play');
    });

    this.add
      .text(width / 2, height * 0.9, 'القائمة الرئيسية', {
        fontFamily: 'Segoe UI, Tahoma, Arial',
        fontSize: '14px',
        color: '#7a90a4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        Sfx.click();
        this.scene.start('Menu');
      });
  }
}
