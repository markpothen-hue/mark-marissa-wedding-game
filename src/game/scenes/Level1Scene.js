import Phaser from 'phaser';
import { playMusic } from '../audio';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, flashScreen, defeat, grabOneUp,
  setCheckpoint, getCheckpoint, finishLevel, addScore, gameOver, playSound, gameState, rectsHit, GAME_WIDTH, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 1: "Fort Lee to Blue Angel" — hand-built side-scrolling platformer.
// Every surface you can stand on is drawn. Stomp squirrels and boulders, ride the
// moving ledges, grab the ring for a LOVE POWER UP, slide down the flag.
// Playing as Marissa, two extras show up: a microphone (she SINGS and clears every enemy on screen)
// and a BLACK BELT (karate-chop anything you touch, and jump in mid-air for a flying kick).

var GY = 430;          // top of the sidewalk
var LEN = 6600;        // level length
var GROUND = [[0, 900], [1010, 1700], [1840, 2400], [2760, 3620], [3730, 4400], [4820, 5500], [5640, LEN]];
var LEDGES = [         // [x, y, tiles(32px)]
  [340, 350, 3], [540, 285, 3],
  [1160, 345, 4], [1380, 275, 3],
  [1900, 350, 3], [2060, 290, 3], [2220, 230, 3],
  [2950, 350, 5], [3230, 295, 3], [3400, 235, 3],
  [3800, 355, 3], [3990, 295, 3], [4170, 235, 2],
  [4470, 375, 2],
  [5000, 345, 4], [5220, 285, 3],
  [5750, 350, 3], [5900, 290, 3],
];
var MOVERS = [         // [x, y, tiles, dx, dy, ms]
  [2440, 380, 3, 200, 0, 2200],
  [4620, 330, 2, 0, 90, 1600],
];
var SQUIRRELS = [[700, 560, 880], [2000, 1860, 2380], [3500, 2780, 3600], [5150, 4840, 5480], [5950, 5660, 6150]];
var PIGEONS = [[2660, 250], [4950, 230], [6050, 240]];   // [x, perch y]
var CANS = [1520, 3100, 4250, 5380];                                              // trash cans with raccoons
var THROWERS = [[2268, 230], [4202, 235], [5268, 285]];                            // acorn squirrels on ledges
var ONEUPS = [[2560, 300], [4700, 250]];
var BOULDERS = [[1100, 1650], [2900, 3560], [4900, 5460], [5700, 6150]]; // [trigger x, spawn x]
var RINGS = [[1410, 220], [4190, 180]];
var MICS = [[3300, 380], [5680, 380]];   // Marissa only
var BELTS = [[2300, 380], [4300, 380]];  // Marissa only
var CHECKPOINT = 3000;
var FLAG_X = 6300;

export class Level1Scene extends Phaser.Scene {
  constructor() { super('Level1'); }

  init() {
    this.score = 0;
    this.lives = gameState.lives > 0 ? gameState.lives : 3;
    this.done = false;
    this.dead = false;
    this.coyote = 0;
    this.buffer = 0;
    this.airJumps = 0;
    this.power = 0;
    this.belt = 0;
    this.kick = 0;
    this.kicked = false;
    this.spawnX = getCheckpoint(0) || 100;
    this.chain = 0;
    this.pigeons = [];
    this.cans = [];
    this.wasGround = true;
    this.boulderTriggered = {};
  }

