/** Tick logic for Ember Colony survival sim. */
import { thoughtFor } from './thoughts';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function heatAvg(sim: any) {
  let s = 0;
  for (const c of sim.citizens) s += sim.heatAt(c.x, c.y);
  return s / Math.max(1, sim.citizens.length);
}

export function applySimUpdate(sim: any, dt: number): void {
  if (sim.ended || sim.activeEvent) return;

  sim.time += dt;
  sim.assignTimer -= dt;
  sim.hopeTick -= dt;

  if (sim.generatorOn) {
    const burn = (0.28 + sim.generatorLevel * 0.16) * dt * (sim.stormActive ? 1.35 : 1);
    sim.resources.coal -= burn;
    if (sim.resources.coal <= 0) {
      sim.resources.coal = 0;
      sim.generatorOn = false;
      sim.message = 'انقطع الفحم! المولّد يخمد…';
      sim.recomputeHeat();
    }
  } else if (sim.resources.coal > 5) {
    sim.generatorOn = true;
    sim.message = 'المولّد يعود للحياة.';
    sim.recomputeHeat();
  }

  if (sim.coldSnapActive) {
    sim.coldSnapTimer -= dt;
    if (sim.coldSnapTimer <= 0) {
      sim.coldSnapActive = false;
      if (!sim.stormActive) sim.message = 'انحسرت موجة الصقيع… قليلًا.';
      sim.recomputeHeat();
    }
  }

  if (sim.stormActive) {
    sim.stormTimer -= dt;
    if (sim.stormTimer <= 0) {
      sim.stormActive = false;
      sim.stormShelter = false;
      sim.message = 'هدأت العاصفة. الفجر يقترب.';
      sim.recomputeHeat();
    }
  }

  for (const ev of sim.events) {
    if (!ev.fired && sim.progress >= ev.atProgress) {
      sim.activeEvent = ev;
      return;
    }
  }

  if (sim.assignTimer <= 0) {
    sim.assignJobs();
    sim.assignTimer = 1.0;
  }

  const mood = sim.moodWorkFactor();
  let freezingCount = 0;
  let deadHunger = 0;
  let deadCold = 0;
  let deadHealth = 0;

  const hungerRate = sim.foodRationStrict ? 1.15 : 1.85;

  for (const c of sim.citizens) {
    if (c.health <= 0) {
      deadHealth++;
      continue;
    }

    const heat = sim.heatAt(c.x, c.y);
    const ambient = sim.ambientTemp;
    const warmth = heat * 52 + ambient;
    const coldMul = sim.stormActive ? 1.4 : 1;

    if (warmth < -8) {
      c.cold = Math.min(
        100,
        c.cold + dt * (7 + Math.abs(warmth + 8) * 0.14) * coldMul,
      );
    } else {
      c.cold = Math.max(0, c.cold - dt * (6 + heat * 11));
    }

    c.hunger = Math.min(100, c.hunger + dt * hungerRate);

    if (c.cold > 70 || c.hunger > 75) {
      c.health = Math.max(0, c.health - dt * (c.cold > 85 ? 2.2 : 0.8));
    } else if (heat > 0.4 && c.hunger < 50) {
      c.health = Math.min(100, c.health + dt * 0.4);
    }

    if (c.cold > 85) {
      c.state = 'freezing';
      freezingCount++;
    }

    // facing from movement
    if (c.path.length && c.pathIndex < c.path.length) {
      const target = c.path[c.pathIndex]!;
      const tx = target.x + 0.5;
      const ty = target.y + 0.5;
      const dx = tx - c.x;
      const dy = ty - c.y;
      const dist = Math.hypot(dx, dy);
      const step =
        c.speed *
        dt *
        (c.cold > 60 ? 0.7 : 1) *
        (c.hunger > 70 ? 0.85 : 1) *
        (sim.stormShelter ? 0.5 : 1);

      if (Math.abs(dx) > Math.abs(dy)) c.facing = dx < 0 ? 1 : 2;
      else c.facing = dy < 0 ? 3 : 0;

      if (dist <= step) {
        c.x = tx;
        c.y = ty;
        c.pathIndex++;
        if (c.pathIndex >= c.path.length) {
          c.path = [];
          if (c.state === 'eating') {
            if (sim.resources.food >= 1) {
              sim.resources.food -= 1;
              c.hunger = Math.max(0, c.hunger - (sim.foodRationStrict ? 32 : 48));
            }
            c.state = 'idle';
          } else if (c.state === 'healing') {
            c.health = Math.min(100, c.health + (sim.laws.radicalTreatment ? 35 : 18));
            c.state = 'idle';
          } else if (c.job !== 'none' && c.job !== 'rest') {
            c.state = 'working';
            c.workCooldown = 0.45;
          } else if (c.job === 'rest') {
            c.state = 'sleeping';
          } else {
            c.state = 'idle';
          }
        }
      } else {
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;
        c.state = 'walking';
      }
    }

    if (c.state === 'working' && c.workplaceId && !sim.stormShelter) {
      c.workCooldown -= dt;
      if (c.workCooldown <= 0) {
        c.workCooldown = 1.05 / mood;
        if (c.job === 'gather_wood') {
          sim.resources.wood += 0.42 * mood;
          sim.resources.rawFood += 0.04 * mood;
        }
        if (c.job === 'mine_coal') sim.resources.coal += 0.5 * mood;
        if (c.job === 'cook' && sim.resources.rawFood >= 0.35) {
          sim.resources.rawFood -= 0.35;
          sim.resources.food += 0.55 * mood;
        } else if (c.job === 'cook') {
          sim.resources.rawFood += 0.06;
        }
        if (c.job === 'craft' && sim.resources.wood >= 0.3 && sim.resources.coal >= 0.15) {
          sim.resources.wood -= 0.3;
          sim.resources.coal -= 0.15;
          sim.resources.steel += 0.12 * mood;
        }
        if (c.job === 'heal') {
          // passive heal aura handled via nearby citizens in hope tick
        }
      }
    }

    if (c.state === 'sleeping') {
      c.cold = Math.max(0, c.cold - dt * 4);
      c.hunger = Math.min(100, c.hunger + dt * 0.4);
    }

    c.thoughtCooldown -= dt;
    if (c.thoughtCooldown <= 0) {
      c.currentThought = thoughtFor({
        cold: c.cold,
        hunger: c.hunger,
        hope: sim.resources.hope,
        discontent: sim.resources.discontent,
        state: c.state,
        heatHere: heat,
      });
      c.thoughtCooldown = 5 + Math.random() * 8;
    }

    if (c.hunger >= 100) deadHunger++;
    if (c.cold >= 100) deadCold++;
    if (c.health <= 0) deadHealth++;
  }

  if (sim.hopeTick <= 0) {
    sim.hopeTick = 2.2;
    const alive = sim.citizens.filter((c: any) => c.health > 0);
    if (!alive.length) {
      sim.ended = true;
      sim.endReason = 'frozen';
      sim.message = 'لم يبقَ أحد.';
      return;
    }
    const avgCold = alive.reduce((s: number, c: any) => s + c.cold, 0) / alive.length;
    const avgHunger = alive.reduce((s: number, c: any) => s + c.hunger, 0) / alive.length;

    if (avgCold > 50) sim.resources.hope -= 1.1;
    if (avgHunger > 55) sim.resources.hope -= 0.75;
    if (heatAvg(sim) > 0.35) sim.resources.hope += 0.55;
    if (sim.generatorOn) sim.resources.hope += 0.28;
    if (!sim.generatorOn) {
      sim.resources.hope -= 2.2;
      sim.resources.discontent += 1.6;
    }
    if (avgCold > 60) sim.resources.discontent += 1.1;
    if (sim.resources.food < 5) sim.resources.discontent += 0.7;
    if (sim.resources.hope > 70) sim.resources.discontent -= 0.35;
    if (sim.laws.faithKeepers) {
      sim.resources.hope += 0.45;
      sim.resources.discontent -= 0.25;
    }
    if (sim.stormActive) sim.resources.hope -= 0.8;

    // medical heal pulse
    const meds = sim.buildings.filter((b: any) => b.kind === 'medical');
    if (meds.length) {
      for (const c of alive) {
        if (c.health < 70) {
          const near = meds.some(
            (m: any) => Math.hypot(c.x - (m.x + 1), c.y - (m.y + 1)) < 4,
          );
          if (near) c.health = Math.min(100, c.health + (sim.laws.radicalTreatment ? 3 : 1.2));
        }
      }
    }

    if (sim.lawChildLabour) sim.resources.wood += 0.08;

    sim.resources.hope = clamp(sim.resources.hope, 0, 100);
    sim.resources.discontent = clamp(sim.resources.discontent, 0, 100);
  }

  const pop = sim.citizens.length;
  if (sim.progress >= 1) {
    sim.ended = true;
    sim.endReason = 'survived';
    sim.message = 'الفجر… نجوتُم من الليلة الأولى.';
    return;
  }
  if (sim.resources.hope <= 0) {
    sim.ended = true;
    sim.endReason = 'hope_lost';
    sim.message = 'انطفأ الأمل. تفرّقت المستوطنة.';
    return;
  }
  if (sim.resources.discontent >= 100) {
    sim.ended = true;
    sim.endReason = 'discontent_revolt';
    sim.message = 'تمرّد الجياع على المولّد.';
    return;
  }
  if (deadCold + deadHealth >= pop * 0.45) {
    sim.ended = true;
    sim.endReason = sim.stormActive ? 'storm' : 'frozen';
    sim.message = sim.stormActive
      ? 'العاصفة حصدت المستوطنة.'
      : 'الصقيع حصد أرواحًا كثيرة.';
    return;
  }
  if (deadHunger >= pop * 0.5) {
    sim.ended = true;
    sim.endReason = 'starved';
    sim.message = 'الجوع أنهى القصة.';
    return;
  }

  void freezingCount;
}
