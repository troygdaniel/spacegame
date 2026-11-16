// not in the smoke: a library the content tests import (what is in content/, read from the disk; no checks of its own)
// What is in content/, counted from the files themselves (card retro-content-tests-count, rec 8 of docs/retro-2026-11-15.html).
// A content test compares what the game loaded with THIS list, so a card that adds a file to content/ moves every count and breaks nothing.
// What a test may still pin is a KEY entry: one the game or the guide needs by name. Removing one fails; adding another does not.
// The walk follows tools/build-content.mjs readPack: names starting with _ or . are skipped (the templates), and only .md files count.
// A file is named type:id from its folder and its file name (content/missions/rescue.md is mission:rescue), as the loader names an entry.
import { readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDER_TYPE = { ships: 'ship', parts: 'part', systems: 'system', stations: 'station', missions: 'mission', npcs: 'npc', voice: 'voice', text: 'text', poi: 'poi' };

// the entries the game, the guide and the tests need by name (the proof set of card m4, the docks and the eight star systems)
export const KEY = {
  mission: ['bounty', 'escort', 'patrol', 'rescue'],
  npc: ['dex', 'ida', 'juno', 'moss', 'sable', 'tamsin'],
  part: ['engine-1', 'engine-2', 'engine-3', 'shields-1', 'shields-2', 'shields-3', 'weapons-1', 'weapons-2', 'weapons-3'],
  poi: ['beacon-e', 'signal-beacon', 'signal-wreck', 'wreck-nw', 'wreck-s', 'wreck-se', 'wreck-w'],
  ship: ['drone', 'raider'],
  station: ['brass-smelter', 'ember-foundry', 'halcyon-station', 'kestrel-outpost', 'meridian-exchange', 'roost-dock'],
  system: ['brass', 'ember', 'halcyon', 'hollow', 'kestrel', 'lethe', 'meridian', 'roost'],
  text: ['ui']
};
export const KEY_KEYS = Object.entries(KEY).flatMap(([type, ids]) => ids.map(id => type + ':' + id)).sort();

// the .md files below dir (default: the shipped content/): { count, keys: sorted 'type:id' of the files in a known folder, of(type): sorted ids, has(type, id) }
export function contentSet(dir = join(ROOT, 'content')) {
  const keys = []; let count = 0;
  const walk = (d, segs) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name[0] === '_' || e.name[0] === '.') continue;
      if (e.isDirectory()) walk(join(d, e.name), segs.concat(e.name));
      else if (e.isFile() && /\.md$/i.test(e.name)) {
        count++;
        const folder = segs.find(s => FOLDER_TYPE[s]);
        if (folder) keys.push(FOLDER_TYPE[folder] + ':' + e.name.replace(/\.md$/i, ''));
      }
    }
  };
  walk(dir, []);
  keys.sort();
  const of = type => keys.filter(k => k.startsWith(type + ':')).map(k => k.slice(type.length + 1));
  return { count, keys, of, has: (type, id) => keys.includes(type + ':' + id) };
}
