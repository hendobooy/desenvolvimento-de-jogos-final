import * as THREE from 'three';
import { assets } from './Assets.js';
import { LAYER } from './Sprite.js';

/*
  Fundo em camadas (parallax): cada camada é uma imagem que se repete na horizontal
  e anda mais devagar que a câmera — dá sensação de profundidade num jogo 2D.

  Definição de camada (no arquivo da fase):
    { image: 'bg_desert', factor: 0.2, height: 12, y: 0, layer: LAYER.far }
    factor: 0 = parada, 1 = anda junto com o cenário
*/
export class Parallax {
  constructor(defs = []) {
    this.group = new THREE.Group();
    this.layers = defs.map((d, i) => {
      const img = assets.images[d.image];
      const tex = img.texture.clone();
      tex.wrapS = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: d.opacity ?? 1 });
      if (d.tint) mat.color.set(d.tint);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.renderOrder = d.layer ?? LAYER.far + i;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      const height = d.height ?? 12;
      return { ...d, mesh, tex, height, tileW: height * (img.width / img.height), factor: d.factor ?? 0.2, factorY: d.factorY ?? 0.1, y: d.y ?? 0 };
    });
  }

  update(camX, camY, viewW, viewH) {
    for (const l of this.layers) {
      const w = viewW + 2;
      l.mesh.scale.set(w, l.height, 1);
      const bottom = camY - viewH / 2;
      l.mesh.position.set(camX, bottom + l.y + l.height / 2 - bottom * l.factorY, 0);
      l.tex.repeat.x = w / l.tileW;
      l.tex.offset.x = (camX * l.factor - w / 2) / l.tileW;
    }
  }

  dispose() {
    for (const l of this.layers) {
      l.tex.dispose();
      l.mesh.material.dispose();
      l.mesh.geometry.dispose();
    }
  }
}
