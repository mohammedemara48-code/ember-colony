/* eslint-disable @typescript-eslint/no-explicit-any */
import { nearestWalkable } from './pathfinding';
import { NAMES_AR } from './thoughts';
import { sid } from './config';
import type { Building, BuildingKind, Citizen } from './types';

export function placeBuilding(
  sim: any,
  kind: BuildingKind,
  x: number,
  y: number,
  w: number,
  h: number,
  capacity: number,
  labelAr: string,
  blockWalk = true,
) {
  const b: Building = {
    id: sid(kind),
    kind,
    x,
    y,
    w,
    h,
    workers: 0,
    capacity,
    labelAr,
    hp: 100,
  };
  sim.buildings.push(b);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (yy < 0 || xx < 0 || yy >= sim.config.gridH || xx >= sim.config.gridW) continue;
      sim.grid[yy][xx].buildingId = b.id;
      if (blockWalk) sim.grid[yy][xx].walkable = false;
    }
  }
  return b;
}

export function canPlaceAt(sim: any, x: number, y: number, w: number, h: number): boolean {
  if (x < 1 || y < 1 || x + w >= sim.config.gridW - 1 || y + h >= sim.config.gridH - 1)
    return false;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const cell = sim.grid[yy][xx];
      if (!cell || cell.buildingId) return false;
    }
  }
  return true;
}

export function placeBuildings(sim: any) {
  const cx = Math.floor(sim.config.gridW / 2);
  const cy = Math.floor(sim.config.gridH / 2);

  placeBuilding(sim, 'generator', cx - 1, cy - 1, 3, 3, 0, 'المولّد', true);

  // Starter colony — player expands from here
  placeBuilding(sim, 'tent', cx - 5, cy - 3, 2, 2, 4, 'خيمة', true);
  placeBuilding(sim, 'tent', cx + 3, cy - 3, 2, 2, 4, 'خيمة', true);
  placeBuilding(sim, 'gathering', cx - 8, cy - 6, 2, 2, 4, 'محطة جمع', true);
  placeBuilding(sim, 'cookhouse', cx + 5, cy - 6, 2, 2, 3, 'مطبخ', true);
  placeBuilding(sim, 'coal_pile', cx - 1, cy + 5, 2, 2, 4, 'كومة فحم', true);

  // Decor: frozen trees & snow piles
  let placed = 0;
  let attempts = 0;
  while (placed < 22 && attempts < 200) {
    attempts++;
    const tx = 1 + Math.floor(Math.random() * (sim.config.gridW - 2));
    const ty = 1 + Math.floor(Math.random() * (sim.config.gridH - 2));
    if (sim.grid[ty][tx].buildingId) continue;
    if (Math.hypot(tx - cx, ty - cy) < 6) continue;
    const kind: BuildingKind = Math.random() < 0.55 ? 'tree' : 'snow';
    placeBuilding(
      sim,
      kind,
      tx,
      ty,
      1,
      1,
      0,
      kind === 'tree' ? 'شجرة متجمدة' : 'كومة ثلج',
      true,
    );
    placed++;
  }
}

export function spawnCitizens(sim: any) {
  const tents = sim.buildings.filter((b: Building) => b.kind === 'tent');
  const names = [...NAMES_AR].sort(() => Math.random() - 0.5);
  for (let i = 0; i < sim.config.citizenCount; i++) {
    const tent = tents[i % tents.length]!;
    const spot = nearestWalkable(sim.grid, tent.x, tent.y, tent.w, tent.h) ?? {
      x: tent.x - 1,
      y: tent.y,
    };
    const c: Citizen = {
      id: sid('c'),
      nameAr: names[i % names.length]!,
      x: spot.x + Math.random() * 0.3,
      y: spot.y + Math.random() * 0.3,
      destX: spot.x,
      destY: spot.y,
      path: [],
      pathIndex: 0,
      state: 'idle',
      job: 'none',
      workplaceId: null,
      homeId: tent.id,
      hunger: 8 + Math.random() * 18,
      cold: 5 + Math.random() * 12,
      health: 85 + Math.random() * 15,
      hopeBias: -3 + Math.random() * 6,
      workCooldown: 0,
      thoughtCooldown: 2 + Math.random() * 4,
      currentThought: null,
      speed: 1.7 + Math.random() * 0.55,
      facing: 0,
      variant: i % 4,
    };
    sim.citizens.push(c);
  }
}

