import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { initPad } from './pad';

function App() {
  var gameRef = useRef(null);

  useEffect(function() {
    if (gameRef.current) return;
    initPad();
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
    </div>
  );
}

export default App;
