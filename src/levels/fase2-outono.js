import { Sapo, Joaninha, PlantaBoca, PlantaGigante, Mosca } from '../enemies/outono.js';

/*
  FASE 2: VALE DAS ABÓBORAS (outono), Integrante 3
  Clima de entardecer de outono: plantações de abóbora, lanternas, cercas e celeiros.
  Mecânica principal: ABÓBORA x PLANTA. Primeiro uma planta comum para treinar o arremesso,
  depois uma PLANTA GIGANTE (U) que tapa um túnel e só cai com abóbora.
  Novidades: cordas para escalar, Planta Boca-Roxa (só cai com abóbora arremessada),
  sapos saltadores e um portão de celeiro trancado.
  Desafios novos: a Planta Gigante só sente abóbora com a BOCA ABERTA (ela treme antes de abrir);
  um INTERRUPTOR DE TETO que só liga com abóbora arremessada para cima (e é preciso levar a
  abóbora pela ponte azul antes que ela suma) e um PORTÃO DE MONSTROS com sapos e joaninhas.
*/

export default {
  id: 'outono',
  order: 2,
  season: 'Outono',
  name: 'Vale das Abóboras',
  subtitle: 'Onde as lanternas acendem sozinhas',
  time: 430,
  music: 'stage2',
  gem: 'red',

  theme: {
    terrain: 'dirt',
    terrain2: 'stone',
    platform: 'dirt',
    sky: '#cfbd9b',
    ambient: '#f8e2cc', // luz alaranjada de fim de tarde
    layers: [{ image: 'bg_fall', factor: 0.15, height: 13, y: -1, tint: '#ffcfa0' }],
  },

  enemies: { y: Sapo, j: Joaninha, u: PlantaBoca, U: PlantaGigante, q: Mosca },

  decor: {
    p: { image: 'pumpkin' },
    J: { image: 'jackOLantern' },
    H: { image: 'hayBale' },
    F: { image: 'sunflower' },
    c: { image: 'deadCrop2' },
    t: { frames: ['torch_on_a', 'torch_on_b'], speed: 6 }, // lanterna acesa
  },

  throwable: { image: 'pumpkin', scale: 1, kind: 'pumpkin', colors: ['#f08a24', '#c95d10', '#5aa83a'], sound: 'stomp' },

  tips: [
    'Viu o interruptor pendurado no <b>TETO</b>? Ele só liga com uma abóbora jogada <b>PARA CIMA</b> (<b>↑</b> + <b>X</b>). Pense bem: leve a abóbora com você!',
  ],

  // conversas são opcionais: chegue perto e aperte ↑
  npcs: [
    {
      who: 'Vovó Marit', color: 'purple', text: 'TREINO: pegue a abóbora (X) e jogue (X) na planta de boca roxa logo ali.',
      talk: [
        { who: 'Vovó Marit', text: 'Psiu, pequeno viajante... perdido no Vale? Todo mundo se perde aqui no outono.' },
        { who: 'Vovó Marit', text: 'Eu cuido das lanternas da estrada. Siga a luz delas, suba pelas cordas e não pise nas plantas de boca roxa.' },
        { who: 'Vovó Marit', text: 'Plantas de boca roxa não podem ser pisadas. Mas uma abóbora bem arremessada põe qualquer uma para dormir.' },
        { who: 'Vovó Marit', text: 'Treine com a plantinha aqui do lado. Lá na frente tem uma GIGANTE tapando o túnel do vale: sem abóbora, ninguém passa. Hihi.' },
      ],
    },
    {
      who: 'Tio Ole', color: 'beige', text: 'A planta gigante só sente abóbora com a BOCA ABERTA. Espere ela tremer!',
      talk: [
        { who: 'Tio Ole', text: 'Essa planta gigante cresceu bem no meio do túnel. Pular por cima? Nem pensar, o teto é baixo.' },
        { who: 'Tio Ole', text: 'Pegue uma abóbora do monte (ele enche de novo sozinho) e arremesse de frente para ela.' },
        { who: 'Tio Ole', text: 'Mas atenção: de boca fechada a abóbora quica. Quando ela tremer, a boca vai abrir. Jogue nessa hora!' },
      ],
    },
    {
      who: 'Vovó Marit', color: 'purple', text: 'O cristal vermelho brilha ali na frente.',
      talk: [
        { who: 'Vovó Marit', text: 'Já são três cristais... falta só o azul.' },
        { who: 'Vovó Marit', text: 'O Rei Knut se escondeu nos Picos Nevados, depois da vila dos chalés. Agasalhe-se!' },
      ],
    },
  ],

  map: [
    '...........................................................................................=.................=========..............................=====..=.............W............................................',
    '...........................................................................................=.................=========..............................=====..=.............W............................................',
    '...........................................................................................=.................=========..............................=====..1.............W............................................',
    '................................................................................CCCC..k....=.................=========..............................=====..1.............W............................................',
    '................................................CCCo..........................L==========..=.................=========..............................=====..1.............W............................................',
    '..............................................|======.........................L............=.................=========..............................=====..1.............W......CCh...................................',
    '..............................................|................O..............L............=.................=========..............................=====..1.............W...|======..................................',
    '..............................................|...........................q...L............=.................=========.............O..................%....1.............W...|........................................',
    '...............?C?............................|...............................L............=.................=========.....................................1...CC........W...|........................................',
    '...........................CCC................|..................CC...........L............=.........CC......=========...............CC....................1...2.........W...|........................................',
    '..............................................|...............................L............D...............................................................1.[2..........W...|........................................',
    '..P..N..p.p.t.o...y..pH.........o.u..J..j..cFc|....u...t.y............K.q.....L.o..u..o....D.HpH.j.t....N..Q.......U....j.pp.y...........TQK...............1.....y..j.y..W...|.......o..u..y..t.pJp.j....N.....G..t...',
    '###########################....##############################.......#################################...#########################.......#####111111###################################################################',
    '###########################....##############################.......#################################...#########################.......#####......###################################################################',
  ],

  decorate({ level, add, rand, surfaceY }) {
    add({ image: 'moonFull', layer: 3 }, 30, 10.5);
    for (let x = 3; x < level.width; x += 4 + Math.floor(rand() * 4)) {
      const y = surfaceY(x);
      if (y === null || y > 4) continue;
      const pick = rand();
      if (pick < 0.4) add({ image: ['treeOrange', 'treePineOrange', 'treeLongOrange', 'treeDead'][Math.floor(rand() * 4)], scale: 0.9 + rand() * 0.3 }, x + rand(), y - 0.1);
      else if (pick < 0.65) add({ image: ['bushOrange1', 'bushOrange2', 'bushOrange3'][Math.floor(rand() * 3)] }, x + rand(), y - 0.05);
      else if (pick < 0.9) {
        // fileira de abóboras na plantação
        for (let i = 0; i < 3; i++) add({ image: rand() < 0.2 ? 'jackOLantern' : 'pumpkin', scale: 0.7 }, x + i * 0.7, y - 0.05);
      } else add({ image: 'fence' }, x, y - 0.05);
    }
    add({ image: 'houseAlt2', scale: 1.1 }, 84, 1.9); // celeiro
    add({ image: 'houseAlt1' }, 150, 1.9);
  },
};
