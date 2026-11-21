# How the project's AI agents work

> **Current rules for agents are in [`CLAUDE.md`](../CLAUDE.md)** (work lands through the merge gate, which pushes `main` after each landing; behaviour changes update `PROJECT_STATUS.md` in the same hand-in; the repository is public). Where this older page says otherwise, `CLAUDE.md` wins.

Internal workflow for the AI agents that build Long Haul with its owner. You do not need any of this to play, mod or contribute: see `README.md` and `CONTRIBUTING.md` for that. It is kept in the repository so the rules travel with the code.

New files get their own script tag in `index.html`. Keep edits inside the files your card names.

## Rules for agents
- Work in your own git worktree: `git -C ~/dev/spacegame worktree add ~/dev/spacegame-<yourname> -b <card-id>`. Never edit `~/dev/spacegame` directly.
- Small commits on your branch. Do not push. ORCH fast-forward merges after you send the card to review.
- Smoke test before review: `bash tests/smoke.sh` (it runs `node --check` on every file, then loads each scene in headless Chrome), and look at a screenshot from `tests/out/` for anything visual. One headless Chrome at a time when the machine is busy: tests/lock.mjs enforces it and queues runs in arrival order (`node tests/lock.mjs status` shows the line). The gate's batch smoke (`ALL=1`, which sets `LONGHAUL_GATE=1`) goes to the front of that line, one gate run at a time: your run waits for one of its Chrome tests at most, then has its turn. Do not set `ALL=1` or `LONGHAUL_GATE` on your own runs.
- Keep it one evening: simple shapes, no image assets, no new libraries.

## New work found along the way
Agents may add cards for new work they find: `agentboard add --status todo --id space-game-<name> "title" -d "what and which files"`, then tell ORCH in one line (`agentboard chat send --name <you> --to ORCH`). Do not claim it yourself; ORCH assigns it so the load stays even. Keep each card small enough for one sitting and name the files it touches.

## Progress on the board
Update each subtask the moment you finish it, not at the end: `agentboard update <subtask id> 50 "what you are doing"` when you start it, `... 100 "result"` when it is done. The owner watches the card fill up. Do not mark all subtasks 100 in one go when you send the card to review.
