import Phaser from 'phaser';
import { playMusic, playSound } from '../audio';
import { FONT, setPad, spark, burst } from '../kit';
import { gameState } from '../state';

// THE END (final screen): the reception. Everyone does the same goofy synchronized
// dance around the cake (Fantastic Mr. Fox style) while the couple says thank you.
// The dance never stops; only the small PLAY AGAIN button leaves.
var FLOOR = 462;
// 'cast' strip: frame = pose * 9 + person; poses 0 stand, 1 arms up, 2 fist pump, 3 twirl, 4 clap
var CAST = { AARON: 0, AMMA: 1, APPA: 2, LUKE: 3, DADA: 4, MAMA: 5, RUTH: 6, MARK: 7, MARISSA: 8 };
var LINEUP = [['LUKE', 50], ['DADA', 115], ['MAMA', 180], ['RUTH', 245], ['MARK', 318], ['MARISSA', 482], ['AARON', 555], ['AMMA', 620], ['APPA', 690]];
var SPEECH = [
  ['MARK', 'WE MADE IT!!'],
  ['MARISSA', 'THANK YOU FOR CELEBRATING WITH US.'],
  ['MARK', "WE COULDN'T HAVE DONE ANY OF THIS WITHOUT YOU."],
  ['MARISSA', 'WE LOVE YOU ALL SO MUCH!'],
  ['MARK', "NOW... LET'S DANCE!"],
];
// the dance: five 16-beat routines on loop
var STEPS = [0, 1, 0, 2, 0, 1, 2, 1];
var ROUTINES = ['line', 'wave', 'shuffle', 'twirl', 'spotlight'];

export class AllClearScene extends Phaser.Scene {
  constructor() { super('AllClear'); }

  create() {
    var self = this;
    var W = this.scale.width, H = this.scale.height;
    setPad('hint', { text: 'TAP TO SKIP' });
    this.cameras.main.fadeIn(800);
    this.add.image(W / 2, H / 2, 'bg-ending').setDisplaySize(W, H);

    // candle twinkle + sparkler fountains (the ones from the first dance)
    this.time.addEvent({ delay: 70, loop: true, callback: function() {
      [150, 650].forEach(function(x) { spark(self, x + Phaser.Math.Between(-5, 5), FLOOR - 70 - Phaser.Math.Between(0, 150)); });
    } });

    // cake on its little round table, center stage
    this.add.ellipse(400, FLOOR - 4, 120, 16, 0x000000, 0.2);
    this.add.rectangle(400, FLOOR, 22, 64, 0xf3ead8).setOrigin(0.5, 1).setStrokeStyle(2, 0xcfc3ae);
    this.add.ellipse(400, FLOOR - 64, 110, 16, 0x1a1620);
    this.add.image(400, FLOOR - 66, 'cake').setOrigin(0.5, 1).setScale(1.6);

    // everyone in a line, name tags in the fog
    this.people = {};
    LINEUP.forEach(function(p) {
      var s = self.add.sprite(p[1], FLOOR, 'cast', CAST[p[0]]).setOrigin(0.5, 1).setDepth(5);
      if (p[1] > 400) s.setFlipX(true);
      self.add.text(p[1], FLOOR + 14, p[0], { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 3 }).setOrigin(0.5).setDepth(6);
      self.people[p[0]] = s;
    });

    this.bubble = this.add.container(0, 0).setDepth(20).setVisible(false);
    this.line = -1;
    this.dancing = false;
    var advance = function() { if (!self.speechDone) self.nextLine(); };
    this.input.on('pointerdown', advance);
    this.input.keyboard.on('keydown', advance);
    this.startDance();
    this.time.delayedCall(1800, function() { self.nextLine(); });
  }

