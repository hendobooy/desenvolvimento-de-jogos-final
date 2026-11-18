import { moveAndCollide } from '../core/Physics.js';
import { Sprite, LAYER, ambientColor } from '../core/Sprite.js';

/*
  Hans, o pequeno astronauta (sprite "character_green" do Kenney New Platformer Pack).

  Mecânicas:
    - andar e pular (pulo mais alto segurando o botão)
    - AGARRAR e ARREMESSAR (X): pega caixas/pedras/abóboras/bolas de neve e inimigos atordoados
    - ESCALAR escadas e cordas (↑ ↓)
    - BALANÇAR em argolas (X perto de uma argola, PULO para soltar com impulso)
    - pisar em inimigos, cabeçada em blocos
*/

const T = {
  walkSpeed: 6.8,
  accelGround: 55,
  accelAir: 34,
  friction: 50,
  iceAccel: 14,
  iceFriction: 5,
  gravityUp: 32,
  gravityDown: 58,
  maxFall: 22,
  jumpSpeed: 14,
  coyoteTime: 0.1,
  jumpBuffer: 0.13,
  stompBounce: 11,
  climbSpeed: 4.5,
  throwSpeed: 13,
};

export class Player {
  constructor(game, color = 'green') {
    this.game = game;
    this.color = color;
    this.w = 0.7;
    this.h = 0.95;
    this.sprite = new Sprite({ atlas: 'characters', frame: this.f('idle'), scale: 0.7, layer: LAYER.player, own: true });
    this.carriedSprite = null;
    this.maxHearts = 3;
    this.reset(2, 3);
  }

  /** troca o visual (cor do astronauta) */
  setColor(color) {
    this.color = color;
    this.sprite.frameName = null;
    this.sprite.setFrame(this.f('idle'));
  }

  f(name) {
    return `character_${this.color}_${name}`;
  }

  attach(scene) {
    scene.add(this.sprite);
  }

  reset(x, y) {
    Object.assign(this, {
      x, y, vx: 0, vy: 0, prevY: y, safeX: x, safeY: y, onGround: false, facing: 1,
      invuln: 0, coyote: 0, buffer: 0, jumpHeld: false,
      moveDir: 0, upHeld: false, downHeld: false, actionPressed: false,
      locked: false, dying: false, deathT: 0, reported: false,
      mode: 'normal', walkT: 0, onIce: false, ring: null,
    });
    this.hearts = this.maxHearts;
    this.dropCarried(true);
    this.sprite.rotation.z = 0;
    this.sprite.visible = true;
    this.sync(0);
  }

  get cx() { return this.x + this.w / 2; }

  handleInput(input) {
    if (this.locked || this.dying) {
      this.moveDir = 0;
      this.jumpHeld = this.upHeld = this.downHeld = false;
      this.actionPressed = false;
      return;
    }
    this.moveDir = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    this.upHeld = input.isDown('up');
    this.downHeld = input.isDown('down');
    if (input.pressed('jump')) this.buffer = T.jumpBuffer;
    this.jumpHeld = input.isDown('jump');
    if (input.pressed('action')) this.actionPressed = true;
    this.actionHeld = input.isDown('action');
  }

  // ============================================================
  update(dt) {
    const game = this.game;
    if (this.dying) return this.updateDeath(dt);
    if (this.invuln > 0) this.invuln -= dt;

    const action = this.actionPressed;
    this.actionPressed = false;

    if (this.mode === 'swing') this.updateSwing(dt, action);
    else if (this.mode === 'climb') this.updateClimb(dt, action);
    else this.updateNormal(dt, action);

    this.checkHazards();
    // último chão seguro (a vida infinita devolve o Hans para cá se ele cair num buraco)
    if (this.onGround && this.mode === 'normal' && this.game.level.isSolid(Math.floor(this.cx), Math.floor(this.y - 0.1))) {
      this.safeX = this.x;
      this.safeY = this.y;
    }
    if (this.y < -3) this.die();
    this.sync(dt);
  }

