// not in the smoke: the plain-Node game context the node-only tests import
// The game's own scripts in a plain Node context: no Chrome, no Phaser, no waiting for a turn at the test lock (card space-game-tests-node-only).
//
// Chrome is the slow, shared thing in the test suite (tests/lock.mjs: one Chrome at a time across every worktree). A test that only calls the
// game's functions and reads its tables (the save, the fleet, the content merge, the prices) does not need a browser: it needs the scripts of
// index.html run in order and a localStorage. This file does that, so such a test runs in a second, on its own, in parallel with anything.
//
//   const g = nodeGame();           // loads every script of index.html except phaser.min.js and src/main.js, then does what the page does
//                                   // first (loadGame(), then contentApply()): g is a game at the start, on a clean storage
//   g.ev(expr)                      // what t.ev(expr) does in tests/cdp.mjs: a plain value, array or plain object comes back, anything else null
//   g.run(expr)                     // the raw value, for a test that wants to look at it from the inside
//   g.errors                        // console.error calls and uncaught errors, like t.errors; [] when the game was quiet
//   g.waitFor(expr, ms)             like t.waitFor: polls until the expression is true, so a promise a mock fetch answers can finish
//   g.close() / g.shot()            there so a test written for t = launch(...) needs no more change than its first line
//
// A test is for this file when it never needs a scene to run: no game.scene, no stepped frames, no key presses, no screenshot. A scene is
// Phaser's (drawing, input, the loop), and the stub below has none of it: it answers every Phaser call with nothing. If a test reaches Phaser
// by mistake it fails (a value that should be a number is not) or it is quiet and wrong, so the rule is the first line of this paragraph.
//
// Options: { root, replace, boot }
//   root     the folder of the game (default: this checkout). The script list is read from its index.html, so it follows a new script by itself.
//   replace  { 'content.generated.js': 'var CONTENT = ...' }: use this text for a script instead of the file (a test of the content merge)
//   boot     false: load the scripts and stop (no loadGame, no contentApply)
//   store    a Map to use as localStorage: pass the same one to a second nodeGame() and it is a reload of the page (the saved game, the settings)
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// the scripts the page loads, in its order. Phaser itself and main.js (which makes the Phaser game) are the two that a browser is for.
export function pageScripts(root = ROOT) {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => f !== 'phaser.min.js' && f !== 'src/main.js');
}

// The names a browser has and Node has not that the game's scripts name at load or in a function a test may call: each is a stand-in that accepts
// anything (calling it gives it back, reading from it gives it back, it is 0 as a number). A name that is not here and not a JavaScript built-in
// is a ReferenceError: a test that reaches something a browser is for fails loudly, it does not pass on a stand-in nobody listed.
const BROWSER = ['Phaser', 'document', 'navigator', 'location', 'history', 'screen', 'AudioContext', 'webkitAudioContext', 'Image', 'Audio', 'Element', 'HTMLElement',
  'HTMLCanvasElement', 'MediaRecorder', 'FileReader', 'XMLHttpRequest', 'indexedDB', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle',
  'matchMedia', 'Worker', 'WebSocket', 'Notification', 'speechSynthesis', 'SpeechSynthesisUtterance', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent',
  'ResizeObserver', 'MutationObserver', 'DOMParser', 'Path2D', 'createImageBitmap', 'alert', 'prompt', 'confirm'];

