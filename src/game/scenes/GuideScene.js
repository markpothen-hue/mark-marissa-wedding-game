import Phaser from 'phaser';
import { playSound } from '../audio';
import { FONT, setPad, isTouch } from '../kit';
import { gameState } from '../state';

// The level guide: shown after you enter your name. Three chapters of the story + the bonus wedding.
var CARDS = [
  { tag: 'LEVEL 1', chapter: 'OUR FIRST DATE', name: 'FORT LEE TO BLUE ANGEL', how: 'PLATFORMER', bg: 'bg-level1', focus: 0.5 },
  { tag: 'LEVEL 2', chapter: 'THE NYC TRIP', name: 'CENTRAL PARK RIDE', how: 'BIKE RIDE', bg: 'bg-level3', focus: 0.5 },
  { tag: 'LEVEL 3', chapter: 'THE MOUNTAIN HIKE', name: 'BEAR MOUNTAIN', how: 'FLYING SHOOTER', bg: 'bg-level4', focus: 0.5 },
  { tag: 'BONUS', chapter: 'THE WEDDING DAY', name: 'WALK DOWN THE AISLE', how: 'RHYTHM', bg: 'bg-church', focus: 0.78, bonus: true },
];
var CW = 172, CH = 250, GAP = 18, TW = 156, TH = 98;

export class GuideScene extends Phaser.Scene {
  constructor() { super('Guide'); }

