import Phaser from 'phaser';
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
  scene: [MenuScene, PlayScene, EndScene],
  fps: { target: 60, forceSetTimeOut: true },
  render: { antialias: true, pixelArt: false },
  audio: { disableWebAudio: false },
};

// resume audio on first gesture
window.addEventListener(
  'pointerdown',
  () => {
    setMuted(false);
  },
  { once: true },
);

new Phaser.Game(config);

// PWA register (vite-plugin-pwa injects virtual module)
try {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
} catch {
  /* optional */
}
