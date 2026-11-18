import { moveAndCollide } from '../core/Physics.js';
import { Sprite, LAYER } from '../core/Sprite.js';
import { overlap } from '../core/Physics.js';

/*
  Itens e objetos interativos. Todos têm: x, y, w, h, update(dt), onTouch(player).
*/

class Item {
  constructor(game, x, y, w = 1, h = 1) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.removed = false;
    this.touchable = true;
    this.sprites = [];
  }
  addSprite(o, px, py) {
    const sp = new Sprite(o);
    sp.position.set(px, py, 0);
    this.game.level.group.add(sp);
    this.sprites.push(sp);
    return sp;
  }
  update() {}
  onTouch() {}
  remove() {
    this.removed = true;
    for (const s of this.sprites) s.dispose();
    this.sprites = [];
  }
}

// ---------- moeda (gira trocando entre frente e perfil) ----------
export class Coin extends Item {
  constructor(game, x, y) {
    super(game, x + 0.2, y + 0.15, 0.6, 0.7);
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'coin_gold', anchor: 'center', layer: LAYER.items, scale: 0.8 }, x + 0.5, y + 0.5);
    this.t = x * 0.3;
  }
  update(dt) {
    this.t += dt;
    this.sp.setFrame(Math.floor(this.t * 4) % 4 === 3 ? 'coin_gold_side' : 'coin_gold');
    this.sp.position.y = this.y + 0.35 + Math.sin(this.t * 3) * 0.05;
  }
  onTouch() {
    this.game.collectCoin(this.x + 0.3, this.y + 0.4);
    this.remove();
  }
}

/** moeda que salta de um bloco ? */
export class PopCoin extends Item {
  constructor(game, x, y) {
    super(game, x, y, 0, 0);
    this.touchable = false;
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'coin_gold', anchor: 'center', layer: LAYER.items, scale: 0.8 }, x, y + 0.4);
    this.vy = 11;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.vy -= 40 * dt;
    this.sp.position.y += this.vy * dt;
    this.sp.setFrame(Math.floor(this.t * 14) % 2 ? 'coin_gold_side' : 'coin_gold');
    if (this.t > 0.45) {
      this.game.particles.burst(this.sp.position.x, this.sp.position.y, { color: '#fff3b0', count: 6, speed: 3, size: 0.1, gravity: 0 });
      this.remove();
    }
  }
}

// ---------- coração (recupera 1 de vida) ----------
export class Heart extends Item {
  constructor(game, x, y, { emerge = false } = {}) {
    super(game, x + 0.15, y, 0.7, 0.7);
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'heart', layer: LAYER.items, scale: 0.9 }, x + 0.5, y);
    this.baseY = y;
    this.t = 0;
    this.emerge = emerge ? 0.5 : 0;
    if (emerge) game.audio.sfx('magic');
  }
  update(dt) {
    this.t += dt;
    if (this.emerge > 0) this.emerge -= dt;
    this.sp.position.y = this.baseY - Math.max(0, this.emerge) * 1.6 + Math.sin(this.t * 4) * 0.06;
    this.touchable = this.emerge <= 0;
  }
  onTouch(p) {
    if (p.hearts < p.maxHearts) p.heal();
    else this.game.addScore(500, this.x, this.y + 1);
    this.game.audio.sfx('powerup');
    this.game.ui.popText('+♥', this.x + 0.3, this.y + 1, '#ff6b81');
    this.remove();
  }
}

// ---------- chave ----------
export class Key extends Item {
  constructor(game, x, y) {
    super(game, x + 0.1, y + 0.1, 0.8, 0.8);
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'key_yellow', layer: LAYER.items }, x + 0.5, y);
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.sp.position.y = this.y - 0.1 + Math.sin(this.t * 3) * 0.08;
  }
  onTouch() {
    this.game.session.keys++;
    this.game.audio.sfx('gem');
    this.game.ui.popText('CHAVE!', this.x + 0.4, this.y + 1, '#ffcc33');
    this.remove();
  }
}