export function setupEvents(sim: any) {
  sim.events = [
    {
      id: 'law_1',
      kind: 'law',
      titleAr: 'مجلس الطوارئ — القانون الأول',
      bodyAr:
        'الليل يطول والجوع يقترب. اختر قانونًا يدوم: نوبة طوارئ تزيد الإنتاج، أو عمل الأطفال، أو التمسك بالكرامة.',
      choices: [
        { id: 'emergency', labelAr: 'نوبة طوارئ (+إنتاج، +سخط)', effect: 'emergency' },
        { id: 'child', labelAr: 'عمل الأطفال (+خشب، ++سخط)', effect: 'child' },
        { id: 'refuse', labelAr: 'نرفض… نتحمل معًا', effect: 'refuse' },
      ],
      fired: false,
      atProgress: 0.12,
    },
    {
      id: 'law_2',
      kind: 'law',
      titleAr: 'تقنين الطعام',
      bodyAr: 'المخزون يتقلص. هل نفرض تقنينًا صارمًا أم نبقي الحصص كاملة؟',
      choices: [
        { id: 'ration', labelAr: 'تقنين صارم (−جوع بطيء، +سخط)', effect: 'ration' },
        { id: 'full', labelAr: 'حصص كاملة (−طعام أسرع، +أمل)', effect: 'full_rations' },
        { id: 'soup', labelAr: 'حساء رقيق (−أمل قليل، يدوم الطعام)', effect: 'soup' },
      ],
      fired: false,
      atProgress: 0.28,
    },
    {
      id: 'cold_snap',
      kind: 'cold_snap',
      titleAr: 'موجة صقيع!',
      bodyAr: 'رياح القطب تهبط فجأة. الحرارة تنهار. أشعلوا الفحم… أو تجمّدوا.',
      choices: [
        { id: 'burn', labelAr: 'احرقوا الفحم بقوة (−فحم، +دفء)', effect: 'burn' },
        { id: 'endure', labelAr: 'اصمدوا (−أمل، برد أشد)', effect: 'endure' },
      ],
      fired: false,
      atProgress: 0.42,
    },
    {
      id: 'law_3',
      kind: 'law',
      titleAr: 'الطب والإيمان',
      bodyAr: 'الجرحى يتكاثرون. علاج جذري ينقذ أرواحًا ويؤلم الضمائر، أو حُرّاس الإيمان يرفعون الأمل.',
      choices: [
        {
          id: 'radical',
          labelAr: 'علاج جذري (+صحة، +سخط، يحتاج عيادة)',
          effect: 'radical',
        },
        {
          id: 'faith',
          labelAr: 'حرّاس الإيمان (+أمل، −سخط بطيء)',
          effect: 'faith',
        },
        { id: 'neither', labelAr: 'لا شيء الآن (−أمل)', effect: 'neither_med' },
      ],
      fired: false,
      atProgress: 0.58,
    },
    {
      id: 'storm',
      kind: 'storm',
      titleAr: 'عاصفة نهاية الليلة',
      bodyAr: 'السماء تنشق. هذه العاصفة الأخيرة قبل الفجر — أو القبر.',
      choices: [
        {
          id: 'overdrive',
          labelAr: 'تشغيل أقصى (−فحم كثير، حماية مؤقتة)',
          effect: 'overdrive',
        },
        {
          id: 'shelter',
          labelAr: 'الجميع إلى الخيام (−إنتاج، +نجاة)',
          effect: 'shelter',
        },
      ],
      fired: false,
      atProgress: 0.78,
    },
  ];
}
