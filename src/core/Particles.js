import * as THREE from 'three';
import { LAYER } from './Sprite.js';

/*
  Partículas 2D (poeira, faíscas, destroços, neve caindo).
  Um único InstancedMesh desenha até 800 quadradinhos coloridos de uma vez.
  São efeitos visuais simples feitos com cor sólida — não são imagens.
*/
const MAX = 800;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export class Particles {
  constructor(scene) {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = LAYER.particles;
    this.mesh.count = 0;
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, color.set('#fff'));
    scene.add(this.mesh);
    this.list = [];
  }

  spawn(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  burst(x, y, { color: c = '#ffffff', count = 10, speed = 5, size = 0.15, life = 0.7, gravity = 18, up = 0.4 } = {}) {
    const colors = Array.isArray(c) ? c : [c];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s + speed * up,
        size: size * (0.6 + Math.random() * 0.8),
        life: life * (0.6 + Math.random() * 0.6),
        age: 0, gravity, spin: (Math.random() - 0.5) * 12,
        color: colors[i % colors.length],
      });
    }
  }

  dust(x, y, n = 5, c = '#f4ead8') {
    this.burst(x, y, { color: c, count: n, speed: 2.2, size: 0.14, life: 0.4, gravity: -2, up: 0.2 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) { this.list.splice(i, 1); continue; }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    let n = 0;
    for (const p of this.list) {
      const k = 1 - p.age / p.life;
      dummy.position.set(p.x, p.y, 0);
      dummy.rotation.set(0, 0, p.age * p.spin);
      dummy.scale.setScalar(p.size * (0.3 + 0.7 * k));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(n, dummy.matrix);
      this.mesh.setColorAt(n, color.set(p.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear() {
    this.list.length = 0;
    this.mesh.count = 0;
  }
}
