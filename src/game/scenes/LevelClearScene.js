import Phaser from 'phaser';
import { FONT } from '../kit';
import { gameState } from '../state';
import { playSound } from '../audio';

var LEVEL_NAMES = [
  'Fort Lee to Blue Angel',
  'Chinatown Dash',
  'Central Park Ride',
  'Bear Mountain Climb',
];
var BG_KEYS = ['bg-level1', 'bg-level2', 'bg-level3', 'bg-level4'];

export class LevelClearScene extends Phaser.Scene {
  constructor() { super('LevelClear'); }

  init(data) {
    this.levelIndex = data.levelIndex;
    this.score = data.score || 0;
    this.livesLeft = data.lives || 0;
  }

  create() {
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;
    var self = this;

    // Background image based on which level was cleared
    var bgImg = this.add.image(cx, height / 2, BG_KEYS[this.levelIndex]);
    bgImg.setDisplaySize(width, height);
    bgImg.setDepth(-10);

    // Dark overlay for readability
    var bg = this.add.graphics();
    bg.fillStyle(0x111133, 0.7);
    bg.fillRect(0, 0, width, height);

    // Confetti
    for (var i = 0; i < 30; i++) {
      var colors = [0xffd700, 0xff6b6b, 0x6bff6b, 0x6b6bff, 0xff6bff];
      var conf = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-20, -200),
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        colors[i % 5], 0.8
      );
      this.tweens.add({
        targets: conf,
        y: height + 20,
        x: conf.x + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(180, 720),
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 500),
        repeat: -1,
      });
    }

    this.add.text(cx, 40, 'LEVEL CLEAR!', {
      fontFamily: FONT, fontSize: '18px',
      color: '#ffd700', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, 75, LEVEL_NAMES[this.levelIndex], {
      fontFamily: FONT, fontSize: '9px', color: '#aaaaaa',
    }).setOrigin(0.5);

    var spr = this.add.image(cx, 130, gameState.char).setScale(1);
    this.tweens.add({
      targets: spr, y: 125, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Stats
    var stats = [
      'Score: ' + this.score,
      'Lives remaining: ' + this.livesLeft,
      'Total coins: ' + gameState.coins,
    ];
    for (var s = 0; s < stats.length; s++) {
      this.add.text(cx, 190 + s * 28, stats[s], {
        fontFamily: FONT, fontSize: '8px', color: '#ffffff',
      }).setOrigin(0.5);
    }

    var tapText = this.add.text(cx, height - 40, 'PRESS ANY KEY TO CONTINUE', {
      fontFamily: FONT, fontSize: '8px', color: '#888888',
    }).setOrigin(0.5);
    this.tweens.add({ targets: tapText, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    playSound('clear');

    // Auto-advance to next level (no map screen)
    this.time.delayedCall(500, function() {
      var nextIdx = self.levelIndex + 1;
      self.input.once('pointerdown', function() {
        playSound('select');
        if (nextIdx >= 4) {
          self.scene.start('AllClear');
        } else {
          self.scene.start('GetReady', { levelIndex: nextIdx });
        }
      });
      self.input.keyboard.once('keydown', function() {
        playSound('select');
        if (nextIdx >= 4) {
          self.scene.start('AllClear');
        } else {
          self.scene.start('GetReady', { levelIndex: nextIdx });
        }
      });
    });
  }
}
