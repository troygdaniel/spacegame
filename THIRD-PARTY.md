# Third-party software

Long Haul ships one third-party file, `phaser.min.js` (Phaser 3.80.1, which has one dependency of its own, inlined in it). Everything else is written for the game: ships, stations, planets and effects are drawn in code, sound is synthesized, and there are no image or audio files. The game makes no network requests.

Both components are MIT licensed. The texts below are copied from the upstream repositories at the release tags named here, not written from memory.

## Phaser 3.80.1

- File: `phaser.min.js`, vendored and unmodified.
- Project: https://github.com/phaserjs/phaser (https://phaser.io)
- Licence: MIT, `LICENSE.md` at the `v3.80.1` tag.
- Checked: `phaser.min.js` is byte-identical to `dist/phaser.min.js` at the `v3.80.1` tag (SHA-256 `62081f6a1b51d040473f919ffedef9009953c20833518e146da5a8d1c9405ea8`). The vendored file carries no licence banner of its own, which is why the text is kept here.

```
The MIT License (MIT)

Copyright (c) 2024 Richard Davey, Phaser Studio Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## eventemitter3 (inside phaser.min.js)

- Phaser's only runtime dependency (`"eventemitter3": "^5.0.1"` in Phaser 3.80.1's `package.json`); its code is inlined in `phaser.min.js`.
- Project: https://github.com/primus/eventemitter3
- Licence: MIT, `LICENSE` at the `5.0.1` tag.

```
The MIT License (MIT)

Copyright (c) 2014 Arnout Kazemier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
