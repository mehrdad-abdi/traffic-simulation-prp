// Traffic Simulation Game - Car Management System
// Manages car spawning, lifecycle, pathfinding, and collision detection

import { GameConfig, CarStates } from '../utils/Constants.js';
import { gridKey, generateId } from '../utils/Helpers.js';
import Car from '../entities/Car.js';

export class CarManager {
    constructor(scene, gameState, gridManager, pathFinder) {
        this.scene = scene;
        this.gameState = gameState;
        this.gridManager = gridManager;
        this.pathFinder = pathFinder;
        
        // Car tracking
        this.cars = new Map(); // Map of car ID -> Car instance
        this.carsByPosition = new Map(); // Map of "row,col" -> Set of car IDs
        this.carsAwaitingPath = new Set(); // Cars waiting for pathfinding
        
        // Spawning state
        this.levelData = null;
        this.isSpawning = false;
        this.spawnTimers = new Map(); // Map of car type index -> timer event
        this.lastSpawnTime = new Map(); // Map of car type index -> timestamp
        
        // Statistics
        this.stats = {
            totalSpawned: 0,
            totalReachedExit: 0,
            totalFailed: 0,
            spawnedByType: new Map(),
            succeededByType: new Map(),
            failedByType: new Map()
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('CarManager initialized');
    }

    /**
     * Setup event listeners for car events
     */
    setupEventListeners() {
        // Car lifecycle events
        this.scene.events.on('carRequestPath', this.handlePathRequest, this);
        this.scene.events.on('carCheckCollision', this.handleCollisionCheck, this);
        this.scene.events.on('carReachedExit', this.handleCarReachedExit, this);
        this.scene.events.on('carFailed', this.handleCarFailed, this);
        
        // Game state events
        this.gameState.on('simulationStarted', this.startSimulation, this);
        this.gameState.on('simulationStopped', this.stopSimulation, this);
        this.gameState.on('levelLoaded', this.initializeForLevel, this);
    }

    /**
     * Initialize car manager for a new level
     * @param {Object} levelData - Level data from LevelManager
     */
    initializeForLevel(levelData) {
        console.log('CarManager initializing for level:', levelData);
        
        this.levelData = levelData;
        
        // Clear existing state
        this.clearAllCars();
        this.resetStats();
        
        // Initialize spawn tracking for each car type
        this.levelData.cars.forEach((carType, index) => {
            this.stats.spawnedByType.set(index, 0);
            this.stats.succeededByType.set(index, 0);
            this.stats.failedByType.set(index, 0);
            this.lastSpawnTime.set(index, 0);
        });
        
        console.log(`CarManager ready for ${this.levelData.cars.length} car types`);
    }

    /**
     * Start car simulation and spawning
     */
    startSimulation() {
        if (!this.levelData) {
            console.error('Cannot start simulation: no level data');
            return;
        }
        
        console.log('CarManager starting simulation');
        this.isSpawning = true;
        
        // Update pathfinding grid
        this.updatePathfindingGrid();
        
        // Start spawning cars for each type
        this.levelData.cars.forEach((carType, index) => {
            this.scheduleCarSpawn(index);
        });
    }

    /**
     * Stop car simulation and spawning
     */
    stopSimulation() {
        console.log('CarManager stopping simulation');
        this.isSpawning = false;
        
        // Clear spawn timers
        this.spawnTimers.forEach(timer => {
            if (timer) {
                timer.destroy();
            }
        });
        this.spawnTimers.clear();
        
        // Remove all cars
        this.clearAllCars();
    }

    /**
     * Update pathfinding grid with current road state
     */
    updatePathfindingGrid() {
        const roads = this.gridManager.getRoadsData();
        const levelData = this.gridManager.getLevelData();
        const obstacles = levelData ? levelData.uneditableCells : new Set();
        const { rows, columns } = this.gridManager.getGridDimensions();
        
        this.pathFinder.updateGrid(roads, obstacles, rows, columns);
        this.gameState.markPathfindingGridClean();
        
        console.log('Pathfinding grid updated');
    }

    /**
     * Schedule spawning of a car for a specific car type
     * @param {number} carTypeIndex - Index of car type in level data
     */
    scheduleCarSpawn(carTypeIndex) {
        if (!this.isSpawning) {
            return;
        }
        
        const carType = this.levelData.cars[carTypeIndex];
        const spawnedCount = this.stats.spawnedByType.get(carTypeIndex) || 0;
        
        // Check if we've reached the maximum cars for this type
        if (spawnedCount >= GameConfig.maxCarsPerType) {
            console.log(`Max cars reached for type ${carTypeIndex} (${carType.color})`);
            return;
        }
        
        // Calculate spawn delay
        const baseDelay = GameConfig.carSpawnInterval;
        const randomDelay = Math.random() * 1000; // Add 0-1 second randomness
        const spawnDelay = baseDelay + randomDelay;
        
        // Create spawn timer
        const timer = this.scene.time.addEvent({
            delay: spawnDelay,
            callback: () => {
                this.spawnCar(carTypeIndex);
                // Schedule next spawn
                this.scheduleCarSpawn(carTypeIndex);
            },
            callbackScope: this
        });
        
        this.spawnTimers.set(carTypeIndex, timer);
    }

    /**
     * Spawn a car of the specified type
     * @param {number} carTypeIndex - Index of car type in level data
     */
    spawnCar(carTypeIndex) {
        if (!this.isSpawning) {
            return;
        }
        
        const carType = this.levelData.cars[carTypeIndex];
        
        // Select random entrance
        const entrance = carType.entrances[Math.floor(Math.random() * carType.entrances.length)];
        const exit = carType.exit;
        
        // Check if entrance is blocked
        if (this.isPositionOccupied(entrance.row, entrance.col)) {
            console.log(`Entrance blocked for ${carType.color} car, delaying spawn`);
            return;
        }
        
        // Create car
        const car = new Car(this.scene, carType, entrance, exit);
        
        // Register car
        this.addCar(car);
        
        // Update statistics
        this.stats.totalSpawned++;
        const typeCount = this.stats.spawnedByType.get(carTypeIndex) || 0;
        this.stats.spawnedByType.set(carTypeIndex, typeCount + 1);
        this.lastSpawnTime.set(carTypeIndex, Date.now());
        
        console.log(`Spawned ${carType.color} car ${car.id} at ${entrance.row},${entrance.col}`);
        
        // Notify game state
        this.gameState.addCar(car);
    }

    /**
     * Add a car to tracking systems
     * @param {Car} car - Car instance to add
     */
    addCar(car) {
        // Add to main tracking
        this.cars.set(car.id, car);
        
        // Add to position tracking
        this.updateCarPosition(car, car.getGridPosition());
        
        // Request initial pathfinding
        this.requestPathForCar(car);
    }

    /**
     * Remove a car from tracking systems
     * @param {string} carId - Car ID to remove
     */
    removeCar(carId) {
        const car = this.cars.get(carId);
        if (!car) {
            return;
        }
        
        // Remove from position tracking
        this.removeCarFromPosition(car);
        
        // Remove from main tracking
        this.cars.delete(carId);
        
        // Remove from pathfinding queue
        this.carsAwaitingPath.delete(carId);
        
        // Destroy car
        car.destroy();
        
        // Notify game state
        this.gameState.removeCar(carId);
        
        console.log(`Car ${carId} removed from tracking`);
    }

    /**
     * Update car position tracking
     * @param {Car} car - Car instance
     * @param {Object} newPosition - New position {row, col}
     */
    updateCarPosition(car, newPosition) {
        // Remove from old position
        this.removeCarFromPosition(car);
        
        // Add to new position
        const posKey = gridKey(newPosition.row, newPosition.col);
        if (!this.carsByPosition.has(posKey)) {
            this.carsByPosition.set(posKey, new Set());
        }
        this.carsByPosition.get(posKey).add(car.id);
        
        // Update car's tracked position
        car.gridRow = newPosition.row;
        car.gridCol = newPosition.col;
    }

    /**
     * Remove car from position tracking
     * @param {Car} car - Car instance
     */
    removeCarFromPosition(car) {
        const oldPosKey = gridKey(car.gridRow, car.gridCol);
        const oldPosSet = this.carsByPosition.get(oldPosKey);
        if (oldPosSet) {
            oldPosSet.delete(car.id);
            if (oldPosSet.size === 0) {
                this.carsByPosition.delete(oldPosKey);
            }
        }
    }

    /**
     * Check if a position is occupied by a car
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if occupied
     */
    isPositionOccupied(row, col) {
        const posKey = gridKey(row, col);
        const carsAtPosition = this.carsByPosition.get(posKey);
        return carsAtPosition && carsAtPosition.size > 0;
    }

    /**
     * Get cars at a specific position
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {Array} Array of car instances
     */
    getCarsAtPosition(row, col) {
        const posKey = gridKey(row, col);
        const carIds = this.carsByPosition.get(posKey);
        if (!carIds) {
            return [];
        }
        
        return Array.from(carIds).map(id => this.cars.get(id)).filter(car => car);
    }

    /**
     * Handle pathfinding request from a car
     * @param {Object} event - Event data {car, start, end}
     */
    handlePathRequest(event) {
        const { car, start, end } = event;
        
        // Update pathfinding grid if needed
        if (this.gameState.isPathfindingGridDirty()) {
            this.updatePathfindingGrid();
        }
        
        // Find path
        const path = this.pathFinder.findPathWithEntrances(
            start, 
            end, 
            this.gridManager.getGridDimensions().rows,
            this.gridManager.getGridDimensions().columns
        );
        
        // Set path on car
        car.setPath(path);
        
        console.log(`Path ${path ? 'found' : 'not found'} for car ${car.id}`);
    }

    /**
     * Request pathfinding for a car
     * @param {Car} car - Car instance
     */
    requestPathForCar(car) {
        this.carsAwaitingPath.add(car.id);
        
        // Process pathfinding request
        this.handlePathRequest({
            car: car,
            start: car.spawnPosition,
            end: car.targetPosition
        });
        
        this.carsAwaitingPath.delete(car.id);
    }

    /**
     * Handle collision check request from a car
     * @param {Object} event - Event data {car, targetCell}
     * @returns {boolean} True if collision detected
     */
    handleCollisionCheck(event) {
        const { car, targetCell } = event;
        
        // Check if target cell is occupied by another car
        const carsAtTarget = this.getCarsAtPosition(targetCell.row, targetCell.col);
        
        // Filter out the requesting car itself
        const otherCars = carsAtTarget.filter(otherCar => otherCar.id !== car.id);
        
        if (otherCars.length > 0) {
            // Collision detected
            car.blockedBy = otherCars[0].id;
            return true;
        }
        
        return false;
    }

    /**
     * Handle car reached exit event
     * @param {Object} event - Event data {car, timeToComplete, totalWaitTime}
     */
    handleCarReachedExit(event) {
        const { car } = event;
        
        // Update statistics
        this.stats.totalReachedExit++;
        
        // Find car type index
        const carTypeIndex = this.findCarTypeIndex(car.color);
        if (carTypeIndex !== -1) {
            const count = this.stats.succeededByType.get(carTypeIndex) || 0;
            this.stats.succeededByType.set(carTypeIndex, count + 1);
        }
        
        console.log(`Car ${car.id} reached exit. Success rate: ${this.getSuccessRate().toFixed(1)}%`);
        
        // Remove car after a brief delay
        this.scene.time.addEvent({
            delay: 1000,
            callback: () => this.removeCar(car.id)
        });
    }

    /**
     * Handle car failed event
     * @param {Object} event - Event data {car, reason, timeAlive, totalWaitTime}
     */
    handleCarFailed(event) {
        const { car, reason } = event;
        
        // Update statistics
        this.stats.totalFailed++;
        
        // Find car type index
        const carTypeIndex = this.findCarTypeIndex(car.color);
        if (carTypeIndex !== -1) {
            const count = this.stats.failedByType.get(carTypeIndex) || 0;
            this.stats.failedByType.set(carTypeIndex, count + 1);
        }
        
        console.log(`Car ${car.id} failed (${reason}). Success rate: ${this.getSuccessRate().toFixed(1)}%`);
        
        // Remove car after showing failure for a while
        this.scene.time.addEvent({
            delay: 3000,
            callback: () => this.removeCar(car.id)
        });
    }

    /**
     * Find car type index by color
     * @param {string} color - Car color
     * @returns {number} Car type index or -1 if not found
     */
    findCarTypeIndex(color) {
        if (!this.levelData) {
            return -1;
        }
        
        return this.levelData.cars.findIndex(carType => carType.color === color);
    }

    /**
     * Update all cars (called from scene update loop)
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    update(time, delta) {
        // Update all cars
        this.cars.forEach(car => {
            car.update(time, delta);
        });
        
        // Clean up terminal cars periodically
        if (time % 5000 < delta) { // Every 5 seconds
            this.cleanupTerminalCars();
        }
    }

    /**
     * Clean up cars that have been in terminal states for too long
     */
    cleanupTerminalCars() {
        const toRemove = [];
        
        this.cars.forEach(car => {
            if (car.isTerminal()) {
                const timeSinceTerminal = Date.now() - car.lastMoveTime;
                if (timeSinceTerminal > 10000) { // 10 seconds
                    toRemove.push(car.id);
                }
            }
        });
        
        toRemove.forEach(carId => this.removeCar(carId));
    }

    /**
     * Get current success rate
     * @returns {number} Success rate as percentage
     */
    getSuccessRate() {
        const total = this.stats.totalReachedExit + this.stats.totalFailed;
        if (total === 0) {
            return 0;
        }
        return (this.stats.totalReachedExit / total) * 100;
    }

    /**
     * Get current statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            activeCars: this.cars.size,
            successRate: this.getSuccessRate(),
            carsAwaitingPath: this.carsAwaitingPath.size
        };
    }

    /**
     * Get all active cars
     * @returns {Array} Array of car instances
     */
    getActiveCars() {
        return Array.from(this.cars.values());
    }

    /**
     * Get car by ID
     * @param {string} carId - Car ID
     * @returns {Car|null} Car instance or null
     */
    getCar(carId) {
        return this.cars.get(carId) || null;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSpawned: 0,
            totalReachedExit: 0,
            totalFailed: 0,
            spawnedByType: new Map(),
            succeededByType: new Map(),
            failedByType: new Map()
        };
    }

