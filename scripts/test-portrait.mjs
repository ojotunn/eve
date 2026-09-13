import 'dotenv/config';
import { makePortrait, hasPortrait } from '../src/portrait.js';
const child = { name: 'Ilan', sex: 'm' };
makePortrait(child, [{ name: 'Eve' }, { name: 'Adam' }]);
const t0 = Date.now();
const wait = setInterval(() => {
  if (hasPortrait('Ilan')) { console.log('retrato do filho pronto em', Math.round((Date.now() - t0) / 1000) + 's'); clearInterval(wait); }
  else if (Date.now() - t0 > 180000) { console.log('nao veio em 3 min'); clearInterval(wait); }
}, 3000);
