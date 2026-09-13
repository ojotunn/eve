// O relogio. Executa a acao escolhida, registra quem viu o que, e deixa o
// mundo seguir. Nenhum evento aqui e escrito por mim: tudo e consequencia.
import * as W from './world.js';
import { decide, parseUsing } from './brain.js';
import { makePortrait } from './portrait.js';

const FOUNDER_MODEL = process.env.FOUNDER_MODEL || 'claude-opus-5';
const TURNS_PER_TICK = Number(process.env.TURNS_PER_TICK || 6);
const TICK_MS = Number(process.env.TICK_MS || 45000);

// O modelo e o temperamento: Haiku pensa curto e age por impulso, Opus segura um
// acordo de tres turnos na cabeca. Herda-se dos pais, e MUDA nos dois sentidos —
// um filho pode nascer mais capaz que os pais. Opus e raro, por isso vale.
const LADDER = ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5'];
const ODDS = {           // degraus de Opus entre os pais -> [haiku, sonnet, opus]
  2: [0.10, 0.55, 0.35], // os dois em Opus
  1: [0.20, 0.60, 0.20], // um dos dois
  0: [0.30, 0.62, 0.08], // nenhum
};

const NAMES = ['Ilan', 'Suri', 'Tove', 'Bran', 'Nell', 'Osk', 'Wren', 'Cass', 'Dov', 'Mila',
               'Raf', 'Juno', 'Pell', 'Ada', 'Nim', 'Sten', 'Vera', 'Loth', 'Iris', 'Gale',
               'Hale', 'Rune', 'Sefa', 'Torr', 'Ude', 'Vann', 'Wisa', 'Yor', 'Zel', 'Arn'];
const TRAITS = [
  'You count what you are owed.', 'You would rather work than talk.',
  'You do not forget a slight.', 'You want everyone fed before you sleep.',
  'You test what people tell you.', 'You say the first thing you think.',
  'You keep what you find.', 'You watch before you move.',
  'You take offence quickly.', 'You would rather be liked than right.',
  'You want your name on something that outlasts you.', 'You trust nobody who has more than you.',
  'You want children of your own before you are old.', 'A house with no children in it feels empty to you.',
];
// Cada um nasce com uma vontade funda. Sem nada disso eles otimizam trabalho e a
// sociedade morre de velha com duas pessoas ricas dentro; so com a primeira, viram
// uma creche que nunca constroi nada. As duas precisam existir na populacao.
const LINEAGE = [
  'You want children of your own, and you feel the lack of them.',
  'A world this empty bothers you; you want more of your people in it.',
  'You do not want to be the last of your line.',
];
const LEGACY = [
  'You want to leave something standing that outlives you, and children alone will not do it.',
  'You would rather raise a thing that lasts than spend your days gathering.',
  'Nothing here is finished, and it bothers you; you want to make what nobody has made.',
];
const driveFor = () => (Math.random() < 0.62 ? pick(LINEAGE) : pick(LEGACY));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const WANT_WINDOW = 3;

export function bootstrap(w) {
  W.makePerson(w, { name: 'Eve', sex: 'f', model: FOUNDER_MODEL, founder: true,
    persona: 'You keep track of what you are owed and what you owe. You would rather arrange something than ask for a favour. Two people is not a world; you want children, and you feel the lack of them.' });
  W.makePerson(w, { name: 'Adam', sex: 'm', model: FOUNDER_MODEL, founder: true,
    persona: 'You trust your hands more than words, and you lose patience with talk that goes nowhere. You do not want to be the last of your kind; a life with no children behind it feels wasted to you.' });
  return w;
}

const seen = (w, place) => Object.values(w.people).filter(p => p.alive && p.place === place);

function witness(w, place, text, kind, who) {
  const ev = { tick: w.tick, place, text, kind, who, at: Date.now() };
  w.events.push(ev);
  if (w.events.length > 400) w.events.splice(0, w.events.length - 400);
  for (const p of seen(w, place)) {
    p.inbox = p.inbox || [];
    p.inbox.push(text);
    p.memory.push('t' + w.tick + ' ' + text);
    if (p.memory.length > 40) p.memory.shift();
  }
  return ev;
}

function modelForChild(a, b) {
  const opusParents = [a, b].filter(p => p.model.includes('opus')).length;
  const [h, s] = ODDS[opusParents];
  const r = Math.random();
  return r < h ? LADDER[0] : r < h + s ? LADDER[1] : LADDER[2];
}

