// Traffic Simulation Puzzle Game - Main Game Configuration
// Entry point for Phaser.js game initialization

// Import scenes
import GameScene from './scenes/GameScene.js';

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    
    preload() {
        // Show loading text
        this.add.text(512, 300, 'Loading Traffic Simulation Game...', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Add loading instructions
        this.add.text(512, 350, 'Click anywhere to start when ready', {
            fontSize: '16px',
            color: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }
    
    create() {
        // Add click to start
        this.input.once('pointerdown', () => {
            // Start the main game scene
            this.scene.start('GameScene');
        });
    }
}

// Game Configuration
const gameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    scene: [BootScene, GameScene], // Include both scenes
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    input: {
        mouse: {
            target: null,
            capture: true
        },
        touch: {
            target: null,
            capture: true
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 800,
            height: 600
        },
        max: {
            width: 1200,
            height: 900
        }
    }
};

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // Check if required libraries are loaded
    if (typeof Phaser === 'undefined') {
        console.error('Phaser.js not loaded!');
        document.getElementById('game-container').innerHTML = '<p style="color: red;">Error: Phaser.js not loaded!</p>';
        return;
    }
    
    if (typeof PF === 'undefined') {
        console.error('PathFinding.js not loaded!');
        document.getElementById('game-container').innerHTML = '<p style="color: red;">Error: PathFinding.js not loaded!</p>';
        return;
    }
    
    console.log('Initializing Traffic Simulation Game...');
    console.log('Phaser version:', Phaser.VERSION);
    console.log('PathFinding.js loaded successfully');
    
    // Create the game instance
    const game = new Phaser.Game(gameConfig);
    
    // Store game instance globally for debugging
    window.game = game;
});