/** DOM overlay HUD — Arabic RTL game panels (not raw HTML chrome). */
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
  const s = document.createElement('style');
  s.id = 'ember-hud-css';
  s.textContent = `
    #game-hud {
      position: fixed; inset: 0; pointer-events: none; z-index: 20;
      font-family: "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif;
      color: #e8f0f8; direction: rtl;
    }
    #game-hud .panel {
      background: linear-gradient(160deg, rgba(14,28,46,.94), rgba(10,20,34,.88));
      border: 1px solid rgba(90,140,180,.45);
      box-shadow: 0 8px 28px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
      border-radius: 14px;
    }
    #game-hud .hud-top {
      display: flex; justify-content: space-between; align-items: center;
      gap: 8px; margin: 10px 12px; padding: 10px 14px; pointer-events: auto;
      flex-wrap: wrap;
    }
    #game-hud .chip {
      display: inline-flex; align-items: center; gap: 4px;
      margin-inline-start: 10px; font-size: 13px;
      background: rgba(20,40,60,.65); padding: 4px 10px; border-radius: 999px;
      border: 1px solid rgba(70,110,150,.35);
    }
    #game-hud .ico { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    #game-hud .ico.coal { background: #2a2a32; box-shadow: 0 0 0 1px #555; }
    #game-hud .ico.wood { background: #8a6a40; }
    #game-hud .ico.food { background: #c07040; }
    #game-hud .ico.steel { background: #8aa0b8; }
    #game-hud .hud-time { font-size: 12px; opacity: .95; text-align: center; flex: 1; min-width: 180px; }
    #game-hud .hud-actions button {
      pointer-events: auto; margin: 2px; cursor: pointer;
      background: linear-gradient(180deg, #2a4a6a, #1a3050);
      color: #d6e6f5; border: 1px solid #4a7aaa;
      border-radius: 10px; padding: 7px 11px; font-size: 12px;
      box-shadow: 0 2px 0 #0a1828;
    }
    #game-hud .hud-actions button.accent { background: linear-gradient(180deg, #3a6a50, #1e4030); border-color: #5a9a70; }
    #game-hud .hud-actions button.on { outline: 2px solid #7ec8ff; }
    #game-hud .hud-actions button.login { opacity: .8; background: #243040; }
    #game-hud .hud-mood {
      width: min(340px, 92vw); margin: 0 12px; padding: 10px 14px; font-size: 12px;
    }
    #game-hud .mood-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    #game-hud .mood-row span { width: 36px; }
    #game-hud .mood-row b { width: 28px; text-align: left; }
    #game-hud .bar { flex: 1; height: 9px; background: #121c28; border-radius: 5px; overflow: hidden; border: 1px solid #243448; }
    #game-hud .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg,#2aa86a,#5ee0a0); transition: width .2s; }
    #game-hud .bar.disc i { background: linear-gradient(90deg,#a03030,#e07060); }
    #game-hud .progress-wrap { margin-top: 8px; }
    #game-hud .prog-label { font-size: 10px; opacity: .7; }
    #game-hud .progress { height: 6px; background: #121c28; border-radius: 3px; overflow: hidden; border: 1px solid #243448; }
    #game-hud .progress i { display:block; height:100%; background: linear-gradient(90deg,#3a78c0,#f0b050,#f08040); width:0; }
    #game-hud .hud-build, #game-hud .hud-laws {
      position: absolute; top: 70px; left: 12px; width: min(320px, 90vw);
      padding: 12px; pointer-events: auto; z-index: 25;
    }
    #game-hud .panel-title { font-weight: 700; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center; color:#9ad0ff; }
    #game-hud .x { background:transparent; border:none; color:#aac; cursor:pointer; font-size:16px; }
    #game-hud .build-grid, #game-hud .laws-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #game-hud .build-card, #game-hud .law-card {
      background: rgba(20,36,56,.9); border: 1px solid #3a5a7a; border-radius: 10px;
      padding: 8px; cursor: pointer; color: #e8f0f8; text-align: right;
    }
    #game-hud .build-card strong, #game-hud .law-card strong { display:block; font-size:13px; }
    #game-hud .build-card small, #game-hud .law-card small { opacity:.75; font-size:11px; }
    #game-hud .build-card.selected { border-color: #7ec8ff; box-shadow: 0 0 0 2px rgba(126,200,255,.35); }
    #game-hud .hint { font-size: 11px; opacity: .65; margin: 8px 0 0; }
    #game-hud .laws-active { margin-top: 10px; font-size: 11px; color: #9ad0ff; }
    #game-hud .hidden { display: none !important; }
    #game-hud .hud-msg {
      position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
      background: rgba(12,24,40,.92); border: 1px solid #4a80a8; border-radius: 12px;
      padding: 10px 18px; font-size: 13px; max-width: 90vw; opacity: 0; transition: opacity .3s;
      pointer-events: none; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,.35);
    }
    #game-hud .hud-msg.show { opacity: 1; }
    #game-hud .hud-thought {
      position: absolute; bottom: 72px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(160deg, rgba(24,44,68,.96), rgba(16,28,44,.94));
      border: 1px solid #5a9ac8; border-radius: 14px;
      padding: 12px 18px; font-size: 13px; max-width: min(420px, 90vw); text-align: center;
      pointer-events: none; box-shadow: 0 10px 28px rgba(0,0,0,.4);
    }
    #game-hud .hud-thought strong { color: #9ad0ff; }
  `;
  document.head.appendChild(s);
}
