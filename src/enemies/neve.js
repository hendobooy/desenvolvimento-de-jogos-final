import { Enemy, Walker, Guardiao } from '../entities/Enemy.js';

/*
  Inimigos dos Picos Nevados (Integrante 4). O chefe está em chefe.js.
*/

/** Bloco Saltitante: anda aos pulinhos na direção do Hans. Pesado demais para agarrar. */
export class BlocoSaltitante extends Enemy {
  init() {
    this.w = 0.8;
    this.h = 0.8;
    this.grabbable = false;
    this.score = 200;
    this.hop = 0.8;
    this.frames = { walk: ['slime_block_walk_a', 'slime_block_walk_b'], jump: 'slime_block_jump', rest: 'slime_block_rest' };
  }
  think(dt) {
    const res = this.physics(dt);
    if (res.bottom) {
      this.vx = 0;
      this.animate(this.frames.walk, 3);
      this.hop -= dt;
      if (this.hop <= 0 && Math.abs(this.player.cx - this.cx) < 9) {
        this.dir = this.player.cx > this.cx ? 1 : -1;
        this.vx = this.dir * 2.2;
        this.vy = 8;
        this.hop = 0.9;
      }
    } else this.sprite.setFrame(this.frames.jump);
  }
}

/** Gosma Espinhosa: tem um espinho na cabeça — NÃO pise! */
export class GosmaEspinho extends Walker {
  init() {
    super.init();
    this.w = 0.8;
    this.h = 0.7;
    this.speed = 1;
    this.turnAtLedges = true;
    this.stompable = false;
    this.grabbable = false;
    this.score = 250;
    this.frames = { walk: ['slime_spike_walk_a', 'slime_spike_walk_b'], rest: 'slime_spike_rest', flat: 'slime_spike_flat' };
  }
}

/** Gosma Espinhosa Gigante: tapa o túnel de gelo. Só cai com bola de neve. */
export class GosmaGigante extends Guardiao {
  init() {
    super.init();
    this.weakTo = 'snowball';
    this.hint = 'BOLA DE NEVE NELA!';
    // precisa de 3 bolas seguidas: se demorar mais de 4 s entre elas, ela se recompõe
    this.hp = 3;
    this.regen = 4;
    this.frames = { anim: ['slime_spike_walk_a', 'slime_spike_walk_b'], idle: 'slime_spike_walk_a', rest: 'slime_spike_rest' };
  }
}

/** Peixe do Lago Gelado: salta da água em arco e mergulha de novo. */
export class Peixe extends Enemy {
  init() {
    this.w = 0.7;
    this.h = 0.6;
    this.gravity = false;
    this.stompable = false;
    this.grabbable = false;
    this.waterY = this.y - 1.6;
    this.y = this.waterY;
    this.wait = 0.5 + Math.random() * 1.5;
    this.frames = { swim: ['fish_blue_swim_a', 'fish_blue_swim_b'], rest: 'fish_blue_rest' };
  }
  think(dt) {
    if (this.wait > 0) {
      this.wait -= dt;
      this.y = this.waterY;
      this.sprite.visible = false;
      this.damaging = false;
      if (this.wait <= 0) {
        this.vy = 14;
        this.sprite.visible = true;
        this.damaging = true;
        this.game.particles.burst(this.cx, this.waterY + 1.5, { color: ['#bfe8ff', '#ffffff'], count: 8, speed: 3 });
      }
      return;
    }
    this.vy -= 25 * dt;
    this.y += this.vy * dt;
    this.sprite.rotation.z = this.vy > 0 ? -0.6 : 0.6;
    this.animate(this.frames.swim, 8);
    if (this.vy < 0 && this.y <= this.waterY) this.wait = 1.2 + Math.random();
  }
}
