// O turno de uma pessoa. Persona e regras do mundo ficam no system (prefixo
// estavel, cacheado); o estado vai na mensagem, que muda todo turno.
// Aqui NAO existe estrategia, conselho, mito nem sugestao de o que fazer.
import Anthropic from '@anthropic-ai/sdk';
import { PLACES, RULES, goodsOf, canMate } from './world.js';

const client = new Anthropic();
export const usage = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0, errors: 0 };

const ACTIONS = ['move', 'work', 'make', 'invent', 'build', 'name', 'eat', 'rest',
                 'give', 'say', 'post', 'promise', 'take', 'attack', 'mate', 'drop', 'pick'];

const ACT_TOOL = {
  name: 'act',
  description: 'Do exactly one thing this turn.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      action: { type: 'string', enum: ACTIONS },
      place:  { type: ['string', 'null'], description: 'for move: camp, field, forest or quarry' },
      target: { type: ['string', 'null'], description: 'another person, for give/take/attack/mate/promise' },
      item:   { type: ['string', 'null'], description: 'what thing, for give/take/drop/pick/make' },
      amount: { type: ['integer', 'null'] },
      using:  { type: ['string', 'null'], description: 'materials, for build and invent. e.g. "4 stone, 1 tool"' },
      name:   { type: ['string', 'null'], description: 'what to call the thing you build, invent, or the name of your trade' },
      text:   { type: ['string', 'null'], description: 'for say, post and promise. One or two sentences.' },
    },
    required: ['action', 'place', 'target', 'item', 'amount', 'using', 'name', 'text'],
  },
};

const WORLD_RULES = `You live in a small world. Four places: camp, field, forest, quarry.
You only see and hear what happens in the place you are standing in.

The field grows grain, the forest gives wood, the quarry gives stone and sometimes ore.
Grain is the only thing that feeds you and it rots in time. Everything else lasts.

What you can do, one per turn:
- move: walk to another place.
- work: gather what this place yields. Costs energy. A place runs out and refills slowly.
- eat: eat 1 grain. rest: get your strength back.
- give: hand any amount of anything to someone standing with you. Nothing comes back unless you arrange it yourself.
- say: speak to whoever is here. post: write on the board at camp — it stays there forever and everyone who comes to camp reads it.
- promise: say publicly that you will do something later. The world records it and everyone can see whether you kept it. Nothing forces you to keep it.
- take: take something from someone by force. It can fail. Whoever is here sees it.
- attack: attack someone. It can hurt them badly enough to kill them, and it can backfire. Whoever is here sees it.
- mate: have a child with someone. Both of you must choose it, near each other, within a few turns, and you each pay ${RULES.mateGrain} grain.
- drop / pick: leave something on the ground, or take something off it.

And what changes this place for good:
- build: spend materials to raise something that stays here forever. What it does depends on what you build it out of:
    6 stone — nothing kept in this place ever rots again
    6 wood — resting here gives back more
    4 stone and 1 tool — you can make and invent things here
    4 ore and 2 tools — you can work heavier things here
    3 wood and 3 stone — this place yields more from then on
  You choose what it is called. Three of them in one place and it is no longer just a place.
- invent: put two or more different things together and give the result a name that never existed.
  What comes out is one step beyond what went into it. From the second step on you need somewhere built for making.
  Once it exists, anyone who knows how can make it again.
- make: make another one of something already invented, if you have what it takes.
- name: when you have done the same work long enough to be the best at it, name what you are. That is what you will be called.

Hunger falls by ${RULES.hungerPerTick} every turn. At zero you die, and you do not come back. What you carry stays where you fell.

Nobody is in charge. There are no rules except the ones above, and no money. Whatever else exists here, you and the others will have to make it yourselves.`;

export function systemFor(p) {
  const trade = p.craft === 'founder'
    ? 'You were here before there was anything. You have no trade: you are one of the two the others came from.'
    : p.craft ? `You are ${p.name} the ${p.craft}.` : 'You have no trade yet. What you become depends on what you do.';
  return [{
    type: 'text',
    cache_control: { type: 'ephemeral' },
    text: `You are ${p.name}. ${p.persona}

${trade}

${WORLD_RULES}

Every turn you call the act tool exactly once. Speak plainly, like a person, not like a narrator. Keep what you say short.`,
  }];
}

function bag(items) {
  const e = Object.entries(items).filter(([k]) => !k.includes('#age'));
  return e.length ? e.map(([k, n]) => n + ' ' + k).join(', ') : 'nothing';
}

