loadGame(); // saved credits, hull, mission, volume (meta.js)
window.game = new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: 'game', backgroundColor: '#05070f',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Station, ShipBay, Space, Surface, Pause, Overlay, Hyper, Settings, Journal]
});
installMeta(window.game); // Esc pause, M mute, autosave
installAudio(window.game); // ambient pads, engine hum (audio.js)
installLookFx(window.game); // speed streaks while boosting (title.js)
installMap(window.game); // Tab sector map, H help, key reminder (map.js)
voiceInstall(window.game); // optional ship voice: Deepgram text-to-speech, only with the player's own key (voice.js)
installJournal(window.game); // J opens the Journal in the station (journal.js)
chatLoad(); // optional NPC chat: reads the player's own OpenAI or Anthropic key from this browser, nothing else happens here (chat.js)
installPoi(window.game); // derelict wrecks and a distress beacon to salvage (poi.js)
