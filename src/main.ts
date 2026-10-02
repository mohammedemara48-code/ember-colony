import Phaser from 'phaser';
import { BootScene } from './game/BootScene';
import { EndScene } from './game/EndScene';
import { MenuScene } from './game/MenuScene';
import { PlayScene } from './game/PlayScene';
import './style.css';
import { setMuted } from './audio/Sfx';

const parent = document.getElementById('app');
if (!parent) throw new Error('#app missing');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent,
  backgroundColor: '#0b1a2a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, PlayScene, EndScene],
  fps: { target: 60, forceSetTimeOut: true },
  render: { antialias: false, pixelArt: true, roundPixels: true },
  audio: { disableWebAudio: false },
};

window.addEventListener(
  'pointerdown',
  () => {
    setMuted(false);
  },
  { once: true },
);

new Phaser.Game(config);

try {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
} catch {
  /* optional */
}
