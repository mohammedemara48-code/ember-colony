/* eslint-disable @typescript-eslint/no-explicit-any */
import { BUILD_RECIPES } from './config';
import { canPlaceAt, placeBuilding } from './simSetup';
import type { BuildingKind } from './types';

export function chooseEvent(sim: any, choiceId: string) {
  const ev = sim.activeEvent;
  if (!ev) return;
  const choice = ev.choices.find((c: any) => c.id === choiceId);
  if (!choice) return;

  if (ev.kind === 'law') {
    if (choice.effect === 'emergency') {
      sim.laws.emergencyShift = true;
      sim.lawEmergencyShift = true;
      sim.resources.discontent = Math.min(100, sim.resources.discontent + 12);
      sim.resources.hope = Math.max(0, sim.resources.hope - 3);
      sim.message = 'فُرضت نوبة الطوارئ. الإنتاج يرتفع والسخط أيضًا.';
    } else if (choice.effect === 'child') {
      sim.laws.childLabour = true;
      sim.lawChildLabour = true;
      sim.resources.discontent = Math.min(100, sim.resources.discontent + 20);
      sim.resources.wood += 10;
      sim.message = 'عمل الأطفال… الخشب يزيد، والقلوب تثقل.';
    } else if (choice.effect === 'ration') {
      sim.laws.foodRation = true;
      sim.foodRationStrict = true;
      sim.resources.discontent = Math.min(100, sim.resources.discontent + 10);
      sim.message = 'تقنين صارم. البطون تفرغ أبطأ… والسخط يفور.';
    } else if (choice.effect === 'full_rations') {
      sim.resources.hope = Math.min(100, sim.resources.hope + 6);
      sim.resources.food = Math.max(0, sim.resources.food - 6);
      sim.message = 'حصص كاملة اليوم. الابتسامات تعود قليلًا.';
    } else if (choice.effect === 'soup') {
      sim.laws.foodRation = true;
      sim.foodRationStrict = true;
      sim.resources.hope = Math.max(0, sim.resources.hope - 4);
      sim.message = 'حساء رقيق يمدّد المخزون.';
    } else if (choice.effect === 'radical') {
      sim.laws.radicalTreatment = true;
      sim.resources.discontent = Math.min(100, sim.resources.discontent + 14);
      sim.message = 'العلاج الجذري مفعّل — يحتاج عيادة.';
    } else if (choice.effect === 'faith') {
      sim.laws.faithKeepers = true;
      sim.resources.hope = Math.min(100, sim.resources.hope + 8);
      sim.resources.discontent = Math.max(0, sim.resources.discontent - 6);
      sim.message = 'حرّاس الإيمان يهمسون بالدفء في القلوب.';
    } else if (choice.effect === 'neither_med') {
      sim.resources.hope = Math.max(0, sim.resources.hope - 5);
      sim.message = 'لا قرار طبي. الجراح تنتظر.';
    } else {
      sim.resources.hope = Math.max(0, sim.resources.hope - 6);
      sim.resources.discontent = Math.max(0, sim.resources.discontent - 4);
      sim.message = 'رفضتم القانون. الأمل يهتز… لكن الكرامة باقية.';
    }
  } else if (ev.kind === 'cold_snap') {
    sim.coldSnapActive = true;
    sim.coldSnapTimer = 36;
    if (choice.effect === 'burn') {
      sim.resources.coal = Math.max(0, sim.resources.coal - 28);
      sim.generatorLevel = Math.min(3, sim.generatorLevel + 1);
      sim.message = 'الفحم يحترق بشدة. المولّد يزأر ضد الصقيع.';
    } else {
      sim.resources.hope = Math.max(0, sim.resources.hope - 10);
      sim.message = 'لا فحم إضافي. اصمدوا… إن استطعتم.';
    }
    sim.recomputeHeat();
  } else if (ev.kind === 'storm') {
    sim.stormActive = true;
    sim.stormTimer = 48;
    sim.coldSnapActive = true;
    sim.coldSnapTimer = 48;
    if (choice.effect === 'overdrive') {
      sim.resources.coal = Math.max(0, sim.resources.coal - 40);
      sim.generatorLevel = 3;
      sim.stormShelter = false;
      sim.message = 'المولّد في أقصى طاقته ضد العاصفة!';
    } else {
      sim.stormShelter = true;
      sim.resources.hope = Math.max(0, sim.resources.hope - 4);
      sim.message = 'الجميع إلى الملاجئ. الإنتاج يتوقف تقريبًا.';
    }
    sim.recomputeHeat();
  }

  ev.fired = true;
  sim.activeEvent = null;
}

