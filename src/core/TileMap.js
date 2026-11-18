import * as THREE from 'three';
import { assets } from './Assets.js';
import { spriteMaterial, LAYER } from './Sprite.js';

/*
  TileBatch: junta centenas de tiles parados numa ÚNICA malha (BufferGeometry).
  Cada tile vira um quadrado com as coordenadas de textura (UV) da sua fatia no atlas.
  Resultado: o cenário inteiro é desenhado com pouquíssimas chamadas à GPU.
*/
export class TileBatch {
  constructor({ atlas = null, image = null, layer = LAYER.tiles } = {}) {
    this.atlasName = atlas;
    this.imageName = image;
    this.layer = layer;
    this.pos = [];
    this.uv = [];
    this.idx = [];
    this.count = 0;
  }

  /** adiciona um tile: frame do atlas (ou imagem inteira) no retângulo x,y,w,h (em tiles) */
  add(frameName, x, y, w = 1, h = 1) {
    let u0 = 0, u1 = 1, v0 = 0, v1 = 1;
    if (this.atlasName) {
      const a = assets.atlas[this.atlasName];
      const f = a.frames[frameName];
      if (!f) throw new Error(`Tile "${frameName}" não existe no atlas ${this.atlasName}`);
      const inset = 0.5;
      u0 = (f.x + inset) / a.width;
      u1 = (f.x + f.w - inset) / a.width;
      v1 = 1 - (f.y + inset) / a.height;
      v0 = 1 - (f.y + f.h - inset) / a.height;
    }
    const i = this.count * 4;
    this.pos.push(x, y, 0, x + w, y, 0, x, y + h, 0, x + w, y + h, 0);
    this.uv.push(u0, v0, u1, v0, u0, v1, u1, v1);
    this.idx.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
    this.count++;
  }

  build() {
    if (!this.count) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    const src = this.atlasName ? assets.atlas[this.atlasName] : assets.images[this.imageName];
    const key = this.atlasName ? 'atlas:' + this.atlasName : 'img:' + this.imageName;
    const mesh = new THREE.Mesh(g, spriteMaterial(src.texture, key));
    mesh.renderOrder = this.layer;
    mesh.frustumCulled = false;
    return mesh;
  }
}
