# CLAUDE.md: rules for AI agents that change this repository

This repository is **public** (https://github.com/troygdaniel/spacegame). Read `README.md`, then `PROJECT_STATUS.md` (what is true now), then `ARCHITECTURE.md` (how it is built) before you change anything. `ROADMAP.md` says what is parked and out. Troy is the owner; he plays the game and gives the direction. An orchestrating session (called ORCH) hands out the work and keeps a board of cards; you are given one card at a time.

## How work lands (sync)

- **Work lands on `main` through a merge gate.** You never commit to `main` directly. Work in your own git worktree on your own branch, make small commits, and when it is ready hand in the tip commit to the gate (the card says how). The gate runs the checks and lands it. **The gate pushes `main` to origin after every landing**, so GitHub always shows what has landed; nobody else pushes.
- **Merge `main` into your branch before you hand in** (main moves every few minutes). Never amend a commit whose hash you have already sent; add a new commit.
- **A change in behaviour updates `PROJECT_STATUS.md` in the same hand-in**: the level-by-level table, "being built now" or "known issues" as they change, and the date in its header (no hash: the file describes `main` as of the landing that last changed it, which `git log -1 -- PROJECT_STATUS.md` names). When a key moves, update the controls in `README.md` too (and `src/data_controls.js` first: it is the one key table).
- **Commit messages say what changed for the player**, in plain words ("Shields mend by themselves, at a rate the shield pips set"), then the detail.
- **Never commit secrets, keys, play logs or personal details.** No API keys, no emails, no phone numbers, no home-directory paths, no recordings or transcripts. `node tests/hygiene.mjs` fails on them. If you find one already in the repository, say so; do not copy it elsewhere.
- Use worktrees, never the shared checkout; never use a bare `git stash` (the stash is shared by every worktree).

## GitHub Issues (how ideas and bugs come in)

- **Anyone, including ChatGPT acting as Troy's voice partner, may open an issue** labelled **`idea`**, **`bug`** or **`question`**, plus **`from-chatgpt`** when it came from there. The rules for the person writing it are in `docs/WORKING-WITH-AI.md`.
- **Nobody builds an issue until it carries the `approved` label, and only Troy gives that label** (in chat with ORCH, or himself on GitHub). An issue without it is a conversation, not a task. Do not start work on one, and do not apply the label yourself.
- **ORCH turns an approved issue into a board card** and **closes the issue with the hash it landed as**.
- Open design questions (listed in `PROJECT_STATUS.md`) are Troy's to answer. Do not settle one in a pull request or an issue comment.

## How to change the code

- **Feature freeze** (since 20 Nov 2026): bug fixes and the card you were handed only. New ideas go to `ROADMAP.md`'s bench via an issue; do not build them.
- **No build step, no new libraries, no image or sound files.** A new source file gets its own `<script>` tag in `index.html`. Keep one job per file.
- **The Campaign's rules are pure** (`src/campaign.js` and its `src/camp*.js` rule files, no Phaser) and its numbers are the `CAMP` table; scenes only read keys, step the simulation and draw. Keep the simulation deterministic (seeded). See `ARCHITECTURE.md`.
- **Words go in `content/text/*.md`** (a file holds at most 200 rows; put new keys in a new file), with the same default in `src/contenttables.js`, then `node tools/build-content.mjs --seal` and `--check`. Grep for a key before you add it: a reused key silently replaces the old text. A new key also needs a rule in `src/voicepack.js` (spoken or shown only). Ship-voice lines are curt (about 12 words).
- **Keys:** change `src/data_controls.js` first; hints, the H page and tests are checked against it.
- **Tests:** add or update a plain-Node suite (`tests/<name>.mjs`, first line `// smoke: <what it checks>`) for what you touched, and run it plus its neighbours. Before you hand in run `node tools/build-content.mjs --check`, `node tools/economy-sim.mjs check` and the suites for the files you changed. Chrome tests are slow and share one lock; run one only when the card is about a picture. A new system teaches the plain bot (`tools/campaign-bot.mjs`) an answer so it still wins.
- A change that moves a pinned number (a bot table, a fight's end state) says so in the commit and updates the pin; it does not loosen the test.

## What to say

Report in one plain sentence: the action needed first, then one fact. Put assumptions you made in the hand-in; ask ORCH one line only for a real decision.
