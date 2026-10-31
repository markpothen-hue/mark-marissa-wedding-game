import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner,
  finishLevel, addScore, gameOver, playSound, gameState, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 3: "Central Park Ride" — 3-lane bike dodger.
// UP/DOWN switches lanes, SPACE hops. Hop over low stuff (cookies, puddles),
// switch lanes around benches, watch the squirrels — they change lanes on you.
// The cookies are a trap. Do NOT eat the cookies. Grab hearts instead.

var LANES = [392, 434, 476];
var PX_ = 180;
var GOAL = 20000;

export class Level3Scene extends Phaser.Scene {
  constructor() { super('Level3'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.dist = 0;
    this.speed = 280;
    this.lane = 1;
    this.laneY = LANES[1];
    this.hop = 0;      // height above the path
    this.hopV = 0;
    this.nextWave = 700;
    this.things = [];
    this.finishLine = null;
    this.combo = 0;
  }

  create() {
    playMusic('level3');
    this.cameras.main.fadeIn(250);
    this.bg = makeParallax(this, 'bg-level3');
    this.add.rectangle(0, LANES[0] - 10, GAME_WIDTH, GAME_HEIGHT, 0xbe8c50).setOrigin(0).setDepth(1);
    this.path = this.add.tileSprite(0, LANES[0] - 26, GAME_WIDTH, 16, 'path').setOrigin(0).setDepth(1);
    // pebbles in the dirt scroll with the ride
    for (var pb = 0; pb < 24; pb++) {
      this.laneMarksPebble = this.laneMarksPebble || [];
      this.laneMarksPebble.push(this.add.rectangle(pb * 37, LANES[0] - 4 + (pb * 53) % 100, 4, 2, 0x96643a).setDepth(1));
    }
    this.laneMarks = [];
    for (var l = 0; l < 2; l++) {
      for (var d = 0; d < 9; d++) {
        this.laneMarks.push(this.add.rectangle(d * 100, (LANES[l] + LANES[l + 1]) / 2 - 6, 40, 4, 0xfff3c4, 0.6).setDepth(2));
      }
    }

    // Bike = two spinning wheels + frame + the same hero rig on top
    this.wheelB = this.add.sprite(0, 0, 'wheel').play('wheel-spin').setDepth(12);
    this.wheelF = this.add.sprite(0, 0, 'wheel').play('wheel-spin').setDepth(12);
    this.frame = this.add.image(0, 0, 'bikeframe').setOrigin(0.5, 39 / 40).setDepth(13);
    this.crank = this.add.graphics().setDepth(14);
    this.crankA = 0;
    this.shadow = this.add.ellipse(0, 0, 70, 10, 0x000000, 0.25).setDepth(3);
    // your lane is lit, so it's obvious what's in your path
    this.laneBand = this.add.rectangle(0, LANES[1] - 4, GAME_WIDTH, 36, 0xffffff, 0.24).setOrigin(0, 0.5).setDepth(2);
    this.rig = new Rig(this, PX_, LANES[1], gameState.char);
    this.rig.sprite.setDepth(11);

    this.hud = new Hud(this, 'CENTRAL PARK RIDE', { progress: 'FINISH' });
    this.controls = new Controls(this, 'lanes');
    banner(this, 'RIDE!', '#ffe066', "DON'T EAT THE COOKIES");
  }

  // ── Waves ──
  spawnWave() {
    var d = this.dist / GOAL;
    var x = GAME_WIDTH + 60;
    var r = Phaser.Math.Between;
    var pick = r(0, d < 0.3 ? 3 : d < 0.6 ? 5 : 6);
    var free;
    if (pick === 0) {                      // bench blocks one lane, hearts in another
      var bl = r(0, 2); this.add3('bench', x, bl);
      free = (bl + r(1, 2)) % 3; this.heartRow(x - 40, free, 3);
    } else if (pick === 1) {               // cookie roll in a lane
      var cl = r(0, 2); this.add3('cookie', x, cl); this.add3('cookie', x + 90, cl);
      this.heartRow(x, (cl + 1) % 3, 3);
    } else if (pick === 2) {               // puddle across two lanes
      var pl = r(0, 1); this.add3('puddle', x, pl); this.add3('puddle', x, pl + 1);
      this.heartArc(x, pl);
    } else if (pick === 3) {               // squirrel darting across
      this.add3('squirrel', x, r(0, 2));
    } else if (pick === 4) {               // two benches: one gap
      var gap = r(0, 2);
      for (var i = 0; i < 3; i++) if (i !== gap) this.add3('bench', x, i);
      this.heartRow(x - 30, gap, 2);
    } else if (pick === 5) {               // cookies in all lanes: hop!
      for (var j = 0; j < 3; j++) this.add3('cookie', x + j * 30, j);
      this.heartArc(x + 30, 1);
    } else {                               // bench + squirrel combo
      var b2 = r(0, 2); this.add3('bench', x, b2); this.add3('squirrel', x + 200, (b2 + 1) % 3);
    }
    this.nextWave = Phaser.Math.Between(260, 380) + this.speed * 0.3 - d * 80;
  }

  add3(kind, x, lane) {
    var y = LANES[lane];
    var spr = kind === 'squirrel'
      ? this.add.sprite(x, y, 'squirrel-run').play('squirrel-run').setOrigin(0.5, 1).setDepth(5 + lane * 3)
      : this.add.image(x, y, kind).setOrigin(0.5, 1).setDepth(5 + lane * 3);
    var t = { kind: kind, x: x, lane: lane, y: y, spr: spr, low: kind === 'cookie' || kind === 'puddle', w: spr.width * 0.7 };
    if (kind === 'cookie') t.spin = true;
    if (kind === 'squirrel') { t.vx = 70; t.nextHop = 600; }
    if (kind === 'puddle') spr.setOrigin(0.5, 0.6);
    // footprint on the ground: turns amber when it's in your lane and coming at you
    t.mark = this.add.ellipse(x, y - 2, Math.min(t.w, 90) + 16, 12, 0x000000, 0.3).setDepth(4 + lane * 3);
    this.things.push(t);
    return t;
  }

  heartRow(x, lane, n) { for (var i = 0; i < n; i++) this.addHeart(x + i * 50, lane, 0); }
  heartArc(x, lane) { for (var i = 0; i < 4; i++) this.addHeart(x - 40 + i * 40, lane, Math.sin((i / 3) * Math.PI) * 60 + 20); }
  addHeart(x, lane, h) {
    var y = LANES[lane] - 30 - h;
    var spr = this.add.image(x, y, 'heart').setDepth(6 + lane * 3);
    this.tweens.add({ targets: spr, scaleX: 0.75, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.things.push({ kind: 'heart', x: x, lane: lane, y: y, h: h, spr: spr, w: 26 });
  }

  update(time, dt) {
    var c = this.controls.poll();
    var s = dt / 1000;

    if (!this.done && !this.dead) {
      this.speed = 280 + 240 * Math.min(1, this.dist / GOAL);
      this.dist += this.speed * s;
      this.nextWave -= this.speed * s;
      if (this.nextWave <= 0 && this.dist < GOAL - 700) this.spawnWave();
      if (this.dist > GOAL - 700 && !this.finishLine) this.spawnFinish();

      if (c.upHit && this.lane > 0) { this.lane--; playSound('select'); this.rig.lean = -0.12; }
      if (c.downHit && this.lane < 2) { this.lane++; playSound('select'); this.rig.lean = 0.12; }
      if (c.jumpHit && this.hop === 0) { this.hopV = 520; playSound('jump'); }
    }
    var move = this.done || this.dead ? 0 : this.speed * s;

    // lane glide + hop arc
    this.laneY += (LANES[this.lane] - this.laneY) * Math.min(1, s * 14);
    this.rig.lean *= 0.9;
    if (this.hopV !== 0 || this.hop > 0) {
      this.hop += this.hopV * s;
      this.hopV -= 1700 * s;
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; this.rig.land(0.5); }
    }

    this.bg.tilePositionX += move * 0.25;
    this.path.tilePositionX += move;
    for (var m = 0; m < this.laneMarks.length; m++) {
      var lm = this.laneMarks[m];
      lm.x -= move;
      if (lm.x < -40) lm.x += 900;
    }
    for (var q = 0; q < this.laneMarksPebble.length; q++) {
      var pe = this.laneMarksPebble[q];
      pe.x -= move;
      if (pe.x < -10) pe.x += 888;
    }

    // Draw the bike, then sit the rider on it: hips on the seat, hands on the bars
    var by = this.laneY - this.hop;
    var depth = 10 + this.lane * 3 + 1;
    var axle = by - 17;
    this.wheelB.setPosition(PX_ - 24, axle).setDepth(depth);
    this.wheelF.setPosition(PX_ + 24, axle).setDepth(depth);
    this.frame.setPosition(PX_, axle).setDepth(depth + 1).setRotation(this.rig.lean);
    this.laneBand.y = this.laneY - 4;
    this.shadow.setPosition(PX_, this.laneY - 2).setScale(1 - this.hop / 300);
    this.wheelB.anims.timeScale = this.wheelF.anims.timeScale = this.speed / 280;

    // Cranks turn with the wheels; the legs swap on each half-turn
    if (!this.done && !this.dead) this.crankA += this.speed * s * 0.03;
    var cx = PX_ - 2, ca = Math.cos(this.crankA) * 8, sa = Math.sin(this.crankA) * 8;
    this.crank.clear().setDepth(depth + 3);
    this.crank.lineStyle(3, 0x1a1620).lineBetween(cx - ca, axle - sa, cx + ca, axle + sa);
    this.crank.fillStyle(0x2a2430).fillRect(cx + ca - 4, axle + sa - 1, 8, 3).fillRect(cx - ca - 4, axle - sa - 1, 8, 3);
    this.crank.fillStyle(0x9a9aa8).fillCircle(cx, axle, 3);
    this.rig.pedal = Math.sin(this.crankA) > 0;
    this.rig.sprite.setDepth(depth + 2);
    this.rig.update(dt, PX_ - 10, by - 9, 'ride', 0.5);

    // Obstacles
    for (var i = this.things.length - 1; i >= 0; i--) {
      var t = this.things[i];
      t.x -= move;
      if (t.spin) { t.x -= 90 * s; t.spr.rotation -= s * 8; }
      if (t.kind === 'squirrel' && !this.done) {
        t.nextHop -= dt;
        if (t.nextHop <= 0 && t.x < 700 && t.x > PX_ + 60) {
          t.nextHop = 700;
          var nl = t.lane === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1;
          t.lane = nl; t.y = LANES[nl];
          this.tweens.add({ targets: t.spr, y: LANES[nl], duration: 220, ease: 'Quad.easeOut' });
          t.spr.setDepth(5 + nl * 3);
        }
        t.spr.rotation = Math.sin(time * 0.03) * 0.12;
      }
      t.spr.x = t.x;
      if (t.mark) {
        var danger = t.lane === this.lane && t.x - PX_ > -20 && t.x - PX_ < 480 && !t.cleared;
        t.mark.setPosition(t.x, LANES[t.lane] - 2).setDepth(4 + t.lane * 3);
        t.mark.setFillStyle(danger ? 0xffb000 : 0x000000, danger ? 0.7 : 0.3);
      }
      if (t.x < -80) { t.spr.destroy(); if (t.mark) t.mark.destroy(); this.things.splice(i, 1); continue; }
      if (t.gone || this.done || this.dead || t.lane !== this.lane) continue;
      if (Math.abs(t.x - PX_) > (t.w + 50) / 2) continue;

      if (t.kind === 'heart') {
        if (Math.abs(this.hop - t.h) < 50) {
          this.combo++;
          var pts = 100 + Math.min(this.combo, 10) * 10;
          addScore(this, pts);
          playSound('coin');
          spark(this, t.x, t.y);
          t.spr.destroy(); this.things.splice(i, 1);
        }
      } else if (t.low && this.hop > 18) {
        if (!t.cleared) {
          t.cleared = true;
          addScore(this, 50);
          popup(this, t.x, t.y - 50, 'NICE HOP +50', '#ffffff');
        }
      } else if (!t.cleared && this.rig.hurt <= 0) {
        this.hit(t);
      }
    }

    if (this.finishLine && !this.done) {
      this.finishLine.forEach(function(o) { o.x -= move; });
      if (this.finishLine[0].x < PX_) this.finish();
    }

    this.hud.set(this.score, this.lives, this.dist / GOAL);
  }

  hit(t) {
    t.cleared = true;
    this.combo = 0;
    this.lives--;
    gameState.lives = this.lives;
    this.cameras.main.shake(160, 0.008);
    burst(this, PX_ + 20, this.laneY - 30, t.kind === 'cookie' ? 0xc8873a : 0xb08050, 14);
    if (t.kind === 'cookie') popup(this, PX_, this.laneY - 100, 'NO COOKIES!', '#ffffff');
    if (this.lives <= 0) { this.dead = true; gameOver(this); return; }
    playSound('hurt');
    this.rig.flashHurt(1500);
  }

  spawnFinish() {
    var x = GAME_WIDTH + 150;
    var a = this.add.rectangle(x, LANES[2] + 4, 10, 170, 0xffffff).setOrigin(0.5, 1).setDepth(20);
    var b = this.add.rectangle(x, LANES[0] - 140, 10, 30, 0xffffff).setOrigin(0.5, 1).setDepth(2);
    var flagRow = this.add.rectangle(x, LANES[0] - 160, 14, 120, 0x1a1020).setOrigin(0.5, 0).setDepth(2);
    var txt = this.add.text(x, LANES[0] - 176, 'FINISH', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5).setDepth(21);
    var checker = [];
    for (var i = 0; i < 12; i++) {
      checker.push(this.add.rectangle(x, LANES[0] - 24 + i * 9, 10, 9, i % 2 ? 0x1a1020 : 0xffffff).setDepth(2 + Math.floor(i / 4) * 3));
    }
    this.finishLine = [a, b, flagRow, txt].concat(checker);
  }

  finish() {
    this.done = true;
    var bonus = this.lives * 500;
    addScore(this, bonus);
    this.tweens.add({ targets: this, hop: 60, duration: 300, yoyo: true });
    for (var i = 0; i < 6; i++) {
      this.time.delayedCall(i * 200, function() {
        burst(this, Phaser.Math.Between(150, 650), Phaser.Math.Between(80, 240), [0xffe066, 0xffffff, 0x9be37a][Phaser.Math.Between(0, 2)], 22);
        playSound('coin');
      }, null, this);
    }
    banner(this, 'WHAT A RIDE!', '#9be37a', 'LIVES BONUS +' + bonus);
    finishLevel(this, 2, this.score, this.lives);
  }
}
