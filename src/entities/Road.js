// Traffic Simulation Game - Road Entity
// Road tile with direction arrows for traffic control

import { GameConfig, Colors, Directions, ZLayers } from '../utils/Constants.js';
import { gridToWorld, getAdjacentPositions } from '../utils/Helpers.js';

/**
 * Road class representing a road tile with direction arrows
 */
export class Road extends Phaser.GameObjects.Container {
    constructor(scene, row, col) {
        // Calculate world position
        const worldPos = gridToWorld(row, col);
        super(scene, worldPos.x, worldPos.y);
        
        // Store road properties
        this.row = row;
        this.col = col;
        this.directions = []; // Array of direction sequences
        this.isHighlighted = false;
        
        // Set depth for proper layering
        this.setDepth(ZLayers.ROADS);
        
        // Create visual components
        this.createVisuals();
        
        // Add to scene
        scene.add.existing(this);
        
        // Set up interactivity
        this.setupInteractivity();
    }

    /**
     * Create visual components for the road
     */
    createVisuals() {
        // Create road background (gray)
        this.background = this.scene.add.graphics();
        this.add(this.background);
        
        // Create arrows container
        this.arrowsContainer = this.scene.add.container(0, 0);
        this.add(this.arrowsContainer);
        
        // Create highlight overlay (initially hidden)
        this.highlight = this.scene.add.graphics();
        this.highlight.setVisible(false);
        this.add(this.highlight);
        
        // Draw the road
        this.updateVisuals();
    }

    /**
     * Update visual appearance
     */
    updateVisuals() {
        this.drawBackground();
        this.drawArrows();
        this.drawHighlight();
    }

    /**
     * Draw the road background
     */
    drawBackground() {
        this.background.clear();
        
        const size = GameConfig.cellSize;
        const halfSize = size / 2;
        
        // Fill road with gray color
        this.background.fillStyle(Colors.road, 1.0);
        this.background.fillRect(-halfSize, -halfSize, size, size);
        
        // Add subtle border
        this.background.lineStyle(1, Colors.gridLine, 0.3);
        this.background.strokeRect(-halfSize, -halfSize, size, size);
    }

    /**
     * Draw direction arrows on the road
     */
    drawArrows() {
        // Clear existing arrows
        this.arrowsContainer.removeAll(true);
        
        if (this.directions.length === 0) {
            return;
        }
        
        // Calculate arrow positions and sizes based on number of directions
        const arrowSize = Math.min(12, GameConfig.cellSize / (this.directions.length + 1));
        const spacing = GameConfig.cellSize / (this.directions.length + 1);
        
        this.directions.forEach((direction, index) => {
            // Calculate position for this arrow
            const offsetX = (index - (this.directions.length - 1) / 2) * spacing;
            const offsetY = 0;
            
            // Create arrow graphics
            const arrow = this.scene.add.graphics();
            arrow.setPosition(offsetX, offsetY);
            
            // Draw the arrow based on direction
            this.drawArrow(arrow, direction, arrowSize);
            
            this.arrowsContainer.add(arrow);
        });
    }

    /**
     * Draw a single arrow in the specified direction
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {string} direction - Direction from Directions enum
     * @param {number} size - Size of the arrow
     */
    drawArrow(graphics, direction, size) {
        graphics.fillStyle(Colors.arrow, 1.0);
        graphics.lineStyle(1, Colors.arrowShadow, 0.5);
        
        const halfSize = size / 2;
        
        switch (direction) {
            case Directions.UP:
                this.drawStraightArrow(graphics, 0, -90, size);
                break;
            case Directions.DOWN:
                this.drawStraightArrow(graphics, 0, 90, size);
                break;
            case Directions.LEFT:
                this.drawStraightArrow(graphics, 0, 180, size);
                break;
            case Directions.RIGHT:
                this.drawStraightArrow(graphics, 0, 0, size);
                break;
            case Directions.UP_RIGHT:
                this.drawTurnArrow(graphics, size, 'up-right');
                break;
            case Directions.UP_LEFT:
                this.drawTurnArrow(graphics, size, 'up-left');
                break;
            case Directions.DOWN_RIGHT:
                this.drawTurnArrow(graphics, size, 'down-right');
                break;
            case Directions.DOWN_LEFT:
                this.drawTurnArrow(graphics, size, 'down-left');
                break;
            default:
                console.warn(`Unknown direction: ${direction}`);
                break;
        }
    }

