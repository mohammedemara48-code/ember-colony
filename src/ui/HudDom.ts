/** DOM overlay HUD — Frostpunk-inspired industrial Arabic RTL panels. */
import { BUILD_RECIPES } from '../sim/config';
import type { BuildingKind, LawState } from '../sim/types';

export interface HudData {
  coal: number;
  wood: number;
  food: number;
  steel: number;
  hope: number;
  discontent: number;
  dayIndex: number;
  isNight: boolean;
  ambientTemp: number;
  progress: number;
  citizensAlive: number;
  citizensFreezing: number;
  generatorOn: boolean;
  generatorLevel: number;
  message: string | null;
  muted: boolean;
  thought: string | null;
  thoughtName: string | null;
  laws: LawState;
  stormActive: boolean;
  buildMode: BuildingKind | null;
  showHeat: boolean;
}

export class HudDom {
  root: HTMLDivElement;
  private bars: Record<string, HTMLElement> = {};
  private vals: Record<string, HTMLElement> = {};
  private msgEl: HTMLElement;
  private thoughtEl: HTMLElement;
  private timeEl: HTMLElement;
  private lawsEl: HTMLElement;
  private buildEl: HTMLElement;
  private muteBtn: HTMLButtonElement;
  private loginBtn: HTMLButtonElement;
  private boostBtn: HTMLButtonElement;
  private heatBtn: HTMLButtonElement;
  private lawsBtn: HTMLButtonElement;
  private buildBtn: HTMLButtonElement;

  onMute: (() => void) | null = null;
  onBoost: (() => void) | null = null;
  onLogin: (() => void) | null = null;
  onToggleHeat: (() => void) | null = null;
  onSelectBuild: ((kind: BuildingKind | null) => void) | null = null;
  onEnactLaw: ((id: string) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'game-hud';
    this.root.innerHTML = `
      <div class="hud-top panel">
        <div class="hud-res">
          <span class="chip" title="فحم"><i class="ico coal"></i> <b data-v="coal">0</b></span>
          <span class="chip" title="خشب"><i class="ico wood"></i> <b data-v="wood">0</b></span>
          <span class="chip" title="طعام"><i class="ico food"></i> <b data-v="food">0</b></span>
          <span class="chip" title="فولاذ"><i class="ico steel"></i> <b data-v="steel">0</b></span>
        </div>
        <div class="hud-time" data-el="time">اليوم 1</div>
        <div class="hud-actions">
          <button type="button" data-act="build" class="accent">🏗 بناء</button>
          <button type="button" data-act="laws">⚖ قوانين</button>
          <button type="button" data-act="heat">🌡 دفء</button>
          <button type="button" data-act="boost">🔥 تعزيز</button>
          <button type="button" data-act="mute">🔊</button>
          <button type="button" data-act="login" class="login">دخول قريبًا</button>
        </div>
      </div>
      <div class="hud-mood panel">
        <div class="mood-row"><span>أمل</span><div class="bar"><i data-bar="hope"></i></div><b data-v="hope">0</b></div>
        <div class="mood-row"><span>سخط</span><div class="bar disc"><i data-bar="discontent"></i></div><b data-v="discontent">0</b></div>
        <div class="progress-wrap"><span class="prog-label">حتى الفجر</span><div class="progress"><i data-bar="progress"></i></div></div>
        <div class="citizens" data-el="cits"></div>
      </div>
      <div class="hud-build panel hidden" data-el="build">
        <div class="panel-title">وضع البناء <button type="button" data-act="build-close" class="x">✕</button></div>
        <div class="build-grid"></div>
        <p class="hint">اختر مبنى ثم انقر على الخريطة. انقر يمين أو ✕ للإلغاء.</p>
      </div>
      <div class="hud-laws panel hidden" data-el="laws">
        <div class="panel-title">لوحة القوانين <button type="button" data-act="laws-close" class="x">✕</button></div>
        <div class="laws-list"></div>
        <div class="laws-active" data-el="laws-active"></div>
      </div>
      <div class="hud-msg" data-el="msg"></div>
      <div class="hud-thought hidden" data-el="thought"></div>
    `;
    parent.appendChild(this.root);

    const grid = this.root.querySelector('.build-grid')!;
    for (const r of BUILD_RECIPES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'build-card';
      btn.dataset.kind = r.kind;
      btn.innerHTML = `<strong>${r.labelAr}</strong><small>🪵${r.wood} ⬛${r.coal}${r.food ? ' 🍲' + r.food : ''}${r.steel ? ' ⚙' + r.steel : ''}</small>`;
      btn.onclick = () => this.onSelectBuild?.(r.kind);
      grid.appendChild(btn);
    }

    const lawsList = this.root.querySelector('.laws-list')!;
    const lawDefs = [
      { id: 'emergency', label: 'نوبة طوارئ', desc: '+إنتاج / +سخط' },
      { id: 'ration', label: 'تقنين طعام', desc: 'جوع أبطأ / +سخط' },
      { id: 'faith', label: 'حرّاس الإيمان', desc: '−5 فحم / +أمل' },
      { id: 'radical', label: 'علاج جذري', desc: '+صحة / +سخط' },
    ];
    for (const L of lawDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'law-card';
      btn.dataset.law = L.id;
      btn.innerHTML = `<strong>${L.label}</strong><small>${L.desc}</small>`;
      btn.onclick = () => this.onEnactLaw?.(L.id);
      lawsList.appendChild(btn);
    }

    this.root.querySelectorAll('[data-v]').forEach((el) => {
      this.vals[(el as HTMLElement).dataset.v!] = el as HTMLElement;
    });
    this.root.querySelectorAll('[data-bar]').forEach((el) => {
      this.bars[(el as HTMLElement).dataset.bar!] = el as HTMLElement;
    });
    this.msgEl = this.root.querySelector('[data-el="msg"]')!;
    this.thoughtEl = this.root.querySelector('[data-el="thought"]')!;
    this.timeEl = this.root.querySelector('[data-el="time"]')!;
    this.lawsEl = this.root.querySelector('[data-el="laws"]')!;
    this.buildEl = this.root.querySelector('[data-el="build"]')!;
    this.muteBtn = this.root.querySelector('[data-act="mute"]')!;
    this.loginBtn = this.root.querySelector('[data-act="login"]')!;
    this.boostBtn = this.root.querySelector('[data-act="boost"]')!;
    this.heatBtn = this.root.querySelector('[data-act="heat"]')!;
    this.lawsBtn = this.root.querySelector('[data-act="laws"]')!;
    this.buildBtn = this.root.querySelector('[data-act="build"]')!;

    this.muteBtn.onclick = () => this.onMute?.();
    this.loginBtn.onclick = () => this.onLogin?.();
    this.boostBtn.onclick = () => this.onBoost?.();
    this.heatBtn.onclick = () => this.onToggleHeat?.();
    this.lawsBtn.onclick = () => {
      this.lawsEl.classList.toggle('hidden');
      this.buildEl.classList.add('hidden');
    };
    this.buildBtn.onclick = () => {
      this.buildEl.classList.toggle('hidden');
      this.lawsEl.classList.add('hidden');
    };
    this.root.querySelector('[data-act="build-close"]')!.addEventListener('click', () => {
      this.buildEl.classList.add('hidden');
      this.onSelectBuild?.(null);
    });
    this.root.querySelector('[data-act="laws-close"]')!.addEventListener('click', () => {
      this.lawsEl.classList.add('hidden');
    });
  }

