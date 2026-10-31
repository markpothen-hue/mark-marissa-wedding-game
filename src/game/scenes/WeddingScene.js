import Phaser from 'phaser';
import { playMusic, stopMusic, playSound } from '../audio';
import { FONT, setPad, spark, burst, popup, banner, flashScreen, isTouch } from '../kit';
import { gameState } from '../state';

// BONUS LEVEL: "The Wedding Day". Marissa walks down the aisle with Amma & Appa
// to the Bridal Chorus: tap on the beat to take each step (no way to lose).
// At the altar: both say I DO under the cross, Mark slides the ring on, kiss, reception.

var BG_W = 1143;          // church art scaled to the 500px game height
var FLOOR = 492;
var ALTAR_X = 900;        // the crucifix + baldachin
var START_X = 110;
var STOP_X = 838;         // where Marissa ends up, facing Mark
var BEAT = 60 / 88 * 1000; // one quarter note of the wedding march
var CAST = { AARON: 0, AMMA: 1, APPA: 2, LUKE: 3, DADA: 4, MAMA: 5, RUTH: 6, MARK: 7, MARISSA: 8 };
// family cheering from the front of the pews as she passes: [name, x, line]
var CHEER = [['LUKE', 250, 'LETS GOOO!'], ['RUTH', 330, 'SO PRETTY!!'], ['AARON', 430, "THAT'S MY SISTER!"], ['MAMA', 540, 'AWWWW!'], ['DADA', 620, '*CRYING*']];
var TRACK_X = 240, TARGET_X = 260, TRACK_W = 300;

export class WeddingScene extends Phaser.Scene {
  constructor() { super('Wedding'); }

  init() {
    this.score = 0;
    this.phase = 'intro';
    this.notes = [];
    this.misses = 0;
    this.perfects = 0;
    this.walkX = START_X;
  }

