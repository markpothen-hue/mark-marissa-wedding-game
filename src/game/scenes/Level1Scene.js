import Phaser from 'phaser';
import {
  Rig, Hud, Controls, makeParallax, burst, spark, popup, banner, flashScreen,
  finishLevel, addScore, gameOver, playSound, gameState, GAME_HEIGHT, FONT,
} from '../kit';

// LEVEL 1: "Fort Lee to Blue Angel" — hand-built side-scrolling platformer.
// Every surface you can stand on is drawn. Stomp squirrels and boulders, ride the
// moving ledges, grab the ring for a LOVE POWER UP, slide down the flag.

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
var SQUIRRELS = [[700, 560, 880], [1300, 1030, 1680], [2000, 1860, 2380], [3100, 2780, 3600], [3500, 2780, 3600],
  [4050, 3750, 4380], [5150, 4840, 5480], [5950, 5660, 6150]];
var BOULDERS = [[1100, 1650], [2900, 3560], [4900, 5460], [5700, 6150]]; // [trigger x, spawn x]
var RINGS = [[1410, 220], [4190, 180]];
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
    this.spawnX = 100;
    this.wasGround = true;
    this.boulderTriggered = {};
  }

  create() {
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

    // Enemies
    this.enemies = this.physics.add.group();
    SQUIRRELS.forEach(function(s) {
      var e = self.enemies.create(s[0], GY - 20, 'squirrel');
      e.kind = 'squirrel'; e.minX = s[1]; e.maxX = s[2]; e.speed = 70;
      e.body.setSize(36, 30).setOffset(8, 6);
      e.setVelocityX(-e.speed).setDepth(5);
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

    // Player: invisible physics body + the rig that draws the hero
    this.body = this.physics.add.image(this.spawnX, GY - 60, null).setVisible(false);
    this.body.body.setSize(34, 70);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(400, 900);
    this.rig = new Rig(this, this.body.x, this.body.y, gameState.char);
    this.cameras.main.startFollow(this.body, true, 0.12, 0.12, 0, 60);
    this.cameras.main.setDeadzone(60, 120);

    this.physics.add.collider(this.body, this.solids);
    this.physics.add.collider(this.body, this.ledges);
    this.movers.forEach(function(m) { self.physics.add.collider(self.body, m); });
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.overlap(this.body, this.hearts, this.grabHeart, null, this);
    this.physics.add.overlap(this.body, this.rings, this.grabRing, null, this);
    this.physics.add.overlap(this.body, this.enemies, this.touchEnemy, null, this);

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
    b.velocity.x = Phaser.Math.Clamp(b.velocity.x, -maxV, maxV);

    // Coyote time + jump buffer + variable jump height
    this.coyote = onGround ? 100 : this.coyote - dt;
    this.buffer = c.jumpHit ? 120 : this.buffer - dt;
    if (onGround) this.airJumps = gameState.char === 'marissa' ? 1 : 0;
    if (this.buffer > 0 && this.coyote > 0) {
      b.setVelocityY(-640); this.buffer = 0; this.coyote = 0;
      playSound('jump');
    } else if (c.jumpHit && this.airJumps > 0 && !onGround) {
      b.setVelocityY(-560); this.airJumps--; this.buffer = 0;
      playSound('jump');
      burst(this, this.body.x, this.body.y + 30, 0xffd36b, 10);
    }
    if (!c.jump && b.velocity.y < -200) b.setVelocityY(b.velocity.y * 0.82);

    if (onGround && !this.wasGround && this.lastVy > 380) this.rig.land(this.lastVy / 900);
    this.wasGround = onGround;
    this.lastVy = b.velocity.y;

    // Checkpoint
    if (this.spawnX < CHECKPOINT && this.body.x > CHECKPOINT) {
      this.spawnX = CHECKPOINT + 20;
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

    // Fell in the river
    if (this.body.y > GAME_HEIGHT + 40) this.hurt(true);

    // Flag
    if (this.body.x > FLAG_X - 10) this.reachFlag();

    var mode = !onGround ? (b.velocity.y < 0 ? 'rise' : 'fall') : (Math.abs(b.velocity.x) > 30 ? 'run' : 'idle');
    this.rig.update(dt, this.body.x, this.body.y + 35, mode, Math.abs(b.velocity.x) / maxV);
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

  touchEnemy(p, e) {
    if (this.done || this.dead) return;
    var b = this.body.body;
    var stomp = b.velocity.y > 50 && b.bottom - e.body.top < 22;
    if (stomp || this.power > 0) {
      var pts = e.kind === 'boulder' ? 200 : 150;
      addScore(this, pts);
      popup(this, e.x, e.y - 20, '+' + pts);
      burst(this, e.x, e.y, e.kind === 'boulder' ? 0x9a8a7a : 0xc77a3a, 14);
      this.cameras.main.shake(80, 0.004);
      playSound('stomp');
      e.destroy();
      if (stomp) { b.setVelocityY(this.controls.state.jump ? -620 : -420); this.rig.land(0.6); }
      return;
    }
    if (this.rig.hurt > 0) return;
    this.hurt(false, e.x);
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
        self.tweens.add({ targets: self.body, x: FLAG_X + 185, duration: 900 });
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
    finishLevel(this, 0, this.score, this.lives);
  }
}
