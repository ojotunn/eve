// A curva de populacao: quantos vivos a cada 5 ciclos, e quando nasce cada um.
import 'dotenv/config';
import * as W from '../src/world.js';
import { bootstrap, runTick } from '../src/engine.js';
import { usage } from '../src/brain.js';
process.env.EDEN_NO_PORTRAIT = '1';
const MAX = Number(process.argv[2] || 30);
const w = bootstrap(W.newWorld());
for (let i = 0; i < MAX && W.alive(w).length; i++) {
  await runTick(w, (ev) => {
    if (ev.kind === 'birth' || ev.kind === 'death')
      console.log(`  t${ev.tick} (${(ev.tick * 0.75).toFixed(1)} min) ${ev.text}`);
  });
  if (w.tick % 5 === 0) console.log(`t${w.tick} = ${(w.tick * 0.75).toFixed(0)} min -> ${W.alive(w).length} vivos`);
}
const cost = usage.in * 5e-6 + usage.out * 25e-6 + usage.cacheRead * 5e-7 + usage.cacheWrite * 6.25e-6;
console.log('\nFIM:', W.alive(w).length, 'vivos |', w.births, 'nascimentos |', w.dead.length, 'mortes');
console.log('custo do teste US$', cost.toFixed(2), '| custo por ciclo US$', (cost / w.tick).toFixed(3));
