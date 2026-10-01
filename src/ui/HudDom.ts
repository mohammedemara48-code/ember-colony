/** DOM overlay HUD — Arabic RTL. */

export interface HudData {
  coal: number;
  wood: number;
  food: number;
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
}

export class HudDom {
  root: HTMLDivElement;
  private bars: Record<string, HTMLElement> = {};
  private vals: Record<string, HTMLElement> = {};
  private msgEl: HTMLElement;
  private thoughtEl: HTMLElement;
  private timeEl: HTMLElement;
  private muteBtn: HTMLButtonElement;
  private loginBtn: HTMLButtonElement;
  private boostBtn: HTMLButtonElement;
  onMute: (() => void) | null = null;
  onBoost: (() => void) | null = null;
  onLogin: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'game-hud';
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-res">
          <span title="فحم">⬛ <b data-v="coal">0</b></span>
          <span title="خشب">🪵 <b data-v="wood">0</b></span>
          <span title="طعام">🍲 <b data-v="food">0</b></span>
        </div>
        <div class="hud-time" data-el="time">اليوم 1 · −20°</div>
        <div class="hud-actions">
          <button type="button" data-act="boost" title="تعزيز المولّد">🔥 تعزيز</button>
          <button type="button" data-act="mute" title="كتم">🔊</button>
          <button type="button" data-act="login" class="login">تسجيل الدخول قريبًا</button>
        </div>
      </div>
      <div class="hud-mood">
        <div class="mood-row"><span>أمل</span><div class="bar"><i data-bar="hope"></i></div><b data-v="hope">0</b></div>
        <div class="mood-row"><span>سخط</span><div class="bar disc"><i data-bar="discontent"></i></div><b data-v="discontent">0</b></div>
        <div class="progress"><i data-bar="progress"></i></div>
        <div class="citizens" data-el="cits"></div>
      </div>
      <div class="hud-msg" data-el="msg"></div>
      <div class="hud-thought hidden" data-el="thought"></div>
    `;
    parent.appendChild(this.root);

    this.root.querySelectorAll('[data-v]').forEach((el) => {
      this.vals[(el as HTMLElement).dataset.v!] = el as HTMLElement;
    });
    this.root.querySelectorAll('[data-bar]').forEach((el) => {
      this.bars[(el as HTMLElement).dataset.bar!] = el as HTMLElement;
    });
    this.msgEl = this.root.querySelector('[data-el="msg"]')!;
    this.thoughtEl = this.root.querySelector('[data-el="thought"]')!;
    this.timeEl = this.root.querySelector('[data-el="time"]')!;
    this.muteBtn = this.root.querySelector('[data-act="mute"]')!;
    this.loginBtn = this.root.querySelector('[data-act="login"]')!;
    this.boostBtn = this.root.querySelector('[data-act="boost"]')!;

    this.muteBtn.onclick = () => this.onMute?.();
    this.loginBtn.onclick = () => this.onLogin?.();
    this.boostBtn.onclick = () => this.onBoost?.();
  }

  update(d: HudData) {
    this.vals.coal!.textContent = String(Math.floor(d.coal));
    this.vals.wood!.textContent = String(Math.floor(d.wood));
    this.vals.food!.textContent = String(Math.floor(d.food));
    this.vals.hope!.textContent = String(Math.floor(d.hope));
    this.vals.discontent!.textContent = String(Math.floor(d.discontent));
    this.bars.hope!.style.width = `${d.hope}%`;
    this.bars.discontent!.style.width = `${d.discontent}%`;
    this.bars.progress!.style.width = `${d.progress * 100}%`;
    const phase = d.isNight ? 'ليل' : 'نهار';
    this.timeEl.textContent = `اليوم ${d.dayIndex} · ${phase} · ${Math.round(d.ambientTemp)}° · سكان ${d.citizensAlive}${d.citizensFreezing ? ` · متجمدون ${d.citizensFreezing}` : ''}${d.generatorOn ? ` · مولّد L${d.generatorLevel}` : ' · المولّد متوقف!'}`;
    this.muteBtn.textContent = d.muted ? '🔇' : '🔊';
    if (d.message) {
      this.msgEl.textContent = d.message;
      this.msgEl.classList.add('show');
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
    #game-hud .hud-top {
      display: flex; justify-content: space-between; align-items: center;
      gap: 8px; padding: 10px 14px;
      background: linear-gradient(180deg, rgba(8,18,30,.92), rgba(8,18,30,.35));
      pointer-events: auto;
    }
    #game-hud .hud-res span { margin-inline-start: 14px; font-size: 14px; }
    #game-hud .hud-time { font-size: 13px; opacity: .95; text-align: center; flex: 1; }
    #game-hud .hud-actions button {
      pointer-events: auto; margin-inline-start: 6px; cursor: pointer;
      background: #1a3050; color: #d6e6f5; border: 1px solid #3a5a7a;
      border-radius: 8px; padding: 6px 10px; font-size: 12px;
    }
    #game-hud .hud-actions button.login { background: #243040; opacity: .85; }
    #game-hud .hud-mood {
      width: min(360px, 92vw); margin: 8px 14px; pointer-events: none;
      background: rgba(10,20,34,.72); border: 1px solid #2a4058; border-radius: 10px;
      padding: 8px 12px; font-size: 12px;
    }
    #game-hud .mood-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    #game-hud .mood-row span { width: 36px; }
    #game-hud .mood-row b { width: 28px; text-align: left; }
    #game-hud .bar {
      flex: 1; height: 8px; background: #1a2838; border-radius: 4px; overflow: hidden;
    }
    #game-hud .bar i { display: block; height: 100%; width: 0; background: #3ecf8e; transition: width .2s; }
    #game-hud .bar.disc i { background: #e05555; }
    #game-hud .progress {
      margin-top: 6px; height: 5px; background: #1a2838; border-radius: 3px; overflow: hidden;
    }
    #game-hud .progress i { display:block; height:100%; background: linear-gradient(90deg,#4a90d9,#f0c060); width:0; }
    #game-hud .hud-msg {
      position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
      background: rgba(12,24,40,.88); border: 1px solid #3a6080; border-radius: 10px;
      padding: 8px 16px; font-size: 13px; max-width: 90vw; opacity: 0; transition: opacity .3s;
      pointer-events: none; text-align: center;
    }
    #game-hud .hud-msg.show { opacity: 1; }
    #game-hud .hud-thought {
      position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%);
      background: rgba(20,36,56,.94); border: 1px solid #5a8ab0; border-radius: 12px;
      padding: 10px 16px; font-size: 13px; max-width: min(420px, 90vw); text-align: center;
      pointer-events: none; box-shadow: 0 8px 24px rgba(0,0,0,.35);
    }
    #game-hud .hud-thought.hidden { display: none; }
    #game-hud .hud-thought strong { color: #9ad0ff; }
  `;
  document.head.appendChild(s);
}