  updateNormal(dt, action) {
    const game = this.game;
    const lvl = game.level;

    // --- ação: arremessar / argola / agarrar ---
    if (action) {
      if (this.carried) this.throwCarried();
      else {
        const ring = game.findRing(this);
        if (ring) return this.startSwing(ring);
        const target = game.findGrabbable(this);
        if (target) this.grab(target);
      }
    }

    // segurando X no ar perto de uma estrela: agarra sozinho
    if (!action && this.actionHeld && !this.carried && !this.onGround && this.vy < 6) {
      const ring = game.findRing(this);
      if (ring && ring !== this.lastRing) return this.startSwing(ring);
    }
    if (this.onGround) this.lastRing = null;

    // --- começar a escalar ---
    if ((this.upHeld || (this.downHeld && this.onGround)) && !this.carried && this.overClimb(this.downHeld && !this.upHeld)) {
      this.mode = 'climb';
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // --- movimento horizontal (no gelo escorrega) ---
    const accel = this.onIce ? T.iceAccel : this.onGround ? T.accelGround : T.accelAir;
    const fric = this.onIce ? T.iceFriction : this.onGround ? T.friction : T.friction * 0.25;
    if (this.moveDir !== 0) {
      const fast = Math.abs(this.vx) > T.walkSpeed && Math.sign(this.vx) === this.moveDir;
      if (fast) {
        // veio de um impulso (argola, mola): mantém a velocidade e perde aos poucos
        this.vx -= Math.sign(this.vx) * (this.onGround ? T.friction : 4) * dt;
      } else {
        this.vx += this.moveDir * accel * dt;
        if (Math.abs(this.vx) > T.walkSpeed) this.vx = Math.sign(this.vx) * T.walkSpeed;
      }
      this.facing = this.moveDir;
    } else {
      const f = fric * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }

    // --- pulo ---
    this.coyote = this.onGround ? T.coyoteTime : this.coyote - dt;
    this.buffer -= dt;
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = T.jumpSpeed;
      this.buffer = 0;
      this.coyote = 0;
      this.onGround = false;
      game.audio.sfx('jump', { volume: 0.7 });
      game.particles.dust(this.cx, this.y, 4);
    }
    const g = this.vy > 0 && this.jumpHeld ? T.gravityUp : T.gravityDown;
    this.vy = Math.max(this.vy - g * dt, -T.maxFall);

    // --- colisão ---
    this.prevY = this.y;
    const wasGround = this.onGround;
    const vxBefore = this.vx;
    const res = moveAndCollide(this, lvl, dt);
    this.onGround = res.bottom;
    if (res.top && res.headTiles.length) lvl.hitBlock(res.headTiles[0][0], res.headTiles[0][1], this);
    // encostar num cadeado com a chave abre
    if (res.left || res.right) {
      const tx = res.right ? Math.floor(this.x + this.w + 0.01) : Math.floor(this.x - 0.01);
      for (const ty of [Math.floor(this.y + 0.1), Math.floor(this.y + this.h - 0.1)])
        if (lvl.get(tx, ty) === 'D' && this.game.session.keys > 0) lvl.tryUnlock(tx, ty, this);
    }
    // ajuda na quina: sobe degraus pequenos quando cai rente a eles
    if ((res.left || res.right) && this.vy <= 0 && !this.onGround) {
      const tx = res.right ? Math.floor(this.x + this.w + 0.01) : Math.floor(this.x - 0.01);
      const ty = Math.floor(this.y);
      if (ty + 1 - this.y < 0.35 && lvl.isSolid(tx, ty) && !lvl.isSolid(tx, ty + 1) && !lvl.isSolid(tx, ty + 2)) {
        this.y = ty + 1;
        this.vy = 0;
        this.vx = vxBefore;
        this.onGround = true;
      }
    }
    if (this.onGround) {
      const fx0 = Math.floor(this.x + 0.1), fx1 = Math.floor(this.x + this.w - 0.1), fy = Math.floor(this.y - 0.05);
      this.onIce = lvl.isIce(fx0, fy) || lvl.isIce(fx1, fy);
    }
    if (!wasGround && this.onGround) game.particles.dust(this.cx, this.y, 3);
  }

  // ---------------- escalar ----------------
  overClimb(goingDown = false) {
    const lvl = this.game.level;
    const tx = Math.floor(this.cx);
    const y0 = Math.floor(this.y + 0.1), y1 = Math.floor(this.y + this.h * 0.8);
    if (goingDown) return lvl.isClimb(tx, Math.floor(this.y - 0.2));
    for (let ty = y0; ty <= y1; ty++) if (lvl.isClimb(tx, ty)) return true;
    return false;
  }