// ---------- cristal da estação (fim da fase) ----------
export class Gem extends Item {
  constructor(game, x, y, color = 'green') {
    super(game, x - 0.1, y, 1.2, 1.6);
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'gem_' + color, layer: LAYER.items, scale: 1.6 }, x + 0.5, y + 0.3);
    this.t = 0;
    this.color = color;
    this.hidden = false;
  }
  setHidden(h) {
    this.hidden = h;
    this.touchable = !h;
    for (const s of this.sprites) s.visible = !h;
  }
  update(dt) {
    this.t += dt;
    if (this.hidden) return;
    this.sp.position.y = this.y + 0.3 + Math.sin(this.t * 2.5) * 0.15;
    if (Math.random() < dt * 6) this.game.particles.burst(this.x + 0.6 + (Math.random() - 0.5), this.y + 0.8 + Math.random(), { color: '#ffffff', count: 1, speed: 0.5, size: 0.1, gravity: -1, life: 0.6 });
  }
  onTouch() {
    if (this.taken) return;
    this.taken = true;
    this.game.audio.sfx('gem');
    this.game.reachGoal(this);
  }
}

// ---------- bandeira de checkpoint ----------
export class Checkpoint extends Item {
  constructor(game, x, y) {
    super(game, x, y, 1, 1.5);
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'flag_off', layer: LAYER.items }, x + 0.5, y);
    this.active = game.checkpoint && game.checkpoint.x === x && game.checkpoint.level === game.levelIndex;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.active) this.sp.setFrame(Math.floor(this.t * 5) % 2 ? 'flag_green_a' : 'flag_green_b');
  }
  onTouch() {
    if (this.active) return;
    this.active = true;
    this.game.setCheckpoint(this.x, this.y);
    this.game.audio.sfx('magic');
    this.game.particles.burst(this.x + 0.5, this.y + 1.2, { color: ['#57c84d', '#ffffff'], count: 14, speed: 4 });
  }
}

// ---------- janela de dica (invisível): a dica aparece na tela ao passar por aqui ----------
export class TipTrigger extends Item {
  constructor(game, x, y, text, id) {
    super(game, x, -5, 1, game.level.height + 10); // coluna inteira: não tem como passar sem ver
    this.text = text || '...';
    this.id = id;
  }
  onTouch() {
    this.game.showTip(this);
    this.remove();
  }
}

// ---------- interruptor (troca os blocos azuis e vermelhos) ----------
export class Switch extends Item {
  /** kind: 'floor' (pule nele ou acerte com arremesso) ou 'ceiling' (só arremesso para cima) */
  constructor(game, x, y, kind = 'floor') {
    const ceiling = kind === 'ceiling';
    super(game, x + 0.1, ceiling ? y + 0.45 : y, 0.8, 0.55);
    this.kind = kind;
    this.touchable = false;
    this.cool = 0;
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'switch_blue', layer: LAYER.items }, x + 0.5, ceiling ? y + 1 : y);
    if (ceiling) this.sp.rotation.z = Math.PI; // pendurado no teto
  }
  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    const lvl = this.game.level;
    this.sp.setFrame(lvl.toggled ? 'switch_blue_pressed' : 'switch_blue');
    // pulo em cima (só o de chão)
    const p = this.game.player;
    if (this.kind === 'floor' && !p.dying && p.mode === 'normal' && p.vy <= 0 && overlap(p, this) && p.prevY >= this.y + 0.2) {
      if (this.press()) p.vy = 3; // pulinho curto: não volta a apertar sozinho
    }
  }
  press() {
    if (this.cool > 0) return false;
    this.cool = 0.4;
    this.game.particles.burst(this.x + 0.4, this.y + 0.3, { color: ['#7fc8f8', '#e2463b', '#ffffff'], count: 10, speed: 4, size: 0.12 });
    this.game.pressSwitch(this);
    return true;
  }
}

