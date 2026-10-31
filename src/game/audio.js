var ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function playSound(type) {
  if (muted) return;
  try {
    var ac = getCtx();
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    g.gain.value = 0.06;
    var t = ac.currentTime;

    switch (type) {
      case 'jump':
        o.frequency.setValueAtTime(280, t);
        o.frequency.exponentialRampToValueAtTime(560, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;
      case 'coin':
        o.type = 'square';
        o.frequency.setValueAtTime(988, t);
        o.frequency.setValueAtTime(1319, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
        break;
      case 'stomp':
        o.type = 'square';
        o.frequency.setValueAtTime(400, t);
        o.frequency.setValueAtTime(600, t + 0.05);
        o.frequency.setValueAtTime(200, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;
      case 'hurt':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, t);
        o.frequency.setValueAtTime(100, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25);
        break;
      case 'die':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(400, t);
        o.frequency.setValueAtTime(80, t + 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.start(t); o.stop(t + 0.6);
        break;
      case 'clear':
        [523, 659, 784, 1047, 1319].forEach(function(f, i) {
          var o2 = ac.createOscillator();
          var g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination); g2.gain.value = 0.05;
          o2.frequency.setValueAtTime(f, t + i * 0.12);
          g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
          o2.start(t + i * 0.12); o2.stop(t + i * 0.12 + 0.3);
        });
        o.frequency.setValueAtTime(1, t); g.gain.value = 0; o.start(t); o.stop(t + 0.01);
        break;
      case 'select':
        o.frequency.setValueAtTime(440, t);
        o.frequency.setValueAtTime(660, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;
      case 'shoot':
        o.type = 'square';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.start(t); o.stop(t + 0.12);
        break;
      default:
        o.frequency.setValueAtTime(440, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
    }
  } catch (e) { /* ignore audio errors */ }
}

// ── Background music: tiny chiptune sequencer (square lead, triangle bass, noise hats) ──
// Each song is written in 8th-note steps: note names, '.' = rest, '-' = hold.

var SONGS = {
  // Wagner's Bridal Chorus ("Here Comes the Bride") - public domain
  wedding: {
    bpm: 88,
    lead: 'G4 - C5 - - C5 C5 - - - - . G4 - D5 - B4 - C5 - - - - . G4 - C5 - - F5 F5 - - - E5 - D5 - C5 - B4 - C5 - D5 - - - - .',
    bass: 'C3 - - - C3 - - - G2 - - - C3 - - - C3 - - - F2 - - - G2 - - - G2 - - -',
    hats: false,
  },
  title: {
    bpm: 112,
    lead: 'E5 G5 C6 G5 A5 G5 E5 - F5 A5 C6 A5 G5 - - . E5 G5 C6 E6 D6 C6 A5 - G5 E5 D5 E5 C5 - - .',
    bass: 'C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 - C3 - G3 - A2 - E3 - F2 - G2 - C3 - - -',
    hats: false,
  },
  level1: {
    bpm: 150,
    lead: 'C5 E5 G5 E5 A5 G5 E5 C5 D5 F5 A5 F5 G5 - . . E5 G5 C6 G5 A5 C6 D6 C6 B5 G5 D5 G5 C6 - . .',
    bass: 'C3 C4 C3 C4 F2 F3 F2 F3 D3 D4 D3 D4 G2 G3 G2 G3',
    hats: true,
  },
  level2: {
    bpm: 160,
    lead: 'A4 C5 D5 E5 G5 E5 D5 C5 D5 E5 G5 A5 G5 - E5 . C5 D5 E5 G5 A5 G5 E5 D5 C5 A4 C5 D5 A4 - - .',
    bass: 'A2 . E3 . A2 . G2 . F2 . C3 . G2 . E3 .',
    hats: true,
  },
  level3: {
    bpm: 138,
    lead: 'G5 - B5 D6 B5 - G5 . A5 - C6 E6 D6 - B5 . G5 A5 B5 D6 E6 D6 B5 A5 G5 - D5 - G5 - - .',
    bass: 'G2 D3 G3 D3 C3 G3 C4 G3 E2 B2 E3 B2 D3 A3 D4 A3',
    hats: true,
  },
  level4: {
    bpm: 150,
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 E5 A4 C5 E5 A5 B5 C6 D6 E6 C6 - B5 - A5 - - .',
    bass: 'A2 A3 A2 A3 F2 F3 F2 F3 C3 C4 C3 C4 G2 G3 E2 E3',
    hats: true,
  },
  boss: {
    bpm: 176,
    lead: 'A4 A4 C5 A4 D5 A4 E5 D5 C5 C5 E5 C5 F5 E5 D5 C5 A4 A4 C5 A4 D5 A4 E5 F5 G#5 - E5 - A5 - - .',
    bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 E2 E3 E2 E3',
    hats: true,
  },
};

var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  var m = n.match(/^([A-G]#?)(\d)$/);
  if (!m) return null;
  var midi = 12 * (parseInt(m[2], 10) + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parse(str) { return str.trim().split(/\s+/); }

var music = { want: null, playing: null, step: 0, next: 0, timer: null, gain: null, unlocked: false, el: null };

// Real song files override the chiptune for a screen: drop the file in public/music/
// and map the screen to it here, e.g. level2: 'music/chinatown.mp3'
var MUSIC_FILES = {
};
var MUTE_KEY = 'wedding-game-muted';
var muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }

function voice(ac, type, f, t, dur, vol) {
  var o = ac.createOscillator();
  var g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(music.gain);
  o.start(t); o.stop(t + dur + 0.02);
}

function hat(ac, t) {
  var len = Math.floor(ac.sampleRate * 0.03);
  var buf = ac.createBuffer(1, len, ac.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = ac.createBufferSource();
  var g = ac.createGain();
  g.gain.value = 0.05;
  src.buffer = buf; src.connect(g); g.connect(music.gain);
  src.start(t);
}

function holdLen(seq, i) {
  var n = 1;
  while (seq[(i + n) % seq.length] === '-' && n < seq.length) n++;
  return n;
}

function tick() {
  if (music.el) return;   // a real song file is playing instead
  var ac = getCtx();
  var song = SONGS[music.playing];
  if (!song) return;
  var stepDur = 60 / song.bpm / 2;
  var lead = song._lead || (song._lead = parse(song.lead));
  var bass = song._bass || (song._bass = parse(song.bass));
  while (music.next < ac.currentTime + 0.15) {
    var t = music.next;
    var li = music.step % lead.length, bi = music.step % bass.length;
    var ln = lead[li], bn = bass[bi];
    if (freq(ln)) voice(ac, 'square', freq(ln), t, stepDur * holdLen(lead, li) * 0.92, 0.035);
    if (freq(bn)) voice(ac, 'triangle', freq(bn), t, stepDur * holdLen(bass, bi) * 0.95, 0.09);
    if (song.hats && music.step % 2 === 1) hat(ac, t);
    music.step++;
    music.next += stepDur;
  }
}

function startSong(key) {
  if (music.el) { music.el.pause(); music.el = null; }
  if (MUSIC_FILES[key]) {
    music.playing = key;
    music.el = new Audio(MUSIC_FILES[key]);
    music.el.loop = true;
    music.el.volume = 0.5;
    music.el.muted = muted;
    music.el.play().catch(function() { /* blocked until next tap */ });
    return;
  }
  var ac = getCtx();
  if (!music.gain) { music.gain = ac.createGain(); music.gain.connect(ac.destination); }
  music.gain.gain.setValueAtTime(muted ? 0 : 0.8, ac.currentTime);
  music.playing = key;
  music.step = 0;
  music.next = ac.currentTime + 0.05;
  if (!music.timer) music.timer = setInterval(tick, 40);
}

// Scenes call this; it starts as soon as the browser allows sound (first tap/key)
export function playMusic(key) {
  music.want = key;
  if (!music.unlocked) return;
  if (music.playing === key) return;
  startSong(key);
}

export function stopMusic() {
  if (music.el) { music.el.pause(); music.el = null; }
  music.want = null;
  music.playing = null;
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
  if (music.gain) music.gain.gain.setValueAtTime(muted ? 0 : 0.8, getCtx().currentTime);
  if (music.el) music.el.muted = muted;
  return muted;
}

function unlock() {
  if (music.unlocked) return;
  var ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
  music.unlocked = true;
  if (music.want) startSong(music.want);
}
['pointerdown', 'touchend', 'keydown'].forEach(function(ev) {
  window.addEventListener(ev, unlock, { once: false, passive: true });
});
