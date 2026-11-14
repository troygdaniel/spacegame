// A throwaway copy of the game folder (index.html, phaser.min.js, src/) so a test can give it its own content.generated.js.
// It opens from file:// like the real game; remove it with rmSync(dir, { recursive: true, force: true }) when done.
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function copyGame(tag = 'content') {
  const dir = mkdtempSync(join(tmpdir(), `longhaul-${tag}-${process.pid}-`));
  for (const f of ['index.html', 'phaser.min.js', 'src']) cpSync(join(ROOT, f), join(dir, f), { recursive: true });
  writeFileSync(join(dir, 'mods.generated.js'), 'var MODS = { version: 1, packs: [], errors: [] };\n'); // no packs (index.html loads this file); a test that wants packs writes its own
  return dir;
}
