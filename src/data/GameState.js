// Traffic Simulation Game - Centralized State Management
// Manages all game state including budget, tools, roads, cars, and simulation status

import { GameConfig, Tools, GameStates, CarStates } from '../utils/Constants.js';
import { gridKey } from '../utils/Helpers.js';
import { levelManager } from '../managers/LevelManager.js';

export class GameState {
    constructor() {
        this.eventListeners = new Map();
        this.reset();
    }

    /**
     * Reset game state to initial values
     */
    reset() {
        // Core game state
        this.budget = GameConfig.defaultBudget;
        this.currentTool = Tools.PLACE;
        this.gameState = GameStates.BUILDING;
        this.isSimulating = false;
        
        // Level and grid data
        this.level = null;
        this.levelName = null;
        this.gridDimensions = { rows: 0, columns: 0 };
        
        // Placed roads - Map of "row,col" -> Road object
        this.roads = new Map();
        
        // Active cars - Array of car instances
        this.cars = [];
        this.activeCars = new Set(); // Track active car IDs for performance
        
        // UI state
        this.selectedCell = null;
        this.hoveredCell = null;
        this.isDeleteMode = false;
        
        // Simulation statistics
        this.stats = {
            carsSpawned: 0,
            carsReachedExit: 0,
            carsFailed: 0,
            simulationStartTime: null,
            simulationEndTime: null
        };
        
        // Cached pathfinding grid state
        this._pathfindingGridDirty = true;
        
        console.log('Game state reset');
        this.emit('stateReset');
    }

    /**
     * Initialize with level data
     * @param {Object} levelData - Processed level data from LevelManager
     */
    initializeWithLevel(levelData) {
        this.level = levelData;
        this.levelName = levelManager.getLevelName();
        this.budget = levelManager.getInitialBudget();
        this.gridDimensions = {
            rows: levelData.grid.rows,
            columns: levelData.grid.columns
        };
        
        // Reset other state
        this.roads.clear();
        this.cars = [];
        this.activeCars.clear();
        this.resetStats();
        this.gameState = GameStates.BUILDING;
        this.isSimulating = false;
        
        this._pathfindingGridDirty = true;
        
        console.log('Game state initialized with level:', levelData);
        this.emit('levelLoaded', levelData);
        this.emit('budgetChanged', this.budget);
    }

    /**
     * Budget Management
     */
    
    /**
     * Check if player can afford an action
     * @param {number} cost - Cost of the action
     * @returns {boolean} True if affordable
     */
    canAfford(cost) {
        return this.budget >= cost;
    }

    /**
     * Spend money from budget
     * @param {number} amount - Amount to spend
     * @returns {boolean} True if successful
     */
    spendBudget(amount) {
        if (!this.canAfford(amount)) {
            console.warn(`Cannot afford ${amount}. Current budget: ${this.budget}`);
            return false;
        }
        
        this.budget -= amount;
        console.log(`Spent ${amount}. Remaining budget: ${this.budget}`);
        this.emit('budgetChanged', this.budget);
        return true;
    }

    /**
     * Add money to budget (e.g., when deleting roads)
     * @param {number} amount - Amount to add
     */
    addBudget(amount) {
        this.budget += amount;
        console.log(`Added ${amount} to budget. New budget: ${this.budget}`);
        this.emit('budgetChanged', this.budget);
    }

    /**
     * Tool Management
     */
    
    /**
     * Set current tool
     * @param {string} tool - Tool type from Tools enum
     */
    setCurrentTool(tool) {
        if (Object.values(Tools).includes(tool)) {
            const oldTool = this.currentTool;
            this.currentTool = tool;
            this.isDeleteMode = (tool === Tools.DELETE);
            
            console.log(`Tool changed from ${oldTool} to ${tool}`);
            this.emit('toolChanged', { oldTool, newTool: tool });
        } else {
            console.warn(`Invalid tool: ${tool}`);
        }
    }

    /**
     * Toggle delete mode
     */
    toggleDeleteMode() {
        this.setCurrentTool(this.isDeleteMode ? Tools.PLACE : Tools.DELETE);
    }

