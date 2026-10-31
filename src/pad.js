// On-screen controller for phones. Lives in the DOM (not the canvas) so in portrait it
// fills the empty space under the game like a Game Boy, and in landscape it floats over
// the corners. Scenes pick a layout with setPad(); the game reads padState every frame.

export var padState = { left: false, right: false, up: false, down: false, jump: false, fire: false, duck: false, dx: 0, dy: 0, dragging: false };

export function isTouch() {
  return /[?&]touch/.test(location.search) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

var LAYOUTS = {
  platformer: { left: [['left', '◀'], ['right', '▶']], right: [['jump', 'JUMP']] },
  runner: { left: [['down', 'DUCK']], right: [['jump', 'JUMP']] },
  lanes: { left: [['up', '▲'], ['down', '▼']], right: [['jump', 'HOP']], stack: true },
  runner3: { left: [['up', '▲'], ['down', '▼']], right: [['duck', 'DUCK'], ['jump', 'JUMP']], stack: true },
};

var root = null;
var touches = {};   // touch id -> button id | 'track'
var track = {};     // touch id -> last {x, y}

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function recompute() {
  ['left', 'right', 'up', 'down', 'jump', 'fire', 'duck'].forEach(function(k) { padState[k] = false; });
  padState.dragging = false;
  Object.keys(touches).forEach(function(id) {
    var b = touches[id];
    if (b === 'track') padState.dragging = true;
    else if (b) padState[b] = true;
  });
  if (root) {
    root.querySelectorAll('[data-btn]').forEach(function(n) {
      n.classList.toggle('on', !!padState[n.dataset.btn]);
    });
  }
}

function btnAt(x, y) {
  var n = document.elementFromPoint(x, y);
  var b = n && n.closest ? n.closest('[data-btn]') : null;
  return b ? b.dataset.btn : null;
}

function onTouch(e) {
  if (!root || !root.contains(e.target)) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (e.type === 'touchend' || e.type === 'touchcancel') {
      delete touches[t.identifier];
      delete track[t.identifier];
      continue;
    }
    if (touches[t.identifier] === 'track' || (e.type === 'touchstart' && t.target.closest && t.target.closest('.pad-track'))) {
      var last = track[t.identifier];
      if (last) { padState.dx += t.clientX - last.x; padState.dy += t.clientY - last.y; }
      track[t.identifier] = { x: t.clientX, y: t.clientY };
      touches[t.identifier] = 'track';
    } else {
      // slide-friendly: whatever button is under the finger right now is pressed
      touches[t.identifier] = btnAt(t.clientX, t.clientY);
    }
  }
  recompute();
}

export function initPad() {
  root = document.getElementById('pad');
  if (!root || !isTouch()) return;
  document.body.classList.add('touch');
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function(ev) {
    document.addEventListener(ev, onTouch, { passive: false });
  });
  setPad('hint');
}

// layout: 'platformer' | 'runner' | 'lanes' | 'track' | 'hint' | { name: onSubmit }
export function setPad(layout, opts) {
  if (!root) return;
  touches = {}; track = {};
  recompute();
  root.innerHTML = '';
  root.className = '';
  if (!isTouch()) return;

  if (layout === 'hint' || !layout) {
    root.className = 'pad-hint';
    root.appendChild(el('div', 'hint', (opts && opts.text) || 'TAP THE GAME TO CONTINUE'));
    return;
  }
  if (layout === 'track') {
    root.className = 'pad-trackmode';
    var tr = el('div', 'pad-track');
    tr.appendChild(el('div', 'hint', 'DRAG HERE TO FLY'));
    tr.appendChild(el('div', 'hint small', 'HEARTS FIRE ON THEIR OWN'));
    root.appendChild(tr);
    return;
  }
  if (layout === 'name') {
    root.className = 'pad-name';
    var input = el('input');
    input.maxLength = 12;
    input.placeholder = 'YOUR NAME';
    input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'characters');
    var go = el('button', 'go', "LET'S GO!");
    var submit = function() { input.blur(); opts.onSubmit(input.value.trim().toUpperCase()); };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submit(); });
    input.addEventListener('input', function() { if (opts.onInput) opts.onInput(input.value.toUpperCase()); });
    root.appendChild(input);
    root.appendChild(go);
    return;
  }
  var L = LAYOUTS[layout];
  root.className = 'pad-buttons';
  ['left', 'right'].forEach(function(side) {
    var g = el('div', 'pad-group ' + side + (L.stack && side === 'left' ? ' stack' : ''));
    L[side].forEach(function(b) {
      var n = el('div', 'pad-btn' + (b[1].length > 2 ? ' word' : ''), b[1]);
      n.dataset.btn = b[0];
      g.appendChild(n);
    });
    root.appendChild(g);
  });
}

export function takeDrag() {
  var d = { x: padState.dx, y: padState.dy };
  padState.dx = 0; padState.dy = 0;
  return d;
}
