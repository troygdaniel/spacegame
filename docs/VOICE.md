# Ship voice (optional)

The ship computer can speak the key events of a run in a calm female voice. It is **off unless the player pastes their own Deepgram API key**. With no key the game is exactly as before and nothing is sent anywhere.

## Decisions (Troy, 2026-11-13)
- Calm female voice. Text-to-speech only: **no speech-to-text, no push-to-talk.**
- Key events only, short lines, one voice.

## How it works (`src/voice.js`)
- **Key:** typed or pasted in Pause > Ship voice (or `V` on the title screen). Stored only in this browser's `localStorage` (`longhaul.voice.key`, separate from the save file), inside try/catch. Never written to the repo, never logged, never put in an error message, sent only to `api.deepgram.com` in the `Authorization` header.
- **Speech:** `POST https://api.deepgram.com/v1/speak?model=aura-athena-en&encoding=mp3` with `{ "text": "..." }`. The mp3 is decoded with the game's own AudioContext and played through the master gain from `src/audio.js`, so the **volume slider and mute (M) apply** and the pads duck as usual.
- **Queue:** one line plays at a time, lines never overlap. A line that arrives while another plays is dropped, unless it is a warning (hostiles, hull, ship lost), which waits in a queue of two and expires after 6 seconds.
- **Cache:** every decoded line is kept in memory by its text, so a repeated line costs no second call. A line also has a cooldown so the same event cannot repeat within 8 seconds.
- **Failure:** a rejected key (401/402/403) switches the voice off with one message; three network failures in a row pause it for a minute. The game never stops or throws because of the voice.
- **Cost note:** the setup panel says, in plain words, that it uses the player's own account and may cost them money.
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

## Testing
`tests/voice.mjs` mocks `fetch` in the page, so **no test ever calls Deepgram and nothing is spent.** It checks: no key = no call; with a key, the call goes to `api.deepgram.com` with the key only in the `Authorization` header; the cache stops a second call for the same line; lines do not overlap; a rejected key switches the voice off; the key is not in the page text or the console.
