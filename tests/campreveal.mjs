// smoke: the Campaign's last level is an outpost, not their home, and the player learns it only AFTER the win (plain Node, no Chrome)
// Card space-game-campaign-outpost-reveal (Troy: level 3 turns out not to be their home world but an outpost, which is why the war is not over; we find out only after defeating the game).
// So nothing the player sees while playing changes: the place stays "Alien home world" on the map, the nav list, the briefing and the level text. The won card of level 3 says it is over; the
// ending screen turns ("This is not their home. It is an outpost." "The war is not over." and the star the data points to, a distant star drawn on it); a saved flag, revealed, is set only when
// the ending shows, and after it a replay of level 3 may call the place the outpost. Checks:
//   A  before the flag no string of the Campaign (keys, level data, the map, the nav, the story) says "outpost": a test that fails the moment someone names it early
//   B  the won card of level 3 is the victory ("Their defences are down." "The war is won."), the ending is the reveal and is spoken line by line; levels 1 and 2 reveal nothing
//   C  the flag: false at the start, true (saved) only when the ending shows, kept by a new campaign
//   D  after the flag the true name is used: the level, the place, the briefing; "Last battle" is not said again; before it the old names
//   E  the data: the star is a field of the level's data; the lines are short (12 words) and in a file of their own; ui.md did not grow
//   F  the title's Campaign panel and the ending's hint drop the finality ("Earth is safe", "first campaign is won") and the panel changes after the flag
//   G  the docs: a SPOILER section in docs/CAMPAIGN.md, and nothing before it says outpost
// Run: node tests/campreveal.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.message); } };
const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
// a stand-in Campaign scene, as tests/campaign.mjs makes one
g.run(`
  window.__went = []; window.__said = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {}; shipcompSay = t => { __said.push(t); return true; };
  window.__fake = (level, d) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { shield: document, ore: document, hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    window.__cards = []; f.showCard = function (title, lines, hint, tall) { __cards.push({ title, lines: lines.slice(), hint }); this.panel = true; this.card = []; };
    f.init(Object.assign({ level }, d || {})); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.showIntro(); window.__intro = { cards: __cards.slice(), said: __said.slice() }; __went.length = 0; __said.length = 0; __cards.length = 0; return f; };
`);
const cardsText = () => J('__cards.map(c => [c.title].concat(c.lines, [c.hint]).join(" | "))');

sec('A', () => {
  g.run("localStorage.removeItem('longhaul.campaign'); campReveal && campReveal(false)");
  const keys = J("Object.keys(UI_TEXT).filter(k => /^camp\\./.test(k) && !/^camp\\.end\\./.test(k) && !/\\.r\\.\\d/.test(k))");
  const bad = keys.filter(k => /outpost/i.test(J(`UI_TEXT[${JSON.stringify(k)}]`)));
  check(`A  no Campaign string (${keys.length} keys) says "outpost" before the flag`, keys.length > 150 && bad.length === 0, bad.join(','));
  const lv = J("CAMP.levels[3].name + '|' + Object.keys(campPlaces(3)).map(k => campPlaces(3)[k].name).join('|') + '|' + campStory(3, 'before').join('|') + '|' + campStory(3, 'after').join('|')");
  check('A  level 3\'s name, its places, its briefing and its won card say nothing of an outpost, and the place is still the alien home world', !/outpost/i.test(lv) && /Alien home world/.test(lv) && /The home world/.test(lv), lv);
  const nav = J("(() => { const C = campNew(3, [], { seed: 1 }); const rows = typeof campNavRows === 'function' ? campNavRows(C) : []; const marks = typeof campMapMarks === 'function' ? campMapMarks(C, false) : []; return rows.map(r => r.name).concat(marks.map(m => m.name || '')).join('|'); })()");
  check('A  the nav list and the map of level 3 say "home world" and never "outpost"', /home world/i.test(nav) && !/outpost/i.test(nav), nav);
  const story = [1, 2, 3].map(l => ['before', 'after'].map(w => J(`campStory(${l}, '${w}')`).join('|')).join('|')).join('|');
  check('A  the stories of the three levels before the flag: none says outpost', !/outpost/i.test(story));
  const src = ['src/campaign.js', 'src/campaignscene.js', 'src/campnav.js', 'src/campmap.js', 'src/campmapdraw.js', 'src/camphelp.js', 'src/campnudge.js', 'src/campchatter.js'].filter(f => /outpost/i.test(read(f).replace(/\/\/[^\n]*/g, '')));
  check('A  the Campaign scripts name the outpost only in the reveal data and the ending (campaign.js and campaignscene.js), nowhere else', src.every(f => f === 'src/campaign.js' || f === 'src/campaignscene.js'), src.join(','));
  const chat = J("Object.keys(UI_TEXT).filter(k => /^camp\\.chat\\./.test(k)).map(k => UI_TEXT[k]).join('|')");
  check('A  the radio chatter says neither "home world", "last battle" nor "outpost"', !/outpost|last battle|home world/i.test(chat));
});

