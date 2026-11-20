# The voice pack

The recorded fixed lines of the game (the ship computer, the wing's radio, the story, the briefings): one `.mp3` per line, named `<voice>-<hash>.mp3`, and `index.json` that says which words each file is.
The game plays a line from here when it is here and calls Deepgram only for a line that is not, so a repeated line costs nothing and the fixed lines are spoken with no key.

Do not edit these by hand. `node tools/voicepack.mjs --dry-run` shows what would be recorded and what it would cost; `node tools/voicepack.mjs` records it after asking. See docs/VOICE.md, "The voice pack".