// shiplook: the new ship look has been ON in the table since card space-game-ship-look-default-on (25 Nov 2026), and a node test that has no word of it asks about today's pictures, which are still in the code: the game is made with
// the flag OFF (the node twin of the address ?shiplook=0). A test of the look sets the flag itself (CAMP.flags.shiplook = true), and one that wants the table's own value asks for nodeGame({ shiplook: 'table' }).
// pagehud: the page HUD has been ON in the table since card space-game-page-hud-default-on (25 Nov 2026), and a node test that has no word of it asks about the canvas HUD, which is still in the code: the game
// is made with the flag OFF (the node twin of the address ?pagehud=0). A test of the page HUD sets the flag itself (CAMP.flags.pagehud = true), and one that wants the table's own value asks for nodeGame({ pagehud: 'table' }).
export function nodeGame({ root = ROOT, replace = {}, boot = true, store = new Map(), pagehud = false, shiplook = false, screens = false, worldlook = false } = {}) {
  const noop = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : noop), apply: () => noop, construct: () => noop });
  const errors = [], box = {};
  BROWSER.forEach(k => { box[k] = noop; });
  box.localStorage = { getItem: k => (store.has(String(k)) ? store.get(String(k)) : null), setItem: (k, v) => { store.set(String(k), String(v)); }, removeItem: k => { store.delete(String(k)); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
  box.console = { log() {}, table() {}, info() {}, debug() {}, warn() {}, error: (...a) => { errors.push('console.error: ' + a.map(String).join(' ')); } };
  box.addEventListener = () => {}; box.removeEventListener = () => {};
  // setTimeout is Node's (a test's mocked fetch may wait on one) but never keeps the process alive; setInterval never fires: the autosave
  // and the other repeating jobs of a scene must not run in the middle of a test
  box.setTimeout = (fn, ms, ...a) => { const h = setTimeout(fn, ms, ...a); if (h && h.unref) h.unref(); return h; }; box.clearTimeout = h => clearTimeout(h);
  box.setInterval = () => 0; box.clearInterval = () => {};
  // no network: a test that wants a fetch installs its own mock (tests/chat.mjs, tests/voice.mjs)
  box.fetch = () => Promise.reject(new Error('nodeGame: there is no network here; install a mock fetch'));
  box.performance = { now: () => Date.now() };
  // the web APIs a browser has and Node has too, as Node's own: a test can build a File, read a Response, encode text
  Object.assign(box, { File, Blob, Response, Request, Headers, TextEncoder, TextDecoder, URL, URLSearchParams, AbortController, structuredClone, atob, btoa });
  // a script written for both Node and the page (src/content.js) tests `typeof module`: here it is the page, so these are not defined
  box.module = undefined; box.exports = undefined; box.require = undefined;
  box.window = box; box.self = box; box.globalThis = box; // src/content.js puts ContentLib on `self`
  const ctx = vm.createContext(box); // a plain sandbox: the built-ins (Object, Array, Promise, JSON) are this context's own, as in a page
  const run = code => vm.runInContext(code, ctx);
  for (const f of pageScripts(root)) {
    const text = f in replace ? replace[f] : readFileSync(join(root, f), 'utf8');
    try { vm.runInContext(text, ctx, { filename: f }); } catch (e) { throw new Error('nodeGame: ' + f + ' did not load: ' + String(e && e.message).split('\n')[0]); }
  }
  if (typeof run('ContentLib') !== 'object') throw new Error('nodeGame: src/content.js did not put ContentLib in place, so no content would be applied');
  if (pagehud !== 'table') run("if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.pagehud = false");
  if (shiplook !== 'table') run("if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.shiplook = false");
  if (worldlook !== 'table') run("if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.worldlook = false"); // the new world look (card space-game-world-w1-backdrop): ON in the table; a node test that has no word of it asks about today's world, which is still in the code (the node twin of ?worldlook=0); a test of the look sets the flag itself or asks for nodeGame({ worldlook: 'table' })
  if (screens !== 'table') run("if (typeof CAMP === 'object' && CAMP && CAMP.flags) CAMP.flags.screens = false"); // the new screens (card space-game-screens-f-foundation): off in the table too, so a test of today's screens stays today's when the table's value changes; a test of the new ones sets CAMP.flags.screens itself
  if (boot) { run('loadGame()'); run('contentApply()'); } // main.js and Boot.create, in the page: the saved game, then the content merge before anything reads a table
  // like t.ev in tests/cdp.mjs: a plain value, an array or a plain object by value; a Phaser sprite or a class instance comes back as null
  const ev = expr => {
    const r = run(`(() => { const r = (${expr}); return (r && typeof r === 'object' && !Array.isArray(r) && Object.getPrototypeOf(r) !== Object.prototype) ? null : r; })()`);
    return Promise.resolve(r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r);
  };
  // like t.waitFor: look every millisecond until the expression is true (a promise a mock fetch answers, a timer)
  const waitFor = async (expr, ms = 8000, what = expr) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { let ok = false; try { ok = !!run(expr); } catch (e) { /* not there yet */ } if (ok) return true; await new Promise(r => setTimeout(r, 1)); }
    throw new Error('timed out waiting for: ' + what);
  };
  return { ctx, run, ev, errors, store, root, close: async () => {}, waitFor, shot: async () => false };
}
