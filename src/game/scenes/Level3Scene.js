import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, warn,
  setCheckpoint, getCheckpoint, finishLevel, addScore, gameOver, playSound, gameState, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 3: "Central Park Ride" — 3-lane bike dodger.
// UP/DOWN switches lanes, SPACE hops. Hop over low stuff (cookies, puddles),
// switch lanes around benches, watch the squirrels — they change lanes on you.
// The cookies are a trap. Do NOT eat the cookies. Grab hearts instead.
// Specials: RAMPS launch you into big air over everything; the TURBO bolt
// (Mark's comically large water bottle) gives a few seconds of top speed where you smash straight through obstacles.
// Set pieces: the lion dance parades through the park, and later the cycling
// club blows past from behind ("ON YOUR LEFT!") — pick the lane they leave open.

var LANES = [392, 434, 476];
var PX_ = 180;
var GOAL = 20000;
var TURBO_MS = 4500;
var AIR_V = 760, AIR_G = 1100;   // ramp launch: ~260px peak, ~1.4s airtime
var LION_AT = 0.3;
var PACK_AT = 0.72;
var JERSEYS = [0x7a3cff, 0x2bb5a8, 0xffb000, 0x3f7a3a, 0x4a7bd8, 0xff9ec7];

export class Level3Scene extends Phaser.Scene {
  constructor() { super('Level3'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.dist = getCheckpoint(2) || 0;
    this.cpDone = this.dist > 0;
    this.speed = 280;
    this.lane = 1;
    this.laneY = LANES[1];
    this.hop = 0;      // height above the path
    this.hopV = 0;
    this.nextWave = 700;
    this.things = [];
    this.finishLine = null;
    this.combo = 0;
    this.turbo = 0;
    this.air = false;
    this.nextSpecial = 2200;
    this.specialN = 0;
    this.lion = null;
    this.lionDone = this.dist > GOAL * LION_AT;
    this.pack = null;
    this.packDone = this.dist > GOAL * PACK_AT;
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
    this.makeTextures();
    this.glow = this.add.ellipse(0, 0, 120, 60, 0xffe066, 0.35).setDepth(3).setVisible(false);
    this.lines = this.add.graphics().setDepth(30);
    this.rig = new Rig(this, PX_, LANES[1], gameState.char);
    this.rig.sprite.setDepth(11);

    this.hud = new Hud(this, 'CENTRAL PARK RIDE', { progress: 'FINISH' });
    this.controls = new Controls(this, 'lanes');
    if (this.cpDone) banner(this, 'CHECKPOINT', '#ffe066', 'PICKING UP HALFWAY');
    else banner(this, 'RIDE!', '#ffe066', "DON'T EAT THE COOKIES");
  }

  makeTextures() {
    if (!this.textures.exists('ramp')) {
      var r = this.make.graphics({ add: false });
      r.fillStyle(0x5a3a20).fillPoints([{ x: 0, y: 40 }, { x: 88, y: 40 }, { x: 88, y: 0 }], true);
      r.fillStyle(0xc08850).fillPoints([{ x: 5, y: 38 }, { x: 85, y: 38 }, { x: 85, y: 5 }], true);
      r.lineStyle(2, 0x8a5a30);
      for (var k = 1; k < 5; k++) r.lineBetween(k * 17, 38, k * 17, 38 - k * 17 * 33 / 80);
      r.fillStyle(0xffe066);
      for (k = 0; k < 2; k++) r.fillPoints([{ x: 46 + k * 16, y: 28 }, { x: 54 + k * 16, y: 24 }, { x: 46 + k * 16, y: 20 }], true);
      r.generateTexture('ramp', 88, 40);
      r.destroy();
    }
  }

  // Ramp (with a bench to sail over and a heart trail in the air) or a TURBO bolt
  spawnSpecial() {
    var x = GAME_WIDTH + 60;
    var lane = Phaser.Math.Between(0, 2);
    if (this.specialN++ % 2 === 0) {
      var ramp = this.add.image(x, LANES[lane] + 2, 'ramp').setOrigin(0.5, 1).setDepth(5 + lane * 3);
      this.things.push({ kind: 'ramp', x: x, lane: lane, y: LANES[lane], spr: ramp, w: 60 });
      this.tweens.add({ targets: ramp, scaleY: 1.06, duration: 300, yoyo: true, repeat: -1 });
      this.add3('bench', x + this.speed * 0.7, lane);   // you sail right over it
      for (var i = 1; i <= 6; i++) {
        var t = i * 0.2;
        this.addHeart(x + 40 + this.speed * t, lane, Math.max(30, AIR_V * t - AIR_G / 2 * t * t));
      }
    } else {
      var tok = this.add.image(x, LANES[lane] - 44, 'bottle').setDepth(6 + lane * 3);
      this.tweens.add({ targets: tok, y: LANES[lane] - 56, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: tok, angle: 12, duration: 200, yoyo: true, repeat: -1 });
      this.things.push({ kind: 'turbo', x: x, lane: lane, y: LANES[lane], spr: tok, w: 34 });
    }
    this.nextWave = Math.max(this.nextWave, this.speed * 1.6);
  }

  startTurbo() {
    this.turbo = TURBO_MS;
    playSound('clear');
    this.cameras.main.flash(180, 255, 240, 160);
    banner(this, 'HYDRATED!', '#8fd3ff', 'TURBO: SMASH RIGHT THROUGH');
  }

  smash(t) {
    t.cleared = true;
    t.gone = true;
    addScore(this, 100);
    playSound('stomp');
    burst(this, t.x, t.y - 20, 0xffe066, 12);
    popup(this, t.x, t.y - 60, 'SMASH +100', '#ffe066');
    if (t.mark) t.mark.setVisible(false);
    this.tweens.add({ targets: t.spr, y: t.y - 160, angle: 540, alpha: 0, duration: 600, ease: 'Quad.easeOut' });
  }

  // You can't be hurt while on TURBO, flying off a ramp, or still blinking from a hit
  safe() { return this.done || this.dead || this.turbo > 0 || this.hop > 70 || this.rig.hurt > 0; }

  // ── Lion dance: head picks a lane (with a warning), the body follows its path ──
  startLion() {
    var self = this;
    this.lionDone = true;
    banner(this, 'LION DANCE!', '#ffe066', 'STAY OUT OF ITS LANE');
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
    L.head.setPosition(L.x, L.laneY + Math.sin(L.t * 9) * 4).setDepth(this.depthFor(L.laneY) + 1);
    L.head.rotation = Math.sin(L.t * 6) * 0.08;
    var hits = [{ x: L.x, y: L.laneY, w: 70, body: false }];
    for (var i = 0; i < L.segs.length; i++) {
      var sy = L.hist[Math.min(L.hist.length - 1, (i + 1) * 9)];
      var sx = L.x + 70 + i * 62;
      L.segs[i].setPosition(sx, sy + Math.sin(L.t * 9 - (i + 1) * 0.8) * 4).setDepth(this.depthFor(sy));
      hits.push({ x: sx, y: sy, w: 56, body: true });
    }
    // the head always hurts; the body can be hopped
    if (!this.safe()) {
      for (var h = 0; h < hits.length; h++) {
        var c = hits[h];
        if (Math.abs(c.y - this.laneY) < 20 && Math.abs(c.x - PX_) < (c.w + 24) / 2) {
          if (c.body && this.hop > 46) continue;
          this.hit({ kind: 'lion' });
          break;
        }
      }
    }
    if (L.x + 70 + L.segs.length * 62 < -40) {
      L.head.destroy();
      L.segs.forEach(function(sg) { sg.destroy(); });
      this.lion = null;
      if (!this.done) {
        addScore(this, 1000);
        popup(this, GAME_WIDTH / 2, 160, 'LION DANCE CLEARED! +1000', '#ffe066');
        burst(this, GAME_WIDTH / 2, 180, 0xffe066, 24);
        playSound('clear');
      }
    }
  }

  depthFor(y) { return 5 + (y - LANES[0]) / (LANES[1] - LANES[0]) * 3; }

  // ── Cycling club: rows of riders overtake you from behind, two lanes at a time ──
  startPack() {
    this.packDone = true;
    banner(this, 'ON YOUR LEFT!', '#9be37a', 'THE CYCLING CLUB IS COMING');
    this.pack = { riders: [], rows: 0, next: 1.8, free: Phaser.Math.Between(0, 2) };
  }

  makeCyclist(lane, x, jersey) {
    var c = this.add.container(x, LANES[lane]).setDepth(5 + lane * 3 + 1);
    var axle = -17;
    var wb = this.add.sprite(-24, axle, 'wheel').play('wheel-spin');
    var wf = this.add.sprite(24, axle, 'wheel').play('wheel-spin');
    var fr = this.add.image(0, axle, 'bikeframe').setOrigin(0.5, 39 / 40);
    var g = this.add.graphics();
    var skin = [0x8a5a3c, 0xc8936a, 0x6b4430, 0xe0b48a][Phaser.Math.Between(0, 3)];
    g.lineStyle(6, 0x2a2430).lineBetween(-6, -46, 2, -28).lineBetween(2, -28, -2, -18);   // legs
    g.lineStyle(5, skin).lineBetween(-2, -24, -2, -18);
    g.fillStyle(0x2a2430).fillRect(-12, -52, 14, 9);                                      // shorts
    g.lineStyle(11, jersey).lineBetween(-6, -52, 12, -66);                                 // jersey, leaning in
    g.lineStyle(2, 0xffffff).lineBetween(-4, -56, 10, -66);
    g.lineStyle(4, skin).lineBetween(12, -64, 22, -48);                                    // arm to the bars
    g.fillStyle(skin).fillCircle(18, -74, 7);                                              // head
    g.fillStyle(jersey).fillEllipse(17, -79, 18, 9);                                       // helmet
    g.lineStyle(1, 0x1a1020).strokeEllipse(17, -79, 18, 9);
    g.fillStyle(0x1a1020).fillRect(19, -76, 6, 3);                                         // shades
    c.add([wb, wf, fr, g]);
    return { spr: c, lane: lane, x: x };
  }

  updatePack(s) {
    var P = this.pack;
    P.next -= s;
    if (P.rows < 4 && P.next <= 0 && !this.done) {
      // telegraph the two lanes they'll fill on the left edge, then send them
      var free = P.free, self = this;
      var lanes = [0, 1, 2].filter(function(l) { return l !== free; });
      lanes.forEach(function(l) { warn(self, LANES[l] - 40, 900, 24); });
      this.time.delayedCall(950, function() {
        if (!self.pack) return;
        lanes.forEach(function(l, k) {
          for (var n = 0; n < 2; n++) {
            var r = self.makeCyclist(l, -60 - n * 90 - k * 40, JERSEYS[(P.rows * 2 + k + n) % JERSEYS.length]);
            self.pack.riders.push(r);
          }
        });
        var lead = self.pack.riders[self.pack.riders.length - 4];
        var shout = self.add.text(0, -100, 'ON YOUR LEFT!', {
          fontFamily: FONT, fontSize: '10px', color: '#1a1020', backgroundColor: '#ffffff', padding: { x: 4, y: 3 },
        }).setOrigin(0.5);
        lead.spr.add(shout);
        playSound('select');
      });
      P.rows++;
      P.next = 2.3;
      P.free = (free + Phaser.Math.Between(1, 2)) % 3;   // the open lane moves every row
    }
    for (var i = P.riders.length - 1; i >= 0; i--) {
      var r = P.riders[i];
      r.x += 300 * s;
      r.spr.x = r.x;
      r.spr.y = LANES[r.lane] + Math.sin(r.x * 0.05) * 1.5;
      if (!this.safe() && r.lane === this.lane && Math.abs(r.x - PX_) < 44) this.hit({ kind: 'cyclist' });
      if (r.x > GAME_WIDTH + 100) { r.spr.destroy(); P.riders.splice(i, 1); }
    }
    if (P.rows >= 4 && P.next < 0.9 && P.riders.length === 0) {
      this.pack = null;
      if (!this.done) {
        addScore(this, 1000);
        popup(this, GAME_WIDTH / 2, 160, 'KEPT UP WITH THE CLUB! +1000', '#9be37a');
        burst(this, GAME_WIDTH / 2, 180, 0x9be37a, 24);
        playSound('clear');
      }
    }
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
      this.speed = (280 + 240 * Math.min(1, this.dist / GOAL)) * (this.turbo > 0 ? 1.9 : 1);
      if (this.turbo > 0) {
        this.turbo -= dt;
        if (this.turbo <= 0) popup(this, PX_, this.laneY - 110, 'TURBO OVER', '#ffffff');
      }
      if (!this.lionDone && this.dist > GOAL * LION_AT) this.startLion();
      if (!this.packDone && this.dist > GOAL * PACK_AT) this.startPack();
      var setPiece = this.lion || this.pack;
      if (!setPiece) this.nextSpecial -= this.speed * s;
      if (this.nextSpecial <= 0 && this.dist < GOAL - 1800) { this.spawnSpecial(); this.nextSpecial = 2600; }
      this.dist += this.speed * s;
      if (!this.cpDone && this.dist > GOAL * 0.5) {
        this.cpDone = true;
        setCheckpoint(2, Math.round(GOAL * 0.5));
        popup(this, PX_, this.laneY - 110, 'CHECKPOINT!', '#ffffff');
        playSound('select');
      }
      if (!setPiece) this.nextWave -= this.speed * s;
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
      this.hopV -= (this.air ? AIR_G : 1700) * s;
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; this.air = false; this.rig.land(0.5); }
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
    // TURBO: golden glow under the bike + speed lines streaking past
    var on = this.turbo > 0 && !this.done && !this.dead;
    this.glow.setVisible(on).setPosition(PX_, by - 30).setAlpha(on ? 0.25 + Math.sin(time * 0.03) * 0.12 : 0);
    this.lines.clear();
    if (on) {
      for (var sl = 0; sl < 14; sl++) {
        this.lines.lineStyle(2, sl % 3 ? 0xffffff : 0xffe066, 0.55);
        var ly = Phaser.Math.Between(60, 470), lx = Phaser.Math.Between(0, GAME_WIDTH);
        this.lines.lineBetween(lx, ly, lx + Phaser.Math.Between(40, 120), ly);
      }
    }
    if (this.air) this.frame.setRotation(-0.25 + Math.min(0.5, (AIR_V - this.hopV) / AIR_V * 0.25));

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

      if (t.kind === 'ramp') {
        if (!t.used && this.hop < 10 && Math.abs(t.x - PX_) < 24) {
          t.used = true;
          this.air = true;
          this.hopV = AIR_V;
          playSound('jump');
          addScore(this, 200);
          popup(this, PX_, this.laneY - 120, 'BIG AIR! +200', '#ffe066');
        }
        continue;
      }
      if (t.kind === 'turbo') {
        if (this.hop < 90) {
          spark(this, t.x, t.spr.y);
          t.spr.destroy(); this.things.splice(i, 1);
          this.startTurbo();
        }
        continue;
      }
      if (t.kind === 'heart') {
        if (Math.abs(this.hop - t.h) < 50) {
          this.combo++;
          var pts = 100 + Math.min(this.combo, 10) * 10;
          addScore(this, pts);
          playSound('coin');
          spark(this, t.x, t.y);
          t.spr.destroy(); this.things.splice(i, 1);
        }
      } else if (this.turbo > 0) {
        this.smash(t);
      } else if ((t.low && this.hop > 18) || this.hop > 70) {
        if (!t.cleared) {
          t.cleared = true;
          addScore(this, 50);
          popup(this, t.x, t.y - 50, t.low ? 'NICE HOP +50' : 'SOARING +50', '#ffffff');
        }
      } else if (!t.cleared && this.rig.hurt <= 0) {
        this.hit(t);
      }
    }

