#!/usr/bin/env node
// Text interface for ClaudyFive, speaking a subset of the Gomocup (piskvork) protocol - the gomoku
// counterpart of ClaudyEngine's UCI front end.   node cli.js
//
//   START 15 | RESTART | INFO level <1-10> | INFO timeout_turn <ms> | BEGIN | TURN x,y
//   BOARD / x,y,player ... / DONE | TAKEBACK x,y | ABOUT | END
//
// Gomocup coordinates are 0-based with y counted from the top row.
const readline = require('readline');
const factory = require('./engine.js');

const eng = factory();
let moves = [];                       // engine coordinates: y = 0 is the bottom row
let level = 10, timeout = 0, board = null;
eng.newGame();

const toGomo = (m) => `${m[0]},${14 - m[1]}`;
const fromGomo = (s) => { const [x, y] = s.split(',').map(Number); return [x, 14 - y]; };

function play() {
  eng.setLevel(level);
  eng.setPosition(moves);
  const lim = timeout ? { ms: Math.max(100, timeout - 100) } : {};
  const r = eng.go(lim);
  console.log(`MESSAGE depth ${r.depth} score ${r.score} nodes ${r.nodes}`);
  moves.push(r.move);
  console.log(toGomo(r.move));
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (raw) => {
  const line = raw.trim();
  if (!line) return;
  if (board) {
    if (/^done$/i.test(line)) { const b = board; board = null; moves = b; play(); }
    else board.push(fromGomo(line.split(',').slice(0, 2).join(',')));
    return;
  }
  const [cmd, ...rest] = line.split(/\s+/);
  switch (cmd.toUpperCase()) {
    case 'START': moves = []; eng.newGame(); console.log(rest[0] === '15' ? 'OK' : 'ERROR unsupported board size'); break;
    case 'RESTART': moves = []; eng.newGame(); console.log('OK'); break;
    case 'INFO':
      if (rest[0] === 'level') level = Math.max(1, Math.min(10, +rest[1] || 10));
      else if (rest[0] === 'timeout_turn') timeout = +rest[1] || 0;
      break;
    case 'BEGIN': play(); break;
    case 'TURN': moves.push(fromGomo(rest[0])); play(); break;
    case 'BOARD': board = []; break;
    case 'TAKEBACK': moves.pop(); console.log('OK'); break;
    case 'ABOUT': console.log('name="ClaudyFive", version="1.0", author="Claude", country="KR"'); break;
    case 'END': process.exit(0); break;
    default: console.log('UNKNOWN ' + cmd);
  }
});