    /**
     * Draw a straight arrow
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} rotation - Rotation in degrees
     * @param {number} size - Arrow size
     */
    drawStraightArrow(graphics, x, rotation, size) {
        graphics.save();
        graphics.translate(x, 0);
        graphics.rotate(Phaser.Math.DegToRad(rotation));
        
        const length = size * 0.8;
        const width = size * 0.4;
        
        // Arrow body (rectangle)
        graphics.fillRect(-length / 4, -width / 6, length / 2, width / 3);
        
        // Arrow head (triangle)
        graphics.beginPath();
        graphics.moveTo(length / 4, 0);
        graphics.lineTo(length / 8, -width / 2);
        graphics.lineTo(length / 8, width / 2);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
        
        graphics.restore();
    }

    /**
     * Draw a turning arrow
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} size - Arrow size
     * @param {string} turnType - Type of turn ('up-right', 'up-left', etc.)
     */
    drawTurnArrow(graphics, size, turnType) {
        const radius = size * 0.4;
        const thickness = size * 0.15;
        
        let startAngle, endAngle, arrowX, arrowY, arrowRotation;
        
        switch (turnType) {
            case 'up-right':
                startAngle = Math.PI; // Start from left
                endAngle = Math.PI * 1.5; // End at top
                arrowX = 0;
                arrowY = -radius;
                arrowRotation = -90;
                break;
            case 'up-left':
                startAngle = 0; // Start from right
                endAngle = Math.PI * 1.5; // End at top
                arrowX = 0;
                arrowY = -radius;
                arrowRotation = -90;
                break;
            case 'down-right':
                startAngle = Math.PI; // Start from left
                endAngle = Math.PI * 0.5; // End at bottom
                arrowX = 0;
                arrowY = radius;
                arrowRotation = 90;
                break;
            case 'down-left':
                startAngle = 0; // Start from right
                endAngle = Math.PI * 0.5; // End at bottom
                arrowX = 0;
                arrowY = radius;
                arrowRotation = 90;
                break;
        }
        
        // Draw curved arrow body
        graphics.lineStyle(thickness, Colors.arrow, 1.0);
        graphics.beginPath();
        graphics.arc(0, 0, radius, startAngle, endAngle, false);
        graphics.strokePath();
        
        // Draw arrow head at the end
        graphics.save();
        graphics.translate(arrowX, arrowY);
        graphics.rotate(Phaser.Math.DegToRad(arrowRotation));
        
        graphics.fillStyle(Colors.arrow, 1.0);
        graphics.beginPath();
        graphics.moveTo(thickness, 0);
        graphics.lineTo(-thickness / 2, -thickness);
        graphics.lineTo(-thickness / 2, thickness);
        graphics.closePath();
        graphics.fillPath();
        
        graphics.restore();
    }

    /**
     * Draw highlight overlay
     */
    drawHighlight() {
        this.highlight.clear();
        
        if (this.isHighlighted) {
            const size = GameConfig.cellSize;
            const halfSize = size / 2;
            
            this.highlight.fillStyle(Colors.highlight, 0.4);
            this.highlight.fillRect(-halfSize, -halfSize, size, size);
        }
    }

