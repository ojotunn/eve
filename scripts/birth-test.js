// Quanto tempo ate o primeiro filho? Roda ciclos sem espera e mede.
// Cada ciclo do mundo real = 45s, entao ciclo N = N*0.75 minutos.
import 'dotenv/config';
import * as W from '../src/world.js';
import { bootstrap, runTick } from '../src/engine.js';
import { usage } from '../src/brain.js';

process.env.POLIS_NO_PORTRAIT = '1';
const MAX = Number(process.argv[2] || 30);
const w = bootstrap(W.newWorld());
let firstBirth = null;

for (let i = 0; i < MAX && W.alive(w).length; i++) {
  await runTick(w, (ev) => {
    if (['birth', 'mate', 'death'].includes(ev.kind) || ev.text.includes('child')) {
      console.log(`  t${ev.tick} ${ev.text}`);
    }
  });
  if (w.births && firstBirth === null) {
    firstBirth = w.tick;
    console.log(`\n>>> PRIMEIRO FILHO no ciclo ${firstBirth} = ${(firstBirth * 0.75).toFixed(1)} minutos de mundo\n`);
    break;
  }
}

if (firstBirth === null) console.log(`\n>>> NENHUM FILHO em ${MAX} ciclos (${(MAX * 0.75).toFixed(0)} min). Ainda quebrado.\n`);
const cost = usage.in * 5e-6 + usage.out * 25e-6 + usage.cacheRead * 5e-7 + usage.cacheWrite * 6.25e-6;
console.log('ciclos', w.tick, '| chamadas', usage.calls, '| custo do teste US$', cost.toFixed(2));
for (const p of W.alive(w)) console.log(' ', p.name, 'em', p.place, '| fome', p.hunger, '| grao', p.items.grain || 0);
