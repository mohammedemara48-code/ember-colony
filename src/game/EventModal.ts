import type { GameEvent } from '../sim/types';
import { Sfx } from '../audio/Sfx';

/** Frostpunk-style decision modal — Arabic RTL. */
export class EventModal {
  root: HTMLDivElement;
  onChoose: ((choiceId: string) => void) | null = null;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'event-modal';
    this.root.className = 'hidden';
    this.root.innerHTML = `
      <div class="backdrop"></div>
      <div class="card">
        <div class="badge">قرار</div>
        <h2 data-el="title"></h2>
        <p data-el="body"></p>
        <div class="choices" data-el="choices"></div>
      </div>
    `;
    parent.appendChild(this.root);
    if (!document.getElementById('ember-modal-css')) {
      const s = document.createElement('style');
      s.id = 'ember-modal-css';
      s.textContent = `
        #event-modal { position:fixed; inset:0; z-index:40; direction:rtl;
          font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",Arial,sans-serif; }
        #event-modal.hidden { display:none; }
        #event-modal .backdrop { position:absolute; inset:0; background:rgba(4,10,18,.72); backdrop-filter:blur(3px); }
        #event-modal .card {
          position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
          width:min(440px,92vw); background:linear-gradient(165deg,#152838,#0c1826);
          border:1px solid #4a7aa0; border-radius:16px; padding:22px 24px;
          box-shadow:0 20px 50px rgba(0,0,0,.55), 0 0 40px rgba(80,140,200,.12);
          color:#e8f0f8;
        }
        #event-modal .badge {
          display:inline-block; font-size:11px; letter-spacing:.04em;
          background:#2a5080; color:#9ad0ff; padding:3px 10px; border-radius:999px; margin-bottom:8px;
        }
        #event-modal h2 { margin:0 0 10px; font-size:20px; color:#9ad0ff; }
        #event-modal p { margin:0 0 16px; font-size:14px; line-height:1.65; color:#c5d4e4; }
        #event-modal .choices { display:flex; flex-direction:column; gap:8px; }
        #event-modal .choices button {
          cursor:pointer; text-align:right; padding:12px 14px; border-radius:12px;
          border:1px solid #3a6088; background:linear-gradient(180deg,#1e3a55,#152a40);
          color:#e8f0f8; font-size:13px;
        }
        #event-modal .choices button:hover { border-color:#7ec8ff; background:#243f5c; }
      `;
      document.head.appendChild(s);
    }
  }

  show(ev: GameEvent) {
    this.visible = true;
    this.root.classList.remove('hidden');
    (this.root.querySelector('[data-el="title"]') as HTMLElement).textContent = ev.titleAr;
    (this.root.querySelector('[data-el="body"]') as HTMLElement).textContent = ev.bodyAr;
    const box = this.root.querySelector('[data-el="choices"]')!;
    box.innerHTML = '';
    for (const c of ev.choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = c.labelAr;
      btn.onclick = () => {
        Sfx.click();
        this.hide();
        this.onChoose?.(c.id);
      };
      box.appendChild(btn);
    }
  }

  hide() {
    this.visible = false;
    this.root.classList.add('hidden');
  }

  destroy() {
    this.root.remove();
  }
}
