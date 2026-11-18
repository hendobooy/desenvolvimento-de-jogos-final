import '@fontsource/press-start-2p';
import './style.css';
import { loadAll } from './core/Assets.js';
import { AudioSys } from './core/Audio.js';
import { Game } from './core/Game.js';

// Ponto de entrada: mostra a barra de carregamento, baixa os assets e inicia o jogo.
const ui = document.getElementById('ui');
const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div><div class="msg">CARREGANDO...</div><div class="bar"><div class="fill"></div></div></div>';
ui.appendChild(loading);

async function start() {
  await document.fonts.ready;
  await loadAll((p) => (loading.querySelector('.fill').style.width = Math.round(p * 100) + '%'));
  const audio = new AudioSys();
  await audio.decodeAll();
  loading.remove();
  const game = new Game(document.getElementById('game'), ui, audio);
  window.game = game; // facilita testes pelo console do navegador (F12)
}

start().catch((err) => {
  console.error(err);
  loading.querySelector('.msg').textContent = 'Erro ao carregar: ' + err.message;
});
