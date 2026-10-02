# نجاة في الصقيع — Ember Colony

Frostpunk-inspired colony survival. Keep the Generator lit through **«الليلة الأولى»** (~13 in-game days).

**AR title:** نجاة في الصقيع · **EN / repo:** `ember-colony`  
**Live:** https://ember-colony.vercel.app

## Visuals (v0.3 HD leap)

Opening the game should **not** feel like Atari / Tiny Ski:

- **64×64** painted snow tiles (soft noise, ice cracks, mounds)
- **192–256px** industrial buildings with metal banding, brass, stove glow
- **64×80** citizen walk cycles (coats, hats, scarves — not 16px dots)
- Smooth antialiased rendering (pixelArt **off**)
- Parallax snow (far + near), generator glow, heat ADD blend, vignette
- Frostpunk-inspired HUD: brass frames, industrial panels, gold accents
- Lerped citizen movement

Strategy systems (build, laws, heat, jobs, events) unchanged in spirit.

## Play

```bash
npm install
npm run unpack:assets
npm run dev      # http://localhost:5173
npm run build && npm run preview
```

Guest play is always available. Login button is a stub and never blocks play.

### How to play (EN)

1. Start the shift from the menu.
2. Open **بناء** to place tents, gathering posts, cookhouse, coal pile, coal thumper, workshop, medical post.
3. Toggle **دفء** to visualize generator heat radius.
4. Use **قوانين** for lasting laws. Mid-run events also force lasting choices.
5. Citizens pathfind to work / eat / sleep / heal; click one for Arabic thoughtlets.
6. Boost the generator with coal. Survive cold snap + endgame storm until dawn.

## Stack

- Vite + Phaser 3 + TypeScript + PWA
- Pure TS sim: grid, BFS pathing, heat, jobs, laws, production chains
- HD painted gen sprites + Kenney CC0 decor/SFX (Ice World, Interface Sounds, UI Pack)

## Assets & licenses

| Source | Use | License |
|--------|-----|---------|
| Generated HD (`public/assets/gen`, `citizens`) | 64px tiles, buildings, walk cycles | Project |
| [Kenney Platformer Art Winter / Ice World](https://opengameart.org/content/platformer-art-winter) | Decor trees/rocks/igloos | CC0 |
| [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | UI SFX | CC0 |
| [Kenney UI Pack](https://kenney.nl/assets/ui-pack) | Sample UI audio | CC0 |
| Procedural ambient | wind / hum / storm | Project |

Credit **Kenney.nl** appreciated (not required under CC0).

## Deploy (Vercel)

```bash
npm run build   # output: dist/
```

Connect GitHub `mohammedemara48-code/ember-colony` → project `ember-colony`. Framework: Vite. Output: `dist`.

## Gaps vs AAA (honest)

- Not full hand-painted isometric city (Timberborn/Frostpunk fidelity).
- Citizen sheets are detailed 2D sprites, not skeletal/rigged.
- No full voice-over or campaign of cities.
- Auth/multiplayer still stubbed.

Still: modern HUD, HD tiles/buildings/citizens, lighting & parallax — a clear leap past chunky 16px Atari vibes.
