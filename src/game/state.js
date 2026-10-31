var STATE_KEY = 'wedding-game-state';
var LB_KEY = 'wedding-game-lb';

export var gameState = {
  char: 'mark',
  name: '',
  coins: 0,
  cleared: [false, false, false, false],
  lives: 3,
};

export function resetLives() {
  gameState.lives = 3;
}

export function saveState() {
  try {
    localStorage.setItem(STATE_KEY + '-' + gameState.name, JSON.stringify({
      char: gameState.char,
      coins: gameState.coins,
      cleared: gameState.cleared,
    }));
  } catch (e) { /* ignore */ }
}

export function loadState() {
  try {
    var raw = localStorage.getItem(STATE_KEY + '-' + gameState.name);
    if (raw) {
      var d = JSON.parse(raw);
      gameState.char = d.char || gameState.char;
      gameState.coins = d.coins || 0;
      gameState.cleared = d.cleared || [false, false, false, false];
    }
  } catch (e) { /* ignore */ }
}

export function saveLeaderboard() {
  try {
    var lb = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
    var idx = lb.findIndex(function(e) { return e.name === gameState.name; });
    if (idx >= 0) {
      if (gameState.coins > lb[idx].coins) {
        lb[idx].coins = gameState.coins;
      }
      lb[idx].char = gameState.char;
    } else {
      lb.push({ name: gameState.name, coins: gameState.coins, char: gameState.char });
    }
    lb.sort(function(a, b) { return b.coins - a.coins; });
    lb = lb.slice(0, 10);
    localStorage.setItem(LB_KEY, JSON.stringify(lb));
  } catch (e) { /* ignore */ }
}

export function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY) || '[]');
  } catch (e) { return []; }
}
