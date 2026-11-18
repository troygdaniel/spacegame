// smoke: Settings > Keys helps you get each key: what it is for, that it costs, a link to the provider's key page, the address as text, Copy, three steps (plain Node, no Chrome)
// Card space-game-key-links. For each of the three keys (Deepgram, OpenAI, Anthropic) the Keys section shows what the key is for and what stops
// working without it, that it is your own account and may cost money, a "Get a key" link that opens the provider's key page in a new tab, the
// same address written out with a Copy button (a canvas link can be blocked when the game is opened from a file), and three steps. The addresses and
// the lines are in content/text/ui.md (keys.<id>.use, .cost, .url and keys.steps), so a provider moving its page is a text edit and a reseal.
// What is checked here: every row has its text and a well-formed https address; the link opens with noopener and carries nothing of the player;
// a key is never put in a link, a copied address or a message; an address a text file changed to something that is not a plain https address is
// shown as text only and never opened; the layout fits the panel. Nothing is fetched: no page is opened by this test.
// Run: node tests/keylinks.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const ui = readFileSync(new URL('../content/text/ui.md', import.meta.url), 'utf8');

const IDS = ['deepgram', 'openai', 'anthropic'];
const HOSTS = { deepgram: 'console.deepgram.com', openai: 'platform.openai.com', anthropic: 'platform.claude.com' }; // anthropic: console.anthropic.com redirects here (checked 17 Nov 2026)
check('the three key rows are Deepgram, OpenAI and Anthropic', J(`SETTINGS.keyRows.map(r => r.id)`).join() === IDS.join());

// ---- every row has its words and a good address ----
const info = Object.fromEntries(IDS.map(id => [id, J(`settingsKeyInfo('${id}')`)]));
for (const id of IDS) {
  const i = info[id];
  check(`${id}: what it is for and what stops without it, in one line`, typeof i.use === 'string' && i.use.length >= 30 && i.use.length <= 108 && !/\n/.test(i.use), i.use);
  check(`${id}: that it is your own account and may cost money, naming the provider, in one line`, typeof i.cost === 'string' && /own/i.test(i.cost) && /charge|cost|pay/i.test(i.cost) && i.cost.length <= 90 && i.cost.toLowerCase().includes(i.name.toLowerCase()), i.cost);
  check(`${id}: a well-formed https address on ${HOSTS[id]}, no sign-in details, no query`, i.urlOk === true && new URL(i.url).protocol === 'https:' && new URL(i.url).hostname === HOSTS[id] && !new URL(i.url).username && !new URL(i.url).password && !new URL(i.url).search && !new URL(i.url).hash, i.url);
}
check('the three steps: paste, Test, done, in a few words', J(`settingsKeyInfo('deepgram').steps`).length > 10 && /paste/i.test(info.deepgram.steps) && /test/i.test(info.deepgram.steps) && /done/i.test(info.deepgram.steps) && info.deepgram.steps.length <= 44, info.deepgram.steps);
check('no price in the game text: no money sign, no amount, no per-minute or per-token claim, no "free"', IDS.every(id => !/[$€£¥]|\d+\s?(usd|dollars?|cents?|eur)|per (minute|month|hour|token|character|call)|\bfree\b|\bcheap/i.test([info[id].use, info[id].cost, info[id].steps].join(' '))));

// ---- the link: a new tab, noopener, nothing about the player ----
const opened = [];
const SENT = { deepgram: 'dg_SENTINEL_0123456789abcdef', openai: 'sk' + '-SENTINEL-0123456789abcdefABCDEF', anthropic: 'sk' + '-ant-SENTINEL-0123456789abcdefABCDEF' }; // made in two pieces: tests/hygiene.mjs looks for key-shaped text in files
g.run(`VOICE.key = ${JSON.stringify(SENT.deepgram)}; CHAT.keys.openai = ${JSON.stringify(SENT.openai)}; CHAT.keys.anthropic = ${JSON.stringify(SENT.anthropic)}; G.credits = 7777; G.name = 'Troy'; var __opened = []; var __open = (...a) => { __opened.push(a); return null; };`);
for (const id of IDS) {
  const r = J(`(() => { __opened.length = 0; const res = settingsOpenKey('${id}', __open); return { res, calls: __opened.slice() }; })()`);
  const call = r.calls[0] || [];
  check(`${id}: Get a key opens its address in a new tab with noopener, once`, r.calls.length === 1 && call[0] === info[id].url && call[1] === '_blank' && /noopener/.test(call[2] || '') && /noreferrer/.test(call[2] || '') && r.res.ok === true, JSON.stringify(r));
  check(`${id}: nothing of the player is in the link: no key, no credits, no name`, !call.join(' ').includes(SENT[id]) && IDS.every(o => !call.join(' ').includes(SENT[o])) && !/7777|Troy/.test(call.join(' ')));
}
check('no key is in any of the lines, the addresses or what the row says (with all three keys saved)', IDS.every(id => { const s = JSON.stringify(J(`settingsKeyInfo('${id}')`)); return IDS.every(o => !s.includes(SENT[o])); }));
check('a saved key shows as set and never in full: the last four and nothing more', IDS.every(id => { const m = J(`settingsMask(${JSON.stringify(SENT[id])})`); return m.startsWith('**** ') && m.length === 9 && !m.includes(SENT[id]) && SENT[id].endsWith(m.slice(5)); }));