  update(d: HudData) {
    this.vals.coal!.textContent = String(Math.floor(d.coal));
    this.vals.wood!.textContent = String(Math.floor(d.wood));
    this.vals.food!.textContent = String(Math.floor(d.food));
    this.vals.steel!.textContent = String(Math.floor(d.steel));
    this.vals.hope!.textContent = String(Math.floor(d.hope));
    this.vals.discontent!.textContent = String(Math.floor(d.discontent));
    this.bars.hope!.style.width = `${d.hope}%`;
    this.bars.discontent!.style.width = `${d.discontent}%`;
    this.bars.progress!.style.width = `${d.progress * 100}%`;

    const phase = d.stormActive ? 'عاصفة' : d.isNight ? 'ليل' : 'نهار';
    this.timeEl.textContent = `اليوم ${d.dayIndex} · ${phase} · ${Math.round(d.ambientTemp)}° · سكان ${d.citizensAlive}${
      d.citizensFreezing ? ` · ❄${d.citizensFreezing}` : ''
    }${d.generatorOn ? ` · مولّد L${d.generatorLevel}` : ' · ⚠ المولّد متوقف'}`;

    this.muteBtn.textContent = d.muted ? '🔇' : '🔊';
    this.heatBtn.classList.toggle('on', d.showHeat);
    this.buildBtn.classList.toggle('on', !!d.buildMode);

    this.root.querySelectorAll('.build-card').forEach((el) => {
      const kind = (el as HTMLElement).dataset.kind;
      el.classList.toggle('selected', kind === d.buildMode);
    });

    const active = this.root.querySelector('[data-el="laws-active"]')!;
    const flags = [
      d.laws.emergencyShift && 'نوبة طوارئ',
      d.laws.childLabour && 'عمل أطفال',
      d.laws.foodRation && 'تقنين',
      d.laws.radicalTreatment && 'علاج جذري',
      d.laws.faithKeepers && 'حرّاس الإيمان',
    ].filter(Boolean);
    active.textContent = flags.length ? `نشط: ${flags.join(' · ')}` : 'لا قوانين مفعّلة يدويًا بعد';

    if (d.message) {
      this.msgEl.textContent = d.message;
      this.msgEl.classList.add('show');
    } else {
      this.msgEl.classList.remove('show');
    }

    if (d.thought && d.thoughtName) {
      this.thoughtEl.innerHTML = `<strong>${d.thoughtName}</strong><br/>${d.thought}`;
      this.thoughtEl.classList.remove('hidden');
    } else {
      this.thoughtEl.classList.add('hidden');
    }
  }

  destroy() {
    this.root.remove();
  }
}

export function ensureHudStyles() {
  if (document.getElementById('ember-hud-css')) return;
  const link = document.createElement('link');
  link.id = 'ember-hud-css';
  link.rel = 'stylesheet';
  link.href = '/hud.css';
  document.head.appendChild(link);
}
