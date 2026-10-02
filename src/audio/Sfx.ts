import Phaser from 'phaser';

/** Kenney CC0 SFX + ambient loops via Phaser sound manager bridge. */

let muted = false;
let sceneRef: Phaser.Scene | null = null;
let wind: Phaser.Sound.BaseSound | null = null;
let hum: Phaser.Sound.BaseSound | null = null;
let storm: Phaser.Sound.BaseSound | null = null;

export function bindAudioScene(scene: Phaser.Scene) {
  sceneRef = scene;
}

export function setMuted(m: boolean) {
  muted = m;
  if (sceneRef) sceneRef.sound.mute = m;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

function play(key: string, cfg?: Phaser.Types.Sound.SoundConfig) {
  if (muted || !sceneRef) return;
  try {
    if (sceneRef.cache.audio.exists(key)) sceneRef.sound.play(key, cfg);
  } catch {
    /* ignore */
  }
}

export function startAmbience(scene: Phaser.Scene) {
  bindAudioScene(scene);
  scene.sound.mute = muted;
  if (!wind && scene.cache.audio.exists('wind_loop')) {
    wind = scene.sound.add('wind_loop', { loop: true, volume: 0.22 });
    wind.play();
  }
  if (!hum && scene.cache.audio.exists('generator_hum')) {
    hum = scene.sound.add('generator_hum', { loop: true, volume: 0.18 });
    hum.play();
  }
}

export function stopAmbience() {
  wind?.stop();
  hum?.stop();
  storm?.stop();
  wind = hum = storm = null;
}

export function setStormAmbience(on: boolean) {
  if (!sceneRef) return;
  if (on) {
    hum?.pause();
    if (!storm && sceneRef.cache.audio.exists('storm_wind')) {
      storm = sceneRef.sound.add('storm_wind', { loop: true, volume: 0.4 });
      storm.play();
    } else storm?.resume();
  } else {
    storm?.stop();
    storm = null;
    hum?.resume();
  }
}

export function setGeneratorHum(on: boolean) {
  if (!hum) return;
  if (on) {
    if (!hum.isPlaying) hum.play();
    (hum as Phaser.Sound.WebAudioSound).setVolume?.(0.18);
  } else {
    (hum as Phaser.Sound.WebAudioSound).setVolume?.(0.02);
  }
}

export const Sfx = {
  click() {
    play('click_001', { volume: 0.35 });
  },
  start() {
    play('confirmation_001', { volume: 0.4 });
  },
  event() {
    play('question_001', { volume: 0.45 });
  },
  cold() {
    play('bong_001', { volume: 0.35 });
  },
  win() {
    play('maximize_001', { volume: 0.45 });
  },
  lose() {
    play('error_001', { volume: 0.4 });
  },
  place() {
    play('drop_001', { volume: 0.4 });
  },
  build() {
    play('drop_002', { volume: 0.45 });
  },
  open() {
    play('open_001', { volume: 0.35 });
  },
  select() {
    play('select_001', { volume: 0.3 });
  },
  switch() {
    play('switch_001', { volume: 0.3 });
  },
};