  create() {
    playMusic('level1');
    var self = this;
    this.physics.world.setBounds(0, -200, LEN, GAME_HEIGHT + 400);
    this.physics.world.gravity.y = 1500;
    this.cameras.main.setBounds(0, 0, LEN, GAME_HEIGHT);
    this.cameras.main.fadeIn(250);
    this.bg = makeParallax(this, 'bg-level1');

    // Hudson river shimmer at the bottom of every pit
    this.water = this.add.rectangle(0, GY + 40, LEN, 100, 0x2a2a6e).setOrigin(0).setDepth(-50);
    for (var wx = 0; wx < LEN; wx += 46) {
      var glint = this.add.rectangle(wx, GY + 52 + (wx % 3) * 8, 14, 2, 0x8f8fe0).setOrigin(0).setDepth(-49);
      this.tweens.add({ targets: glint, alpha: 0.2, duration: 600 + (wx % 5) * 140, yoyo: true, repeat: -1 });
    }

    // Ground
    this.solids = this.physics.add.staticGroup();
    GROUND.forEach(function(g) {
      var w = g[1] - g[0];
      self.add.tileSprite(g[0], GY, w, GAME_HEIGHT - GY, 'ground').setOrigin(0).setDepth(1);
      var z = self.add.zone(g[0] + w / 2, GY + 40, w, 80);
      self.physics.add.existing(z, true);
      self.solids.add(z);
    });

    // Ledges (one-way: you can jump up through them)
    this.ledges = this.physics.add.staticGroup();
    LEDGES.forEach(function(l) {
      var w = l[2] * 32;
      self.add.tileSprite(l[0], l[1], w, 16, 'ledge').setOrigin(0).setDepth(1);
      var z = self.add.zone(l[0] + w / 2, l[1] + 6, w, 12);
      self.physics.add.existing(z, true);
      z.body.checkCollision.down = z.body.checkCollision.left = z.body.checkCollision.right = false;
      self.ledges.add(z);
    });

    // Moving ledges
    this.movers = [];
    MOVERS.forEach(function(m) {
      var w = m[2] * 32;
      var vis = self.add.tileSprite(m[0], m[1], w, 16, 'ledge').setOrigin(0).setDepth(1).setTint(0xffe7b0);
      var body = self.physics.add.image(m[0] + w / 2, m[1] + 6, null).setVisible(false);
      body.body.setSize(w, 12).setAllowGravity(false).setImmovable(true);
      body.body.checkCollision.down = body.body.checkCollision.left = body.body.checkCollision.right = false;
      body.ox = m[0] + w / 2; body.oy = m[1] + 6; body.dx = m[3]; body.dy = m[4]; body.ms = m[5]; body.vis = vis; body.w = w;
      self.movers.push(body);
    });

    // Hearts: lines on ledges, arcs over gaps
    this.hearts = this.physics.add.group({ allowGravity: false });
    LEDGES.forEach(function(l, i) {
      if (i % 2 === 0) self.heartLine(l[0] + 16, l[1] - 30, l[2], 32);
    });
    for (var gi = 0; gi < GROUND.length - 1; gi++) {
      this.heartArc(GROUND[gi][1] - 40, GROUND[gi + 1][0] + 40, GY - 70, 90, 5);
    }
    this.heartLine(160, GY - 40, 4, 40);
    this.heartLine(3250, GY - 40, 6, 40);

    // Rings (power-up)
    this.rings = this.physics.add.group({ allowGravity: false });
    RINGS.forEach(function(r) {
      var ring = self.rings.create(r[0], r[1], 'ring').setScale(1.5);
      self.tweens.add({ targets: ring, y: r[1] - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      self.time.addEvent({ delay: 500, loop: true, callback: function() { if (ring.active) spark(self, ring.x + Phaser.Math.Between(-10, 10), ring.y + Phaser.Math.Between(-10, 10)); } });
    });

    // Microphones (Marissa's SING power)
    this.makeMic();
    this.makeBelt();
    this.mics = this.physics.add.group({ allowGravity: false });
    this.belts = this.physics.add.group({ allowGravity: false });
    if (gameState.char === 'marissa') {
      BELTS.forEach(function(m) {
        var bt = self.belts.create(m[0], m[1], 'blackbelt');
        self.tweens.add({ targets: bt, y: m[1] - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        self.time.addEvent({ delay: 450, loop: true, callback: function() { if (bt.active) spark(self, bt.x + Phaser.Math.Between(-14, 14), bt.y + Phaser.Math.Between(-8, 8)); } });
      });
      MICS.forEach(function(m) {
        var mic = self.mics.create(m[0], m[1], 'mic');
        self.tweens.add({ targets: mic, y: m[1] - 10, angle: 10, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        self.time.addEvent({ delay: 380, loop: true, callback: function() {
          if (mic.active) self.note(mic.x + Phaser.Math.Between(-12, 12), mic.y - 16, 30, 600);
        } });
      });
    }

    // Enemies
    this.enemies = this.physics.add.group();
    SQUIRRELS.forEach(function(s) {
      var e = self.enemies.create(s[0], GY - 20, 'squirrel-run').play('squirrel-run');
      e.kind = 'squirrel'; e.minX = s[1]; e.maxX = s[2]; e.speed = 70;
      e.body.setSize(44, 34).setOffset(12, 18);
      e.setVelocityX(-e.speed).setDepth(5);
    });

    // Squirrels on ledges that lob acorns at you
    this.acorns = this.physics.add.group();
    THROWERS.forEach(function(t) {
      var e = self.enemies.create(t[0], t[1] - 26, 'squirrel-run', 2);
      e.kind = 'thrower'; e.body.setAllowGravity(false).setImmovable(true);
      e.body.setSize(44, 34).setOffset(12, 18);
      e.setDepth(5); e.throwT = 1200;
    });

    // Pigeons perched up high: they coo, a shadow marks the spot, then they dive
    PIGEONS.forEach(function(pg) {
      var spr = self.add.sprite(pg[0], pg[1], 'pigeon', 0).setDepth(6);
      self.pigeons.push({ spr: spr, state: 'perch', t: 0, x0: pg[0], y0: pg[1] });
    });

    // Trash cans: solid to stand on; a raccoon pops out on a rhythm
    CANS.forEach(function(x, i) {
      var can = self.add.image(x, GY, 'trashcan').setOrigin(0.5, 1).setDepth(4);
      var z = self.add.zone(x, GY - 17, 26, 34);
      self.physics.add.existing(z, true);
      self.solids.add(z);
      var rc = self.add.sprite(x, GY - 6, 'raccoon-run', 0).setOrigin(0.5, 1).setDepth(3);
      self.cans.push({ can: can, rc: rc, x: x, t: i * 900, up: false, alive: true });
    });

    // 1-ups
    this.oneups = this.physics.add.group({ allowGravity: false });
    ONEUPS.forEach(function(o) {
      var h = self.oneups.create(o[0], o[1], 'oneup').setScale(2);
      self.tweens.add({ targets: h, y: o[1] - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Checkpoint + flag + Blue Angel sign
    this.cp = this.add.image(CHECKPOINT, GY, 'checkpoint').setOrigin(0.5, 1).setDepth(2).setAlpha(0.6);
    this.flag = this.add.image(FLAG_X, GY, 'flag').setOrigin(0.15, 1).setDepth(2);
    this.add.rectangle(FLAG_X + 110, GY - 150, 150, 46, 0x1a1030).setOrigin(0).setStrokeStyle(4, 0x6aa0ff).setDepth(1);
    var sign = this.add.text(FLAG_X + 185, GY - 127, 'BLUE ANGEL', {
      fontFamily: FONT, fontSize: '13px', color: '#9cc4ff', stroke: '#2244aa', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);
    this.tweens.add({ targets: sign, alpha: 0.55, duration: 140, yoyo: true, repeat: -1, repeatDelay: 1800 });
    this.add.rectangle(FLAG_X + 160, GY, 50, 100, 0x2a1810).setOrigin(0, 1).setStrokeStyle(3, 0xffe066).setDepth(1);

    // First date: whoever you're NOT playing is waiting outside the Blue Angel
    this.date = this.add.sprite(FLAG_X + 232, GY, 'hero', gameState.char === 'mark' ? 1 : 0).setOrigin(0.5, 1).setScale(0.75).setFlipX(true).setDepth(4);
    this.tweens.add({ targets: this.date, y: GY - 3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.waved = false;
    // street sign at the start
    this.add.rectangle(230, GY - 120, 6, 120, 0x3a3a48).setOrigin(0.5, 0).setDepth(1);
    this.add.rectangle(230, GY - 128, 132, 24, 0x2a7a3a).setStrokeStyle(2, 0xffffff).setDepth(1);
    this.add.text(230, GY - 128, 'BLUE ANGEL >', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }).setOrigin(0.5).setDepth(1);
    this.add.text(230, GY - 106, 'FIRST DATE TONIGHT', { fontFamily: FONT, fontSize: '6px', color: '#ffe066', stroke: '#1a1020', strokeThickness: 3 }).setOrigin(0.5).setDepth(1);

    // Player: invisible physics body + the rig that draws the hero
    this.body = this.physics.add.image(this.spawnX, GY - 60, null).setVisible(false);
    this.body.body.setSize(34, 70);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(400, 900);
    this.rig = new Rig(this, this.body.x, this.body.y, gameState.char);
    this.beltIcon = this.add.image(0, 0, 'blackbelt').setScale(0.7).setDepth(30).setVisible(false);
    this.cameras.main.startFollow(this.body, true, 0.12, 0.12, 0, 60);
    this.cameras.main.setDeadzone(60, 120);

    this.physics.add.collider(this.body, this.solids);
    this.physics.add.collider(this.body, this.ledges);
    this.movers.forEach(function(m) { self.physics.add.collider(self.body, m); });
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.overlap(this.body, this.hearts, this.grabHeart, null, this);
    this.physics.add.overlap(this.body, this.rings, this.grabRing, null, this);
    this.physics.add.overlap(this.body, this.mics, this.grabMic, null, this);
    this.physics.add.overlap(this.body, this.belts, this.grabBelt, null, this);
    this.physics.add.overlap(this.body, this.enemies, this.touchEnemy, null, this);
    this.physics.add.collider(this.acorns, this.solids, function(a) { puffOut(self, a); });
    this.physics.add.overlap(this.body, this.acorns, function(p, a) {
      puffOut(self, a);
      if (self.power <= 0 && self.rig.hurt <= 0) self.hurt(false, a.x);
    });
    this.physics.add.overlap(this.body, this.oneups, function(p, h) { grabOneUp(self, h.x, h.y); h.destroy(); });
    if (this.spawnX > 100) { this.cp.setAlpha(1); banner(this, 'CHECKPOINT', '#ffe066', 'PICKING UP HALFWAY'); }

    this.hud = new Hud(this, 'FORT LEE TO BLUE ANGEL', { progress: 'BLUE ANGEL' });
    this.controls = new Controls(this, 'platformer');
    banner(this, 'GO!', '#ffe066', gameState.char === 'marissa' ? 'MARISSA CAN DOUBLE JUMP' : 'MARK RUNS FAST');
  }

  heartLine(x, y, n, dx) {
    for (var i = 0; i < n; i++) this.makeHeart(x + i * dx, y);
  }

  heartArc(x0, x1, y, h, n) {
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      this.makeHeart(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * h);
    }
  }

  makeHeart(x, y) {
    var h = this.hearts.create(x, y, 'heart');
    this.tweens.add({ targets: h, scaleX: 0.75, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x % 7) * 60 });
    return h;
  }

  update(time, dt) {
    var c = this.controls.poll();
    this.updateMovers(time);
    this.updateEnemies(dt);
    this.parallax();

    var b = this.body.body;
    if (this.done || this.dead) {
      this.rig.update(dt, this.body.x, this.body.y + 35, this.done ? 'idle' : 'fall', 0);
      return;
    }

    var onGround = b.blocked.down || b.touching.down;
    var maxV = gameState.char === 'mark' ? 285 : 240;
    if (this.power > 0) maxV += 60;

    // Run with a little acceleration so turns feel weighty, not twitchy
    var accel = onGround ? 2000 : 1300;
    if (c.right) { b.setAccelerationX(accel); this.rig.facing = 1; }
    else if (c.left) { b.setAccelerationX(-accel); this.rig.facing = -1; }
    else { b.setAccelerationX(0); b.setDragX(onGround ? 2200 : 500); }
    if (c.left || c.right) b.setDragX(0);
    if (this.kick > 0) this.kick -= dt;
    else b.velocity.x = Phaser.Math.Clamp(b.velocity.x, -maxV, maxV);

    // Coyote time + jump buffer + variable jump height
    this.coyote = onGround ? 100 : this.coyote - dt;
    this.buffer = c.jumpHit ? 120 : this.buffer - dt;
    if (onGround) { this.airJumps = gameState.char === 'marissa' ? 1 : 0; this.kicked = false; }
    if (this.buffer > 0 && this.coyote > 0) {
      b.setVelocityY(-640); this.buffer = 0; this.coyote = 0;
      playSound('jump');
    } else if (c.jumpHit && this.belt > 0 && this.airJumps === 0 && !onGround && !this.kicked) {
      // BLACK BELT flying kick: a burst forward that KOs whatever it hits
      this.kicked = true;
      this.kick = 420;
      b.setVelocity(this.rig.facing * 620, -180);
      this.buffer = 0;
      playSound('shoot');
      popup(this, this.body.x, this.body.y - 60, 'HI-YA!', '#ffffff');
    } else if (c.jumpHit && this.airJumps > 0 && !onGround) {
      b.setVelocityY(-560); this.airJumps--; this.buffer = 0;
      playSound('jump');
      burst(this, this.body.x, this.body.y + 30, 0xffd36b, 10);
    }
    if (!c.jump && b.velocity.y < -200) b.setVelocityY(b.velocity.y * 0.82);

    if (onGround && !this.wasGround && this.lastVy > 380) this.rig.land(this.lastVy / 900);
    if (onGround) this.chain = 0;
    this.updatePigeons(dt);
    this.updateCans(dt);
    this.wasGround = onGround;
    this.lastVy = b.velocity.y;

    // Checkpoint
    if (this.spawnX < CHECKPOINT && this.body.x > CHECKPOINT) {
      this.spawnX = CHECKPOINT + 20;
      setCheckpoint(0, this.spawnX);
      this.cp.setAlpha(1);
      burst(this, CHECKPOINT, GY - 50, 0xffe066, 14);
      popup(this, CHECKPOINT, GY - 70, 'CHECKPOINT!');
      playSound('select');
    }

    // Rolling boulders trigger as you approach
    for (var i = 0; i < BOULDERS.length; i++) {
      if (!this.boulderTriggered[i] && this.body.x > BOULDERS[i][0]) {
        this.boulderTriggered[i] = true;
        this.spawnBoulder(BOULDERS[i][1]);
      }
    }

    // Power-up
    if (this.power > 0) {
      this.power -= dt;
      this.rig.sprite.setTint(Math.floor(time / 80) % 2 ? 0xd9b3ff : 0xffffff);
      if (Math.random() < 0.4) burst(this, this.body.x, this.body.y + 20, 0xd9b3ff, 1);
      this.hud.setPower('LOVE POWER ' + Math.ceil(this.power / 1000));
      if (this.power <= 0) { this.rig.sprite.clearTint(); this.hud.setPower(''); }
    }

    // Black belt
    if (this.belt > 0) {
      this.belt -= dt;
      if (Math.random() < 0.3) burst(this, this.body.x, this.body.y + 20, 0xffffff, 1);
      if (this.kick > 0) burst(this, this.body.x - this.rig.facing * 20, this.body.y + 10, 0xffe066, 2);
      if (this.power <= 0) this.hud.setPower('BLACK BELT ' + Math.ceil(this.belt / 1000));
      if (this.belt <= 0) { this.hud.setPower(''); this.beltIcon.setVisible(false); }
    }
    if (this.beltIcon) this.beltIcon.setPosition(this.body.x, this.body.y + 6).setVisible(this.belt > 0);

    // Fell in the river
    if (this.body.y > GAME_HEIGHT + 40) this.hurt(true);

    // your date spots you coming
    if (!this.waved && this.body.x > FLAG_X - 420) {
      this.waved = true;
      var bub = this.add.text(this.date.x, GY - 96, 'OVER HERE!', {
        fontFamily: FONT, fontSize: '8px', color: '#1a1020', backgroundColor: '#ffffff', padding: { x: 5, y: 4 },
      }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: this.date, angle: 8, duration: 160, yoyo: true, repeat: 7 });
      this.time.delayedCall(2600, function() { bub.destroy(); });
    }

    // Flag
    if (this.body.x > FLAG_X - 10) this.reachFlag();

    var mode = !onGround ? (b.velocity.y < 0 ? 'rise' : 'fall') : (Math.abs(b.velocity.x) > 30 ? 'run' : 'idle');
    this.rig.update(dt, this.body.x, this.body.y + 35, mode, Math.abs(b.velocity.x) / maxV);
    if (this.kick > 0) this.rig.sprite.rotation = this.rig.facing * 0.5;   // leaning into the kick
    this.hud.set(this.score, this.lives, this.body.x / FLAG_X);
  }

  parallax() {
    this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
  }

  updateMovers(time) {
    for (var i = 0; i < this.movers.length; i++) {
      var m = this.movers[i];
      var p = Math.sin((time / m.ms) * Math.PI);
      var nx = m.ox + m.dx * (p + 1) / 2;
      var ny = m.oy + m.dy * (p + 1) / 2;
      // carry the player if standing on it
      if (this.body.body.touching.down && Math.abs(this.body.body.bottom - m.body.top) < 4 &&
        this.body.x > m.x - m.w / 2 - 10 && this.body.x < m.x + m.w / 2 + 10) {
        this.body.x += nx - m.x;
        this.body.y += ny - m.y;
      }
      m.body.reset(nx, ny);
      m.vis.setPosition(nx - m.w / 2, ny - 6);
    }
  }

  updateEnemies(dt) {
    var list = this.enemies.getChildren();
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e.kind === 'squirrel') {
        if (e.x < e.minX) e.setVelocityX(e.speed);
        if (e.x > e.maxX) e.setVelocityX(-e.speed);
        e.flipX = e.body.velocity.x > 0;
        e.rotation = Math.sin(e.x * 0.12) * 0.12; // scurrying wobble
      } else if (e.kind === 'thrower') {
        // face the player and lob an acorn when they're in range
        var dx = this.body.x - e.x;
        e.flipX = dx > 0;
        e.throwT -= dt;
        if (e.throwT <= 0 && Math.abs(dx) < 460 && Math.abs(dx) > 50 && !this.done) {
          e.throwT = 2400;
          e.setFrame(1);
          this.time.delayedCall(180, function(en) { if (en.active) en.setFrame(0); }, [e]);
          var a = this.acorns.create(e.x, e.y - 10, 'pebble').setDepth(6);
          a.setVelocity(Phaser.Math.Clamp(dx * 1.1, -280, 280), -380);
          a.body.setSize(10, 10);
        }
      } else if (e.kind === 'boulder') {
        e.rotation -= dt * 0.006;
        if (e.y > GAME_HEIGHT + 60 || e.x < -60) e.destroy();
      }
    }
  }

  spawnBoulder(x) {
    var e = this.enemies.create(x, GY - 140, 'boulder');
    e.kind = 'boulder';
    e.body.setCircle(16, 4, 1);
    e.body.setAllowGravity(true);
    e.setVelocityX(-180).setBounce(0.3).setDepth(5);
    e.setFrictionX(0);
  }

  grabHeart(p, h) {
    var x = h.x, y = h.y;
    h.destroy();
    addScore(this, 100);
    playSound('coin');
    spark(this, x, y);
  }

  grabRing(p, r) {
    r.destroy();
    this.power = 7000;
    addScore(this, 500);
    playSound('clear');
    flashScreen(this, 0x7a3cff, 0.5);
    banner(this, 'LOVE POWER UP!', '#d9b3ff', 'RUN THROUGH ANYTHING');
  }

  makeMic() {
    if (this.textures.exists('mic')) return;
    var g = this.make.graphics({ add: false });
    g.fillStyle(0x1a1020).fillRoundedRect(8, 14, 10, 22, 3);       // handle
    g.fillStyle(0xd9a640).fillRoundedRect(10, 16, 6, 18, 2);
    g.fillStyle(0x1a1020).fillCircle(13, 10, 10);                   // head
    g.fillStyle(0xe8e8f0).fillCircle(13, 10, 8);
    g.fillStyle(0xb0b0c0);
    for (var y = 5; y < 16; y += 3) for (var x = 7; x < 20; x += 3) if (Math.hypot(x - 13, y - 10) < 7) g.fillRect(x, y, 1, 1);
    g.fillStyle(0xffffff).fillCircle(10, 7, 2);
    g.generateTexture('mic', 26, 38);
    g.destroy();
  }

  // a floating music note
  note(x, y, rise, ms, color) {
    var n = this.add.text(x, y, Math.random() < 0.5 ? '\u266A' : '\u266B', {
      fontFamily: 'serif', fontSize: '22px', color: color || '#ff9ec7', stroke: '#1a1020', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: n, y: y - rise, x: x + Phaser.Math.Between(-20, 20), alpha: 0, duration: ms, onComplete: function() { n.destroy(); } });
    return n;
  }

  grabMic(p, m) {
    var self = this;
    m.destroy();
    addScore(this, 500);
    playSound('sing');
    flashScreen(this, 0xff9ec7, 0.4);
    banner(this, 'SING, MARISSA!', '#ff9ec7', 'HER VOICE CLEARS THE WAY');
    this.power = Math.max(this.power, 2500);   // safe while she sings
    // notes pour out of her in waves...
    var cols = ['#ff9ec7', '#d9b3ff', '#ffe066', '#9be37a', '#8fd3ff'];
    for (var w = 0; w < 6; w++) {
      this.time.delayedCall(w * 300, function() {
        for (var k = 0; k < 10; k++) {
          var a = k / 10 * Math.PI * 2;
          var n = self.note(self.body.x, self.body.y - 30, 0, 900, cols[(k + w) % cols.length]);
          self.tweens.add({ targets: n, x: self.body.x + Math.cos(a) * 420, y: self.body.y - 30 + Math.sin(a) * 260, duration: 900 });
        }
      });
    }
    // ...and everything on screen is charmed away
    this.time.delayedCall(450, function() {
      var cam = self.cameras.main;
      var onScreen = function(x, y) { return x > cam.scrollX - 40 && x < cam.scrollX + GAME_WIDTH + 40 && y > cam.scrollY - 40 && y < cam.scrollY + GAME_HEIGHT + 40; };
      var n = 0;
      self.enemies.getChildren().slice().forEach(function(e) {
        if (e.active && e.body && e.body.enable && onScreen(e.x, e.y)) { defeat(self, e, 0xff9ec7); n++; }
      });
      self.pigeons.forEach(function(pg) {
        if (pg.spr.active && onScreen(pg.spr.x, pg.spr.y)) { if (pg.shadow) pg.shadow.destroy(); defeat(self, pg.spr, 0xff9ec7); n++; }
      });
      self.cans.forEach(function(c) {
        if (c.alive && onScreen(c.x, GY)) { c.alive = false; defeat(self, c.rc, 0xff9ec7); n++; }
      });
      self.acorns.getChildren().slice().forEach(function(a) { if (a.active) puffOut(self, a); });
      if (n) {
        addScore(self, n * 200);
        popup(self, self.body.x, self.body.y - 110, 'ENCORE! +' + n * 200, '#ff9ec7');
      }
    });
  }

  strong() { return this.power > 0 || this.belt > 0; }

  chop(x, y) {
    popup(this, x, y - 40, ['HI-YA!', 'KIAI!', 'CHOP!'][Phaser.Math.Between(0, 2)], '#ffffff');
    burst(this, x, y, 0xffffff, 10);
    this.cameras.main.shake(90, 0.006);
  }

  makeBelt() {
    if (this.textures.exists('blackbelt')) return;
    var g = this.make.graphics({ add: false });
    g.fillStyle(0x1a1020).fillRect(0, 8, 40, 10);                         // band
    g.fillStyle(0x3a3440).fillRect(0, 10, 40, 2);
    g.fillStyle(0xd9a640).fillRect(30, 9, 3, 8).fillRect(35, 9, 3, 8);     // gold rank stripes
    g.fillStyle(0x1a1020).fillRect(15, 4, 10, 16);                        // knot
    g.fillTriangle(15, 18, 21, 18, 10, 30).fillTriangle(19, 18, 25, 18, 28, 30);
    g.fillStyle(0x4a4450).fillRect(17, 7, 6, 3);
    g.generateTexture('blackbelt', 40, 32);
    g.destroy();
  }

  grabBelt(p, bt) {
    bt.destroy();
    this.belt = 10000;
    this.kicked = false;
    addScore(this, 500);
    playSound('clear');
    flashScreen(this, 0xffffff, 0.4);
    banner(this, 'BLACK BELT!', '#ffffff', 'CHOP ANYTHING + TAP JUMP IN THE AIR TO KICK');
  }

  // Stomps chain: bounce enemy to enemy without landing for x2, x3...
  stompScore(x, y, base) {
    this.chain++;
    var pts = base * this.chain;
    addScore(this, pts);
    popup(this, x, y - 20, this.chain > 1 ? 'x' + this.chain + '  +' + pts : '+' + pts, this.chain > 1 ? '#d9b3ff' : '#ffe066');
    this.cameras.main.shake(80, 0.004);
    playSound('stomp');
  }

  bounce() {
    var b = this.body.body;
    b.setVelocityY(this.controls.state.jump ? -640 : -440);
    this.rig.land(0.6);
  }

  touchEnemy(p, e) {
    if (this.done || this.dead || !e.body || !e.body.enable) return;
    var b = this.body.body;
    var stomp = b.velocity.y > 50 && b.bottom - e.body.top < 22;
    if (stomp || this.strong()) {
      if (!stomp && this.belt > 0) this.chop(e.x, e.y);
      this.stompScore(e.x, e.y, e.kind === 'boulder' ? 200 : 150);
      defeat(this, e, e.kind === 'boulder' ? 0x9a8a7a : 0xc77a3a);
      if (stomp) this.bounce();
      return;
    }
    if (this.rig.hurt > 0) return;
    this.hurt(false, e.x);
  }

  updatePigeons(dt) {
    for (var i = 0; i < this.pigeons.length; i++) {
      var pg = this.pigeons[i];
      var s = pg.spr;
      if (!s.active) continue;
      pg.t += dt;
      if (pg.state === 'perch') {
        s.setFrame(Math.floor(pg.t / 500) % 4 === 0 ? 1 : 0);
        s.flipX = this.body.x > s.x;
        if (Math.abs(this.body.x - s.x) < 280 && !this.done) {
          pg.state = 'coo'; pg.t = 0;
          pg.tx = Phaser.Math.Clamp(this.body.x, s.x - 260, s.x + 260);   // aims where you ARE: keep moving and it misses
          pg.shadow = this.add.ellipse(pg.tx, GY, 10, 6, 0x000000, 0.45).setDepth(3);
          this.tweens.add({ targets: pg.shadow, scaleX: 4, scaleY: 2, duration: 1000 });
          playSound('select');
        }
      } else if (pg.state === 'coo') {
        s.y = pg.y0 + Math.sin(pg.t * 0.05) * 2;
        if (pg.t > 1000) { pg.state = 'dive'; pg.t = 0; s.play('pigeon-flap'); s.flipX = pg.tx > s.x; pg.sx = s.x; pg.sy = s.y; }
      } else if (pg.state === 'dive') {
        var k = Math.min(1, pg.t / 850);
        s.x = Phaser.Math.Linear(pg.sx, pg.tx, k);
        s.y = Phaser.Math.Linear(pg.sy, GY - 22, k * k);
        if (k >= 1) { pg.state = 'leave'; pg.t = 0; if (pg.shadow) pg.shadow.destroy(); }
      } else if (pg.state === 'leave') {
        s.x += (s.flipX ? 1 : -1) * dt * 0.25;
        s.y -= dt * 0.3;
        if (s.y < -40) { s.destroy(); continue; }
      }
      if ((pg.state === 'dive' || pg.state === 'leave') && !this.done && !this.dead) {
        var b = this.body.body;
        if (rectsHit(this.body.x, this.body.y, 30, 66, s.x, s.y, 24, 18)) {
          if ((b.velocity.y > 50 && b.bottom < s.y + 6) || this.strong()) {
            this.stompScore(s.x, s.y, 200);
            if (pg.shadow) pg.shadow.destroy();
            defeat(this, s, 0xbfbfcf);
            if (!this.strong()) this.bounce();
          } else if (this.rig.hurt <= 0) {
            this.hurt(false, s.x);
          }
        }
      }
    }
  }

  updateCans(dt) {
    for (var i = 0; i < this.cans.length; i++) {
      var c = this.cans[i];
      if (!c.alive) continue;
      c.t = (c.t + dt) % 3200;
      // hidden 0-1500, peek 1500-1800, up 1800-3000, sink 3000-3200
      var target = c.t < 1500 ? GY - 2 : c.t < 1800 ? GY - 14 : c.t < 3000 ? GY - 30 : GY - 2;
      c.rc.y += (target - c.rc.y) * Math.min(1, dt / 70);
      c.rc.flipX = this.body.x > c.x;
      c.up = c.rc.y < GY - 24;
      if (c.up && !this.done && !this.dead) {
        var b = this.body.body;
        if (rectsHit(this.body.x, this.body.y, 30, 66, c.x, c.rc.y - 18, 34, 30)) {
          if ((b.velocity.y > 0 && b.bottom < c.rc.y - 18) || this.strong()) {
            c.alive = false;
            this.stompScore(c.x, c.rc.y - 20, 250);
            defeat(this, c.rc, 0x9a9aa8);
            if (!this.strong()) this.bounce();
          } else if (this.rig.hurt <= 0) {
            this.hurt(false, c.x);
          }
        }
      }
    }
  }

  hurt(fell, fromX) {
    if (this.rig.hurt > 0 && !fell) return;
    this.lives--;
    gameState.lives = this.lives;
    this.cameras.main.shake(160, 0.008);
    if (this.lives <= 0) {
      this.dead = true;
      this.body.body.setVelocity(0, -500);
      this.body.body.checkCollision.none = true;
      gameOver(this);
      return;
    }
    playSound('hurt');
    this.rig.flashHurt(1500);
    if (fell) {
      this.body.body.reset(this.respawnX(), GY - 120);
    } else {
      this.body.body.setVelocity(this.body.x < fromX ? -260 : 260, -360);
    }
  }

  respawnX() {
    // back to solid ground just behind where you fell
    var x = this.body.x;
    for (var i = GROUND.length - 1; i >= 0; i--) {
      if (GROUND[i][0] < x) return Phaser.Math.Clamp(x - 60, GROUND[i][0] + 40, GROUND[i][1] - 60);
    }
    return this.spawnX;
  }

  reachFlag() {
    if (this.done) return;
    this.done = true;
    var self = this;
    var b = this.body.body;
    b.setAcceleration(0, 0).setVelocity(0, 0).setAllowGravity(false);
    var heightBonus = Math.max(100, Math.round((GY - this.body.y) / 40) * 100 + 100);
    addScore(this, heightBonus);
    popup(this, FLAG_X, this.body.y - 40, '+' + heightBonus, '#ffffff');
    var lifeBonus = this.lives * 500;
    addScore(this, lifeBonus);
    this.tweens.add({
      targets: this.body, y: GY - 35, x: FLAG_X + 12, duration: 700, ease: 'Quad.easeIn',
      onComplete: function() {
        self.tweens.add({ targets: self.body, x: FLAG_X + 192, duration: 900, onComplete: function() {
          // they meet at the door
          self.rig.facing = 1;
          var h = self.add.image(FLAG_X + 212, GY - 90, 'heart').setDepth(45).setScale(0.3);
          self.tweens.add({ targets: h, scale: 2, y: GY - 120, duration: 600, ease: 'Back.easeOut' });
          popup(self, FLAG_X + 212, GY - 150, "IT'S A DATE!", '#ff9ec7');
          burst(self, FLAG_X + 212, GY - 90, 0xff9ec7, 20);
          playSound('coin');
        } });
        for (var i = 0; i < 5; i++) {
          self.time.delayedCall(i * 220, function() {
            var fx = FLAG_X + Phaser.Math.Between(-60, 260), fy = Phaser.Math.Between(80, 220);
            burst(self, fx, fy, [0xffe066, 0x9cc4ff, 0xd9b3ff, 0xffffff][Phaser.Math.Between(0, 3)], 22);
            playSound('coin');
          });
        }
      },
    });
    banner(this, 'BLUE ANGEL!', '#9cc4ff', 'LIVES BONUS +' + lifeBonus);
    this.time.delayedCall(1500, function() { finishLevel(self, 0, self.score, self.lives); });
  }
}

function puffOut(scene, a) {
  if (!a.active) return;
  burst(scene, a.x, a.y, 0x9a6a3a, 5);
  a.destroy();
}
