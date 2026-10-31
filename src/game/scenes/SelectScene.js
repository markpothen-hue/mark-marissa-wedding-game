import Phaser from 'phaser';
import { playMusic } from '../audio';
import { FONT, setPad } from '../kit';
import { gameState } from '../state';
import { playSound } from '../audio';

export class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  create() {
    playMusic('title');
    setPad('hint', { text: 'TAP MARK OR MARISSA ABOVE' });
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;
    var self = this;

    // Background
    var bg = this.add.image(cx, height / 2, 'bg-level1');
    bg.setDisplaySize(width, height);
    bg.setDepth(-10);

    // Dark overlay
    var overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.4);
    overlay.fillRect(0, 0, width, height);

    // Title
    this.add.text(cx, 35, 'CHOOSE YOUR PLAYER', {
      fontFamily: FONT, fontSize: '12px',
      color: '#ffd700', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // VS divider
    var line = this.add.graphics();
    line.lineStyle(2, 0xffd700, 0.3);
    line.lineBetween(cx, 60, cx, height - 40);

    var vs = this.add.image(cx, height * 0.4, 'heart').setScale(2);
    this.tweens.add({ targets: vs, scale: 2.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Mark side
    var mX = width * 0.25;
    var markSpr = this.add.sprite(mX, height * 0.54, 'hero', 0).setOrigin(0.5, 1).setScale(1.7);
    this.tweens.add({
      targets: markSpr, y: '-=6', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.add.text(mX, height * 0.6, 'MARK', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.add.text(mX, height * 0.67, 'The Groom', {
      fontFamily: FONT, fontSize: '8px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add.text(mX, height * 0.74, 'SPEED BOOST', {
      fontFamily: FONT, fontSize: '8px', color: '#ffdd44',
    }).setOrigin(0.5);

    // Marissa side
    var maX = width * 0.75;
    var marSpr = this.add.sprite(maX, height * 0.54, 'hero', 1).setOrigin(0.5, 1).setScale(1.7);
    this.tweens.add({
      targets: marSpr, y: '-=6', duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.add.text(maX, height * 0.6, 'MARISSA', {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.add.text(maX, height * 0.67, 'The Bride', {
      fontFamily: FONT, fontSize: '8px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add.text(maX, height * 0.74, 'DOUBLE JUMP', {
      fontFamily: FONT, fontSize: '8px', color: '#ffdd44',
    }).setOrigin(0.5);

    // Tap hint
    this.add.text(cx, height - 20, 'TAP A SIDE OR PRESS 1 / 2', {
      fontFamily: FONT, fontSize: '8px', color: '#dddddd',
    }).setOrigin(0.5);

    // Click zones
    var leftZone = this.add.zone(0, 0, cx, height).setOrigin(0, 0).setInteractive();
    var rightZone = this.add.zone(cx, 0, cx, height).setOrigin(0, 0).setInteractive();

    leftZone.on('pointerdown', function() {
      gameState.char = 'mark';
      playSound('select');
      self.scene.start('Name');
    });
    rightZone.on('pointerdown', function() {
      gameState.char = 'marissa';
      playSound('select');
      self.scene.start('Name');
    });

    // Keyboard
    this.input.keyboard.on('keydown-ONE', function() {
      gameState.char = 'mark';
      playSound('select');
      self.scene.start('Name');
    });
    this.input.keyboard.on('keydown-TWO', function() {
      gameState.char = 'marissa';
      playSound('select');
      self.scene.start('Name');
    });
  }
}
