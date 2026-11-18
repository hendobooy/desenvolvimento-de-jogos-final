import * as THREE from 'three';
import { ATLASES, IMAGES, SOUNDS, MUSIC } from './manifest.js';

/*
  Carregador de assets.
  - Atlas: imagem + XML do Kenney (<SubTexture name x y width height>) -> mapa de frames
  - Imagens avulsas -> THREE.Texture
  - Sons/músicas -> ArrayBuffer (decodificados depois pelo AudioSys)
*/

const BASE = import.meta.env.BASE_URL + 'assets/';

export const assets = {
  atlas: {},   // nome -> { texture, width, height, unit, frames: { nome: {x,y,w,h} } }
  images: {},  // nome -> { texture, width, height, px }
  sounds: {},  // nome -> ArrayBuffer
  music: {},
};

const texLoader = new THREE.TextureLoader();

function loadTexture(url, pixel = false) {
  return new Promise((resolve, reject) => {
    texLoader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.magFilter = pixel ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixel ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = !pixel;
        t.anisotropy = 4;
        resolve(t);
      },
      undefined,
      () => reject(new Error('Falha ao carregar ' + url)),
    );
  });
}

async function loadAtlas(base, variant) {
  const [xmlText, texture] = await Promise.all([
    fetch(BASE + base + '-' + variant + '.xml').then((r) => r.text()),
    loadTexture(BASE + base + '-' + variant + '.png'),
  ]);
  // sem mipmaps no atlas: evita que um sprite "vaze" a cor do vizinho
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const frames = {};
  doc.querySelectorAll('SubTexture').forEach((n) => {
    frames[n.getAttribute('name')] = {
      x: +n.getAttribute('x'),
      y: +n.getAttribute('y'),
      w: +n.getAttribute('width'),
      h: +n.getAttribute('height'),
    };
  });
  return {
    texture,
    width: texture.image.width,
    height: texture.image.height,
    unit: variant === 'double' ? 128 : 64, // pixels por tile
    url: BASE + base + '-' + variant + '.png',
    frames,
  };
}

/** carrega tudo, avisando o progresso (0..1) */
export async function loadAll(onProgress = () => {}) {
  // telas grandes/HiDPI usam a versão em dobro de resolução
  const variant = innerHeight * Math.min(devicePixelRatio, 2) > 950 ? 'double' : 'default';
  const jobs = [];
  for (const [name, base] of Object.entries(ATLASES)) jobs.push(() => loadAtlas(base, variant).then((a) => (assets.atlas[name] = a)));
  for (const [name, def] of Object.entries(IMAGES))
    jobs.push(() =>
      loadTexture(BASE + def.url, def.pixel).then((t) => {
        assets.images[name] = { texture: t, width: t.image.width, height: t.image.height, px: def.px || 64, url: BASE + def.url };
      }),
    );
  for (const [name, url] of Object.entries(SOUNDS)) jobs.push(() => fetch(BASE + url).then((r) => r.arrayBuffer()).then((b) => (assets.sounds[name] = b)));
  for (const [name, url] of Object.entries(MUSIC)) jobs.push(() => fetch(BASE + url).then((r) => r.arrayBuffer()).then((b) => (assets.music[name] = b)));

  let done = 0;
  await Promise.all(
    jobs.map((job) =>
      job().then(() => {
        done++;
        onProgress(done / jobs.length);
      }),
    ),
  );
  return assets;
}

/** frame de um atlas (lança erro claro se o nome estiver errado) */
export function frame(atlasName, frameName) {
  const a = assets.atlas[atlasName];
  const f = a && a.frames[frameName];
  if (!f) throw new Error(`Frame "${frameName}" não existe no atlas "${atlasName}"`);
  return f;
}
