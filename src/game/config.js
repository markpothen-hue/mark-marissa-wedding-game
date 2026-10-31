import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { SelectScene } from './scenes/SelectScene';
import { NameScene } from './scenes/NameScene';
import { GuideScene } from './scenes/GuideScene';
import { GetReadyScene } from './scenes/GetReadyScene';
import { Level1Scene } from './scenes/Level1Scene';
import { Level2Scene } from './scenes/Level2Scene';
import { Level3Scene } from './scenes/Level3Scene';
import { Level4Scene } from './scenes/Level4Scene';
import { LevelClearScene } from './scenes/LevelClearScene';
import { AllClearScene } from './scenes/AllClearScene';
import { WeddingScene } from './scenes/WeddingScene';

export var GAME_WIDTH = 800;
export var GAME_HEIGHT = 500;

export var gameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  pixelArt: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    SelectScene,
    NameScene,
    GuideScene,
    GetReadyScene,
    Level1Scene,
    Level2Scene,
    Level3Scene,
    Level4Scene,
    LevelClearScene,
    WeddingScene,
    AllClearScene,
  ],
};
