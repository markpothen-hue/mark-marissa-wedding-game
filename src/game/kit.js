import Phaser from 'phaser';
import { gameState, saveState, saveLeaderboard } from './state';
import { playSound } from './audio';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { setPad, padState, takeDrag, isTouch } from '../pad';

// Shared toolkit so every level animates, sounds and reads the same way.
// One pixel density (2x), one font, one rig for the hero, one particle style.

export var FONT = '"Press Start 2P", monospace';

var PX = [
  'mark', 'marissa', 'heart', 'dumpling', 'cookie', 'apple', 'boulder', 'cart', 'squirrel', 'raccoon',
  'lantern', 'crate', 'bench', 'puddle', 'pinecone', 'leaf', 'ring', 'bullet', 'pebble', 'flag', 'checkpoint',
  'ledge', 'ground', 'street', 'path', 'bikeframe', 'dot', 'hud-heart', 'hud-heart-empty',
];
var STRIPS = {
  wheel: [34, 34], carpet: [76, 20], puff: [18, 18], spark: [14, 14],
  'mark-poses': [70, 80], 'marissa-poses': [82, 80],
};

export function preloadPx(scene) {
  PX.forEach(function(k) { scene.load.image(k, 'assets/px/' + k + '.png'); });
  Object.keys(STRIPS).forEach(function(k) {
    scene.load.spritesheet(k, 'assets/px/' + k + '.png', { frameWidth: STRIPS[k][0], frameHeight: STRIPS[k][1] });
  });
}