  create() {
    var self = this;
    this.started = false;
    var W = this.scale.width, H = this.scale.height;
    setPad('hint', { text: 'TAP TO START' });
    this.cameras.main.fadeIn(300);

    this.add.rectangle(0, 0, W, H, 0x1a1030).setOrigin(0);
    for (var s = 0; s < 40; s++) {
      var st = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 2, 2, 0xfff6c0, Phaser.Math.FloatBetween(0.3, 0.9));
      this.tweens.add({ targets: st, alpha: 0.1, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1000) });
    }

    this.add.text(W / 2, 34, 'THE STORY SO FAR', { fontFamily: FONT, fontSize: '18px', color: '#ffe066', stroke: '#1a1020', strokeThickness: 5 }).setOrigin(0.5);
    this.add.text(W / 2, 62, (gameState.name || 'PLAYER') + ', RELIVE HOW MARK & MARISSA GOT HERE', { fontFamily: FONT, fontSize: '8px', color: '#d9b3ff' }).setOrigin(0.5);

    var x0 = (W - (CARDS.length * CW + (CARDS.length - 1) * GAP)) / 2;
    var CARDS_X3 = x0 + 3 * (CW + GAP);
    CARDS.forEach(function(c, i) {
      var cx = x0 + i * (CW + GAP) + CW / 2, cy = 90 + CH / 2;
      var card = self.add.container(cx, cy + 30).setAlpha(0);
      var gold = c.bonus ? 0xffe066 : 0xd9a640;
      card.add(self.add.rectangle(0, 0, CW, CH, c.bonus ? 0x3a2350 : 0x2a1f40).setStrokeStyle(c.bonus ? 4 : 3, gold));
      card.add(self.thumb(c.bg, c.focus, 0, -CH / 2 + 12 + TH / 2));
      card.add(self.add.rectangle(0, -CH / 2 + 12 + TH / 2, TW, TH).setStrokeStyle(2, 0x1a1020));

      var chip = self.add.text(0, -CH / 2 + 12, c.tag, {
        fontFamily: FONT, fontSize: '8px', color: '#1a1020', backgroundColor: c.bonus ? '#ffe066' : '#ffffff', padding: { x: 5, y: 3 },
      }).setOrigin(0.5);
      card.add(chip);

      var ty = -CH / 2 + 12 + TH + 22;
      card.add(self.add.text(0, ty, c.chapter, {
        fontFamily: FONT, fontSize: '10px', color: c.bonus ? '#ffe066' : '#ffffff', align: 'center', wordWrap: { width: CW - 16 },
      }).setOrigin(0.5, 0));
      card.add(self.add.text(0, ty + 40, c.name, {
        fontFamily: FONT, fontSize: '7px', color: '#ffd38a', align: 'center', wordWrap: { width: CW - 16 }, lineSpacing: 4,
      }).setOrigin(0.5, 0));
      card.add(self.add.text(0, CH / 2 - 18, c.how, { fontFamily: FONT, fontSize: '7px', color: '#8fd3ff' }).setOrigin(0.5));

      if (c.bonus) {
        var ring = self.add.image(CW / 2 - 14, -CH / 2 + 14, 'ring').setScale(1.4);
        card.add(ring);
        self.tweens.add({ targets: ring, angle: 15, duration: 500, yoyo: true, repeat: -1 });
        self.time.addEvent({ delay: 500, loop: true, callback: function() {
          var sp = self.add.image(cx + Phaser.Math.Between(-CW / 2, CW / 2), cy + Phaser.Math.Between(-CH / 2, CH / 2), 'spark').setDepth(5);
          self.tweens.add({ targets: sp, alpha: 0, scale: 1.6, duration: 500, onComplete: function() { sp.destroy(); } });
        } });
      }
      if (i < CARDS.length - 1) {
        var hx = cx + CW / 2 + GAP / 2;
        var h = self.add.image(hx, cy, 'heart').setScale(0.6).setAlpha(0);
        self.tweens.add({ targets: h, alpha: 1, delay: 300 + i * 220 + 200, duration: 200 });
        self.tweens.add({ targets: h, scale: 0.75, duration: 450, yoyo: true, repeat: -1, delay: i * 150 });
      }
      self.tweens.add({ targets: card, alpha: 1, y: cy, delay: 300 + i * 220, duration: 400, ease: 'Back.easeOut', onStart: function() { playSound('select'); } });
    });

    // the two of them under the timeline
    var mk = this.add.sprite(W / 2 - 40, 406, 'hero', 0).setOrigin(0.5, 1).setScale(0.62);
    var ms = this.add.sprite(W / 2 + 40, 406, 'hero', 1).setOrigin(0.5, 1).setScale(0.62);
    var lv = this.add.image(W / 2, 376, 'heart');
    this.tweens.add({ targets: [mk, ms], y: 401, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: lv, scale: 1.3, duration: 400, yoyo: true, repeat: -1 });

    // two big buttons (most guests are on their phones): start at level 1, or skip to the wedding
    var verb = isTouch() ? 'TAP' : 'CLICK';
    var btn = function(x, label, bg, fg) {
      return self.add.text(x, H - 38, label, {
        fontFamily: FONT, fontSize: '13px', color: fg, backgroundColor: bg, padding: { x: 14, y: 12 }, align: 'center',
      }).setOrigin(0.5).setAlpha(0);
    };
    var go = btn(W / 2 - 190, verb + ' TO START', '#2a7a3a', '#ffffff');
    var skip = btn(W / 2 + 160, verb + ' HERE TO SKIP\nTO THE WEDDING', '#ffe066', '#1a1020');
    this.tweens.add({ targets: [go, skip], alpha: 1, delay: 1400, duration: 300, onComplete: function() {
      self.tweens.add({ targets: skip, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } });

    // input only after the cards land, so the name-entry keypress doesn't skip this screen
    this.time.delayedCall(1200, function() {
      var begin = function(toWedding) {
        if (self.started) return;
        self.started = true;
        playSound('select');
        self.cameras.main.fadeOut(250);
        self.cameras.main.once('camerafadeoutcomplete', function() {
          if (toWedding) self.scene.start('Wedding');
          else self.scene.start('GetReady', { levelIndex: 0 });
        });
      };
      self.input.on('pointerdown', function(p) {
        var hit = skip.getBounds().contains(p.x, p.y) || (p.x > CARDS_X3 && p.y > 90 && p.y < 90 + CH);   // the button or the BONUS card
        // anywhere else (including the green button) starts level 1
        begin(hit);
      });
      self.input.keyboard.on('keydown', function(e) { begin(e.key === 'w' || e.key === 'W'); });
    });
  }

  // a TWxTH window into a level background; focus = where across the art to center (0..1)
  thumb(key, focus, x, y) {
    var img = this.add.image(x, y, key);
    var src = this.textures.get(key).getSourceImage();
    var sw = src.width, sh = src.height;
    var cropW = Math.min(sw, sh * TW / TH), cropH = cropW * TH / TW;
    var cx = Phaser.Math.Clamp(sw * focus - cropW / 2, 0, sw - cropW);
    img.setCrop(cx, (sh - cropH) / 2, cropW, cropH);
    var k = TW / cropW;
    img.setScale(k);
    img.setPosition(x - (cx + cropW / 2 - sw / 2) * k, y);
    return img;
  }
}
