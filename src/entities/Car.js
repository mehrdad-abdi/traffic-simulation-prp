// Traffic Simulation Game - Car Entity
// Individual car behavior, movement, and pathfinding

import { GameConfig, CarStates, ZLayers } from '../utils/Constants.js';
import { gridToWorld, getCarColor, generateId } from '../utils/Helpers.js';

/**
 * Car class representing a moving vehicle in the simulation
 */
export class Car extends Phaser.GameObjects.Container {
    constructor(scene, carData, spawnPosition, targetPosition) {
        // Calculate initial world position
        const worldPos = gridToWorld(spawnPosition.row, spawnPosition.col);
        super(scene, worldPos.x, worldPos.y);
        
        // Car identification
        this.id = generateId();
        this.color = carData.color;
        this.carData = carData;
        
        // Position and movement
        this.gridRow = spawnPosition.row;
        this.gridCol = spawnPosition.col;
        this.spawnPosition = spawnPosition;
        this.targetPosition = targetPosition;
        
        // Pathfinding
        this.path = [];
        this.pathIndex = 0;
        this.hasPath = false;
        this.needsNewPath = true;
        
        // Movement state
        this.isMoving = false;
        this.currentTween = null;
        this.state = CarStates.SPAWNING;
        
        // Timing and waiting
        this.waitTime = 0;
        this.totalWaitTime = 0;
        this.lastMoveTime = 0;
        this.spawnTime = Date.now();
        
        // Collision detection
        this.blockedBy = null;
        this.isBlocked = false;
        
        // Set depth for proper layering
        this.setDepth(ZLayers.CARS);
        
        // Create visual representation
        this.createVisuals();
        
        // Add to scene
        scene.add.existing(this);
        
        console.log(`Car ${this.id} (${this.color}) spawned at ${spawnPosition.row},${spawnPosition.col}`);
    }

    /**
     * Create visual representation of the car
     */
    createVisuals() {
        // Create car body
        this.carBody = this.scene.add.graphics();
        this.add(this.carBody);
        
        // Create failure indicator (initially hidden)
        this.failureIndicator = this.scene.add.graphics();
        this.failureIndicator.setVisible(false);
        this.add(this.failureIndicator);
        
        // Draw the car
        this.updateVisuals();
    }

    /**
     * Update visual appearance
     */
    updateVisuals() {
        this.drawCarBody();
        this.drawFailureIndicator();
    }

    /**
     * Draw the car body
     */
    drawCarBody() {
        this.carBody.clear();
        
        const carColor = getCarColor(this.color);
        const size = GameConfig.cellSize * 0.25;
        
        // Car body (rounded rectangle)
        this.carBody.fillStyle(carColor, 1.0);
        this.carBody.fillRoundedRect(-size / 2, -size / 2, size, size, 2);
        
        // Car border
        this.carBody.lineStyle(1, 0xffffff, 0.8);
        this.carBody.strokeRoundedRect(-size / 2, -size / 2, size, size, 2);
        
        // Direction indicator (small dot)
        this.carBody.fillStyle(0xffffff, 0.9);
        this.carBody.fillCircle(0, -size / 3, 2);
    }

    /**
     * Draw failure indicator
     */
    drawFailureIndicator() {
        if (this.state === CarStates.FAILED) {
            this.failureIndicator.clear();
            
            const radius = GameConfig.cellSize * 0.4;
            
            // Red circle
            this.failureIndicator.lineStyle(3, 0xff0000, 0.8);
            this.failureIndicator.strokeCircle(0, 0, radius);
            
            // X mark
            this.failureIndicator.lineStyle(2, 0xff0000, 1.0);
            const crossSize = radius * 0.5;
            this.failureIndicator.lineBetween(-crossSize, -crossSize, crossSize, crossSize);
            this.failureIndicator.lineBetween(-crossSize, crossSize, crossSize, -crossSize);
            
            this.failureIndicator.setVisible(true);
        } else {
            this.failureIndicator.setVisible(false);
        }
    }