function born(w, a, b) {
  const used = new Set(Object.values(w.people).map(p => p.name));
  const name = NAMES.find(n => !used.has(n)) || ('N' + w.nextId);
  const child = W.makePerson(w, {
    name, sex: Math.random() < 0.5 ? 'f' : 'm', model: modelForChild(a, b),
    place: a.place, parents: [a.id, b.id],
    persona: [pick(TRAITS), pick(TRAITS), driveFor()].join(' '),
  });
  w.births++;
  makePortrait(child, [a, b]);
  witness(w, a.place, `${a.name} and ${b.name} have a child: ${name}.`, 'birth', child.id);
  return child;
}

async function turn(w, p, emit) {
  const heard = (p.inbox || []).slice(-10);
  p.inbox = [];
  p.lastTurn = w.tick;
  const a = await decide(w, p, heard);
  const other = a.target
    ? Object.values(w.people).find(x => x.alive && x.name.toLowerCase() === String(a.target).toLowerCase())
    : null;
  const near = other && other.place === p.place && other.id !== p.id;
  const goods = W.goodsOf(w);
  const item = a.item && goods[String(a.item).toLowerCase()] ? String(a.item).toLowerCase() : null;
  const amount = Math.max(1, Math.min(99, a.amount || 1));
  const said = a.text ? String(a.text).slice(0, 300) : '';
  const label = a.name ? String(a.name).trim().slice(0, 24) : '';
  const place = w.places[p.place];
  let line = null;

  switch (a.action) {
    case 'move': {
      if (W.PLACES[a.place] && a.place !== p.place) {
        witness(w, p.place, `${p.name} leaves for the ${a.place}.`, 'move', p.id);
        p.place = a.place;
        line = `${p.name} arrives at the ${w.places[a.place].town || a.place}.`;
      } else line = `${p.name} stays put.`;
      break;
    }
    case 'work': {
      const r = W.work(w, p);
      line = r.ok
        ? `${p.name} works and gets ${Object.entries(r.got).map(([k, n]) => n + ' ' + k).join(' and ')}.`
        : `${p.name} tries to work but ${r.why}.`;
      break;
    }
    case 'make': {
      const r = W.make(w, p, a.item);
      line = r.ok ? `${p.name} makes a ${r.what}.` : `${p.name} tries to make something: ${r.why}.`;
      break;
    }
    case 'invent': {
      const r = W.invent(w, p, parseUsing(w, a.using), label);
      if (r.ok) {
        line = `${p.name} puts things together and makes something nobody had made before, and calls it a ${r.name}.`;
        witness(w, p.place, `There is such a thing as a ${r.name} in the world now.`, 'invent', p.id);
      } else line = `${p.name} tries to make something new: ${r.why}.`;
      break;
    }
    case 'build': {
      const r = W.build(w, p, parseUsing(w, a.using), label);
      if (r.ok) {
        line = `${p.name} builds ${label || r.kind} here — ${r.does}.`;
        if (r.town) witness(w, p.place, 'Three things stand here now. This is more than a place.', 'town', p.id);
      } else line = `${p.name} tries to build something: ${r.why}.`;
      break;
    }
    case 'name': {
      if (p.pendingCraft && label) {
        p.craft = label.toLowerCase().slice(0, 20);
        p.craftOf = p.pendingCraft;
        p.pendingCraft = null;
        if (!w.crafts.includes(p.craft)) w.crafts.push(p.craft);
        line = `${p.name} has done it longer than anyone, and calls what they are a ${p.craft}.`;
      } else if (place.builds.length >= W.RULES.townSize && !place.town && label) {
        place.town = label;
        line = `${p.name} calls this place ${label}.`;
      } else line = `${p.name} has nothing to name yet.`;
      break;
    }
    case 'eat': { const r = W.eat(w, p); line = r.ok ? `${p.name} eats.` : `${p.name} has nothing to eat.`; break; }
    case 'rest': { const r = W.rest(w, p); line = `${p.name} rests${r.extra ? ' under cover' : ''}.`; break; }
    case 'give': {
      if (near && item) {
        const n = W.give(w, p, other, item, amount);
        line = n ? `${p.name} gives ${n} ${item} to ${other.name}.` : `${p.name} has no ${item} to give.`;
      } else line = `${p.name} reaches out to give something, but nobody is there to take it.`;
      break;
    }
    case 'say': { line = said ? `${p.name}: "${said}"` : `${p.name} says nothing.`; p.said++; break; }
    case 'post': {
      if (W.PLACES[p.place].board && said) {
        w.board.push({ who: p.name, tick: w.tick, text: said });
        line = `${p.name} writes on the board: "${said}"`;
      } else line = `${p.name} looks for the board, but it is at camp.`;
      break;
    }
    case 'promise': {
      if (said) {
        w.board.push({ who: p.name, tick: w.tick, promise: true,
          text: `(promise${other ? ' to ' + other.name : ''}) ${said}` });
        line = `${p.name} promises${other ? ' ' + other.name : ''}: "${said}"`;
      } else line = `${p.name} starts to promise something and stops.`;
      break;
    }
    case 'take': {
      if (near && item) {
        const r = W.take(w, p, other, item, amount);
        line = !r.ok ? `${p.name} is too tired to take anything.`
             : r.got ? `${p.name} takes ${r.got} ${item} from ${other.name} by force.`
                     : `${p.name} grabs at ${other.name} and comes away with nothing.`;
      } else line = `${p.name} finds nobody to take from.`;
      break;
    }
    case 'attack': {
      if (near) {
        const r = W.attack(w, p, other);
        if (!r.ok) line = `${p.name} is too tired to attack.`;
        else if (!r.hit) line = `${p.name} attacks ${other.name} and is hurt doing it.`;
        else if (r.died) {
          W.die(w, other, 'killed by ' + p.name);
          w.kills++;
          line = `${p.name} attacks ${other.name}. ${other.name} is dead.`;
        } else line = `${p.name} attacks ${other.name}, who is badly hurt.`;
      } else line = `${p.name} looks for someone to attack and finds nobody.`;
      break;
    }
    case 'mate': {
      if (near && W.canMate(p, w.tick)) {
        p.wantsChild = { with: other.id, tick: w.tick };
        line = `${p.name} turns to ${other.name}.`;
      } else line = near ? `${p.name} wants a child but cannot afford one yet.` : `${p.name} is alone.`;
      break;
    }
    case 'drop': {
      const n = item ? W.drop(w, p, item, amount) : 0;
      line = n ? `${p.name} leaves ${n} ${item} on the ground.` : `${p.name} has nothing to drop.`;
      break;
    }
    case 'pick': {
      const n = item ? W.pick(w, p, item, amount) : 0;
      line = n ? `${p.name} picks up ${n} ${item}.` : `${p.name} finds nothing to pick up.`;
      break;
    }
    default: line = `${p.name} does nothing.`;
  }
  const ev = witness(w, p.place, line, a.action, p.id);
  if (emit) emit(ev);
}

