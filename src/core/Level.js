import * as THREE from 'three';
import { TileBatch } from './TileMap.js';
import { Sprite, LAYER } from './Sprite.js';
import { Parallax } from './Parallax.js';

/*
  Lê o mapa ASCII de uma fase e monta o cenário 2D com os tiles do Kenney.

  LEGENDA COMUM A TODAS AS FASES
    .  vazio                 #  terreno principal (tema)     =  terreno secundário
    -  plataforma flutuante (atravessável por baixo)         _  ponte (atravessável)
    B  tijolos (quebram com cabeçada ou arremesso)
    ?  bloco de moeda        !  bloco de coração
    D  cadeado (abre com chave)        I  bloco de gelo (escorrega)
    L  escada                |  corda (dá para escalar)
    ^  espinhos              ~  lava                         w  água
    C  moeda   h  coração   k  chave   K  bandeira (checkpoint)
    T  janela de dica (invisível: a dica aparece na tela ao passar por ali)
    N  personagem que conversa
    @  interruptor de chão (pule nele ou acerte com um arremesso)
    %  interruptor de teto (só um arremesso PARA CIMA alcança)
    1  bloco AZUL (sólido no começo)   2  bloco VERMELHO (fantasma no começo)
       cada interruptor troca os dois; com def.switchTime eles voltam sozinhos
    W  portão de monstros: some quando todos os inimigos da área morrem
    [  começo da área do próximo portão de monstros (invisível)
    X  caixote de madeira (sólido)
    O  argola (balançar)     S  mola     o  objeto arremessável da fase
    Q  monte infinito do objeto arremessável (reaparece depois de pego)
    G  cristal (fim da fase) P  início do jogador
  Outras letras: inimigos (def.enemies) ou decoração (def.decor), definidos em cada fase.
*/

