import * as THREE from 'three';
import { GROUP, COURSE } from '../credits.js';

/*
  Interface em HTML/CSS por cima do canvas: HUD, menus, diálogos, janelas de dica,
  faixa de título da fase, barra do chefe, pontos flutuantes e botões de toque.
  Os menus são navegados pelas mesmas ações do Input (teclado, controle ou toque).
*/

import { assets } from './Assets.js';

/** recorte de um frame do atlas como imagem CSS (usado em retratos e ícones do HUD) */
export function spriteHTML(atlasName, frameName, size = 32, extraStyle = '') {
  const a = assets.atlas[atlasName];
  const f = a?.frames[frameName];
  if (!f) return '';
  const k = size / Math.max(f.w, f.h);
  return `<span class="spr" style="width:${f.w * k}px;height:${f.h * k}px;background-image:url(${a.url});background-size:${a.width * k}px ${a.height * k}px;background-position:-${f.x * k}px -${f.y * k}px;${extraStyle}"></span>`;
}

// retratos dos personagens nos diálogos (todos vindos dos atlas do Kenney)
const PORTRAITS = {
  Hans: { atlas: 'tiles', frame: 'hud_player_helmet_green', bg: '#2f6b4f' },
  'Comandante Inger': { atlas: 'tiles', frame: 'hud_player_helmet_beige', bg: '#6b5236' },
  Kjell: { atlas: 'tiles', frame: 'hud_player_helmet_beige', bg: '#7a5a2a' },
  'Tio Ole': { atlas: 'tiles', frame: 'hud_player_helmet_beige', bg: '#6b3a1a' },
  'Relojoeiro Per': { atlas: 'tiles', frame: 'hud_player_helmet_pink', bg: '#3a4a6b' },
  Kari: { atlas: 'tiles', frame: 'hud_player_helmet_pink', bg: '#7a3c6a' },
  'Vovó Marit': { atlas: 'tiles', frame: 'hud_player_helmet_purple', bg: '#4b3a7a' },
  Lars: { atlas: 'tiles', frame: 'hud_player_helmet_yellow', bg: '#7a6020' },
  'Rei Knut': { atlas: 'enemies', frame: 'block_idle', bg: '#24435e', style: 'filter:saturate(.25) brightness(1.35) hue-rotate(160deg)' },
  Narrador: { atlas: 'tiles', frame: 'star', bg: '#2a2a48' },
};

function portraitHTML(who) {
  const p = PORTRAITS[who] || PORTRAITS.Narrador;
  return { bg: p.bg, html: spriteHTML(p.atlas, p.frame, 62, p.style || '') };
}

// cor da etiqueta com o nome de cada personagem (combina com a roupa do sprite)
const NAME_COLORS = { pink: '#c2185b', beige: '#8a5a1a', purple: '#6a3fb5', yellow: '#a87400', green: '#2e7d32', blue: '#1f5fa8' };

const el = (tag, cls, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
};

