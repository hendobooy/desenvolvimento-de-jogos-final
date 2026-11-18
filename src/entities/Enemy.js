import { moveAndCollide, groundAhead } from '../core/Physics.js';
import { Sprite, LAYER } from '../core/Sprite.js';

/*
  Classe base dos inimigos (sprites do atlas "enemies" do Kenney).
  Para criar um inimigo novo:
    1. estenda Enemy (ou Walker, para quem anda no chão)
    2. em init(): defina this.frames (nomes no atlas), tamanho e propriedades
    3. escreva o comportamento em think(dt)
    4. registre a letra do mapa em `enemies` no arquivo da fase

  Propriedades:
    stompable  pode ser derrotado pulando em cima?
    grabbable  Hans consegue agarrar e arremessar?
    damaging   machuca ao encostar?
    gravity    cai com a gravidade?
  Todos os sprites do Kenney olham para a ESQUERDA; o espelho é automático.
*/
export class Enemy {
  constructor(game, x, y) {
    this.game = game;
    this.w = 0.8;
    this.h = 0.7;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.alive = true;
    this.removed = false;
    this.active = false;
    this.stompable = true;
    this.grabbable = true;
    this.damaging = true;
    this.gravity = true;
    this.score = 100;
    this.scale = 1;
    this.tint = null;
    this.t = Math.random() * 10;
    this.frames = { idle: 'slime_normal_rest' };
    this.init?.();
    this.x = x + 0.5 - this.w / 2;
    this.sprite = this.image
      ? new Sprite({ image: this.image, scale: this.scale, layer: LAYER.enemies })
      : new Sprite({ atlas: 'enemies', frame: this.frames.idle || Object.values(this.frames).flat()[0], scale: this.scale, layer: LAYER.enemies, tint: this.tint, own: !!this.tint, icy: !!this.icy });
    game.level.group.add(this.sprite);
    this.sync();
  }

  get cx() { return this.x + this.w / 2; }
  get player() { return this.game.player; }

  think() {}

  physics(dt) {
    if (this.gravity) this.vy = Math.max(this.vy - 40 * dt, -20);
    return moveAndCollide(this, this.game.level, dt);
  }

  /** escolhe o quadro da animação: lista de frames + velocidade (quadros/s) */
  animate(list, fps = 6) {
    this.sprite.setFrame(list[Math.floor(this.t * fps) % list.length]);
  }

  update(dt) {
    this.t += dt;
    if (this.alive) this.think(dt);
    else this.dyingUpdate(dt);
    if (this.y < -6) this.remove();
    this.sync();
  }

  sync() {
    this.sprite.position.set(this.cx, this.y - 0.02, 0);
    this.sprite.flip(this.dir > 0);
  }

  // ----- reações -----
  onStomp() {
    this.squash();
  }

  /** atingido por um objeto arremessado */
  onHit() {
    this.knockOut();
  }

  squash() {
    this.alive = false;
    this.deathMode = 'squash';
    this.deathT = 0;
    if (this.frames.flat) this.sprite.setFrame(this.frames.flat);
    this.game.audio.sfx('stomp');
    this.game.particles.dust(this.cx, this.y + 0.2, 6);
    this.game.addScore(this.score, this.cx, this.y + this.h);
  }

  knockOut() {
    if (!this.alive) return;
    this.alive = false;
    this.deathMode = 'flip';
    this.vy = 10;
    this.vx = (this.cx < this.player.cx ? -1 : 1) * 3;
    if (this.frames.rest) this.sprite.setFrame(this.frames.rest);
    this.game.audio.sfx('punch');
    this.game.particles.burst(this.cx, this.y + 0.4, { color: ['#ffffff', '#ffe066'], count: 8, speed: 5, size: 0.12 });
    this.game.addScore(this.score, this.cx, this.y + this.h);
  }

  dyingUpdate(dt) {
    if (this.deathMode === 'squash') {
      this.deathT += dt;
      if (!this.frames.flat) this.sprite.scale.y = Math.max(0.1, this.sprite.scale.y - dt * 4);
      if (this.deathT > 0.45) this.remove();
    } else {
      this.vy -= 40 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.sprite.rotation.z += dt * 8;
    }
  }

  /** o que o Hans segura nas mãos quando agarra este inimigo */
  carryInfo() {
    return { atlas: 'enemies', frame: this.frames.rest || this.frames.idle || Object.values(this.frames).flat()[0], kind: 'enemy', scale: this.scale * 0.85 };
  }

  removeForGrab() {
    this.alive = false;
    this.remove();
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.alive = false;
    this.sprite.dispose();
  }
}

