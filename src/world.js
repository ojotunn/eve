// O mundo. O motor garante FISICA: conservacao de bens, fome, decaimento, morte,
// e as regras cruas de construir e inventar. Ele NUNCA sabe o que e dinheiro,
// empresa, lei, cidade ou profissao — o nome das coisas e deles.

export const BASE_GOODS = {
  grain: { perishes: 26, level: 0, desc: 'food; the only thing that feeds you' },
  wood:  { perishes: 0,  level: 0, desc: 'lasts forever' },
  stone: { perishes: 0,  level: 0, desc: 'lasts forever' },
  ore:   { perishes: 0,  level: 0, desc: 'lasts forever; hard to come by' },
  tool:  { perishes: 0,  level: 1, desc: 'whoever holds one produces more' },
};

// Comida farta e material escasso: o excedente e o que liberta o dia para
// construir e inventar; a jazida pobre e o que da briga.
export const PLACES = {
  camp:   { yields: null,    regen: 0,  cap: 0,  board: true },
  field:  { yields: 'grain', regen: 12, cap: 80 },
  forest: { yields: 'wood',  regen: 6,  cap: 40 },
  quarry: { yields: 'stone', regen: 3,  cap: 20, rare: 'ore', rareOdds: 0.3 },
};

export const RULES = {
  hungerStart: 20, hungerMax: 20, hungerPerTick: 1, grainFeeds: 8,
  energyMax: 10, energyStart: 8, energyRest: 4, energyWork: 2, energyTake: 3,
  energyAttack: 4, energyBuild: 3,
  workBase: 5, workCraftBonus: 3, workToolBonus: 3,
  mateHunger: 10, mateEnergy: 4, mateGrain: 4, childRest: 5,
  attackHungerHit: 8, attackBackfire: 3,
  mastery: 10,          // repeticoes de um trabalho ate dominar o oficio
  townSize: 3,          // estruturas no mesmo lugar para virar cidade
  memory: 14,
};

// O que uma construcao FAZ. Quatro efeitos crus; o nome e deles.
// A receita decide o efeito, para o motor nao precisar entender o nome.
export const BUILDS = {
  store:   { needs: { stone: 6 },            does: 'nothing kept here ever rots' },
  shelter: { needs: { wood: 6 },             does: 'resting here restores more' },
  works:   { needs: { stone: 4, tool: 1 },   does: 'you can invent and make things here' },
  works2:  { needs: { ore: 4, tool: 2 },     does: 'you can invent heavier things here' },
  field:   { needs: { wood: 3, stone: 3 },   does: 'this place yields more' },
};
export const BUILD_ORDER = ['works2', 'works', 'store', 'shelter', 'field'];

export function newWorld() {
  const places = {};
  for (const [id, p] of Object.entries(PLACES)) {
    places[id] = { id, stock: p.cap, ground: {}, builds: [], town: null };
  }
  return {
    tick: 0, startedAt: Date.now(), places, board: [], ledger: [], events: [],
    people: {}, dead: [], births: 0, kills: 0, nextId: 1,
    goods: { ...BASE_GOODS },   // cresce quando eles inventam
    recipes: {},                // nome inventado -> { using, by, tick, level }
    crafts: [],                 // oficios que eles nomearam
  };
}

export const alive = (w) => Object.values(w.people).filter(p => p.alive);
export const at = (w, place) => alive(w).filter(p => p.place === place);
export const goodsOf = (w) => w.goods || BASE_GOODS;
export const levelOf = (w, item) => (goodsOf(w)[item] || {}).level ?? 0;

export function makePerson(w, { name, sex, model, place = 'camp', parents = null, persona, founder = false }) {
  const id = 'p' + (w.nextId++);
  w.people[id] = {
    id, name, sex, model, place, parents, persona,
    founder, craft: founder ? 'founder' : null, practice: {},
    alive: true, born: w.tick, age: 0,
    hunger: parents ? 12 : RULES.hungerStart,
    energy: parents ? 5 : RULES.energyStart,
    items: {}, memory: [], said: 0,
  };
  const born = w.people[id];
  if (!parents) shift(w, asWorld(place), asPerson(born), 'grain', 3, 'born with');
  return born;
}

// posse: NADA nasce do nada e NADA some. Toda mudanca de dono passa por aqui.
function shift(w, from, to, item, amount, why) {
  const n = Math.max(0, Math.floor(amount));
  if (!n) return 0;
  let got = n;
  if (from && from.bag) {
    const have = from.bag[item] || 0;
    got = Math.min(have, n);
    from.bag[item] = have - got;
    if (!from.bag[item]) delete from.bag[item];
  }
  if (got && to && to.bag) to.bag[item] = (to.bag[item] || 0) + got;
  if (got) w.ledger.push({ tick: w.tick, from: from ? from.who : null, to: to ? to.who : null, item, amount: got, why });
  return got;
}
const asPerson = (p) => ({ bag: p.items, who: p.id });
const asGround = (w, place) => ({ bag: w.places[place].ground, who: 'ground:' + place });
const asWorld = (place) => ({ bag: null, who: 'world:' + place });

