/** Tiny Web Audio SFX — no external assets required. */

let ctx: AudioContext | null = null;
let muted = false;
let master = 0.22;

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function beep(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.2,
  freqEnd?: number,
) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(master * gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const Sfx = {
  click() {
    beep(520, 0.06, 'triangle', 0.15);
  },
  start() {
    beep(220, 0.12, 'sawtooth', 0.12, 440);
    setTimeout(() => beep(440, 0.15, 'triangle', 0.1, 660), 100);
  },
  event() {
    beep(180, 0.2, 'square', 0.1);
    setTimeout(() => beep(140, 0.25, 'square', 0.08), 120);
  },
  cold() {
    beep(900, 0.4, 'sine', 0.06, 200);
  },
  win() {
    beep(330, 0.15, 'triangle', 0.12, 440);
    setTimeout(() => beep(440, 0.15, 'triangle', 0.12, 550), 140);
    setTimeout(() => beep(660, 0.25, 'triangle', 0.12), 280);
  },
  lose() {
    beep(300, 0.3, 'sawtooth', 0.1, 80);
  },
  place() {
    beep(380, 0.08, 'square', 0.08);
  },
};