// ---- Copy ----
const copyRun = await g.run(`(async () => { const wrote = [], nav = { clipboard: { writeText: async t => { wrote.push(t); } } }; const r = [];
  for (const id of ['deepgram', 'openai', 'anthropic']) r.push(await settingsCopyKey(id, nav));
  const none = await settingsCopyKey('deepgram', {}), refused = await settingsCopyKey('deepgram', { clipboard: { writeText: async () => { throw new Error('denied'); } } });
  return JSON.stringify({ wrote, r, none, refused }); })()`);
const cp = JSON.parse(copyRun);
check('Copy puts the address, and only the address, on the clipboard', cp.wrote.join() === IDS.map(id => info[id].url).join() && cp.r.every(x => x.ok === true), JSON.stringify(cp));
check('with no clipboard, or a refused one, Copy says so and does not throw: the address stays on screen to copy by hand', cp.none.ok === false && cp.refused.ok === false && typeof cp.none.say === 'string' && cp.none.say.length > 5 && !cp.none.say.includes(SENT.deepgram), JSON.stringify([cp.none, cp.refused]));

// ---- an address that is not a plain https address is never opened ----
const bad = ['http://console.deepgram.com/', 'javascript:alert(1)', 'data:text/html,hi', 'https://user:pw' + '@console.deepgram.com/', 'https://console.deepgram.com/ x', 'https://localhost/', 'https:///nohost', 'ftp://console.deepgram.com/', '//console.deepgram.com/', '', 'https://' + 'a'.repeat(300) + '.com/', 'https://console.deepgram.com/?key=abc', 'https://console.deepgram.com/#frag', 'HTTPS://CONSOLE.DEEPGRAM.COM\\evil.com'];
check('an address that is not a plain https address with a real host is refused: ' + bad.length + ' of them', bad.every(u => J(`settingsKeyUrl(${JSON.stringify(u)})`) === ''), bad.filter(u => J(`settingsKeyUrl(${JSON.stringify(u)})`) !== '').join(' | '));
check('the three real addresses are accepted as they are', IDS.every(id => J(`settingsKeyUrl(${JSON.stringify(info[id].url)})`) === info[id].url));
check('a text file (a pack) that points a link at something else: the link is not offered, the text is, and nothing is opened', J(`(() => { const k = ctTextKeys(); const was = k['keys.openai.url'].get(); k['keys.openai.url'].set('javascript:alert(1)'); __opened.length = 0;
  const i = settingsKeyInfo('openai'), r = settingsOpenKey('openai', __open); k['keys.openai.url'].set(was); return [i.urlOk, r.ok, __opened.length, i.url]; })()`).join() === 'false,false,0,javascript:alert(1)');
check('the same with the address blank (a text file that left it out)', J(`(() => { const k = ctTextKeys(); const was = k['keys.openai.url'].get(); k['keys.openai.url'].set(''); __opened.length = 0; const i = settingsKeyInfo('openai'), r = settingsOpenKey('openai', __open); k['keys.openai.url'].set(was); return [i.urlOk, r.ok, __opened.length]; })()`).join() === 'false,false,0');

// ---- the words are in content/text/ui.md, and the game reads them ----
const row = k => (ui.split('\n').find(l => l.startsWith('| ' + k + ' |')) || '').replace(/^\| [^|]+ \| /, '').replace(/ \|$/, '');
check('content/text/ui.md has a line for every key: use, cost and address for each of the three, and the steps', IDS.every(id => ['use', 'cost', 'url'].every(f => row('keys.' + id + '.' + f).length > 5)) && row('keys.steps').length > 10);
check('and the game reads exactly what it says: the words and the addresses of the Keys section are the file\'s', IDS.every(id => info[id].use === row('keys.' + id + '.use') && info[id].cost === row('keys.' + id + '.cost') && info[id].url === row('keys.' + id + '.url')) && info.deepgram.steps === row('keys.steps'));
check('the code has no address of its own: no provider page address in src/settings.js', !/console\.deepgram|platform\.openai|console\.anthropic|platform\.claude/.test(readFileSync(new URL('../src/settings.js', import.meta.url), 'utf8')));

// ---- the layout: three blocks and the chat rows fit the panel ----
const L = J(`settingsKeysLayout()`);
check('the three key blocks and the chat rows end inside the panel body, above its footer', L.bottom <= L.bodyH && L.rows.length === 3 && L.rows.every((r, i) => !i || r.y > L.rows[i - 1].y + 80), JSON.stringify(L).slice(0, 300));
check('each block has its lines in order: the field, what it is for, the cost, the link and the address', L.rows.every(r => r.use > r.y && r.cost > r.use && r.link > r.cost), JSON.stringify(L.rows[0]));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `KEYLINKS FAIL (${failed} of ${n})` : `KEYLINKS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
