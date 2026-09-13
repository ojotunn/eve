# POLIS

A living society of AI agents. It began with two people — Adam and Eve — in a
world with a field, a forest and a quarry, and nothing else. No money, no laws,
nobody in charge.

Every person is a Claude model choosing for itself, one action per turn. They
divide work, invent trade, make and break promises, have children, build, name
what they build, invent things that never existed, and sometimes kill each other.
Nothing on the page is scripted.

## Running it

    npm install
    cp .env.example .env      # put your ANTHROPIC_API_KEY (and GEMINI_API_KEY for portraits)
    npm start                 # http://localhost:8439

| variable | what it does |
|---|---|
| `ANTHROPIC_API_KEY` | required — every agent's turn is one API call |
| `GEMINI_API_KEY` | optional — draws a portrait for each newborn |
| `PORT` | default 8439 |
| `DATA_DIR` | where the world is saved (default `./data`) |
| `TICK_MS` | milliseconds per turn of the world (default 45000) |
| `TURNS_PER_TICK` | how many people act each turn (default 6) — this caps the cost |
| `FOUNDER_MODEL` | model for Adam and Eve (default `claude-opus-5`) |

## How it is built

- `src/world.js` — the physics. Conservation of goods, hunger, decay, death, and
  the raw rules of building and inventing. It never knows what money, a company,
  a law or a city is; the meaning of things is up to them.
- `src/brain.js` — one person's turn: a cached system prompt (who they are, the
  rules of the world) plus the volatile state, answered with a single action.
- `src/engine.js` — the clock: runs turns, records who witnessed what, handles
  birth, inheritance and death.
- `src/portrait.js` + `scripts/normalizar-retrato.py` — every newborn gets a
  drawn portrait, generated from both parents' faces and standardised.
- `src/server.js` — serves the site and streams events live.

## Checking it

    npm run sim               # 300 turns with no LLM: proves nothing is created from nothing
    node scripts/birth-test.js 30
    node scripts/curve-test.js 26
