// O rosto de quem vive aqui. UM padrao so, aqui neste arquivo, para todo mundo:
// fundadores e cada filho que nascer. Quem nasce usa as fotos dos DOIS pais como
// referencia e sai parecido com eles. Roda solto: se falhar, o mundo segue.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'gerar-gemini.py');

// Os rostos moram no VOLUME, nao dentro do conteiner: senao todo deploy apagaria
// a cara de todo mundo que nasceu. Adam e Eve vem no repositorio e sao copiados
// para la na primeira subida.
const SEED = path.join(ROOT, 'public', 'portraits');
export const DIR = path.join(process.env.DATA_DIR || path.join(ROOT, 'data'), 'portraits');

export function ensurePortraitDir() {
  fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(SEED) || SEED === DIR) return DIR;
  for (const f of fs.readdirSync(SEED)) {
    if (!f.endsWith('.png')) continue;
    const alvo = path.join(DIR, f);
    if (!fs.existsSync(alvo)) fs.copyFileSync(path.join(SEED, f), alvo);
  }
  return DIR;
}

// O PADRAO. Mexer aqui muda a galeria inteira daqui para a frente.
// Enquadramento antes de estilo: foi o enquadramento que saiu errado na Eve.
const FRAMING = 'Head-and-shoulders portrait, centred, facing forward, calm neutral expression. ' +
  'The whole head and both shoulders are inside the frame, with clear empty paper above the head ' +
  'and below the shoulders — nothing is cropped by the edge of the picture. The head takes up ' +
  'about one third of the height. Plain undyed linen clothing, no jewellery.';
const STYLE = 'Fine ink stipple engraving, black ink on plain off-white paper, high contrast, ' +
  'flat empty background with no scenery, no text, no border, no frame.';

export const portraitPath = (name) => path.join(DIR, name.toLowerCase() + '.png');
export const hasPortrait = (name) => fs.existsSync(portraitPath(name));

// Todo retrato passa por aqui antes de aparecer: o gerador entrega o busto
// terminando numa linha reta, e dentro do circulo isso vira foto quadrada.
let aoFicarPronto = null;
export const onPortraitReady = (fn) => { aoFicarPronto = fn; };

function normalize(file, name) {
  const fix = spawn('python', [path.join(ROOT, 'scripts', 'normalizar-retrato.py'), file], { cwd: ROOT, stdio: 'ignore' });
  fix.on('close', () => {
    console.log(`[portrait] ${name} pronto`);
    if (aoFicarPronto) aoFicarPronto(name);   // a arvore troca a inicial pelo rosto na hora
  });
  fix.on('error', (e) => console.error('[portrait] normalizar', name, e.message));
}

export function portraitPrompt(sex, kin) {
  const who = sex === 'f' ? 'young woman' : 'young man';
  return `Portrait of a ${who}. ${FRAMING} ${kin || ''}${STYLE}`;
}

// person: { name, sex }. refs: caminhos de PNG que guiam o desenho.
export function makePortrait(person, parents, opts = {}) {
  if (process.env.EDEN_NO_PORTRAIT === '1') return;
  if (!opts.replace && hasPortrait(person.name)) return;
  fs.mkdirSync(DIR, { recursive: true });

  const refs = [];
  let kin = '';
  const fromParents = (parents || []).map(p => portraitPath(p.name)).filter(f => fs.existsSync(f));
  if (fromParents.length === 2) {
    refs.push(...fromParents);
    kin = 'This person is the child of the two people in the reference images and clearly resembles ' +
          'both of them. Keep exactly the same drawing technique and the same framing as the references. ';
  }
  for (const extra of opts.refs || []) if (fs.existsSync(extra)) refs.push(extra);
  if (opts.sameFace) kin = 'This is the same person as in the reference image — same face, same hair. ' +
                           'Redraw them with the framing described above. ';

  const out = portraitPath(person.name);
  const tmp = opts.replace ? out + '.new.png' : out;
  const child = spawn('python', [SCRIPT, tmp, portraitPrompt(person.sex, kin), ...refs], {
    cwd: ROOT,
    env: { ...process.env, GEMINI_RAZAO: '1:1', GEMINI_TAMANHO: '2K' },
    stdio: 'ignore',
  });
  child.on('error', (e) => console.error('[portrait]', person.name, e.message));
  child.on('close', (code) => {
    if (code !== 0) {
      const tentativa = (opts.tentativa || 1);
      console.log(`[portrait] ${person.name} falhou (${code})` + (tentativa < 3 ? ', tentando de novo' : ', desisti'));
      if (tentativa < 3) {
        setTimeout(() => makePortrait(person, parents, { ...opts, tentativa: tentativa + 1 }), 30000 * tentativa);
      }
      return;
    }
    if (tmp !== out && fs.existsSync(tmp)) fs.renameSync(tmp, out);
    normalize(out, person.name);
  });
  return child;
}

// Ninguem pode ficar sem rosto. Roda na subida e a cada ciclo: quem estiver sem
// retrato entra na fila, um de cada vez para nao atropelar a API de imagem.
let desenhando = false;
export function backfillPortraits(world) {
  if (desenhando || process.env.EDEN_NO_PORTRAIT === '1') return;
  const gente = Object.values(world.people);
  const semRosto = gente.find(p => !hasPortrait(p.name));
  if (!semRosto) return;
  const pais = (semRosto.parents || []).map(id => world.people[id]).filter(Boolean);
  desenhando = true;
  const proc = makePortrait(semRosto, pais.length === 2 ? pais : null);
  if (!proc) { desenhando = false; return; }
  proc.on('close', () => { setTimeout(() => { desenhando = false; }, 5000); });
  proc.on('error', () => { desenhando = false; });
}
