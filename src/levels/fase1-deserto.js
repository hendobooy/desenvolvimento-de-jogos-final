import { Rato, Minhoca, GosmaFogo, Serra, Esmagador } from '../enemies/deserto.js';

/*
  FASE 1: DUNAS DOURADAS (verão), Integrante 2
  Mecânica principal: BALANÇAR NAS ESTRELAS. Primeiro uma estrela de treino sobre um buraco raso
  (cair não faz mal), depois abismos que só se atravessam balançando.
  Novidades: cactos que espetam, Gosma de Fogo (só cai com pedrada), serras,
  blocos esmagadores no teto e duas argolas seguidas sobre o abismo.
  Desafios novos: INTERRUPTOR COM RELÓGIO (a ponte vermelha some depois de alguns
  segundos; treino num buraco raso), PORTÃO DE MONSTROS com Gosmas de Fogo e um
  interruptor no alto que só é ativado com uma pedra jogada PARA CIMA.
*/

export default {
  id: 'deserto',
  order: 1,
  season: 'Verão',
  name: 'Dunas Douradas',
  subtitle: 'O sol não perdoa',
  time: 420,
  switchTime: 4.5, // segundos até os blocos voltarem
  music: 'level1',
  gem: 'yellow',

  theme: {
    terrain: 'sand',
    terrain2: 'stone',
    platform: 'sand',
    sky: '#cfeffc',
    layers: [{ image: 'bg_desert', factor: 0.15, height: 13, y: -1 }],
  },

  enemies: { r: Rato, v: Minhoca, q: GosmaFogo, z: Serra, x: Esmagador },

  decor: {
    c: { frame: 'cactus', hurts: true }, // cacto espeta!
  },

  throwable: { atlas: 'tiles', frame: 'rock', scale: 0.8, kind: 'rock', colors: ['#c7ccd6', '#8a8f99'], sound: 'rock' },

  tips: [
    'Este interruptor tem <b>RELÓGIO</b>: a ponte <b>vermelha</b> só fica sólida por alguns segundos. Olhe a contagem no canto e corra!',
    'O interruptor está no alto! Fique logo antes dele e jogue uma pedra <b>PARA CIMA</b> (segure <b>↑</b> e aperte <b>X</b>). Depois, corra para a ponte!',
  ],

  // conversas são opcionais: chegue perto e aperte ↑
  npcs: [
    {
      who: 'Kari', color: 'pink', text: 'Gosmas de Fogo queimam! Jogue uma pedra nelas.',
      talk: [
        { who: 'Kari', text: 'Olá! Sou a Kari, arqueóloga das dunas. Também está atrás do cristal amarelo?' },
        { who: 'Kari', text: 'As Gosmas de Fogo são quentes demais para pisar ou agarrar. Use as pedras do caminho como munição.' },
        { who: 'Kari', text: 'E cuidado com os cactos e com os blocos que despencam do teto. Depois daqui, o próximo cristal está no Vale das Abóboras.' },
      ],
    },
    {
      who: 'Kjell', color: 'beige', text: 'TREINO: pule perto da estrela segurando X. Este buraco é raso, pode errar à vontade!',
      talk: [
        { who: 'Kjell', text: 'Mais à frente as dunas têm abismos enormes. Só passa quem souber se balançar nas estrelas.' },
        { who: 'Kjell', text: 'Pule perto da estrela segurando X. Pendurado, use ← → para ganhar embalo.' },
        { who: 'Kjell', text: 'Solte com o PULO quando estiver subindo para a frente: é aí que o impulso é maior. Treine aqui, que esse buraco é raso!' },
      ],
    },
  ],

  map: [
    '.............................................................................................................W........................................................................................................',
    '.............................................................................................................W........................................................................................................',
    '.............................................................................................................W........................................................................................................',
    '...................................................................CCCCC.....................................W........................................................................................................',
    '..................................................................=======....................................W................=============...........................................................................',
    '.............................................................................................................W..................x...x...x................O............................................................',
    '........................................................O....................................................W...@...................................O................................................................',
    '..........................O..................................................................................W..---...................................................................................................',
    '................?B?...............................CC.........................................................W.........................................CC...........B?B...............................................',
    '.........................CCC..............................CC.....................CC..........CCCC............W.......CCCCC.........................................................CC.........==......................',
    '................................................==.................................................[.........W..............................................................................====......................',
    '..P...N...o...r....c..N.........v..o...q...c..====..............S.....z.....c.o.K......T.@..........Q..q..q..WQT...............C.C.C.C.C.C..r..c...............q.o......v..z...c..........======..r.q..o..c.....G.....',
    '#########################....########################.......#####################...########222222##################2222222########################.........#######################...################################',
    '#####################################################.......#####################...################################.......########################.........#######################...################################',
  ],

  decorate({ level, add, rand, surfaceY }) {
    for (let x = 4; x < level.width; x += 5 + Math.floor(rand() * 6)) {
      const y = surfaceY(x);
      if (y === null || y > 4) continue;
      const pick = rand();
      if (pick < 0.3) add({ image: 'treePalm', scale: 0.9 + rand() * 0.3 }, x + rand(), y - 0.1);
      else if (pick < 0.7) add({ image: ['cactus1', 'cactus2', 'cactus3'][Math.floor(rand() * 3)], scale: 0.8 }, x + rand(), y - 0.05);
    }
    add({ image: 'pyramid', scale: 1.4 }, 40, 1.9);
    add({ image: 'pyramid', scale: 1.1 }, 132, 1.9);
  },
};
