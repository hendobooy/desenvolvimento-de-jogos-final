import { Enemy, Walker } from '../entities/Enemy.js';

/*
  Inimigos das Dunas Douradas (Integrante 2)
*/

/** Rato do Deserto: corre rápido e dá meia-volta na beirada. */
export class Rato extends Walker {
  init() {
    super.init();
    this.w = 0.8;
    this.h = 0.55;
    this.speed = 3.2;
    this.turnAtLedges = true;
    this.score = 150;
    this.frames = { walk: ['mouse_walk_a', 'mouse_walk_b'], rest: 'mouse_rest' };
  }
  think(dt) {
    this.walk(dt);
    this.animate(this.frames.walk, 12);
  }
}

/** Minhoca: lentinha, ótima para agarrar e usar como "munição". */
export class Minhoca extends Walker {
  init() {
    super.init();
    this.w = 0.9;
    this.h = 0.4;
    this.speed = 0.6;
    this.turnAtLedges = true;
    this.frames = { walk: ['worm_ring_move_a', 'worm_ring_move_b'], rest: 'worm_ring_rest' };
  }
}

/** Gosma de Fogo: quente demais para pisar ou agarrar. Só cai com algo arremessado. */
export class GosmaFogo extends Walker {
  init() {
    super.init();
    this.w = 0.8;
    this.h = 0.65;
    this.speed = 1.1;
    this.stompable = false;
    this.grabbable = false;
    this.score = 250;
    this.frames = { walk: ['slime_fire_walk_a', 'slime_fire_walk_b'], rest: 'slime_fire_rest', flat: 'slime_fire_flat' };
  }
  think(dt) {
    super.think(dt);
    if (Math.random() < dt * 5) this.game.particles.burst(this.cx, this.y + 0.6, { color: ['#ff9f1c', '#ff4d2d'], count: 1, speed: 0.6, size: 0.1, gravity: -3, life: 0.5 });
  }
}

/** Serra: vai e volta numa trilha. Indestrutível: só desviando! */
export class Serra extends Enemy {
  init() {
    this.w = 0.8;
    this.h = 0.8;
    this.gravity = false;
    this.stompable = false;
    this.grabbable = false;
    this.range = 3;
    this.frames = { spin: ['saw_a', 'saw_b'], rest: 'saw_rest' };
  }
  think() {
    if (this.x0 === undefined) this.x0 = this.x;
    const nx = this.x0 + Math.sin(this.t * 1.4) * this.range;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.animate(this.frames.spin, 16);
  }
  onHit() {
    this.game.audio.sfx('rock', { volume: 0.6 }); // nada acontece com ela
  }
}

/** Bloco Esmagador: preso no alto, despenca quando Hans passa embaixo e depois sobe devagar. */
export class Esmagador extends Enemy {
  init() {
    this.w = 0.9;
    this.h = 0.9;
    this.gravity = false;
    this.stompable = false;
    this.grabbable = false;
    this.damaging = false;
    this.state = 'wait';
    this.frames = { idle: 'block_idle', fall: 'block_fall', rest: 'block_rest' };
  }
  think(dt) {
    if (this.homeY === undefined) this.homeY = this.y;
    const p = this.player;
    if (this.state === 'wait') {
      this.sprite.setFrame('block_idle');
      this.damaging = false;
      if (Math.abs(p.cx - this.cx) < 1.3 && p.y < this.y) {
        this.state = 'fall';
        this.vy = 0;
      }
    } else if (this.state === 'fall') {
      this.sprite.setFrame('block_fall');
      this.damaging = true;
      this.vy = Math.max(this.vy - 60 * dt, -24);
      const res = this.physics(dt);
      if (res.bottom) {
        this.state = 'rest';
        this.timer = 1.2;
        this.game.shake(0.35);
        this.game.audio.sfx('rock');
        this.game.particles.dust(this.cx, this.y, 8, '#e8c88f');
      }
    } else if (this.state === 'rest') {
      this.sprite.setFrame('block_rest');
      this.damaging = false;
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'rise';
    } else {
      this.y += 2 * dt;
      if (this.y >= this.homeY) {
        this.y = this.homeY;
        this.state = 'wait';
      }
    }
  }
  onHit() {
    this.game.audio.sfx('rock', { volume: 0.6 });
  }
}