  updateClimb(dt, action) {
    const lvl = this.game.level;
    const dir = (this.upHeld ? 1 : 0) - (this.downHeld ? 1 : 0);
    this.vy = dir * T.climbSpeed;
    this.vx = this.moveDir * 2;
    if (this.moveDir) this.facing = this.moveDir;
    // centraliza na escada
    const tx = Math.floor(this.cx);
    this.x += (tx + 0.5 - this.w / 2 - this.x) * Math.min(1, dt * 10);
    this.prevY = this.y;
    const res = moveAndCollide(this, lvl, dt, { semisolid: false });
    this.walkT += Math.abs(this.vy) * dt;
    const still = this.overClimb() || lvl.isClimb(Math.floor(this.cx), Math.floor(this.y - 0.05));
    if (this.buffer > 0) {
      // pular solta da escada
      this.buffer = 0;
      this.mode = 'normal';
      this.vy = T.jumpSpeed * 0.75;
      this.vx = this.moveDir * T.walkSpeed;
      this.game.audio.sfx('jump', { volume: 0.6 });
      return;
    }
    if (!still || (res.bottom && dir < 0) || action) {
      this.mode = 'normal';
      if (!still && dir > 0) this.vy = 4; // chegou ao topo: um pulinho para subir
    }
  }

  // ---------------- argola (balanço) ----------------
  startSwing(ring) {
    const hx = this.cx, hy = this.y + this.h;
    const dx = hx - ring.ax, dy = hy - ring.ay;
    this.ring = ring;
    this.mode = 'swing';
    this.swingL = Math.min(2.4, Math.max(1.6, Math.hypot(dx, dy)));
    this.theta = Math.atan2(dx, -dy);
    this.omega = (this.vx * Math.cos(this.theta) + this.vy * Math.sin(this.theta)) / this.swingL;
    this.game.audio.sfx('pickup');
    ring.grab();
  }

  updateSwing(dt, action) {
    const ring = this.ring;
    const L = this.swingL;
    // pêndulo: aceleração angular = -(g/L)·sen(θ) + "bombeada" do jogador
    const pump = this.moveDir * 5 / L;
    this.omega += (-(30 / L) * Math.sin(this.theta) + pump) * dt;
    this.omega *= 1 - 0.15 * dt;
    this.omega = Math.max(-5, Math.min(5, this.omega));
    this.theta += this.omega * dt;
    const hx = ring.ax + Math.sin(this.theta) * L;
    const hy = ring.ay - Math.cos(this.theta) * L;
    const nx = hx - this.w / 2, ny = hy - this.h;
    const lvl = this.game.level;
    const blocked = lvl.isSolid(Math.floor(nx + 0.05), Math.floor(ny + 0.05)) || lvl.isSolid(Math.floor(nx + this.w - 0.05), Math.floor(ny + 0.05)) ||
      lvl.isSolid(Math.floor(nx + 0.05), Math.floor(ny + this.h - 0.05)) || lvl.isSolid(Math.floor(nx + this.w - 0.05), Math.floor(ny + this.h - 0.05));
    if (blocked) {
      this.omega *= -0.4;
      this.theta += this.omega * dt * 2;
    } else {
      this.x = nx;
      this.y = ny;
    }
    this.facing = this.omega >= 0 ? 1 : -1;
    ring.setRope(this.theta, L);
    if (this.buffer > 0 || action) {
      // solta com impulso tangencial (estilo Ristar)
      let vx = this.omega * L * Math.cos(this.theta);
      let vy = this.omega * L * Math.sin(this.theta);
      if (this.buffer > 0) {
        // impulso estilo Ristar: garante uma velocidade mínima na direção do balanço
        const sp = Math.hypot(vx, vy) || 1;
        const k = Math.max(1.2, 9 / sp);
        vx *= k;
        vy = vy * k + 8;
      }
      this.vx = vx;
      this.vy = vy;
      this.buffer = 0;
      this.mode = 'normal';
      this.ring = null;
      this.lastRing = ring; // não reagarra a mesma estrela logo em seguida
      ring.release();
      this.game.audio.sfx('jumpHigh', { volume: 0.7 });
    }
  }

  // ---------------- agarrar / arremessar ----------------
  grab(target) {
    this.carried = target.carryInfo(); // { frame | image, atlas, kind, scale }
    target.removeForGrab();
    const c = this.carried;
    this.carriedSprite = c.image
      ? new Sprite({ image: c.image, scale: c.scale ?? 1, layer: LAYER.player + 1 })
      : new Sprite({ atlas: c.atlas, frame: c.frame, scale: c.scale ?? 1, layer: LAYER.player + 1 });
    this.game.scene.add(this.carriedSprite);
    this.game.audio.sfx('pickup');
  }