export class NPC extends Item {
  constructor(game, x, y, info = { who: '?', color: 'beige', text: '...' }) {
    super(game, x - 0.6, y, 2.2, 1.3);
    this.info = info;
    this.talk = info.talk || null; // conversa opcional (aperte ↑ perto)
    this.text = { who: info.who, color: info.color, text: info.text, talk: !!this.talk }; // balão com o nome colorido
    this.sp = this.addSprite({ atlas: 'characters', frame: `character_${info.color}_idle`, layer: LAYER.decorFront, scale: 0.7 }, x + 0.5, y - 0.04);
    this.sp.flip(!!info.flip);
    this.t = Math.random() * 3;
  }
  update(dt) {
    this.t += dt;
    const c = this.info.color;
    this.sp.setFrame(`character_${c}_${Math.floor(this.t * 1.5) % 4 === 0 ? 'front' : 'idle'}`);
  }
  onTouch() {
    this.game.nearSign = this;
  }
}

// ---------- mola ----------
export class Spring extends Item {
  constructor(game, x, y) {
    super(game, x + 0.05, y, 0.9, 0.55);
    this.touchable = false;
    this.sp = this.addSprite({ atlas: 'tiles', frame: 'spring', layer: LAYER.items }, x + 0.5, y);
    this.out = 0;
  }
  update(dt) {
    const p = this.game.player;
    if (this.out > 0) {
      this.out -= dt;
      if (this.out <= 0) this.sp.setFrame('spring');
    }
    if (!p.dying && p.mode === 'normal' && p.vy <= 0 && overlap(p, this) && p.prevY >= this.y + this.h - 0.25) {
      p.y = this.y + this.h;
      p.vy = p.jumpHeld ? 23 : 20;
      p.onGround = false;
      this.out = 0.25;
      this.sp.setFrame('spring_out');
      this.game.audio.sfx('jumpHigh');
    }
  }
}

// ---------- argola-estrela para balançar (estilo Ristar) ----------
export class SwingRing extends Item {
  constructor(game, x, y) {
    super(game, x, y, 1, 1);
    this.touchable = false;
    this.ax = x + 0.5;
    this.ay = y + 0.5;
    this.rope = this.addSprite({ atlas: 'tiles', frame: 'rope', anchor: 'bottom', layer: LAYER.rope }, this.ax, this.ay);
    this.rope.visible = false;
    this.star = this.addSprite({ atlas: 'tiles', frame: 'star', anchor: 'center', layer: LAYER.items, scale: 0.8 }, this.ax, this.ay);
    this.t = Math.random() * 6;
    this.held = false;
  }
  grab() {
    this.held = true;
    this.rope.visible = true;
  }
  release() {
    this.held = false;
    this.rope.visible = false;
  }
  setRope(theta, L) {
    // o sprite da corda é esticado do ponto de apoio até a mão
    this.rope.w = 0.6;
    this.rope.h = L;
    this.rope.applyScale();
    this.rope.rotation.z = Math.PI + theta;
  }
  update(dt) {
    this.t += dt;
    if (!this.held) this.star.rotation.z = Math.sin(this.t * 2) * 0.25;
    const s = 0.8 + (this.game.findRing(this.game.player) === this ? Math.sin(this.t * 10) * 0.08 : 0);
    this.star.scale.set(this.star.w * s / 0.8, this.star.h * s / 0.8, 1);
  }
}

// ---------- objeto que dá para pegar e jogar (caixa, abóbora, bola de neve...) ----------
export class Throwable extends Item {
  constructor(game, x, y, spec) {
    super(game, x + 0.1, y, 0.8, 0.8);
    this.touchable = false;
    this.spec = spec; // { frame | image, atlas, kind, scale, colors }
    this.sp = this.addSprite(
      spec.image ? { image: spec.image, scale: spec.scale ?? 1, layer: LAYER.items } : { atlas: spec.atlas || 'tiles', frame: spec.frame, scale: spec.scale ?? 0.8, layer: LAYER.items },
      x + 0.5,
      y,
    );
    this.vy = 0;
    this.respawn = spec.respawn ? { x, y } : null;
    // contorno escuro atrás do objeto (bolas de neve brancas somem no cenário de neve)
    if (spec.outline) {
      this.outline = this.addSprite({ image: spec.image, scale: (spec.scale ?? 1) * 1.3, layer: LAYER.items - 1, tint: spec.outline }, x + 0.5, y);
      this.outlineDy = -(this.outline.h - this.sp.h) / 2;
    }
  }
  update(dt) {
    this.vy = Math.max(this.vy - 40 * dt, -20);
    this.vx = 0;
    moveAndCollide(this, this.game.level, dt);
    this.sp.position.set(this.x + this.w / 2, this.y, 0);
    this.outline?.position.set(this.x + this.w / 2, this.y + this.outlineDy, 0);
    if (this.y < -4) this.remove();
  }
  carryInfo() {
    return { ...this.spec, atlas: this.spec.image ? null : this.spec.atlas || 'tiles' };
  }
  removeForGrab() {
    this.remove();
    // montes de neve/caixas "infinitos" voltam depois de um tempo
    if (this.respawn) {
      const { x, y } = this.respawn;
      const level = this.game.level;
      setTimeout(() => {
        if (this.game.level === level) this.game.items.push(new Throwable(this.game, x, y, this.spec));
      }, 2500);
    }
  }
}

