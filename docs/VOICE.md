# Ship voice (optional)

The ship computer can speak the key events of a run in a calm female voice. It is **off unless the player pastes their own Deepgram API key**. With no key the game is exactly as before and nothing is sent anywhere.

## Decisions (Troy, 2026-11-13)
- Calm female voice. ~~Text-to-speech only: no speech-to-text, no push-to-talk.~~ **Reversed on 2026-11-17: see Listening below.**
- Key events only, short lines, one voice.

## Decision (Troy, 2026-11-17): the player may talk to the ship's computer
Troy asked for voice to text so he can talk to the ship's computer. This replaces the 13 Nov rule "no speech-to-text, no push-to-talk" for that one use and no other: the ship still speaks only the key events, and the bar characters are still typed to. The rules that made the voice safe are kept:
- **Never always listening: hold, wait for the ring, then it listens.** Hold **U** (T is taken in both places) in space or in a station: a ring around the U key cap on the screen fills (0.6 s). When it is full the microphone opens, with a red LISTENING mark on screen and a short sound at the start and at the end, and the key may be let go. It stops by itself after about 1.2 s of quiet that follows words, on U again (send now), on Esc (cancel, nothing sent), when the window loses focus, after 6 s with nothing said, and after 20 s at the most. A tap that does not fill the ring does nothing but show a one-line hint. (Troy, 2026-11-18, from his first play log: he tapped U first and the first press was lost to the browser's microphone question; the ring replaced hold-and-let-go. The microphone is still shut while the ring fills.)
- **Nothing is recorded or kept.** The sound goes in one request to Deepgram when the listening ends and is dropped when the call ends: not saved, not logged, not in the save file, no copy in memory.
- **Own key, own cost.** It uses the same Deepgram key as the voice (Settings > Keys), sent only to `api.deepgram.com` in the `Authorization` header. No Deepgram key means no listening and a plain line saying where to add one. The ship's computer also needs a chat key (OpenAI or Anthropic) to answer, with its own plain line. Settings > Listen says it may cost the player money. A session may listen for 10 minutes in all (`LISTEN.limit.minutes`), then a plain line says so; a reload starts the count again.
- **The words are shown before anything is done with them.** They appear on screen as soon as Deepgram has them and, after a 1.5 second pause in which Esc cancels them (U again says it again), they are handed to the ship's computer exactly as if they had been typed in its box (`shipcompSubmit`, `docs/NPC-CHAT.md` and `src/shipcomputer.js`).
- **The browser asks for the microphone.** Denied, no microphone, a page that is not a secure context and a game opened from a file each get a plain line. `127.0.0.1` is a secure context: `node tools/serve.mjs` asks once; opened from a file the browser may ask every time or refuse (Settings > Listen says so in one line).
- **What it is not:** not streaming (the words come a moment after the listening ends, not word by word; a WebSocket stream is a later card and changes nothing above), not a wake word, not in the ship computer's box (type there), and not for the bar characters.

## Listening (`src/listen.js`)
- **The press:** `LISTEN.s` is a small state machine: idle, ring (the key is down, the ring fills), opening (the browser may ask: the first time a plain line says so before it does), listening (the level meter tells words from quiet), stopping, hearing, review (the words wait their pause). Every async step checks `LISTEN.s.seq`, so a cancel or a new press makes an older answer fall on the floor. The numbers are in `LISTEN.limit`: `ring`, `silence`, `words`, `lead`, `talk`, `hold`.
- **The request:** `POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&keyterm=...` with the recording as the body, `Content-Type` the recorder's container (`audio/webm` where the browser has it; the codec note is left off) and `Authorization: Token <key>`. The keyterms are the game's own names (the ship computer, the ship models, the stars) so it hears them; a 400 is tried once more without them. 401/403, 402, 429, a timeout (15 s) and the network each have a plain line; the key is never in one.
- **Sends nothing:** a hold under a third of a second (a tap) and a recording with no data in it. A silent microphone is still sent (a level meter that could be wrong must never be why nothing is heard); when the answer comes back empty and the meter heard nothing, the line says "I heard silence" and names the microphone. An empty transcript is never handed to the ship's computer.
- **Keys:** window-level listeners in the capture phase, so an Esc that cancels the words does not also open the pause menu. The key is ignored while typing in a field and with Ctrl, Cmd or Alt held. No scene binds U (`tests/listen.mjs` reads the sources to prove it).
- **Settings > Listen:** the switch, the key, what is missing, the session's minutes, **Test microphone** (opens it for an instant so the browser can ask; records nothing, sends nothing) and the hint. The words are `content/text/ui.md` (`listen.use`, `listen.cost`, `listen.hint`).

## How it works (`src/voice.js`)
- **Key:** typed or pasted in Settings > Keys (Pause > Settings, or `V` on the title screen, which opens Settings at the Deepgram key). Stored only in this browser's `localStorage` (`longhaul.voice.key`, separate from the save file), inside try/catch. Never written to the repo, never logged, never put in an error message, sent only to `api.deepgram.com` in the `Authorization` header.
- **Speech:** `POST https://api.deepgram.com/v1/speak?model=aura-athena-en&encoding=mp3` with `{ "text": "..." }`. The mp3 is decoded with the game's own AudioContext and played through the master gain from `src/audio.js`, so the **volume slider and mute (M) apply** and the pads duck as usual.
- **Queue:** one line plays at a time, lines never overlap. A line that arrives while another plays is dropped, unless it is a warning (hostiles, hull, ship lost), which waits in a queue of two and expires after 6 seconds.
- **Cache:** every decoded line is kept in memory by its text, so a repeated line costs no second call. A line also has a cooldown so the same event cannot repeat within 8 seconds.
- **Failure:** a rejected key (401/402/403) switches the voice off with one message; three network failures in a row pause it for a minute. The game never stops or throws because of the voice.
- **Cost note:** Settings > Keys says, in plain words, that it uses the player's own account and may cost them money.
- **Events come from watching the game, not from the scenes:** `voiceInstall(game)` (called from `main.js`) reads game state once a frame and hooks scene `create` events, like `installAudio`. The scenes have no voice code.

## The lines
| When | Line | Priority |
|---|---|---|
| Launch from the hangar | "Launch clear. All systems nominal." | 1 |
| Hull drops under 30% (re-arms above 50%) | "Warning. Hull integrity critical." | 2 |
| First pirate within 750 px (45 s between) | "Hostile contacts detected. Weapons ready." | 1 |
| Dock at Halcyon | "Docking complete. Welcome to Halcyon Station." | 1 |
| Land on Kepler-4b | "Touchdown confirmed." | 0 |
| Rescue accepted | "Rescue call accepted. Proceed to Kepler-4b." | 1 |
| Escort accepted | "Escort contract accepted. Stay close to the MULE." | 1 |
| Patrol accepted | "Patrol accepted. Five wanted pirates on the board." | 1 |
| Bounty accepted | "Bounty accepted. The Reaver is south-west of Kepler-4b." | 1 |
| Mission paid | "Mission complete. N credits received." | 1 |
| Other payment of 100 cr or more | "Payment received. N credits." | 0 |
| Mission failed | "Mission failed." | 1 |
| Ship destroyed | "Ship lost. Insurance has been charged." | 2 |
| The 2000 cr ending | "Two thousand credits earned. Well flown, pilot." | 1 |
| Test button | "Ship voice online." | n/a |

## Character voices (NPC chat, `space-game-npc-chat-voice`)
`voiceSay(text, prio, model, onStart)` takes an optional `model`, an Aura voice name. The ship computer keeps `aura-athena-en`; each bar character has their own in the `voice` field of `NPCS` in `shop.js` (JUNO `aura-luna-en`, TAMSIN `aura-athena-en`, DEX `aura-orion-en`, MOSS `aura-arcas-en`, SABLE `aura-stella-en`, IDA KETTER `aura-hera-en`; the table is in `docs/NPC-CHAT.md` section 2).
- **One queue for everybody.** A character reply is a priority 1 line: if the ship computer is speaking it waits behind it (the queue of two, 6 seconds), so voices never overlap. The same words in a different voice are a different line for the 8-second rule.
- **Not cached.** Only the ship computer's lines are kept in memory, because they repeat. A character's reply is free text and is spoken once.
- **The name goes into a URL, so it is checked** against `aura-<name>-en` (or `aura-2-...`). Anything else, such as a made-up or hostile name from a content file, falls back to the ship computer's voice and cannot add anything to the request.
- **`voiceSayThen(text, prio, model, start)`** is for the chat box, which shows the words along with the voice: `start(how)` runs once. `'audio'` when the voice begins, `'timeout'` after 1.5 seconds if it has not arrived yet (the audio then still plays, and `start` does not run again), `'silent'` at once when there will be no voice (no key, off, muted, refused), so the reply never waits for nothing. Prio defaults to 1. The bar chat box (`chatAsk` in `src/chat.js`) uses it: while the audio is on its way the dots keep going and the text box stays locked, then the reply types and the box opens. `tests/chat.mjs` part 6 checks this against a mocked Deepgram.
- Same rules as the ship voice: own key only, no key means no call, mute and volume apply, a rejected key switches voice off for both.

## Testing
`tests/listen.mjs` (plain Node) mocks the microphone, the recorder and `fetch`: no test records anything or calls Deepgram. It checks the request, that the key goes only to `api.deepgram.com`, that the microphone is closed before the call is made, that the audio is dropped after it, every refusal and failure line, the 1.5 second pause and Esc.

`tests/voice.mjs` mocks `fetch` in the page, so **no test ever calls Deepgram and nothing is spent.** It also checks the character voices: the voice name reaches the URL, a made-up name cannot, replies are not cached, a character waits behind the ship computer in order and never overlaps it, `voiceSayThen` starts the text with the audio, after 1.5 s when the audio is slow, and at once when there is no voice. It checks: no key = no call; with a key, the call goes to `api.deepgram.com` with the key only in the `Authorization` header; the cache stops a second call for the same line; lines do not overlap; a rejected key switches the voice off; the key is not in the page text or the console.

- **Voice choice:** Settings > Sound picks the ship computer's voice from five Aura voices (`VOICE_CHOICES` in `src/voice.js`; Athena by default, kept in `localStorage` as `longhaul.voice.model`); a new choice drops the cached lines. Hear it makes one call, when pressed.
