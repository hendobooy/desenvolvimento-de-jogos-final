import { assets } from './Assets.js';

/*
  Áudio com a Web Audio API, tocando ARQUIVOS (nenhum som é sintetizado).
  - sfx('coin')       efeito sonoro (manifest SOUNDS)
  - playMusic('boss') música em loop (manifest MUSIC)
*/
export class AudioSys {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = AC ? new AC() : null;
    this.buffers = {};
    this.muted = false;
    try { this.muted = localStorage.getItem('nino-mute') === '1'; } catch { /* sem localStorage */ }
    this.current = null;
    this.musicName = null;
    // volumes de 0 a 10, salvos no navegador
    this.volume = { master: 1, music: 1, sfx: 1 }; // começa no mínimo audível
    try { Object.assign(this.volume, JSON.parse(localStorage.getItem('nino-volume3') || '{}')); } catch { /* ignora */ }
    if (!this.ctx) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : (this.volume.master / 10) * 0.6;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = (this.volume.music / 10) * 0.45;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.volume.sfx / 10;
    this.sfxBus.connect(this.master);
  }

  /** decodifica os arquivos baixados pelo carregador */
  async decodeAll() {
    if (!this.ctx) return;
    const jobs = [];
    for (const group of ['sounds', 'music'])
      for (const [name, data] of Object.entries(assets[group]))
        jobs.push(this.ctx.decodeAudioData(data.slice(0)).then((buf) => (this.buffers[group + ':' + name] = buf)).catch(() => {}));
    await Promise.all(jobs);
  }

  /** navegadores só liberam o som depois de um clique/tecla */
  unlock() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('nino-mute', this.muted ? '1' : '0'); } catch { /* ignora */ }
    if (this.master) this.applyVolume();
    return this.muted;
  }

  /** muda um volume ('master' | 'music' | 'sfx') em passos de 1 (0 a 10) */
  setVolume(kind, value) {
    this.volume[kind] = Math.max(0, Math.min(10, value));
    try { localStorage.setItem('nino-volume3', JSON.stringify(this.volume)); } catch { /* ignora */ }
    if (kind === 'master' && this.volume.master > 0 && this.muted) this.toggleMute();
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : (this.volume.master / 10) * 0.6, t, 0.02);
    this.musicBus.gain.setTargetAtTime((this.volume.music / 10) * 0.45, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.volume.sfx / 10, t, 0.02);
  }

  sfx(name, { volume = 1, rate = 1 } = {}) {
    const buf = this.buffers['sounds:' + name];
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08); // leve variação para não cansar
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.sfxBus);
    src.start();
  }

  playMusic(name) {
    if (name === this.musicName && this.current) return;
    this.stopMusic();
    const buf = this.buffers['music:' + name];
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true; // as faixas foram feitas para repetir sem emenda
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.4);
    src.connect(g).connect(this.musicBus);
    src.start();
    this.current = { src, g };
    this.musicName = name;
  }

  stopMusic() {
    if (this.current) {
      const { src, g } = this.current;
      const t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.25);
      src.stop(t + 0.3);
    }
    this.current = null;
    this.musicName = null;
  }
}
