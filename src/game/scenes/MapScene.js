import Phaser from 'phaser';
import { gameState, getLeaderboard } from '../state';
import { playSound } from '../audio';

var LEVEL_NAMES = [
  'Fort Lee to Blue Angel',
  'Chinatown Dash',
  'Central Park Ride',
  'Bear Mountain Climb',
];
var LEVEL_DESCS = [
  'Side-Scrolling Platformer',
  'Auto-Running Dodge Game',
  'Bike Riding Dodger',
  'Shooter / Flying Game',
];
var LEVEL_ICONS = ['PLATFORMER', 'RUNNER', 'BIKE', 'SHOOTER'];

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;
    var self = this;

    // Check all clear
    if (gameState.cleared.every(function(c) { return c; })) {
      this.scene.start('AllClear');
      return;
    }

    // Background image
    var bgImg = this.add.image(cx, height / 2, 'bg-level1');
    bgImg.setDisplaySize(width, height);
    bgImg.setDepth(-10);

    // Dark overlay for readability
    var bg = this.add.graphics();
    bg.fillStyle(0x112244, 0.75);
    bg.fillRect(0, 0, width, height);

    // Header
    this.add.image(25, 18, gameState.char).setScale(0.5);
    this.add.text(45, 10, gameState.name, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    });
    this.add.text(width - 15, 10, 'COINS: ' + gameState.coins, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0);

    this.add.text(cx, 40, 'WORLD MAP', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold',
      color: '#ffd700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Path line
    var path = this.add.graphics();
    path.lineStyle(3, 0xffd700, 0.3);
    path.lineBetween(90, 80, 90, 290);

    // Level nodes
    for (var i = 0; i < 4; i++) {
      (function(idx) {
        var ny = 95 + idx * 52;
        var unlocked = idx === 0 || gameState.cleared[idx - 1];
        var cleared = gameState.cleared[idx];
        var nodeX = 90;

        if (cleared) {
          self.add.circle(nodeX, ny, 20, 0xffd700);
          self.add.text(nodeX, ny, '*', {
            fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#333333',
          }).setOrigin(0.5);
        } else if (unlocked) {
          var circle = self.add.circle(nodeX, ny, 20, 0x44aa44);
          circle.setStrokeStyle(2, 0xffffff);
          self.tweens.add({
            targets: circle, scaleX: 1.1, scaleY: 1.1,
            duration: 500, yoyo: true, repeat: -1
          });
          self.add.text(nodeX, ny, '' + (idx + 1), {
            fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
          }).setOrigin(0.5);
        } else {
          self.add.circle(nodeX, ny, 20, 0x555555);
          self.add.text(nodeX, ny, '?', {
            fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#888888',
          }).setOrigin(0.5);
        }

        // Level info
        self.add.text(nodeX + 30, ny - 12, LEVEL_NAMES[idx], {
          fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
          color: cleared ? '#ffd700' : (unlocked ? '#ffffff' : '#666666'),
          stroke: '#000000', strokeThickness: 1,
        });
        self.add.text(nodeX + 30, ny + 3, cleared ? 'CLEARED!' : (unlocked ? LEVEL_DESCS[idx] : 'LOCKED'), {
          fontFamily: 'monospace', fontSize: '9px',
          color: cleared ? '#88dd88' : (unlocked ? '#cccccc' : '#555555'),
        });

        self.add.text(width - 20, ny, LEVEL_ICONS[idx], {
          fontFamily: 'monospace', fontSize: '7px', fontStyle: 'bold',
          color: cleared ? '#ffd700' : (unlocked ? '#aaaaaa' : '#555555'),
        }).setOrigin(1, 0.5);

        // Click zone for unlocked & not cleared
        if (unlocked && !cleared) {
          var zone = self.add.zone(nodeX - 25, ny - 25, width - 70, 50).setOrigin(0, 0).setInteractive();
          zone.on('pointerdown', function() {
            playSound('select');
            self.scene.start('GetReady', { levelIndex: idx });
          });
        }
      })(i);
    }

    // Keyboard shortcuts for levels
    this.input.keyboard.on('keydown', function(event) {
      var num = parseInt(event.key);
      if (num >= 1 && num <= 4) {
        var idx = num - 1;
        var unlocked = idx === 0 || gameState.cleared[idx - 1];
        if (unlocked && !gameState.cleared[idx]) {
          playSound('select');
          self.scene.start('GetReady', { levelIndex: idx });
        }
      }
    });

    // Leaderboard
    this.add.text(cx, 315, '-- LEADERBOARD --', {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#ffd700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    var lb = getLeaderboard();
    var lbColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    for (var j = 0; j < Math.min(5, lb.length); j++) {
      this.add.text(cx, 335 + j * 16, (j + 1) + '. ' + lb[j].name + ' - ' + lb[j].coins + ' coins', {
        fontFamily: 'monospace', fontSize: '8px',
        color: lbColors[j] || '#aaaaaa',
      }).setOrigin(0.5);
    }
    if (!lb.length) {
      this.add.text(cx, 340, 'No scores yet!', {
        fontFamily: 'monospace', fontSize: '9px', color: '#888888',
      }).setOrigin(0.5);
    }
  }
}