sec('B', () => {
  g.run("localStorage.removeItem('longhaul.campaign'); campReveal(false); window.F1 = __fake(1, {}); campEnd(F1.camp, 'won', 'mother'); F1.update(0, 33);");
  const c1 = cardsText().join(' ');
  check('B  the won card of level 1 reveals nothing and does not mention an outpost', !/outpost|not their home/i.test(c1), c1);
  g.run("window.F = __fake(3, {}); F.onKey({ code: 'Enter' }); campEnd(F.camp, 'won', 'towers'); F.update(0, 33);");
  const won = J('__cards[__cards.length - 1]');
  check('B  the won card of level 3 is the victory: "Their defences are down." "The war is won."', won.lines.includes('Their defences are down.') && won.lines.includes('The war is won.') && !/outpost|not over|Earth is safe|first step/i.test(won.lines.join(' ')), JSON.stringify(won));
  check('B  it is spoken line by line like the other cards', J('__said').includes('Their defences are down.') && J('__said').includes('The war is won.'));
  g.run("__said.length = 0; __cards.length = 0; F.onKey({ code: 'Enter' });");
  const end = J('__cards[__cards.length - 1]'), spoken = J('__said');
  check('B  Enter on the won card of level 3 is the ending (mode end), and it is the reveal: "This is not their home. It is an outpost." "The war is not over."', J('F.mode') === 'end' && /This is not their home\. It is an outpost\./.test(end.lines.join(' ')) && /The war is not over\./.test(end.lines.join(' ')), JSON.stringify(end));
  check('B  the ending names the star the data points to, from the level\'s data field', end.lines.some(l => l.includes(J('CAMP.levels[3].reveal.star'))) && J('CAMP.levels[3].reveal.star').length > 2);
  check('B  the reveal is spoken, line by line', end.lines.length >= 3 && end.lines.every(l => spoken.includes(l)), JSON.stringify(spoken));
  check('B  it comes only at the end of level 3: the ending of level 3 is the only card that says "outpost"', J('__cards.filter(c => /outpost/i.test(c.lines.join(" "))).length') === 1);
});

sec('C', () => {
  g.run("localStorage.removeItem('longhaul.campaign'); campReveal(false)");
  check('C  a fresh campaign has not been revealed', J('campProgressLoad().revealed') === false && J('campProgressNew().revealed') === false);
  g.run("window.F = __fake(3, {}); F.onKey({ code: 'Enter' }); campEnd(F.camp, 'won', 'towers'); F.update(0, 33);");
  check('C  the flag is not set by the won card, only by the ending', J('campProgressLoad().revealed') === false);
  g.run("F.onKey({ code: 'Enter' });");
  const saved = JSON.parse(store.get('longhaul.campaign') || '{}');
  check('C  when the ending shows the flag is set and saved (revealed: true), and the campaign starts fresh (level 1, no techs)', saved.revealed === true && saved.level === 1 && (saved.techs || []).length === 0, JSON.stringify(saved));
  check('C  it is read back, and a new campaign keeps it (the reveal is not forgotten)', J('campProgressLoad().revealed') === true);
  g.run("campProgressSave({ level: 2, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 } });");
  check('C  saving progress by an older caller does not drop the flag', J('campProgressLoad().revealed') === true);
  store.set('longhaul.campaign', JSON.stringify({ level: 1, revealed: 'yes' }));
  check('C  a flag that is not true or false is ignored (false)', J('campProgressLoad().revealed') === false);
});

