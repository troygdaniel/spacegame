loadGame(); // saved credits, hull, mission, volume (meta.js)
window.game = new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: 'game', backgroundColor: '#05070f',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Station, Space, Surface, Pause]
});
installMeta(window.game); // Esc pause, M mute, autosave
installAudio(window.game); // ambient pads, engine hum (audio.js)
