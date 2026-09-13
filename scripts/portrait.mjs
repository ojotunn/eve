// (Re)desenha o retrato de alguem no padrao unico de src/portrait.js.
//   node scripts/portrait.mjs Eve f --replace      redesenha mantendo o rosto
//   node scripts/portrait.mjs Nell f              desenha quem ainda nao tem
import 'dotenv/config';
import { makePortrait, portraitPath, hasPortrait } from '../src/portrait.js';

const [name, sex = 'f', ...flags] = process.argv.slice(2);
if (!name) { console.log('uso: node scripts/portrait.mjs <Nome> <f|m> [--replace]'); process.exit(1); }

const replace = flags.includes('--replace');
const sameFace = replace && hasPortrait(name);

makePortrait({ name, sex }, null, {
  replace,
  sameFace,
  refs: sameFace ? [portraitPath(name)] : [],
});
console.log(`desenhando ${name}${sameFace ? ' (mesmo rosto, enquadramento novo)' : ''}...`);
