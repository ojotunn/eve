// So para QA visual da arvore: monta tres geracoes com mortos e trocas.
// Nao encosta no mundo de verdade — grava em data-test/.
import fs from 'node:fs';
import * as W from '../src/world.js';
import { bootstrap } from '../src/engine.js';

const w = bootstrap(W.newWorld());
w.tick = 41;
const [eve, adam] = Object.values(w.people);
eve.items = { grain: 7, shell: 2 }; adam.items = { stone: 4, tool: 1 };
adam.hunger = 8; eve.hunger = 17;

const kid = (name, craft, mother, father, place) => {
  const p = W.makePerson(w, { name, sex: Math.random() < .5 ? 'f' : 'm', model: 'claude-sonnet-5',
    place, parents: [mother.id, father.id], persona: '' });
  p.craft = craft;
  return p;
};

const ilan = kid('Ilan', 'forager', eve, adam, 'field');
const suri = kid('Suri', 'knapper', eve, adam, 'quarry');
const tove = kid('Tove', 'woodcutter', eve, adam, 'forest');
ilan.items = { grain: 3 }; suri.items = { stone: 6, shell: 1 }; tove.items = { wood: 5 };
suri.hunger = 3;

const bran = kid('Bran', 'forager', ilan, suri, 'camp');
const nell = kid('Nell', 'knapper', ilan, suri, 'field');
nell.hunger = 11;
W.die(w, tove, 'killed by Suri');
w.kills = 1; w.births = 5;

w.board = [
  { who: 'Eve', tick: 1, text: 'Ledger: Eve farms the field and feeds Adam grain. Adam cuts wood and stone and makes tools; first tool to Eve. Grain owed is grain paid — I keep count.' },
  { who: 'Adam', tick: 12, promise: true, text: '(promise to Ilan) Two tools before the field runs dry, or my share of grain is yours.' },
  { who: 'Suri', tick: 33, text: 'Shells for grain: three shells one grain. Anyone who wants in, come to the quarry.' },
];
w.ledger.push(
  { tick: 6, from: eve.id, to: adam.id, item: 'grain', amount: 4, why: 'give' },
  { tick: 7, from: adam.id, to: eve.id, item: 'tool', amount: 1, why: 'give' },
  { tick: 29, from: suri.id, to: ilan.id, item: 'shell', amount: 3, why: 'give' },
  { tick: 31, from: ilan.id, to: suri.id, item: 'grain', amount: 1, why: 'give' },
  { tick: 38, from: tove.id, to: suri.id, item: 'wood', amount: 2, why: 'taken by force' },
);
w.events = [
  { tick: 38, place: 'forest', kind: 'say', text: 'Tove: "You said three shells for a grain. Nobody agreed to that but you."' },
  { tick: 38, place: 'forest', kind: 'take', text: 'Suri takes 2 wood from Tove by force.' },
  { tick: 39, place: 'forest', kind: 'attack', text: 'Suri attacks Tove. Tove is dead.' },
  { tick: 40, place: 'camp', kind: 'post', text: 'Suri writes on the board: "Shells for grain: three shells one grain."' },
  { tick: 41, place: 'field', kind: 'birth', text: 'Ilan and Suri have a child: Nell.' },
];

// estruturas, cidade e coisas inventadas, para ver a tela cheia
w.places.camp.builds = [
  { kind: 'store', name: 'the dry house', by: eve.id, tick: 18 },
  { kind: 'shelter', name: 'the long roof', by: adam.id, tick: 24 },
  { kind: 'works', name: 'the bench', by: suri.id, tick: 30 },
];
w.places.camp.town = 'Middlerest';
w.places.quarry.builds = [{ kind: 'works', name: 'the second bench', by: suri.id, tick: 36 }];
w.goods.pitch = { perishes: 0, level: 1, desc: 'made by Ilan', invented: true };
w.goods.hardstone = { perishes: 0, level: 2, desc: 'made by Suri', invented: true };
w.recipes.pitch = { using: { wood: 2, grain: 1 }, by: ilan.id, byName: 'Ilan', tick: 27, level: 1 };
w.recipes.hardstone = { using: { pitch: 1, ore: 2 }, by: suri.id, byName: 'Suri', tick: 34, level: 2 };
w.crafts = ['digger', 'bindmaker'];

fs.mkdirSync('data-test', { recursive: true });
fs.writeFileSync('data-test/world.json', JSON.stringify(w));
console.log('mundo de teste: 3 geracoes,', Object.keys(w.people).length, 'pessoas, 1 morto');
