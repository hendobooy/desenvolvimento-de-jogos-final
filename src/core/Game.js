import * as THREE from 'three';
import { Input } from './Input.js';
import { AudioSys } from './Audio.js';
import { UI } from './UI.js';
import { Level } from './Level.js';
import { Particles } from './Particles.js';
import { overlap } from './Physics.js';
import { setAmbient } from './Sprite.js';
import { Player } from '../entities/Player.js';
import { Coin, PopCoin, Heart, Key, Gem, Checkpoint, TipTrigger, Switch, NPC, Spring, SwingRing, Throwable, Projectile } from '../entities/Items.js';
import { LEVELS } from '../levels/index.js';
import { spriteHTML } from './UI.js';

// visuais da loja: as cores de personagem do New Platformer Pack (Kenney, CC0)
const SKINS = [
  { id: 'green', name: 'Verde', price: 0 },
  { id: 'beige', name: 'Bege', price: 30 },
  { id: 'pink', name: 'Rosa', price: 60 },
  { id: 'purple', name: 'Lilás', price: 100 },
  { id: 'yellow', name: 'Amarelo', price: 150 },
];

/*
  Game: o "maestro" do jogo.
  - cria o renderer do Three.js com CÂMERA ORTOGRÁFICA (visão 2D lateral)
  - controla os estados (título, história, jogando, pausa, fim...)
  - carrega as fases e cria as entidades a partir do mapa
  - roda a física em passo fixo (120 Hz) para o jogo se comportar igual em qualquer PC
*/

