import { Gosma, Caracol, Abelha } from '../enemies/basicos.js';

/*
  FASE 0: CAMPO FLORIDO (primavera), Integrante 1
  Mecânica principal: CHAVE E CADEADO. Primeiro um portão de treino com a chave do lado,
  depois um portão cuja chave está no alto da escada.
  Tutorial: ao passar por cada ponto T aparece uma janela de dica que some sozinha.
  Desafios novos: INTERRUPTOR (troca blocos azuis e vermelhos), primeiro num buraco raso,
  e o primeiro PORTÃO DE MONSTROS (só abre quando todos os inimigos da área caem;
  o caracol vira casco e tem 5 segundos para ser arremessado).
  Também traz o prólogo da história.
*/

export default {
  id: 'campo',
  order: 0,
  season: 'Primavera',
  name: 'Campo Florido',
  subtitle: 'Onde a nave do Hans caiu',
  time: 440,
  music: 'stage1',
  gem: 'green',

  theme: {
    terrain: 'grass',
    terrain2: 'stone',
    platform: 'grass',
    sky: '#cfeffc',
    layers: [{ image: 'bg_grass', factor: 0.15, height: 13, y: -1 }],
  },

  enemies: { s: Gosma, n: Caracol, a: Abelha },

  // letras do mapa que viram decoração (frames do atlas de tiles do Kenney)
  decor: {
    b: { frame: 'bush' },
    m: { frame: 'mushroom_red' },
    g: { frame: 'grass' },
    f: { frame: 'fence' },
  },

  // o objeto "o" desta fase: caixa de madeira
  throwable: { atlas: 'tiles', frame: 'block_planks', scale: 0.8, kind: 'crate', colors: ['#c98a55', '#7a4a24', '#e0a96d'], sound: 'plank' },

  // janelas de dica (na ordem em que aparecem no mapa, letra T)
  tips: [
    '<b>← →</b> para andar. <b>ESPAÇO</b> pula: segure o botão para pular mais alto!',
    'Dê cabeçadas nos blocos: o bloco <b>?</b> solta moedas e os tijolos se quebram.',
    'Encoste na caixa e aperte <b>X</b> para AGARRAR. <b>X</b> de novo ARREMESSA. Acerte a Gosma!',
    'Pise no Caracol: ele se esconde no casco. Agarre o casco e jogue na <b>muralha de tijolos</b>!',
    'TREINO: pegue a <b>chave</b> e encoste no cadeado. Cadeados só abrem com chave!',
    '<b>↑ ↓</b> sobem e descem escadas. O próximo portão também é trancado... a chave está lá em cima!',
    'Pegou a chave da plataforma? Encoste no <b>cadeado</b> para abrir o portão.',
    'Molas lançam você bem alto: segure o <b>PULO</b> ao cair nelas!',
    'Pule perto da estrela e aperte <b>X</b> para se pendurar. Balance com <b>← →</b> e solte com <b>PULO</b>!',
    'Pule no <b>INTERRUPTOR</b>: os blocos <b>azuis</b> e <b>vermelhos</b> trocam de lugar. Os sólidos viram fantasmas e os fantasmas ficam sólidos!',
  ],

  // conversas são opcionais: chegue perto e aperte ↑
  npcs: [
    {
      who: 'Relojoeiro Per', color: 'pink', flip: true, text: 'Psst, astronauta! Quer saber o que aconteceu aqui?',
      talk: [
        { who: 'Relojoeiro Per', text: 'Eu cuido do Relógio das Estações. É ele que faz a primavera virar verão, o verão virar outono e o outono virar inverno.' },
        { who: 'Relojoeiro Per', text: 'Mas o Rei Knut roubou os quatro Cristais das Estações e escondeu um em cada região. Ele quer um inverno que nunca acabe!' },
        { who: 'Relojoeiro Per', text: 'E olha só: a sua nave também funciona com cristais. Recupere os quatro e você salva o planeta e ainda volta para casa.' },
        { who: 'Relojoeiro Per', text: 'Comece por aqui: siga as dicas que aparecem pelo caminho. O cristal verde está lá no fim.' },
      ],
    },
    {
      who: 'Comandante Inger', color: 'beige', text: 'O cristal verde está logo ali!',
      talk: [
        { who: 'Comandante Inger', text: 'Muito bem, pequeno astronauta! Pegue o cristal verde e a primavera volta a florir.' },
        { who: 'Comandante Inger', text: 'Depois, siga para as Dunas Douradas: é lá que o cristal amarelo, do verão, foi escondido.' },
      ],
    },
  ],

  map: [
    '................................................=...=.................=........................................=....................W.....................................',
    '................................................=...=.................=........................................=....................W.....................................',
    '................................................=...=.................=........................................=....................W.....................................',
    '................................................=...=.................=............CCCCh.......................=....................W.....................................',
    '................................................=...=.................=...........=======......................=....................W.....................................',
    '................................................=...=.....CCC.k.......=........................................=....................W.....................................',
    '................................................=...=...L========.....=..........................O.............=....................W.....................................',
    '.............C..................................B...=...L.............=........................................1............Ch......W.............a.......................',
    '............?B?..CC............CCC..............B...=...L.............=..............?!?.......................1............11......W.....a.B?B...........................',
    '................................................B...=...L.............=............................C.C.........1..CCCC.....1.....a..W.....................................',
    '................................................B...D...L.............D........................................1..........1...[.....W.....................................',
    '..P.TbN.##T....m..T..o..g..s........T.....n..o..BTk.D.T.L.........T...D..b.K..T.S..........T.............T.@...1........@......s..n.W.........s....g..s.bm##..N....G..f...',
    '###############################...#############################################################.......############2222####################################################',
    '###############################...#############################################################.......####################################################################',
  ],

  decorate({ level, add, rand, surfaceY }) {
    for (let x = 3; x < level.width; x += 4 + Math.floor(rand() * 5)) {
      const y = surfaceY(x);
      if (y === null || y > 4) continue;
      const pick = rand();
      if (pick < 0.45) add({ image: rand() < 0.5 ? 'tree' : 'treePine', scale: 0.9 + rand() * 0.3 }, x + rand(), y - 0.1);
      else if (pick < 0.75) add({ image: rand() < 0.5 ? 'bush1' : 'bush2' }, x + rand(), y - 0.05);
    }
  },
};
