/** Tick logic extracted to keep SimState.ts smaller for GitHub MCP pushes. */
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
    sim.eatTimer -= dt;
    sim.hopeTick -= dt;

    if (sim.generatorOn) {
      const burn = (0.35 + sim.generatorLevel * 0.2) * dt;
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
        sim.message = 'انحسرت موجة الصقيع… قليلًا.';
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
      sim.assignTimer = 1.2;
    }

    const mood = sim.moodWorkFactor();
    let freezingCount = 0;
    let deadHunger = 0;
    let deadCold = 0;

    for (const c of sim.citizens) {
      const heat = sim.heatAt(c.x, c.y);
      const ambient = sim.ambientTemp;
      const warmth = heat * 50 + ambient; // heat 1 => +50C offset vs ambient
      if (warmth < -10) {
        c.cold = Math.min(100, c.cold + dt * (8 + Math.abs(warmth + 10) * 0.15));
      } else {
        c.cold = Math.max(0, c.cold - dt * (6 + heat * 10));
      }

      c.hunger = Math.min(100, c.hunger + dt * 1.8);

      if (c.cold > 85) {
        c.state = 'freezing';
        freezingCount++;
      }

      if (c.path.length && c.pathIndex < c.path.length) {
        const target = c.path[c.pathIndex]!;
        const tx = target.x + 0.5;
        const ty = target.y + 0.5;
        const dx = tx - c.x;
        const dy = ty - c.y;
        const dist = Math.hypot(dx, dy);
        const step = c.speed * dt * (c.cold > 60 ? 0.7 : 1) * (c.hunger > 70 ? 0.85 : 1);
        if (dist <= step) {
          c.x = tx;
          c.y = ty;
          c.pathIndex++;
          if (c.pathIndex >= c.path.length) {
            c.path = [];
            if (c.state === 'eating') {
              if (sim.resources.food >= 1) {
                sim.resources.food -= 1;
                c.hunger = Math.max(0, c.hunger - 45);
              }
              c.state = 'idle';
            } else if (c.job !== 'none' && c.job !== 'rest') {
              c.state = 'working';
              c.workCooldown = 0.5;
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

      if (c.state === 'working' && c.workplaceId) {
        c.workCooldown -= dt;
        if (c.workCooldown <= 0) {
          c.workCooldown = 1.1 / mood;
          if (c.job === 'gather_wood') sim.resources.wood += 0.45 * mood;
          if (c.job === 'mine_coal') sim.resources.coal += 0.55 * mood;
          if (c.job === 'cook' && sim.resources.rawFood >= 0.4) {
            sim.resources.rawFood -= 0.4;
            sim.resources.food += 0.55 * mood;
          } else if (c.job === 'cook') {
            sim.resources.rawFood += 0.05;
          }
        }
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
    }

    if (sim.resources.wood > 2) {
    }

    if (sim.hopeTick <= 0) {
      sim.hopeTick = 2;
      const avgCold =
        sim.citizens.reduce((s: number, c: any) => s + c.cold, 0) / sim.citizens.length;
      const avgHunger =
        sim.citizens.reduce((s: number, c: any) => s + c.hunger, 0) / sim.citizens.length;
      if (avgCold > 50) sim.resources.hope -= 1.2;
      if (avgHunger > 55) sim.resources.hope -= 0.8;
      if (heatAvg(sim) > 0.35) sim.resources.hope += 0.6;
      if (sim.generatorOn) sim.resources.hope += 0.3;
      if (!sim.generatorOn) {
        sim.resources.hope -= 2;
        sim.resources.discontent += 1.5;
      }
      if (avgCold > 60) sim.resources.discontent += 1.2;
      if (sim.resources.food < 5) sim.resources.discontent += 0.8;
      if (sim.resources.hope > 70) sim.resources.discontent -= 0.4;

      sim.resources.hope = clamp(sim.resources.hope, 0, 100);
      sim.resources.discontent = clamp(sim.resources.discontent, 0, 100);
    }

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
    if (deadCold >= sim.citizens.length * 0.45) {
      sim.ended = true;
      sim.endReason = 'frozen';
      sim.message = 'الصقيع حصد أرواحًا كثيرة.';
      return;
    }
    if (deadHunger >= sim.citizens.length * 0.5) {
      sim.ended = true;
      sim.endReason = 'starved';
      sim.message = 'الجوع أنهى القصة.';
      return;
    }

    void freezingCount;
  
}