const SOLID = new Set(['#', '=', 'B', '?', '!', 'U', 'D', 'I', 'W', 'X']);
const SEMI = new Set(['-', '_']);
const CLIMB = new Set(['L', '|']);
const SPAWNS = new Set(['P', 'C', 'h', 'k', 'K', 'T', 'N', 'G', 'O', 'S', 'o', 'Q', '@', '%', '[']);

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.theme = def.theme;
    this.group = new THREE.Group();
    this.blocks = new Map();
    this.bumps = [];
    this.animated = []; // tiles/decoração com 2 quadros (tochas, lava, água)
    this.hazards = []; // caixas que machucam (cactos)
    this.spawns = [];
    this.toggled = false; // estado dos blocos azuis/vermelhos
    this.toggleBlocks = [];
    this.parse(def.map);
    this.build();
  }

  // ---------------- leitura ----------------
  parse(rows) {
    this.height = rows.length;
    this.width = Math.max(...rows.map((r) => r.length));
    this.grid = [];
    for (let y = 0; y < this.height; y++) this.grid.push(new Array(this.width).fill('.'));
    rows.forEach((line, r) => {
      const y = this.height - 1 - r;
      for (let x = 0; x < this.width; x++) {
        const ch = line[x] ?? '.';
        if (ch === '.' || ch === ' ') continue;
        if (SPAWNS.has(ch) || this.def.enemies?.[ch]) this.spawns.push({ ch, x, y });
        else if (this.def.decor?.[ch]) this.spawns.push({ ch, x, y, decor: this.def.decor[ch] });
        else this.grid[y][x] = ch;
      }
    });
    this.start = this.spawns.find((s) => s.ch === 'P') || { x: 2, y: 3 };
  }

  get(x, y) {
    if (y < 0 || y >= this.height) return '.';
    if (x < 0 || x >= this.width) return '#';
    return this.grid[y][x];
  }

  set(x, y, ch) {
    if (y >= 0 && y < this.height && x >= 0 && x < this.width) this.grid[y][x] = ch;
  }

  isSolid(x, y) {
    if (y >= this.height) return false;
    if (x < 0 || x >= this.width) return true; // paredes invisíveis nas bordas
    if (y < 0) return false; // buraco
    const c = this.grid[y][x];
    if (c === '1') return !this.toggled;
    if (c === '2') return this.toggled;
    return SOLID.has(c);
  }

  isSemi(x, y) {
    const c = this.get(x, y);
    // o topo de uma escada/corda também serve de chão
    return SEMI.has(c) || ((c === 'L' || c === '|') && this.get(x, y + 1) !== c);
  }

  isClimb(x, y) {
    return CLIMB.has(this.get(x, y));
  }

  isIce(x, y) {
    return this.get(x, y) === 'I';
  }

  // ---------------- construção ----------------
  build() {
    const t = this.theme;
    const tiles = new TileBatch({ atlas: 'tiles' });
    const ice = new TileBatch({ image: 'iceBlock' });
    const animA = new TileBatch({ atlas: 'tiles', layer: LAYER.tiles + 1 });
    const animB = new TileBatch({ atlas: 'tiles', layer: LAYER.tiles + 1 });

    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const ch = this.grid[y][x];
        switch (ch) {
          case '#': tiles.add(this.autotile(x, y, '#', t.terrain), x, y); break;
          case '=': tiles.add(this.autotile(x, y, '=', t.terrain2 || 'stone'), x, y); break;
          case '-': tiles.add(this.platformTile(x, y, t.platform || t.terrain), x, y); break;
          case '_': tiles.add('bridge', x, y); break;
          case 'L': tiles.add(this.get(x, y + 1) !== 'L' ? 'ladder_top' : this.get(x, y - 1) !== 'L' ? 'ladder_bottom' : 'ladder_middle', x, y); break;
          case '|': tiles.add(this.get(x, y + 1) !== '|' ? 'rop_attached' : 'rope', x, y); break;
          case '^': tiles.add('spikes', x, y); break;
          case 'I': ice.add(null, x, y); break;
          case '~':
          case 'w': {
            const name = ch === '~' ? 'lava' : 'water';
            if (this.get(x, y + 1) === ch) tiles.add(name, x, y);
            else {
              animA.add(name + '_top', x, y);
              animB.add(name + '_top_low', x, y);
            }
            break;
          }
          case 'B':
          case '?':
          case '!':
          case 'D':
          case 'W':
          case 'X':
          case '1':
          case '2':
            this.makeBlock(x, y, ch);
            break;
          default:
            break;
        }
      }
    for (const b of [tiles, ice]) {
      const m = b.build();
      if (m) this.group.add(m);
    }
    const a = animA.build(), b = animB.build();
    if (a && b) {
      this.group.add(a, b);
      b.visible = false;
      this.liquid = [a, b];
    }

    // decoração vinda do mapa (letras de def.decor)
    for (const s of this.spawns) if (s.decor) this.addDecor(s.decor, s.x + 0.5, s.y);

    // fundo em camadas
    this.parallax = new Parallax(t.layers || []);
    this.group.add(this.parallax.group);

    // decoração extra feita por código em cada fase
    if (this.def.decorate) {
      let seed = 7;
      const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this.def.decorate({ level: this, rand, add: (src, x, y, o) => this.addDecor(src, x, y, o), surfaceY: (x) => this.surfaceY(x) });
    }
  }

  /** escolhe o tile certo do terreno conforme os vizinhos (autotiling) */
  autotile(x, y, ch, type) {
    const same = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      if (ny < 0) return true; // abaixo da fase conta como terreno (sem borda de baixo)
      if (nx < 0 || nx >= this.width) return true;
      return this.get(nx, ny) === ch;
    };
    const up = same(0, 1), down = same(0, -1), left = same(-1, 0), right = same(1, 0);
    const p = `terrain_${type}_`;
    if (!up && !down) {
      if (!left && !right) return p + 'block';
      return p + 'horizontal_' + (!left ? 'left' : !right ? 'right' : 'middle');
    }
    if (!left && !right) return p + 'vertical_' + (!up ? 'top' : !down ? 'bottom' : 'middle');
    const row = !up ? 'top' : !down ? 'bottom' : '';
    const col = !left ? 'left' : !right ? 'right' : '';
    if (row && col) return `${p}block_${row}_${col}`;
    if (row) return `${p}block_${row}`;
    if (col) return `${p}block_${col}`;
    return p + 'block_center';
  }

  platformTile(x, y, type) {
    const l = this.get(x - 1, y) === '-', r = this.get(x + 1, y) === '-';
    const p = `terrain_${type}_cloud`;
    if (!l && !r) return p;
    return p + (!l ? '_left' : !r ? '_right' : '_middle');
  }

  /** decoração: { frame } do atlas de tiles, ou { image } avulsa; frames:[a,b] anima */
  addDecor(d, x, y, o = {}) {
    const opts = { ...d, ...o };
    const layer = opts.front ? LAYER.decorFront : opts.layer ?? LAYER.decorBack;
    const sp = opts.image
      ? new Sprite({ image: opts.image, scale: opts.scale ?? 1, layer })
      : new Sprite({ atlas: 'tiles', frame: opts.frames ? opts.frames[0] : opts.frame, scale: opts.scale ?? 1, layer });
    sp.position.set(x + (opts.dx ?? 0), y + (opts.dy ?? 0), 0);
    if (opts.flip) sp.flip(true);
    // decoração que machuca (ex.: cacto)
    if (opts.hurts) this.hazards.push({ x: x - 0.32, y, w: 0.64, h: Math.min(sp.h * 0.85, 1.2) });
    if (opts.frames) this.animated.push({ sp, frames: opts.frames, speed: opts.speed ?? 4, t: Math.random() });
    this.group.add(sp);
    return sp;
  }

  makeBlock(x, y, ch) {
    const frameOf = { B: 'bricks_brown', '?': 'block_coin', '!': 'block_exclamation', D: 'lock_yellow', W: 'block_strong_danger', X: 'block_planks', 1: 'block_blue', 2: 'block_red' };
    const toggle = ch === '1' || ch === '2';
    const sp = new Sprite({ atlas: 'tiles', frame: frameOf[ch], anchor: 'bottom', layer: LAYER.tiles, own: toggle });
    sp.position.set(x + 0.5, y, 0);
    sp.userData.baseY = y;
    this.group.add(sp);
    this.blocks.set(x + ',' + y, sp);
    if (toggle) {
      this.toggleBlocks.push({ sp, ch, x, y });
      this.paintToggle(this.toggleBlocks.at(-1), 1);
    }
  }

  /** bloco sólido = opaco; bloco "fantasma" = só o contorno, dá para atravessar */
  paintToggle(b, alpha) {
    const solid = b.ch === '1' ? !this.toggled : this.toggled;
    b.sp.setOpacity(solid ? alpha : 0.22);
  }

  /** troca os blocos azuis e vermelhos */
  setToggle(on) {
    if (this.toggled === on) return;
    this.toggled = on;
    const game = this.game;
    for (const b of this.toggleBlocks) this.paintToggle(b, 1);
    game.audio.sfx(on ? 'magic' : 'bump', { volume: 0.8 });
    game.shake(0.12);
    // quem estiver dentro de um bloco que acabou de ficar sólido é empurrado para cima dele
    const pushOut = (o) => {
      for (let i = 0; i < 4; i++) {
        const tx0 = Math.floor(o.x), tx1 = Math.floor(o.x + o.w - 0.01), ty = Math.floor(o.y + 0.05);
        if (!this.isSolid(tx0, ty) && !this.isSolid(tx1, ty) && !this.isSolid(tx0, Math.floor(o.y + o.h - 0.05))) return;
        o.y = ty + 1;
        o.vy = Math.max(0, o.vy || 0);
      }
    };
    pushOut(game.player);
    for (const it of game.items) if (!it.removed && it.vy !== undefined && it.touchable === false && it.spec) pushOut(it);
    for (const e of game.enemies) if (e.alive && !e.removed && e.gravity) pushOut(e);
  }

  /** pisca os blocos que vão trocar (aviso do interruptor com relógio) */
  warnToggle(time) {
    const a = Math.floor(time * 8) % 2 ? 0.45 : 1;
    for (const b of this.toggleBlocks) this.paintToggle(b, a);
  }

  /**
   * O Rei quebra os caixotes (X) que encostam na área [x0, x1] e todos os que estão
   * grudados neles (a pilha inteira cai junto). Eles voltam depois de `back` segundos.
   */
  smashCrates(x0, x1, y0 = -1, y1 = 99) {
    const seen = new Set(), cells = [];
    const stack = [];
    for (let x = Math.floor(x0); x <= Math.floor(x1); x++)
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.height - 1, Math.floor(y1)); y++)
        if (this.get(x, y) === 'X') stack.push([x, y]);
    while (stack.length) {
      const [x, y] = stack.pop();
      const k = x + ',' + y;
      if (seen.has(k) || this.get(x, y) !== 'X') continue;
      seen.add(k);
      cells.push([x, y]);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (!cells.length) return 0;
    const game = this.game;
    for (const [x, y] of cells) {
      this.set(x, y, '.');
      this.blocks.get(x + ',' + y)?.dispose();
      this.blocks.delete(x + ',' + y);
      game.particles.burst(x + 0.5, y + 0.5, { color: ['#c9733c', '#8a4b22', '#f2c28b'], count: 8, speed: 7, size: 0.18, gravity: 30 });
    }
    game.audio.sfx('break');
    (this.brokenCrates ||= []).push({ cells, t: 9 });
    return cells.length;
  }

  /** caixotes quebrados voltam depois de um tempo (se não tiver ninguém no lugar) */
  updateCrates(dt) {
    if (!this.brokenCrates?.length) return;
    const game = this.game;
    for (const g of this.brokenCrates) {
      g.t -= dt;
      if (g.t > 0) continue;
      const xs = g.cells.map((c) => c[0]), ys = g.cells.map((c) => c[1]);
      const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
      const inside = (o) => o.x < box.x + box.w && o.x + o.w > box.x && o.y < box.y + box.h && o.y + o.h > box.y;
      if (inside(game.player) || game.enemies.some((e) => e.alive && !e.removed && e.w > 2 && inside(e))) { g.t = 0.5; continue; }
      for (const [x, y] of g.cells) {
        this.set(x, y, 'X');
        this.makeBlock(x, y, 'X');
        game.particles.burst(x + 0.5, y + 0.5, { color: ['#f2c28b', '#ffffff'], count: 4, speed: 3, size: 0.12 });
      }
      // bolas de neve caídas dentro do caixote sobem para cima dele
      for (const it of game.items) if (!it.removed && it.spec && inside(it)) { it.y = box.y + box.h; it.vy = 0; }
      g.done = true;
      game.audio.sfx('plank', { volume: 0.6 });
    }
    this.brokenCrates = this.brokenCrates.filter((g) => !g.done);
  }

  /** abre um portão de monstros (remove as células W) */
  openGate(cells) {
    for (const [x, y] of cells) {
      this.set(x, y, '.');
      const sp = this.blocks.get(x + ',' + y);
      sp?.dispose();
      this.blocks.delete(x + ',' + y);
      this.game.particles.burst(x + 0.5, y + 0.5, { color: ['#c7ccd6', '#e2463b', '#ffffff'], count: 6, speed: 6, size: 0.2, gravity: 25 });
    }
  }

  /** topo do chão na coluna x (ignorando tetos) */
  surfaceY(x) {
    for (let y = this.height - 1; y >= 0; y--) {
      const above = this.get(x, y + 1), here = this.get(x, y);
      if (here === '1' || here === '2') return null; // nada de decoração em cima de blocos que somem
      if (this.isSolid(x, y) && !this.isSolid(x, y + 1) && above !== '~' && above !== 'w') return y + 1;
    }
    return null;
  }

  // ---------------- interação ----------------
  /** o jogador bateu a cabeça num bloco */
  hitBlock(x, y, player) {
    const ch = this.get(x, y);
    const game = this.game;
    const sp = this.blocks.get(x + ',' + y);
    game.onBlockBumped(x, y);
    if (ch === '?' || ch === '!') {
      this.set(x, y, 'U');
      sp?.setFrame('block_empty');
      this.bump(sp);
      if (ch === '?') game.spawnPopCoin(x + 0.5, y + 1);
      else game.spawnHeart(x, y + 1);
    } else if (ch === 'B') {
      this.breakBlock(x, y);
    } else if (ch === 'D') {
      this.tryUnlock(x, y, player);
    } else {
      game.audio.sfx('bump', { volume: 0.6 });
    }
  }

  /** arremessos derrubam a coluna inteira de tijolos */
  breakColumn(x, y) {
    let top = y, bottom = y;
    while (this.get(x, top + 1) === 'B') top++;
    while (this.get(x, bottom - 1) === 'B') bottom--;
    for (let yy = bottom; yy <= top; yy++) this.breakBlock(x, yy);
  }

  breakBlock(x, y) {
    if (this.get(x, y) !== 'B') return false;
    this.set(x, y, '.');
    const sp = this.blocks.get(x + ',' + y);
    if (sp) {
      sp.dispose();
      this.blocks.delete(x + ',' + y);
    }
    this.game.particles.burst(x + 0.5, y + 0.5, { color: ['#b5643a', '#8a4524', '#d98a55'], count: 14, speed: 7, size: 0.22, gravity: 30 });
    this.game.audio.sfx('break');
    this.game.addScore(50, x + 0.5, y + 1);
    return true;
  }

  tryUnlock(x, y, player) {
    if (this.get(x, y) !== 'D') return;
    if (this.game.session.keys > 0) {
      this.game.session.keys--;
      this.set(x, y, '.');
      const sp = this.blocks.get(x + ',' + y);
      sp?.dispose();
      this.blocks.delete(x + ',' + y);
      this.game.particles.burst(x + 0.5, y + 0.5, { color: ['#ffcc33', '#fff3b0'], count: 16, speed: 5 });
      this.game.audio.sfx('magic');
      // cadeados vizinhos abrem juntos (portões)
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]])
        if (this.get(x + dx, y + dy) === 'D') {
          this.game.session.keys++;
          this.tryUnlock(x + dx, y + dy, player);
        }
    } else {
      this.game.audio.sfx('locked');
      this.game.ui.popText('PRECISA DE CHAVE', x + 0.5, y + 1.2, '#ffcc33');
    }
  }

  bump(sp) {
    if (sp) this.bumps.push({ sp, t: 0 });
  }

  update(dt, time) {
    for (let i = this.bumps.length - 1; i >= 0; i--) {
      const b = this.bumps[i];
      b.t += dt;
      const k = b.t / 0.18;
      b.sp.position.y = b.sp.userData.baseY + Math.sin(Math.min(k, 1) * Math.PI) * 0.3;
      if (k >= 1) {
        b.sp.position.y = b.sp.userData.baseY;
        this.bumps.splice(i, 1);
      }
    }
    if (this.liquid) {
      const on = Math.floor(time * 2) % 2 === 0;
      this.liquid[0].visible = on;
      this.liquid[1].visible = !on;
    }
    for (const a of this.animated) {
      a.t += dt * a.speed;
      a.sp.setFrame(a.frames[Math.floor(a.t) % a.frames.length]);
    }
  }

  dispose() {
    this.parallax?.dispose();
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}
