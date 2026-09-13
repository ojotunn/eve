// mundo minimo so para ver a marca de morte e o aviso na apresentacao
import fs from 'node:fs';
import * as W from '../src/world.js';
import { bootstrap } from '../src/engine.js';
const w = bootstrap(W.newWorld());
w.tick = 20;
const [eve, adam] = Object.values(w.people);
const kid = (n, m, f) => W.makePerson(w, { name: n, sex: 'm', model: 'claude-sonnet-5', place: 'camp', parents: [m.id, f.id], persona: '' });
const ilan = kid('Ilan', eve, adam);
const tove = kid('Tove', eve, adam); tove.craft = 'woodcutter';
W.die(w, tove, 'killed by Ilan'); w.kills = 1; w.births = 2;
fs.mkdirSync('data-test', { recursive: true });
fs.writeFileSync('data-test/world.json', JSON.stringify(w));
console.log('preview de morte pronto');
