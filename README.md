# نجاة في الصقيع — Ember Colony

Frostpunk-inspired colony survival. Keep the Generator lit through **«الليلة الأولى»** (~13 in-game days).

**AR title:** نجاة في الصقيع · **EN / repo:** `ember-colony`  
**Live:** https://ember-colony.vercel.app

## Play

```bash
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
```

Guest play is always available. Login button is a stub and never blocks play.

### How to play (EN)

1. Start the shift from the menu.
2. Open **بناء** to place tents, gathering posts, cookhouse, coal pile, coal thumper, workshop, medical post (pay wood/coal/food/steel).
3. Toggle **دفء** to visualize generator heat radius.
4. Use **قوانين** for lasting laws (emergency shift, rationing, faith keepers, radical treatment). Mid-run events also force lasting choices.
5. Citizens pathfind to work / eat / sleep / heal; click one for Arabic thoughtlets.
6. Boost the generator with coal to widen heat. Survive cold snap + endgame storm until dawn.
7. Win: reach dawn. Lose: hope 0, discontent 100, mass freeze/starve/storm deaths.

### كيف تلعب (AR)

1. اضغط **بدء الوردية**.
2. **بناء**: ضع خيامًا ومحطات جمع ومطبخًا وكومة/قاسم فحم وورشة وعيادة.
3. **دفء**: أظهر نطاق حرارة المولّد.
4. **قوانين**: اختر قوانين دائمة؛ والأحداث تفرض قرارات أيضًا.
5. السكان يمشون للعمل/الطعام/النوم/العلاج — انقر مواطنًا لخواطره.
6. عزّز المولّد بالفحم. اصمد أمام موجة الصقيع ثم العاصفة حتى الفجر.

## Stack

- Vite + Phaser 3 + TypeScript + PWA
- Pure TS sim: grid, BFS pathing, heat, jobs, laws, production chains
- Pixel-art buildings/citizens (generated) + Kenney CC0 tiles/SFX/UI samples

## Assets & licenses

| Source | Use | License |
|--------|-----|---------|
| [Kenney Tiny Ski](https://kenney.nl/assets/tiny-ski) | Snow tile references | CC0 |
| [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) | Town tile references | CC0 |
| [Kenney Platformer Art Winter / Ice World](https://opengameart.org/content/platformer-art-winter) | Trees, igloo, rocks, tundra decor | CC0 |
| [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | UI clicks / confirms | CC0 |
| [Kenney UI Pack](https://kenney.nl/assets/ui-pack) | Sample button PNGs + tap/click OGG | CC0 |
| Generated (`public/assets/gen`, `citizens`) | Buildings, walk cycles, snow/heat tiles, particles | Project / free to use |
| Procedural ambient (`wind_loop`, `generator_hum`, `storm_wind`) | ffmpeg noise/sine loops | Project |

Credit **Kenney.nl** appreciated (not required under CC0).

## Project layout

```
public/assets/   # Kenney CC0 + generated sprites/audio
src/sim/         # Simulation (config, setup, update, actions, pathfinding)
src/game/        # Boot / Menu / Play / End + EventModal
src/ui/          # RTL game HUD panels (build + laws)
src/audio/       # Kenney SFX + ambience helpers
```

## Deploy (Vercel)

```bash
npm run build   # output: dist/
```

Connect GitHub `mohammedemara48-code/ember-colony` → project `ember-colony`. Framework: Vite. Output: `dist`.

## Gaps vs AAA (honest)

- No hand-painted isometric city art or Frostpunk-level animation fidelity.
- Citizen walk cycles are compact pixel sheets (4-dir), not skeletal/rigged.
- No full voice-over, music score, or complex tech tree / book of laws UI.
- Auth/multiplayer still stubbed.
- Scenario is one expanded first-night arc, not a campaign of cities.

Still: real sprites, weather, heat viz, build mode, laws, production chains, audio, PWA, Arabic RTL — far beyond placeholder rectangles.
