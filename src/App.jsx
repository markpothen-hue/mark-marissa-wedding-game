import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game/config';

function App() {
  var gameRef = useRef(null);

  useEffect(function() {
    if (gameRef.current) return;
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
    <div style={{
      width: '100vw', height: '100vh',
      background: '#1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div id="game-container" />
    </div>
  );
}

export default App;
