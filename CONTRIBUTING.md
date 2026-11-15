# Contributing to Long Haul

Thanks for looking. Small, readable changes are the easiest to merge.

## Ground rules

- **No build step to play.** `index.html` loads plain scripts; there is no bundler and no `npm install` for the game. Node is only for the tests (and, later, content tools).
- **Small files, one job each.** A new file gets its own `<script>` tag in `index.html` and a row in the code map in `README.md`.
- **Everything is drawn or synthesized in code.** No image or audio files, no new libraries, no network requests.
- **Markdown carries words and numbers, code carries behaviour.** This is the content rule in [`docs/MODDING.md`](docs/MODDING.md) (section 1): a mission's title, reward and lines can be data; what a mission *does* is code.
- **Never change two of these in one change:** the save format, a coordinate frame, the scene flow ([`docs/UNIVERSE.md`](docs/UNIVERSE.md) section 10.1 has the reasons).
- **No secrets or personal data.** `tests/hygiene.mjs` fails on anything that looks like a key or token, an email address, a phone number or a `/Users/<name>` path in a tracked file. A player's own API key (for voice or chat features) lives only in their browser's `localStorage`, is never written to a file or logged, and is sent only to the host it belongs to.

## Run the tests

```
bash tests/smoke.sh          # about a minute
FULL=1 bash tests/smoke.sh   # adds the mission flow, about two minutes more
```

You need **Node 22+** and **Google Chrome** (set `CHROME=/path/to/chrome` if it is not in the usual place). The tests drive a throwaway headless Chrome with sound muted and its own profile, never yours. On a busy machine run one test at a time. Screenshots land in `tests/out/` (ignored by git); look at them for anything visual.

The smoke test: `node --check` on every file, a check that the generated content files are what a build makes, then every test in `tests/` (the hygiene scan, each scene loaded with no console errors, a scripted rescue from station to payout, one check per fixed bug, the jump, the fleet, the mods...). `bash tests/smoke.sh --list` shows the steps without running them.

Adding a test: make `tests/<name>.mjs` and put one line at its very top, `// smoke: <what it checks>`. The smoke finds it by that line (there is no list to edit), runs the node-only tests first and then the Chrome ones, and fails by name on a test file with no such line. A helper the tests import, or a tool run by hand, says `// not in the smoke: <why>` instead; `// smoke FULL=1:` is for a slow test that only `FULL=1` runs. If you changed a file under `content/`, run `node tools/build-content.mjs --seal` and commit `content.generated.js` with your change. The rules and the reasons are in `docs/SMOKE.md`.

## Sending a change

1. One change per branch or pull request.
2. `bash tests/smoke.sh` passes, and you updated any test your change breaks in the same change.
3. A visual change comes with a screenshot.
4. By contributing you agree your work is released under the MIT licence in `LICENSE`.

The project's own AI agents follow an internal workflow, described in [`docs/AGENTS.md`](docs/AGENTS.md). You do not need to read it.
