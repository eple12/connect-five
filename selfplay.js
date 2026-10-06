// Level calibration matches (cf. ClaudyEngine's gauntlets):
//   node selfplay.js <levelA> <levelB> [games=20] [msCap=300]
// Games start from random 3-ply openings near the centre and are played in colour-swapped pairs.
const factory = require('./engine.js');
const N = 15;

function hasFive(b, x, y, c) {
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let n = 1;
    for (let s = -1; s <= 1; s += 2)
      for (let k = 1; k < 5; k++) {
        const xx = x + s * k * dx, yy = y + s * k * dy;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N || b[yy * N + xx] !== c) break;
        n++;
      }
    if (n >= 5) return true;
  }
  return false;
}

function playGame(blackLv, whiteLv, opening, msCap, seed) {
  const eb = factory(), ew = factory();
  eb.newGame(seed * 2 + 1); ew.newGame(seed * 2 + 2);
  eb.setLevel(blackLv); ew.setLevel(whiteLv);
  const moves = opening.slice();
  const b = new Uint8Array(N * N);
  moves.forEach((m, i) => { b[m[1] * N + m[0]] = (i & 1) + 1; });
  while (moves.length < N * N) {
    const side = moves.length & 1;
    const e = side ? ew : eb;
    e.setPosition(moves);
    const lv = e.level;
    const lim = {};
    if (e.LEVELS[lv].ms) lim.ms = Math.min(e.LEVELS[lv].ms, msCap);
    const r = e.go(lim);
    const [x, y] = r.move;
    moves.push([x, y]);
    b[y * N + x] = side + 1;
    if (hasFive(b, x, y, side + 1)) return { winner: side, len: moves.length };
  }
  return { winner: -1, len: moves.length };
}

function main() {
  const la = +process.argv[2] || 5, lb = +process.argv[3] || 4, games = +process.argv[4] || 20, msCap = +process.argv[5] || 300;
  let rs = 12345;
  const rnd = (n) => { rs = (Math.imul(rs, 1103515245) + 12345) >>> 0; return (rs >>> 8) % n; };
  let wa = 0, wb = 0, dr = 0, tot = 0;
  const t0 = Date.now();
  for (let g = 0; g < games / 2; g++) {
    const used = new Set(), opening = [];
    while (opening.length < 3) {
      const x = 6 + rnd(4), y = 6 + rnd(4), k = x + ',' + y;
      if (!used.has(k)) { used.add(k); opening.push([x, y]); }
    }
    for (const swap of [false, true]) {
      const r = swap ? playGame(lb, la, opening, msCap, g) : playGame(la, lb, opening, msCap, g);
      const aIsBlack = !swap;
      if (r.winner < 0) dr++;
      else if ((r.winner === 0) === aIsBlack) wa++; else wb++;
      tot += r.len;
    }
  }
  console.log(`L${la} vs L${lb}: ${wa}-${wb}-${dr} (${(100 * (wa + dr / 2) / games).toFixed(1)}% for L${la}), avg length ${(tot / games).toFixed(1)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
main();