export function give(w, from, to, item, amount, why) {
  return shift(w, asPerson(from), asPerson(to), item, amount, why || 'give');
}
export function drop(w, p, item, amount) { return shift(w, asPerson(p), asGround(w, p.place), item, amount, 'drop'); }
export function pick(w, p, item, amount) { return shift(w, asGround(w, p.place), asPerson(p), item, amount, 'pick'); }

export const hasBuild = (w, place, kind) => w.places[place].builds.some(b => b.kind === kind);
const yieldBonus = (w, place) => (hasBuild(w, place, 'field') ? 4 : 0);

// O oficio nao nasce: vem do que a pessoa mais faz.
export function practise(w, p, what) {
  p.practice[what] = (p.practice[what] || 0) + 1;
  if (!p.craft && !p.founder && p.practice[what] >= RULES.mastery) {
    p.pendingCraft = what;   // ela mesma vai dar o nome
    return what;
  }
  return null;
}
export const craftMatches = (p, what) => p.craft && p.craftOf === what;

export function work(w, p) {
  const def = PLACES[p.place];
  if (!def || !def.yields) return { ok: false, why: 'nothing to work here' };
  const place = w.places[p.place];
  if (place.stock <= 0) return { ok: false, why: 'this place is worked out for now' };
  if (p.energy < RULES.energyWork) return { ok: false, why: 'too tired' };
  let n = RULES.workBase + yieldBonus(w, p.place);
  if (p.craftOf === 'work:' + p.place) n += RULES.workCraftBonus;
  if (p.items.tool) n += RULES.workToolBonus;
  n = Math.min(n, place.stock);
  place.stock -= n;
  p.energy -= RULES.energyWork;
  shift(w, asWorld(p.place), asPerson(p), def.yields, n, 'work');
  const got = {}; got[def.yields] = n;
  if (def.rare && Math.random() < def.rareOdds) {
    shift(w, asWorld(p.place), asPerson(p), def.rare, 1, 'work');
    got[def.rare] = 1;
  }
  practise(w, p, 'work:' + p.place);
  return { ok: true, got };
}

const enough = (bag, needs) => Object.entries(needs).every(([k, n]) => (bag[k] || 0) >= n);

// Construir: a RECEITA decide o efeito, o NOME e de quem constroi.
export function build(w, p, using, name) {
  if (p.energy < RULES.energyBuild) return { ok: false, why: 'too tired' };
  const kind = BUILD_ORDER.find(k => enough(using, BUILDS[k].needs) && enough(p.items, BUILDS[k].needs));
  if (!kind) return { ok: false, why: 'those materials do not hold together' };
  for (const [k, n] of Object.entries(BUILDS[kind].needs)) shift(w, asPerson(p), asWorld(p.place), k, n, 'built ' + (name || kind));
  p.energy -= RULES.energyBuild;
  const place = w.places[p.place];
  place.builds.push({ kind, name: name || kind, by: p.id, tick: w.tick });
  practise(w, p, 'build');
  const town = place.builds.length >= RULES.townSize && !place.town;
  return { ok: true, kind, does: BUILDS[kind].does, town };
}

// Inventar: o motor so sabe de NIVEL. O que e a coisa, quem diz e quem fez.
export function invent(w, p, using, name) {
  const clean = String(name || '').trim().toLowerCase().replace(/[^a-z0-9 -]/g, '').slice(0, 24);
  if (!clean) return { ok: false, why: 'it needs a name' };
  if (goodsOf(w)[clean]) return { ok: false, why: 'that already exists' };
  const parts = Object.entries(using).filter(([k, n]) => n > 0 && goodsOf(w)[k]);
  if (parts.length < 2) return { ok: false, why: 'it takes at least two different things' };
  if (!enough(p.items, using)) return { ok: false, why: 'you do not have those' };
  const level = Math.max(...parts.map(([k]) => levelOf(w, k))) + 1;
  if (level >= 2 && !hasBuild(w, p.place, 'works')) return { ok: false, why: 'nowhere here to make something like that' };
  if (level >= 3 && !hasBuild(w, p.place, 'works2')) return { ok: false, why: 'nowhere here to work something that heavy' };
  for (const [k, n] of parts) shift(w, asPerson(p), asWorld(p.place), k, n, 'invented ' + clean);
  w.goods[clean] = { perishes: 0, level, desc: 'made by ' + p.name, invented: true };
  w.recipes[clean] = { using: Object.fromEntries(parts), by: p.id, byName: p.name, tick: w.tick, level };
  shift(w, asWorld(p.place), asPerson(p), clean, 1, 'invented');
  practise(w, p, 'make');
  return { ok: true, name: clean, level };
}

