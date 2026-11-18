import { Enemy, Walker, Guardiao } from '../entities/Enemy.js';

/*
  Inimigos do Vale das Abóboras (Integrante 3)
*/

/** Sapo: fica parado e, de tempos em tempos, salta na direção do Hans. */
export class Sapo extends Enemy {
  init() {
    this.w = 0.8;
    this.h = 0.7;
    this.score = 200;
    this.hop = 1 + Math.random() * 1.5;
    this.frames = { idle: 'frog_idle', jump: 'frog_jump', rest: 'frog_rest' };
  }
  think(dt) {
    const res = this.physics(dt);
    if (res.bottom) {
      this.vx = 0;
      this.sprite.setFrame('frog_idle');
      this.hop -= dt;
      const dx = this.player.cx - this.cx;
      if (this.hop <= 0 && Math.abs(dx) < 7) {
        this.dir = Math.sign(dx) || -1;
        this.vx = this.dir * 3.2;
        this.vy = 12;
        this.hop = 1.6 + Math.random() * 1.2;
        this.game.particles.dust(this.cx, this.y, 3, '#c9a27a');
      }
    } else {
      this.sprite.setFrame('frog_jump');
      if (res.left || res.right) this.vx = 0;
    }
  }
}

/** Joaninha: passeia pelo chão; quando Hans chega perto, levanta voo em círculos. */
export class Joaninha extends Walker {
  init() {
    super.init();
    this.w = 0.8;
    this.h = 0.6;
    this.speed = 1.2;
    this.turnAtLedges = true;
    this.flying = false;
    this.frames = { walk: ['ladybug_walk_a', 'ladybug_walk_b'], fly: 'ladybug_fly', rest: 'ladybug_rest' };
  }
  think(dt) {
    const p = this.player;
    const near = Math.abs(p.cx - this.cx) < 4;
    if (near && !this.flying) {
      this.flying = true;
      this.gravity = false;
      this.cx0 = this.cx;
      this.y0 = this.y;
      this.ft = 0;
    }
    if (this.flying) {
      this.ft += dt;
      // decola suavemente a partir de onde está (sem "pular" de posição)
      const up = Math.min(this.ft, 1);
      this.x = this.cx0 + Math.sin(this.ft * 2) * 1.8 - this.w / 2;
      this.y = this.y0 + up * 1.5 + Math.sin(this.ft * 4) * 0.5 * up;
      this.dir = Math.cos(this.ft * 2) > 0 ? 1 : -1;
      this.sprite.setFrame(this.frames.fly);
      if (!near && this.ft > 3) {
        this.flying = false;
        this.gravity = true;
      }
      return;
    }
    super.think(dt);
  }
  onStomp() {
    if (this.flying) this.knockOut();
    else this.squash();
  }
}

/** Planta Boca-Roxa: mora no chão e morde quem chega perto. Só cai com algo arremessado. */
export class PlantaBoca extends Enemy {
  init() {
    this.w = 0.8;
    this.h = 0.9;
    this.stompable = false;
    this.grabbable = false;
    this.score = 300;
    this.frames = { idle: 'barnacle_attack_rest', bite: ['barnacle_attack_a', 'barnacle_attack_b'], rest: 'barnacle_attack_rest' };
  }
  think(dt) {
    this.physics(dt);
    const near = Math.abs(this.player.cx - this.cx) < 2.5;
    this.dir = this.player.cx > this.cx ? 1 : -1;
    if (near) this.animate(this.frames.bite, 5);
    else this.sprite.setFrame(this.frames.idle);
  }
}

/** Planta Gigante: tapa o túnel. Só uma abóbora arremessada derruba. */
export class PlantaGigante extends Guardiao {
  init() {
    super.init();
    this.weakTo = 'pumpkin';
    this.hint = 'ABÓBORA NELA!';
    // só fica vulnerável com a BOCA ABERTA: ela treme logo antes de abrir
    this.window = { closed: 1.9, open: 1.3 };
    this.shutHint = 'ESPERE A BOCA ABRIR!';
    this.frames = { anim: ['barnacle_attack_a', 'barnacle_attack_b'], idle: 'barnacle_attack_a', rest: 'barnacle_attack_rest', shut: 'barnacle_attack_rest' };
  }
}

/** Mosca: sobe e desce no mesmo lugar. */
export class Mosca extends Enemy {
  init() {
    this.w = 0.7;
    this.h = 0.6;
    this.gravity = false;
    this.score = 150;
    this.frames = { fly: ['fly_a', 'fly_b'], rest: 'fly_rest' };
  }
  think() {
    if (this.y0 === undefined) this.y0 = this.y;
    this.y = this.y0 + Math.sin(this.t * 1.8) * 1.6;
    this.dir = this.player.cx > this.cx ? 1 : -1;
    this.animate(this.frames.fly, 14);
  }
  onStomp() {
    this.knockOut();
  }
}
