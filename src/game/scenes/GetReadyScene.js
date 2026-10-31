import Phaser from 'phaser';
import { playMusic } from '../audio';
import { FONT, setPad } from '../kit';
import { gameState, resetLives } from '../state';
import { playSound } from '../audio';

var LEVEL_NAMES = [
  'Fort Lee to Blue Angel',
  'Chinatown Dash',
  'Central Park Ride',
  'Bear Mountain Climb',
];
var LEVEL_SUBTITLES = [
  'PLATFORMER: STOMP, JUMP, GRAB THE RING',
  'RUNNER: JUMP CRATES, DUCK LANTERNS',
  "BIKE: SWITCH LANES, DON'T EAT COOKIES",
  'SHOOTER: SAVE THE WEDDING CAKE',
];
var SCENE_KEYS = ['Level1', 'Level2', 'Level3', 'Level4'];
var BG_KEYS = ['bg-level1', 'bg-level2', 'bg-level3', 'bg-level4'];

export class GetReadyScene extends Phaser.Scene {
  constructor() { super('GetReady'); }

  init(data) {
    this.levelIndex = data.levelIndex || 0;
  }

  create() {
    playMusic('level' + (this.levelIndex + 1));
    setPad('hint', { text: 'GET READY!' });
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;
    var cy = height / 2;
    var self = this;
    var idx = this.levelIndex;

    resetLives();

    // Background image for the upcoming level
    var bg = this.add.image(cx, height / 2, BG_KEYS[idx]);
    bg.setDisplaySize(width, height);
    bg.setDepth(-10);

    // Dark overlay
    var overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);

    // Level number
    this.add.text(cx, cy - 80, 'LEVEL ' + (idx + 1), {
      fontFamily: FONT, fontSize: '9px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Level name
    this.add.text(cx, cy - 50, LEVEL_NAMES[idx], {
      fontFamily: FONT, fontSize: '14px',
      color: '#ffd700', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Genre
    this.add.text(cx, cy - 20, LEVEL_SUBTITLES[idx], {
      fontFamily: FONT, fontSize: '8px', color: '#88aacc',
    }).setOrigin(0.5);

    // Character
    this.add.image(cx, cy + 30, gameState.char).setScale(1);

    // GET READY
    var readyText = this.add.text(cx, cy + 80, 'GET READY!', {
      fontFamily: FONT, fontSize: '18px',
      color: '#ff4444', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setScale(0.5);

    this.tweens.add({
      targets: readyText,
      scale: 1.2,
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 600,
      onComplete: function() {
        readyText.setText('GO!');
        readyText.setColor('#44ff44');
        readyText.setScale(0.5);
        self.tweens.add({
          targets: readyText,
          scale: 1.5,
          alpha: 0,
          duration: 500,
          onComplete: function() {
            playSound('select');
            self.scene.start(SCENE_KEYS[idx], { levelIndex: idx });
          }
        });
      }
    });
  }
}