  // ── Speech bubbles ──
  nextLine() {
    var self = this;
    if (this.typing) { this.typing.remove(); this.typing = null; this.bubbleText.setText(this.fullText); this.queueNext(); return; }
    if (this.autoNext) { this.autoNext.remove(); this.autoNext = null; }
    this.line++;
    if (this.line >= SPEECH.length) { this.bubble.setVisible(false); this.speechDone = true; this.endCard(); return; }
    var who = SPEECH[this.line][0], text = SPEECH[this.line][1];
    var sp = this.people[who];
    this.bubble.removeAll(true);
    var bw = 250, x = Phaser.Math.Clamp(sp.x, bw / 2 + 10, 800 - bw / 2 - 10), y = FLOOR - 190;
    var t = this.add.text(x, y, '', { fontFamily: FONT, fontSize: '9px', color: '#3a2030', align: 'center', lineSpacing: 6, wordWrap: { width: bw - 28 } }).setOrigin(0.5);
    t.setText(text);
    var bh = Math.max(44, t.height + 26);
    t.setText('');
    var g = this.add.graphics();
    g.fillStyle(0xffffff, 0.97).fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 12);
    g.lineStyle(3, 0x3a2030).strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 12);
    var tx = Phaser.Math.Clamp(sp.x, x - bw / 2 + 20, x + bw / 2 - 20);
    g.fillStyle(0xffffff).fillTriangle(tx - 10, y + bh / 2 - 2, tx + 10, y + bh / 2 - 2, sp.x, FLOOR - 92);
    g.lineStyle(3, 0x3a2030).lineBetween(tx - 10, y + bh / 2, sp.x, FLOOR - 92).lineBetween(tx + 10, y + bh / 2, sp.x, FLOOR - 92);
    var name = this.add.text(x - bw / 2 + 12, y - bh / 2 - 4, who, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', backgroundColor: '#7a3a5a', padding: { x: 5, y: 4 } }).setOrigin(0, 1);
    this.bubble.add([g, t, name]).setVisible(true);
    this.bubbleText = t; this.fullText = text;
    var n = 0;
    this.typing = this.time.addEvent({ delay: 38, repeat: text.length - 1, callback: function() {
      n++; t.setText(text.slice(0, n));
      if (n % 3 === 0) playSound('select');
      if (n >= text.length) { self.typing = null; self.queueNext(); }
    } });
  }

  queueNext() {
    var self = this;
    this.autoNext = this.time.delayedCall(1700, function() { self.autoNext = null; self.nextLine(); });
  }

  // ── The dance ──
  startDance() {
    var self = this;
    this.dancing = true;
    playMusic('title');
    playSound('clear');
    var names = LINEUP.map(function(p) { return p[0]; });
    this.baseX = {};
    LINEUP.forEach(function(p) { self.baseX[p[0]] = p[1]; });
    // the couple's special moves, shown in front of the cake during the spotlight
    this.couple = this.add.sprite(400, FLOOR + 4, 'couple', 0).setOrigin(0.5, 1).setDepth(8).setScale(1.25).setVisible(false);
    var beat = 0;
    this.time.addEvent({ delay: 360, loop: true, callback: function() {
      var routine = ROUTINES[Math.floor(beat / 16) % ROUTINES.length];
      var b = beat % 16;
      if (b === 0) self.enterRoutine(routine);
      names.forEach(function(k, i) { self.move(routine, k, i, b); });
      if (routine === 'spotlight') {
        self.couple.setFrame(Math.floor(b / 4) % 2);
        if (b % 4 === 0) { burst(self, 400, FLOOR - 90, 0xffb3d9, 12); self.tweens.add({ targets: self.couple, y: FLOOR - 6, duration: 180, yoyo: true }); }
      }
      beat++;
    } });

    // hearts + pastel confetti
    this.time.addEvent({ delay: 500, loop: true, callback: function() {
      var h = self.add.image(400 + Phaser.Math.Between(-60, 60), FLOOR - 150, 'heart').setScale(0.8).setDepth(4);
      self.tweens.add({ targets: h, y: h.y - 150, alpha: 0, duration: 2400, onComplete: function() { h.destroy(); } });
    } });
    var cols = [0xffb3d9, 0xffffff, 0xffe066, 0x9fc28a, 0xc9a7ff];
    for (var c = 0; c < 70; c++) {
      var conf = this.add.rectangle(Phaser.Math.Between(0, 800), Phaser.Math.Between(-60, -400), 6, 4, cols[c % 5]).setDepth(15);
      this.tweens.add({ targets: conf, y: 520, x: conf.x + Phaser.Math.Between(-80, 80), angle: Phaser.Math.Between(360, 1080),
        duration: Phaser.Math.Between(3000, 6000), delay: Phaser.Math.Between(0, 2500), repeat: -1 });
    }

  }

  enterRoutine(routine) {
    var self = this;
    var spot = routine === 'spotlight';
    this.couple.setVisible(spot);
    ['MARK', 'MARISSA'].forEach(function(k) { self.people[k].setVisible(!spot); });
    Object.keys(this.people).forEach(function(k) { self.people[k].x = self.baseX[k]; });
  }

  move(routine, k, i, b) {
    var s = this.people[k];
    var me = CAST[k];
    var pose, hop = 4, flip = s.x > 400;
    if (routine === 'line') {
      pose = STEPS[b % 8];
      hop = pose ? 12 : 4;
      if (b >= 8) flip = !flip;
    } else if (routine === 'wave') {
      // a ripple runs down the line and back
      var at = b < 9 ? b : 16 - b;
      pose = at === i ? 1 : 4;
      hop = at === i ? 22 : 3;
    } else if (routine === 'shuffle') {
      // Mr. Fox shuffle: everyone slides together, 4 beats each way
      pose = b % 2 ? 4 : 0;
      var dir = Math.floor(b / 4) % 2 ? -1 : 1;
      this.tweens.add({ targets: s, x: this.baseX[k] + dir * 18, duration: 300, ease: 'Sine.easeInOut' });
      flip = dir < 0;
    } else if (routine === 'twirl') {
      pose = b % 4 === 3 ? 1 : 3;
      flip = b % 2 === 0;
      hop = 8;
    } else {
      pose = 4;
      hop = 6;
    }
    s.setFrame(pose * 9 + me).setFlipX(flip);
    this.tweens.add({ targets: s, y: FLOOR - hop, duration: 150, yoyo: true, ease: 'Quad.easeOut', delay: i % 2 ? 20 : 0 });
  }

  // ── The thank-you card, after the speech ──
  endCard() {
    var self = this;
    var panel = this.add.rectangle(400, 52, 560, 92, 0xfff6ec, 0.9).setStrokeStyle(3, 0x7a3a5a).setDepth(18).setAlpha(0);
    var t1 = this.add.text(400, 36, 'THANK YOU FOR\nCELEBRATING WITH US!', { fontFamily: FONT, fontSize: '15px', color: '#7a3a5a', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(19).setAlpha(0);
    var t2 = this.add.text(400, 84, 'LOVE, MARK & MARISSA', { fontFamily: FONT, fontSize: '9px', color: '#3f7a3a' }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets: [panel, t1, t2], alpha: 1, duration: 800, delay: 300 });
    var who = gameState.name ? gameState.name + "'S" : 'YOUR';
    var sc = this.add.text(400, 112, who + ' SCORE: ' + gameState.coins, { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 4 }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets: sc, alpha: 1, duration: 600, delay: 1200 });
    setPad('hint', { text: 'THANK YOU FOR PLAYING!' });
    // small corner button: the dance keeps going until someone actually wants to replay
    this.time.delayedCall(4000, function() {
      var again = self.add.text(12, 12, 'PLAY AGAIN', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', backgroundColor: '#7a3a5a', padding: { x: 6, y: 5 } })
        .setOrigin(0, 0).setDepth(19).setInteractive({ useHandCursor: true });
      again.on('pointerdown', function(p, x, y, e) { e.stopPropagation(); self.restart(); });
    });
  }

  restart() {
    playSound('select');
    this.scene.start('Title');
  }
}
