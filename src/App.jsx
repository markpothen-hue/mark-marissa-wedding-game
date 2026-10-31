import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { initPad } from './pad';
import { toggleMute, isMuted } from './game/audio';

function App() {
  var gameRef = useRef(null);

  useEffect(function() {
    if (gameRef.current) return;
    initPad();
    var btn = document.getElementById('mute');
    var paint = function() { btn.textContent = isMuted() ? '\u{1F507}' : '\u{1F50A}'; btn.setAttribute('aria-label', isMuted() ? 'Unmute' : 'Mute'); };
    paint();
    btn.addEventListener('click', function(e) { e.stopPropagation(); toggleMute(); paint(); btn.blur(); });
    window.addEventListener('keydown', function(e) { if (e.key === 'm' || e.key === 'M') { toggleMute(); paint(); } });
    gameRef.current = new Phaser.Game(gameConfig);
    window.__game = gameRef.current;
    return function() {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div id="app">
      <div id="game-container" />
      <div id="pad" />
      <button id="mute" type="button" />
    </div>
  );
}

export default App;
