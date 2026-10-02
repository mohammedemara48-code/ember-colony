import Phaser from 'phaser';

/** Fallback procedural textures if a PNG failed to load. */
export function ensureFallbackTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const need = (k: string) => !scene.textures.exists(k);

  if (need('tile_snow_0')) {
    g.clear();
    g.fillStyle(0xb8c9d9, 1);
    g.fillRect(0, 0, 32, 32);
    g.generateTexture('tile_snow_0', 32, 32);
  }
  if (need('tile_heat')) {
    g.clear();
    g.fillStyle(0xff8a3a, 0.35);
    g.fillRect(0, 0, 32, 32);
    g.generateTexture('tile_heat', 32, 32);
  }
  if (need('snowflake')) {
    g.clear();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(4, 4, 3);
    g.generateTexture('snowflake', 8, 8);
  }
  if (need('ember')) {
    g.clear();
    g.fillStyle(0xffa028, 1);
    g.fillCircle(3, 3, 2);
    g.generateTexture('ember', 6, 6);
  }
  g.destroy();
}
