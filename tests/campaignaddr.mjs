// smoke: start the Campaign at any level by the address: ?campaign=2 (plain Node, no Chrome, nothing waits)
// Card space-game-campaign-tune (src/campaignaddr.js). The parser is pure: an address string in, a plain answer out. It reads the "campaign" part of the address and says
// null (no such part: the game starts as it always does), { level } (a whole number from 1 to the number of levels, or a bare "?campaign" for level 1), or { bad, say } (anything
// else, with a plain line for the screen). It never throws and never lets a typed address put markup or a long string on the screen.
// Run: node tests/campaignaddr.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const A = (s, levels) => JSON.parse(g.run(`JSON.stringify(campaignAddr(${JSON.stringify(s)}${levels === undefined ? '' : ', ' + JSON.stringify(levels)}) ?? null)`));
const P = (levels, search) => JSON.parse(g.run(`JSON.stringify(campaignAddrPage(${levels}${search === undefined ? '' : ', ' + JSON.stringify(search)}) ?? null)`));
const lv = (s, levels) => { const r = A(s, levels); return r && r.level; };

// ---- no campaign in the address: the game starts as it always does ----
check('an empty address, a bare "?" and other parts are not the Campaign', ['', '?', '#', '?x=1', '?mods=sol&debug=1', '?campaigns=2', '?mycampaign=2', '?campaign2=2', '?level=2'].every(s => A(s) === null), JSON.stringify(['', '?', '?x=1', '?campaigns=2'].map(A)));
check('an address that is not a string is not the Campaign (and does not throw)', [undefined, null, 5, {}, []].every(s => g.run(`campaignAddr(${JSON.stringify(s)}) === null`) === true || g.ev(`campaignAddr(${s === undefined ? 'undefined' : JSON.stringify(s)})`) === null));

// ---- a level ----
check('?campaign=1, 2 and 3 are those levels', lv('?campaign=1') === 1 && lv('?campaign=2') === 2 && lv('?campaign=3') === 3, JSON.stringify([1, 2, 3].map(i => A('?campaign=' + i))));
check('a bare "?campaign", "?campaign=" and "?campaign=&x=1" start at level 1', lv('?campaign') === 1 && lv('?campaign=') === 1 && lv('?campaign=&x=1') === 1 && lv('?x=1&campaign') === 1);
check('the part may be anywhere among others, and a leading # is read like a ?', lv('?x=1&campaign=3&y=2') === 3 && lv('?a=b&campaign=2') === 2 && lv('#campaign=2') === 2 && lv('campaign=2') === 2);
check('the name is not case sensitive, a percent-escaped digit and a plus-padded number are read, a leading zero is allowed', lv('?Campaign=2') === 2 && lv('?CAMPAIGN=3') === 3 && lv('?campaign=%32') === 2 && lv('?campaign=+2+') === 2 && lv('?campaign=02') === 2);
check('the first "campaign" counts; the others are not read', lv('?campaign=2&campaign=3') === 2 && lv('?campaign=2&campaign=banana') === 2);

// ---- something else: a plain line, never a crash ----
const bad = ['0', '4', '7', '-1', '2.5', 'two', '1e1', '0002', '1 2', 'x'];
check('a level that is not a whole number from 1 to 3 is bad, with the text that was given and a plain line saying what is possible', bad.every(b => { const r = A('?campaign=' + encodeURIComponent(b)); return r && r.level === undefined && r.bad === b.replace(/[^\w .:+-]/g, '?') && /^The address says campaign=/.test(r.say) && /levels 1 to 3/.test(r.say) && /\?campaign=1 to \?campaign=3/.test(r.say); }), JSON.stringify(bad.map(b => A('?campaign=' + encodeURIComponent(b)))));
check('a malformed percent escape is bad and does not throw', (() => { const r = A('?campaign=%E0%A4%A'); return r && r.level === undefined && typeof r.say === 'string'; })(), JSON.stringify(A('?campaign=%E0%A4%A')));
{
  const long = A('?campaign=' + 'x'.repeat(500)), tag = A('?campaign=' + encodeURIComponent('<script>alert(1)</script>')), q = A('?campaign=' + encodeURIComponent('"><img src=x>'));
  check('what was typed is cut to 12 characters and cleaned to letters, digits and a few marks, so the line for the screen has no markup in it', long.bad.length === 12 && !/[<>"'`&;(){}\/\\=]/.test(tag.bad + tag.say.replace(/^The address says campaign=/, '').replace(/\. The Campaign.*$/, '')) && !/[<>]/.test(q.bad + q.say) && tag.say.length < 140, JSON.stringify([long.bad, tag, q]));
}

// ---- the number of levels is the caller's (the Campaign's own table), 3 until it says ----
check('with 5 levels, ?campaign=5 is level 5 and ?campaign=6 is bad, and the line says 1 to 5', lv('?campaign=5', 5) === 5 && A('?campaign=6', 5).bad === '6' && /levels 1 to 5/.test(A('?campaign=6', 5).say));
check('with one level, level 1 is fine, level 2 is bad, and the line says "one level"', lv('?campaign=1', 1) === 1 && A('?campaign=2', 1).bad === '2' && /one level/.test(A('?campaign=2', 1).say) && !/levels 1 to/.test(A('?campaign=2', 1).say));
check('a number of levels that is not a whole number of 1 or more is taken as 3', lv('?campaign=3', 0) === 3 && A('?campaign=4', 0).bad === '4' && lv('?campaign=3', 'x') === 3 && lv('?campaign=3', 2.5) === 3 && A('?campaign=4', -1).bad === '4');

// ---- the page ----
check('with no page (Node) there is no address to read: the answer is null, and a given search string is read in its place', P(3) === null && P(3, '?campaign=2').level === 2 && P(3, '?x=1') === null && P(3, '?campaign=9').bad === '9');
{
  const src = readFileSync(ROOT + '/src/campaignaddr.js', 'utf8').replace(/\/\/.*$/gm, '');
  const page = src.slice(src.indexOf('function campaignAddrPage')), rest = src.slice(0, src.indexOf('function campaignAddrPage'));
  check('the parser reaches nothing of the page or of Phaser; the only name from the page is location, and it is read in campaignAddrPage, behind a typeof', !/\b(document|window|Phaser|localStorage|sessionStorage|fetch|navigator|location)\b/.test(rest) && /typeof location !== 'undefined'/.test(page) && !/\b(document|window|Phaser|localStorage|sessionStorage|fetch|navigator)\b/.test(page));
  const html = readFileSync(ROOT + '/index.html', 'utf8');
  check('index.html loads it once, before the play log (which loads near last)', (html.match(/src\/campaignaddr\.js/g) || []).length === 1 && html.indexOf('src/campaignaddr.js') < html.indexOf('src/playlog.js'));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMPAIGN ADDRESS FAIL (${failed} of ${n})` : `CAMPAIGN ADDRESS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
