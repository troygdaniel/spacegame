// smoke: site calls from files: the salvage and survey calls name their system and site in a mission file; a new one is one more file (plain Node)
// Card space-game-site-calls-from-files (follow-up of space-game-systems-from-markdown). The two site calls (the Widow at lethe-wreck-7, the
// old beacon at beacon-h) were siteRow(...) rows in src/missions.js with the site and the system in code. They are files now:
// content/missions/salvage-lethe.md and survey-hollow.md, with `system:` and `site:` in the front matter, and src/missions.js builds every
// site call it finds in the content (siteCallsFrom). So a system gets a site call of its own with one more file, and a pack can add one.
// Checked here: the two calls are word for word what the code rows were; the code names no site; a call for another system's site plays;
// a file that names a system or a site that is not there is refused in words and breaks nothing; a pack adds one, all or nothing.
// Run: node tests/sitecalls.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const SC = `(() => { const p = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : p, apply: () => p }); return p; })()`; // a scene that takes every call
const tools = g => ({
  J: e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`)),
  fresh: () => g.run(`(() => { G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.credits = 1000; G.system = 'halcyon'; G.lastDock = 'halcyon-station'; toast = () => {}; sfx = () => {}; })()`),
  accept: id => g.run(`(() => { pickMission('${id}'); G.mission = 'accepted'; missionAccepted(); return 1; })()`)
});
// the rows as src/missions.js had them in code before this card (351b874)
const WAS = {
  'salvage-lethe': { kind: 'salvage', title: 'Salvage: the Widow', where: 'Lethe', reward: 700, system: 'lethe', site: 'lethe-wreck-7',
    offer: 'A troop carrier called the Widow went down at Lethe\nwith a strongbox nobody could reach. Fourteen wrecks\non a slow ring; scavenger drones pick over all of them.\nFind her, press E beside the wreck, bring nothing back.\nThe call pays 700 on top of what the wreck holds.',
    here: 'Find the Widow among the wrecks and press E', fail: 'The Widow stays where she fell' },
  'survey-hollow': { kind: 'survey', title: 'Survey: the Hollow', where: 'The Hollow', reward: 600, system: 'hollow', site: 'beacon-h',
    offer: 'An old survey beacon in the Hollow went quiet.\nThere is no pump out there: take the fuel to get home.\nFly to the beacon, press E to chart it, come back.\nThe call pays 600 on top of what the beacon holds.',
    here: 'Fly to the old survey beacon and press E', fail: 'The beacon stays dark' }
};

console.log('the two calls the game ships with, from their files');
{
  const g = nodeGame(), { J, fresh, accept } = tools(g);
  check('no core file was refused', J('SITE_PROBLEMS').length === 0, JSON.stringify(J('SITE_PROBLEMS')));
  check('the board has the same 20 calls, the two site calls last, in the same order', J('MISSIONS.length') === 20 && J('MISSIONS.slice(-2).map(m => m.id)').join() === 'salvage-lethe,survey-hollow');
  for (const [id, was] of Object.entries(WAS)) {
    const now = J(`(() => { const m = MISSIONS.find(x => x.id === '${id}'); G.system = 'halcyon'; const far = m.line('accepted'), farP = m.progress(); G.system = m.system; const here = m.line('accepted'), hereP = m.progress(); G.system = 'halcyon';
      return { kind: m.kind, title: m.title, where: m.where, reward: m.reward, system: m.system, site: m.site, offer: m.offer, here: m.here, failed: m.line('failed'), far, farP, hereLine: here, hereP, failOnDeath: m.failOnDeath, deathMsg: m.deathMsg, key: m.key || null, added: !!m.added }; })()`);
    check(`${id}: kind, title, where, pay, system, site and the words to do there are what the code row had`, ['kind', 'title', 'where', 'reward', 'system', 'site', 'here'].every(k => now[k] === was[k]), JSON.stringify(now));
    check(`${id}: the offer on the board is word for word the same`, now.offer === was.offer, now.offer);
    check(`${id}: the board line: failed, in another system, in its system`, now.failed === 'Failed. ' + was.fail && /^.+: jump to .+ ly, G for the map\)$/.test(now.far) && now.hereLine === was.title + ': ' + was.here, JSON.stringify([now.failed, now.far, now.hereLine]));
    check(`${id}: the progress text, there and away`, now.hereP.startsWith(was.here + '\nYou are in ') && now.farP.startsWith(was.here + '\n') && / ly from here\.$/.test(now.farP));
    check(`${id}: not lost on death, no number key, not a pack's`, now.failOnDeath.length === 0 && now.deathMsg === '' && now.key === null && now.added === false);
  }
  const src = readFileSync(join(ROOT, 'src/missions.js'), 'utf8');
  check('src/missions.js names no site and no site call any more', !/lethe-wreck-7|beacon-h|salvage-lethe|survey-hollow/.test(src.replace(/\/\/.*$/gm, '')));
  const files = ['salvage-lethe', 'survey-hollow'].map(f => readFileSync(join(ROOT, 'content/missions', f + '.md'), 'utf8'));
  check('each file says its system and its site in the front matter', /\nsystem: lethe\nsite: lethe-wreck-7\n/.test(files[0]) && /\nsystem: hollow\nsite: beacon-h\n/.test(files[1]));
  check('the sites are salvage sites of those systems', J(`SYSTEMS.lethe.bodies.some(b => b.id === 'lethe-wreck-7' && b.type === 'poi') && SYSTEMS.hollow.bodies.some(b => b.id === 'beacon-h' && b.type === 'poi')`));
  check('the boards post them where they did: Meridian both, Halcyon the survey', J(`missionsOffered('meridian-exchange').map(m => m.id).slice(-2)`).join() === 'salvage-lethe,survey-hollow' && J(`missionsOffered('halcyon-station').map(m => m.id)`).includes('survey-hollow'));
  fresh(); accept('salvage-lethe'); g.run(`G.system = 'lethe'`);
  check('in Lethe the arrow points at the Widow', J(`missionTarget(${SC}).name`) === 'Troop carrier (the Widow)');
  g.run(`missionSite(${SC}, { id: 'lethe-wreck-1' })`);
  check('another wreck does not end it', J('G.mission') === 'accepted' && J('G.credits') === 1000);
  g.run(`missionSite(${SC}, { id: 'lethe-wreck-7' })`);
  check('E on the Widow ends the call and pays 700', J('G.mission') === 'none' && J('G.credits') === 1700);
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log('a site call for another system is one more file');
{
  // the same content with two more mission entries, as two more files in content/missions would make them: one short (only what it must say), one bad
  const text = readFileSync(join(ROOT, 'content.generated.js'), 'utf8');
  const add = [
    { type: 'mission', id: 'survey-kestrel', path: 'content/missions/survey-kestrel.md', data: { kind: 'survey', title: 'Survey: Kestrel', reward: 450, system: 'kestrel', site: 'beacon-k' } },
    { type: 'mission', id: 'salvage-nowhere', path: 'content/missions/salvage-nowhere.md', data: { kind: 'salvage', title: 'Salvage: nothing', reward: 1, system: 'kestrel', site: 'no-such-wreck' } }
  ];
  const i = text.indexOf('entries: [') + 'entries: ['.length;
  const g = nodeGame({ replace: { 'content.generated.js': text.slice(0, i) + '\n' + add.map(e => JSON.stringify(e)).join(',\n') + ',' + text.slice(i) } }), { J, fresh, accept } = tools(g);
  const m = J(`(() => { const m = MISSIONS.find(x => x.id === 'survey-kestrel'); return m ? { kind: m.kind, system: m.system, site: m.site, where: m.where, here: m.here, offer: m.offer, reward: m.reward, failed: m.line('failed') } : null; })()`);
  check('a file naming Kestrel and its beacon makes a call', !!m && m.kind === 'survey' && m.system === 'kestrel' && m.site === 'beacon-k' && m.reward === 450, JSON.stringify(m));
  check('what the file leaves out has a default: where is the system\'s name, what to do names the site, a plain failed line', !!m && m.where === J('SYSTEMS.kestrel.name') && m.here === 'Fly to ' + J(`SYSTEMS.kestrel.bodies.find(b => b.id === 'beacon-k').name`) + ' and press E' && m.failed === 'Failed. The call was lost' && m.offer.length > 5, JSON.stringify(m));
  fresh(); accept('survey-kestrel');
  check('taken at Halcyon: the goal is Kestrel', J('missionFar().system') === 'kestrel' && J(`missionTarget(${SC})`) === null);
  g.run(`G.system = 'kestrel'`);
  check('in Kestrel the arrow points at its beacon', J(`(() => { const t = missionTarget(${SC}), b = SYSTEMS.kestrel.bodies.find(b => b.id === 'beacon-k'); return !!t && t.x === b.x && t.y === b.y; })()`));
  g.run(`missionSite(${SC}, { id: 'beacon-k' })`);
  check('E on it ends the call with the survey\'s words and pays 450', J('G.mission') === 'none' && J('G.credits') === 1450);
  check('the file that names a site Kestrel does not have is left out, and says why with the sites it could have named', !J(`MISSIONS.some(x => x.id === 'salvage-nowhere')`) && J('SITE_PROBLEMS').length === 1 && J('SITE_PROBLEMS')[0].id === 'salvage-nowhere' && /no body with that id/.test(J('SITE_PROBLEMS')[0].why) && /beacon-k/.test(J('SITE_PROBLEMS')[0].why), JSON.stringify(J('SITE_PROBLEMS')));
  check('and nothing else broke: the two shipped calls are there, 21 calls in all', J('MISSIONS.length') === 21 && J(`MISSIONS.some(x => x.id === 'salvage-lethe') && MISSIONS.some(x => x.id === 'survey-hollow')`));
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log('what a file must say');
{
  const g = nodeGame(), { J } = tools(g);
  const why = d => J(`siteWhy(${JSON.stringify(d)})`);
  check('a good one: nothing to say', why({ kind: 'salvage', system: 'lethe', site: 'lethe-wreck-7' }) === '');
  check('the wrong kind', /kind must be salvage or survey/.test(why({ kind: 'patrol', system: 'lethe', site: 'lethe-wreck-7' })));
  check('no system', /needs system/.test(why({ kind: 'survey', site: 'beacon-h' })));
  check('a system that is not there', /no star system with that id/.test(why({ kind: 'survey', system: 'narnia', site: 'beacon-h' })));
  check('no site', /needs site/.test(why({ kind: 'survey', system: 'hollow' })));
  check('a site of another system', /hollow has no body with that id/.test(why({ kind: 'survey', system: 'hollow', site: 'lethe-wreck-7' })) && /beacon-h/.test(why({ kind: 'survey', system: 'hollow', site: 'lethe-wreck-7' })));
  check('a body that is not a salvage site (the station)', /is a station of halcyon, not a poi/.test(why({ kind: 'salvage', system: 'halcyon', site: 'halcyon-station' })));
  check('the mission files may say site and here: the content schema knows both fields', J(`CONTENT.entries.filter(e => e.type === 'mission' && e.data.site).map(e => e.id + ':' + e.data.site + ':' + (e.data.here ? 1 : 0))`).join() === 'salvage-lethe:lethe-wreck-7:1,survey-hollow:beacon-h:1' && J('CONTENT.problems || []').length === 0);
}

console.log('a pack adds one');
{
  const g = nodeGame(), { J, fresh, accept } = tools(g);
  const good = { kind: 'salvage', title: 'Salvage: the Roost wreck', reward: 900, system: 'roost', site: 'wreck-r1', here: 'Find the wreck at the Roost and press E', description: 'A wreck at the Roost.\nIt pays {reward}.' };
  const tryAdd = (id, d) => J(`(() => { try { CONTENT_TABLES.mission.apply('${id}', ${JSON.stringify(d)}, true); return 'ok'; } catch (e) { return e.message; } })()`);
  check('a pack\'s salvage call for the Roost is added', tryAdd('salvage-roost', good) === 'ok' && J(`MISSIONS.some(m => m.id === 'salvage-roost')`));
  const m = J(`(() => { const m = MISSIONS.find(x => x.id === 'salvage-roost'); return { key: m.key, added: m.added, offer: m.offer, site: m.site, system: m.system, here: m.here }; })()`);
  check('it has a number key of the board (5), its own words with its own pay, and is posted at the home dock', m.key === '5' && m.added === true && m.offer === 'A wreck at the Roost.\nIt pays 900.' && J(`missionsOffered('halcyon-station').some(x => x.id === 'salvage-roost')`), JSON.stringify(m));
  fresh(); accept('salvage-roost'); g.run(`G.system = 'roost'; missionSite(${SC}, { id: 'wreck-r1' })`);
  const roostPay = J('Math.round(900 * (SYSTEMS.roost.pay > 0 ? SYSTEMS.roost.pay : 1))'); // a system may pay more for its calls (the Roost does): the same rule as for every call
  check(`it plays: E on that wreck ends it and pays the call's 900 at the Roost's rate (${roostPay})`, J('G.mission') === 'none' && J('G.credits') === 1000 + roostPay, J('G.credits'));
  const before = J('MISSIONS.length');
  const bad = tryAdd('salvage-bad', Object.assign({}, good, { site: 'wreck-zz' }));
  check('one that names a site the Roost does not have is refused in words, and nothing is added', /no body with that id/.test(bad) && J('MISSIONS.length') === before && !J(`MISSIONS.some(m => m.id === 'salvage-bad')`), bad);
  const run = tryAdd('courier-new', { kind: 'courier', title: 'A new run', reward: 100 });
  check('a new courier run is still refused (its routes are another card)', /courier and haul runs are built in/.test(run) && J('MISSIONS.length') === before, run);
  check('a change to a shipped site call still works as a change: the pay', (() => { g.run(`CONTENT_TABLES.mission.apply('salvage-lethe', { kind: 'salvage', title: 'Salvage: the Widow', reward: 750 }, false)`); return J(`MISSIONS.find(m => m.id === 'salvage-lethe').reward`) === 750 && J(`MISSIONS.find(m => m.id === 'salvage-lethe').site`) === 'lethe-wreck-7'; })());
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
