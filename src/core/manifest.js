/*
  Lista de TODOS os arquivos de mídia do jogo (ficam em public/assets/).
  Nenhum asset é desenhado ou sintetizado por código: tudo vem de pacotes públicos
  (licenças nos arquivos License.txt de cada pasta e em CREDITS.md).
*/

const NPP = 'kenney_new-platformer-pack/';
const BE = 'kenney_background-elements-remastered/';
const WIN = 'kenney_platformer-art-winter/';
const FARM = 'kenney_pixel-platformer-farm-expansion/';
const IMP = 'kenney_impact-sounds/';
const UIS = 'kenney_interface-sounds/';
const MUS = 'music_juhani-junkala/';

// Spritesheets (atlas) do New Platformer Pack. Carregamos a versão "double" em telas grandes.
export const ATLASES = {
  tiles: NPP + 'spritesheet-tiles',
  characters: NPP + 'spritesheet-characters',
  enemies: NPP + 'spritesheet-enemies',
};

// Imagens avulsas. `px` = quantos pixels da imagem equivalem a 1 tile do jogo.
export const IMAGES = {
  // fundos (parallax) — cenas completas com céu, 1024x1024
  bg_grass: { url: BE + 'backgroundColorGrass.png' },
  bg_forest: { url: BE + 'backgroundColorForest.png' },
  bg_desert: { url: BE + 'backgroundColorDesert.png' },
  bg_fall: { url: BE + 'backgroundColorFall.png' },
  bg_snow: { url: BE + 'backgroundForest.png' },
  bg_castles: { url: BE + 'backgroundCastles.png' },
  bg_mountains: { url: BE + 'mountains.png' },
  bg_hills: { url: BE + 'hills.png' },

  // elementos de cenário (Background Elements Remastered: 64 px = 1 tile)
  house1: { url: BE + 'house1.png', px: 64 },
  house2: { url: BE + 'house2.png', px: 64 },
  houseAlt1: { url: BE + 'houseAlt1.png', px: 64 },
  houseAlt2: { url: BE + 'houseAlt2.png', px: 64 },
  houseSmall1: { url: BE + 'houseSmall1.png', px: 64 },
  houseSmallAlt2: { url: BE + 'houseSmallAlt2.png', px: 64 },
  treePineSnow: { url: BE + 'treePineSnow.png', px: 64 },
  treeSnow: { url: BE + 'treeSnow.png', px: 64 },
  treeLongSnow: { url: BE + 'treeLongSnow.png', px: 64 },
  treeFrozen: { url: BE + 'treeFrozen.png', px: 64 },
  treePineFrozen: { url: BE + 'treePineFrozen.png', px: 64 },
  treeOrange: { url: BE + 'treeOrange.png', px: 64 },
  treePineOrange: { url: BE + 'treePineOrange.png', px: 64 },
  treeLongOrange: { url: BE + 'treeLongOrange.png', px: 64 },
  treeDead: { url: BE + 'treeDead.png', px: 64 },
  treePalm: { url: BE + 'treePalm.png', px: 64 },
  treePine: { url: BE + 'treePine.png', px: 64 },
  tree: { url: BE + 'tree.png', px: 64 },
  pyramid: { url: BE + 'pyramid.png', px: 64 },
  cactus1: { url: BE + 'cactus1.png', px: 64 },
  cactus2: { url: BE + 'cactus2.png', px: 64 },
  cactus3: { url: BE + 'cactus3.png', px: 64 },
  bushOrange1: { url: BE + 'bushOrange1.png', px: 64 },
  bushOrange2: { url: BE + 'bushOrange2.png', px: 64 },
  bushOrange3: { url: BE + 'bushOrange3.png', px: 64 },
  bush1: { url: BE + 'bush1.png', px: 64 },
  bush2: { url: BE + 'bush2.png', px: 64 },
  fence: { url: BE + 'fence.png', px: 64 },
  moon: { url: BE + 'moon.png', px: 64 },
  moonFull: { url: BE + 'moonFull.png', px: 64 },
  sun: { url: BE + 'sun.png', px: 64 },
  cloud1: { url: BE + 'cloud1.png', px: 64 },
  cloud2: { url: BE + 'cloud2.png', px: 64 },
  cloud3: { url: BE + 'cloud3.png', px: 64 },
  mountainA: { url: BE + 'mountainA.png', px: 64 },
  mountainB: { url: BE + 'mountainB.png', px: 64 },

  // Platformer Art Winter (70 px = 1 tile)
  snowBall: { url: WIN + 'snowBall.png', px: 70 },
  snowBallBig: { url: WIN + 'snowBallBig.png', px: 70 },
  iceBlock: { url: WIN + 'iceBlock.png', px: 70 },
  iceBlockAlt: { url: WIN + 'iceBlockAlt.png', px: 70 },
  igloo: { url: WIN + 'igloo.png', px: 70 },
  snowHill: { url: WIN + 'snowHill.png', px: 70 },

  // Pixel Platformer Farm Expansion (pixel art 18 px; 20 px = 1 tile, sem suavização)
  pumpkin: { url: FARM + 'tile_0004.png', px: 20, pixel: true },
  jackOLantern: { url: FARM + 'tile_0005.png', px: 20, pixel: true },
  hayBale: { url: FARM + 'tile_0006.png', px: 20, pixel: true },
  hayRoll: { url: FARM + 'tile_0009.png', px: 20, pixel: true },
  sunflower: { url: FARM + 'tile_0020.png', px: 20, pixel: true },
  pumpkinPlant: { url: FARM + 'tile_0055.png', px: 20, pixel: true },
  wheat: { url: FARM + 'tile_0058.png', px: 20, pixel: true },
  wheat2: { url: FARM + 'tile_0059.png', px: 20, pixel: true },
  deadCrop1: { url: FARM + 'tile_0105.png', px: 20, pixel: true },
  deadCrop2: { url: FARM + 'tile_0106.png', px: 20, pixel: true },
  deadCrop3: { url: FARM + 'tile_0107.png', px: 20, pixel: true },
};

