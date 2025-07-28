// Traffic Simulation Game - Main Gameplay Scene
// Integrates all managers and systems for complete gameplay

// Import all required systems
import { levelManager } from '../managers/LevelManager.js';
import GridManager from '../managers/GridManager.js';
import InputManager from '../managers/InputManager.js';
import CarManager from '../managers/CarManager.js';
import { gameState } from '../data/GameState.js';
import { pathFinder } from '../utils/PathFinder.js';
import { GameStates, Tools } from '../utils/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // System managers
        this.levelManager = null;
        this.gridManager = null;
        this.inputManager = null;
        this.carManager = null;
        this.gameState = null;
        this.pathFinder = null;
        
        // Scene state
        this.isInitialized = false;
        this.currentLevel = 'levels/level-1.json';
        
        // UI elements (basic until UIScene is ready)
        this.debugText = null;
        this.controlsText = null;
    }

    /**
     * Preload assets (if any)
     */
    preload() {
        // No external assets needed - we're using graphics shapes
        console.log('GameScene preloading...');
    }

    /**
     * Create scene and initialize all systems
     */
    create() {
        console.log('GameScene creating...');
        
        // Initialize core systems
        this.initializeSystems();
        
        // Set up UI
        this.createUI();
        
        // Load initial level
        this.loadLevel(this.currentLevel);
        
        // Set up keyboard controls
        this.setupKeyboardControls();
        
        console.log('GameScene created successfully');
    }

    /**
     * Initialize all game systems in correct order
     */
    initializeSystems() {
        console.log('Initializing game systems...');
        
        // 1. Game State (central state management)
        this.gameState = gameState;
        this.gameState.reset();
        
        // 2. Level Manager (load and validate levels)
        this.levelManager = levelManager;
        
        // 3. PathFinder (A* pathfinding)
        this.pathFinder = pathFinder;
        
        // 4. Grid Manager (visual grid and road management)
        this.gridManager = new GridManager(this);
        
        // 5. Car Manager (car spawning and lifecycle)
        this.carManager = new CarManager(this, this.gameState, this.gridManager, this.pathFinder);
        
        // 6. Input Manager (mouse input and tool handling)
        this.inputManager = new InputManager(this, this.gameState, this.gridManager);
        
        // Set up system integrations
        this.setupSystemIntegrations();
        
        this.isInitialized = true;
        console.log('All systems initialized');
    }

    /**
     * Set up integrations between systems
     */
    setupSystemIntegrations() {
        // Game state events
        this.gameState.on('levelWon', this.onLevelWon, this);
        this.gameState.on('levelLost', this.onLevelLost, this);
        this.gameState.on('simulationStarted', this.onSimulationStarted, this);
        this.gameState.on('simulationStopped', this.onSimulationStopped, this);
        
        // Road placement integration
        this.gameState.on('roadPlaced', this.onRoadPlaced, this);
        this.gameState.on('roadRemoved', this.onRoadRemoved, this);
    }

    /**
     * Create basic UI elements
     */
    createUI() {
        // Debug information
        this.debugText = this.add.text(10, 10, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setDepth(1000);
        
        // Controls information
        const controlsInfo = [
            'Traffic Simulation Game',
            '',
            'Controls:',
            'LEFT CLICK: Place/Remove roads',
            'DRAG on roads: Add direction arrows',
            'D: Toggle delete mode',
            'SPACE: Start/Stop simulation',
            'R: Reset level',
            '',
            'Goal: Design roads to guide cars to their destinations!'
        ];
        
        this.controlsText = this.add.text(this.cameras.main.width - 10, 10, controlsInfo.join('\n'), {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 },
            align: 'left'
        });
        this.controlsText.setOrigin(1, 0);
        this.controlsText.setDepth(1000);
    }

    /**
     * Set up keyboard controls
     */
    setupKeyboardControls() {
        // Create keyboard input
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        
        // Handle key presses
        this.spaceKey.on('down', this.toggleSimulation, this);
        this.dKey.on('down', this.toggleDeleteMode, this);
        this.rKey.on('down', this.resetLevel, this);
    }

    /**
     * Load a level
     * @param {string} levelPath - Path to level JSON file
     */
    async loadLevel(levelPath) {
        try {
            console.log(`Loading level: ${levelPath}`);
            
            // Load level data
            const levelData = await this.levelManager.loadLevel(levelPath);
            
            // Initialize systems with level data
            this.gameState.initializeWithLevel(levelData);
            this.gridManager.initialize(levelData);
            
            console.log('Level loaded successfully');
            
        } catch (error) {
            console.error('Failed to load level:', error);
            this.showError(`Failed to load level: ${error.message}`);
        }
    }

    /**
     * Toggle simulation on/off
     */
    toggleSimulation() {
        if (this.gameState.isSimulating) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    }

    /**
     * Start simulation
     */
    startSimulation() {
        if (this.gameState.roads.size === 0) {
            this.showError('Place some roads before starting simulation!');
            return;
        }
        
        console.log('Starting simulation...');
        this.gameState.startSimulation();
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        console.log('Stopping simulation...');
        this.gameState.stopSimulation();
    }

    /**
     * Toggle delete mode
     */
    toggleDeleteMode() {
        this.gameState.toggleDeleteMode();
        console.log(`Delete mode: ${this.gameState.isDeleteMode ? 'ON' : 'OFF'}`);
    }

    /**
     * Reset current level
     */
    resetLevel() {
        console.log('Resetting level...');
        this.gameState.reset();
        this.loadLevel(this.currentLevel);
    }

    /**
     * Scene update loop
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        if (!this.isInitialized) {
            return;
        }
        
        // Update car manager (which updates all cars)
        if (this.carManager) {
            this.carManager.update(time, delta);
        }
        
        // Update debug display
        this.updateDebugDisplay();
        
        // Check for end conditions
        this.checkEndConditions();
    }

    /**
     * Update debug display
     */
    updateDebugDisplay() {
        if (!this.debugText) {
            return;
        }
        
        const stats = this.carManager ? this.carManager.getStatistics() : {};
        const budget = this.gameState.budget;
        const tool = this.gameState.currentTool;
        const isSimulating = this.gameState.isSimulating;
        const roadsCount = this.gameState.roads.size;
        
        const debugInfo = [
            `Budget: $${budget}`,
            `Tool: ${tool}${this.gameState.isDeleteMode ? ' (DELETE)' : ''}`,
            `Roads: ${roadsCount}`,
            `State: ${isSimulating ? 'SIMULATING' : 'BUILDING'}`,
            '',
            `Cars: ${stats.activeCars || 0} active`,
            `Spawned: ${stats.totalSpawned || 0}`,
            `Succeeded: ${stats.totalReachedExit || 0}`,
            `Failed: ${stats.totalFailed || 0}`,
            `Success Rate: ${(stats.successRate || 0).toFixed(1)}%`
        ];
        
        this.debugText.setText(debugInfo.join('\n'));
    }

    /**
     * Check for game end conditions
     */
    checkEndConditions() {
        if (this.gameState.isSimulating && this.carManager) {
            const endCondition = this.carManager.checkEndConditions();
            if (endCondition) {
                if (endCondition.type === 'won') {
                    this.gameState.gameState = GameStates.WON;
                    this.gameState.emit('levelWon', endCondition);
                } else if (endCondition.type === 'lost') {
                    this.gameState.gameState = GameStates.LOST;
                    this.gameState.emit('levelLost', endCondition);
                }
            }
        }
    }

    /**
     * Handle road placed event
     * @param {Object} event - Event data
     */
    onRoadPlaced(event) {
        // Grid manager already handles road placement
        console.log('Road placed event received');
    }

    /**
     * Handle road removed event
     * @param {Object} event - Event data
     */
    onRoadRemoved(event) {
        // Grid manager already handles road removal
        console.log('Road removed event received');
    }

    /**
     * Handle simulation started event
     */
    onSimulationStarted() {
        console.log('Simulation started');
        this.inputManager.disable(); // Disable building during simulation
    }

    /**
     * Handle simulation stopped event
     */
    onSimulationStopped() {
        console.log('Simulation stopped');
        this.inputManager.enable(); // Re-enable building
    }

    /**
     * Handle level won event
     * @param {Object} event - Event data
     */
    onLevelWon(event) {
        console.log('Level won!', event);
        this.showMessage('Congratulations! You won!', '#00ff00');
        
        // Stop simulation
        this.gameState.stopSimulation();
    }

    /**
     * Handle level lost event
     * @param {Object} event - Event data
     */
    onLevelLost(event) {
        console.log('Level lost!', event);
        this.showMessage('Level failed! Try again.', '#ff0000');
        
        // Stop simulation
        this.gameState.stopSimulation();
    }

    /**
     * Show a message to the player
     * @param {string} message - Message text
     * @param {string} color - Text color
     */
    showMessage(message, color = '#ffffff') {
        // Create temporary message
        const messageText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            message,
            {
                fontSize: '32px',
                color: color,
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: { x: 20, y: 10 }
            }
        );
        messageText.setOrigin(0.5);
        messageText.setDepth(2000);
        
        // Fade out after 3 seconds
        this.tweens.add({
            targets: messageText,
            alpha: 0,
            duration: 1000,
            delay: 2000,
            onComplete: () => messageText.destroy()
        });
    }

    /**
     * Show an error message
     * @param {string} error - Error message
     */
    showError(error) {
        console.error(error);
        this.showMessage(error, '#ff0000');
    }

    /**
     * Clean up scene
     */
    destroy() {
        // Clean up managers
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        if (this.carManager) {
            this.carManager.destroy();
        }
        
        if (this.gridManager) {
            this.gridManager.destroy();
        }
        
        // Remove event listeners
        this.gameState.off('levelWon', this.onLevelWon, this);
        this.gameState.off('levelLost', this.onLevelLost, this);
        this.gameState.off('simulationStarted', this.onSimulationStarted, this);
        this.gameState.off('simulationStopped', this.onSimulationStopped, this);
        this.gameState.off('roadPlaced', this.onRoadPlaced, this);
        this.gameState.off('roadRemoved', this.onRoadRemoved, this);
        
        console.log('GameScene destroyed');
        
        // Call parent destroy
        super.destroy();
    }
}

export default GameScene;