    /**
     * Update car logic (called from scene update loop)
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Update timing
        this.lastMoveTime = time;
        
        // Handle different states
        switch (this.state) {
            case CarStates.SPAWNING:
                this.updateSpawning(time, delta);
                break;
                
            case CarStates.MOVING:
                this.updateMoving(time, delta);
                break;
                
            case CarStates.WAITING:
                this.updateWaiting(time, delta);
                break;
                
            case CarStates.REACHED_EXIT:
            case CarStates.FAILED:
                // Terminal states - no update needed
                break;
        }
    }

    /**
     * Update spawning state
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    updateSpawning(time, delta) {
        // Transition to moving after a brief spawn delay
        if (time - this.spawnTime > 500) {
            this.state = CarStates.MOVING;
            this.needsNewPath = true;
        }
    }

    /**
     * Update moving state
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    updateMoving(time, delta) {
        // Check if we need a new path
        if (this.needsNewPath) {
            this.requestNewPath();
        }
        
        // PATTERN: Use Phaser tweens for smooth movement
        if (this.hasPath && !this.isMoving && this.pathIndex < this.path.length) {
            const nextCell = this.path[this.pathIndex];
            
            // Check for collision before moving
            if (this.checkCollision(nextCell)) {
                this.state = CarStates.WAITING;
                this.isBlocked = true;
                return;
            }
            
            // Move to next cell
            this.moveToCell(nextCell);
        }
        
        // Check if reached destination
        if (this.hasPath && this.pathIndex >= this.path.length) {
            this.reachDestination();
        }
        
        // Check for getting stuck without path
        if (!this.hasPath || this.path.length === 0) {
            this.state = CarStates.WAITING;
        }
    }

    /**
     * Update waiting state
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    updateWaiting(time, delta) {
        // GOTCHA: Track waiting time to detect traffic jams
        this.waitTime += delta;
        this.totalWaitTime += delta;
        
        // Check if we can continue moving
        if (this.isBlocked && this.path.length > 0 && this.pathIndex < this.path.length) {
            const nextCell = this.path[this.pathIndex];
            if (!this.checkCollision(nextCell)) {
                this.isBlocked = false;
                this.blockedBy = null;
                this.state = CarStates.MOVING;
                this.waitTime = 0; // Reset wait timer
                return;
            }
        }
        
        // Check for timeout failure
        if (this.waitTime > GameConfig.maxWaitTime) {
            this.triggerFailure('timeout');
        }
        
        // Occasionally try to find a new path when waiting
        if (this.waitTime > 2000) { // After 2 seconds of waiting
            this.needsNewPath = true;
            this.waitTime = 0;
        }
    }

    /**
     * Move to a specific cell
     * @param {Object} targetCell - Target cell {row, col}
     */
    moveToCell(targetCell) {
        // CRITICAL: Convert grid coordinates to world coordinates
        const worldPos = gridToWorld(targetCell.row, targetCell.col);
        
        this.isMoving = true;
        
        // Stop any existing tween
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        // Create movement tween
        this.currentTween = this.scene.tweens.add({
            targets: this,
            x: worldPos.x,
            y: worldPos.y,
            duration: GameConfig.carSpeed,
            ease: 'Linear',
            onComplete: () => {
                this.onMoveComplete(targetCell);
            }
        });
        
        console.log(`Car ${this.id} moving to ${targetCell.row},${targetCell.col}`);
    }

    /**
     * Handle movement completion
     * @param {Object} targetCell - The cell we just moved to
     */
    onMoveComplete(targetCell) {
        this.isMoving = false;
        this.currentTween = null;
        this.gridRow = targetCell.row;
        this.gridCol = targetCell.col;
        this.pathIndex++;
        
        // Reset wait time on successful move
        this.waitTime = 0;
        
        // Check if reached destination
        this.checkIfReachedExit();
        
        console.log(`Car ${this.id} completed move to ${targetCell.row},${targetCell.col}`);
    }

    /**
     * Request a new path to the destination
     */
    requestNewPath() {
        // Emit pathfinding request
        this.scene.events.emit('carRequestPath', {
            car: this,
            start: { row: this.gridRow, col: this.gridCol },
            end: this.targetPosition
        });
        
        this.needsNewPath = false;
    }

