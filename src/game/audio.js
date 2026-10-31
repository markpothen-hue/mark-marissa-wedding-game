var ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function playSound(type) {
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
