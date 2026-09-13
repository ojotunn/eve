// Fase A sem LLM: prova que a fisica fecha. Agentes burros, 300 ciclos.
// Confere a invariante que segura o projeto inteiro: nada nasce do nada.
import * as W from '../src/world.js';

const w = W.newWorld();
W.makePerson(w, { name: 'Adam', sex: 'm', model: 'dry', founder: true, persona: '' });
W.makePerson(w, { name: 'Eve', sex: 'f', model: 'dry', founder: true, persona: '' });

const places = Object.keys(W.PLACES);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

for (let i = 0; i < 300; i++) {
  for (const p of W.alive(w)) {
    const roll = Math.random();
    if (p.hunger < 12 && p.items.grain) W.eat(w, p);
    else if (roll < 0.45) W.work(w, p);
    else if (roll < 0.6) p.place = pick(places);
    else if (roll < 0.7) W.make(w, p, 'tool');
    else if (roll < 0.76) {
      const other = W.at(w, p.place).find(x => x.id !== p.id);
      const item = Object.keys(p.items).filter(k => k.indexOf('#age') < 0)[0];
      if (other && item) W.give(w, p, other, item, 1);
    } else W.rest(w, p);
  }
  if (i % 7 === 3) { const p = W.alive(w)[0]; if (p) W.build(w, p, { stone: 6 }, 'pile'); }
  if (i % 11 === 5) { const p = W.alive(w)[0]; if (p) W.invent(w, p, { wood: 1, stone: 1 }, 'thing' + i); }
  W.passTime(w);
  if (!W.alive(w).length) break;
}

// Conferencia: o que existe agora tem de ser exatamente o que o mundo entregou
// menos o que voltou para o mundo (comido, gasto em ferramenta) e o que apodreceu.
const held = {};
const add = (bag, mult) => { for (const [k, n] of Object.entries(bag)) { if (k.indexOf('#age') >= 0) continue; held[k] = (held[k] || 0) + n * mult; } };
for (const p of Object.values(w.people)) add(p.items, 1);
for (const pl of Object.values(w.places)) add(pl.ground, 1);

const expected = {};
for (const e of w.ledger) {
  const fromWorld = e.from && e.from.startsWith('world:');
  const toWorld = e.to && e.to.startsWith('world:');
  const vanished = e.why === 'rotted';
  if (fromWorld) expected[e.item] = (expected[e.item] || 0) + e.amount;
  if (toWorld || vanished) expected[e.item] = (expected[e.item] || 0) - e.amount;
}

let bad = 0;
for (const k of new Set([...Object.keys(held), ...Object.keys(expected)])) {
  const a = held[k] || 0, b = expected[k] || 0;
  if (a !== b) { console.log('LEAK', k, 'held', a, 'expected', b); bad++; }
}
console.log('ticks', w.tick, '| alive', W.alive(w).length, '| dead', w.dead.map(d => d.name + ':' + d.cause).join(',') || 'none');
console.log('ledger entries', w.ledger.length, '| goods now', JSON.stringify(held));
console.log(bad ? 'FISICA QUEBRADA: ' + bad : 'FISICA OK: nada nasceu do nada, nada sumiu sem registro');
process.exit(bad ? 1 : 0);
