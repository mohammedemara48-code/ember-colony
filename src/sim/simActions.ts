/* eslint-disable @typescript-eslint/no-explicit-any */
export function chooseEvent(sim: any, choiceId: string) {

    const ev = sim.activeEvent;
    if (!ev) return;
    const choice = ev.choices.find((c: any) => c.id === choiceId);
    if (!choice) return;

    if (ev.kind === 'law') {
      if (choice.effect === 'emergency') {
        sim.lawEmergencyShift = true;
        sim.resources.discontent = Math.min(100, sim.resources.discontent + 12);
        sim.resources.hope = Math.max(0, sim.resources.hope - 3);
        sim.message = 'فُرضت نوبة الطوارئ. الإنتاج يرتفع والسخط أيضًا.';
      } else if (choice.effect === 'child') {
        sim.lawChildLabour = true;
        sim.resources.discontent = Math.min(100, sim.resources.discontent + 20);
        sim.resources.wood += 8;
        sim.message = 'عمل الأطفال… الخشب يزيد، والقلوب تثقل.';
      } else {
        sim.resources.hope = Math.max(0, sim.resources.hope - 6);
        sim.resources.discontent = Math.max(0, sim.resources.discontent - 4);
        sim.message = 'رفضتم القانون. الأمل يهتز… لكن الكرامة باقية.';
      }
    } else if (ev.kind === 'cold_snap') {
      sim.coldSnapActive = true;
      sim.coldSnapTimer = 28;
      if (choice.effect === 'burn') {
        sim.resources.coal = Math.max(0, sim.resources.coal - 25);
        sim.generatorLevel = Math.min(3, sim.generatorLevel + 1);
        sim.message = 'الفحم يحترق بشدة. المولّد يزأر ضد الصقيع.';
      } else {
        sim.resources.hope = Math.max(0, sim.resources.hope - 10);
        sim.message = 'لا فحم إضافي. اصمدوا… إن استطعتم.';
      }
      sim.recomputeHeat();
    }

    ev.fired = true;
    sim.activeEvent = null;
  
}

export function snapshot(sim: any) {

    return {
      time: sim.time,
      progress: sim.progress,
      dayIndex: sim.dayIndex,
      isNight: sim.isNight,
      ambientTemp: sim.ambientTemp,
      resources: { ...sim.resources },
      citizensAlive: sim.citizens.filter((c: any) => c.cold < 100 && c.hunger < 100)
        .length,
      citizensFreezing: sim.citizens.filter((c: any) => c.cold > 80).length,
      generatorOn: sim.generatorOn,
      generatorLevel: sim.generatorLevel,
      activeEvent: sim.activeEvent,
      ended: sim.ended,
      endReason: sim.endReason,
      coldSnapActive: sim.coldSnapActive,
      message: sim.message,
    };
  
}

export function tryBoostGenerator(sim: any) {

    if (sim.resources.coal >= 10 && sim.generatorLevel < 3) {
      sim.resources.coal -= 10;
      sim.generatorLevel++;
      sim.recomputeHeat();
      sim.message = 'تعزيز المولّد!';
      return true;
    }
    return false;
  
}