    /**
     * Set up mouse interactivity
     */
    setupInteractivity() {
        const size = GameConfig.cellSize;
        const halfSize = size / 2;
        
        this.setInteractive(new Phaser.Geom.Rectangle(-halfSize, -halfSize, size, size), 
                           Phaser.Geom.Rectangle.Contains);
        
        // Mouse events
        this.on('pointerover', this.onPointerOver, this);
        this.on('pointerout', this.onPointerOut, this);
        this.on('pointerdown', this.onPointerDown, this);
        
        // Enable dragging for arrow drawing
        this.scene.input.setDraggable(this);
        this.on('dragstart', this.onDragStart, this);
        this.on('drag', this.onDrag, this);
        this.on('dragend', this.onDragEnd, this);
    }

    /**
     * Mouse over event handler
     */
    onPointerOver() {
        this.setHighlighted(true);
        
        this.scene.events.emit('roadHovered', {
            row: this.row,
            col: this.col,
            road: this
        });
    }

    /**
     * Mouse out event handler
     */
    onPointerOut() {
        this.setHighlighted(false);
        
        this.scene.events.emit('roadHoverEnd', {
            row: this.row,
            col: this.col,
            road: this
        });
    }

    /**
     * Mouse down event handler
     */
    onPointerDown(pointer) {
        this.scene.events.emit('roadClicked', {
            row: this.row,
            col: this.col,
            road: this,
            pointer: pointer
        });
    }

    /**
     * Drag start event handler
     */
    onDragStart(pointer, dragX, dragY) {
        this.dragStartRow = this.row;
        this.dragStartCol = this.col;
        
        this.scene.events.emit('roadDragStart', {
            row: this.row,
            col: this.col,
            road: this,
            pointer: pointer
        });
    }

    /**
     * Drag event handler
     */
    onDrag(pointer, dragX, dragY) {
        // Calculate which direction we're dragging towards
        const deltaX = pointer.x - this.x;
        const deltaY = pointer.y - this.y;
        const threshold = GameConfig.cellSize / 3;
        
        let targetDirection = null;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal movement
            if (deltaX > threshold) {
                targetDirection = Directions.RIGHT;
            } else if (deltaX < -threshold) {
                targetDirection = Directions.LEFT;
            }
        } else {
            // Vertical movement
            if (deltaY > threshold) {
                targetDirection = Directions.DOWN;
            } else if (deltaY < -threshold) {
                targetDirection = Directions.UP;
            }
        }
        
