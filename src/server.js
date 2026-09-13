// Servidor: roda o relogio, guarda o mundo em disco e transmite o que acontece.
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as W from './world.js';
import { bootstrap, runTick, tickMs } from './engine.js';
import { usage } from './brain.js';
import { ensurePortraitDir, backfillPortraits, onPortraitReady, hasPortrait, DIR as PORTRAIT_DIR } from './portrait.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(here, '..', 'data');
const FILE = path.join(DATA, 'world.json');
const PORT = Number(process.env.PORT || 8439);

fs.mkdirSync(DATA, { recursive: true });
ensurePortraitDir();

let world;
// RESET_WORLD=1 recomeca do zero na proxima subida. O mundo anterior nao e
// apagado: fica guardado ao lado, com a hora no nome.
if (process.env.RESET_WORLD === '1' && fs.existsSync(FILE)) {
  const backup = FILE.replace(/\.json$/, '') + '-' + Date.now() + '.json';
  fs.renameSync(FILE, backup);
  console.log('[eden] mundo anterior guardado em', backup);
}
try {
  world = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log('[eden] mundo retomado no ciclo', world.tick);
} catch {
  world = bootstrap(W.newWorld());
  console.log('[eden] mundo novo');
}

const save = () => fs.writeFileSync(FILE, JSON.stringify(world));

const clients = new Set();

// Quando o rosto de alguem fica pronto, a arvore troca a inicial pela cara
// sem ninguem precisar atualizar a pagina.
onPortraitReady((name) => emit({ kind: 'portrait', who: name, tick: world.tick, place: '', text: name }));
function emit(ev) {
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
  for (const res of clients) res.write(line);
}

// Visao publica: tudo que o publico ve, ninguem ve por dentro de ninguem.
function view() {
  const people = Object.values(world.people).map(p => ({
    id: p.id, name: p.name, sex: p.sex, craft: p.craft || null, founder: !!p.founder,
    place: p.place, alive: p.alive,
    hunger: p.hunger, energy: p.energy, age: p.age, born: p.born, parents: p.parents,
    model: p.model.replace('claude-', '').replace('-4-5', '').replace('-5', ''),
    face: hasPortrait(p.name),
    items: Object.fromEntries(Object.entries(p.items).filter(([k]) => k.indexOf('#age') < 0)),
    cause: p.cause || null,
  }));
  const places = Object.fromEntries(Object.entries(world.places).map(([k, v]) => [k, {
    stock: v.stock, town: v.town || null,
    builds: (v.builds || []).map(b => ({ name: b.name, kind: b.kind, by: b.by, tick: b.tick })),
    ground: Object.fromEntries(Object.entries(v.ground).filter(([g]) => g.indexOf('#age') < 0)),
  }]));
  const trades = world.ledger.filter(e => e.why === 'give' || e.why === 'taken by force').slice(-40);
  return {
    tick: world.tick, startedAt: world.startedAt, births: world.births, kills: world.kills,
    alive: W.alive(world).length, dead: world.dead, people, places,
    board: world.board.slice(-30), events: world.events.slice(-80), trades,
    invented: Object.entries(world.recipes || {}).map(([name, r]) => ({
      name, by: r.byName, tick: r.tick, level: r.level,
      using: Object.entries(r.using).map(([k, n]) => n + ' ' + k).join(' + '),
    })),
    crafts: world.crafts || [],
    tickMs: tickMs(world), usage,
  };
}

let running = false;
async function loop() {
  if (running) return;
  running = true;
  try {
    if (W.alive(world).length === 0) {
      console.log('[eden] ninguem vivo. O mundo parou no ciclo', world.tick);
      return;
    }
    await runTick(world, emit);
    save();
    backfillPortraits(world);
    console.log(`[eden] ciclo ${world.tick} | vivos ${W.alive(world).length} | nascimentos ${world.births} | mortes ${world.dead.length} | chamadas ${usage.calls}`);
  } catch (err) {
    console.error('[eden] ciclo falhou:', err.message);
  } finally {
    running = false;
    setTimeout(loop, tickMs(world));
  }
}

const app = express();
// Os rostos vem do volume (onde os recem-nascidos sao gravados); o resto do site
// vem do repositorio. Retrato pode ficar em cache, pagina nao.
app.use('/portraits', express.static(PORTRAIT_DIR, {
  etag: true, maxAge: '1h', fallthrough: true,
}));
app.use(express.static(path.join(here, '..', 'public'), { etag: false, setHeaders: (r) => r.setHeader('Cache-Control', 'no-cache') }));
// Ticker, contrato e redes vem de variavel de ambiente: no dia do lancamento
// e so gravar a variavel no Railway e aparece na tela, sem novo deploy.
app.get('/api/config', (_req, res) => res.json({
  symbol: process.env.TOKEN_SYMBOL || '',
  ca: process.env.TOKEN_CA || '',
  tokenUrl: process.env.TOKEN_URL || '',
  x: process.env.LINK_X || '',
  telegram: process.env.LINK_TELEGRAM || '',
}));
app.get('/api/state', (_req, res) => res.json(view()));
app.get('/api/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(': open\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

app.listen(PORT, () => {
  console.log(`[eden] no ar em http://localhost:${PORT} | ciclo de ${tickMs(world) / 1000}s`);
  // PAUSED=1 sobe o site sem ligar o relogio: da para publicar e olhar sem
  // gastar um centavo de API ate voce querer comecar.
  const parado = process.env.PAUSED === '1' || process.env.STATIC_ONLY === '1';
  console.log(parado ? '[eden] o mundo esta PARADO (PAUSED=1). Ninguem age ate voce desligar isso.'
                     : '[eden] o mundo esta correndo.');
  if (!parado) setTimeout(loop, 1500);
});
