import { Enemy } from '../entities/Enemy.js';
import { Throwable } from '../entities/Items.js';

/*
  REI KNUT, o chefe final (Integrante 4).
  É o sprite "block" do Kenney, ampliado e com um efeito de gelo feito no shader.

  - Pisar nele não adianta: é gelo maciço (Hans só quica).
  - Só leva dano de objetos ARREMESSADOS (bolas de neve).
  - A cada pulo pesado, faz cair granizo do céu. O granizo que chega ao chão
    vira uma bola de neve que o Hans pode pegar e jogar de volta!
  - FASE 2 (metade da vida): cria uma ARMADURA DE GELO. Só sente as bolas na
    JANELA de tontura logo depois de aterrissar de um pulo (desafio de timing).
  - A arena tem caixotes com montes de neve em cima: munição perto, sem correr tanto.
    Mas o Rei anda pela arena toda e QUEBRA os caixotes em que encosta ou cai em cima
    (eles voltam depois de alguns segundos): não dá para ficar parado lá em cima.
  - Ao aterrissar, solta uma ONDA DE CHOQUE pelo chão: é preciso estar no ar quando ela passa.
*/

/** Pedra de granizo caindo (machuca). Ao tocar o chão vira munição. */
class Granizo extends Enemy {
  init() {
    this.w = 0.5;
    this.h = 0.5;
    this.stompable = false;
    this.grabbable = false;
    this.image = 'snowBall';
    this.scale = 0.7;
  }
  think(dt) {
    this.vy = Math.max(this.vy - 30 * dt, -12);
    const res = this.physics(dt);
    this.sprite.rotation.z += dt * 6;
    if (res.bottom) {
      // vira uma bola de neve comum, pronta para ser arremessada
      const game = this.game;
      game.items.push(new Throwable(game, Math.floor(this.cx), Math.floor(this.y + 0.1), { ...game.level.def.throwable, respawn: false }));
      game.audio.sfx('snow', { volume: 0.6 });
      this.remove();
    }
  }
  onHit() {}
}

export class ReiGranizo extends Enemy {
  init() {
    this.w = 2.2;
    this.h = 2.2;
    this.scale = 2.6;
    this.icy = true; // sprite "congelado" por shader (ver core/Sprite.js)
    this.maxHp = 4;
    this.hp = 4;
    this.state = 'wait';
    this.timer = 0;
    this.grabbable = false;
    this.score = 5000;
    this.frames = { idle: 'block_idle', fall: 'block_fall', rest: 'block_rest' };
  }

  think(dt) {
    const game = this.game;
    const p = this.player;
    const dx = p.cx - this.cx;
    if (this.minX === undefined) {
      // anda pela arena inteira (antes ficava preso perto dos caixotes)
      this.minX = this.x - 30;
      this.maxX = this.x + 14;
      this.waves = [];
    }
    this.timer -= dt;
    this.updateWaves(dt);
    switch (this.state) {
      case 'wait':
        this.sprite.setFrame('block_rest');
        if (Math.abs(dx) < 10) {
          this.state = 'intro';
          this.timer = 1.5;
          game.boss = this;
          game.playMusic('boss');
          game.shake(0.6);
          game.audio.sfx('rock');
          game.ui.bossBar('REI KNUT', this.hp, this.maxHp);
        }
        this.physics(dt);
        break;
      case 'intro':
        this.sprite.setFrame('block_idle');
        this.sprite.rotation.z = Math.sin(this.t * 30) * 0.05;
        this.physics(dt);
        if (this.timer <= 0) this.toWalk();
        break;
      case 'walk': {
        this.sprite.setFrame('block_idle');
        this.sprite.rotation.z = Math.sin(this.t * 8) * 0.06;
        this.dir = Math.sign(dx) || this.dir;
        this.vx = this.dir * (1.4 + (this.maxHp - this.hp) * 0.5);
        const r = this.move(dt);
        // bateu num caixote: quebra a pilha inteira
        if (r.left || r.right) this.game.level.smashCrates(this.x - 0.6, this.x + this.w + 0.6, this.y, this.y + this.h);
        // Hans parado lá em cima, fora do alcance: pula logo atrás dele
        if (p.y > this.y + 1.5 && Math.abs(dx) < 4 && this.timer > 0.4) this.timer = 0.4;
        if (this.timer <= 0) {
          this.state = 'jump';
          this.vy = 15;
          this.vx = Math.max(-5, Math.min(5, dx * 0.8));
          this.airborne = true;
        }
        break;
      }
      case 'jump': {
        this.sprite.setFrame('block_fall');
        this.sprite.rotation.z = 0;
        const res = this.move(dt);
        if (res.top) game.level.smashCrates(this.x - 0.2, this.x + this.w + 0.2, this.y + this.h, this.y + this.h + 1.5);
        if (res.left || res.right) game.level.smashCrates(this.x - 0.6, this.x + this.w + 0.6, this.y, this.y + this.h);
        if (res.bottom && this.airborne && this.vy <= 0) {
          // caiu em cima de caixotes? quebra (e o Hans que estava lá cai junto)
          game.level.smashCrates(this.x - 1, this.x + this.w + 1, this.y - 2.5, this.y + 0.5);
          this.shockwave();
          this.airborne = false;
          game.shake(0.7);
          game.audio.sfx('rock');
          game.particles.dust(this.cx - 0.8, this.y, 8, '#ffffff');
          game.particles.dust(this.cx + 0.8, this.y, 8, '#ffffff');
          this.hail(2 + (this.maxHp - this.hp));
          if (this.armored) {
            this.state = 'dazed';
            this.timer = 1.7;
            this.vx = 0;
          } else this.toWalk();
        }
        break;
      }
      case 'dazed':
        // tonto depois do pulo: a janela para acertar na fase 2
        this.sprite.setFrame('block_rest');
        this.sprite.rotation.z = Math.sin(this.t * 14) * 0.12;
        this.vx = 0;
        this.move(dt);
        if (Math.random() < dt * 14) game.particles.burst(this.cx + Math.sin(this.t * 6) * 0.9, this.y + this.h + 0.3, { color: ['#ffe066', '#ffffff'], count: 1, speed: 1, size: 0.16, gravity: 0, life: 0.5 });
        if (this.timer <= 0) this.toWalk();
        break;
      case 'hurt':
        this.sprite.setFrame('block_rest');
        this.move(dt);
        this.vx *= 0.9;
        this.sprite.visible = Math.floor(this.timer * 14) % 2 === 0;
        if (this.timer <= 0) {
          this.sprite.visible = true;
          this.damaging = true;
          this.toWalk();
        }
        break;
      default:
        break;
    }
  }

