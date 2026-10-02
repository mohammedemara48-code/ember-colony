import Phaser from 'phaser';

/** Fallback procedural textures if a PNG failed to load. */
export function ensureFallbackTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const need = (k: string) => !scene.textures.exists(k);

  if (need('tile_snow_0')) {
    g.clear();
    g.fillStyle(0xc8d8e8, 1);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture('tile_snow_0', 64, 64);
  }
  if (need('tile_heat')) {
    g.clear();
    g.fillStyle(0xff8a3a, 0.35);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture('tile_heat', 64, 64);
  }
  if (need('snowflake')) {
    g.clear();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(8, 8, 6);
    g.generateTexture('snowflake', 16, 16);
  }
  if (need('ember')) {
    g.clear();
    g.fillStyle(0xffa028, 1);
    g.fillCircle(6, 6, 5);
    g.generateTexture('ember', 12, 12);
  }
  g.destroy();
}
