import * as THREE from 'three';
import { assets } from './Assets.js';

/*
  Sprite 2D desenhado pelo Three.js: um retângulo (PlaneGeometry) com uma "fatia" do atlas.
  - setFrame(nome) troca a fatia (é assim que as animações funcionam)
  - flip(true) espelha horizontalmente
  O tamanho no mundo é calculado a partir dos pixels: `unit` pixels = 1 tile.
*/

// ordem de desenho (camadas)
export const LAYER = {
  sky: 0, far: 2, mid: 4, near: 6, decorBack: 10, tiles: 20, decorFront: 24, items: 30,
  rope: 34, enemies: 40, player: 50, projectiles: 55, particles: 60, fx: 70,
};

const materials = new Map();
let ambient = new THREE.Color('#ffffff');

/** material compartilhado por textura (economiza memória e chamadas de desenho) */
export function spriteMaterial(texture, key) {
  if (!materials.has(key)) {
    materials.set(
      key,
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, color: ambient.clone() }),
    );
  }
  return materials.get(key);
}

export function ambientColor() {
  return ambient;
}

/** cor "ambiente" multiplicada em todos os sprites (ex.: entardecer no Vale das Abóboras) */
export function setAmbient(color) {
  ambient = new THREE.Color(color);
  for (const m of materials.values()) if (!m.userData.keepColor) m.color.copy(ambient);
}

export class Sprite extends THREE.Mesh {
  /**
   * @param {object} o
   *  atlas: 'tiles' | 'characters' | 'enemies'   frame: nome do frame
   *  image: nome de imagem avulsa (manifest IMAGES)
   *  scale: multiplicador de tamanho     anchor: 'bottom' | 'center'
   *  layer: camada (LAYER.x)             own: true = material próprio (para piscar/tingir)
   */
  constructor({ atlas = null, frame = null, image = null, scale = 1, anchor = 'bottom', layer = LAYER.items, own = false, tint = null, icy = false } = {}) {
    const geo = new THREE.PlaneGeometry(1, 1);
    if (anchor === 'bottom') geo.translate(0, 0.5, 0);
    const src = atlas ? assets.atlas[atlas] : assets.images[image];
    if (!src) throw new Error('Sprite sem textura: ' + (atlas || image));
    let mat = spriteMaterial(src.texture, atlas ? 'atlas:' + atlas : 'img:' + image);
    if (own || tint || icy) {
      mat = mat.clone();
      if (tint) {
        mat.color.set(tint);
        mat.userData.keepColor = true;
      }
      if (icy) {
        // efeito "congelado": tira a saturação da imagem e puxa para o azul-gelo
        mat.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.12) * vec3(0.78, 0.92, 1.08) + vec3(0.14, 0.18, 0.24);`,
          );
        };
        mat.customProgramCacheKey = () => 'icy';
      }
    }
    super(geo, mat);
    this.atlasName = atlas;
    this.src = src;
    this.baseScale = scale;
    this.flipped = false;
    this.renderOrder = layer;
    this.frustumCulled = false;
    this.ownMaterial = own || !!tint || icy;
    if (atlas) this.setFrame(frame);
    else this.setImage();
  }

  /** usa a imagem inteira (imagens avulsas) */
  setImage() {
    const s = this.src;
    this.w = (s.width / s.px) * this.baseScale;
    this.h = (s.height / s.px) * this.baseScale;
    this.applyScale();
  }

  setFrame(name) {
    if (name === this.frameName) return;
    const a = this.src;
    const f = a.frames[name];
    if (!f) throw new Error(`Frame "${name}" não existe no atlas`);
    this.frameName = name;
    const inset = 0.5;
    const u0 = (f.x + inset) / a.width, u1 = (f.x + f.w - inset) / a.width;
    const v1 = 1 - (f.y + inset) / a.height, v0 = 1 - (f.y + f.h - inset) / a.height;
    const uv = this.geometry.attributes.uv;
    // ordem dos vértices do PlaneGeometry: sup-esq, sup-dir, inf-esq, inf-dir
    uv.setXY(0, u0, v1);
    uv.setXY(1, u1, v1);
    uv.setXY(2, u0, v0);
    uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
    this.w = (f.w / a.unit) * this.baseScale;
    this.h = (f.h / a.unit) * this.baseScale;
    this.applyScale();
  }

  flip(on) {
    this.flipped = on;
    this.applyScale();
  }

  applyScale() {
    this.scale.set(this.w * (this.flipped ? -1 : 1), this.h, 1);
  }

  setOpacity(o) {
    if (this.ownMaterial) this.material.opacity = o;
  }

  dispose() {
    this.parent?.remove(this);
    this.geometry.dispose();
    if (this.ownMaterial) this.material.dispose();
  }
}