  move(dt) {
    const res = this.physics(dt);
    if (this.x < this.minX) { this.x = this.minX; this.dir = 1; }
    if (this.x > this.maxX) { this.x = this.maxX; this.dir = -1; }
    return res;
  }

  /** onda de choque que corre pelo chão para os dois lados: pule para escapar */
  shockwave() {
    for (const dir of [-1, 1]) this.waves.push({ x: this.cx + dir * this.w * 0.5, y: this.y, dir, life: 0.55 });
  }

  updateWaves(dt) {
    if (!this.waves?.length) return;
    const p = this.player, game = this.game;
    for (const w of this.waves) {
      w.x += w.dir * 13 * dt;
      w.life -= dt;
      if (Math.random() < 0.8) game.particles.dust(w.x, w.y, 2, '#ffffff');
      // só pega quem está no chão (na mesma altura do Rei) na hora que a onda passa
      if (!w.hit && p.onGround && Math.abs(p.y - w.y) < 0.6 && Math.abs(p.cx - w.x) < 0.7) {
        w.hit = true;
        p.hurt();
      }
    }
    this.waves = this.waves.filter((w) => w.life > 0);
  }

  toWalk() {
    this.state = 'walk';
    this.timer = 2.2 + Math.random() - (this.maxHp - this.hp) * 0.3;
  }

  /** granizo caindo perto do Hans */
  hail(n) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(this.player.cx + (Math.random() - 0.5) * 8);
      const g = new Granizo(this.game, Math.max(this.minX, Math.min(this.maxX + 2, x)), this.game.level.height - 2);
      g.active = true;
      this.game.enemies.push(g);
    }
  }

  // pisar: só quica
  onStomp() {
    this.game.audio.sfx('ice');
    this.game.ui.popText('GELO MACIÇO!', this.cx, this.y + this.h + 0.5, '#bfe6ff');
  }

  // arremessos: dano de verdade
  get armored() {
    return this.hp <= this.maxHp / 2;
  }

  onHit() {
    if (this.state === 'hurt' || this.state === 'wait') return;
    const game = this.game;
    if (this.armored && this.state !== 'dazed') {
      game.audio.sfx('bump');
      game.particles.burst(this.cx, this.y + this.h * 0.7, { color: ['#ffffff', '#bfe6ff'], count: 8, speed: 4, size: 0.12 });
      game.ui.popText('ARMADURA! ESPERE ELE ATERRISSAR', this.cx, this.y + this.h + 0.6, '#bfe6ff');
      return;
    }
    this.hp--;
    game.ui.bossBar('REI KNUT', this.hp, this.maxHp);
    game.audio.sfx('ice');
    game.shake(0.4);
    game.particles.burst(this.cx, this.y + this.h * 0.7, { color: ['#bfe6ff', '#ffffff', '#7fc8f8'], count: 24, speed: 7 });
    if (this.hp <= 0) return this.defeat();
    if (this.armored && !this.warnedArmor) {
      this.warnedArmor = true;
      game.ui.toast('O Rei criou uma <b>ARMADURA DE GELO</b>! Agora as bolas só funcionam logo depois que ele <b>aterrissa</b> de um pulo e fica tonto.', { title: 'REI KNUT', color: '#bfe6ff', time: 6 });
    }
    this.state = 'hurt';
    this.timer = 1.1;
    this.damaging = false;
    this.vx = -Math.sign(this.player.cx - this.cx) * 4;
    this.vy = 6;
  }

  defeat() {
    const game = this.game;
    this.alive = false;
    this.deathT = 0;
    game.audio.stopMusic();
    game.addScore(this.score, this.cx, this.y + 3);
    game.ui.bossBar(null);
  }

  dyingUpdate(dt) {
    this.deathT += dt;
    this.sprite.rotation.z = Math.sin(this.deathT * 40) * 0.08;
    if (Math.random() < 0.5) {
      this.game.particles.burst(this.cx + (Math.random() - 0.5) * 2, this.y + Math.random() * 2, { color: ['#bfe6ff', '#ffffff'], count: 3, speed: 4, size: 0.25 });
      this.game.audio.sfx('ice', { volume: 0.4, rate: 0.7 + Math.random() * 0.5 });
    }
    this.sprite.scale.multiplyScalar(1 - dt * 0.4);
    if (this.deathT > 2) {
      this.game.bossDefeated = true;
      this.game.boss = null;
      this.game.playMusic(this.game.level.def.music);
      this.remove();
    }
  }
}
