// smoke: Settings in the new look of the screens, all seven tabs: what each shows for a state, every chip the key table's, the mock's words near the mock's counts, what a click does, the real inputs of Keys, a key never shown, Reset campaign (plain Node, no Chrome)
// Card space-game-screens-e-keys-settings (landing E; src/scrsettings.js, src/settings.js, content/text/scrsettings.md and scrctl.md). The mock is docs/screens-mock.html (Settings, Sound; Keys, Listen, Controls, Flight, Content, Reset from the second round).
//   A. the tabs: Sound, Keys, Listen, Controls, Flight, Content and Reset each show their controls for a state, in the mock's words
//   B. the chips: the foot's three, the Listen key, the Controls caps are the key table's
//   C. the word budget: each tab shows about what the mock shows (src/screens.js SCR_BUDGET)
//   D. what a click does: the scene's own methods, so the new look and the old one cannot differ
//   E. the page: drawn on the host, the model's words and nothing more, drawn again only when the model moved; the real inputs of Keys over their placeholders; a stored key is never drawn
//   F. Reset campaign: two presses, the campaign back to its first mission, the Long Haul save and the keys untouched
//   G. behind the switch: with it off Settings is as it was; with it on and no page to draw on, too
//   H. the words: every key is in the table and the file, every row of the key table has its short words
// Run: node tests/scrsettings.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
import { SCR_DOM } from './scrdomstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame({ screens: 'table' });
const J = e => { const r = g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`); if (typeof r !== 'string') throw new Error('J: no answer for ' + e + (g.errors.length ? ' (' + g.errors.join(' | ') + ')' : '')); return JSON.parse(r); };
const FAKE = 'TEST-KEY-NOT-REAL-ABCDEFGHIJKL'; // plainly fake, and no digits, so tests/hygiene.mjs does not take it for a real key
g.run(SCR_DOM);
g.run(`
  CAMP.flags.screens = true;
  window.__chain = new Proxy(function () {}, { get: (t, k) => (k === 'then' ? undefined : __chain), apply: () => __chain });
  window.__set = (section, plain) => { const s = Object.create(Settings.prototype); Object.assign(s, __canvasScene(), { section: section || 'sound', ctab: 'station', inputs: {}, slots: {}, armed: null, closing: false, born: 0, from: 'Title', scrSayMsg: null, scrHost: null, scr: plain ? null : { R: null, el: null, fields: {}, sig: '', at: 0 }, focusKey: '', sig: '',
    add: { rectangle: () => __chain }, input: { keyboard: { on() {} }, on() {} }, scene: { stop() {}, resume() {}, get() { return null; } }, time: { now: 0 } });
    s.makeInput = (type, ph) => { const e = document.createElement('input'); e.placeholder = ph; e.type = type; return e; }; return s; };
  window.__tabs = s => __find(s.scrHost.root, e => /sc-tab/.test(e._cls)); window.__pills = s => __find(s.scrHost.root, e => /(^| )sc-pill( |$)/.test(e._cls));
  window.__pill = (s, text) => __pills(s).find(e => e.children.some(c => c._text === text)); window.__M = (section, ctab) => scrSetModel({ section, ctab, inputs: {}, armed: null });
  window.__shown = M => scrSetShown(M); window.__w = M => scrSetWords(M);
  window.__reset = () => { G.muted = false; G.volume = 1; MUSIC.on = true; MUSIC.vol = 0.7; FX.vol = 1; VOICE.key = ''; VOICE.on = true; VOICE.bad = false; VOICE.spoken = 'short'; CHAT.keys.openai = ''; CHAT.keys.anthropic = ''; CHAT.on = true; CHAT.provider = ''; };
  __reset();
`);
const rowOf = (M, label) => M.body.find(r => r.label === label || r.name === label);
const itemTexts = r => r.items.map(i => i.text != null ? i.text : i.chip ? i.chip.k : '').join('|');

console.log('A. the tabs');
let M = J(`__M('sound')`);
check('seven tabs in the mock\'s order, the first picked; the foot has three chips', M.tabs.map(t => t.text).join() === 'Sound,Keys,Listen,Controls,Flight,Content,Reset' && M.tabs[0].on && M.tabs.slice(1).every(t => !t.on) && M.foot.length === 3);
check('Sound: Volume with a meter, 100% and Mute; Music 70%; Effects 100%; Chatter On, Quiet, Off; Ship voice; Voice; Replies', M.body.map(r => r.label).join() === 'Volume,Music,Effects,Chatter,Ship voice,Voice,Replies' && itemTexts(rowOf(M, 'Volume')) === '|100%|Mute' && itemTexts(rowOf(M, 'Music')) === '|70%' && itemTexts(rowOf(M, 'Chatter')) === 'On|Quiet|Off' && itemTexts(rowOf(M, 'Replies')) === 'Short|Full|Off', JSON.stringify(M.body.map(itemTexts)));
check('Chatter: Quiet is the one picked (the default); Replies: Short', rowOf(M, 'Chatter').items.map(i => !!i.on).join() === 'false,true,false' && rowOf(M, 'Replies').items.map(i => !!i.on).join() === 'true,false,false');
check('Ship voice with no key says Needs a key (amber) and where to add one; the voice is Athena, with Hear it', itemTexts(rowOf(M, 'Ship voice')) === 'Needs a key|Add one under Keys.' && rowOf(M, 'Ship voice').items[0].tone === 'amber' && itemTexts(rowOf(M, 'Voice')) === 'Athena|Hear it');
g.run(`G.muted = true; MUSIC.on = false; VOICE.key = ${JSON.stringify(FAKE)}; VOICE.on = true;`);
M = J(`__M('sound')`);
check('muted: the meter is empty, the pill says Muted (pink, picked); music off is an empty meter at 0%; with a key the ship voice is On and has no hint', rowOf(M, 'Volume').items[0].pct === 0 && itemTexts(rowOf(M, 'Volume')) === '|0%|Muted' && rowOf(M, 'Volume').items[2].tone === 'pink' && rowOf(M, 'Volume').items[2].on === true && itemTexts(rowOf(M, 'Music')) === '|0%' && itemTexts(rowOf(M, 'Ship voice')) === 'On', JSON.stringify(rowOf(M, 'Ship voice')));
g.run(`__reset();`);

M = J(`__M('keys')`);
check('Keys: the warning, three providers each with its few words, a state pill, a field, Save, Test and Get a key; Character chat On and Off; Provider Auto, OpenAI, Anthropic; Model', M.body[0].kind === 'warn' && M.body[0].text === 'Keys use your own accounts and may cost money. They stay in this browser.' && M.body.slice(1, 4).map(r => r.name + ':' + r.sub).join('|') === 'Deepgram:Ship voice and listening|OpenAI:Characters answer you|Anthropic:Characters answer you' && rowOf(M, 'Character chat') && itemTexts(rowOf(M, 'Provider')) === 'Auto|OpenAI|Anthropic' && rowOf(M, 'Model').items[0].t === 'field', JSON.stringify(M.body.map(r => r.name || r.label || r.kind)));
check('no key: the pill says No key (amber), the field says Paste a key, the button says Save', M.body.slice(1, 4).every(r => r.items[0].text === 'No key' && r.items[0].tone === 'amber' && r.items[1].text === 'Paste a key' && r.items[2].text === 'Save' && r.items[3].text === 'Test'));
g.run(`VOICE.key = ${JSON.stringify(FAKE)}; CHAT.keys.openai = ${JSON.stringify(FAKE)}; VOICE.bad = false;`);
M = J(`__M('keys')`);
const flat = JSON.stringify(M);
check('a saved key: the pill says Saved (a tick), the field says Paste to replace, the button says Clear (Clear is Save with nothing typed); nothing of the key is in the model: not the key, not its last four characters', M.body[1].items[0].text === 'Saved' && M.body[1].items[0].ok === true && M.body[1].items[1].text === 'Paste to replace' && M.body[1].items[2].text === 'Clear' && !flat.includes(FAKE) && !flat.includes('IJKL') && !/KEY-NOT/.test(flat));
g.run(`VOICE.bad = true;`);
check('a key the service refused: Rejected (pink)', J(`__M('keys')`).body[1].items[0].text === 'Rejected' && J(`__M('keys')`).body[1].items[0].tone === 'pink');
g.run(`__reset();`);
check('the strip\'s row moved here from the keys page (the mock\'s cut list): the / chip, from the key table, and "Needs a chat key."', J(`(() => { const r = __M('keys').body.find(x => x.label === 'Type an order'); return !!r && r.items[0].chip.id === 'strip' && r.items[0].chip.k === CAMP_KEYS.strip.k && scrKeysChipOk(r.items[0].chip) && r.items[1].text === 'Needs a chat key.'; })()`));
check('Get a key is there when the key\'s page is one the game can open, and the Copy button of today is gone', J(`__M('keys').body.slice(1, 4).every(r => r.items.some(i => i.text === 'Get a key')) && !__shown(__M('keys')).includes('Copy')`));

M = J(`__M('listen')`);
check('Listen: Hold to talk with the U chip and one line; Listening On and Off (On picked); Microphone: Test microphone; This session: a meter and "0 of 10 min"', M.body.map(r => r.label).join() === 'Hold to talk,Listening,Microphone,This session' && rowOf(M, 'Hold to talk').items[0].chip.k === 'U' && itemTexts(rowOf(M, 'Hold to talk')) === 'U|Hold until the ring is full, then speak.' && rowOf(M, 'Listening').items.slice(0, 2).map(i => i.text + (i.on ? '*' : '')).join() === 'On*,Off' && itemTexts(rowOf(M, 'Microphone')) === 'Test microphone' && rowOf(M, 'This session').items[1].text === '0 of 10 min', JSON.stringify(M.body));
check('with no Deepgram key it says Needs a Deepgram key beside Listening (and the long hover text is the mic button\'s title, not a paragraph)', itemTexts(rowOf(M, 'Listening')).endsWith('Needs a Deepgram key') && /Records nothing/.test(rowOf(M, 'Microphone').items[0].hint));
g.run(`LISTEN.s.used = 3 * 60000;`);
check('minutes used move the meter (3 of 10 minutes: 30%) and the words', J(`__M('listen')`).body[3].items[0].pct === 30 && J(`__M('listen')`).body[3].items[1].text === '3 of 10 min');
g.run(`LISTEN.s.used = 0;`);

M = J(`__M('controls', 'station')`);
check('Controls: eight group pills (Station, Ship bay, Flight, Surface, Campaign, Ready room, Title, Anywhere), Station picked; the rows are a few words (five at the most)', M.body[0].items.map(i => i.text).join() === 'Station,Ship bay,Flight,Surface,Campaign,Ready room,Title,Anywhere' && M.body[0].items[0].on && M.body[1].rows.length === 12 && M.body[1].rows.every(r => J(`scrWords(${JSON.stringify(r.t)})`) <= 5));
check('Controls: the Station rows are the mock\'s (Walk, Menu row, Use, Chat in the bar, Journal, Galaxy map, Ask the ship, Talk to the ship) with the table\'s caps', ['W A S D=Walk', '1-6=Menu row', 'E=Use', 'T=Chat in the bar', 'J=Journal', 'G=Galaxy map', 'I=Ask the ship', 'U=Talk to the ship'].every(x => M.body[1].rows.map(r => r.chips[0].k + '=' + r.t).includes(x)), M.body[1].rows.map(r => r.chips[0].k + '=' + r.t).join('|'));
check('Controls: a group of the pills is picked by the scene (s.ctab); the Lists group is not one (its rows are the Campaign\'s)', J(`__M('controls', 'campaign').body[0].items.find(i => i.on).text`) === 'Campaign' && J(`__M('controls', 'panels').body[0].items.find(i => i.on).text`) === 'Station' && J(`controlsGroup('campaign').rows.length`) === J(`__M('controls', 'campaign').body[1].rows.length`));

M = J(`__M('flight')`);
check('Flight: Feel with Classic and Heavy (Classic picked) and "Applies at once."; five rows with two meters each and the time of the feel in use', itemTexts(M.body[0]) === 'Classic|Heavy|Applies at once.' && M.body[0].items[0].on && M.body.length === 6 && M.body.slice(1).every(r => r.items[0].t === 'meter2' && r.items[0].ms.length === 2) && M.body.slice(1).map(r => r.label).join() === 'Turn builds,Turn eases off,Thrust ramps,To top speed,Coasts to a stop', JSON.stringify(M.body.slice(1).map(r => r.items[1].text)));
check('Flight: the feel in use has the amber meter, the other the blue; "at once" where a feel takes no time', M.body[1].items[0].ms.map(m => m.tone).join() === 'amber,blue' && M.body[1].items[1].text === 'at once');
g.run(`handlingSet('arcade' in HANDLING ? 'arcade' : Object.keys(HANDLING)[1]);`);
check('the other feel picked: the amber meter moves to it and the seconds are its own', J(`__M('flight').body[0].items.filter(i => i.on).length`) === 1 && J(`__M('flight').body[1].items[0].ms.map(m => m.tone).join()`) === 'blue,amber' && /\d s$/.test(J(`__M('flight').body[1].items[1].text`)));
g.run(`handlingSet(Object.keys(HANDLING)[0]);`);

M = J(`__M('content')`);
check('Content: New screens On or Off (kept until the default-on card), Pack: Core pack and a tick with No problems', M.body[0].label === 'New screens' && M.body[0].items[0].text === 'On' && M.body[0].items[0].act === 'screens' && M.body[0].items[0].arg === false && M.body[1].label === 'Pack' && M.body[1].items[0].text === 'Core pack' && M.body[1].items[1].t === 'ok' && M.body[1].items[1].text === 'No problems', JSON.stringify(M.body));
g.run(`CONTENT_ERRORS.push({ path: 'a.md', message: 'one' }, { path: 'b.md', message: 'two' }); CONTENT_STATE.modded = true;`);
check('with problems and a mod: Modded pack, the number of problems (amber), and the first lines of what went wrong (not more than four)', J(`__M('content').body[1].items[0].text`) === 'Modded pack' && J(`__M('content').body[1].items[1].text`) === '2 problems' && J(`__M('content').body.length`) === 4);
g.run(`CONTENT_ERRORS.length = 0; CONTENT_STATE.modded = false;`);

M = J(`__M('reset')`);
const logWord = J('playlogOn()') ? 'On' : 'Off';
check('Reset: Campaign with Reset campaign (pink) and "Missions, score and rank. Long Haul is kept."; Long Haul with Reset Long Haul; Keys with Forget all keys; Play log with On, Download and Forget', M.body.map(r => r.label).join() === 'Campaign,Long Haul,Keys,Play log' && itemTexts(M.body[0]) === 'Reset campaign|Missions, score and rank. Long Haul is kept.' && itemTexts(M.body[1]) === 'Reset Long Haul|Erases your Long Haul save. Keys and sound stay.' && itemTexts(M.body[2]) === 'Forget all keys|Removes all three from this browser.' && itemTexts(M.body[3]) === logWord + '|Download|Forget|Stays on this computer.' && M.body[0].items[0].tone === 'pink' && M.body[3].items[2].tone === 'pink');
check('an armed button says Press again and is picked; the others keep their words', J(`scrSetModel({ section: 'reset', armed: { what: 'reset' } }).body.map(r => r.items[0].text).join()`) === 'Reset campaign,Press again,Forget all keys,' + logWord && J(`scrSetModel({ section: 'reset', armed: { what: 'campaign' } }).body[0].items[0].on`) === true);

console.log('B. the chips');
check('the foot: Up Down Move, Enter Change, Esc Back, each chip the key table\'s role (the cap and the role agree)', J(`scrSetModel({ section: 'sound' }).foot.map(f => f.chips.map(c => c.k).join(' ') + ' ' + f.t).join('|')`) === 'Up Down Move|Enter Change|Esc Back' && J(`scrSetModel({ section: 'sound' }).foot.every(f => f.chips.every(c => scrChipInTable(c)))`));
check('the Listen chip is the cap of the key the game listens with, and the key table\'s row for it says the same cap', J('LISTEN.cap') === 'U' && J(`controlsGroup('any').rows.some(r => r.k.join(' ') === LISTEN.cap)`));
check('every Controls cap is the table\'s (the row\'s k, put together), for every group and every row', J(`['station', 'ship', 'flight', 'surface', 'campaign', 'readyroom', 'title', 'any'].every(id => { const g = controlsGroup(id), m = __M('controls', id).body[1].rows; return m.length === g.rows.length && m.every((r, i) => r.chips[0].k === g.rows[i].k.join(' ')); })`));

console.log('C. the word budget');
const sec = ['sound', 'keys', 'listen', 'controls', 'flight', 'content', 'reset'];
const B = J('SCR_BUDGET');
sec.forEach(s => { const id = J(`scrSetBudget('${s}')`), w = J(`__w(__M('${s}'))`), max = J(`scrWordsMax('${id}')`); check(s + ': ' + w + ' words and numbers; the mock\'s ' + B[id].mock + ', the most ' + max + ', today\'s ' + B[id].today, w <= max && w < B[id].today, w); });
check('Controls: every group is far shorter than today\'s words for it (the table\'s own long lines) and no row is over five', J(`['station', 'ship', 'flight', 'surface', 'campaign', 'readyroom', 'title', 'any'].every(id => { const g = controlsGroup(id), t = scrWords(__M('controls', id).body[1].rows.map(r => r.t)), old = g.rows.reduce((a, r) => a + scrWords(r.t), 0); return t < old; })`));
check('the status line the game says back is not a part of the tab\'s count', J(`__w(scrSetModel({ section: 'sound', scrSayMsg: { text: 'a long line of words the game says back about something', color: '#6dff9c' } })) === __w(__M('sound'))`));

console.log('D. what a click does');
g.run(`window.s1 = __set('sound'); __reset();`);
g.run(`scrSetAct(s1, 'volume', null, 0.5)`); check('a click at half of the Volume meter: 50% (the scene\'s own setVolume: tenths, and unmuting)', J('G.volume') === 0.5 && J('G.muted') === false);
g.run(`scrSetAct(s1, 'mute')`); check('Mute mutes (and the next press brings it back)', J('G.muted') === true && (() => { g.run(`scrSetAct(s1, 'mute')`); return J('G.muted') === false; })());
g.run(`scrSetAct(s1, 'music', null, 0)`); check('Music at 0 is off', J('MUSIC.on') === false);
g.run(`scrSetAct(s1, 'music', null, 0.6)`); check('Music at 60% is on again at 60%', J('MUSIC.on') === true && J('MUSIC.vol') === 0.6);
g.run(`scrSetAct(s1, 'fx', null, 0.3)`); check('Effects at 30%', J('FX.vol') === 0.3);
g.run(`scrSetAct(s1, 'chatter', 'off')`); check('Chatter Off', J('chatterMode()') === 'off');
g.run(`scrSetAct(s1, 'chatter', 'quiet'); scrSetAct(s1, 'spoken', 'full')`); check('Replies Full', J('VOICE.spoken') === 'full' && J('chatterMode()') === 'quiet');
g.run(`window.__v0 = VOICE.voice; scrSetAct(s1, 'voicestep')`); check('the Voice pill steps to the next voice', J('VOICE.voice') !== J('__v0'));
g.run(`scrSetAct(s1, 'voiceon')`); check('the Ship voice pill is the switch', J('VOICE.on') === false);
g.run(`__reset(); scrSetAct(s1, 'screens', false)`); check('New screens Off flips the switch (the scene\'s screensToggle)', J('scrOn()') === false);
g.run(`scrSetAct(s1, 'screens', true)`); check('and On puts it back', J('scrOn()') === true);
g.run(`window.s2 = __set('keys'); scrSetInputs(s2); s2.inputs.openai.value = ${JSON.stringify(FAKE)}; scrSetAct(s2, 'keysave', 'openai')`);
check('Save with a key typed saves it (the scene\'s saveKey) and the field is emptied', J('CHAT.keys.openai') === FAKE && J('s2.inputs.openai.value') === '');
g.run(`scrSetAct(s2, 'keysave', 'openai')`);
check('Save with nothing typed and a key saved is Clear: the key is removed', J('CHAT.keys.openai') === '' && /removed/.test(J('s2.scrSayMsg.text')));
g.run(`scrSetAct(s2, 'chaton', false); scrSetAct(s2, 'provider', 'openai')`); check('Character chat Off and the provider picked', J('CHAT.on') === false && J('CHAT.provider') === 'openai');
g.run(`__reset(); window.s3 = __set('listen'); scrSetAct(s3, 'listenon', false)`); check('Listening Off', J('LISTEN.on') === false);
g.run(`scrSetAct(s3, 'listenon', true); window.s4 = __set('controls'); scrSetAct(s4, 'ctab', 'flight')`); check('a Controls pill picks its group', J('s4.ctab') === 'flight' && J('s4.section') === 'controls');
g.run(`window.s5 = __set('flight'); scrSetAct(s5, 'feel', Object.keys(HANDLING)[1])`); check('a Feel pill sets the feel (handlingSet)', J('handlingNow().id') === J('Object.keys(HANDLING)[1]'));
g.run(`handlingSet(Object.keys(HANDLING)[0]); window.s6 = __set('reset'); scrSetAct(s6, 'plon')`); check('the Play log pill is the switch', J('playlogOn()') === false);
g.run(`scrSetAct(s6, 'plon')`);
check('an act the model does not know does nothing (false)', J(`scrSetAct(s6, 'nope')`) === false);

console.log('E. the page');
g.run(`window.S = __set('sound'); __reset(); CAMP.flags.screens = true; S.scr = { R: null, el: null, fields: {}, sig: '', at: 0 }; scrSetPaint(S, true);`);
const rootTexts = J('__texts(S.scrHost.root)');
check('drawn on the host: one panel with the tabs, the rows and the foot', J('S.scrHost.root.children.length') === 1 && rootTexts.includes('Sound') && rootTexts.includes('Volume') && rootTexts.includes('Needs a key') && rootTexts[rootTexts.length - 1] === 'Back', rootTexts.join('|'));
check('what is read on the page is the model\'s words and nothing more (the count of the tab)', J(`scrWords(__texts(S.scrHost.root))`) === J(`__w(__M('sound'))`), J(`scrWords(__texts(S.scrHost.root))`) + ' vs ' + J(`__w(__M('sound'))`));
check('every control is a click target (class act) and nothing else is: the tabs, the pills, the meters', J(`__find(S.scrHost.root, e => /(^| )act( |$)/.test(e._cls)).length`) === 7 + J(`__pills(S).filter(e => /act/.test(e._cls)).length`) + 3 && J(`__find(S.scrHost.root, e => e.listeners.click && !/(^| )act( |$)/.test(e._cls)).length`) === 0);
check('nothing is focusable: only div, span, i and b were made; no input, button or link, no tabindex', J('__tags.every(t => ["div", "span", "i", "b", "body", "input"].indexOf(t) >= 0)') && J('__attrs.indexOf("tabindex") < 0') && J(`__find(S.scrHost.root, e => e.tag === 'input' || e.tag === 'button' || e.tag === 'a').length`) === 0);
g.run(`window.__d0 = S.scrHost.root.children[0]; scrSetPaint(S); window.__d1 = S.scrHost.root.children[0];`);
check('painting again with the same model draws nothing: the same element (a click is not lost to a page made again under the pointer)', J('__d0 === __d1') && J('scrSetPaint(S)') === false);
g.run(`__click(__pill(S, 'Quiet')); __click(__pill(S, 'Off'));`);
check('a click on a pill is the model\'s act: Chatter Off (the last Off pill of the row clicked is the Chatter\'s: the page is made again)', J('chatterMode()') === 'off' || J('VOICE.spoken') === 'off');
g.run(`__reset(); scrSetPaint(S, true); const t = __find(S.scrHost.root, e => e.listeners.click && /sc-m/.test(e._cls))[0]; __click(t);`);
check('a click in the middle of the Volume meter sets the volume to half', J('G.volume') === 0.5, J('G.volume'));
g.run(`__reset(); scrSetPaint(S, true); __click(__tabs(S)[1]);`);
check('a click on a tab is the scene\'s show: Keys is open, its four real inputs are made, and the model follows', J('S.section') === 'keys' && J('Object.keys(S.inputs).join()') === 'deepgram,openai,anthropic,model' && J(`__texts(S.scrHost.root).includes('Deepgram')`));
g.run(`scrSetUpdate(S);`);
check('the real inputs lie over the placeholders the page drew: at the placeholder\'s place and size, shown; their placeholders are the model\'s words', J('S.inputs.deepgram.style.display') === '' && J('S.inputs.deepgram.style.left') === '40px' && J('S.inputs.deepgram.style.top') === '60px' && J('S.inputs.deepgram.style.width') === '120px' && J('S.inputs.deepgram.placeholder') === 'Paste a key' && J('S.inputs.model.placeholder.length') > 0);
g.run(`VOICE.key = ${JSON.stringify(FAKE)}; scrSetPaint(S, true);`);
const keyTexts = J('__texts(S.scrHost.root).concat(S.scrSayMsg ? [S.scrSayMsg.text] : [])').join('|');
check('a stored key is never drawn: not the key, not its last four characters, in what the page reads', !keyTexts.includes(FAKE) && !keyTexts.includes('IJKL') && keyTexts.includes('Saved'), keyTexts.slice(0, 300));
const saveWords = () => J(`__pills(S).filter(e => e.children.some(c => c._text === 'Save' || c._text === 'Clear')).map(e => e.children[e.children.length - 1]._text).join()`);
check('a key is saved in the Deepgram row only: its button says Clear (Save with nothing typed), the others say Save', saveWords() === 'Clear,Save,Save', saveWords());
g.run(`S.inputs.deepgram.value = 'abc'; S.inputs.deepgram.listeners.input.forEach(f => f());`);
check('typing in that field turns Clear into Save (the page is drawn again when the input changes); emptying it turns it back', saveWords() === 'Save,Save,Save' && (() => { g.run(`S.inputs.deepgram.value = ''; S.inputs.deepgram.listeners.input.forEach(f => f());`); return saveWords() === 'Clear,Save,Save'; })(), saveWords());
g.run(`__click(__tabs(S)[0]);`);
check('leaving the Keys tab hides the inputs (and drops them: the next visit makes them again)', J('S.section') === 'sound' && J('Object.keys(S.inputs).length') === 0);
g.run(`VOICE.key = '';`);
check('a line the game says back is shown under the controls and gone with the next tab', (() => { g.run(`S.say('Key saved in this browser.', '#6dff9c')`); const a = J('__find(S.scrHost.root, e => /sc-stat/.test(e._cls)).map(e => e._text + ":" + e._cls).join()'); g.run(`__click(__tabs(S)[2])`); return /Key saved/.test(a) && /good/.test(a) && J('__find(S.scrHost.root, e => /sc-stat/.test(e._cls)).length') === 0; })());
g.run(`scrSetPaint(S, true);`);
check('the page follows the state: muting from elsewhere (M) is drawn at the next look', (() => { g.run(`__click(__tabs(S)[0]); G.muted = true; scrSetUpdate(S); S.scr.at = 0; scrSetUpdate(S);`); return J(`__texts(S.scrHost.root).includes('Muted')`); })());
g.run(`G.muted = false;`);

console.log('F. Reset campaign');
g.run(`localStorage.setItem(CAMP.store, JSON.stringify({ level: 2, mission: 1, techs: ['shield'], ore: 40, results: { '1.1': { score: 900 } }, revealed: true })); G.credits = 123; VOICE.key = ${JSON.stringify(FAKE)}; window.s7 = __set('reset'); scrSetPress(s7, 'campaign');`);
check('the first press asks (Press Reset campaign again ...) and the pill says Press again; nothing is reset', J('s7.armed.what') === 'campaign' && /again/.test(J('s7.scrSayMsg.text')) && JSON.parse(J(`localStorage.getItem(CAMP.store)`)).level === 2);
g.run(`scrSetPress(s7, 'campaign');`);
check('a double tap is not a confirmation (350 ms)', J('s7.armed !== null') && JSON.parse(J(`localStorage.getItem(CAMP.store)`)).level === 2);
g.run(`s7.armed.at -= 1000; scrSetPress(s7, 'campaign');`);
const P1 = JSON.parse(J(`localStorage.getItem(CAMP.store)`));
check('the second press resets the campaign: level 1, mission 0, no tech, no result, the ending seen stays seen; it says so', P1.level === 1 && P1.mission === 0 && (P1.techs || []).length === 0 && Object.keys(P1.results || {}).length === 0 && P1.revealed === true && /Campaign reset/.test(J('s7.scrSayMsg.text')) && J('s7.armed') === null, JSON.stringify(P1));
check('the Long Haul save, the credits, the keys and the sound are not touched', J('G.credits') === 123 && J('VOICE.key') === FAKE && J('G.volume') === 1);
g.run(`scrSetPress(s7, 'plforget'); s7.armed.at -= 1000; scrSetPress(s7, 'campaign'); scrSetPress(s7, 'forget'); s7.armed.at -= 1000; scrSetPress(s7, 'forget');`);
check('another button pressed in between takes the confirmation away (one is armed at a time); a confirmed Forget all keys removes the keys', J('VOICE.key') === '' && J('s7.armed') === null);
g.run(`VOICE.key = '';`);

console.log('G. behind the switch');
g.run(`document.body.children.length = 0; document.body.children.splice(0); CAMP.flags.screens = false; window.__spy = scrSetCreate; window.__made = 0; scrSetCreate = s => { __made++; return __spy(s); }; window.s8 = __set('sound', true); try { Settings.prototype.create.call(s8); } catch (e) { /* today's screen needs Phaser's panel */ }`);
check('with the switch off Settings.create does not ask for the new look: the screen of today is made', J('__made') === 0 && J('!!s8.scr') === false && J('document.body.children.length') === 0);
g.run(`scrSetCreate = __spy; CAMP.flags.screens = true; window.s9 = { add: s8.add, events: { once() {} } };`);
check('with the switch on and no canvas to draw on, nothing is made and the screen of today is', J('scrSetCreate(s9)') === false && J('document.body.children.length') === 0);
g.run(`window.s10 = __set('content'); window.s10.scr = { R: null, el: null, fields: {}, sig: '', at: 0 }; scrSetPaint(s10, true);`);
check('the old methods answer the new look: say, the refreshes and the screens switch draw the page and nothing of the old slots', (() => { g.run(`s10.say('hello', '#ffd37a'); s10.soundRefresh(); s10.keysRefresh(); s10.listenRefresh(); s10.railDraw(); s10.tagDraw();`); return J(`__find(s10.scrHost.root, e => /sc-stat/.test(e._cls)).map(e => e._text).join()`) === 'hello'; })());

console.log('H. the words');
const md = ['scrsettings.md', 'scrctl.md'].map(f => readFileSync(ROOT + '/content/text/' + f, 'utf8')), keys = md.flatMap(m => [...m.matchAll(/^\| (scr\.(?:sett|ctl)\.[\w.]+) \| (.*) \|$/gm)].map(x => x[1]));
check('every word of the new Settings is in the table and the files the same: ' + keys.length + ' keys, none missing, none twice', keys.length === new Set(keys).size && keys.every(k => J(`uiText(${JSON.stringify(k)})`) !== k));
const rowsN = J(`['station', 'ship', 'flight', 'surface', 'campaign', 'readyroom', 'title', 'any'].map(id => [id, controlsGroup(id).rows.length])`);
check('every row of the key table the Controls tab shows has its short words, and no word is left over for a row that is not there', rowsN.every(([id, c]) => Array.from({ length: c }, (_, i) => 'scr.ctl.' + id + '.' + i).every(k => keys.includes(k))) && keys.filter(k => /^scr\.ctl\./.test(k)).length === rowsN.reduce((a, [, c]) => a + c, 0));
check('the file of the Controls words keeps within 200 rows, and the other one too', md.every(m => [...m.matchAll(/^\| scr\./gm)].length <= 200));
check('the words that stay typed in the code (what the game says back) are not part of the tabs: none of the tab\'s words is a long paragraph (nothing over sixteen words)', J(`['sound', 'keys', 'listen', 'controls', 'flight', 'content', 'reset'].every(s => __shown(__M(s)).every(t => scrWords(t) <= 16))`));
check('no word of the new tabs is a key written out: the chips are the table\'s, the words say what the key does', !keys.some(k => /\b(press|key) [A-Z]\b/.test(J(`uiText(${JSON.stringify(k)})`))));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SCR SETTINGS FAIL (${failed} of ${n})` : `SCR SETTINGS PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
