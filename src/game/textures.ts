import Phaser from 'phaser';

/** Procedural canvas textures — cold blue-gray palette. */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 });

  // snow tile
  g.clear();
  g.fillStyle(0xb8c9d9, 1);
  g.fillRect(0, 0, 28, 28);
  g.fillStyle(0xd0dde8, 0.55);
  g.fillRect(2, 2, 10, 8);
  g.fillStyle(0x9aafc2, 0.4);
  g.fillCircle(20, 18, 4);
  g.generateTexture('tile_snow', 28, 28);

  // heat overlay cell
  g.clear();
  g.fillStyle(0xff8a3a, 0.35);
  g.fillRect(0, 0, 28, 28);
  g.generateTexture('tile_heat', 28, 28);

  // generator
  g.clear();
  g.fillStyle(0x2a3340, 1);
  g.fillRoundedRect(2, 6, 52, 44, 4);
  g.fillStyle(0x1a222c, 1);
  g.fillRect(18, 0, 20, 14);
  g.fillStyle(0xff6a20, 1);
  g.fillCircle(28, 28, 12);
  g.fillStyle(0xffe08a, 0.9);
  g.fillCircle(28, 28, 6);
  g.lineStyle(2, 0x6a7a8a, 1);
  g.strokeRoundedRect(2, 6, 52, 44, 4);
  g.generateTexture('b_generator', 56, 56);

  // tent
  g.clear();
  g.fillStyle(0x4a5a6a, 1);
  g.fillTriangle(28, 2, 2, 40, 54, 40);
  g.fillStyle(0x2e3a48, 1);
  g.fillTriangle(28, 10, 14, 40, 42, 40);
  g.fillStyle(0x1a222c, 1);
  g.fillRect(24, 28, 8, 12);
  g.generateTexture('b_tent', 56, 44);

  // gathering post
  g.clear();
  g.fillStyle(0x5a4a38, 1);
  g.fillRect(8, 20, 40, 24);
  g.fillStyle(0x3a3028, 1);
  g.fillRect(20, 4, 8, 20);
  g.fillStyle(0x8a9a6a, 1);
  g.fillCircle(24, 8, 10);
  g.generateTexture('b_gathering', 56, 48);

  // cookhouse
  g.clear();
  g.fillStyle(0x5a4038, 1);
  g.fillRect(4, 16, 48, 28);
  g.fillStyle(0x3a2820, 1);
  g.fillTriangle(28, 2, 2, 20, 54, 20);
  g.fillStyle(0xff5530, 0.85);
  g.fillCircle(40, 30, 5);
  g.generateTexture('b_cookhouse', 56, 48);

  // coal pile
  g.clear();
  g.fillStyle(0x1a1a1e, 1);
  g.fillEllipse(28, 28, 48, 28);
  g.fillStyle(0x2a2a30, 1);
  g.fillCircle(18, 24, 10);
  g.fillCircle(34, 22, 12);
  g.fillCircle(28, 30, 9);
  g.generateTexture('b_coal', 56, 44);

  // tree
  g.clear();
  g.fillStyle(0x3a3028, 1);
  g.fillRect(12, 22, 4, 12);
  g.fillStyle(0x4a6a7a, 1);
  g.fillCircle(14, 16, 10);
  g.fillStyle(0xd0e0f0, 0.5);
  g.fillCircle(10, 12, 4);
  g.generateTexture('b_tree', 28, 36);

  // snow mound
  g.clear();
  g.fillStyle(0xe8f0f8, 1);
  g.fillEllipse(14, 18, 26, 14);
  g.fillStyle(0xc8d8e8, 0.7);
  g.fillEllipse(10, 16, 12, 8);
  g.generateTexture('b_snow', 28, 28);

  // citizen frames (simple animated figure — 4 walk frames)
  for (let f = 0; f < 4; f++) {
    g.clear();
    const leg = f % 2 === 0 ? 2 : -2;
    const arm = f % 2 === 0 ? -2 : 2;
    // coat body
    g.fillStyle(0x3d4f63, 1);
    g.fillRoundedRect(4, 8, 12, 14, 2);
    // head
    g.fillStyle(0xc9b39a, 1);
    g.fillCircle(10, 5, 4);
    // hood
    g.fillStyle(0x2a3a4a, 1);
    g.fillCircle(10, 4, 5);
    g.fillStyle(0xc9b39a, 1);
    g.fillCircle(10, 6, 3);
    // legs
    g.fillStyle(0x1e2834, 1);
    g.fillRect(6 + leg, 20, 3, 7);
    g.fillRect(11 - leg, 20, 3, 7);
    // arms
    g.fillStyle(0x3d4f63, 1);
    g.fillRect(1, 10 + arm * 0.3, 3, 8);
    g.fillRect(16, 10 - arm * 0.3, 3, 8);
    g.generateTexture(`citizen_${f}`, 20, 28);
  }

  // freezing tint citizen
  g.clear();
  g.fillStyle(0x6a8aaa, 1);
  g.fillRoundedRect(4, 8, 12, 14, 2);
  g.fillStyle(0xa0b8c8, 1);
  g.fillCircle(10, 5, 4);
  g.fillStyle(0x2a3a4a, 1);
  g.fillCircle(10, 4, 5);
  g.fillStyle(0xa0b8c8, 1);
  g.fillCircle(10, 6, 3);
  g.fillStyle(0x1e2834, 1);
  g.fillRect(6, 20, 3, 7);
  g.fillRect(11, 20, 3, 7);
  g.generateTexture('citizen_cold', 20, 28);

  // particle snowflake
  g.clear();
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(3, 3, 2);
  g.generateTexture('snowflake', 6, 6);

  g.destroy();
}
