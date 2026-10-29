// Sanity + tactics tests for engine.js:   node test.js
const factory = require('./engine.js');

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const P = (s) => { const m = /^([A-O])(\d+)$/.exec(s); return [m[1].charCodeAt(0) - 65, +m[2] - 1]; };
const name = (m) => String.fromCharCode(65 + m[0]) + (m[1] + 1);
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

// Build a position from two stone lists (black first, alternating). Surplus stones of the longer side are
// appended so that the side to move is correct.
function pos(black, white) {
  const b = black.split(' ').filter(Boolean).map(P), w = white.split(' ').filter(Boolean).map(P);
  const moves = [];
  for (let i = 0; i < Math.max(b.length, w.length); i++) { if (b[i]) moves.push(b[i]); if (w[i]) moves.push(w[i]); }
  return moves;
}
function best(level, black, white, lim) {
  const e = factory();
  e.newGame(7); e.setLevel(level, { rnd: 0 });   // rnd = deliberate random moves (tested below)
  e.setPosition(pos(black, white));
  return e.go(Object.assign({ ms: 3000 }, lim || {}));
}

// 1. empty board -> centre
{ const e = factory(); e.newGame(1); e.setLevel(10); e.setPosition([]); ok(name(e.go().move) === 'H8', 'first move is the centre'); }

// 2. static eval is path independent and make/unmake leaves the state untouched
{
  const a = factory(), b = factory();
  a.newGame(1); b.newGame(1);
  a.setPosition(pos('H8 I9 J10 K7', 'I8 J9 H10 G9'));
  b.setPosition(pos('K7 J10 I9 H8', 'G9 H10 J9 I8'));
  ok(a.staticEval() === b.staticEval(), 'static eval independent of move order');
  const before = a.staticEval();
  a.setLevel(6); a.go({ depth: 4 });
  ok(a.staticEval() === before, 'search leaves position intact');
}

// 3. wins in one / blocks a four (every level, including the weakest, except for planned oversights)
for (const lv of [1, 5, 10]) {
  const r = best(lv, 'H8 I8 J8 K8', 'H9 I9 J9 A1');
  ok(name(r.move) === 'G8' || name(r.move) === 'L8', `level ${lv} completes five (${name(r.move)})`);
}
{
  const r = best(10, 'H8 I8 J8 A1', 'H9 I9 J9 K9');       // black to move, white threatens five at G9/L9? (white four H9..K9)
  ok(['G9', 'L9'].includes(name(r.move)) || ['G9', 'L9'].includes(name(r.move)), 'blocks an open four is impossible -> any block ' + name(r.move));
}
{
  // white has a closed four (G9 blocked by black); black must play L9
  const r = best(10, 'H8 I8 J8 G9', 'H9 I9 J9 K9');
  ok(name(r.move) === 'L9', 'blocks a closed four (' + name(r.move) + ')');
}

// 4. blocks an open three (level >= 3 sees it)
for (const lv of [3, 5, 10]) {
  const r = best(lv, 'A1 O1 A15', 'H8 I8 J8');
  // after black's move white... we need black to move: black has 3 stones, white 3 -> black to move
  ok(['G8', 'K8', 'F8', 'L8'].includes(name(r.move)), `level ${lv} blocks open three (${name(r.move)})`);
}

// 5. finds a four-three win (level 6+): black H8 I8 J8 (open three) + vertical K9..K11 setups
{
  // black: three on row 8 (H8 I8 J8 closed on the left by G8 white) and two diag stones so that K8... simple VCF:
  // black has H8 I8 J8 with G8 blocked: K8 makes a four -> L8 forced; then L9 L10 L11 line etc.
  const r = best(10, 'H8 I8 J8 K10 K11 K12', 'G8 A1 A3 A5 A7 A9');
  // K8 makes a four on row (H8-K8, G8 blocked -> L8) and a three K10-K12 + K8 ... K9 empty: K8 K10 K11 K12 four? yes second four.
  ok(name(r.move) === 'K8' || name(r.move) === 'K9', 'double four found (' + name(r.move) + ')');
}

// 6. mate-in-N reporting
{
  const r = best(10, 'H8 I8 J8 K11 K12 K10', 'G8 A1 A3 A5 A7 A9', { ms: 1000 });
  ok(r.score > 29000, 'win score reported (' + r.score + ')');
}

// 7. speed
{
  const e = factory(); e.newGame(3); e.setLevel(10);
  e.setPosition(pos('H8 J8 I9 K9', 'I8 H9 J9 G8'));
  const t = Date.now();
  const r = e.go({ ms: 3000, depth: 8 });
  const dt = Date.now() - t;
  console.log(`speed: depth ${r.depth}, ${r.nodes} nodes in ${dt} ms -> ${(r.nodes / dt * 1000 | 0)} nps, move ${name(r.move)} score ${r.score}`);
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);

// 7. the weakest levels really do play arbitrary moves (and the strong ones never do)
{
  const missed = lv => { let n = 0; for (let sd = 1; sd <= 40; sd++) { const e = factory(); e.newGame(sd); e.setLevel(lv); e.setPosition(pos('H8 I8 J8 K8', 'H9 I9 J9 A1')); const m = name(e.go({ ms: 200 }).move); if (m !== 'G8' && m !== 'L8') n++; } return n; };
  const m1 = missed(1), m10 = missed(10);
  ok(m1 >= 20, `level 1 often ignores a winning move (${m1}/40)`);
  ok(m10 === 0, `level 10 never does (${m10}/40)`);
}