/**
  Guardião: inimigo GRANDE e parado que tapa uma passagem.
  Não dá para pisar, pular por cima nem agarrar: só cai quando é atingido
  pelo objeto certo (this.weakTo = 'pumpkin', 'snowball', ...).

  Desafios opcionais de TIMING (configurados em init):
    this.window = { closed, open }  só fica vulnerável na janela "aberta" (ex.: boca aberta);
                                    um tremor avisa antes de abrir (tempo previsível)
    this.hp / this.regen            precisa de vários acertos; se demorar mais que
                                    `regen` segundos entre eles, ele se recompõe
*/
export class Guardiao extends Enemy {
  init() {
    this.w = 1.4;
    this.h = 1.8;
    this.scale = 2;
    this.stompable = false;
    this.grabbable = false;
    this.score = 1000;
    this.weakTo = 'crate';
    this.hint = 'Use o objeto certo!';
    this.window = null;
    this.hp = 1;
    this.regen = 0;
  }

  /** está na janela vulnerável? (sem janela configurada: sempre) */
  get exposed() {
    if (!this.window) return true;
    const { closed, open } = this.window;
    return this.t % (closed + open) >= closed;
  }

  think(dt) {
    this.physics(dt);
    const p = this.player;
    this.dir = p.cx > this.cx ? 1 : -1;
    if (this.maxHp === undefined) { this.maxHp = this.hp; this.t = 0; }
    if (this.window) {
      const { closed, open } = this.window;
      const ph = this.t % (closed + open);
      if (ph < closed) {
        this.sprite.setFrame(this.frames.shut || this.frames.rest);
        // aviso: treme um pouco antes de abrir
        this.sprite.rotation.z = ph > closed - 0.45 ? Math.sin(this.t * 60) * 0.06 : 0;
      } else {
        this.sprite.rotation.z = 0;
        this.animate(this.frames.anim, 6);
      }
    } else if (this.frames.anim) this.animate(this.frames.anim, 4);
    // vários acertos: se o jogador demorar, ele se recompõe
    if (this.hp < this.maxHp && this.regen) {
      this.regenT -= dt;
      if (this.regenT <= 0) {
        this.hp = this.maxHp;
        this.resize(1);
        this.game.audio.sfx('magic', { rate: 0.6 });
        this.game.ui.popText('SE RECOMPÔS!', this.cx, this.y + this.h + 0.5, '#ff8a7a');
      }
    }
    // funciona como uma parede: empurra o jogador de volta (mesmo piscando)
    if (!p.dying && p.x + p.w > this.x && p.x < this.x + this.w && p.y < this.y + this.h && p.y + p.h > this.y) {
      if (p.cx < this.cx) p.x = this.x - p.w;
      else p.x = this.x + this.w;
      p.vx = 0;
      p.hurt();
    }
  }

  resize(k) {
    const sp = this.sprite;
    this.baseSize ??= [sp.w, sp.h];
    sp.w = this.baseSize[0] * k;
    sp.h = this.baseSize[1] * k;
    sp.applyScale();
  }

  onHit(projectile) {
    const game = this.game;
    if (projectile?.spec?.kind !== this.weakTo) {
      game.audio.sfx('bump');
      game.ui.popText(this.hint, this.cx, this.y + this.h + 0.4, '#ffcc33');
      return;
    }
    if (!this.exposed) {
      game.audio.sfx('bump');
      game.ui.popText(this.shutHint || 'AGORA NÃO!', this.cx, this.y + this.h + 0.4, '#ffcc33');
      return;
    }
    this.hp--;
    game.particles.burst(this.cx, this.y + 1, { color: ['#ffffff', '#ffe066', '#ff9f1c'], count: 26, speed: 8, size: 0.2 });
    if (this.hp > 0) {
      this.regenT = this.regen;
      game.audio.sfx('punch');
      game.shake(0.25);
      this.resize(0.75 + 0.25 * (this.hp / this.maxHp)); // encolhe a cada acerto
      game.ui.popText(`MAIS ${this.hp}!`, this.cx, this.y + this.h + 0.4, '#9dff7a');
      return;
    }
    game.shake(0.4);
    this.knockOut();
  }
}

/** Anda no chão e vira ao bater em paredes (e, se quiser, nas beiradas) */
export class Walker extends Enemy {
  init() {
    this.speed = 1.6;
    this.turnAtLedges = false;
  }

  think(dt) {
    this.walk(dt);
    this.animate(this.frames.walk, 6);
  }

  walk(dt) {
    this.vx = this.dir * this.speed;
    const res = this.physics(dt);
    if ((this.dir > 0 && res.right) || (this.dir < 0 && res.left)) this.dir *= -1;
    else if (this.turnAtLedges && res.bottom && !groundAhead(this, this.game.level, this.dir)) this.dir *= -1;
    return res;
  }
}