  create() {
    var self = this;
    this.cameras.main.fadeIn(600);
    this.cameras.main.setBounds(0, 0, BG_W, 500);
    this.add.image(0, 0, 'bg-church').setOrigin(0).setDisplaySize(BG_W, 500);

    // Mark + the priest waiting at the altar, under the cross
    this.priest = this.add.image(ALTAR_X, FLOOR - 40, 'priest').setOrigin(0.5, 1).setScale(1.3).setDepth(3);
    this.mark = this.cast('MARK', 958);
    this.mark.setFlipX(true);

    // family at the front of the pews
    this.cheer = CHEER.map(function(c) {
      var s = self.cast(c[0], c[1]).setY(FLOOR - 62).setScale(0.82).setDepth(2);
      return { name: c[0], spr: s, x: c[1], line: c[2], done: false };
    });

    // the bride and her parents (Amma left, Appa right, like the photo)
    this.amma = this.cast('AMMA', START_X - 48);
    this.marissa = this.cast('MARISSA', START_X);
    this.appa = this.cast('APPA', START_X + 50);
    this.walkers = [this.amma, this.marissa, this.appa];
    this.cameras.main.startFollow(this.marissa, true, 0.08, 0);

    // phone flashes from the packed pews
    this.time.addEvent({ delay: 260, loop: true, callback: function() {
      var cx = self.cameras.main.scrollX;
      var f = self.add.rectangle(cx + Phaser.Math.Between(20, 780), Phaser.Math.Between(330, 440), 10, 10, 0xffffff, 0.9).setDepth(1);
      self.tweens.add({ targets: f, alpha: 0, scale: 2.4, duration: 260, onComplete: function() { f.destroy(); } });
    } });

    // beat track (screen-fixed): hearts slide left into the ring
    var ui = function(o) { return o.setScrollFactor(0).setDepth(100); };
    this.trackUi = [
      ui(this.add.rectangle(TRACK_X + TRACK_W / 2, 46, TRACK_W + 30, 40, 0xfff6ec, 0.85).setStrokeStyle(3, 0x7a3a5a)),
      ui(this.add.circle(TARGET_X, 46, 15).setStrokeStyle(4, 0xd9a640)),
      ui(this.add.text(TRACK_X + TRACK_W / 2, 78, isTouch() ? 'TAP ON THE BEAT TO WALK' : 'PRESS SPACE ON THE BEAT TO WALK', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 3 }).setOrigin(0.5)),
    ];
    this.trackUi.forEach(function(o) { o.setAlpha(0); });
    this.scoreText = ui(this.add.text(16, 14, 'SCORE 0', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 4 }));
    ui(this.add.text(784, 14, 'THE WEDDING DAY', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 4 }).setOrigin(1, 0));

    setPad('hint', { text: 'TAP ON THE BEAT' });
    this.input.on('pointerdown', function() { self.press(); });
    this.input.keyboard.on('keydown', function(e) { if (!e.repeat) self.press(); });

    banner(this, 'BONUS LEVEL', '#ffe066', 'THE WEDDING DAY');
    this.time.delayedCall(1800, function() { self.startWalk(); });
  }

  cast(name, x) {
    return this.add.sprite(x, FLOOR, 'cast', CAST[name]).setOrigin(0.5, 1).setDepth(5);
  }

  // ── The walk ──
  startWalk() {
    var self = this;
    this.phase = 'walk';
    playMusic('wedding');
    this.trackUi.forEach(function(o) { self.tweens.add({ targets: o, alpha: 1, duration: 400 }); });
    this.t0 = this.time.now;
    this.nextBeat = 1;
    this.lead = 1600;   // how long a heart takes to slide into the ring
  }

  update(time) {
    if (this.phase !== 'walk') return;
    // spawn a heart for every beat, timed to land on it
    var now = time - this.t0;
    while (this.nextBeat * BEAT - this.lead <= now) {
      var h = this.add.image(0, 46, 'heart').setScrollFactor(0).setDepth(101);
      this.notes.push({ spr: h, at: this.nextBeat * BEAT });
      this.nextBeat++;
    }
    for (var i = this.notes.length - 1; i >= 0; i--) {
      var n = this.notes[i];
      var k = (n.at - now) / this.lead;
      n.spr.x = TARGET_X + k * TRACK_W;
      n.spr.setAlpha(n.spr.x > TRACK_X + TRACK_W ? 0 : 1);
      if (now - n.at > 220) { n.spr.destroy(); this.notes.splice(i, 1); this.missed(); }
    }
    // family cheers as she passes
    for (var c = 0; c < this.cheer.length; c++) {
      var ch = this.cheer[c];
      if (!ch.done && this.marissa.x > ch.x - 40) {
        ch.done = true;
        this.tweens.add({ targets: ch.spr, y: ch.spr.y - 12, duration: 160, yoyo: true, repeat: 3 });
        ch.spr.setFrame(9 + CAST[ch.name]);
        this.say(ch.spr, ch.line, 1500, true);
        this.time.delayedCall(1300, function(s, nm) { s.setFrame(CAST[nm]); }.bind(null, ch.spr, ch.name));
      }
    }
  }

  press() {
    if (this.phase === 'walk') return this.stepPress();
    if (this.phase === 'ring') return this.ringPress();
    if (this.phase === 'talk' && this.skip) this.skip();
  }

  stepPress() {
    var now = this.time.now - this.t0;
    var best = null, bi = -1;
    for (var i = 0; i < this.notes.length; i++) {
      var d = Math.abs(this.notes[i].at - now);
      if (!best || d < best) { best = d; bi = i; }
    }
    if (bi < 0 || best > 300) { this.wobble(); return; }
    var n = this.notes.splice(bi, 1)[0];
    burst(this, n.spr.x + this.cameras.main.scrollX, 46, 0xffb3d9, 6);
    n.spr.destroy();
    var perfect = best < 120;
    var pts = perfect ? 100 : 50;
    this.score += pts; gameState.coins += pts;
    this.scoreText.setText('SCORE ' + this.score);
    if (perfect) this.perfects++;
    this.misses = 0;
    popup(this, this.marissa.x, FLOOR - 100, perfect ? 'PERFECT' : 'GOOD', perfect ? '#ffe066' : '#ffffff');
    this.step();
  }

  step() {
    var self = this;
    var stride = 34;
    this.walkX = Math.min(STOP_X, this.walkX + stride);
    this.walkers.forEach(function(w, i) {
      self.tweens.add({ targets: w, x: self.walkX + (i - 1) * 50 + (i === 0 ? 2 : 0), duration: 260, ease: 'Sine.easeInOut' });
      self.tweens.add({ targets: w, y: FLOOR - 6, duration: 130, yoyo: true });
      w.setRotation(w.rotation > 0 ? -0.05 : 0.05);
    });
    playSound('select');
    if (this.walkX >= STOP_X) this.time.delayedCall(320, function() { self.arrive(); });
  }

  wobble() {
    this.tweens.add({ targets: this.marissa, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 2, onComplete: function(tw, t) { t[0].angle = 0; } });
    popup(this, this.marissa.x, FLOOR - 100, 'OOPS', '#ffffff');
  }

  missed() {
    this.misses++;
    if (this.misses === 3) popup(this, this.marissa.x, FLOOR - 120, 'TAP WHEN THE HEART HITS THE RING!', '#ffffff');
  }

  // ── The altar ──
  arrive() {
    var self = this;
    this.phase = 'talk';
    this.notes.forEach(function(n) { n.spr.destroy(); });
    this.notes = [];
    this.trackUi.forEach(function(o) { self.tweens.add({ targets: o, alpha: 0, duration: 300 }); });
    this.walkers.forEach(function(w) { w.setRotation(0); });
    stopMusic();
    // Amma & Appa give her away, then step aside
    this.say(this.appa, 'TAKE GOOD CARE OF HER!', 1600);
    this.time.delayedCall(1700, function() {
      self.tweens.add({ targets: self.amma, x: STOP_X - 260, duration: 900 });
      self.tweens.add({ targets: self.appa, x: STOP_X - 210, duration: 900 });
      self.tweens.add({ targets: self.marissa, x: STOP_X + 4, duration: 600 });
      self.tweens.add({ targets: self.mark, x: STOP_X + 112, duration: 600 });
    });
    var lines = [
      [this.priest, 'DO YOU, MARK, TAKE MARISSA TO BE YOUR WIFE?'],
      [this.mark, 'I DO!'],
      [this.priest, 'AND DO YOU, MARISSA, TAKE MARK TO BE YOUR HUSBAND?'],
      [this.marissa, 'I DO!'],
      [this.priest, 'THE RINGS, PLEASE...'],
    ];
    this.time.delayedCall(2800, function() { self.talk(lines, function() { self.startRing(); }); });
  }

  talk(lines, done) {
    var self = this, i = 0;
    var next = function() {
      if (self.talkTimer) self.talkTimer.remove();
      if (self.bubble) self.bubble.destroy();
      if (i >= lines.length) { self.skip = null; done(); return; }
      var l = lines[i++];
      var isIDo = l[1] === 'I DO!';
      self.bubble = self.say(l[0], l[1], 0);
      if (isIDo) { playSound('clear'); burst(self, l[0].x, FLOOR - 100, 0xffb3d9, 14); self.tweens.add({ targets: l[0], y: FLOOR - 14, duration: 160, yoyo: true }); }
      self.talkTimer = self.time.delayedCall(isIDo ? 1500 : 2300, next);
    };
    this.skip = next;
    next();
  }

  // speech bubble over someone; life 0 = caller destroys it
  say(spr, text, life, small) {
    var w = small ? 150 : 260;
    var x = Phaser.Math.Clamp(spr.x, this.cameras.main.scrollX + w / 2 + 8, this.cameras.main.scrollX + 800 - w / 2 - 8);
    var y = small ? spr.y - 104 : FLOOR - 210;
    var t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: small ? '7px' : '9px', color: '#3a2030', align: 'center', lineSpacing: 5, wordWrap: { width: w - 24 } }).setOrigin(0.5);
    var h = Math.max(small ? 26 : 40, t.height + 20);
    var g = this.add.graphics();
    g.fillStyle(0xffffff, 0.97).fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(3, 0x3a2030).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    var tipY = spr.y - (small ? 78 : 92);
    var tx = Phaser.Math.Clamp(spr.x, x - w / 2 + 16, x + w / 2 - 16);
    g.fillStyle(0xffffff).fillTriangle(tx - 8, y + h / 2 - 2, tx + 8, y + h / 2 - 2, spr.x, tipY);
    g.lineStyle(3, 0x3a2030).lineBetween(tx - 8, y + h / 2, spr.x, tipY).lineBetween(tx + 8, y + h / 2, spr.x, tipY);
    var c = this.add.container(0, 0, [g, t]).setDepth(60);
    if (life) this.time.delayedCall(life, function() { c.destroy(); });
    return c;
  }

  // ── The ring: stop the swinging marker in the gold zone ──
  startRing() {
    this.phase = 'ring';
    var ui = function(o) { return o.setScrollFactor(0).setDepth(110); };
    this.ringUi = [
      ui(this.add.rectangle(400, 60, 340, 26, 0xfff6ec).setStrokeStyle(3, 0x7a3a5a)),
      ui(this.add.rectangle(400, 60, 46, 20, 0xffd84a)),
      ui(this.add.text(400, 26, 'PUT THE RING ON HER FINGER!', { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 4 }).setOrigin(0.5)),
      ui(this.add.text(400, 92, isTouch() ? 'TAP WHEN IT HITS THE GOLD' : 'PRESS SPACE WHEN IT HITS THE GOLD', { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 3 }).setOrigin(0.5)),
    ];
    this.marker = ui(this.add.image(240, 60, 'ring').setScale(1.4));
    this.ringT = 0;
    this.tries = 0;
    this.ringTween = this.tweens.addCounter({ from: 0, to: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: function(tw) { this.marker.x = 240 + tw.getValue() * 320; }, callbackScope: this });
  }

  ringPress() {
    var self = this;
    if (this.ringLocked) return;
    this.tries++;
    var off = Math.abs(this.marker.x - 400);
    if (off > 24) {
      this.ringLocked = true;
      var r = this.add.image(this.mark.x - 30, FLOOR - 50, 'ring').setDepth(70);
      this.tweens.add({ targets: r, x: r.x - 60, y: FLOOR - 8, angle: 540, duration: 500, ease: 'Bounce.easeOut',
        onComplete: function() { self.tweens.add({ targets: r, alpha: 0, duration: 300, onComplete: function() { r.destroy(); } }); } });
      popup(this, this.marissa.x + 50, FLOOR - 120, ['BUTTERFINGERS!', 'SO CLOSE!', 'NERVES!'][this.tries % 3], '#ffffff');
      playSound('hurt');
      this.time.delayedCall(700, function() { self.ringLocked = false; });
      return;
    }
    // it fits!
    this.phase = 'done';
    this.ringTween.stop();
    this.ringUi.concat([this.marker]).forEach(function(o) { o.destroy(); });
    var bonus = this.tries === 1 ? 1000 : 500;
    this.score += bonus; gameState.coins += bonus;
    this.scoreText.setText('SCORE ' + this.score);
    var ring = this.add.image(this.mark.x - 20, FLOOR - 56, 'ring').setDepth(70).setScale(1.4);
    this.tweens.add({ targets: ring, x: this.marissa.x + 14, y: FLOOR - 46, duration: 500, ease: 'Quad.easeOut',
      onComplete: function() {
        spark(self, ring.x, ring.y); burst(self, ring.x, ring.y, 0xffd84a, 16);
        popup(self, ring.x, ring.y - 30, 'PERFECT FIT! +' + bonus, '#ffe066');
        self.tweens.add({ targets: ring, scale: 0.7, duration: 300 });
        self.wed();
      } });
  }

  wed() {
    var self = this;
    // bells
    [0, 350, 700, 1050].forEach(function(d) { self.time.delayedCall(d, function() { playSound('coin'); }); });
    this.time.delayedCall(900, function() {
      self.phase = 'talk';
      self.talk([[self.priest, 'I NOW PRONOUNCE YOU HUSBAND AND WIFE!'], [self.priest, 'YOU MAY NOW KISS THE BRIDE!']], function() {
        self.phase = 'done';
        // the kiss: lean in, big heart
        self.tweens.add({ targets: self.marissa, x: self.marissa.x + 22, duration: 400, ease: 'Sine.easeInOut' });
        self.tweens.add({ targets: self.mark, x: self.mark.x - 22, duration: 400, ease: 'Sine.easeInOut',
          onComplete: function() {
            var heart = self.add.image((self.mark.x + self.marissa.x) / 2, FLOOR - 100, 'heart').setDepth(80).setScale(0.5);
            self.tweens.add({ targets: heart, scale: 3, y: FLOOR - 230, duration: 700, ease: 'Back.easeOut' });
            flashScreen(self, 0xffd6e8, 0.5);
            playSound('clear');
            banner(self, 'JUST MARRIED!', '#ffe066', 'THE PEWS GO WILD');
            self.party();
          } });
      });
    });
  }

  party() {
    var self = this;
    playMusic('title');
    // whole church throws petals
    var cols = [0xffb3d9, 0xffffff, 0xffe066, 0xc9a7ff];
    var cx = this.cameras.main.scrollX;
    for (var i = 0; i < 60; i++) {
      var p = this.add.rectangle(cx + Phaser.Math.Between(0, 800), Phaser.Math.Between(-200, -10), 6, 4, cols[i % 4]).setDepth(90);
      this.tweens.add({ targets: p, y: 520, x: p.x + Phaser.Math.Between(-60, 60), angle: 720, duration: Phaser.Math.Between(1800, 3200), delay: Phaser.Math.Between(0, 900) });
    }
    this.cheer.concat([{ spr: this.amma, name: 'AMMA' }, { spr: this.appa, name: 'APPA' }]).forEach(function(c, k) {
      c.spr.setFrame(9 + CAST[c.name]);
      self.tweens.add({ targets: c.spr, y: c.spr.y - 12, duration: 180, yoyo: true, repeat: 6, delay: k * 40 });
    });
    this.time.delayedCall(3600, function() {
      self.cameras.main.fadeOut(700, 255, 246, 236);
      self.cameras.main.once('camerafadeoutcomplete', function() { self.scene.start('AllClear'); });
    });
  }
}