const STEP = 1 / 120;
const VIEW_H = 12; // altura visível, em tiles
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Game {
  constructor(canvas, uiRoot, audio) {
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('debug'); // ?debug -> modo apresentação

    // ---------- Three.js ----------
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-8, 8, 6, -6, -100, 100);
    this.camera.position.z = 10;

    // ---------- sistemas ----------
    this.input = new Input();
    this.audio = audio;
    this.particles = new Particles(this.scene);
    this.player = new Player(this);
    this.player.attach(this.scene);
    this.ui = new UI(this, uiRoot);

    this.levels = LEVELS;
    this.session = this.freshSession();
    this.progress = this.loadProgress();
    this.player.setColor(this.progress.skin);
    this.state = 'title';
    this.time = 0;
    this.acc = 0;
    this.shakeAmt = 0;
    this.timeLeft = 0;
    this.camX = 0;
    this.camY = 0;
    this.checkpoint = null;
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.switches = [];
    this.gates = [];
    this.tipsSeen = new Set();
    this.cheatLife = false; // código secreto ↑↑↓↓←→←→
    this.switchLeft = 0;

    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.togglePause();
    });
    this.resize();
    if (!LEVELS.length) {
      uiRoot.innerHTML = '<div class="screen"><div class="panel">Nenhuma fase encontrada em src/levels/</div></div>';
      return;
    }
    this.loadLevel(0);
    this.showSplash();
    this.lastT = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  freshSession() {
    return { lives: 3, coins: 0, score: 0, keys: 0, gems: [] };
  }

  // ======================================================
  //  Carregamento de fase
  // ======================================================
  loadLevel(index) {
    if (this.level) {
      this.scene.remove(this.level.group);
      this.level.dispose();
    }
    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = new Level(this, def);
    this.scene.add(this.level.group);
    const t = def.theme;
    this.renderer.setClearColor(t.sky || '#87ceeb');
    setAmbient(t.ambient || '#ffffff');

    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.rings = [];
    this.switches = [];
    this.gates = [];
    this.switchLeft = 0;
    this.boss = null;
    this.bossDefeated = false;
    this.nearSign = null;
    this.session.keys = 0;
    this.ui.bossBar(null);
    this.particles.clear();

    const tips = def.tips || [];
    const npcs = def.npcs || [];
    const spawns = [...this.level.spawns].filter((s) => !s.decor).sort((a, b) => a.x - b.x || b.y - a.y);
    const zoneMarks = [];
    let si = 0, ni = 0;
    for (const s of spawns) {
      switch (s.ch) {
        case 'P': break;
        case 'C': this.items.push(new Coin(this, s.x, s.y)); break;
        case 'h': this.items.push(new Heart(this, s.x, s.y)); break;
        case 'k': this.items.push(new Key(this, s.x, s.y)); break;
        case 'K': this.items.push(new Checkpoint(this, s.x, s.y)); break;
        case 'T': {
          const id = si++;
          if (!this.tipsSeen.has(index + ':' + id)) this.items.push(new TipTrigger(this, s.x, s.y, tips[id], id));
          break;
        }
        case '@':
        case '%': {
          const sw = new Switch(this, s.x, s.y, s.ch === '%' ? 'ceiling' : 'floor');
          this.items.push(sw);
          this.switches.push(sw);
          break;
        }
        case '[': zoneMarks.push(s.x); break;
        case 'N': this.items.push(new NPC(this, s.x, s.y, npcs[ni++])); break;
        case 'S': this.items.push(new Spring(this, s.x, s.y)); break;
        case 'o': this.items.push(new Throwable(this, s.x, s.y, def.throwable)); break;
        case 'Q': this.items.push(new Throwable(this, s.x, s.y, { ...def.throwable, respawn: true })); break;
        case 'O': {
          const r = new SwingRing(this, s.x, s.y);
          this.items.push(r);
          this.rings.push(r);
          break;
        }
        case 'G': {
          const g = new Gem(this, s.x, s.y, def.gem || 'green');
          if (def.gemAfterBoss) g.setHidden(true);
          this.gem = g;
          this.items.push(g);
          break;
        }
        default: {
          const EnemyClass = def.enemies[s.ch];
          const e = new EnemyClass(this, s.x, s.y);
          e.spawnX = s.x;
          this.enemies.push(e);
        }
      }
    }
    this.buildGates(zoneMarks);
    this.player.god = this.cheatLife || !!this.debugGod;

    const cp = this.checkpoint && this.checkpoint.level === index ? this.checkpoint : null;
    const start = cp || this.level.start;
    this.player.reset(start.x + 0.15, start.y);
    this.timeLeft = def.time || 300;
    this.snapCamera();
  }

  /**
   * Portões de monstros: cada coluna de W é um portão. A "área" dele vai da marca [
   * mais próxima à esquerda até o portão; ele abre quando todos os inimigos dela caem.
   */
  buildGates(zoneMarks) {
    const L = this.level;
    const cols = new Map();
    for (let y = 0; y < L.height; y++)
      for (let x = 0; x < L.width; x++) if (L.grid[y][x] === 'W') {
        const key = cols.has(x - 1) ? x - 1 : x; // colunas vizinhas formam um portão só
        if (!cols.has(key)) cols.set(key, []);
        cols.get(key).push([x, y]);
      }
    for (const [gx, cells] of [...cols].sort((a, b) => a[0] - b[0])) {
      const from = Math.max(gx - 18, ...zoneMarks.filter((m) => m < gx));
      const enemies = this.enemies.filter((e) => e.spawnX >= from && e.spawnX < gx);
      const top = Math.max(...cells.map((c) => c[1]));
      this.gates.push({ x: gx, top, cells, enemies, left: enemies.length, open: false, warned: false });
    }
  }

  updateGates() {
    const p = this.player;
    for (const g of this.gates) {
      if (g.open) continue;
      const left = g.enemies.filter((e) => e.alive && !e.removed).length;
      if (!g.warned && p.cx > g.x - 13 && p.cx < g.x) {
        g.warned = true;
        this.ui.toast(`Derrote ${left === 1 ? 'o monstro' : `os <b>${left}</b> monstros`} desta área para abrir o portão!`, { title: 'PORTÃO DE MONSTROS', color: '#ff8a7a', time: 4.5 });
      }
      if (left < g.left) {
        g.left = left;
        if (left > 0) this.ui.popText(`FALTA${left > 1 ? 'M' : ''} ${left}`, g.x + 0.5, Math.min(p.y + 2.5, g.top), '#ff8a7a');
      }
      if (left === 0) {
        g.open = true;
        this.level.openGate(g.cells);
        this.audio.sfx('magic');
        this.audio.sfx('break');
        this.shake(0.35);
        this.ui.popText('PORTÃO ABERTO!', g.x + 0.5, p.y + 2.2, '#9dff7a');
      }
    }
  }

  /** interruptor acionado: sem relógio troca os blocos; com relógio liga por alguns segundos */
  pressSwitch() {
    const L = this.level;
    const time = L.def.switchTime;
    if (time) {
      L.setToggle(true);
      this.switchLeft = time;
      this.switchTick = Math.ceil(time);
    } else L.setToggle(!L.toggled);
  }

  updateSwitchTimer(dt) {
    if (this.switchLeft <= 0) return;
    this.switchLeft -= dt;
    const sec = Math.ceil(this.switchLeft);
    if (sec < this.switchTick) {
      this.switchTick = sec;
      if (sec > 0) this.audio.sfx('menuMove', { volume: 0.7, rate: sec <= 2 ? 1.5 : 1 });
    }
    if (this.switchLeft < 1.5) this.level.warnToggle(this.time);
    if (this.switchLeft <= 0) {
      this.switchLeft = 0;
      this.level.setToggle(false);
    }
  }

  /** passou por um ponto de dica: mostra a janela uma vez por partida */
  showTip(trigger) {
    this.tipsSeen.add(this.levelIndex + ':' + trigger.id);
    this.ui.toast(trigger.text);
  }

  toggleCheat() {
    this.cheatLife = !this.cheatLife;
    this.player.god = this.cheatLife;
    this.audio.unlock();
    this.audio.sfx(this.cheatLife ? 'powerup' : 'menuBack');
    this.ui.toast(this.cheatLife ? 'Hans não perde mais vida: nem inimigos, nem espinhos, nem buracos.' : 'Vida infinita desligada.', {
      title: this.cheatLife ? 'CÓDIGO SECRETO: VIDA INFINITA ∞' : 'CÓDIGO SECRETO',
      color: '#9dff7a',
      time: 3.5,
    });
  }

  unlockAll() {
    this.progress.unlocked = LEVELS.length;
    this.saveBest();
    this.audio.unlock();
    this.audio.sfx('powerup');
    this.ui.toast('Todas as fases foram liberadas!', {
      title: 'CÓDIGO SECRETO: TUDO LIBERADO 🔓',
      color: '#ffd966',
      time: 3.5,
    });
    if (this.state === 'title') this.showTitle();
    else if (this.state === 'levels') this.showLevels();
  }

  // ======================================================
  //  Telas e transições
  // ======================================================
  showSplash() {
    this.state = 'title';
    this.ui.showHUD(false);
    this.ui.showMenu({
      title: 'EXTRA HANS',
      subtitle: 'Uma aventura de plataforma 2D pelas quatro estações',
      press: this.ui.isTouch ? 'TOQUE PARA COMEÇAR' : 'PRESSIONE ENTER',
      onPress: () => {
        this.audio.unlock();
        this.audio.sfx('menuOk');
        this.showMainMenu();
      },
      footer: 'Feito com Three.js · arte e sons Kenney (CC0) · músicas Juhani Junkala (CC0)',
    });
  }

  showMainMenu() {
    this.state = 'title';
    this.audio.playMusic('title');
    const unlocked = this.unlockedCount();
    this.ui.showMenu({
      title: 'EXTRA HANS',
      subtitle: this.progress.best ? `Recorde: ${String(this.progress.best).padStart(7, '0')}` : 'Uma aventura de plataforma 2D pelas quatro estações',
      items: [
        { label: 'Novo jogo', action: () => this.newGame(0) },
        { label: 'Continuar', disabled: unlocked <= 1, action: () => this.newGame(unlocked - 1) },
        { label: 'Selecionar fase', action: () => this.showLevelSelect() },
        { label: 'Loja', action: () => this.showShop() },
        { label: 'Volume', action: () => this.showVolumeMenu(() => this.showMainMenu()) },
        { label: 'Controles', action: () => this.showInfo('Controles', this.ui.controlsHTML()) },
        { label: 'Créditos', action: () => this.showInfo('Créditos', this.ui.creditsHTML()) },
      ],
      footer: this.debug ? 'MODO APRESENTAÇÃO: N pula fase · G invencível' : 'Setas/WASD + Enter · funciona com controle',
    });
  }

  showInfo(title, html) {
    this.ui.showMenu({ title, html, dim: true, items: [{ label: 'Voltar', action: () => this.showMainMenu() }], onBack: () => this.showMainMenu() });
  }

  showLevelSelect() {
    const unlocked = this.unlockedCount();
    this.ui.showMenu({
      title: 'Fases',
      dim: true,
      items: [
        ...LEVELS.map((l, i) => ({ label: `${l.season}: ${l.name}`, disabled: i >= unlocked, action: () => this.newGame(i) })),
        { label: 'Voltar', action: () => this.showMainMenu() },
      ],
      onBack: () => this.showMainMenu(),
      footer: 'Complete uma fase para liberar a próxima',
    });
  }

  newGame(index) {
    this.session = this.freshSession();
    this.tipsSeen = new Set();
    this.startLevel(index);
  }

  async startLevel(index, { fromDeath = false } = {}) {
    if (!LEVELS[index]) index = Math.max(0, Math.min(index, LEVELS.length - 1)); // fase ainda não existe neste commit
    this.state = 'transition';
    this.ui.hideMenu();
    this.ui.showHUD(false);
    this.ui.showHint(null);
    await this.ui.fade(true);
    if (!fromDeath) this.checkpoint = null;
    this.loadLevel(index);
    await this.ui.fade(false);
    const def = this.level.def;
    this.ui.banner(def.season.toUpperCase(), def.name, def.subtitle || '');
    this.ui.showHUD(true);
    this.playMusic(def.music);
    this.input.clear();
    this.state = 'playing';
  }

  /** conversa opcional com um personagem: o jogo pausa enquanto o diálogo está aberto */
  async talkTo(npc) {
    this.state = 'talk';
    this.ui.showHint(null);
    this.player.vx = 0;
    await this.ui.dialog(npc.talk);
    this.input.clear();
    this.state = 'playing';
  }

  /** troca a música (o chefe usa isto) e lembra qual é, para voltar da pausa */
  playMusic(name) {
    this.music = name;
    this.audio.playMusic(name);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.audio.stopMusic();
      this.audio.sfx('menuBack');
      this.showPauseMenu();
    } else if (this.state === 'paused') {
      this.ui.hideMenu();
      this.audio.playMusic(this.music);
      this.input.clear();
      this.state = 'playing';
    }
  }

  showPauseMenu(sel = 0) {
    this.ui.showMenu({
      title: 'Pausa',
      dim: true,
      subtitle: this.level.def.name,
      items: [
        { label: 'Continuar', action: () => this.togglePause() },
        { label: 'Reiniciar fase', action: () => this.startLevel(this.levelIndex, { fromDeath: true }) },
        { label: 'Volume', action: () => this.showVolumeMenu(() => this.showPauseMenu(2)) },
        { label: 'Controles', action: () => this.ui.showMenu({ title: 'Controles', html: this.ui.controlsHTML(), dim: true, items: [{ label: 'Voltar', action: () => this.showPauseMenu(3) }], onBack: () => this.showPauseMenu(3) }) },
        { label: 'Menu principal', action: () => this.goToMenu() },
      ],
      onBack: () => this.togglePause(),
    });
    if (sel) this.ui.select(sel, true);
  }

  /** tela de volume: ↑ ↓ escolhe, ← → ajusta (clique/Enter aumenta e volta a 0 depois de 10) */
  showVolumeMenu(back) {
    const a = this.audio;
    const bar = (v) => '■'.repeat(v) + '□'.repeat(10 - v);
    const kinds = [['master', 'Geral'], ['music', 'Música'], ['sfx', 'Efeitos']];
    const label = (k, name) => `${name.padEnd(8, ' ')} ${bar(a.volume[k])}`;
    const set = (i, k, name, v) => {
      a.setVolume(k, v);
      if (k !== 'music') a.sfx('coin', { volume: 0.8 });
      this.ui.setLabel(i, label(k, name)); // só troca o texto: a seleção não muda
    };
    this.ui.showMenu({
      title: 'Volume',
      dim: true,
      subtitle: '↑ ↓ escolhe · ← → ajusta',
      items: [
        ...kinds.map(([k, name], i) => ({
          label: label(k, name),
          adjust: (d) => set(i, k, name, a.volume[k] + d),
          action: () => set(i, k, name, a.volume[k] >= 10 ? 0 : a.volume[k] + 1),
        })),
        { label: 'Voltar', action: back },
      ],
      onBack: back,
    });
  }

  // ======================================================
  //  Loja de visuais (cores do astronauta do pacote Kenney)
  // ======================================================
  showShop(sel = 0) {
    const pr = this.progress;
    const items = SKINS.map((s) => {
      const owned = pr.owned.includes(s.id);
      const equipped = pr.skin === s.id;
      const status = equipped ? 'EM USO' : owned ? 'usar' : `${s.price} moedas`;
      return {
        label: `${spriteHTML('tiles', 'hud_player_helmet_' + s.id, 22)} ${s.name.padEnd(8, ' ')} ${status}`,
        action: () => {
          if (equipped) return;
          if (!owned) {
            if (pr.bank < s.price) {
              this.audio.sfx('locked');
              this.ui.popText('FALTAM MOEDAS', this.player.cx, this.player.y + 2, '#ff6b81');
              return;
            }
            pr.bank -= s.price;
            pr.owned.push(s.id);
            this.audio.sfx('powerup');
          }
          pr.skin = s.id;
          this.player.setColor(s.id);
          this.saveBest();
          this.showShop(SKINS.indexOf(s));
        },
      };
    });
    this.ui.showMenu({
      title: 'Loja',
      dim: true,
      subtitle: `Suas moedas: ${pr.bank}`,
      items: [...items, { label: 'Voltar', action: () => this.showMainMenu() }],
      onBack: () => this.showMainMenu(),
      footer: 'Todas as moedas pegas nas fases ficam guardadas para a loja',
    });
    if (sel) this.ui.select(sel, true);
  }

  async goToMenu() {
    this.state = 'transition';
    this.ui.hideMenu();
    this.ui.showHUD(false);
    this.audio.stopMusic();
    await this.ui.fade(true);
    this.checkpoint = null;
    this.loadLevel(0);
    await this.ui.fade(false);
    this.showMainMenu();
  }

  // ---------- morte / fim de jogo ----------
  onPlayerDied() {
    this.state = 'dying';
    this.audio.stopMusic();
    this.audio.sfx('hurt', { rate: 0.7 });
    this.ui.showHint(null);
    this.shake(0.3);
  }

  onPlayerDeathDone() {
    this.session.lives--;
    if (this.session.lives <= 0) this.gameOver();
    else this.startLevel(this.levelIndex, { fromDeath: true });
  }

  gameOver() {
    this.state = 'gameover';
    this.ui.showHUD(false);
    this.saveBest();
    this.ui.showMenu({
      title: 'Fim de jogo',
      dim: true,
      subtitle: 'O inverno eterno venceu desta vez...',
      html: `<div class="tally">Pontos: ${String(this.session.score).padStart(7, '0')}</div>`,
      items: [
        { label: 'Tentar de novo', action: () => this.newGame(this.levelIndex) },
        { label: 'Menu principal', action: () => this.goToMenu() },
      ],
    });
  }

  // ---------- fim da fase ----------
  async reachGoal(gem) {
    if (this.state !== 'playing') return;
    this.state = 'goal';
    this.player.locked = true;
    this.player.leaveSpecialModes();
    this.ui.showHint(null);
    this.audio.stopMusic();
    this.session.gems.push(gem.color);
    this.particles.burst(gem.x + 0.6, gem.y + 1, { color: ['#ffffff', '#fff3b0', '#9be7ff'], count: 40, speed: 8, life: 1.2 });
    gem.setHidden(true);
    this.ui.popText('CRISTAL!', gem.x + 0.6, gem.y + 1.8, '#ffffff');
    await wait(1400);
    // bônus de tempo: cada segundo restante vale 10 pontos
    const bonus = Math.ceil(this.timeLeft) * 10;
    const startTime = this.timeLeft;
    let given = 0, ticks = 0, last = performance.now();
    while (this.timeLeft > 0) {
      await wait(30);
      const now = performance.now();
      this.timeLeft = Math.max(0, this.timeLeft - ((now - last) / 1000) * 250);
      last = now;
      const due = Math.round(bonus * (1 - this.timeLeft / startTime));
      this.session.score += due - given;
      given = due;
      if (ticks++ % 3 === 0) this.audio.sfx('coin', { volume: 0.3 });
    }
    this.session.score += bonus - given;
    await wait(600);
    this.completeLevel();
  }

  async completeLevel() {
    this.state = 'story';
    this.ui.showHUD(false);
    this.progress.unlocked = Math.max(this.progress.unlocked, this.levelIndex + 2);
    this.saveBest();
    const def = this.level.def;
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1);
    else this.showEnding();
  }

  showEnding() {
    this.state = 'ending';
    this.audio.playMusic('ending');
    this.saveBest();
    this.ui.showMenu({
      title: 'FIM!',
      subtitle: 'Os quatro cristais voltaram ao Relógio das Estações.<br><br>A primavera floresceu, e Hans consertou sua nave — mas decidiu ficar mais um pouquinho.',
      html: `<div class="tally">Pontuação final: ${String(this.session.score).padStart(7, '0')}</div>${this.ui.creditsHTML()}`,
      items: [{ label: 'Voltar ao menu', action: () => this.goToMenu() }],
    });
  }

  // ======================================================
  //  Eventos chamados pelas entidades
  // ======================================================
  addScore(n, x, y) {
    this.session.score += n;
    if (x !== undefined) this.ui.popText('+' + n, x, y);
  }

  collectCoin(x, y) {
    this.session.coins++;
    this.progress.bank++; // moedas guardadas para a loja
    this.saveBest();
    this.session.score += 50;
    this.audio.sfx('coin', { volume: 0.7 });
    this.particles.burst(x, y, { color: ['#fff3b0', '#ffcc33'], count: 5, speed: 3, size: 0.1, gravity: 0, life: 0.4 });
    if (this.session.coins >= 100) {
      this.session.coins -= 100;
      this.session.lives++;
      this.audio.sfx('powerup');
      this.ui.popText('1 VIDA!', x, y + 0.6, '#9dff7a');
    }
  }

  spawnPopCoin(x, y) {
    this.items.push(new PopCoin(this, x, y));
    this.collectCoin(x, y + 1);
  }

  spawnHeart(x, y) {
    this.items.push(new Heart(this, x, y, { emerge: true }));
  }

  spawnProjectile(spec, x, y, vx, vy) {
    this.items.push(new Projectile(this, spec, x, y, vx, vy));
  }

  /** um bloco foi atingido por baixo: derruba inimigos em cima dele e pega moedas */
  onBlockBumped(x, y) {
    const zone = { x, y: y + 1, w: 1, h: 0.6 };
    for (const e of this.enemies) if (e.alive && e.active && overlap(zone, e)) e.knockOut();
    for (const it of this.items) if (!it.removed && it instanceof Coin && overlap(zone, it)) it.onTouch(this.player);
  }

  /** argola ao alcance das mãos do Hans */
  findRing(p) {
    let best = null, bestD = 2.4;
    for (const r of this.rings) {
      const d = Math.hypot(p.cx - r.ax, p.y + p.h - r.ay);
      if (d < bestD && p.y + p.h < r.ay + 0.6) { best = r; bestD = d; }
    }
    return best;
  }

  /** algo para agarrar logo à frente (objeto solto ou inimigo "agarrável") */
  findGrabbable(p) {
    const zone = { x: p.facing > 0 ? p.x - 0.1 : p.x - 0.7, y: p.y - 0.2, w: p.w + 0.8, h: p.h + 0.3 };
    for (const it of this.items) if (!it.removed && it instanceof Throwable && overlap(zone, it)) return it;
    for (const e of this.enemies) if (e.alive && e.active && !e.removed && e.grabbable && overlap(zone, e)) return e;
    return null;
  }

  setCheckpoint(x, y) {
    this.checkpoint = { level: this.levelIndex, x, y };
  }

  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  // ======================================================
  //  Laço principal
  // ======================================================
  frame() {
    const now = performance.now();
    const dt = Math.min((now - this.lastT) / 1000, 0.1);
    this.lastT = now;
    this.time += dt;
    const input = this.input;
    input.poll();
    if (input.cheatEntered()) this.toggleCheat();
    if (input.unlockCodeEntered()) this.unlockAll();
    const consumed = this.ui.update(dt, input);
    if (!consumed) this.globalInput();

    const s = this.state;
    if (s === 'playing' || s === 'dying' || s === 'goal') {
      this.player.handleInput(input);
      this.acc += dt;
      while (this.acc >= STEP) {
        this.step(STEP);
        this.acc -= STEP;
      }
    } else if (s !== 'paused') {
      for (const it of this.items) if (!(it instanceof Projectile)) it.update(dt * 0.5);
      this.player.sync(0);
    }
    if (s !== 'paused') {
      this.level.update(dt, this.time);
      this.weather(dt);
      this.particles.update(dt);
    }
    this.updateCamera(dt);
    if (s === 'playing' || s === 'goal' || s === 'dying') this.ui.updateHUD();
    this.renderer.render(this.scene, this.camera);
    input.endFrame();
  }

  globalInput() {
    const input = this.input;
    if (input.pressed('mute')) {
      const m = this.audio.toggleMute();
      this.ui.popText(m ? 'SOM OFF' : 'SOM ON', this.player.cx, this.player.y + 1.6);
    }
    if (this.state === 'playing') {
      if (input.pressed('pause')) this.togglePause();
      if (this.debug && input.pressed('debugNext')) this.completeLevel();
      if (this.debug && input.pressed('debugGod')) {
        this.debugGod = !this.player.god;
        this.player.god = this.debugGod || this.cheatLife;
        this.ui.popText(this.player.god ? 'INVENCÍVEL' : 'NORMAL', this.player.cx, this.player.y + 1.6);
      }
    }
  }

  /** neve caindo (fases com theme.snow) */
  weather(dt) {
    if (!this.level.theme.snow) return;
    const { vw, vh } = this.viewSize();
    if (Math.random() < dt * 40) {
      this.particles.spawn({
        x: this.camX + (Math.random() - 0.5) * (vw + 4), y: this.camY + vh / 2 + 0.5,
        vx: -0.6 + Math.random() * 0.4, vy: -1.5 - Math.random(), gravity: 0,
        size: 0.06 + Math.random() * 0.08, life: 9, age: 0, spin: 0, color: '#ffffff',
      });
    }
  }

  /** um passo fixo de simulação */
  step(dt) {
    const player = this.player;
    player.update(dt);

    for (const e of this.enemies) {
      if (e.removed) continue;
      if (!e.active && Math.abs(e.cx - player.cx) < 14) e.active = true;
      if (e.active) e.update(dt);
    }
    for (const it of this.items) if (!it.removed) it.update(dt);

    if (this.state === 'playing' && !player.dying) {
      this.nearSign = null;
      for (const it of this.items) if (it.touchable && !it.removed && overlap(player, it)) it.onTouch(player);
      this.ui.showHint(this.nearSign ? this.nearSign.text : null);
      if (this.nearSign?.talk && this.input.pressed('up') && this.state === 'playing') this.talkTo(this.nearSign);
      this.enemyCollisions();
      this.updateGates();
      this.level.updateCrates(dt);
      this.updateSwitchTimer(dt);
      for (const h of this.level.hazards) if (overlap(player, h)) player.hurt();
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        if (this.cheatLife) this.timeLeft = this.level.def.time || 300;
        else player.die();
      }
      if (this.gem && this.gem.hidden && this.bossDefeated && !this.gem.taken) this.gem.setHidden(false);
    }

    if (this.enemies.some((e) => e.removed)) this.enemies = this.enemies.filter((e) => !e.removed);
    if (this.items.some((i) => i.removed)) this.items = this.items.filter((i) => !i.removed);
  }

  enemyCollisions() {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || !e.active || e.removed) continue;
      if (!overlap(p, e, 0.08)) continue;
      const fromAbove = p.vy < 0 && p.prevY >= e.y + e.h * 0.5;
      if (fromAbove && e.stompable) {
        e.onStomp(p);
        p.bounce();
      } else if (e.damaging) {
        p.hurt();
      }
    }
  }

  // ======================================================
  //  Câmera ortográfica
  // ======================================================
  viewSize() {
    const vh = VIEW_H;
    return { vh, vw: vh * (innerWidth / innerHeight) };
  }

  cameraTarget() {
    const { vh, vw } = this.viewSize();
    const L = this.level;
    let x, y;
    if (this.state === 'title' || this.state === 'ending') {
      const k = 0.5 - 0.5 * Math.cos(this.time * 0.05);
      x = vw / 2 + k * Math.max(0, L.width - vw);
      y = vh / 2;
    } else {
      x = this.player.cx + THREE.MathUtils.clamp(this.player.vx * 0.3, -2, 2);
      y = this.player.y + 1.5;
    }
    x = L.width <= vw ? L.width / 2 : THREE.MathUtils.clamp(x, vw / 2, L.width - vw / 2);
    y = THREE.MathUtils.clamp(y, vh / 2, Math.max(vh / 2, L.height - vh / 2));
    return { x, y };
  }

  snapCamera() {
    const t = this.cameraTarget();
    this.camX = t.x;
    this.camY = t.y;
  }

  updateCamera(dt) {
    const t = this.cameraTarget();
    this.camX += (t.x - this.camX) * Math.min(1, dt * 7);
    this.camY += (t.y - this.camY) * Math.min(1, dt * 4);
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0) {
      sx = (Math.random() - 0.5) * this.shakeAmt;
      sy = (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.5);
    }
    const { vw, vh } = this.viewSize();
    const c = this.camera;
    c.left = -vw / 2;
    c.right = vw / 2;
    c.top = vh / 2;
    c.bottom = -vh / 2;
    c.updateProjectionMatrix();
    c.position.set(this.camX + sx, this.camY + sy, 10);
    this.level.parallax.update(this.camX, this.camY, vw, vh);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
  }

  // ======================================================
  //  Progresso salvo
  // ======================================================
  loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem('nino-progress') || '{}');
      return { unlocked: p.unlocked || 1, best: p.best || 0, bank: p.bank || 0, owned: p.owned || ['green'], skin: p.skin || 'green' };
    } catch {
      return { unlocked: 1, best: 0, bank: 0, owned: ['green'], skin: 'green' };
    }
  }

  unlockedCount() {
    return this.debug ? LEVELS.length : Math.min(LEVELS.length, this.progress.unlocked);
  }

  saveBest() {
    this.progress.best = Math.max(this.progress.best, this.session.score);
    try { localStorage.setItem('nino-progress', JSON.stringify(this.progress)); } catch { /* ignora */ }
  }
}
