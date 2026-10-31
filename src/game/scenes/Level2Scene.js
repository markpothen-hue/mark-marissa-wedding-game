import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, warn, defeat, grabOneUp,
  setCheckpoint, getCheckpoint, finishLevel, addScore, gameOver, playSound, gameState, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 2: "Chinatown Dash" — 3-lane runner on foot.
// UP/DOWN switch lanes, JUMP over low stuff (crates, firecrackers), DUCK under lantern strings.
// Food carts roll at you, delivery e-bikes zoom in (a "!" and a bell warn you first),
// and halfway through a lion-dance dragon weaves across all three lanes.

var LANES = [380, 424, 468];
var PX_ = 170;
var GOAL = 21000;
var LION_AT = 0.55;

export class Level2Scene extends Phaser.Scene {
  constructor() { super('Level2'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.dist = getCheckpoint(1) || 0;
    this.cpDone = this.dist > 0;
    this.speed = 270;
    this.lane = 1;
    this.laneY = LANES[1];
    this.hop = 0;
    this.hopV = 0;
    this.airJumps = 0;
    this.nextWave = 600;
    this.things = [];
    this.combo = 0;
    this.lion = null;
    this.lionDone = this.dist > GOAL * LION_AT;
    var start = this.dist;
    this.oneUps = [0.3, 0.75].filter(function(p) { return p * GOAL > start; });
    this.endGate = null;
  }

  create() {
    playMusic('level2');
    this.cameras.main.fadeIn(250);
    this.bg = makeParallax(this, 'bg-level2');
    // wet street with lane dashes; the painted reflections show through
    this.add.rectangle(0, LANES[0] - 24, GAME_WIDTH, GAME_HEIGHT, 0x15101c, 0.6).setOrigin(0).setDepth(1);
    this.curb = this.add.tileSprite(0, LANES[0] - 40, GAME_WIDTH, 16, 'street').setOrigin(0).setDepth(1);
    this.marks = [];
    for (var l = 0; l < 2; l++) {
      for (var d = 0; d < 9; d++) {
        this.marks.push(this.add.rectangle(d * 100, (LANES[l] + LANES[l + 1]) / 2 - 4, 40, 3, 0xffe066, 0.45).setDepth(2));
      }
    }
    this.shadow = this.add.ellipse(PX_, LANES[1], 46, 10, 0x000000, 0.35).setDepth(3);
    this.rig = new Rig(this, PX_, LANES[1], gameState.char);
    this.hud = new Hud(this, 'CHINATOWN DASH', { progress: 'PAVILION' });
    this.controls = new Controls(this, 'runner3');
    if (this.cpDone) banner(this, 'CHECKPOINT', '#ffe066', 'PICKING UP HALFWAY');
    else banner(this, 'RUN!', '#ffe066', 'UP/DOWN: LANES  SPACE: JUMP  SHIFT: DUCK');
  }

  // ── Spawning ──
  spawnWave() {
    var d = this.dist / GOAL;
    var x = GAME_WIDTH + 60;
    var r = Phaser.Math.Between;
    var max = d < 0.25 ? 3 : d < 0.5 ? 5 : 7;
    var pick = r(0, max);
    var a = r(0, 2), b = (a + r(1, 2)) % 3, c = 3 - a - b;
    if (pick === 0) { this.addCrate(x, a); this.foodRow(x - 40, b, 4); }
    else if (pick === 1) { this.addLanterns(x, a); if (d > 0.3) this.addLanterns(x, b); this.foodRow(x - 20, c, 3); }
    else if (pick === 2) { this.addFire(x, a); this.foodArc(x, a); }
    else if (pick === 3) { this.addCart(x, a); this.foodRow(x, b, 3); }
    else if (pick === 4) { this.addEbike(x, a); }
    else if (pick === 5) { this.addLanterns(x, a); this.addCrate(x + 40, b); this.addFire(x + 220, c); }
    else if (pick === 6) { this.addCart(x, a); this.addCart(x + 30, b); this.foodRow(x, c, 4); }
    else { this.addEbike(x, a); this.addFire(x + 260, b); }
    if (Math.random() < 0.1) this.addFood(x + 160, r(0, 2), 60, true);
    if (this.oneUps.length && d > this.oneUps[0]) { this.oneUps.shift(); this.addOneUp(x + 120, r(0, 2)); }
    this.nextWave = r(300, 420) + this.speed * 0.25 - d * 60;
  }

  track(t) {
    t.y = LANES[t.lane];
    t.vx = t.vx || 0;
    t.parts.forEach(function(p) {
      if (p.dx == null) p.dx = p.x - t.x;
      p.setDepth((p.dd || 0) + 5 + t.lane * 3);
    });
    this.things.push(t);
    return t;
  }

  addCrate(x, lane) {
    var p = this.add.image(x, LANES[lane], 'crate').setOrigin(0.5, 1);
    return this.track({ kind: 'low', x: x, lane: lane, parts: [p], w: 30, clear: 24 });
  }

  addFire(x, lane) {
    var p = this.add.image(x, LANES[lane], 'firecracker').setOrigin(0.5, 1);
    var self = this;
    var ev = this.time.addEvent({ delay: 180, loop: true, callback: function() {
      if (p.active) spark(self, p.x + Phaser.Math.Between(-12, 12), p.y - Phaser.Math.Between(10, 30));
    } });
    return this.track({ kind: 'low', x: x, lane: lane, parts: [p], w: 28, clear: 24, ev: ev, pop: true });
  }

  addLanterns(x, lane) {
    // a gate planted IN its lane: posts stand on the lane, a glowing strip marks the ground
    var y = LANES[lane];
    var glow = this.add.rectangle(x, y - 3, 136, 14, 0xffd84a, 0.6);
    glow.dd = -2;
    var parts = [glow,
      this.add.rectangle(x - 62, y, 6, 78, 0xd9a640).setOrigin(0.5, 1).setStrokeStyle(2, 0x1a1020),
      this.add.rectangle(x + 62, y, 6, 78, 0xd9a640).setOrigin(0.5, 1).setStrokeStyle(2, 0x1a1020),
      this.add.rectangle(x, y - 77, 132, 5, 0xd9a640).setStrokeStyle(2, 0x1a1020)];
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 400, yoyo: true, repeat: -1 });
    for (var i = 0; i < 3; i++) {
      var lx = x - 40 + i * 40;
      var str = this.add.rectangle(lx, y - 75, 2, 6, 0x1a1020).setOrigin(0.5, 0);
      var l = this.add.image(lx, y - 70, 'lantern').setOrigin(0.5, 0);
      this.tweens.add({ targets: l, angle: 8, duration: 500 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      parts.push(str, l);
    }
    return this.track({ kind: 'duck', x: x, lane: lane, parts: parts, w: 120 });
  }

  addCart(x, lane) {
    var p = this.add.image(x, LANES[lane], 'cart').setOrigin(0.5, 1);
    return this.track({ kind: 'tall', x: x, lane: lane, parts: [p], w: 60, clear: 58, vx: -70 });
  }

  addEbike(x, lane) {
    // warn first, then it arrives fast with its headlight on
    var self = this;
    warn(this, LANES[lane] - 30, 1100);
    this.time.delayedCall(250, function() { playSound('coin'); });
    this.time.delayedCall(1100, function() {
      if (self.done || self.dead) return;
      var y = LANES[lane];
      var wb = self.add.sprite(x - 24, y - 17, 'wheel').play('wheel-spin');
      var wf = self.add.sprite(x + 24, y - 17, 'wheel').play('wheel-spin');
      var fr = self.add.image(x, y - 17, 'bikeframe').setOrigin(0.5, 39 / 40).setFlipX(true);
      var rider = self.add.image(x + 6, y - 22, 'courier').setOrigin(0.5, 1);
      var light = self.add.ellipse(x - 70, y - 30, 70, 18, 0xfff3b0, 0.35);
      rider.dd = 1;
      self.track({ kind: 'tall', x: x, lane: lane, parts: [wb, wf, fr, light, rider], w: 70, clear: 999, vx: -330 });
    });
  }

  foodRow(x, lane, n) { for (var i = 0; i < n; i++) this.addFood(x + i * 46, lane, 0); }
  foodArc(x, lane) { for (var i = 0; i < 4; i++) this.addFood(x - 60 + i * 40, lane, Math.sin((i / 3) * Math.PI) * 70 + 20); }

  addFood(x, lane, h, gold) {
    var p = this.add.image(x, LANES[lane] - 18 - h, 'dumpling');
    if (gold) p.setTint(0xffd84a);
    this.tweens.add({ targets: p, scaleY: 0.85, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return this.track({ kind: gold ? 'gold' : 'food', x: x, lane: lane, parts: [p], w: 30, h: h });
  }

  addOneUp(x, lane) {
    var p = this.add.image(x, LANES[lane] - 30, 'oneup').setScale(2);
    this.tweens.add({ targets: p, y: p.y - 8, duration: 500, yoyo: true, repeat: -1 });
    return this.track({ kind: 'oneup', x: x, lane: lane, parts: [p], w: 30, h: 10 });
  }

  // ── Lion dance: head picks a lane (with a warning), the body follows its path ──
  startLion() {
    var self = this;
    this.lionDone = true;
    banner(this, 'LION DANCE!', '#ffd84a', 'STAY OUT OF ITS LANE');
    var head = this.add.image(GAME_WIDTH + 80, LANES[1], 'lionhead').setOrigin(0.5, 1).setScale(2).setFlipX(true);
    var segs = [];
    for (var i = 0; i < 5; i++) {
      segs.push(this.add.sprite(GAME_WIDTH + 160 + i * 64, LANES[1], 'lionbody').setOrigin(0.5, 1).setScale(2).play('lion-walk'));
    }
    this.lion = { head: head, segs: segs, lane: 1, laneY: LANES[1], t: 0, next: 1.4, hist: [], x: GAME_WIDTH + 80 };
    this.time.addEvent({ delay: 300, repeat: 20, callback: function() { if (self.lion) playSound('stomp'); } });
  }

  updateLion(s) {
    var L = this.lion;
    L.t += s;
    // drifts across slowly while weaving between lanes
    L.x -= (L.t < 2.2 ? 140 : 75) * s;
    L.next -= s;
    if (L.next <= 0 && L.x < GAME_WIDTH - 60) {
      var nl = L.lane === 1 ? (Math.random() < 0.5 ? 0 : 2) : (Math.random() < 0.6 ? 1 : 2 - L.lane);
      warn(this, LANES[nl] - 40, 600, 40);
      L.lane = nl;
      L.next = 1.5;
    }
    L.laneY += (LANES[L.lane] - L.laneY) * Math.min(1, s * 3);
    L.hist.unshift(L.laneY);
    if (L.hist.length > 200) L.hist.pop();
    L.head.setPosition(L.x, L.laneY + Math.sin(L.t * 9) * 4).setDepth(5 + this.depthFor(L.laneY));
    L.head.rotation = Math.sin(L.t * 6) * 0.08;
    var hits = [{ x: L.x, y: L.laneY, w: 70, body: false }];
    for (var i = 0; i < L.segs.length; i++) {
      var sy = L.hist[Math.min(L.hist.length - 1, (i + 1) * 9)];
      var sx = L.x + 70 + i * 62;
      L.segs[i].setPosition(sx, sy + Math.sin(L.t * 9 - (i + 1) * 0.8) * 4).setDepth(5 + this.depthFor(sy));
      hits.push({ x: sx, y: sy, w: 56, body: true });
    }
    // the head always hurts; the body can be jumped
    if (!this.done && this.rig.hurt <= 0) {
      for (var h = 0; h < hits.length; h++) {
        var c = hits[h];
        if (Math.abs(c.y - this.laneY) < 20 && Math.abs(c.x - PX_) < (c.w + 24) / 2) {
          if (c.body && this.hop > 46) continue;
          this.hit('lion');
          break;
        }
      }
    }
    if (L.x + 70 + L.segs.length * 62 < -40) {
      L.head.destroy();
      L.segs.forEach(function(sg) { sg.destroy(); });
      this.lion = null;
      addScore(this, 1000);
      popup(this, GAME_WIDTH / 2, 160, 'LION DANCE CLEARED! +1000', '#ffd84a');
      burst(this, GAME_WIDTH / 2, 180, 0xffd84a, 24);
      playSound('clear');
    }
  }

  depthFor(y) { return (y - LANES[0]) / (LANES[1] - LANES[0]) * 3; }

  update(time, dt) {
    var c = this.controls.poll();
    var s = dt / 1000;
    if (this.dead) { this.rig.update(dt, PX_, this.laneY - this.hop, 'fall', 0); return; }

    var running = !this.done;
    if (running) {
      this.speed = 270 + 160 * Math.min(1, this.dist / GOAL);
      this.dist += this.speed * s;
      if (!this.cpDone && this.dist > GOAL * 0.5) {
        this.cpDone = true;
        setCheckpoint(1, Math.round(GOAL * 0.5));
        popup(this, PX_, this.laneY - 110, 'CHECKPOINT!', '#ffffff');
        playSound('select');
      }
      if (!this.lionDone && this.dist > GOAL * LION_AT) this.startLion();
      if (!this.lion) {
        this.nextWave -= this.speed * s;
        if (this.nextWave <= 0 && this.dist < GOAL - 700) this.spawnWave();
      }
      if (this.dist >= GOAL - 700 && !this.endGate) this.spawnGate();

      if (c.upHit && this.lane > 0) { this.lane--; playSound('select'); }
      if (c.downHit && this.lane < 2) { this.lane++; playSound('select'); }
      var mark = gameState.char === 'mark';
      if (c.jumpHit) {
        if (this.hop === 0) { this.hopV = mark ? 700 : 640; playSound('jump'); this.airJumps = mark ? 0 : 1; }
        else if (this.airJumps > 0) { this.hopV = 560; this.airJumps--; playSound('jump'); burst(this, PX_, this.laneY - this.hop, 0xffd36b, 10); }
      }
    }
    var move = running ? this.speed * s : 0;
    var ducking = running && c.duck && this.hop === 0;

    // hop arc + lane glide
    if (!c.jump && this.hopV > 250) this.hopV *= 0.88;
    if (this.hopV !== 0 || this.hop > 0) {
      this.hop += this.hopV * s;
      this.hopV -= (c.duck ? 4200 : 1900) * s;
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; this.rig.land(0.6); }
    }
    this.laneY += (LANES[this.lane] - this.laneY) * Math.min(1, s * 14);

    this.bg.tilePositionX += move * 0.3;
    this.curb.tilePositionX += move;
    for (var m = 0; m < this.marks.length; m++) {
      this.marks[m].x -= move;
      if (this.marks[m].x < -40) this.marks[m].x += 900;
    }

    var depth = 5 + this.depthFor(this.laneY) + 1.5;
    this.shadow.setPosition(PX_, this.laneY - 2).setScale(1 - this.hop / 260).setDepth(depth - 1);
    this.rig.sprite.setDepth(depth);
    var mode = !running ? 'idle' : ducking ? 'duck' : this.hop > 0 ? (this.hopV > 0 ? 'rise' : 'fall') : 'run';
    this.rig.update(dt, PX_, this.laneY - this.hop, mode, (this.speed - 220) / 250);

    // obstacles
    for (var i = this.things.length - 1; i >= 0; i--) {
      var t = this.things[i];
      t.x -= move - (running ? t.vx * s : 0);
      for (var p = 0; p < t.parts.length; p++) t.parts[p].x = t.x + t.parts[p].dx;
      if (t.x < -160) { this.kill(t, i); continue; }
      if (t.gone || !running || t.lane !== this.lane) continue;
      if (Math.abs(t.x - PX_) > (t.w + 24) / 2) continue;

      if (t.kind === 'food' || t.kind === 'gold' || t.kind === 'oneup') {
        if (Math.abs(this.hop - t.h) < 50) {
          if (t.kind === 'oneup') grabOneUp(this, t.x, t.parts[0].y);
          else {
            this.combo++;
            var pts = t.kind === 'gold' ? 888 : 100 + Math.min(this.combo, 10) * 10;
            addScore(this, pts);
            playSound('coin');
            spark(this, t.x, t.parts[0].y);
            if (t.kind === 'gold') { popup(this, t.x, t.parts[0].y - 20, '+888 LUCKY!'); burst(this, t.x, t.parts[0].y, 0xffd84a, 16); }
          }
          this.kill(t, i);
        }
      } else if (t.kind === 'duck' && ducking) {
        if (!t.cleared) { t.cleared = true; addScore(this, 50); popup(this, PX_, this.laneY - 70, 'NICE DUCK +50', '#ffffff'); }
      } else if ((t.kind === 'low' || t.kind === 'tall') && this.hop > t.clear) {
        if (!t.cleared) {
          t.cleared = true;
          var big = t.kind === 'tall';
          addScore(this, big ? 150 : 50);
          popup(this, t.x, t.y - 70, big ? 'HUGE JUMP +150' : 'NICE HOP +50', '#ffffff');
        }
      } else if (!t.cleared && this.rig.hurt <= 0) {
        t.cleared = true;
        this.hit(t.kind, t);
      }
    }

    if (this.lion) this.updateLion(s);

    if (this.endGate && running) {
      this.endGate.list.forEach(function(o) { o.x -= move; });
      if (this.endGate.list[0].x < PX_) this.finish();
    }
    this.hud.set(this.score, this.lives, this.dist / GOAL);
  }

  kill(t, i) {
    t.parts.forEach(function(p) { p.destroy(); });
    if (t.ev) t.ev.remove();
    this.things.splice(i, 1);
  }

  hit(kind, t) {
    this.combo = 0;
    this.lives--;
    gameState.lives = this.lives;
    this.cameras.main.shake(160, 0.008);
    burst(this, PX_ + 20, this.laneY - 40, 0xb08050, 14);
    if (kind === 'duck') popup(this, PX_, this.laneY - 110, 'DUCK!', '#ffffff');
    if (t && t.pop) {
      var self = this;
      t.parts.forEach(function(p) { defeat(self, p, 0xffd84a); });
      t.parts = [];
    }
    if (this.lives <= 0) { this.dead = true; gameOver(this); return; }
    playSound('hurt');
    this.rig.flashHurt(1500);
  }

  spawnGate() {
    var x = GAME_WIDTH + 200;
    var y = LANES[2] + 6;
    var list = [];
    list.push(this.add.rectangle(x, y, 18, 260, 0x8b1a2b).setOrigin(0.5, 1).setDepth(20));
    list.push(this.add.rectangle(x - 180, y - 70, 18, 190, 0x8b1a2b).setOrigin(0.5, 1).setDepth(2));
    list.push(this.add.rectangle(x - 90, y - 262, 240, 22, 0x2a6a3a).setDepth(21));
    list.push(this.add.rectangle(x - 90, y - 238, 200, 30, 0x1a1020).setStrokeStyle(3, 0xdaa520).setDepth(21));
    list.push(this.add.text(x - 90, y - 238, 'GOLDEN PAVILION', { fontFamily: FONT, fontSize: '10px', color: '#ffd84a' }).setOrigin(0.5).setDepth(22));
    for (var i = 0; i < 4; i++) {
      var l = this.add.image(x - 165 + i * 50, y - 250, 'lantern').setOrigin(0.5, 0).setDepth(22);
      this.tweens.add({ targets: l, angle: 6, duration: 600, yoyo: true, repeat: -1 });
      list.push(l);
    }
    this.endGate = { list: list };
  }

  finish() {
    if (this.done) return;
    this.done = true;
    var bonus = this.lives * 500;
    addScore(this, bonus);
    for (var i = 0; i < 6; i++) {
      this.time.delayedCall(i * 200, function() {
        burst(this, Phaser.Math.Between(150, 650), Phaser.Math.Between(80, 240), [0xffd84a, 0xffffff, 0xd9b3ff][Phaser.Math.Between(0, 2)], 22);
        playSound('coin');
      }, null, this);
    }
    banner(this, 'DINNER IS SERVED!', '#ffd84a', 'LIVES BONUS +' + bonus);
    finishLevel(this, 1, this.score, this.lives);
  }
}
