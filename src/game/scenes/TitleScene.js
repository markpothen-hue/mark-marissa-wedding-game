import Phaser from 'phaser';
import { FONT, setPad, isTouch } from '../kit';
import { playSound } from '../audio';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    setPad('hint', { text: 'TAP THE GAME TO START' });
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;

    // Background image (Fort Lee evening skyline)
    var bg = this.add.image(cx, height / 2, 'bg-level1');
    bg.setDisplaySize(width, height);
    bg.setDepth(-10);

    // Semi-transparent dark overlay for text readability
    var overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.3);
    overlay.fillRect(0, 0, width, height);

    // Characters on screen
    var markSpr = this.add.image(cx - 60, height - 130, 'mark').setScale(0.9);
    var marSpr = this.add.image(cx + 60, height - 130, 'marissa').setScale(0.9);
    this.tweens.add({
      targets: [markSpr, marSpr],
      y: '-=6', duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Heart between them
    var heartImg = this.add.image(cx, height - 135, 'heart').setScale(1.5);
    this.tweens.add({
      targets: heartImg,
      scale: 1.8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Title text
    this.add.text(cx, 40, "MARK & MARISSA'S", {
      fontFamily: FONT, fontSize: '17px',
      color: '#ffffff', stroke: '#2244aa', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, 75, 'ADVENTURE', {
      fontFamily: FONT, fontSize: '21px',
      color: '#ffd700', stroke: '#885500', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 110, '~ A Wedding Quest ~', {
      fontFamily: FONT, fontSize: '9px',
      color: '#ffffff', stroke: '#2244aa', strokeThickness: 2,
    }).setOrigin(0.5);

    // Blink text
    var tapText = this.add.text(cx, height - 25, isTouch() ? 'TAP TO START' : 'PRESS ANY KEY TO START', {
      fontFamily: FONT, fontSize: '9px',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({ targets: tapText, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    // Input
    this.input.once('pointerdown', function() {
      playSound('select');
      this.scene.start('Select');
    }, this);
    this.input.keyboard.once('keydown', function() {
      playSound('select');
      this.scene.start('Select');
    }, this);
  }
}