export function stateFor(w, p, heard) {
  const here = Object.values(w.people).filter(x => x.alive && x.place === p.place && x.id !== p.id);
  const def = PLACES[p.place];
  const place = w.places[p.place];
  const lines = [
    `Turn ${w.tick}. You are at the ${place.town || p.place}.`,
    `Hunger ${p.hunger}/${RULES.hungerMax}. Energy ${p.energy}/${RULES.energyMax}. You carry: ${bag(p.items)}.`,
  ];
  if (def.yields) lines.push(`This place still holds about ${place.stock} ${def.yields}.`);
  if (place.builds.length) {
    lines.push('Standing here: ' + place.builds.map(b => `${b.name} (${b.does || ''})`.trim()).join('; ') + '.');
  }
  lines.push(here.length
    ? `Here with you: ${here.map(x => x.name + (x.craft ? ' the ' + x.craft : '') + ' (carrying ' + bag(x.items) + ')').join('; ')}.`
    : 'You are alone here.');

  const mates = here.filter(x => canMate(x, w.tick));
  if (canMate(p, w.tick) && mates.length) {
    lines.push(`You and ${mates.map(x => x.name).join(', ')} each have what it takes to have a child right now ` +
               '(both of you must choose it, here, within a turn or two of each other).');
  } else if (!canMate(p, w.tick)) {
    const miss = [];
    if (p.lastChild != null && w.tick - p.lastChild < RULES.childRest) {
      miss.push('you are still worn out from your last child');
    }
    if (p.hunger < RULES.mateHunger) miss.push('you are too hungry');
    if (p.energy < RULES.mateEnergy) miss.push('you are too worn out');
    if ((p.items.grain || 0) < RULES.mateGrain) miss.push(`you need ${RULES.mateGrain} grain in hand`);
    if (miss.length && here.length) lines.push('To have a child: ' + miss.join(', ') + '.');
  }

  const ground = bag(place.ground);
  if (ground !== 'nothing') lines.push(`On the ground: ${ground}.`);

  const total = Object.values(w.people).filter(x => x.alive).length;
  lines.push(total <= 1 ? 'You are the only person alive in this world.'
           : `There are ${total} people alive in the whole world right now.`);

  const made = Object.keys(w.recipes || {});
  if (made.length) lines.push('Things that did not exist before someone made them: ' + made.join(', ') + '.');

  if (place.builds.length >= RULES.townSize && !place.town) {
    lines.push('Enough stands here now that it is not just a place. Nobody has given it a name.');
  }
  if (p.pendingCraft) {
    lines.push(`You have done ${p.pendingCraft.replace('work:', 'the work of the ')} more than anyone. ` +
               'Use the name action with one word for what you are now.');
  }
  if (def.board && w.board.length) lines.push('The board reads:\n' + w.board.slice(-8).map(b => `  ${b.who}: ${b.text}`).join('\n'));
  if (heard.length) lines.push('Since your last turn, here:\n' + heard.map(h => '  ' + h).join('\n'));
  if (p.memory.length) lines.push('You remember:\n' + p.memory.slice(-RULES.memory).map(m => '  ' + m).join('\n'));
  return lines.join('\n');
}

export async function decide(w, p, heard) {
  const req = {
    model: p.model,
    max_tokens: 1200,
    system: systemFor(p),
    messages: [{ role: 'user', content: stateFor(w, p, heard) }],
    tools: [ACT_TOOL],
  };
  if (!p.model.includes('haiku')) req.output_config = { effort: 'medium' };
  try {
    const res = await client.messages.create(req);
    usage.calls++;
    usage.in += res.usage.input_tokens || 0;
    usage.out += res.usage.output_tokens || 0;
    usage.cacheRead += res.usage.cache_read_input_tokens || 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens || 0;
    const call = res.content.find(b => b.type === 'tool_use');
    if (!call) return { action: 'rest' };
    const a = call.input || {};
    return ACTIONS.includes(a.action) ? a : { action: 'rest' };
  } catch (err) {
    usage.errors++;
    console.error('[brain]', p.name, err.status || '', err.message);
    return { action: 'rest', failed: true };
  }
}

// "4 stone, 1 tool" -> { stone: 4, tool: 1 }. So conta o que existe no mundo.
export function parseUsing(w, text) {
  const out = {};
  const goods = goodsOf(w);
  for (const m of String(text || '').matchAll(/(\d+)\s*([a-z][a-z0-9 -]*?)(?=,|;|$|\s+\d)/gi)) {
    const item = m[2].trim().toLowerCase().replace(/s$/, '');
    const key = goods[item] ? item : goods[item + 's'] ? item + 's' : null;
    if (key) out[key] = (out[key] || 0) + Number(m[1]);
  }
  return out;
}
