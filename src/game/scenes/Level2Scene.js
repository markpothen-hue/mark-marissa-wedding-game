import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner,
  finishLevel, addScore, gameOver, playSound, gameState, rectsHit, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 2: "Chinatown Dash" — auto-runner.
// You run on your own. JUMP over crates and food carts, DUCK under lantern strings,
// eat dumplings. Golden dumplings are worth 888. It keeps getting faster.

var GY = 444;
var PX_ = 170;
var GOAL = 21000;

export class Level2Scene extends Phaser.Scene {
  constructor() { super('Level2'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.dist = 0;
    this.speed = 300;
    this.y = GY;
    this.vy = 0;
    this.grounded = true;
    this.airJumps = 0;
    this.nextChunk = 900;
    this.things = [];
    this.endGate = null;
  }

  create() {
    playMusic('level2');
    this.cameras.main.fadeIn(250);
    this.bg = makeParallax(this, 'bg-level2');
    // curb strip on top, the painted wet street shows through underneath
    this.add.rectangle(0, GY + 16, GAME_WIDTH, GAME_HEIGHT - GY, 0x15101c, 0.55).setOrigin(0).setDepth(1);
    this.street = this.add.tileSprite(0, GY, GAME_WIDTH, 16, 'street').setOrigin(0).setDepth(1);
    this.rig = new Rig(this, PX_, GY, gameState.char);
    this.hud = new Hud(this, 'CHINATOWN DASH', { progress: 'PAVILION' });
    this.controls = new Controls(this, 'runner');
    banner(this, 'RUN!', '#ffe066', 'JUMP: SPACE / UP    DUCK: DOWN');
  }

  // ── Spawning: hand-made chunks, picked by difficulty ──
  spawnChunk() {
    var d = this.dist / GOAL; // 0..1
    var x = GAME_WIDTH + 60;
    var pool = [this.chCrate, this.chCart, this.chLantern, this.chDumplingRow];
    if (d > 0.2) pool.push(this.chStack, this.chCartThenLantern);
    if (d > 0.45) pool.push(this.chDouble, this.chLanternRun, this.chStack);
    if (d > 0.7) pool.push(this.chGauntlet, this.chCartThenLantern);
    var fn = pool[Phaser.Math.Between(0, pool.length - 1)];
    var len = fn.call(this, x);
    if (Math.random() < 0.12) this.addDumpling(x + len + 60, GY - 120, true);
    this.nextChunk = len + Phaser.Math.Between(220, 360) + this.speed * 0.35;
  }

  chCrate(x) { this.addCrates(x, 1); this.dumplingArc(x - 40, 120, 3); return 60; }
  chStack(x) { this.addCrates(x, 2); this.dumplingArc(x - 60, 170, 5); return 70; }
  chCart(x) { this.addCart(x); this.dumplingArc(x - 50, 180, 5); return 110; }
  chLantern(x) { this.addLanterns(x, 3); this.dumplingRow(x, GY - 16, 3); return 150; }
  chDumplingRow(x) { this.dumplingRow(x, GY - 20, 6); return 260; }
  chCartThenLantern(x) { this.addCart(x); this.addLanterns(x + 300, 3); return 440; }
  chDouble(x) { this.addCrates(x, 1); this.addCrates(x + 210, 2); return 260; }
  chLanternRun(x) { this.addLanterns(x, 3); this.addLanterns(x + 200, 3); this.dumplingRow(x + 20, GY - 16, 6); return 350; }
  chGauntlet(x) { this.addCrates(x, 1); this.addLanterns(x + 220, 3); this.addCart(x + 470); return 560; }

  addThing(o) { this.things.push(o); return o; }

  addCrates(x, n) {
    var parts = [];
    for (var i = 0; i < n; i++) parts.push(this.add.image(x, GY - i * 36, 'crate').setOrigin(0.5, 1).setDepth(5));
    this.addThing({ kind: 'hit', x: x, parts: parts, w: 30, h: n * 36 - 6, cy: GY - (n * 36) / 2 });
  }

  addCart(x) {
    var p = this.add.image(x, GY, 'cart').setOrigin(0.5, 1).setDepth(5);
    var steam = this.time.addEvent({ delay: 260, loop: true, callback: function() {
      if (p.active) burst(this, p.x + 10, p.y - 56, 0xffffff, 1);
    }, callbackScope: this });
    this.addThing({ kind: 'hit', x: x, parts: [p], w: 64, h: 44, cy: GY - 22, ev: steam });
  }

  addLanterns(x, n) {
    var parts = [];
    var w = n * 40;
    var line = this.add.rectangle(x, GY - 104, w + 30, 3, 0x1a1020).setDepth(5);
    parts.push(line);
    for (var i = 0; i < n; i++) {
      var lx = x - w / 2 + 20 + i * 40;
      var str = this.add.rectangle(lx, GY - 103, 2, 14, 0x1a1020).setOrigin(0.5, 0).setDepth(5);
      var l = this.add.image(lx, GY - 90, 'lantern').setOrigin(0.5, 0).setDepth(5);
      this.tweens.add({ targets: l, angle: 8, duration: 500 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90 });
      parts.push(str, l);
    }
    // hitbox: from the top of the screen down to 48px above the street
    this.addThing({ kind: 'hit', x: x, parts: parts, w: w, h: GY - 50, cy: (GY - 50) / 2, duck: true });
  }

  dumplingRow(x, y, n) { for (var i = 0; i < n; i++) this.addDumpling(x + i * 44, y); }
  dumplingArc(x, h, n) {
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      this.addDumpling(x + t * 140, GY - 30 - Math.sin(t * Math.PI) * h);
    }
  }
  addDumpling(x, y, gold) {
    var p = this.add.image(x, y, 'dumpling').setOrigin(0.5, 1).setDepth(4);
    if (gold) p.setTint(0xffd84a);
    this.tweens.add({ targets: p, y: y - 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x % 5) * 80 });
    this.addThing({ kind: gold ? 'gold' : 'food', x: x, parts: [p], w: 26, h: 26, cy: y - 14 });
  }

  update(time, dt) {
    var c = this.controls.poll();
    var s = dt / 1000;
    if (this.dead) { this.rig.update(dt, PX_, this.y, 'fall', 0); return; }

    if (!this.done) {
      this.speed = 300 + 260 * Math.min(1, this.dist / GOAL);
      this.dist += this.speed * s;
      this.nextChunk -= this.speed * s;
      if (this.nextChunk <= 0 && this.dist < GOAL - 600) this.spawnChunk();
      if (this.dist >= GOAL - 600 && !this.endGate) this.spawnGate();
    }
    var move = this.done ? 0 : this.speed * s;
    this.bg.tilePositionX += move * 0.3;
    this.street.tilePositionX += move;

    // Jump / duck physics
    var mark = gameState.char === 'mark';
    var ducking = c.down && this.grounded && !this.done;
    if (c.jumpHit && !this.done) {
      if (this.grounded) { this.vy = mark ? -830 : -760; this.grounded = false; playSound('jump'); }
      else if (this.airJumps > 0) { this.vy = -680; this.airJumps--; playSound('jump'); burst(this, PX_, this.y, 0xffd36b, 10); }
    }
    if (!c.jump && this.vy < -250) this.vy *= 0.85;
    if (!this.grounded) {
      this.vy += (c.down ? 5200 : 2300) * s;
      this.y += this.vy * s;
      if (this.y >= GY) {
        this.y = GY; this.grounded = true; this.airJumps = mark ? 0 : 1;
        this.rig.land(Math.min(1, this.vy / 900)); this.vy = 0;
      }
    } else {
      this.airJumps = mark ? 0 : 1;
    }

    // Move everything left and check hits
    var ph = ducking ? 34 : 68;
    var pcy = this.y - ph / 2;
    for (var i = this.things.length - 1; i >= 0; i--) {
      var t = this.things[i];
      t.x -= move;
      for (var j = 0; j < t.parts.length; j++) t.parts[j].x -= move;
      if (t.x < -150) { this.kill(t, i); continue; }
      if (t.gone || this.done) continue;
      if (rectsHit(PX_, pcy, 30, ph, t.x, t.cy, t.w, t.h)) {
        if (t.kind === 'food' || t.kind === 'gold') {
          var pts = t.kind === 'gold' ? 888 : 100;
          addScore(this, pts);
          playSound('coin');
          spark(this, t.x, t.cy);
          if (t.kind === 'gold') { popup(this, t.x, t.cy - 20, '+888 LUCKY!'); burst(this, t.x, t.cy, 0xffd84a, 16); }
          this.kill(t, i);
        } else if (this.rig.hurt <= 0) {
          this.hit(t);
        }
      }
    }

    if (this.endGate && !this.done) {
      this.endGate.x -= move;
      this.endGate.list.forEach(function(o) { o.x -= move; });
      if (this.endGate.x < PX_ + 20) this.finish();
    }

    var mode = this.done ? 'idle' : ducking ? 'duck' : !this.grounded ? (this.vy < 0 ? 'rise' : 'fall') : 'run';
    this.rig.update(dt, PX_, this.y, mode, (this.speed - 250) / 300);
    this.hud.set(this.score, this.lives, this.dist / GOAL);
  }

  kill(t, i) {
    t.parts.forEach(function(p) { p.destroy(); });
    if (t.ev) t.ev.remove();
    this.things.splice(i, 1);
  }

  hit(t) {
    this.lives--;
    gameState.lives = this.lives;
    this.cameras.main.shake(160, 0.008);
    burst(this, PX_ + 20, this.y - 40, 0xb08050, 14);
    if (t.duck) popup(this, PX_, this.y - 90, 'DUCK!', '#ffffff');
    if (this.lives <= 0) { this.dead = true; gameOver(this); return; }
    playSound('hurt');
    this.rig.flashHurt(1500);
  }

  spawnGate() {
    var x = GAME_WIDTH + 200;
    var list = [];
    list.push(this.add.rectangle(x - 90, GY, 18, 210, 0x8b1a2b).setOrigin(0.5, 1).setDepth(2));
    list.push(this.add.rectangle(x + 90, GY, 18, 210, 0x8b1a2b).setOrigin(0.5, 1).setDepth(2));
    list.push(this.add.rectangle(x, GY - 210, 240, 22, 0x2a6a3a).setDepth(2));
    list.push(this.add.rectangle(x, GY - 186, 200, 30, 0x1a1020).setStrokeStyle(3, 0xdaa520).setDepth(2));
    list.push(this.add.text(x, GY - 186, 'GOLDEN PAVILION', { fontFamily: FONT, fontSize: '10px', color: '#ffd84a' }).setOrigin(0.5).setDepth(3));
    for (var i = 0; i < 4; i++) {
      var l = this.add.image(x - 75 + i * 50, GY - 196, 'lantern').setOrigin(0.5, 0).setDepth(3);
      this.tweens.add({ targets: l, angle: 6, duration: 600, yoyo: true, repeat: -1 });
      list.push(l);
    }
    this.endGate = { x: x, list: list };
  }

  finish() {
    if (this.done) return;
    this.done = true;
    var bonus = this.lives * 500;
    addScore(this, bonus);
    for (var i = 0; i < 6; i++) {
      this.time.delayedCall(i * 200, function() {
        burst(this, Phaser.Math.Between(150, 650), Phaser.Math.Between(80, 240), [0xffd84a, 0xffffff, 0xd9b3ff][i % 3], 22);
        playSound('coin');
      }, null, this);
    }
    banner(this, 'DINNER IS SERVED!', '#ffd84a', 'LIVES BONUS +' + bonus);
    finishLevel(this, 1, this.score, this.lives);
  }
}
