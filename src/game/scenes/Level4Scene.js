import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, flashScreen, defeat,
  finishLevel, addScore, gameOver, playSound, gameState, rectsHit, takeDrag, isTouch, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 4: "Bear Mountain Climb" — magic-carpet shooter (Cheese Quest's space level, Hudson Valley edition).
// Fly anywhere, hold SPACE to throw hearts. Apples upgrade your shot.
// Survive the honking goose squadrons, then the final boss: Rufus + Daffy, who stole the
// wedding cake and turned it into a hot-air balloon. Tennis balls, sneakers, frosting.

var BOSS_AT = 36;
// Family cameo order matches the 'family' sprite strip
export var FAMILY = ['AARON', 'AMMA', 'APPA', 'LUKE', 'DADA', 'MAMA', 'RUTH'];

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
      [1.2, 'line', 160], [3, 'line', 340], [5, 'throwers'], [7.5, 'vee'],
      [9.5, 'line', 250], [10.5, 'bottle', 220], [12.5, 'throwers'], [15, 'vee'],
      [17, 'line', 150], [17.6, 'line', 350], [18.5, 'bottle', 300], [21, 'throwers'],
      [24, 'vee'], [26.5, 'line', 200], [28.5, 'throwers'], [31, 'bottle', 180], [32, 'vee'], [BOSS_AT, 'boss'],
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

    this.makeTextures();
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
        [170, 340].forEach(function(y, k) {
          self.addFoe({ x: GAME_WIDTH + 40 + k * 90, y: y, vx: -120, amp: 20, freq: 2, hp: 3, stopAt: 560 + k * 60, throws: true });
        });
      } else if (e[1] === 'bottle') {
        // Mark's giant water bottle upgrades your shot
        var a = this.add.image(GAME_WIDTH + 30, e[2], 'bottle').setDepth(8);
        this.pickups.push({ spr: a, x: a.x, y: e[2] });
      } else if (e[1] === 'boss') {
        this.spawnBoss();
      }
    }
  }

  addFoe(o) {
    // Canada geese flap in formation
    o.spr = (o.key ? this.add.image(o.x, o.y, o.key) : this.add.sprite(o.x, o.y, 'goose').play({ key: 'goose-flap', startFrame: Phaser.Math.Between(0, 1) })).setDepth(8);
    o.baseY = o.y;
    o.age = 0;
    o.pts = o.pts || 150;
    o.w = o.spr.width * (o.key ? 0.75 : 0.5); o.h = o.spr.height * (o.key ? 0.75 : 0.45);
    o.throwT = 900 + Math.random() * 800;
    this.foes.push(o);
  }

  spawnBoss() {
    var b = this.add.sprite(GAME_WIDTH + 120, 250, 'balloon-boss').play('boss-bob').setDepth(9);
    this.boss = { spr: b, hp: 70, max: 70, phase: 0, t: 0, atk: 1600, x: GAME_WIDTH + 120, y: 250 };
    flashScreen(this, 0x7a3cff, 0.4);
    playMusic('boss');
    banner(this, 'RUFUS & DAFFY!', '#ffe066', 'THEY STOLE THE WEDDING CAKE!');
    playSound('clear');
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 18, 404, 14, 0x1a1020).setDepth(300);
    this.bossBar = this.add.rectangle(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 18, 400, 10, 0xb98cff).setOrigin(0, 0.5).setDepth(301);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'RUFUS & DAFFY', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5).setDepth(301);
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
        if (!gone && this.boss && this.boss.hp > 0 && rectsHit(sh.x, sh.y, 12, 12, this.boss.x, this.boss.y, 120, 180)) {
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
      else o.spr.rotation = Math.sin(o.age * 3) * 0.06;
      o.spr.setPosition(o.x, o.y);
      if (o.throws && !this.done) {
        o.throwT -= dt;
        if (o.throwT <= 0 && o.x < GAME_WIDTH - 20) {
          o.throwT = 2300;
          var tx = this.px - o.x, ty = (this.py - 30) - o.y, tl = Math.hypot(tx, ty) || 1;
          this.enemyShot(o.x - 30, o.y - 6, 0, 0, tx / tl * 190, ty / tl * 190, 'feather');
          if (Math.random() < 0.35) popup(this, o.x, o.y - 40, 'HONK!', '#ffffff');
        }
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
      if (es.g) es.vy += es.g * s;
      es.x += es.vx * s; es.y += es.vy * s;
      es.spr.setPosition(es.x, es.y).rotation += s * 10;
      if (es.x < -20 || es.y < -20 || es.y > GAME_HEIGHT + 20 || es.x > GAME_WIDTH + 40) { es.spr.destroy(); this.enemyShots.splice(e, 1); continue; }
      if (!this.done && this.rig.hurt <= 0 && rectsHit(this.px, this.py - 30, 26, 40, es.x, es.y, es.r || 8, es.r || 8)) {
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
      if (rectsHit(this.px, this.py - 30, 40, 50, p.x, p.y, 34, 50)) {
        p.spr.destroy(); this.pickups.splice(a, 1);
        this.powerLv = Math.min(3, this.powerLv + 1);
        if (this.lives < 3) { this.lives++; gameState.lives = this.lives; popup(this, this.px, this.py - 70, '+1 LIFE', '#8fd3ff'); }
        addScore(this, 300);
        playSound('clear');
        flashScreen(this, 0x7a3cff, 0.35);
        banner(this, 'HYDRATED!', '#8fd3ff', this.powerLv === 3 ? 'MAX POWER' : 'SHOT POWER UP');
      }
    }

    if (this.boss) this.updateBoss(dt, s);
    this.updateFamToken(s);

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
      b.phase = (b.phase + 1) % 4;
      if (b.phase === 0) {
        // Daffy: slobbery sneakers in a fan
        var fan = angry ? 2 : 1;
        for (var i = -fan; i <= fan; i++) this.enemyShot(b.x - 30, b.y + 50, 230, i * 70, null, null, 'sneaker');
      } else if (b.phase === 3) {
        // frosting ring: everything at once, find the gap
        var gapA = Math.random() * Math.PI * 2;
        for (var q = 0; q < 10; q++) {
          var ang = q / 10 * Math.PI * 2;
          if (Math.abs(Math.atan2(Math.sin(ang - gapA), Math.cos(ang - gapA))) < 0.8) continue;
          this.enemyShot(b.x - 30, b.y, 0, 0, Math.cos(ang) * 170, Math.sin(ang) * 170, 'frosting');
        }
      } else if (b.phase === 1) {
        // they call in the geese
        for (var r = 0; r < (angry ? 4 : 3); r++) {
          this.addFoe({ x: GAME_WIDTH + 40 + r * 55, y: Phaser.Math.Between(140, 420), vx: -210, amp: 30, freq: 3, ph: r, hp: 2 });
        }
        popup(this, b.x - 40, b.y - 110, 'HONK HONK!', '#ffffff');
      } else {
        // Rufus: tennis balls lobbed in arcs that drop onto you
        for (var k = 0; k < (angry ? 3 : 2); k++) {
          this.time.delayedCall(k * 200, function() {
            if (!this.boss || this.boss.hp <= 0 || this.done) return;
            var tt = 1.0 + Math.random() * 0.3, ox = this.boss.x - 40, oy = this.boss.y + 40;
            this.enemyShot(ox, oy, 0, 0, (this.px - ox) / tt, ((this.py - 30 - oy) - 0.5 * 420 * tt * tt) / tt, 'tennisball', 420);
          }, null, this);
        }
      }
      b.atk = angry ? 1250 : 1600;
    }
  }

  enemyShot(x, y, speed, vyOff, vx, vy, key, g) {
    var spr = this.add.image(x, y, key || 'pebble').setDepth(9);
    var shot = { spr: spr, x: x, y: y, vx: vx != null ? vx : -speed, vy: vy != null ? vy : (vyOff || 0), g: g || 0, r: key && key !== 'pebble' ? 14 : 8 };
    this.enemyShots.push(shot);
    return shot;
  }

  makeTextures() {
    var g;
    if (!this.textures.exists('tennisball')) {
      g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1020).fillCircle(9, 9, 9);
      g.fillStyle(0xd8f04a).fillCircle(9, 9, 7);
      g.lineStyle(2, 0xffffff).beginPath().arc(2, 9, 6, -1.1, 1.1).strokePath().beginPath().arc(16, 9, 6, Math.PI - 1.1, Math.PI + 1.1).strokePath();
      g.generateTexture('tennisball', 18, 18); g.destroy();
    }
    if (!this.textures.exists('sneaker')) {
      g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1020).fillRoundedRect(0, 4, 28, 14, 5);
      g.fillStyle(0xf2f2f2).fillRoundedRect(2, 6, 24, 8, 4);
      g.fillStyle(0x4a7bd8).fillRoundedRect(4, 2, 14, 9, 4);
      g.fillStyle(0xffffff).fillRect(7, 5, 2, 2).fillRect(11, 5, 2, 2);
      g.fillStyle(0x8fd3ff).fillCircle(25, 17, 2).fillCircle(21, 19, 1.5);   // slobber
      g.generateTexture('sneaker', 30, 22); g.destroy();
    }
    if (!this.textures.exists('feather')) {
      g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1020).fillEllipse(10, 6, 20, 10);
      g.fillStyle(0xf3ead8).fillEllipse(10, 6, 16, 6);
      g.lineStyle(1, 0x8a7a6a).lineBetween(2, 6, 18, 6);
      g.generateTexture('feather', 20, 12); g.destroy();
    }
    if (!this.textures.exists('frosting')) {
      g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1020).fillCircle(9, 9, 9);
      g.fillStyle(0xfff6ec).fillCircle(9, 9, 7);
      g.fillStyle(0xff9ec7).fillCircle(7, 7, 3);
      g.generateTexture('frosting', 18, 18); g.destroy();
    }
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
    if (b.hp === Math.floor(b.max / 2)) banner(this, 'ZOOMIES!', '#d9b3ff', 'THEY GOT THE ZOOMIES');
    if (!this.famToken && !this.famUsed && b.hp <= b.max * 0.65) this.spawnFamToken();
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
    // the pups give up the cake: hearts everywhere, then they drift home for belly rubs
    for (var i = 0; i < 16; i++) {
      this.time.delayedCall(i * 110, function() {
        var h = self.add.image(b.x + Phaser.Math.Between(-60, 60), b.y + Phaser.Math.Between(-40, 60), 'heart').setDepth(20);
        self.tweens.add({ targets: h, y: h.y - Phaser.Math.Between(80, 160), alpha: 0, duration: 900, onComplete: function() { h.destroy(); } });
        if (i % 3 === 0) playSound('coin');
      });
    }
    popup(this, b.x, b.y - 110, 'GOOD PUPS! +5000', '#ffe066');
    this.tweens.add({ targets: b.spr, y: -260, x: b.x + 80, delay: 1400, duration: 2200, ease: 'Sine.easeIn' });
    var bonus = this.lives * 500;
    addScore(this, bonus);
    this.time.delayedCall(1300, function() { banner(self, 'CAKE SAVED!', '#ffe066', 'LIVES BONUS +' + bonus); });
    this.time.delayedCall(800, function() { finishLevel(self, 3, self.score, self.lives); });
  }

  // ── FAMILY POWER: grab the gold ring and both families fly in to help ──
  spawnFamToken() {
    var y = Phaser.Math.Between(170, 380);
    var ring = this.add.image(GAME_WIDTH + 30, y, 'ring').setScale(2).setDepth(10);
    var label = this.add.text(GAME_WIDTH + 30, y - 34, 'FAMILY', { fontFamily: FONT, fontSize: '9px', color: '#ffe066', stroke: '#1a1020', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: ring, scale: 2.5, duration: 350, yoyo: true, repeat: -1 });
    this.famToken = { ring: ring, label: label, x: GAME_WIDTH + 30, y: y, t: 0 };
    if (!this.famHinted) { this.famHinted = true; banner(this, 'GRAB THE RING!', '#ffe066', 'CALL IN THE FAMILY'); }
  }

  updateFamToken(s) {
    var f = this.famToken;
    if (!f || this.done) return;
    f.t += s;
    f.x -= 110 * s;
    var yy = f.y + Math.sin(f.t * 3) * 30;
    f.ring.setPosition(f.x, yy);
    f.label.setPosition(f.x, yy - 34);
    if (Math.random() < 0.15) spark(this, f.x + Phaser.Math.Between(-16, 16), yy + Phaser.Math.Between(-16, 16));
    if (rectsHit(this.px, this.py - 30, 44, 56, f.x, yy, 34, 34)) {
      f.ring.destroy(); f.label.destroy(); this.famToken = null;
      this.familyPower();
    } else if (f.x < -40) {
      // missed it: it comes back around
      f.ring.destroy(); f.label.destroy(); this.famToken = null;
      this.time.delayedCall(2500, function() { if (!this.done && !this.famUsed) this.spawnFamToken(); }, null, this);
    }
  }

  familyPower() {
    var self = this;
    this.famUsed = true;
    playSound('clear');
    flashScreen(this, 0xffd84a, 0.5);
    banner(this, 'FAMILY POWER!', '#ffe066', 'THE FAMILIES ARE HERE!');
    this.enemyShots.forEach(function(e) { spark(self, e.x, e.y); e.spr.destroy(); });
    this.enemyShots = [];
    this.foes.slice().forEach(function(f) { self.damageFoe(f, 0); self.damageFoe(f, 0); self.damageFoe(f, 0); });
    if (this.boss) this.boss.atk = 4200;
    this.rig.flashHurt(3500);   // safe while the family flies by

    // one long carpet carrying everyone, sweeping left to right
    var y = 150, startX = -360;
    var parts = [];
    var carpet = this.add.sprite(startX, y + 8, 'carpet').play('carpet-wave').setScale(4.6, 1.6).setDepth(20);
    parts.push({ o: carpet, dx: 0, dy: 8 });
    FAMILY.forEach(function(name, i) {
      var dx = -138 + i * 46;
      var p = self.add.sprite(startX + dx, y, 'cast', i).setOrigin(0.5, 1).setDepth(21);
      var t = self.add.text(startX + dx, y - 90, name, { fontFamily: FONT, fontSize: '7px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 3 }).setOrigin(0.5).setDepth(22);
      self.tweens.add({ targets: p, scaleY: 0.94, duration: 200 + i * 20, yoyo: true, repeat: -1 });
      parts.push({ o: p, dx: dx, dy: 0, who: true }, { o: t, dx: dx, dy: -90 });
    });
    var sweep = { x: startX };
    this.tweens.add({
      targets: sweep, x: GAME_WIDTH + 380, duration: 3600, ease: 'Sine.easeInOut',
      onUpdate: function() {
        var bob = Math.sin(sweep.x * 0.02) * 6;
        parts.forEach(function(q) { q.o.setPosition(sweep.x + q.dx, y + q.dy + bob); });
      },
      onComplete: function() { parts.forEach(function(q) { q.o.destroy(); }); },
    });
    // everyone throws love at Rufus + Daffy
    var throwers = parts.filter(function(q) { return q.who; });
    this.time.addEvent({ delay: 140, repeat: 22, callback: function() {
      var b = self.boss;
      if (!b || b.hp <= 0 || self.done) return;
      var q = throwers[Phaser.Math.Between(0, throwers.length - 1)];
      if (q.o.x < 0 || q.o.x > GAME_WIDTH) return;
      var h = self.add.image(q.o.x, q.o.y - 40, 'heart').setDepth(23).setScale(1.3);
      playSound('jump');
      self.tweens.add({ targets: h, x: b.x + Phaser.Math.Between(-30, 30), y: b.y + Phaser.Math.Between(-50, 50), duration: 420, ease: 'Quad.easeIn',
        onComplete: function() {
          if (self.boss && self.boss.hp > 0 && !self.done) self.damageBoss(h.x, h.y);
          burst(self, h.x, h.y, 0xffb3d9, 6);
          h.destroy();
        } });
    } });
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
    this.rig.flashHurt(2200);
  }
}