    if (this.lion) this.updateLion(s);
    if (this.pack) this.updatePack(s);

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
    // A big wedding flower arch over the path, with a finish tape on the ground under it
    var x = GAME_WIDTH + 200;
    var base = LANES[0] - 8, half = 120, postH = 150, rise = 60;
    var arch = this.add.graphics().setDepth(2);
    arch.x = x;
    arch.fillStyle(0xf3ead8).fillRect(-half - 7, base - postH, 14, postH).fillRect(half - 7, base - postH, 14, postH);
    arch.lineStyle(2, 0x5a4a3a).strokeRect(-half - 7, base - postH, 14, postH).strokeRect(half - 7, base - postH, 14, postH);
    var pts = [];
    for (var k = 0; k <= 24; k++) {
      var a = Math.PI * (1 - k / 24);
      pts.push({ x: Math.cos(a) * half, y: base - postH - Math.sin(a) * rise });
    }
    arch.lineStyle(12, 0x3f7a3a);
    for (k = 0; k < 24; k++) arch.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    var cols = [0xff9ec7, 0xffffff, 0xffe066, 0xc9a7ff];
    for (k = 0; k <= 24; k++) {
      arch.fillStyle(0x5aa04a).fillCircle(pts[k].x + (k % 2 ? 6 : -6), pts[k].y + 4, 4);
      arch.fillStyle(cols[k % 4]).fillCircle(pts[k].x, pts[k].y - 2, 6);
      arch.fillStyle(0xffe066).fillCircle(pts[k].x, pts[k].y - 2, 2);
    }
    // flowers climbing the posts
    for (k = 0; k < 8; k++) {
      var fy = base - 14 - k * 18;
      arch.fillStyle(cols[(k + 1) % 4]).fillCircle(-half + (k % 2 ? 6 : -6), fy, 4).fillCircle(half + (k % 2 ? -6 : 6), fy, 4);
    }
    // banner hangs from the top
    var by = base - postH - rise + 8;
    arch.lineStyle(2, 0x5a4a3a).lineBetween(-50, by, -50, by + 16).lineBetween(50, by, 50, by + 16);
    arch.fillStyle(0xfff6e0).fillRect(-74, by + 16, 148, 32);
    arch.lineStyle(3, 0x3f7a3a).strokeRect(-74, by + 16, 148, 32);
    var txt = this.add.text(x, by + 33, 'FINISH', { fontFamily: FONT, fontSize: '16px', color: '#3f7a3a' }).setOrigin(0.5).setDepth(3);
    // finish tape across the path
    var tape = [];
    for (var i = 0; i < 12; i++) {
      tape.push(this.add.rectangle(x, LANES[0] - 20 + i * 9.5, 10, 9, i % 2 ? 0x1a1020 : 0xffffff).setDepth(2));
    }
    this.finishLine = [tape[0], arch, txt].concat(tape.slice(1));
  }

  finish() {
    this.done = true;
    this.turbo = 0;
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