// ---------- objeto arremessado ----------
export class Projectile extends Item {
  constructor(game, spec, x, y, vx, vy) {
    super(game, x, y, 0.6, 0.6);
    this.touchable = false;
    this.spec = spec;
    this.vx = vx;
    this.vy = vy;
    this.life = 3;
    this.bounces = 0;
    this.sp = this.addSprite(
      spec.image ? { image: spec.image, scale: spec.scale ?? 1, anchor: 'center', layer: LAYER.projectiles } : { atlas: spec.atlas, frame: spec.frame, scale: spec.scale ?? 0.8, anchor: 'center', layer: LAYER.projectiles },
      x + 0.3,
      y + 0.3,
    );
    if (spec.outline && spec.image) this.outline = this.addSprite({ image: spec.image, scale: (spec.scale ?? 1) * 1.3, anchor: 'center', layer: LAYER.projectiles - 1, tint: spec.outline }, x + 0.3, y + 0.3);
  }
  update(dt) {
    const game = this.game;
    this.life -= dt;
    this.vy = Math.max(this.vy - 30 * dt, -20);
    const res = moveAndCollide(this, game.level, dt, { semisolid: false });
    this.sp.position.set(this.x + 0.3, this.y + 0.3, 0);
    this.outline?.position.set(this.x + 0.3, this.y + 0.3, 0);
    this.sp.rotation.z -= Math.sign(this.vx || 1) * dt * 10;
    // aciona interruptores (inclusive os de teto)
    for (const sw of game.switches) {
      if (overlap(this, sw, -0.05) && sw.press()) return this.shatter();
    }
    // quebra tijolos e ativa blocos no caminho
    if (res.left || res.right || res.top) {
      const tx = res.right ? Math.floor(this.x + this.w + 0.05) : res.left ? Math.floor(this.x - 0.05) : Math.floor(this.x + this.w / 2);
      const ty = res.top ? Math.floor(this.y + this.h + 0.05) : Math.floor(this.y + this.h / 2);
      const ch = game.level.get(tx, ty);
      if (ch === 'B') game.level.breakColumn(tx, ty);
      else if (ch === '?' || ch === '!') game.level.hitBlock(tx, ty, game.player);
      else if (ch === 'D') game.level.tryUnlock(tx, ty, game.player);
      return this.shatter();
    }
    if (res.bottom) {
      if (this.bounces++ >= 1 || this.spec.kind !== 'enemy') return this.shatter();
      this.vy = 5;
      this.vx *= 0.6;
    }
    // atinge inimigos
    for (const e of game.enemies) {
      if (!e.alive || e.removed || !e.active) continue;
      if (overlap(this, e, -0.1)) {
        e.onHit(this);
        return this.shatter();
      }
    }
    if (this.life <= 0 || this.y < -4) this.shatter();
  }
  shatter() {
    if (this.removed) return;
    const s = this.spec;
    this.game.particles.burst(this.x + 0.3, this.y + 0.3, { color: s.colors || ['#c98a55', '#7a4a24'], count: 12, speed: 6, size: 0.18, gravity: 28 });
    this.game.audio.sfx(s.sound || 'break', { volume: 0.8 });
    this.remove();
  }
}