// Efeitos sonoros
export const SOUNDS = {
  jump: NPP + 'sounds/sfx_jump.ogg',
  jumpHigh: NPP + 'sounds/sfx_jump-high.ogg',
  coin: NPP + 'sounds/sfx_coin.ogg',
  gem: NPP + 'sounds/sfx_gem.ogg',
  hurt: NPP + 'sounds/sfx_hurt.ogg',
  bump: NPP + 'sounds/sfx_bump.ogg',
  throw: NPP + 'sounds/sfx_throw.ogg',
  magic: NPP + 'sounds/sfx_magic.ogg',
  disappear: NPP + 'sounds/sfx_disappear.ogg',
  select: NPP + 'sounds/sfx_select.ogg',
  stomp: IMP + 'impactSoft_heavy_000.ogg',
  punch: IMP + 'impactPunch_medium_000.ogg',
  break: IMP + 'impactWood_medium_000.ogg',
  rock: IMP + 'impactMining_000.ogg',
  plank: IMP + 'impactPlank_medium_000.ogg',
  ice: IMP + 'impactGlass_light_000.ogg',
  snow: IMP + 'footstep_snow_000.ogg',
  menuMove: UIS + 'select_001.ogg',
  menuOk: UIS + 'confirmation_001.ogg',
  menuBack: UIS + 'back_001.ogg',
  pickup: UIS + 'drop_002.ogg',
  powerup: UIS + 'maximize_006.ogg',
  locked: UIS + 'error_004.ogg',
};

// Músicas (Juhani Junkala, CC0)
export const MUSIC = {
  title: MUS + 'title-screen.ogg',
  stage1: MUS + 'stage1.ogg',
  stage2: MUS + 'stage2.ogg',
  level1: MUS + 'level1.ogg',
  level2: MUS + 'level2.ogg',
  level3: MUS + 'level3.ogg',
  boss: MUS + 'boss-fight.ogg',
  ending: MUS + 'ending.ogg',
};
