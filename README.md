# نجاة في الصقيع — Ember Colony

Frostpunk-like strategy survival. Keep the Generator lit through **«الليلة الأولى»** (The First Night).

**AR marketing title:** نجاة في الصقيع · **EN / repo:** `ember-colony`

## Play

```bash
npm install
npm run dev      # http://localhost:5173
npm run build && npm run preview
```

Or open the deployed Vercel URL once linked.

### How to play (EN)

1. Click **بدء الوردية** (Start Shift).
2. Watch citizens walk to gathering post, cookhouse, and coal pile.
3. HUD: coal · wood · food · Hope · Discontent · day/night · ambient °C.
4. Click a citizen for Arabic thoughtlets.
5. Mid-run: **law choice** and a **cold snap** — pick wisely.
6. Survive until dawn (progress bar). Lose if Hope hits 0, Discontent hits 100, or too many freeze/starve.
7. **تعزيز** spends coal to widen generator heat. **Mute** toggles Web Audio SFX.
8. **تسجيل الدخول قريبًا** is a stub — play is never blocked.

### كيف تلعب (AR)

1. اضغط **بدء الوردية**.
2. السكان يتحركون نحو الوظائف والطعام والدفء.
3. راقب الفحم والخشب والطعام والأمل والسخط ودرجة الحرارة.
4. انقر مواطنًا لرؤية خواطره.
5. سيظهر قانون طوارئ ثم موجة صقيع — اختر قرارك.
6. اصمد حتى الفجر. الهزيمة: أمل صفر / سخط كامل / تجمّد أو جوع جماعي.

## Stack

- Vite + Phaser 3 + TypeScript + PWA (`vite-plugin-pwa`)
- Pure TS simulation under `src/sim/` (grid, BFS pathing, heat, events)
- Procedural canvas textures (cold blue-gray palette)
- `vercel.json` for static deploy

## Stubbed / next steps

| Area | Status |
|------|--------|
| Auth login button | Stub only — do not block play |
| Multiplayer | Not started |
| Suggested auth | [Clerk](https://clerk.com) or [Supabase Auth](https://supabase.com/auth) |
| Suggested realtime | [Colyseus](https://www.colyseus.io) rooms for shared colony shifts |
| Building placement UI | Pre-placed MVP; API `tryBoostGenerator` only |
| Persistent meta / multiple scenarios | First night only |

## Project layout

```
src/sim/       # SimState, pathfinding, thoughts, types
src/game/      # Phaser scenes + procedural textures
src/ui/        # DOM HUD (RTL Arabic)
src/audio/     # Web Audio beeps
```

## Deploy (Vercel)

```bash
npm run build   # output: dist/
```

Connect the GitHub repo `mohammedemara48-code/ember-colony` to Vercel (project name `ember-colony`). Framework preset: Other / Vite. Output: `dist`.

## License

Prototype for friends — art is procedural placeholders (Kenney-like spirit, not copied assets).
