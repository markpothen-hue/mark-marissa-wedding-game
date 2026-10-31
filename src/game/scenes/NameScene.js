import Phaser from 'phaser';
import { FONT, setPad, isTouch } from '../kit';
import { gameState, loadState } from '../state';
import { playSound } from '../audio';

export class NameScene extends Phaser.Scene {
  constructor() { super('Name'); }

  create() {
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;
    var self = this;
    this.nameText = '';
    this.blinkOn = true;

    // Background
    var bg = this.add.image(cx, height / 2, 'bg-level1');
    bg.setDisplaySize(width, height);
    bg.setDepth(-10);

    // Dark overlay
    var overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.4);
    overlay.fillRect(0, 0, width, height);

    this.add.text(cx, 50, 'ENTER YOUR NAME', {
      fontFamily: FONT, fontSize: '12px',
      color: '#ffd700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Input box
    var box = this.add.graphics();
    box.fillStyle(0x1a1a2e); box.fillRoundedRect(cx - 130, 85, 260, 45, 8);
    box.lineStyle(2, 0xffd700); box.strokeRoundedRect(cx - 130, 85, 260, 45, 8);

    this.nameDisplay = this.add.text(cx, 108, '_', {
      fontFamily: FONT, fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5);

    // Character preview
    this.add.image(cx, 200, gameState.char).setScale(1);

    this.add.text(cx, 260, 'Playing as ' + (gameState.char === 'mark' ? 'MARK' : 'MARISSA'), {
      fontFamily: FONT, fontSize: '8px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Go button
    var btnBg = this.add.graphics();
    btnBg.fillStyle(0x228833); btnBg.fillRoundedRect(cx - 70, 290, 140, 40, 8);
    btnBg.lineStyle(2, 0xffd700); btnBg.strokeRoundedRect(cx - 70, 290, 140, 40, 8);
    this.add.text(cx, 310, "LET'S GO!", {
      fontFamily: FONT, fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5);

    var btnZone = this.add.zone(cx - 70, 290, 140, 40).setOrigin(0).setInteractive();
    btnZone.on('pointerdown', function() { self.submitName(); });

    // Phones: a real text box in the controller area opens the keyboard
    if (isTouch()) {
      setPad('name', {
        onInput: function(v) { self.nameText = v.slice(0, 12); self.refreshDisplay(); },
        onSubmit: function(v) { self.nameText = v.slice(0, 12); self.submitName(); },
      });
    }

    // Keyboard input
    this.input.keyboard.on('keydown', function(event) {
      if (event.key === 'Enter') {
        self.submitName();
      } else if (event.key === 'Backspace') {
        self.nameText = self.nameText.slice(0, -1);
        self.refreshDisplay();
      } else if (event.key.length === 1 && self.nameText.length < 12) {
        self.nameText += event.key.toUpperCase();
        self.refreshDisplay();
      }
    });

    // Blink cursor
    this.time.addEvent({
      delay: 400, loop: true,
      callback: function() {
        self.blinkOn = !self.blinkOn;
        self.refreshDisplay();
      },
    });
  }

  refreshDisplay() {
    var cursor = this.blinkOn ? '_' : '';
    this.nameDisplay.setText(this.nameText + cursor || '_');
  }

  submitName() {
    gameState.name = this.nameText || 'PLAYER';
    loadState();
    playSound('select');
    // Skip MapScene, go straight to GetReady for level 1
    this.scene.start('GetReady', { levelIndex: 0 });
  }
}