export function setupPx(scene) {
  PX.concat(Object.keys(STRIPS)).forEach(function(k) {
    scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  var a = scene.anims;
  a.create({ key: 'wheel-spin', frames: a.generateFrameNumbers('wheel', { start: 0, end: 3 }), frameRate: 16, repeat: -1 });
  a.create({ key: 'carpet-wave', frames: a.generateFrameNumbers('carpet', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
  a.create({ key: 'puff', frames: a.generateFrameNumbers('puff', { start: 0, end: 2 }), frameRate: 14, hideOnComplete: true });
  a.create({ key: 'spark', frames: a.generateFrameNumbers('spark', { start: 0, end: 2 }), frameRate: 18, yoyo: true, hideOnComplete: true });
}

// Background that scrolls forever: the art is mirrored so the seam never shows.
export function makeParallax(scene, bgKey) {
  var texKey = bgKey + '-loop';
  if (!scene.textures.exists(texKey)) {
    var src = scene.textures.get(bgKey).getSourceImage();
    var h = GAME_HEIGHT;
    var w = Math.round(src.width * h / src.height);
    // Repeat (not mirror, so signs stay readable). The canvas is the image minus its
    // first `blend` px; that first slice is faded in over the canvas end, so the wrap is seamless.
    var blend = Math.round(w * 0.12);
    var srcBlend = blend * src.width / w;
    var c = document.createElement('canvas');
    c.width = w - blend; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, -blend, 0, w, h);
    var strip = document.createElement('canvas');
    strip.width = blend; strip.height = h;
    var sctx = strip.getContext('2d');
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, 0, 0, srcBlend, src.height, 0, 0, blend, h);
    sctx.globalCompositeOperation = 'destination-in';
    var grad = sctx.createLinearGradient(0, 0, blend, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, blend, h);
    ctx.drawImage(strip, w - 2 * blend, 0);
    scene.textures.addCanvas(texKey, c);
  }
  return scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, texKey).setOrigin(0).setScrollFactor(0).setDepth(-100);
}

// ── The hero rig ──
// The characters are single painted frames, so all motion comes from one place:
// bob + lean while running, stretch going up, squash on landing, blink when hurt.
export class Rig {
  constructor(scene, x, y, key, scale) {
    this.scene = scene;
    this.base = scale || 1;
    key = key || gameState.char;
    this.poses = scene.textures.exists(key + '-poses');
    this.sprite = (this.poses ? scene.add.sprite(x, y, key + '-poses', 0) : scene.add.image(x, y, key))
      .setOrigin(0.5, 1).setDepth(10);
    this.t = 0;
    this.squash = 0;
    this.hurt = 0;
    this.puffTimer = 0;
    this.facing = 1;
    this.mode = 'idle';
    this.lean = 0;
    this.pedal = false;
  }

  land(power) {
    this.squash = Math.min(1, power || 1);
    puff(this.scene, this.sprite.x - 14, this.sprite.y - 6);
    puff(this.scene, this.sprite.x + 14, this.sprite.y - 6);
  }

  flashHurt(ms) { this.hurt = ms || 1400; }

  // mode: idle | run | rise | fall | duck | ride | fly
  // Pose frames: 0 stride, 1 passing, 2 mirrored stride, 3 passing, 4 jump (knees up), 5 duck
  update(dt, x, y, mode, speed01) {
    var s = this.sprite;
    this.mode = mode;
    this.t += dt * (0.6 + 0.9 * (speed01 || 0));
    var sx = 1, sy = 1, rot = 0, oy = 0, frame = 1;
    if (mode === 'run') {
      var ph = this.t * 0.016;
      // body is lowest on the stride frames and highest as the legs pass
      frame = Math.round(ph / (Math.PI / 2)) % 4;
      oy = -Math.abs(Math.sin(ph)) * 4;
      rot = 0.08 * this.facing + Math.sin(ph * 2) * 0.02;
      this.puffTimer -= dt;
      if (this.puffTimer <= 0) { this.puffTimer = 180; puff(this.scene, x - 18 * this.facing, y - 4, 0.6); }
    } else if (mode === 'ride' || mode === 'fly') {
      var p2 = this.t * 0.012;
      oy = Math.sin(p2) * (mode === 'fly' ? 3 : 1.5);
      rot = this.lean;
      frame = 5;                          // crouched on the carpet
      if (mode === 'ride') {              // seated, legs follow the pedals
        frame = this.pedal ? 7 : 6;
        oy = Math.sin(p2 * 2) * 0.8;
        rot = this.lean + 0.14;           // lean into the handlebars
      }
    } else if (mode === 'rise') {
      frame = 4; sy = 1.06; sx = 0.95; rot = 0.05 * this.facing;
    } else if (mode === 'fall') {
      frame = 2; rot = -0.03 * this.facing;
    } else if (mode === 'duck') {
      frame = 5; sy = 0.92; sx = 1.06;
    } else {
      sy = 1 + Math.sin(this.t * 0.005) * 0.025;
    }
    if (this.squash > 0) {
      sy *= 1 - 0.28 * this.squash; sx *= 1 + 0.28 * this.squash;
      this.squash = Math.max(0, this.squash - dt / 140);
    }
    if (this.poses) s.setFrame(frame);
    else if (mode === 'duck') { sy *= 0.6; sx *= 1.2; }
    s.setPosition(Math.round(x), Math.round(y + oy));
    s.setScale(this.base * sx * this.facing, this.base * sy);
    s.rotation = rot;
    if (this.hurt > 0) {
      this.hurt -= dt;
      s.setAlpha(Math.floor(this.hurt / 90) % 2 ? 0.25 : 1);
      if (this.hurt <= 0) s.setAlpha(1);
    }
  }
}

// ── Effects (all pixel squares, same palette) ──
export function puff(scene, x, y, scale) {
  var p = scene.add.sprite(x, y, 'puff').setDepth(9).setAlpha(0.8).setScale(scale || 1);
  p.play('puff');
  p.once('animationcomplete', function() { p.destroy(); });
}

export function spark(scene, x, y) {
  var p = scene.add.sprite(x, y, 'spark').setDepth(20);
  p.play('spark');
  p.once('animationcomplete', function() { p.destroy(); });
}

export function burst(scene, x, y, tint, n) {
  n = n || 10;
  for (var i = 0; i < n; i++) {
    var d = scene.add.image(x, y, 'dot').setTint(tint).setDepth(20);
    var ang = Math.random() * Math.PI * 2;
    var v = 30 + Math.random() * 60;
    scene.tweens.add({
      targets: d,
      x: x + Math.cos(ang) * v,
      y: y + Math.sin(ang) * v - 20,
      alpha: 0,
      duration: 350 + Math.random() * 300,
      ease: 'Quad.easeOut',
      onComplete: function(tw, targets) { targets[0].destroy(); },
    });
  }
}

export function popup(scene, x, y, text, color) {
  var t = scene.add.text(x, y, text, {
    fontFamily: FONT, fontSize: '12px', color: color || '#ffe066', stroke: '#1a1020', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 750, ease: 'Quad.easeOut', onComplete: function() { t.destroy(); } });
}

export function banner(scene, text, color, sub) {
  var t = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, text, {
    fontFamily: FONT, fontSize: '22px', color: color || '#ffe066', stroke: '#1a1020', strokeThickness: 6, align: 'center',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setScale(0.3);
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 300, onComplete: function() { t.destroy(); } });
  if (sub) {
    var s = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, sub, {
      fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    scene.tweens.add({ targets: s, alpha: 0, delay: 1300, duration: 300, onComplete: function() { s.destroy(); } });
  }
  return t;
}

// Purple wash used for power-ups (Cheese Quest's "LADY POWER UP!" moment)
export function flashScreen(scene, color, alpha) {
  var r = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha || 0.45).setOrigin(0).setScrollFactor(0).setDepth(150);
  scene.tweens.add({ targets: r, alpha: 0, duration: 500, onComplete: function() { r.destroy(); } });
}

// ── HUD ──
export class Hud {
  constructor(scene, title, opts) {
    opts = opts || {};
    this.scene = scene;
    var st = { fontFamily: FONT, fontSize: '10px', color: '#ffffff', stroke: '#1a1020', strokeThickness: 4 };
    var bar = scene.add.rectangle(0, 0, GAME_WIDTH, 34, 0x1a1020, 0.55).setOrigin(0).setScrollFactor(0).setDepth(300);
    this.title = scene.add.text(12, 7, title, st).setScrollFactor(0).setDepth(301);
    this.score = scene.add.text(12, 21, 'SCORE 0', Object.assign({}, st, { color: '#ffe066' })).setScrollFactor(0).setDepth(301);
    this.hearts = [];
    for (var i = 0; i < 3; i++) {
      this.hearts.push(scene.add.image(GAME_WIDTH - 22 - i * 22, 17, 'hud-heart').setScale(2).setScrollFactor(0).setDepth(301));
    }
    if (opts.progress) {
      this.progBg = scene.add.rectangle(GAME_WIDTH / 2 - 130, 17, 260, 8, 0x000000, 0.6).setOrigin(0, 0.5).setScrollFactor(0).setDepth(301);
      this.progFg = scene.add.rectangle(GAME_WIDTH / 2 - 130, 17, 1, 8, 0xffe066).setOrigin(0, 0.5).setScrollFactor(0).setDepth(302);
      this.progIcon = scene.add.image(GAME_WIDTH / 2 - 130, 17, gameState.char).setScale(0.3).setScrollFactor(0).setDepth(303);
      this.progGoal = scene.add.text(GAME_WIDTH / 2 + 136, 17, opts.progress, Object.assign({}, st, { fontSize: '8px' })).setOrigin(0, 0.5).setScrollFactor(0).setDepth(301);
    }
    this.power = scene.add.text(GAME_WIDTH / 2, 48, '', Object.assign({}, st, { color: '#d9b3ff' })).setOrigin(0.5).setScrollFactor(0).setDepth(301);
    void bar;
  }
  set(score, lives, prog) {
    this.score.setText('SCORE ' + score);
    for (var i = 0; i < 3; i++) this.hearts[i].setTexture(i < lives ? 'hud-heart' : 'hud-heart-empty');
    if (this.progFg && prog != null) {
      var p = Phaser.Math.Clamp(prog, 0, 1);
      this.progFg.width = Math.max(1, 260 * p);
      this.progIcon.x = GAME_WIDTH / 2 - 130 + 260 * p;
    }
  }
  setPower(text) { this.power.setText(text || ''); }
}

// ── Input: keyboard + the on-screen pad (src/pad.js) on phones ──
// layout: 'platformer' | 'runner' | 'lanes' | 'track'
export class Controls {
  constructor(scene, layout) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S', space: 'SPACE', z: 'Z', x: 'X', shift: 'SHIFT',
    });
    this.prev = {};
    this.state = {};
    setPad(layout || 'hint');
  }
  poll() {
    var k = this.keys, t = padState, s = {};
    s.left = k.left.isDown || k.a.isDown || t.left;
    s.right = k.right.isDown || k.d.isDown || t.right;
    s.up = k.up.isDown || k.w.isDown || t.up;
    s.down = k.down.isDown || k.s.isDown || t.down;
    s.jump = k.space.isDown || k.up.isDown || k.w.isDown || k.z.isDown || t.jump;
    s.fire = k.space.isDown || k.x.isDown || k.z.isDown || t.fire;
    var out = {};
    for (var key in s) {
      out[key] = s[key];
      out[key + 'Hit'] = s[key] && !this.prev[key];
    }
    this.prev = s;
    this.state = out;
    return out;
  }
}

// ── Level flow ──
export function finishLevel(scene, idx, score, lives) {
  gameState.cleared[idx] = true;
  saveState();
  saveLeaderboard();
  playSound('clear');
  scene.time.delayedCall(1600, function() {
    scene.cameras.main.fadeOut(300, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', function() {
      scene.scene.start('LevelClear', { levelIndex: idx, score: score, lives: lives });
    });
  });
}

export function addScore(scene, pts) {
  scene.score += pts;
  gameState.coins += pts;
}

export function gameOver(scene) {
  playSound('die');
  banner(scene, 'OOPS!', '#ffe066', 'TRY THAT AGAIN');
  scene.time.delayedCall(1700, function() {
    gameState.lives = 3;
    scene.scene.restart();
  });
}

export function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}

export { GAME_WIDTH, GAME_HEIGHT, playSound, gameState, setPad, takeDrag, isTouch };
