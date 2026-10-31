import Phaser from 'phaser';
import { playMusic, playSound } from '../audio';
import { FONT, setPad, spark } from '../kit';
import { gameState } from '../state';
import { FAMILY } from './Level4Scene';

// THE END: the reception. Both families, the cake, the couple, and a thank-you.
var FLOOR = 440;

export class AllClearScene extends Phaser.Scene {
  constructor() { super('AllClear'); }

  create() {
    var self = this;
    var W = this.scale.width, H = this.scale.height;
    playMusic('title');
    setPad('hint', { text: 'TAP TO PLAY AGAIN' });
    this.cameras.main.fadeIn(600);

    // hall: warm cream drapes, polished floor
    var g = this.add.graphics();
    g.fillGradientStyle(0xf7ead6, 0xf7ead6, 0xe8cfae, 0xe8cfae, 1).fillRect(0, 0, W, FLOOR);
    for (var d = 0; d < W; d += 40) g.fillStyle(0xffffff, 0.18).fillRect(d, 0, 18, FLOOR);
    for (var sw = 0; sw < W; sw += 100) g.fillStyle(0xfff6e8, 1).fillEllipse(sw + 50, 0, 110, 40);
    g.fillStyle(0xd9bfa0).fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle(0xffffff, 0.25).fillRect(0, FLOOR + 6, W, 3);

    // two flower arches like the reception stage
    [140, 660].forEach(function(ax) { self.flowerArch(ax); });

    // fairy lights
    for (var i = 0; i < 40; i++) {
      var l = this.add.circle(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(150, FLOOR - 120), 2, 0xffe9a0);
      this.tweens.add({ targets: l, alpha: 0.2, duration: Phaser.Math.Between(400, 1200), yoyo: true, repeat: -1 });
    }
    var ch = this.add.image(W / 2, 4, 'chandelier').setOrigin(0.5, 0).setScale(2);
    this.tweens.add({ targets: ch, angle: 1.5, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // cake table
    this.add.rectangle(340, FLOOR - 58, 120, 8, 0x1a1620).setOrigin(0.5, 0);
    this.add.rectangle(340, FLOOR - 50, 96, 50, 0xf3ead8).setOrigin(0.5, 0).setStrokeStyle(2, 0xcfc3ae);
    this.add.image(340, FLOOR - 58, 'cake').setOrigin(0.5, 1).setScale(1.3);

    // the couple, then the families walk in from each side
    var mark = this.add.image(430, FLOOR, 'mark').setOrigin(0.5, 1);
    var mar = this.add.image(510, FLOOR, 'marissa').setOrigin(0.5, 1);
    this.tweens.add({ targets: [mark, mar], y: FLOOR - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Mark's family on the left, Marissa's on the right
    var spots = { LUKE: 70, DADA: 130, MAMA: 190, RUTH: 250, AARON: 600, AMMA: 660, APPA: 720 };
    FAMILY.forEach(function(name, i) {
      var x = spots[name], fromLeft = x < 400;
      var p = self.add.sprite(fromLeft ? -40 : W + 40, FLOOR, 'family', i).setOrigin(0.5, 1);
      var t = self.add.text(p.x, FLOOR + 12, name, { fontFamily: FONT, fontSize: '7px', color: '#5a3a2a' }).setOrigin(0.5);
      self.tweens.add({ targets: [p, t], x: x, duration: 1400, delay: 300 + i * 120, ease: 'Quad.easeOut',
        onComplete: function() {
          self.tweens.add({ targets: p, y: FLOOR - 10, duration: 260, yoyo: true, repeat: -1, repeatDelay: 1400 + i * 180, ease: 'Quad.easeOut' });
        } });
    });

    // hearts float up from the couple
    this.time.addEvent({ delay: 600, loop: true, callback: function() {
      var h = self.add.image(470 + Phaser.Math.Between(-20, 20), FLOOR - 90, 'heart').setScale(0.8);
      self.tweens.add({ targets: h, y: h.y - 140, alpha: 0, duration: 2200, onComplete: function() { h.destroy(); } });
    } });
    // sparkler fountains at the edges
    this.time.addEvent({ delay: 90, loop: true, callback: function() {
      [18, W - 18].forEach(function(x) { spark(self, x + Phaser.Math.Between(-6, 6), FLOOR - Phaser.Math.Between(10, 120)); });
    } });
    // pastel confetti (pink, white, gold, sage, lilac)
    var cols = [0xffb3d9, 0xffffff, 0xffe066, 0x9fc28a, 0xc9a7ff];
    for (var c = 0; c < 70; c++) {
      var conf = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-60, -400), 6, 4, cols[c % 5]).setDepth(5);
      this.tweens.add({ targets: conf, y: H + 20, x: conf.x + Phaser.Math.Between(-80, 80), angle: Phaser.Math.Between(360, 1080),
        duration: Phaser.Math.Between(3000, 6000), delay: Phaser.Math.Between(0, 2500), repeat: -1 });
    }

    // the thank-you
    var style = function(size, color) { return { fontFamily: FONT, fontSize: size, color: color, stroke: '#ffffff', strokeThickness: 5, align: 'center' }; };
    var t1 = this.add.text(W / 2, 96, 'THANK YOU FOR\nCELEBRATING WITH US!', style('18px', '#7a3a5a')).setOrigin(0.5).setDepth(6).setScale(0);
    var t2 = this.add.text(W / 2, 150, 'LOVE, MARK & MARISSA', style('10px', '#3f7a3a')).setOrigin(0.5).setDepth(6).setAlpha(0);
    this.tweens.add({ targets: t1, scale: 1, duration: 600, delay: 1800, ease: 'Back.easeOut', onStart: function() { playSound('clear'); } });
    this.tweens.add({ targets: t2, alpha: 1, duration: 600, delay: 2500 });

    var who = gameState.name ? gameState.name + "'S" : 'YOUR';
    this.add.text(W / 2, FLOOR + 32, who + ' SCORE: ' + gameState.coins, { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 4 }).setOrigin(0.5).setDepth(6);
    var again = this.add.text(W / 2, H - 10, 'TAP TO PLAY AGAIN', { fontFamily: FONT, fontSize: '7px', color: '#5a3a2a' }).setOrigin(0.5, 1).setDepth(6).setAlpha(0);
    this.time.delayedCall(3500, function() {
      again.setAlpha(1);
      self.tweens.add({ targets: again, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      var restart = function() { playSound('select'); self.scene.start('Title'); };
      self.input.once('pointerdown', restart);
      self.input.keyboard.once('keydown', restart);
    });
  }

  flowerArch(ax) {
    var g = this.add.graphics();
    var r = 95, top = FLOOR - 230;
    g.fillStyle(0xffffff, 0.85).fillRect(ax - r - 6, top, 12, FLOOR - top).fillRect(ax + r - 6, top, 12, FLOOR - top);
    g.lineStyle(12, 0xffffff, 0.85).beginPath().arc(ax, top, r, Math.PI, 0, false).strokePath();
    var cols = [0xffb3d9, 0xffffff, 0x8a1f3a, 0xf5c6d6];
    for (var k = 0; k <= 26; k++) {
      var a = Math.PI + (k / 26) * Math.PI;
      var x = ax + Math.cos(a) * r, y = top + Math.sin(a) * r;
      if (k < 8 || k > 18) {
        g.fillStyle(0x5aa04a).fillCircle(x + 4, y + 4, 4);
        g.fillStyle(cols[k % 4]).fillCircle(x, y, 6);
      }
    }
    for (var j = 0; j < 7; j++) {
      g.fillStyle(cols[j % 4]).fillCircle(ax - r + (j % 2 ? 6 : -6), FLOOR - 20 - j * 16, 5);
      g.fillStyle(cols[(j + 1) % 4]).fillCircle(ax + r + (j % 2 ? -6 : 6), FLOOR - 20 - j * 16, 5);
    }
  }
}