    /**
     * Road Management
     */
    
    /**
     * Check if a road exists at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if road exists
     */
    hasRoad(row, col) {
        return this.roads.has(gridKey(row, col));
    }

    /**
     * Get road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {Object|null} Road object or null
     */
    getRoad(row, col) {
        return this.roads.get(gridKey(row, col)) || null;
    }

    /**
     * Place a road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @param {Object} roadData - Road data object
     * @returns {boolean} True if successful
     */
    placeRoad(row, col, roadData) {
        if (this.isSimulating) {
            console.warn('Cannot place roads during simulation');
            return false;
        }
        
        if (!this.canAfford(GameConfig.roadCost)) {
            console.warn('Cannot afford road placement');
            return false;
        }
        
        const key = gridKey(row, col);
        
        if (this.roads.has(key)) {
            console.warn(`Road already exists at ${key}`);
            return false;
        }
        
        // Spend budget and place road
        if (this.spendBudget(GameConfig.roadCost)) {
            this.roads.set(key, {
                row,
                col,
                directions: [],
                ...roadData
            });
            
            this._pathfindingGridDirty = true;
            console.log(`Road placed at ${key}`);
            this.emit('roadPlaced', { row, col, roadData });
            return true;
        }
        
        return false;
    }

    /**
     * Remove a road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if successful
     */
    removeRoad(row, col) {
        if (this.isSimulating) {
            console.warn('Cannot remove roads during simulation');
            return false;
        }
        
        const key = gridKey(row, col);
        const road = this.roads.get(key);
        
        if (!road) {
            console.warn(`No road at ${key} to remove`);
            return false;
        }
        
        this.roads.delete(key);
        this.addBudget(GameConfig.roadCost);
        this._pathfindingGridDirty = true;
        
        console.log(`Road removed from ${key}`);
        this.emit('roadRemoved', { row, col, road });
        return true;
    }

    /**
     * Update road directions (arrows)
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @param {Array} directions - Array of direction strings
     * @returns {boolean} True if successful
     */
    updateRoadDirections(row, col, directions) {
        const road = this.getRoad(row, col);
        if (!road) {
            console.warn(`No road at ${row},${col} to update directions`);
            return false;
        }
        
        road.directions = [...directions];
        this._pathfindingGridDirty = true;
        
        console.log(`Road directions updated at ${row},${col}:`, directions);
        this.emit('roadDirectionsUpdated', { row, col, directions });
        return true;
    }

    /**
     * Car Management
     */
    
    /**
     * Add a car to the game
     * @param {Object} car - Car instance
     */
    addCar(car) {
        this.cars.push(car);
        this.activeCars.add(car.id);
        this.stats.carsSpawned++;
        
        console.log(`Car added: ${car.id} (${car.color})`);
        this.emit('carAdded', car);
    }

    /**
     * Remove a car from the game
     * @param {string} carId - Car ID
     */
    removeCar(carId) {
        const carIndex = this.cars.findIndex(car => car.id === carId);
        if (carIndex !== -1) {
            const car = this.cars[carIndex];
            this.cars.splice(carIndex, 1);
            this.activeCars.delete(carId);
            
            // Update statistics based on car state
            if (car.state === CarStates.REACHED_EXIT) {
                this.stats.carsReachedExit++;
            } else if (car.state === CarStates.FAILED) {
                this.stats.carsFailed++;
            }
            
            console.log(`Car removed: ${carId} (final state: ${car.state})`);
            this.emit('carRemoved', { carId, car });
            
            // Check win/lose conditions
            this.checkGameEndConditions();
        }
    }

    /**
     * Get car by ID
     * @param {string} carId - Car ID
     * @returns {Object|null} Car object or null
     */
    getCar(carId) {
        return this.cars.find(car => car.id === carId) || null;
    }

    /**
     * Get all active cars
     * @returns {Array} Array of active car objects
     */
    getActiveCars() {
        return this.cars.filter(car => this.activeCars.has(car.id));
    }

    /**
     * Simulation Management
     */
    
