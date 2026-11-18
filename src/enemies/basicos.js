import { Enemy, Walker } from '../entities/Enemy.js';

/*
  Inimigos básicos (Integrante 1): usados no Campo Florido e reaproveitados nas outras fases.
*/

/** Gosma: anda até bater numa parede. Pode ser pisada ou agarrada. */
export class Gosma extends Walker {
  init() {
    super.init();
    this.w = 0.8;
    this.h = 0.6;
    this.speed = 1.3;
    this.frames = { walk: ['slime_normal_walk_a', 'slime_normal_walk_b'], rest: 'slime_normal_rest', flat: 'slime_normal_flat' };
  }
}

/** Caracol: pisado, se esconde no casco. O casco pode ser agarrado e arremessado. */
export class Caracol extends Walker {
  init() {
    super.init();
    this.w = 0.85;
    this.h = 0.65;
    this.speed = 0.9;
    this.turnAtLedges = true;
    this.score = 150;
    this.frames = { walk: ['snail_walk_a', 'snail_walk_b'], rest: 'snail_shell', idle: 'snail_rest' };
    this.shellTime = 0;
  }

  think(dt) {
    if (this.shellTime > 0) {
      // escondido no casco: parado e inofensivo
      this.shellTime -= dt;
      this.vx = 0;
      this.physics(dt);
      this.sprite.setFrame('snail_shell');
      this.sprite.rotation.z = this.shellTime < 1 ? Math.sin(this.t * 40) * 0.08 : 0;
      if (this.shellTime <= 0) {
        this.damaging = true;
        this.stompable = true;
        this.sprite.rotation.z = 0;
      }
      return;
    }
    super.think(dt);
  }

  onStomp() {
    if (this.shellTime > 0) return;
    this.shellTime = 5;
    this.damaging = false;
    this.stompable = false;
    this.game.audio.sfx('stomp');
    this.game.addScore(50, this.cx, this.y + 1);
  }
}

/** Abelha: voa de um lado para o outro, subindo e descendo. */
export class Abelha extends Enemy {
  init() {
    this.w = 0.7;
    this.h = 0.6;
    this.gravity = false;
    this.score = 200;
    this.range = 2.5;
    this.frames = { fly: ['bee_a', 'bee_b'], rest: 'bee_rest' };
  }

  think() {
    if (this.x0 === undefined) {
      this.x0 = this.x;
      this.y0 = this.y;
    }
    const t = this.t * 1.2;
    const nx = this.x0 + Math.sin(t) * this.range;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = this.y0 + Math.sin(t * 2) * 0.4;
    this.animate(this.frames.fly, 12);
  }

  onStomp() {
    this.knockOut();
  }
}
