import { Sfx } from '../audio/Sfx';
import type { GameEvent } from '../sim/types';

export class EventModal {
  el: HTMLDivElement;
  onChoose: ((choiceId: string) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'event-modal';
    this.el.className = 'hidden';
    parent.appendChild(this.el);
    ensureEventStyles();
  }

  show(ev: GameEvent) {
    Sfx.event();
    if (ev.kind === 'cold_snap') Sfx.cold();
    this.el.className = '';
    this.el.innerHTML = `
      <div class="panel">
        <div class="badge">${ev.kind === 'law' ? 'قانون' : 'حدث'}</div>
        <h2>${ev.titleAr}</h2>
        <p>${ev.bodyAr}</p>
        <div class="choices"></div>
      </div>
    `;
    const box = this.el.querySelector('.choices')!;
    for (const c of ev.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.labelAr;
      b.onclick = () => {
        Sfx.click();
        this.hide();
        this.onChoose?.(c.id);
      };
      box.appendChild(b);
    }
  }

  hide() {
    this.el.className = 'hidden';
    this.el.innerHTML = '';
  }

  destroy() {
    this.el.remove();
  }
}

function ensureEventStyles() {
  if (document.getElementById('ember-event-css')) return;
  const s = document.createElement('style');
  s.id = 'ember-event-css';
  s.textContent = `
    #event-modal {
      position: fixed; inset: 0; z-index: 40; display: flex;
      align-items: center; justify-content: center;
      background: rgba(4,10,18,.72); direction: rtl;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    }
    #event-modal.hidden { display: none; }
    #event-modal .panel {
      width: min(480px, 92vw); background: linear-gradient(160deg,#152840,#0c1828);
      border: 1px solid #3a6a90; border-radius: 16px; padding: 22px 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,.5); color: #e8f0f8;
    }
    #event-modal .badge {
      display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 999px;
      background: #2a5080; color: #b8d8f8; margin-bottom: 10px;
    }
    #event-modal h2 { margin: 0 0 10px; font-size: 22px; color: #9ad0ff; }
    #event-modal p { margin: 0 0 18px; line-height: 1.65; color: #c8d8e8; font-size: 14px; }
    #event-modal .choices { display: flex; flex-direction: column; gap: 8px; }
    #event-modal button {
      cursor: pointer; text-align: right; padding: 12px 14px; border-radius: 10px;
      border: 1px solid #3a5a78; background: #1a3050; color: #e8f0f8; font-size: 14px;
    }
    #event-modal button:hover { background: #244870; border-color: #5a90c0; }
  `;
  document.head.appendChild(s);
}
