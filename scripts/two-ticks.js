// Prova curta: dois ciclos de verdade, com o modelo decidindo. Nao deixa nada rodando.
import 'dotenv/config';
import * as W from '../src/world.js';
import { bootstrap, runTick } from '../src/engine.js';
import { usage } from '../src/brain.js';

const w = bootstrap(W.newWorld());
const t0 = Date.now();

for (let i = 0; i < Number(process.argv[2] || 2); i++) {
  await runTick(w, (ev) => console.log(`  t${ev.tick} [${ev.place}] ${ev.text}`));
}

const priceIn = 5 / 1e6, priceOut = 25 / 1e6, priceCacheRead = 0.5 / 1e6, priceCacheWrite = 6.25 / 1e6;
const cost = usage.in * priceIn + usage.out * priceOut + usage.cacheRead * priceCacheRead + usage.cacheWrite * priceCacheWrite;

console.log('\n--- ' + Math.round((Date.now() - t0) / 1000) + 's ---');
for (const p of W.alive(w)) {
  console.log(`${p.name}: ${p.place}, hunger ${p.hunger}, energy ${p.energy}, carries ${JSON.stringify(p.items)}`);
}
console.log('board:', w.board.map(b => b.who + ': ' + b.text).join(' | ') || 'empty');
console.log('calls', usage.calls, 'errors', usage.errors, '| in', usage.in, 'out', usage.out,
            'cacheRead', usage.cacheRead, 'cacheWrite', usage.cacheWrite);
console.log('custo destes ciclos: US$', cost.toFixed(4), '| por ciclo US$', (cost / Math.max(1, w.tick)).toFixed(4));