  throwCarried() {
    const c = this.carried;
    const dir = this.facing;
    let vx = dir * T.throwSpeed + this.vx * 0.3;
    let vy = 3;
    let y = this.y + 0.3; // sai na altura do peito: funciona até em túneis baixos
    if (this.upHeld) { vx = dir * 3; vy = 15; y = this.y + this.h + 0.1; } // para cima
    if (this.downHeld && this.onGround) { vx = dir * 2; vy = 2; } // só larga
    this.game.spawnProjectile(c, this.cx - 0.3 + dir * 0.4, y, vx, vy);
    this.game.audio.sfx('throw');
    this.dropCarried(true);
  }

  dropCarried(silent) {
    if (this.carriedSprite) this.carriedSprite.dispose();
    this.carriedSprite = null;
    this.carried = null;
  }

  // ---------------- dano ----------------
  checkHazards() {
    const lvl = this.game.level;
    const x0 = Math.floor(this.x + 0.12), x1 = Math.floor(this.x + this.w - 0.12);
    const y0 = Math.floor(this.y), y1 = Math.floor(this.y + this.h);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const ch = lvl.get(tx, ty);
        if ((ch === '~' || ch === 'w') && this.y < ty + 0.6) return this.die();
        if (ch === '^' && this.y < ty + 0.45) return this.hurt(true);
      }
  }

  bounce() {
    this.vy = this.jumpHeld ? T.stompBounce + 4 : T.stompBounce;
  }

  hurt(fromSpikes = false) {
    if (this.invuln > 0 || this.dying || this.god || this.locked) return;
    this.hearts--;
    this.game.audio.sfx('hurt');
    this.game.shake(0.25);
    if (this.hearts <= 0) return this.die();
    this.invuln = 1.6;
    this.vy = fromSpikes ? 12 : 8;
    this.vx = -this.facing * 5;
    if (this.mode !== 'normal') this.leaveSpecialModes();
  }

  leaveSpecialModes() {
    if (this.ring) this.ring.release();
    this.ring = null;
    this.mode = 'normal';
  }

  inLiquid() {
    const ch = this.game.level.get(Math.floor(this.cx), Math.floor(this.y + 0.3));
    return ch === '~' || ch === 'w';
  }

  heal() {
    if (this.hearts < this.maxHearts) this.hearts++;
  }

  die() {
    if (this.dying) return;
    if (this.god) {
      if (this.y < -3 || this.inLiquid()) {
        this.leaveSpecialModes();
        this.x = this.safeX ?? this.x;
        this.y = (this.safeY ?? 10) + 0.05;
        this.vx = this.vy = 0;
        this.invuln = 1;
      }
      return;
    }
    this.leaveSpecialModes();
    this.dropCarried(true);
    this.dying = true;
    this.hearts = 0;
    this.deathT = 0;
    this.vy = 14;
    this.vx = 0;
    this.game.onPlayerDied();
  }

  updateDeath(dt) {
    this.deathT += dt;
    if (this.deathT > 0.45) {
      this.vy -= 40 * dt;
      this.y += this.vy * dt;
    }
    this.sprite.setFrame(this.f('hit'));
    this.sync(dt);
    if (this.deathT > 2.2 && !this.reported) {
      this.reported = true;
      this.game.onPlayerDeathDone();
    }
  }

  // ---------------- visual ----------------
  sync(dt) {
    const sp = this.sprite;
    sp.position.set(this.cx, this.y - 0.04, 0);
    if (!this.dying) {
      let frame = 'idle';
      if (this.locked && this.onGround) frame = 'front';
      else if (this.invuln > 1.2) frame = 'hit';
      else if (this.mode === 'climb') frame = Math.floor(this.walkT * 3) % 2 ? 'climb_a' : 'climb_b';
      else if (this.mode === 'swing' || !this.onGround) frame = 'jump';
      else if (Math.abs(this.vx) > 0.4) {
        this.walkT += Math.abs(this.vx) * dt;
        frame = Math.floor(this.walkT * 1.6) % 2 ? 'walk_a' : 'walk_b';
      } else if (this.downHeld) frame = 'duck';
      sp.setFrame(this.f(frame));
      sp.flip(this.facing < 0);
    }
    // piscando quando invulnerável
    sp.visible = this.invuln > 0 && !this.dying ? Math.floor(this.invuln * 16) % 2 === 0 : true;
    sp.material.color.copy(ambientColor());
    if (this.carriedSprite) this.carriedSprite.position.set(this.cx, this.y + this.h + 0.02, 0);
  }
}