sec('D', () => {
  g.run("localStorage.removeItem('longhaul.campaign'); campReveal(false)");
  const before = J("CAMP.levels[3].name + '|' + campPlaces(3).home.name + '|' + campStory(3, 'before').join('|')");
  check('D  before the flag: "The home world", "Alien home world", "Last battle."', /The home world/.test(before) && /Alien home world/.test(before) && /Last battle/.test(before), before);
  g.run("campReveal(true)");
  const after = J("CAMP.levels[3].name + '|' + campPlaces(3).home.name + '|' + campStory(3, 'before', true).join('|')");
  check('D  after the flag: the level and the place are the outpost, and the briefing is the outpost\'s (no "last battle", no "home world")', /outpost/i.test(after) && !/last battle|home world/i.test(after), after);
  g.run("campReveal(false); campProgressSave({ level: 3, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, revealed: true }); window.F3 = __fake(3, {});");
  const intro = J('__intro');
  check('D  a replay of level 3 after the flag (a new page: the flag is in the save) opens on the outpost: the intro card names it and does not say "last battle"', intro.cards.length === 1 && /outpost/i.test(intro.cards[0].title + ' ' + intro.cards[0].lines.join(' ')) && !/last battle|home world/i.test(intro.cards[0].lines.join(' ')), JSON.stringify(intro.cards));
  g.run("campReveal(false); localStorage.removeItem('longhaul.campaign'); window.F3 = __fake(3, {});");
  const intro0 = J('__intro');
  check('D  and a replay before the flag opens on the home world and the last battle, as ever', /home world/i.test(intro0.cards[0].lines.join(' ')) && !/outpost/i.test(intro0.cards[0].title + intro0.cards[0].lines.join(' ')) && /Last battle/.test(intro0.cards[0].lines.join(' ')), JSON.stringify(intro0.cards));
  g.run("campReveal(false)");
  check('D  campReveal(false) puts the old names back (a new page, a test)', /home world/i.test(J('campPlaces(3).home.name')) && J('CAMP.levels[3].name') === 'The home world');
  check('D  levels 1 and 2 are the same before and after the flag', (g.run('campReveal(true)'), J("[1, 2].map(l => CAMP.levels[l].name).join('|')")) === (g.run('campReveal(false)'), J("[1, 2].map(l => CAMP.levels[l].name).join('|')")));
});

sec('E', () => {
  const R = J('CAMP.levels[3].reveal');
  check('E  the reveal is data of level 3: the star, the level\'s true name and the place\'s', R && typeof R.star === 'string' && /outpost/i.test(R.name) && /outpost/i.test(R.place), JSON.stringify(R));
  const file = read('content/text/campaign-reveal.md');
  const rows = file.split('\n').map(l => /^\|\s*([\w.]+)\s*\|\s*(.*?)\s*\|\s*$/.exec(l)).filter(m => m && m[1] !== 'key' && !/^-+$/.test(m[1])).map(m => [m[1], m[2]]);
  check('E  the lines are in content/text/campaign-reveal.md, a file of their own, and equal the code table', rows.length >= 6 && rows.every(([k, t]) => J(`UI_TEXT[${JSON.stringify(k)}]`) === t), rows.length);
  check('E  every line is 12 words or fewer (the space-game-voice-curt rule)', rows.filter(([, t]) => words(t) > 12).length === 0, rows.filter(([, t]) => words(t) > 12).map(r => r[0]).join(','));
  const ui = read('content/text/ui.md').split('\n').filter(l => /^\| [\w.-]+ \|/.test(l)).length;
  check('E  ui.md did not grow (it is at its row limit)', ui <= 199, ui);
});

sec('F', () => {
  check('F  the ending\'s hint is not the old finality ("THE FIRST CAMPAIGN IS WON")', !/FIRST CAMPAIGN IS WON/.test(J("UI_TEXT['camp.ui.end']")) && /Enter/.test(J("UI_TEXT['camp.ui.end']")), J("UI_TEXT['camp.ui.end']"));
  check('F  nothing of the story says "Earth is safe"', !Object.keys(J('UI_TEXT')).some(k => /camp\./.test(k) && /Earth is safe/i.test(J(`UI_TEXT[${JSON.stringify(k)}]`))));
  const t = read('src/title.js');
  check('F  the title\'s Campaign panel has its own words after the flag (title.camp.sub.r) and the old ones before', J("typeof UI_TEXT['title.camp.sub.r']") === 'string' && /\.r'|sub \+ '\.r'|revealed/.test(t) && !/outpost/i.test(J("UI_TEXT['title.camp.sub']")));
  check('F  the panel after the flag does not say "three levels, then home"; it says the war goes on', /war/i.test(J("UI_TEXT['title.camp.sub.r']")), J("UI_TEXT['title.camp.sub.r']"));
});

sec('G', () => {
  const d = read('docs/CAMPAIGN.md'), i = d.search(/^#+ .*SPOILER/m);
  check('G  docs/CAMPAIGN.md has a SPOILER section', i > 0, i);
  check('G  it holds the reveal (outpost, the flag, the star) and nothing before it says "outpost" or "not their home"', i > 0 && /outpost/i.test(d.slice(i)) && /revealed/.test(d.slice(i)) && !/outpost|not their home/i.test(d.slice(0, i)));
  check('G  the story list of the doc (after the level 3 lines) is the victory as the player first reads it', /The war is won\./.test(d) && !/Earth is safe/.test(d));
  check('G  no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
});
console.log(failed ? `CAMP REVEAL FAIL (${failed} of ${n})` : `CAMP REVEAL PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