        this.scene.events.emit('roadDrag', {
            row: this.row,
            col: this.col,
            road: this,
            direction: targetDirection,
            pointer: pointer
        });
    }

    /**
     * Drag end event handler
     */
    onDragEnd(pointer, dragX, dragY, dropped) {
        this.scene.events.emit('roadDragEnd', {
            row: this.row,
            col: this.col,
            road: this,
            pointer: pointer,
            dropped: dropped
        });
    }

    /**
     * Add a direction to the road
     * @param {string} direction - Direction from Directions enum
     */
    addDirection(direction) {
        if (Object.values(Directions).includes(direction)) {
            this.directions.push(direction);
            this.updateVisuals();
            
            console.log(`Direction ${direction} added to road at ${this.row},${this.col}`);
            this.scene.events.emit('roadDirectionAdded', {
                row: this.row,
                col: this.col,
                direction: direction,
                directions: [...this.directions]
            });
        }
    }

    /**
     * Set all directions for the road
     * @param {Array} directions - Array of direction strings
     */
    setDirections(directions) {
        this.directions = [...directions];
        this.updateVisuals();
        
        console.log(`Directions set for road at ${this.row},${this.col}:`, directions);
        this.scene.events.emit('roadDirectionsSet', {
            row: this.row,
            col: this.col,
            directions: [...this.directions]
        });
    }

    /**
     * Clear all directions
     */
    clearDirections() {
        this.directions = [];
        this.updateVisuals();
        
        console.log(`Directions cleared for road at ${this.row},${this.col}`);
        this.scene.events.emit('roadDirectionsCleared', {
            row: this.row,
            col: this.col
        });
    }

    /**
     * Get next direction based on car's current direction
     * @param {string} currentDirection - Car's current movement direction
     * @returns {string|null} Next direction or null if no valid direction
     */
    getNextDirection(currentDirection) {
        // If no directions set, allow straight through
        if (this.directions.length === 0) {
            return currentDirection;
        }
        
        // Return the first direction (simple implementation)
        // Could be enhanced to consider the car's approach direction
        return this.directions[0];
    }

    /**
     * Check if this road connects to adjacent roads
     * @param {string} direction - Direction to check
     * @returns {boolean} True if connected
     */
    isConnectedToDirection(direction) {
        return this.directions.includes(direction);
    }

    /**
     * Get pathfinding connections for this road
     * @returns {Array} Array of connected positions {row, col, direction}
     */
    getPathfindingConnections() {
        const connections = [];
        const adjacentPositions = getAdjacentPositions(this.row, this.col);
        
        // If no specific directions, allow all adjacent connections
        if (this.directions.length === 0) {
            return adjacentPositions.map(pos => ({
                row: pos.row,
                col: pos.col,
                direction: this.getDirectionToPosition(pos.row, pos.col)
            }));
        }
        
        // Only allow connections in specified directions
        this.directions.forEach(direction => {
            const targetPos = this.getPositionInDirection(direction);
            if (targetPos) {
                connections.push({
                    row: targetPos.row,
                    col: targetPos.col,
                    direction: direction
                });
            }
        });
        
        return connections;
    }

    /**
     * Get position in a specific direction
     * @param {string} direction - Direction to move
     * @returns {Object|null} Target position {row, col} or null
     */
    getPositionInDirection(direction) {
        switch (direction) {
            case Directions.UP:
                return { row: this.row - 1, col: this.col };
            case Directions.DOWN:
                return { row: this.row + 1, col: this.col };
            case Directions.LEFT:
                return { row: this.row, col: this.col - 1 };
            case Directions.RIGHT:
                return { row: this.row, col: this.col + 1 };
            // Diagonal directions would need more complex logic
            default:
                return null;
        }
    }

    /**
     * Get direction from this road to a target position
     * @param {number} targetRow - Target row
     * @param {number} targetCol - Target column
     * @returns {string|null} Direction or null
     */
    getDirectionToPosition(targetRow, targetCol) {
        const deltaRow = targetRow - this.row;
        const deltaCol = targetCol - this.col;
        
        if (deltaRow === -1 && deltaCol === 0) return Directions.UP;
        if (deltaRow === 1 && deltaCol === 0) return Directions.DOWN;
        if (deltaRow === 0 && deltaCol === -1) return Directions.LEFT;
        if (deltaRow === 0 && deltaCol === 1) return Directions.RIGHT;
        
        return null;
    }

    /**
     * Set highlighted state
     * @param {boolean} highlighted - Whether road is highlighted
     */
    setHighlighted(highlighted) {
        if (this.isHighlighted !== highlighted) {
            this.isHighlighted = highlighted;
            this.highlight.setVisible(highlighted);
            this.drawHighlight();
        }
    }

    /**
     * Get road key for map storage
     * @returns {string} Unique road key
     */
    getKey() {
        return `${this.row},${this.col}`;
    }

    /**
     * Get road data for serialization
     * @returns {Object} Road data
     */
    getRoadData() {
        return {
            row: this.row,
            col: this.col,
            directions: [...this.directions]
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.off('pointerover');
        this.off('pointerout');
        this.off('pointerdown');
        this.off('dragstart');
        this.off('drag');
        this.off('dragend');
        
        // Destroy graphics objects
        if (this.background) this.background.destroy();
        if (this.arrowsContainer) this.arrowsContainer.destroy();
        if (this.highlight) this.highlight.destroy();
        
        // Call parent destroy
        super.destroy();
    }
}

export default Road;