// Nem todos agem todo ciclo: age quem tem o que fazer. Assim a populacao cresce
// sem o mundo ficar lento e sem a conta explodir.
function queue(w) {
  const people = W.alive(w);
  if (people.length <= TURNS_PER_TICK) return people.sort(() => Math.random() - 0.5);
  const score = (p) => {
    const waited = w.tick - (p.lastTurn ?? -5);
    const hungry = p.hunger <= 6 ? 4 : p.hunger <= 10 ? 2 : 0;
    const company = W.at(w, p.place).length > 1 ? 1 : 0;
    const spoken = (p.inbox || []).length ? 2 : 0;
    return waited + hungry + company + spoken + Math.random();
  };
  return people.sort((a, b) => score(b) - score(a)).slice(0, TURNS_PER_TICK);
}

export async function runTick(w, emit) {
  for (const p of queue(w)) {
    if (p.alive) await turn(w, p, emit);
  }

  // Filho so nasce se os DOIS quiseram, no mesmo lugar, dentro da janela.
  for (const p of W.alive(w)) {
    if (!p.wantsChild || w.tick - p.wantsChild.tick > WANT_WINDOW) { p.wantsChild = null; continue; }
    const o = w.people[p.wantsChild.with];
    const mutual = o && o.alive && o.place === p.place && o.wantsChild
      && o.wantsChild.with === p.id && w.tick - o.wantsChild.tick <= WANT_WINDOW;
    if (mutual && W.canMate(p, w.tick) && W.canMate(o, w.tick)) {
      for (const parent of [p, o]) {
        parent.items.grain -= W.RULES.mateGrain;
        if (!parent.items.grain) delete parent.items.grain;
        w.ledger.push({ tick: w.tick, from: parent.id, to: null, item: 'grain', amount: W.RULES.mateGrain, why: 'child' });
      }
      p.lastChild = w.tick;
      o.lastChild = w.tick;
      born(w, p, o);
      if (emit) emit(w.events[w.events.length - 1]);
      p.wantsChild = null;
      o.wantsChild = null;
    }
  }

  for (const dead of W.passTime(w)) {
    const ev = witness(w, dead.place, `${dead.name} is dead of hunger.`, 'death', dead.id);
    if (emit) emit(ev);
  }
  return w;
}

export const tickMs = () => TICK_MS;