export class UI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.menu = null;
    this.dialogState = null;
    this.pops = [];

    this.hud = el('div', 'hud hidden', `
      <div class="group">
        <div class="stat" data-k="hearts"></div>
        <div class="stat">${spriteHTML('tiles', 'hud_player_green', 26)}<span data-k="lives"></span></div>
        <div class="stat">${spriteHTML('tiles', 'hud_coin', 26)}<span data-k="coins"></span></div>
        <div class="stat" data-k="keyBox">${spriteHTML('tiles', 'hud_key_yellow', 26)}<span data-k="keys"></span></div>
      </div>
      <div class="center"><div data-k="level"></div><div data-k="score"></div></div>
      <div class="group"><div class="stat swt hidden" data-k="swBox">${spriteHTML('tiles', 'switch_blue', 22)}<span data-k="sw"></span></div><div class="stat time" data-k="timeBox">TEMPO <span data-k="time"></span></div></div>`);
    this.hint = el('div', 'hint hidden');
    this.toastEl = el('div', 'toast hidden');
    this.bossbar = el('div', 'bossbar hidden', '<div data-k="name"></div><div class="track"><div class="fill"></div></div>');
    this.popLayer = el('div', '');
    this.screen = el('div', 'screen hidden interactive');
    this.dialogEl = el('div', 'dialog hidden interactive', '<div class="portrait"></div><div class="body"><div class="who"></div><div class="text"></div></div><div class="next">▼</div>');
    this.fadeEl = el('div', 'fade');
    this.bannerHolder = el('div', '');
    for (const e of [this.hud, this.hint, this.bossbar, this.popLayer, this.bannerHolder, this.dialogEl, this.screen, this.toastEl, this.fadeEl]) root.appendChild(e);
    this.q = (parent, k) => parent.querySelector(`[data-k="${k}"]`);
    this.dialogEl.addEventListener('pointerdown', () => this.advanceDialog());
    this.buildTouch();
  }

  // ================= HUD =================
  showHUD(on) {
    this.hud.classList.toggle('hidden', !on);
    this.touch?.classList.toggle('hidden', !on || !this.isTouch);
    this.touchPause?.classList.toggle('hidden', !on || !this.isTouch);
    if (!on) {
      this.hint.classList.add('hidden');
      this.hideToast?.();
      this.bossbar.classList.add('hidden');
    }
  }

  updateHUD() {
    const g = this.game, s = g.session, p = g.player;
    const heartsKey = p.hearts + '/' + p.maxHearts;
    if (this._hearts !== heartsKey) {
      this._hearts = heartsKey;
      let h = '';
      for (let i = 0; i < p.maxHearts; i++) h += spriteHTML('tiles', i < p.hearts ? 'hud_heart' : 'hud_heart_empty', 28);
      this.q(this.hud, 'hearts').innerHTML = h;
    }
    this.q(this.hud, 'lives').textContent = g.cheatLife ? 'x∞' : 'x' + s.lives;
    const sw = g.switchLeft > 0 ? Math.ceil(g.switchLeft) : 0;
    this.q(this.hud, 'swBox').classList.toggle('hidden', !sw);
    if (sw) this.q(this.hud, 'sw').textContent = sw;
    this.q(this.hud, 'coins').textContent = String(s.coins).padStart(2, '0');
    this.q(this.hud, 'keys').textContent = 'x' + s.keys;
    this.q(this.hud, 'keyBox').classList.toggle('hidden', s.keys <= 0);
    this.q(this.hud, 'score').textContent = String(s.score).padStart(7, '0');
    this.q(this.hud, 'level').textContent = g.level ? g.level.def.name : '';
    const t = Math.max(0, Math.ceil(g.timeLeft));
    this.q(this.hud, 'time').textContent = String(t).padStart(3, '0');
    this.q(this.hud, 'timeBox').classList.toggle('low', t <= 60 && g.state === 'playing');
  }

  /**
   * balão do personagem perto do Hans. Aceita texto simples ou { who, color, text, talk }:
   * o NOME aparece numa etiqueta colorida, separado da fala, para dar para ler correndo.
   */
  showHint(info) {
    if (!info) return this.hint.classList.add('hidden');
    const key = typeof info === 'string' ? info : info.who + '|' + info.text;
    if (this._hintKey !== key) {
      this._hintKey = key;
      if (typeof info === 'string') this.hint.textContent = info;
      else {
        const c = NAME_COLORS[info.color] || NAME_COLORS.beige;
        this.hint.innerHTML = `<span class="who" style="background:${c}">${info.who}</span><span class="say">${info.text}</span>` +
          (info.talk ? '<span class="talk">↑ conversar</span>' : '');
      }
    }
    this.hint.classList.remove('hidden');
  }

  /**
   * janela de dica que aparece no alto da tela e some sozinha depois de alguns segundos
   * (substitui as antigas placas). O tempo na tela cresce com o tamanho do texto.
   */
  toast(html, { title = 'DICA', color = null, time = null } = {}) {
    const plain = html.replace(/<[^>]+>/g, '');
    const t = time ?? Math.min(9, Math.max(4, 2.5 + plain.length * 0.05));
    this.toastEl.innerHTML = `<div class="ttl"${color ? ` style="color:${color}"` : ''}>${title}</div><div class="txt">${html}</div><div class="bar"></div>`;
    this.toastEl.classList.remove('hidden', 'out');
    void this.toastEl.offsetWidth; // reinicia a animação de entrada
    this.toastEl.classList.add('in');
    this.toastState = { t, left: t };
  }

  hideToast() {
    this.toastState = null;
    this.toastEl.classList.add('hidden');
  }

  updateToast(dt) {
    const s = this.toastState;
    if (!s) return;
    s.left -= dt;
    const bar = this.toastEl.querySelector('.bar');
    if (bar) bar.style.width = Math.max(0, (100 * s.left) / s.t) + '%';
    if (s.left < 0.35) this.toastEl.classList.add('out');
    if (s.left <= 0) this.hideToast();
  }

  bossBar(name, hp, max) {
    if (!name) return this.bossbar.classList.add('hidden');
    this.bossbar.classList.remove('hidden');
    this.q(this.bossbar, 'name').textContent = name;
    this.bossbar.querySelector('.fill').style.width = (100 * hp) / max + '%';
  }

  banner(small, big, sub = '') {
    this.bannerHolder.innerHTML = '';
    this.bannerHolder.appendChild(el('div', 'banner', `<div class="small">${small}</div><div class="big">${big}</div><div class="sub">${sub}</div>`));
  }

  /** texto flutuante (+100) que acompanha uma posição do mundo 3D */
  popText(text, x, y, color = '#fff6e0') {
    const d = el('div', '', text);
    Object.assign(d.style, { position: 'absolute', fontSize: '11px', color, textShadow: '2px 2px 0 #000', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap' });
    this.popLayer.appendChild(d);
    this.pops.push({ d, x, y, t: 0 });
  }

  updatePops(dt) {
    const cam = this.game.camera;
    const v = new THREE.Vector3();
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      v.set(p.x, p.y + p.t * 1.5, 0).project(cam);
      p.d.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      p.d.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
      p.d.style.opacity = String(1 - Math.max(0, p.t - 0.5) / 0.4);
      if (p.t > 0.9) {
        p.d.remove();
        this.pops.splice(i, 1);
      }
    }
  }

  // ================= transição =================
  fade(on) {
    this.fadeEl.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 380));
  }

  // ================= menus =================
  /**
   * opts: { title, subtitle, html, items: [{label, action, disabled}], onBack, dim, press }
   */
  showMenu(opts) {
    this.menu = { ...opts, sel: 0 };
    const s = this.screen;
    s.className = 'screen interactive' + (opts.dim ? ' dim' : '');
    s.innerHTML = '';
    const panel = el('div', 'panel');
    if (opts.title) panel.appendChild(el('h1', 'title', opts.title));
    if (opts.subtitle) panel.appendChild(el('div', 'subtitle', opts.subtitle));
    if (opts.html) panel.appendChild(el('div', '', opts.html));
    if (opts.press) panel.appendChild(el('div', 'press', opts.press));
    const list = el('div', 'menu');
    this.menu.buttons = (opts.items || []).map((it, i) => {
      const b = el('button', '', it.label);
      b.disabled = !!it.disabled;
      b.addEventListener('pointermove', (e) => { if (e.movementX || e.movementY) this.select(i); });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.audio.unlock();
        this.select(i);
        this.activate();
      });
      list.appendChild(b);
      return b;
    });
    panel.appendChild(list);
    if (opts.footer) panel.appendChild(el('div', 'footer', opts.footer));
    s.appendChild(panel);
    s.onclick = opts.press ? () => { this.game.audio.unlock(); opts.onPress?.(); } : null;
    const first = this.menu.buttons.findIndex((b) => !b.disabled);
    this.select(Math.max(0, first), true);
  }

  /** troca o texto de um botão sem recriar o menu (mantém a seleção) */
  setLabel(i, text) {
    const m = this.menu;
    if (!m) return;
    m.items[i].label = text;
    m.buttons[i].innerHTML = text;
  }

  hideMenu() {
    this.menu = null;
    this.screen.classList.add('hidden');
    this.screen.innerHTML = '';
  }

  select(i, silent) {
    const m = this.menu;
    if (!m || !m.buttons.length) return;
    if (m.buttons[i]?.disabled) return;
    if (i !== m.sel && !silent) this.game.audio.sfx('menuMove');
    m.sel = i;
    m.buttons.forEach((b, j) => b.classList.toggle('sel', j === i));
  }

  move(d) {
    const m = this.menu;
    const n = m.buttons.length;
    if (!n) return;
    let i = m.sel;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!m.buttons[i].disabled) break;
    }
    this.select(i);
  }

  activate() {
    const m = this.menu;
    if (!m) return;
    const it = m.items?.[m.sel];
    if (it && !it.disabled) {
      this.game.audio.sfx('menuOk');
      it.action();
    }
  }

  // ================= diálogos =================
  /** mostra uma sequência de falas; resolve quando o jogador termina de ler */
  dialog(lines) {
    if (!lines || !lines.length) return Promise.resolve();
    return new Promise((resolve) => {
      this.dialogState = { lines, i: -1, resolve };
      this.dialogEl.classList.remove('hidden');
      this.nextLine();
    });
  }

  nextLine() {
    const d = this.dialogState;
    d.i++;
    if (d.i >= d.lines.length) return this.closeDialog();
    const line = d.lines[d.i];
    const p = portraitHTML(line.who);
    const portrait = this.dialogEl.querySelector('.portrait');
    portrait.innerHTML = p.html;
    portrait.style.background = p.bg;
    this.dialogEl.querySelector('.who').textContent = line.who;
    d.full = line.text;
    d.shown = 0;
    d.typing = true;
    this.dialogEl.querySelector('.text').textContent = '';
  }

  advanceDialog() {
    const d = this.dialogState;
    if (!d) return;
    if (d.typing) {
      d.shown = d.full.length;
      d.typing = false;
      this.dialogEl.querySelector('.text').textContent = d.full;
    } else {
      this.game.audio.sfx('menuMove', { volume: 0.5 });
      this.nextLine();
    }
  }

  closeDialog() {
    const d = this.dialogState;
    this.dialogState = null;
    this.dialogEl.classList.add('hidden');
    d?.resolve();
  }

  // ================= atualização por quadro =================
  update(dt, input) {
    this.updatePops(dt);
    if (this.game.state !== 'paused' && this.game.state !== 'talk') this.updateToast(dt);
    const d = this.dialogState;
    if (d) {
      if (d.typing) {
        const before = Math.floor(d.shown);
        d.shown = Math.min(d.full.length, d.shown + dt * 48);
        if (Math.floor(d.shown) !== before) {
          this.dialogEl.querySelector('.text').textContent = d.full.slice(0, Math.floor(d.shown));
          
        }
        if (d.shown >= d.full.length) d.typing = false;
      }
      if (input.pressed('confirm') || input.pressed('jump')) this.advanceDialog();
      else if (input.pressed('back')) this.closeDialog(); // Esc pula a conversa
      return true;
    }
    const m = this.menu;
    if (m) {
      if (m.press && (input.pressed('confirm') || input.pressed('jump'))) { m.onPress?.(); return true; }
      const cur = m.items?.[m.sel];
      if (cur?.adjust && (input.pressed('left') || input.pressed('right'))) cur.adjust(input.pressed('right') ? 1 : -1);
      else {
        if (input.pressed('up') || input.pressed('left')) this.move(-1);
        if (input.pressed('down') || input.pressed('right')) this.move(1);
      }
      if (input.pressed('confirm')) this.activate();
      else if (input.pressed('back') && m.onBack) { this.game.audio.sfx('menuMove'); m.onBack(); }
      return true;
    }
    return false;
  }

  // ================= telas prontas =================
  creditsHTML() {
    const rows = GROUP.map((p) => `<div><b>${p.name}</b> — ${p.role}</div>`).join('');
    return `<div class="info">${rows}<br>
      <div>${COURSE} · feito com <b>Three.js</b></div>
      <div>Arte e efeitos sonoros: <b>Kenney</b> (kenney.nl), CC0</div>
      <div>Músicas: <b>Juhani Junkala</b> (OpenGameArt), CC0</div>
      <div>Fonte: Press Start 2P, de codeman38 (OFL)</div></div>`;
  }

  controlsHTML() {
    return `<div class="info">
      <div><b>← →</b> ou <b>A D</b> ............ andar</div>
      <div><b>ESPAÇO</b> ou <b>Z</b> ........... pular (segure = mais alto)</div>
      <div><b>X</b>, <b>J</b> ou <b>SHIFT</b> ........ agarrar / arremessar</div>
      <div>&nbsp;&nbsp;+ <b>↑</b> arremessa para cima · + <b>↓</b> só larga</div>
      <div><b>X</b> perto da estrela ......... balançar</div>
      <div><b>↑ ↓</b> ...................... escalar escadas e cordas</div>
      <div><b>↑</b> perto de alguém ........... conversar</div>
      <div><b>Pule</b> no interruptor ou acerte-o com um arremesso</div>
      <div><b>ESC</b> ou <b>P</b> .............. pausar · <b>M</b> som</div>
      <div><b>Controle</b>: A pula, X/B agarra, START pausa</div>
    </div>`;
  }

  // ================= controles de toque =================
  buildTouch() {
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const t = el('div', 'touch hidden interactive', `
      <div class="pad"><button data-a="left">◀</button><button data-a="down">▼</button><button data-a="right">▶</button></div>
      <div class="pad"><button data-a="up">▲</button><button data-a="action">B</button><button class="big" data-a="jump">A</button></div>`);
    t.querySelectorAll('button').forEach((b) => {
      const a = b.dataset.a;
      const down = (e) => { e.preventDefault(); this.game.audio.unlock(); this.game.input.touchDown(a); b.classList.add('on'); };
      const up = (e) => { e.preventDefault(); this.game.input.touchUp(a); b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    });
    const pause = el('button', 'touch-pause hidden interactive', 'II');
    pause.addEventListener('click', () => this.game.togglePause());
    this.root.appendChild(t);
    this.root.appendChild(pause);
    this.touch = t;
    this.touchPause = pause;
  }
}
