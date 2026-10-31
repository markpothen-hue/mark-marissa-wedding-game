import Phaser from 'phaser';
import { FONT } from '../kit';
import { gameState } from '../state';
import { playSound } from '../audio';

export class AllClearScene extends Phaser.Scene {
  constructor() { super('AllClear'); }

  create() {
    var width = this.scale.width;
    var height = this.scale.height;
    var cx = width / 2;

    // Background image (Hudson Valley - final level)
    var bgImg = this.add.image(cx, height / 2, 'bg-level4');
    bgImg.setDisplaySize(width, height);
    bgImg.setDepth(-10);

    // Bright overlay
    var bg = this.add.graphics();
    bg.fillGradientStyle(0xffd700, 0xffd700, 0xff6699, 0xff6699, 0.5);
    bg.fillRect(0, 0, width, height);

    // Lots of confetti
    for (var i = 0; i < 60; i++) {
      var colors = [0xffffff, 0xff6b6b, 0x6bff6b, 0x6b6bff, 0xff6bff, 0xffff6b];
      var conf = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(-50, -300),
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(4, 10),
        colors[i % 6], 0.8
      );
      this.tweens.add({
        targets: conf,
        y: height + 30,
        x: conf.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(360, 1080),
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 1000),
        repeat: -1,
      });
    }

    this.add.text(cx, 50, 'YOU DID IT!', {
      fontFamily: FONT, fontSize: '21px',
      color: '#ffffff', stroke: '#aa3366', strokeThickness: 5,
    }).setOrigin(0.5);

    // Both characters
    var markImg = this.add.image(cx - 50, 150, 'mark').setScale(1);
    var marImg = this.add.image(cx + 50, 150, 'marissa').setScale(1);
    this.tweens.add({
      targets: [markImg, marImg],
      y: 145, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Heart between them
    var heartImg = this.add.image(cx, 125, 'heart').setScale(2);
    this.tweens.add({
      targets: heartImg,
      scale: 2.5, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this.add.text(cx, 220, 'ALL LEVELS COMPLETE!', {
      fontFamily: FONT, fontSize: '9px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(cx, 255, 'TOTAL COINS: ' + gameState.coins, {
      fontFamily: FONT, fontSize: '12px', color: '#ffffff',
      stroke: '#aa3366', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 300, 'SEE YOU AT THE WEDDING!', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(cx, 340, gameState.name + "'s adventure is complete.", {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff',
    }).setOrigin(0.5);

    playSound('clear');
    this.time.delayedCall(500, function() {
      playSound('clear');
    });
  }
}