    /**
     * Clear all cars from the simulation
     */
    clearAllCars() {
        console.log(`Clearing ${this.cars.size} cars`);
        
        // Destroy all cars
        this.cars.forEach(car => car.destroy());
        
        // Clear tracking
        this.cars.clear();
        this.carsByPosition.clear();
        this.carsAwaitingPath.clear();
    }

    /**
     * Check if simulation should end based on car statistics
     * @returns {Object|null} End condition {type: 'won'|'lost', reason: string} or null
     */
    checkEndConditions() {
        const totalCars = this.stats.totalReachedExit + this.stats.totalFailed;
        const minCarsToCheck = this.levelData ? this.levelData.cars.length * 3 : 10;
        
        if (totalCars >= minCarsToCheck) {
            const successRate = this.getSuccessRate() / 100;
            
            if (successRate >= GameConfig.successThreshold) {
                return {
                    type: 'won',
                    reason: `Success rate ${(successRate * 100).toFixed(1)}% >= ${(GameConfig.successThreshold * 100)}%`
                };
            } else if (this.stats.totalFailed > this.stats.totalReachedExit) {
                return {
                    type: 'lost',
                    reason: `Too many failures: ${this.stats.totalFailed} failed vs ${this.stats.totalReachedExit} succeeded`
                };
            }
        }
        
        return null;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop simulation
        this.stopSimulation();
        
        // Remove event listeners
        this.scene.events.off('carRequestPath', this.handlePathRequest, this);
        this.scene.events.off('carCheckCollision', this.handleCollisionCheck, this);
        this.scene.events.off('carReachedExit', this.handleCarReachedExit, this);
        this.scene.events.off('carFailed', this.handleCarFailed, this);
        
        this.gameState.off('simulationStarted', this.startSimulation, this);
        this.gameState.off('simulationStopped', this.stopSimulation, this);
        this.gameState.off('levelLoaded', this.initializeForLevel, this);
        
        console.log('CarManager destroyed');
    }
}

export default CarManager;