    /**
     * Start simulation
     * @returns {boolean} True if successful
     */
    startSimulation() {
        if (this.isSimulating) {
            console.warn('Simulation already running');
            return false;
        }
        
        if (this.roads.size === 0) {
            console.warn('Cannot start simulation: no roads placed');
            return false;
        }
        
        this.isSimulating = true;
        this.gameState = GameStates.SIMULATING;
        this.resetStats();
        this.stats.simulationStartTime = Date.now();
        
        console.log('Simulation started');
        this.emit('simulationStarted');
        return true;
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        if (!this.isSimulating) {
            return;
        }
        
        this.isSimulating = false;
        this.gameState = GameStates.BUILDING;
        this.stats.simulationEndTime = Date.now();
        
        // Clear all cars
        this.cars.forEach(car => {
            this.emit('carRemoved', { carId: car.id, car });
        });
        this.cars = [];
        this.activeCars.clear();
        
        console.log('Simulation stopped');
        this.emit('simulationStopped');
    }

    /**
     * Reset simulation statistics
     */
    resetStats() {
        this.stats = {
            carsSpawned: 0,
            carsReachedExit: 0,
            carsFailed: 0,
            simulationStartTime: null,
            simulationEndTime: null
        };
    }

    /**
     * Check win/lose conditions
     */
    checkGameEndConditions() {
        if (!this.isSimulating) {
            return;
        }
        
        const totalCars = this.stats.carsReachedExit + this.stats.carsFailed;
        const minCarsToCheck = this.level.cars.length * 2; // At least 2 cars per type
        
        if (totalCars >= minCarsToCheck) {
            const successRate = this.stats.carsReachedExit / totalCars;
            
            if (successRate >= GameConfig.successThreshold) {
                this.gameState = GameStates.WON;
                this.stopSimulation();
                console.log(`Level won! Success rate: ${(successRate * 100).toFixed(1)}%`);
                this.emit('levelWon', { successRate, stats: this.stats });
            } else if (this.stats.carsFailed > this.stats.carsReachedExit) {
                this.gameState = GameStates.LOST;
                this.stopSimulation();
                console.log(`Level lost! Success rate: ${(successRate * 100).toFixed(1)}%`);
                this.emit('levelLost', { successRate, stats: this.stats });
            }
        }
    }

    /**
     * UI State Management
     */
    
    /**
     * Set selected cell
     * @param {Object|null} cell - Cell coordinates {row, col} or null
     */
    setSelectedCell(cell) {
        this.selectedCell = cell;
        this.emit('cellSelected', cell);
    }

    /**
     * Set hovered cell
     * @param {Object|null} cell - Cell coordinates {row, col} or null
     */
    setHoveredCell(cell) {
        this.hoveredCell = cell;
        this.emit('cellHovered', cell);
    }

    /**
     * Utility Methods
     */
    
    /**
     * Check if pathfinding grid needs update
     * @returns {boolean} True if grid is dirty
     */
    isPathfindingGridDirty() {
        return this._pathfindingGridDirty;
    }

    /**
     * Mark pathfinding grid as clean
     */
    markPathfindingGridClean() {
        this._pathfindingGridDirty = false;
    }

    /**
     * Get current game statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get current level name
     * @returns {string|null} Level name or null if no level loaded
     */
    getLevelName() {
        return this.levelName;
    }

    /**
     * Event System
     */
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context (this) for the callback
     */
    on(event, callback, context) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push({ callback, context });
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context (this) for the callback
     */
    off(event, callback, context) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.findIndex(listener => {
                // Handle both old format (function) and new format ({callback, context})
                if (typeof listener === 'function') {
                    return listener === callback;
                } else {
                    return listener.callback === callback && listener.context === context;
                }
            });
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    // Handle both old format (function) and new format ({callback, context})
                    if (typeof listener === 'function') {
                        // Old format - just a function
                        listener(data);
                    } else if (listener.callback) {
                        // New format - object with callback and context
                        if (listener.context) {
                            listener.callback.call(listener.context, data);
                        } else {
                            listener.callback(data);
                        }
                    }
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

// Export singleton instance
export const gameState = new GameState();
export default gameState;