/*
  Entrada unificada: teclado, controle (Gamepad API) e botões de toque.
  O resto do jogo só pergunta por "ações" (left, jump, pause...), nunca por teclas.
*/

const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump', 'confirm'], KeyZ: ['jump'], KeyK: ['jump'],
  KeyX: ['action'], KeyJ: ['action'], ShiftLeft: ['action'], ShiftRight: ['action'], KeyC: ['action'],
  Enter: ['confirm', 'pause'], NumpadEnter: ['confirm'],
  Escape: ['pause', 'back'], KeyP: ['pause'], Backspace: ['back'],
  KeyM: ['mute'],
  KeyN: ['debugNext'], KeyG: ['debugGod'],
};

// código secreto: ↑ ↑ ↓ ↓ ← → ← →  (vida infinita)
const CHEAT = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
const DIRS = new Set(['up', 'down', 'left', 'right']);

export class Input {
  constructor() {
    this.held = new Set();
    this.justPressed = new Set();
    this.touchHeld = new Set();
    this.padPrev = new Set();
    this.lastDevice = 'keyboard';
    this.seq = []; // últimas direções apertadas (para o código secreto)

    addEventListener('keydown', (e) => {
      const acts = KEYMAP[e.code];
      if (!acts) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
      this.lastDevice = 'keyboard';
      for (const a of acts) {
        if (!e.repeat && !this.held.has(a)) this.press(a);
        this.held.add(a);
      }
    });
    addEventListener('keyup', (e) => {
      const acts = KEYMAP[e.code];
      if (acts) for (const a of acts) this.held.delete(a);
    });
    // se a janela perde o foco, solta tudo (evita personagem "andando sozinho")
    addEventListener('blur', () => this.held.clear());
  }

  /** chamado uma vez por quadro, antes da lógica do jogo */
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(14) || ax < -0.4) now.add('left');
      if (b(15) || ax > 0.4) now.add('right');
      if (b(12) || ay < -0.6) now.add('up');
      if (b(13) || ay > 0.6) now.add('down');
      if (b(0)) { now.add('jump'); now.add('confirm'); }
      if (b(2) || b(1)) now.add('action');
      if (b(1)) now.add('back');
      if (b(9)) now.add('pause');
    }
    for (const a of now) if (!this.padPrev.has(a)) { this.press(a); this.lastDevice = 'gamepad'; }
    this.padHeld = now;
    this.padPrev = now;
  }

  press(a) {
    this.justPressed.add(a);
    if (DIRS.has(a)) {
      this.seq.push(a);
      if (this.seq.length > 12) this.seq.shift();
    }
  }

  /** true uma única vez quando a sequência secreta acabou de ser digitada */
  cheatEntered() {
    const n = CHEAT.length;
    if (this.seq.length < n) return false;
    const tail = this.seq.slice(-n);
    if (tail.every((a, i) => a === CHEAT[i])) {
      this.seq = [];
      return true;
    }
    return false;
  }

  isDown(a) {
    return this.held.has(a) || this.touchHeld.has(a) || (this.padHeld && this.padHeld.has(a));
  }

  pressed(a) {
    return this.justPressed.has(a);
  }

  /** descarta os "acabou de apertar" (fim do quadro ou troca de tela) */
  endFrame() {
    this.justPressed.clear();
  }

  clear() {
    this.justPressed.clear();
    this.held.clear();
    this.touchHeld.clear();
  }

  // --- toque ---
  touchDown(a) {
    if (!this.touchHeld.has(a)) this.press(a);
    this.touchHeld.add(a);
    this.lastDevice = 'touch';
  }
  touchUp(a) {
    this.touchHeld.delete(a);
  }
}
