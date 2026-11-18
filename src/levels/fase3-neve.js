import { BlocoSaltitante, GosmaEspinho, GosmaGigante, Peixe } from '../enemies/neve.js';
import { Caracol } from '../enemies/basicos.js';
import { ReiGranizo } from '../enemies/chefe.js';

/*
  FASE 3: PICOS NEVADOS (inverno), Integrante 4
  Mecânica principal: BOLAS DE NEVE. Treino numa Gosma Espinhosa em campo aberto, depois uma
  GOSMA GIGANTE (Z) tapando o túnel de gelo, e por fim o chefe, que só sente bolas de neve.
  Vila de chalés na neve. Novidades: gelo que escorrega, lagos gelados com peixes,
  bolas de neve que reaparecem e a batalha contra o REI KNUT.
  O cristal azul só aparece depois que o chefe é derrotado.
  Desafios novos: INTERRUPTOR COM RELÓGIO sobre o gelo (escorrega!), PORTÃO DE MONSTROS,
  Gosma Gigante que precisa de 3 bolas seguidas (se demorar, ela se recompõe),
  arena com CAIXOTES e montes de neve em cima e a ARMADURA do Rei na metade da luta.
*/

export default {
  id: 'neve',
  order: 3,
  season: 'Inverno',
  name: 'Picos Nevados',
  subtitle: 'A vila dos chalés',
  time: 470,
  switchTime: 5,
  music: 'level2',
  gem: 'blue',
  gemAfterBoss: true,

  theme: {
    terrain: 'snow',
    terrain2: 'stone',
    platform: 'snow',
    sky: '#cfeffc',
    snow: true, // neve caindo
    layers: [
      { image: 'bg_snow', factor: 0.1, height: 13, y: -1 },
      { image: 'bg_mountains', factor: 0.25, height: 5, y: 1.2, opacity: 0.9 },
    ],
  },

  enemies: { e: BlocoSaltitante, s: GosmaEspinho, Z: GosmaGigante, y: Peixe, n: Caracol, R: ReiGranizo },

  // montes de neve: as bolas reaparecem depois de pegas
  throwable: { image: 'snowBall', scale: 0.9, outline: '#3d6f9e', kind: 'snowball', colors: ['#ffffff', '#d8f1ff'], sound: 'snow', respawn: true },

  tips: [
    'Interruptor com <b>RELÓGIO</b> sobre o <b>GELO</b>: depois de pular nele, a ponte dura poucos segundos. Comece a correr antes e cuidado para não escorregar!',
  ],

  // conversas são opcionais: chegue perto e aperte ↑
  npcs: [
    {
      who: 'Lars', color: 'yellow', text: 'TREINO: pegue uma bola de neve (X) e acerte a Gosma Espinhosa da pista de gelo.',
      talk: [
        { who: 'Lars', text: 'Brrr! Oi! Sou o Lars, da vila dos chalés. Faz cem dias que não para de nevar.' },
        { who: 'Lars', text: 'É o Rei Knut, lá no alto dos picos. Ele é um bloco de gelo maciço: pisar nele não adianta.' },
        { who: 'Lars', text: 'Mas bolas de neve bem arremessadas... essas ele sente! Os montes de neve sempre voltam a encher.' },
        { who: 'Lars', text: 'Treine na Gosma Espinhosa da pista de gelo: ela tem espinhos, não dá para pisar. Só bola de neve!' },
      ],
    },
    {
      who: 'Lars', color: 'yellow', text: 'A Gosma GIGANTE precisa de 3 bolas seguidas, sem parar!',
      talk: [
        { who: 'Lars', text: 'O Rei mandou a Gosma Gigante vigiar o túnel de gelo. O teto é baixo: não dá para pular por cima.' },
        { who: 'Lars', text: 'Pegue bolas dos montes aqui do lado e arremesse de frente. São TRÊS acertos, e rápido: se você demorar, ela se recompõe!' },
      ],
    },
    {
      who: 'Lars', color: 'yellow', text: 'O Rei só sente as bolas de neve!',
      talk: [
        { who: 'Rei Knut', text: 'QUEM OUSA ENTRAR NO MEU INVERNO? Venha, astronautinha. Vou te transformar num picolé!' },
        { who: 'Lars', text: 'Ele está logo à frente. Tem montes de neve em cima dos caixotes, mas não fique parado lá: o Rei quebra tudo em que encosta!' },
        { who: 'Lars', text: 'Quando ele cai de um pulo, uma onda de choque corre pelo chão. Pule na hora para ela passar por baixo.' },
        { who: 'Lars', text: 'E dizem que, quando ele se irrita, cria uma armadura de gelo. Aí só adianta acertar logo depois que ele aterrissa de um pulo!' },
      ],
    },
  ],

  map: [
    '...............................................=========.........................................................................W........................................................................',
    '...............................................=========.........................................................................W........................................................................',
    '...............................................=========.........................................................................W........................................................................',
    '...............................................=========.................................CCC.....................................W........................................................................',
    '...............................................=========................................=====....................................W........................................................................',
    '...............................................=========.........................................................................W........................................................................',
    '...............................................=========.......................................O.................................W........................................................................',
    '...............................................=========.....O...................................................................W................................Q.......................................',
    '...............?C?......CC.....................=========.......CC..........B?B?B.................................................W...............................XXX......................................',
    '...............................................=========........................................................CCCCC............W..........................Q............................Q................',
    '................................C.C.C.C................................................................................[.........W........==................XX..........................XX................',
    '..P..N..o...e......o....y.............s...N.Q.Q......Z...e.....y....K..o.....s...e.....S.......y...TK@..................Q...s.e..W..N..K..==....o.....o.....XX..............R.........o.XX..o.....G.......',
    '#######################wwww####IIIIIIIIII##################wwwwwww########IIIIIIIIIII########wwwww####IIIIIIIII2222222####################################################################################',
    '#######################wwww####IIIIIIIIII##################wwwwwww########IIIIIIIIIII########wwwww####IIIIIIIIIwwwwwww####################################################################################',
  ],

  decorate({ level, add, rand, surfaceY }) {
    // vila de chalés no começo da fase
    const chalets = [[3, 'house1'], [16, 'houseAlt1'], [44, 'house2'], [70, 'houseAlt2'], [101, 'house1']];
    for (const [x, img] of chalets) {
      const y = surfaceY(x);
      if (y !== null) add({ image: img, scale: 0.95 }, x, y - 0.1);
    }
    add({ image: 'igloo', scale: 1.2 }, 56, 1.95);
    for (let x = 6; x < level.width; x += 4 + Math.floor(rand() * 4)) {
      const y = surfaceY(x);
      if (y === null || y > 4) continue;
      if (rand() < 0.55) add({ image: ['treePineSnow', 'treeSnow', 'treeLongSnow', 'treePineFrozen'][Math.floor(rand() * 4)], scale: 0.9 + rand() * 0.3 }, x + rand(), y - 0.1);
    }
  },
};
