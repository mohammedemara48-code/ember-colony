/* eslint-disable @typescript-eslint/no-explicit-any */
import { nearestWalkable } from './pathfinding';
import { NAMES_AR } from './thoughts';
import { sid } from './config';
import type { Building, Citizen } from './types';

export function placeBuilding(sim: any, kind: any, x: number, y: number, w: number, h: number, capacity: number, labelAr: string, blockWalk = true) {

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
    };
    sim.buildings.push(b);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (yy < 0 || xx < 0 || yy >= sim.config.gridH || xx >= sim.config.gridW)
          continue;
        sim.grid[yy][xx].buildingId = b.id;
        if (blockWalk && kind !== 'tent') sim.grid[yy][xx].walkable = false;
        if (kind === 'tent') {
          sim.grid[yy][xx].walkable = false;
        }
      }
    }
    return b;
  
}

export function placeBuildings(sim: any) {

    const cx = Math.floor(sim.config.gridW / 2);
    const cy = Math.floor(sim.config.gridH / 2);

    sim.placeBuilding('generator', cx - 1, cy - 1, 3, 3, 0, 'المولّد', true);

    const tentSpots = [
      [cx - 5, cy - 4],
      [cx + 3, cy - 4],
      [cx - 5, cy + 3],
      [cx + 3, cy + 3],
      [cx - 7, cy - 1],
      [cx + 5, cy - 1],
    ];
    for (const [tx, ty] of tentSpots) {
      sim.placeBuilding('tent', tx!, ty!, 2, 2, 4, 'خيمة', true);
    }

    sim.placeBuilding('gathering', cx - 9, cy - 8, 2, 2, 4, 'محطة جمع', true);
    sim.placeBuilding('cookhouse', cx + 6, cy - 7, 2, 2, 3, 'مطبخ', true);
    sim.placeBuilding('coal_pile', cx - 2, cy + 6, 2, 2, 4, 'كومة فحم', true);

    for (let i = 0; i < 18; i++) {
      const tx = 1 + Math.floor(Math.random() * (sim.config.gridW - 2));
      const ty = 1 + Math.floor(Math.random() * (sim.config.gridH - 2));
      if (sim.grid[ty][tx].buildingId) continue;
      if (Math.hypot(tx - cx, ty - cy) < 5) continue;
      sim.placeBuilding(
        Math.random() < 0.5 ? 'tree' : 'snow',
        tx,
        ty,
        1,
        1,
        0,
        Math.random() < 0.5 ? 'شجرة متجمدة' : 'كومة ثلج',
        true,
      );
    }
  
}

export function spawnCitizens(sim: any) {

    const tents = sim.buildings.filter((b: any) => b.kind === 'tent');
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
        hunger: 10 + Math.random() * 20,
        cold: 5 + Math.random() * 15,
        hopeBias: -3 + Math.random() * 6,
        workCooldown: 0,
        thoughtCooldown: 2 + Math.random() * 4,
        currentThought: null,
        speed: 1.6 + Math.random() * 0.6,
      };
      sim.citizens.push(c);
    }
  
}

export function setupEvents(sim: any) {

    sim.events = [
      {
        id: 'law_1',
        kind: 'law',
        titleAr: 'قانون الطوارئ',
        bodyAr:
          'الليل يطول والجوع يقترب. هل تفرضون نوبة طوارئ لزيادة الإنتاج، أم عمل الأطفال لجمع المزيد؟ كلاهما يرفع السخط.',
        choices: [
          {
            id: 'emergency',
            labelAr: 'نوبة طوارئ (+إنتاج، +سخط)',
            effect: 'emergency',
          },
          {
            id: 'child',
            labelAr: 'عمل الأطفال (+خشب، ++سخط)',
            effect: 'child',
          },
          {
            id: 'refuse',
            labelAr: 'نرفض… نتحمل معًا (−أمل قليل)',
            effect: 'refuse',
          },
        ],
        fired: false,
        atProgress: 0.28,
      },
      {
        id: 'cold_snap',
        kind: 'cold_snap',
        titleAr: 'موجة صقيع!',
        bodyAr:
          'رياح القطب تهبط فجأة. الحرارة تنهار. أشعلوا الفحم… أو تجمّدوا.',
        choices: [
          {
            id: 'burn',
            labelAr: 'احرقوا الفحم بقوة (−فحم، +دفء)',
            effect: 'burn',
          },
          {
            id: 'endure',
            labelAr: 'اصمدوا (−أمل، برد أشد)',
            effect: 'endure',
          },
        ],
        fired: false,
        atProgress: 0.55,
      },
    ];
  
}