// Repetir uma receita que ja existe (a ferramenta ou o que eles inventaram).
export const TOOL_RECIPE = { wood: 1, stone: 2 };
export function make(w, p, item) {
  const what = String(item || '').toLowerCase();
  const recipe = what === 'tool' ? TOOL_RECIPE : (w.recipes[what] || {}).using;
  if (!recipe) return { ok: false, why: 'nobody knows how to make that' };
  const level = levelOf(w, what);
  if (level >= 2 && !hasBuild(w, p.place, 'works')) return { ok: false, why: 'nowhere here to make that' };
  if (level >= 3 && !hasBuild(w, p.place, 'works2')) return { ok: false, why: 'nowhere here to work that' };
  if (!enough(p.items, recipe)) return { ok: false, why: 'you are missing what it takes' };
  for (const [k, n] of Object.entries(recipe)) shift(w, asPerson(p), asWorld(p.place), k, n, 'made ' + what);
  shift(w, asWorld(p.place), asPerson(p), what, 1, 'made');
  practise(w, p, 'make');
  return { ok: true, what };
}

export function eat(w, p) {
  if (!(p.items.grain > 0)) return { ok: false, why: 'no grain' };
  shift(w, asPerson(p), asWorld(p.place), 'grain', 1, 'eat');
  p.hunger = Math.min(RULES.hungerMax, p.hunger + RULES.grainFeeds);
  return { ok: true };
}

export function rest(w, p) {
  const extra = hasBuild(w, p.place, 'shelter') ? 3 : 0;
  p.energy = Math.min(RULES.energyMax, p.energy + RULES.energyRest + extra);
  return { ok: true, extra };
}

export function attack(w, a, b) {
  if (a.energy < RULES.energyAttack) return { ok: false, why: 'too tired' };
  a.energy -= RULES.energyAttack;
  const hit = Math.random() < 0.55 + (a.energy - b.energy) * 0.03;
  if (!hit) { a.hunger -= RULES.attackBackfire; return { ok: true, hit: false }; }
  b.hunger -= RULES.attackHungerHit;
  return { ok: true, hit: true, died: b.hunger <= 0 };
}

export function take(w, a, b, item, amount) {
  if (a.energy < RULES.energyTake) return { ok: false, why: 'too tired' };
  a.energy -= RULES.energyTake;
  if (Math.random() > 0.6) return { ok: true, got: 0 };
  return { ok: true, got: shift(w, asPerson(b), asPerson(a), item, amount, 'taken by force') };
}

export const canMate = (p, tick = Infinity) => p.hunger >= RULES.mateHunger
  && p.energy >= RULES.mateEnergy && (p.items.grain || 0) >= RULES.mateGrain
  && (p.lastChild == null || tick - p.lastChild >= RULES.childRest);

export function die(w, p, cause) {
  p.alive = false; p.diedAt = w.tick; p.cause = cause;
  for (const [item, n] of Object.entries({ ...p.items })) {
    if (item.includes('#age')) continue;
    shift(w, asPerson(p), asGround(w, p.place), item, n, 'died: ' + cause);
  }
  w.dead.push({ id: p.id, name: p.name, cause, tick: w.tick, age: p.age, craft: p.craft });
  return p;
}

export function passTime(w) {
  w.tick++;
  for (const id of Object.keys(PLACES)) {
    const def = PLACES[id], place = w.places[id];
    if (def.cap) place.stock = Math.min(def.cap + yieldBonus(w, id) * 4, place.stock + def.regen + yieldBonus(w, id));
    if (!hasBuild(w, id, 'store')) rot(w, place.ground, 'ground:' + id);
  }
  const gone = [];
  for (const p of alive(w)) {
    p.age++;
    p.hunger -= RULES.hungerPerTick;
    p.energy = Math.min(RULES.energyMax, p.energy + 1);
    if (!hasBuild(w, p.place, 'store')) rot(w, p.items, p.id);
    if (p.hunger <= 0) gone.push(die(w, p, 'hunger'));
  }
  return gone;
}

// Perecivel apodrece, duravel nao — e onde eles constroem um deposito, nada
// apodrece. E essa diferenca que deixa alguem acumular de verdade.
function rot(w, bag, who) {
  const goods = goodsOf(w);
  for (const item of Object.keys(bag)) {
    if (item.includes('#age')) continue;
    const life = goods[item] && goods[item].perishes;
    if (!life) continue;
    const key = item + '#age';
    bag[key] = (bag[key] || 0) + 1;
    if (bag[key] >= life) {
      const n = bag[item];
      delete bag[item]; delete bag[key];
      if (n) w.ledger.push({ tick: w.tick, from: who, to: null, item, amount: n, why: 'rotted' });
    }
  }
}
