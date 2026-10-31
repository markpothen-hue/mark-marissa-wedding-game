import Phaser from 'phaser';
import { preloadPx, setupPx, FONT } from '../kit';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    var loadText = this.add.text(400, 250, 'Loading...', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5);
    this.load.on('progress', function(val) {
      loadText.setText('Loading... ' + Math.round(val * 100) + '%');
    });

    this.load.image('bg-level1', 'assets/bg-level1.png');
    this.load.image('bg-level2', 'assets/bg-level2.png');
    this.load.image('bg-level3', 'assets/bg-level3.png');
    this.load.image('bg-level4', 'assets/bg-level4.png');
    preloadPx(this);
  }

  create() {
    setupPx(this);
    var self = this;
    var go = function() { self.scene.start('Title'); };
    // Wait (briefly) for the pixel font so text doesn't render in a fallback face
    if (document.fonts && document.fonts.load) {
      Promise.race([
        document.fonts.load('12px "Press Start 2P"'),
        new Promise(function(r) { setTimeout(r, 2500); }),
      ]).then(go, go);
    } else {
      go();
    }
    void FONT;
  }
}
