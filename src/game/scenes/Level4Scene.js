import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, flashScreen, defeat,
  finishLevel, addScore, gameOver, playSound, gameState, rectsHit, takeDrag, isTouch, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 4: "Bear Mountain Climb" — magic-carpet shooter (Cheese Quest's space level, Hudson Valley edition).
// Fly anywhere, hold SPACE to throw hearts. Apples upgrade your shot.
// Survive the raccoon squadrons, then take down the BIG RACCOON.

var BOSS_AT = 42;

export class Level4Scene extends Phaser.Scene {
  constructor() { super('Level4'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.t = 0;
    this.px = 140;
    this.py = 250;
    this.cool = 0;
    this.powerLv = 1;
    this.shots = [];
    this.foes = [];
    this.enemyShots = [];
    this.pickups = [];
    this.boss = null;
    this.script = [
      [1.2, 'line', 140], [2.6, 'line', 340], [4.2, 'throwers'], [6, 'rain', 6], [7.5, 'vee'],
      [9.5, 'line', 240], [11, 'apple', 220], [12, 'rain', 5], [13, 'vee'],
      [18, 'line', 200], [18.6, 'line', 330], [21, 'throwers'], [24, 'apple', 300], [25, 'rain', 7],
      [28, 'vee'], [31, 'throwers'], [33, 'line', 140], [33.5, 'line', 380], [36, 'rain', 8], [37, 'apple', 180],
      [BOSS_AT, 'boss'],
    ];
  }

  create() {
    playMusic('level4');
    var self = this;
    this.cameras.main.fadeIn(250);
    this.bg = makeParallax(this, 'bg-level4');
    // drifting autumn leaves in front of the valley
    this.time.addEvent({ delay: 400, loop: true, callback: function() {
      var lf = self.add.image(GAME_WIDTH + 20, Phaser.Math.Between(40, GAME_HEIGHT - 40), 'leaf').setDepth(1).setAlpha(0.8);
      self.tweens.add({ targets: lf, x: -30, y: lf.y + Phaser.Math.Between(-60, 60), angle: 360, duration: Phaser.Math.Between(3500, 6000), onComplete: function() { lf.destroy(); } });
    } });

    this.carpet = this.add.sprite(0, 0, 'carpet').play('carpet-wave').setDepth(12);
    this.rig = new Rig(this, this.px, this.py, gameState.char);
    this.hud = new Hud(this, 'BEAR MOUNTAIN', { progress: 'BOSS' });
    this.controls = new Controls(this, 'track');

    // Touch: hero follows your finger and fires on its own
    this.drag = null;
    this.input.on('pointerdown', function(p) { self.drag = { x: p.x, y: p.y, px: self.px, py: self.py }; });
    this.input.on('pointermove', function(p) {
      if (!self.drag || !p.isDown) return;
      self.px = Phaser.Math.Clamp(self.drag.px + (p.x - self.drag.x) * 1.3, 40, GAME_WIDTH - 60);
      self.py = Phaser.Math.Clamp(self.drag.py + (p.y - self.drag.y) * 1.3, 125, GAME_HEIGHT - 20);
    });
    this.input.on('pointerup', function() { self.drag = null; });

    banner(this, 'GET READY!', '#ffe066', isTouch() ? 'DRAG TO FLY - HEARTS FIRE ON THEIR OWN' : 'ARROWS TO FLY - HOLD SPACE TO SHOOT');
  }

  // ── Spawners ──
  runScript() {
    while (this.script.length && this.t >= this.script[0][0]) {
      var e = this.script.shift();
      var self = this;
      if (e[1] === 'line') {
        for (var i = 0; i < 5; i++) this.addFoe({ x: GAME_WIDTH + 40 + i * 60, y: e[2], vx: -170, amp: 50, freq: 3, ph: i * 0.6, hp: 2 });
      } else if (e[1] === 'vee') {
        for (var v = 0; v < 7; v++) {
          var off = Math.abs(v - 3);
          this.addFoe({ x: GAME_WIDTH + 40 + off * 50, y: 250 + (v - 3) * 45, vx: -190, amp: 0, hp: 2 });
        }
      } else if (e[1] === 'throwers') {
        [130, 250, 370].forEach(function(y, k) {
          self.addFoe({ x: GAME_WIDTH + 40 + k * 90, y: y, vx: -120, amp: 20, freq: 2, hp: 3, stopAt: 560 + k * 60, throws: true });
        });
      } else if (e[1] === 'rain') {
        for (var r = 0; r < e[2]; r++) {
          this.time.delayedCall(r * 420, function() {
            self.addFoe({ x: Phaser.Math.Between(260, GAME_WIDTH + 60), y: -20, vx: -60, vy: 230, key: 'pinecone', hp: 1, pts: 50, spin: true });
          });
        }
      } else if (e[1] === 'apple') {
        var a = this.add.image(GAME_WIDTH + 30, e[2], 'apple').setDepth(8);
        this.pickups.push({ spr: a, x: a.x, y: e[2] });
      } else if (e[1] === 'boss') {
        this.spawnBoss();
      }
    }
  }

  addFoe(o) {
    // raccoons ride in little hot-air balloons; pinecones are just pinecones
    o.spr = (o.key ? this.add.image(o.x, o.y, o.key) : this.add.sprite(o.x, o.y, 'balloon-raccoon').play({ key: 'balloon-bob', startFrame: Phaser.Math.Between(0, 1) })).setDepth(8);
    o.baseY = o.y;
    o.age = 0;
    o.pts = o.pts || 150;
    o.w = o.spr.width * 0.75; o.h = o.spr.height * 0.75;
    o.throwT = 900 + Math.random() * 800;
    this.foes.push(o);
  }

  spawnBoss() {
    var b = this.add.sprite(GAME_WIDTH + 120, 250, 'balloon-boss').play('boss-bob').setScale(2.6).setDepth(9);
    this.boss = { spr: b, hp: 70, max: 70, phase: 0, t: 0, atk: 1500, x: GAME_WIDTH + 120, y: 250 };
    flashScreen(this, 0x7a3cff, 0.4);
    playMusic('boss');
    banner(this, 'BIG RACCOON!', '#d9b3ff', 'HE STOLE THE WEDDING CAKE');
    playSound('die');
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 18, 404, 14, 0x1a1020).setDepth(300);
    this.bossBar = this.add.rectangle(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 18, 400, 10, 0xb98cff).setOrigin(0, 0.5).setDepth(301);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'BIG RACCOON', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5).setDepth(301);
  }

  fire() {
    var self = this;
    var spreads = this.powerLv === 1 ? [0] : this.powerLv === 2 ? [-60, 60] : [-140, 0, 140];
    spreads.forEach(function(vy) {
      var s = self.add.image(self.px + 30, self.py - 30, 'bullet').setDepth(7);
      self.shots.push({ spr: s, x: s.x, y: s.y, vx: 620, vy: vy });
    });
    playSound('shoot');
    this.cool = 170;
  }

  update(time, dt) {
    var c = this.controls.poll();
    var s = dt / 1000;
    this.bg.tilePositionX += 60 * s;
    if (this.dead) { this.rig.update(dt, this.px, this.py, 'fall', 0); return; }
    if (!this.done) this.t += s;
    this.runScript();

    // Fly
    var sp = 300;
    var drag = takeDrag();
    var padDrag = false;
    if (!this.done) {
      this.px += drag.x * 1.6;
      this.py += drag.y * 1.6;
      if (c.left) this.px -= sp * s;
      if (c.right) this.px += sp * s;
      if (c.up) this.py -= sp * s;
      if (c.down) this.py += sp * s;
    }
    this.px = Phaser.Math.Clamp(this.px, 40, GAME_WIDTH - 60);
    this.py = Phaser.Math.Clamp(this.py, 125, GAME_HEIGHT - 20);
    this.rig.lean = Phaser.Math.Linear(this.rig.lean, c.up ? -0.12 : c.down ? 0.12 : 0, 0.2);
    this.carpet.setPosition(this.px, this.py - 4).setRotation(this.rig.lean * 0.6);
    this.rig.update(dt, this.px, this.py - 8, 'fly', 0.5);

    this.cool -= dt;
    if (!this.done && this.cool <= 0 && (c.fire || this.drag || padDrag || isTouch())) this.fire();

    // Player shots
    for (var i = this.shots.length - 1; i >= 0; i--) {
      var sh = this.shots[i];
      sh.x += sh.vx * s; sh.y += sh.vy * s;
      sh.spr.setPosition(sh.x, sh.y);
      var gone = sh.x > GAME_WIDTH + 20 || sh.y < -20 || sh.y > GAME_HEIGHT + 20;
      if (!gone) {
        for (var f = 0; f < this.foes.length; f++) {
          var fo = this.foes[f];
          if (rectsHit(sh.x, sh.y, 12, 12, fo.x, fo.y, fo.w, fo.h)) { this.damageFoe(fo, f); gone = true; break; }
        }
        if (!gone && this.boss && this.boss.hp > 0 && rectsHit(sh.x, sh.y, 12, 12, this.boss.x, this.boss.y, 130, 190)) {
          this.damageBoss(sh.x, sh.y); gone = true;
        }
      }
      if (gone) { sh.spr.destroy(); this.shots.splice(i, 1); }
    }

    // Foes
    for (var k = this.foes.length - 1; k >= 0; k--) {
      var o = this.foes[k];
      o.age += s;
      if (o.stopAt && o.x <= o.stopAt && o.age < 8) o.x = o.stopAt;
      else o.x += o.vx * s;
      o.y = o.vy ? o.y + o.vy * s : o.baseY + (o.amp ? Math.sin(o.age * o.freq + (o.ph || 0)) * o.amp : 0);
      if (o.spin) o.spr.rotation += s * 4;
      else o.spr.rotation = Math.sin(o.age * 3) * 0.08;   // gentle balloon sway
      o.spr.setPosition(o.x, o.y);
      if (o.throws && !this.done) {
        o.throwT -= dt;
        if (o.throwT <= 0) { o.throwT = 1600; this.enemyShot(o.x - 20, o.y, 220); }
      }
      if (o.x < -60 || o.y > GAME_HEIGHT + 40) { o.spr.destroy(); this.foes.splice(k, 1); continue; }
      if (!this.done && this.rig.hurt <= 0 && rectsHit(this.px, this.py - 30, 30, 44, o.x, o.y, o.w, o.h)) {
        this.hurt();
        this.damageFoe(o, k, true);
      }
    }

    // Enemy shots
    for (var e = this.enemyShots.length - 1; e >= 0; e--) {
      var es = this.enemyShots[e];
      es.x += es.vx * s; es.y += es.vy * s;
      es.spr.setPosition(es.x, es.y).rotation += s * 10;
      if (es.x < -20 || es.y < -20 || es.y > GAME_HEIGHT + 20 || es.x > GAME_WIDTH + 40) { es.spr.destroy(); this.enemyShots.splice(e, 1); continue; }
      if (!this.done && this.rig.hurt <= 0 && rectsHit(this.px, this.py - 30, 26, 40, es.x, es.y, 8, 8)) {
        es.spr.destroy(); this.enemyShots.splice(e, 1);
        this.hurt();
      }
    }

    // Apples
    for (var a = this.pickups.length - 1; a >= 0; a--) {
      var p = this.pickups[a];
      p.x -= 120 * s; p.y += Math.sin(this.t * 4) * 0.6;
      p.spr.setPosition(p.x, p.y).rotation = Math.sin(this.t * 5) * 0.2;
      if (p.x < -30) { p.spr.destroy(); this.pickups.splice(a, 1); continue; }
      if (rectsHit(this.px, this.py - 30, 40, 50, p.x, p.y, 26, 26)) {
        p.spr.destroy(); this.pickups.splice(a, 1);
        this.powerLv = Math.min(3, this.powerLv + 1);
        addScore(this, 300);
        playSound('clear');
        flashScreen(this, 0x7a3cff, 0.35);
        banner(this, this.powerLv === 3 ? 'MAX POWER!' : 'POWER UP!', '#d9b3ff');
      }
    }

    if (this.boss) this.updateBoss(dt, s);

    var prog = this.boss ? this.boss.hp / this.boss.max : this.t / BOSS_AT;
    this.hud.set(this.score, this.lives, this.boss ? 1 - prog : prog);
    if (this.boss && this.bossBar) this.bossBar.width = Math.max(0, 400 * prog);
    this.hud.setPower(this.powerLv > 1 ? 'SHOT LV ' + this.powerLv : '');
  }

  updateBoss(dt, s) {
    var b = this.boss;
    if (b.hp <= 0) return;
    b.t += s;
    var targetX = GAME_WIDTH - 130;
    if (b.x > targetX) b.x -= 80 * s;
    b.y = 240 + Math.sin(b.t * (b.hp < b.max / 2 ? 1.6 : 1)) * 120;
    b.spr.setPosition(b.x, b.y).rotation = Math.sin(b.t * 6) * 0.05;
    if (b.x > targetX + 5 || this.done) return;
    b.atk -= dt;
    if (b.atk <= 0) {
      var angry = b.hp < b.max / 2;
      b.phase = (b.phase + 1) % 3;
      if (b.phase === 0) {
        for (var i = -2; i <= 2; i++) this.enemyShot(b.x - 40, b.y + 60, 260, i * 70);
      } else if (b.phase === 1) {
        var self = this;
        for (var r = 0; r < (angry ? 7 : 5); r++) {
          this.time.delayedCall(r * 260, function() {
            self.addFoe({ x: Phaser.Math.Between(120, GAME_WIDTH - 200), y: -20, vx: -30, vy: 260, key: 'pinecone', hp: 1, pts: 50, spin: true });
          });
        }
      } else {
        var dx = this.px - b.x, dy = (this.py - 30) - b.y, len = Math.hypot(dx, dy) || 1;
        for (var k = 0; k < (angry ? 3 : 2); k++) {
          this.time.delayedCall(k * 180, function() {
            if (this.boss && this.boss.hp > 0) this.enemyShot(this.boss.x - 40, this.boss.y + 60, 0, 0, dx / len * 320, dy / len * 320);
          }, null, this);
        }
      }
      b.atk = angry ? 1100 : 1500;
    }
  }

  enemyShot(x, y, speed, vyOff, vx, vy) {
    var spr = this.add.image(x, y, 'pebble').setDepth(9);
    this.enemyShots.push({ spr: spr, x: x, y: y, vx: vx != null ? vx : -speed, vy: vy != null ? vy : (vyOff || 0) });
  }

  damageFoe(o, idx, silent) {
    o.hp -= silent ? 99 : 1;
    o.spr.setTintFill(0xffffff);
    this.time.delayedCall(60, function() { if (o.spr.active) o.spr.clearTint(); });
    if (o.hp > 0) return;
    if (!silent) {
      addScore(this, o.pts);
      popup(this, o.x, o.y - 20, '+' + o.pts);
      playSound('stomp');
    }
    spark(this, o.x, o.y);
    defeat(this, o.spr, o.key ? 0x9a6a3a : 0x9a9aa8);
    var at = this.foes.indexOf(o);
    if (at >= 0) this.foes.splice(at, 1);
    void idx;
  }

  damageBoss(x, y) {
    var b = this.boss;
    b.hp--;
    spark(this, x, y);
    b.spr.setTintFill(0xffffff);
    this.time.delayedCall(50, function() { if (b.spr.active) b.spr.clearTint(); });
    addScore(this, 20);
    if (b.hp === Math.floor(b.max / 2)) banner(this, "HE'S ANGRY!", '#d9b3ff');
    if (b.hp <= 0) this.bossDown();
  }

  bossDown() {
    var b = this.boss;
    var self = this;
    this.done = true;
    addScore(this, 5000);
    this.enemyShots.forEach(function(e) { e.spr.destroy(); });
    this.enemyShots = [];
    this.foes.forEach(function(f) { burst(self, f.x, f.y, 0x9a9aa8, 8); f.spr.destroy(); });
    this.foes = [];
    for (var i = 0; i < 10; i++) {
      this.time.delayedCall(i * 130, function() {
        burst(self, b.x + Phaser.Math.Between(-70, 70), b.y + Phaser.Math.Between(-60, 60), [0xffe066, 0xffffff, 0xd9b3ff][Phaser.Math.Between(0, 2)], 18);
        self.cameras.main.shake(100, 0.006);
        playSound('stomp');
      });
    }
    this.tweens.add({ targets: b.spr, y: GAME_HEIGHT + 200, angle: 200, alpha: 0.3, delay: 1200, duration: 900, ease: 'Quad.easeIn' });
    popup(this, b.x, b.y - 80, '+5000', '#ffffff');
    var bonus = this.lives * 500;
    addScore(this, bonus);
    this.time.delayedCall(1300, function() { banner(self, 'CAKE SAVED!', '#ffe066', 'LIVES BONUS +' + bonus); });
    this.time.delayedCall(800, function() { finishLevel(self, 3, self.score, self.lives); });
  }

  hurt() {
    if (this.rig.hurt > 0 || this.done) return;
    this.lives--;
    gameState.lives = this.lives;
    this.powerLv = Math.max(1, this.powerLv - 1);
    this.cameras.main.shake(160, 0.008);
    burst(this, this.px, this.py - 30, 0xffffff, 12);
    if (this.lives <= 0) { this.dead = true; gameOver(this); return; }
    playSound('hurt');
    this.rig.flashHurt(1600);
  }
}
