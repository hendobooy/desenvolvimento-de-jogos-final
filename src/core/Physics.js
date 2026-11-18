/*
  Física de tiles (AABB).
  Toda entidade tem: x, y (canto inferior esquerdo), w, h, vx, vy.
  O mundo usa 1 unidade = 1 tile. y cresce para cima.

  moveAndCollide move a entidade eixo por eixo e resolve colisões com o mapa.
*/

const EPS = 1e-4;

export function moveAndCollide(e, level, dt, { semisolid = true } = {}) {
  const res = { left: false, right: false, top: false, bottom: false, headTiles: [] };

  // ----- eixo X -----
  e.x += e.vx * dt;
  let y0 = Math.floor(e.y + EPS);
  let y1 = Math.floor(e.y + e.h - EPS);
  if (e.vx > 0) {
    const cx = Math.floor(e.x + e.w - EPS);
    for (let ty = y0; ty <= y1; ty++)
      if (level.isSolid(cx, ty)) {
        e.x = cx - e.w;
        e.vx = 0;
        res.right = true;
        break;
      }
  } else if (e.vx < 0) {
    const cx = Math.floor(e.x + EPS);
    for (let ty = y0; ty <= y1; ty++)
      if (level.isSolid(cx, ty)) {
        e.x = cx + 1;
        e.vx = 0;
        res.left = true;
        break;
      }
  }

  // ----- eixo Y -----
  const prevY = e.y;
  e.y += e.vy * dt;
  const x0 = Math.floor(e.x + EPS);
  const x1 = Math.floor(e.x + e.w - EPS);
  if (e.vy <= 0) {
    const ty = Math.floor(e.y);
    for (let tx = x0; tx <= x1; tx++) {
      const solid = level.isSolid(tx, ty);
      // plataformas "semissólidas": só seguram quem vem de cima
      const semi = semisolid && level.isSemi(tx, ty) && prevY >= ty + 1 - 0.05;
      if (solid || semi) {
        e.y = ty + 1;
        e.vy = 0;
        res.bottom = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(e.y + e.h);
    const hits = [];
    for (let tx = x0; tx <= x1; tx++) if (level.isSolid(tx, ty)) hits.push(tx);
    if (hits.length) {
      e.y = ty - e.h;
      e.vy = 0;
      res.top = true;
      // o bloco "atingido" é o mais próximo do centro da entidade
      const cx = e.x + e.w / 2;
      hits.sort((a, b) => Math.abs(a + 0.5 - cx) - Math.abs(b + 0.5 - cx));
      res.headTiles = hits.map((tx) => [tx, ty]);
    }
  }
  return res;
}

/** true se existe chão logo abaixo da borda indicada (dir = -1 esquerda, 1 direita) */
export function groundAhead(e, level, dir) {
  const fx = dir > 0 ? Math.floor(e.x + e.w + 0.05) : Math.floor(e.x - 0.05);
  const fy = Math.floor(e.y - 0.1);
  return level.isSolid(fx, fy) || level.isSemi(fx, fy);
}

export function overlap(a, b, shrink = 0) {
  return (
    a.x + shrink < b.x + b.w &&
    a.x + a.w - shrink > b.x &&
    a.y + shrink < b.y + b.h &&
    a.y + a.h - shrink > b.y
  );
}