    /**
     * Set the path for this car
     * @param {Array} path - Array of {row, col} positions
     */
    setPath(path) {
        if (path && path.length > 0) {
            this.path = [...path];
            this.pathIndex = 0;
            this.hasPath = true;
            this.state = CarStates.MOVING;
            
            console.log(`Car ${this.id} received path with ${path.length} steps`);
        } else {
            this.path = [];
            this.pathIndex = 0;
            this.hasPath = false;
            
            // If no path available, wait and try again later
            this.state = CarStates.WAITING;
            console.warn(`Car ${this.id} received empty path`);
        }
    }

    /**
     * Check for collision with other cars
     * @param {Object} targetCell - Target cell to check
     * @returns {boolean} True if collision detected
     */
    checkCollision(targetCell) {
        // Emit collision check request
        const collision = this.scene.events.emit('carCheckCollision', {
            car: this,
            targetCell: targetCell
        });
        
        // For now, assume no collision (CarManager will handle this)
        return false;
    }

    /**
     * Check if car has reached its exit
     */
    checkIfReachedExit() {
        // Check if current position matches target
        const atTarget = (this.gridRow === this.targetPosition.row && 
                         this.gridCol === this.targetPosition.col);
        
        if (atTarget || this.isNearTarget()) {
            this.reachDestination();
        }
    }

    /**
     * Check if car is near its target (for entrance/exit positions)
     * @returns {boolean} True if near target
     */
    isNearTarget() {
        // For entrance/exit positions, check if we're adjacent or at the edge
        if (this.targetPosition.isEntrance) {
            // If target is an entrance/exit, being close might count
            const distance = Math.abs(this.gridRow - this.targetPosition.row) + 
                           Math.abs(this.gridCol - this.targetPosition.col);
            return distance <= 1;
        }
        return false;
    }

    /**
     * Handle reaching destination
     */
    reachDestination() {
        this.state = CarStates.REACHED_EXIT;
        
        // Stop any movement
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        
        this.isMoving = false;
        
        console.log(`Car ${this.id} reached destination!`);
        
        // Emit success event
        this.scene.events.emit('carReachedExit', {
            car: this,
            timeToComplete: Date.now() - this.spawnTime,
            totalWaitTime: this.totalWaitTime
        });
    }

    /**
     * Trigger car failure
     * @param {string} reason - Reason for failure
     */
    triggerFailure(reason = 'unknown') {
        this.state = CarStates.FAILED;
        
        // Stop any movement
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        
        this.isMoving = false;
        
        // Update visuals to show failure
        this.updateVisuals();
        
        console.log(`Car ${this.id} failed: ${reason}`);
        
        // Emit failure event
        this.scene.events.emit('carFailed', {
            car: this,
            reason: reason,
            timeAlive: Date.now() - this.spawnTime,
            totalWaitTime: this.totalWaitTime
        });
    }

    /**
     * Get car statistics
     * @returns {Object} Car stats
     */
    getStats() {
        return {
            id: this.id,
            color: this.color,
            state: this.state,
            timeAlive: Date.now() - this.spawnTime,
            totalWaitTime: this.totalWaitTime,
            pathLength: this.path.length,
            pathProgress: this.pathIndex,
            position: { row: this.gridRow, col: this.gridCol }
        };
    }

    /**
     * Get current grid position
     * @returns {Object} {row, col}
     */
    getGridPosition() {
        return { row: this.gridRow, col: this.gridCol };
    }

    /**
     * Check if car is in a terminal state
     * @returns {boolean} True if car is done (reached exit or failed)
     */
    isTerminal() {
        return this.state === CarStates.REACHED_EXIT || this.state === CarStates.FAILED;
    }

    /**
     * Check if car is successful
     * @returns {boolean} True if car reached its destination
     */
    isSuccessful() {
        return this.state === CarStates.REACHED_EXIT;
    }

    /**
     * Check if car failed
     * @returns {boolean} True if car failed
     */
    hasFailed() {
        return this.state === CarStates.FAILED;
    }

    /**
     * Force car to stop (for emergency stops)
     */
    stop() {
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        
        this.isMoving = false;
        this.state = CarStates.WAITING;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop any active tweens
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        // Destroy graphics objects
        if (this.carBody) this.carBody.destroy();
        if (this.failureIndicator) this.failureIndicator.destroy();
        
        console.log(`Car ${this.id} destroyed`);
        
        // Call parent destroy
        super.destroy();
    }
}

export default Car;