export function snapshot(sim: any) {
  const radius =
    sim.config.generatorHeatRadius + (sim.generatorLevel - 1) * 1.5;
  return {
    time: sim.time,
    progress: sim.progress,
    dayIndex: sim.dayIndex,
    isNight: sim.isNight,
    ambientTemp: sim.ambientTemp,
    resources: { ...sim.resources },
    citizensAlive: sim.citizens.filter((c: any) => c.cold < 100 && c.hunger < 100 && c.health > 0)
      .length,
    citizensFreezing: sim.citizens.filter((c: any) => c.cold > 80).length,
    generatorOn: sim.generatorOn,
    generatorLevel: sim.generatorLevel,
    activeEvent: sim.activeEvent,
    ended: sim.ended,
    endReason: sim.endReason,
    coldSnapActive: sim.coldSnapActive,
    stormActive: !!sim.stormActive,
    message: sim.message,
    laws: { ...sim.laws },
    heatRadius: radius,
  };
}

export function tryBoostGenerator(sim: any) {
  if (sim.resources.coal >= 12 && sim.generatorLevel < 3) {
    sim.resources.coal -= 12;
    sim.generatorLevel++;
    sim.recomputeHeat();
    sim.message = 'تعزيز المولّد! نطاق الدفء يتسع.';
    return true;
  }
  return false;
}

export function tryPlaceBuilding(sim: any, kind: BuildingKind, x: number, y: number): boolean {
  const recipe = BUILD_RECIPES.find((r) => r.kind === kind);
  if (!recipe) return false;
  if (sim.resources.wood < recipe.wood) return false;
  if (sim.resources.coal < recipe.coal) return false;
  if (sim.resources.food < recipe.food) return false;
  if (sim.resources.steel < recipe.steel) return false;
  if (!canPlaceAt(sim, x, y, recipe.w, recipe.h)) return false;

  sim.resources.wood -= recipe.wood;
  sim.resources.coal -= recipe.coal;
  sim.resources.food -= recipe.food;
  sim.resources.steel -= recipe.steel;
  placeBuilding(sim, kind, x, y, recipe.w, recipe.h, recipe.capacity, recipe.labelAr, true);
  sim.recomputeHeat();
  sim.message = `بُني: ${recipe.labelAr}`;
  return true;
}

export function enactLaw(sim: any, lawId: string): boolean {
  if (sim.lawsUnlocked[lawId]) return false;
  // Manual laws panel — lasting choices with costs
  if (lawId === 'emergency' && sim.resources.hope >= 5) {
    sim.laws.emergencyShift = true;
    sim.lawEmergencyShift = true;
    sim.lawsUnlocked.emergency = true;
    sim.resources.discontent = Math.min(100, sim.resources.discontent + 10);
    sim.message = 'قانون: نوبة الطوارئ.';
    return true;
  }
  if (lawId === 'ration' && !sim.laws.foodRation) {
    sim.laws.foodRation = true;
    sim.foodRationStrict = true;
    sim.lawsUnlocked.ration = true;
    sim.resources.discontent = Math.min(100, sim.resources.discontent + 8);
    sim.message = 'قانون: تقنين الطعام.';
    return true;
  }
  if (lawId === 'faith' && sim.resources.coal >= 5) {
    sim.resources.coal -= 5;
    sim.laws.faithKeepers = true;
    sim.lawsUnlocked.faith = true;
    sim.resources.hope = Math.min(100, sim.resources.hope + 10);
    sim.message = 'قانون: حرّاس الإيمان.';
    return true;
  }
  if (lawId === 'radical') {
    sim.laws.radicalTreatment = true;
    sim.lawsUnlocked.radical = true;
    sim.resources.discontent = Math.min(100, sim.resources.discontent + 12);
    sim.message = 'قانون: علاج جذري.';
    return true;
  }
  return false;
}
