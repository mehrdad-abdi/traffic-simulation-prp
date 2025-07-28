// Traffic Simulation Game - Input Management System
// Handles mouse input, drag detection, and tool state management

import { Tools, Directions, GameConfig } from '../utils/Constants.js';
import { gridKey } from '../utils/Helpers.js';

export class InputManager {
    constructor(scene, gameState, gridManager) {
        this.scene = scene;
        this.gameState = gameState;
        this.gridManager = gridManager;
        
        // Input state
        this.isPointerDown = false;
        this.isDragging = false;
        this.dragStartPosition = null;
        this.dragStartCell = null;
        this.currentHoveredCell = null;
        this.lastClickTime = 0;
        
        // Tool state
        this.currentTool = Tools.PLACE;
        
        // Drag threshold for detecting drag vs click
        this.dragThreshold = 10;
        
        // Initialize input handling
        this.setupInputEvents();
    }

    /**
     * Set up input event listeners
     */
    setupInputEvents() {
        // Global pointer events
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        
        // Scene-specific events from cells and roads
        this.scene.events.on('cellClicked', this.onCellClicked, this);
        this.scene.events.on('cellHovered', this.onCellHovered, this);
        this.scene.events.on('cellHoverEnd', this.onCellHoverEnd, this);
        
        this.scene.events.on('roadClicked', this.onRoadClicked, this);
        this.scene.events.on('roadHovered', this.onRoadHovered, this);
        this.scene.events.on('roadHoverEnd', this.onRoadHoverEnd, this);
        this.scene.events.on('roadDragStart', this.onRoadDragStart, this);
        this.scene.events.on('roadDrag', this.onRoadDrag, this);
        this.scene.events.on('roadDragEnd', this.onRoadDragEnd, this);
        
        // Game state events
        this.gameState.on('toolChanged', this.onToolChanged, this);
        
        console.log('Input manager initialized');
    }

    /**
     * Global pointer down handler
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onPointerDown(pointer) {
        this.isPointerDown = true;
        this.isDragging = false;
        this.dragStartPosition = { x: pointer.x, y: pointer.y };
        
        // Convert to grid coordinates
        const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
        this.dragStartCell = gridPos;
        
        console.log('Pointer down at:', pointer.worldX, pointer.worldY, 'Grid:', gridPos);
    }

    /**
     * Global pointer move handler
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onPointerMove(pointer) {
        // Update hovered cell
        const gridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
        this.updateHoveredCell(gridPos);
        
        // Check for drag start
        if (this.isPointerDown && !this.isDragging && this.dragStartPosition) {
            const distance = Phaser.Math.Distance.Between(
                pointer.x, pointer.y,
                this.dragStartPosition.x, this.dragStartPosition.y
            );
            
            if (distance > this.dragThreshold) {
                this.isDragging = true;
                this.onDragStart(pointer);
            }
        }
        
        // Handle drag continue
        if (this.isDragging) {
            this.onDragContinue(pointer);
        }
    }

    /**
     * Global pointer up handler
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onPointerUp(pointer) {
        const wasPointerDown = this.isPointerDown;
        const wasDragging = this.isDragging;
        
        this.isPointerDown = false;
        this.isDragging = false;
        
        // Handle drag end
        if (wasDragging) {
            this.onDragEnd(pointer);
        }
        
        // Reset drag state
        this.dragStartPosition = null;
        this.dragStartCell = null;
        
        console.log('Pointer up, was dragging:', wasDragging);
    }

    /**
     * Update hovered cell state
     * @param {Object|null} gridPos - Grid position {row, col} or null
     */
    updateHoveredCell(gridPos) {
        // Clear previous hover
        if (this.currentHoveredCell) {
            const prevCell = this.gridManager.getCell(this.currentHoveredCell.row, this.currentHoveredCell.col);
            if (prevCell) {
                prevCell.setHighlighted(false);
            }
            
            const prevRoad = this.gridManager.getRoad(this.currentHoveredCell.row, this.currentHoveredCell.col);
            if (prevRoad) {
                prevRoad.setHighlighted(false);
            }
        }
        
        // Set new hover
        this.currentHoveredCell = gridPos;
        this.gameState.setHoveredCell(gridPos);
        
        if (gridPos) {
            const cell = this.gridManager.getCell(gridPos.row, gridPos.col);
            if (cell) {
                cell.setHighlighted(true);
            }
            
            const road = this.gridManager.getRoad(gridPos.row, gridPos.col);
            if (road) {
                road.setHighlighted(true);
            }
        }
    }

    /**
     * Handle drag start
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onDragStart(pointer) {
        console.log('Drag started');
        
        // Emit drag start event based on current tool
        this.scene.events.emit('inputDragStart', {
            tool: this.currentTool,
            startCell: this.dragStartCell,
            pointer: pointer
        });
    }

    /**
     * Handle drag continue
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onDragContinue(pointer) {
        const currentGridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
        
        // Handle arrow drawing for roads
        if (this.currentTool === Tools.ARROW && this.dragStartCell && currentGridPos) {
            this.handleArrowDrawing(this.dragStartCell, currentGridPos);
        }
        
        // Emit drag continue event
        this.scene.events.emit('inputDragContinue', {
            tool: this.currentTool,
            startCell: this.dragStartCell,
            currentCell: currentGridPos,
            pointer: pointer
        });
    }

    /**
     * Handle drag end
     * @param {Phaser.Input.Pointer} pointer - Pointer event
     */
    onDragEnd(pointer) {
        const endGridPos = this.gridManager.worldToGrid(pointer.worldX, pointer.worldY);
        
        console.log('Drag ended from', this.dragStartCell, 'to', endGridPos);
        
        // Handle arrow completion
        if (this.currentTool === Tools.ARROW && this.dragStartCell && endGridPos) {
            this.completeArrowDrawing(this.dragStartCell, endGridPos);
        }
        
        // Emit drag end event
        this.scene.events.emit('inputDragEnd', {
            tool: this.currentTool,
            startCell: this.dragStartCell,
            endCell: endGridPos,
            pointer: pointer
        });
    }

    /**
     * Handle arrow drawing during drag
     * @param {Object} startCell - Start grid position
     * @param {Object} currentCell - Current grid position
     */
    handleArrowDrawing(startCell, currentCell) {
        // Only draw arrows on roads
        const road = this.gridManager.getRoad(startCell.row, startCell.col);
        if (!road) {
            return;
        }
        
        // Calculate direction from start to current
        const direction = this.calculateDirection(startCell, currentCell);
        if (direction) {
            // Provide visual feedback (could highlight direction)
            console.log('Drawing arrow direction:', direction);
        }
    }

    /**
     * Complete arrow drawing
     * @param {Object} startCell - Start grid position
     * @param {Object} endCell - End grid position
     */
    completeArrowDrawing(startCell, endCell) {
        const road = this.gridManager.getRoad(startCell.row, startCell.col);
        if (!road) {
            console.warn('No road at start position for arrow drawing');
            return;
        }
        
        const direction = this.calculateDirection(startCell, endCell);
        if (direction) {
            // Add direction to road
            road.addDirection(direction);
            
            // Update game state
            this.gameState.updateRoadDirections(startCell.row, startCell.col, road.directions);
            
            console.log(`Arrow added: ${direction} on road at ${startCell.row},${startCell.col}`);
        }
    }

    /**
     * Calculate direction from one cell to another
     * @param {Object} fromCell - Start position {row, col}
     * @param {Object} toCell - End position {row, col}
     * @returns {string|null} Direction or null
     */
    calculateDirection(fromCell, toCell) {
        if (!fromCell || !toCell) {
            return null;
        }
        
        const deltaRow = toCell.row - fromCell.row;
        const deltaCol = toCell.col - fromCell.col;
        
        // Only consider adjacent cells for now (could be enhanced for diagonal)
        if (Math.abs(deltaRow) + Math.abs(deltaCol) !== 1) {
            return null;
        }
        
        if (deltaRow === -1) return Directions.UP;
        if (deltaRow === 1) return Directions.DOWN;
        if (deltaCol === -1) return Directions.LEFT;
        if (deltaCol === 1) return Directions.RIGHT;
        
        return null;
    }

    /**
     * Cell clicked event handler
     * @param {Object} event - Event data
     */
    onCellClicked(event) {
        const { row, col, cell } = event;
        
        console.log(`Cell clicked at ${row},${col}, tool: ${this.currentTool}`);
        
        // Handle based on current tool
        switch (this.currentTool) {
            case Tools.PLACE:
                this.handleRoadPlacement(row, col);
                break;
                
            case Tools.DELETE:
                this.handleRoadDeletion(row, col);
                break;
                
            case Tools.ARROW:
                // Arrow tool is handled by drag events
                break;
                
            default:
                console.warn('Unknown tool:', this.currentTool);
        }
        
        // Update selected cell
        this.gameState.setSelectedCell({ row, col });
    }

    /**
     * Handle road placement
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     */
    handleRoadPlacement(row, col) {
        // Check if position is editable
        if (!this.gridManager.isPositionEditable(row, col)) {
            console.warn(`Cannot place road at ${row},${col}: position not editable`);
            return;
        }
        
        // Check if road already exists
        if (this.gridManager.hasRoad(row, col)) {
            console.warn(`Road already exists at ${row},${col}`);
            return;
        }
        
        // Check budget
        if (!this.gameState.canAfford(GameConfig.roadCost)) {
            console.warn('Cannot afford road placement');
            return;
        }
        
        // Place road
        if (this.gridManager.placeRoad(row, col)) {
            // Update game state
            if (this.gameState.placeRoad(row, col, {})) {
                console.log(`Road successfully placed at ${row},${col}`);
            }
        }
    }

    /**
     * Handle road deletion
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     */
    handleRoadDeletion(row, col) {
        // Check if road exists
        if (!this.gridManager.hasRoad(row, col)) {
            console.warn(`No road to delete at ${row},${col}`);
            return;
        }
        
        // Remove road
        if (this.gridManager.removeRoad(row, col)) {
            // Update game state
            if (this.gameState.removeRoad(row, col)) {
                console.log(`Road successfully removed from ${row},${col}`);
            }
        }
    }

    /**
     * Cell hovered event handler
     * @param {Object} event - Event data
     */
    onCellHovered(event) {
        // Additional hover logic if needed
    }

    /**
     * Cell hover end event handler
     * @param {Object} event - Event data
     */
    onCellHoverEnd(event) {
        // Additional hover end logic if needed
    }

    /**
     * Road clicked event handler
     * @param {Object} event - Event data
     */
    onRoadClicked(event) {
        const { row, col, road } = event;
        
        console.log(`Road clicked at ${row},${col}, tool: ${this.currentTool}`);
        
        // Handle based on current tool
        switch (this.currentTool) {
            case Tools.DELETE:
                this.handleRoadDeletion(row, col);
                break;
                
            case Tools.ARROW:
                // Arrow tool is handled by drag events
                break;
                
            case Tools.PLACE:
                // Maybe show road info or do nothing
                break;
                
            default:
                console.warn('Unknown tool:', this.currentTool);
        }
        
        // Update selected cell
        this.gameState.setSelectedCell({ row, col });
    }

    /**
     * Road hovered event handler
     * @param {Object} event - Event data
     */
    onRoadHovered(event) {
        // Additional road hover logic if needed
    }

    /**
     * Road hover end event handler
     * @param {Object} event - Event data
     */
    onRoadHoverEnd(event) {
        // Additional road hover end logic if needed
    }

    /**
     * Road drag start event handler
     * @param {Object} event - Event data
     */
    onRoadDragStart(event) {
        console.log('Road drag start:', event);
    }

    /**
     * Road drag event handler
     * @param {Object} event - Event data
     */
    onRoadDrag(event) {
        // This is called from Road entity's drag handler
        if (this.currentTool === Tools.ARROW && event.direction) {
            console.log('Road drag direction:', event.direction);
        }
    }

    /**
     * Road drag end event handler
     * @param {Object} event - Event data
     */
    onRoadDragEnd(event) {
        console.log('Road drag end:', event);
    }

    /**
     * Tool changed event handler
     * @param {Object} event - Event data with oldTool and newTool
     */
    onToolChanged(event) {
        this.currentTool = event.newTool;
        console.log(`Input manager tool changed to: ${this.currentTool}`);
        
        // Update cursor or visual feedback based on tool
        this.updateCursorForTool(this.currentTool);
    }

    /**
     * Update cursor appearance based on current tool
     * @param {string} tool - Current tool
     */
    updateCursorForTool(tool) {
        // Phaser cursor handling (could be enhanced with custom cursors)
        const canvas = this.scene.game.canvas;
        
        switch (tool) {
            case Tools.PLACE:
                canvas.style.cursor = 'crosshair';
                break;
                
            case Tools.DELETE:
                canvas.style.cursor = 'not-allowed';
                break;
                
            case Tools.ARROW:
                canvas.style.cursor = 'grab';
                break;
                
            default:
                canvas.style.cursor = 'default';
        }
    }

    /**
     * Get current tool
     * @returns {string} Current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }

    /**
     * Check if currently dragging
     * @returns {boolean} True if dragging
     */
    isDraggingActive() {
        return this.isDragging;
    }

    /**
     * Get current hovered cell
     * @returns {Object|null} Hovered cell {row, col} or null
     */
    getHoveredCell() {
        return this.currentHoveredCell;
    }

    /**
     * Enable input handling
     */
    enable() {
        this.scene.input.enabled = true;
    }

    /**
     * Disable input handling (e.g., during simulation)
     */
    disable() {
        this.scene.input.enabled = false;
        
        // Clear current state
        this.updateHoveredCell(null);
        this.gameState.setSelectedCell(null);
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        
        this.scene.events.off('cellClicked', this.onCellClicked, this);
        this.scene.events.off('cellHovered', this.onCellHovered, this);
        this.scene.events.off('cellHoverEnd', this.onCellHoverEnd, this);
        
        this.scene.events.off('roadClicked', this.onRoadClicked, this);
        this.scene.events.off('roadHovered', this.onRoadHovered, this);
        this.scene.events.off('roadHoverEnd', this.onRoadHoverEnd, this);
        this.scene.events.off('roadDragStart', this.onRoadDragStart, this);
        this.scene.events.off('roadDrag', this.onRoadDrag, this);
        this.scene.events.off('roadDragEnd', this.onRoadDragEnd, this);
        
        this.gameState.off('toolChanged', this.onToolChanged, this);
        
        console.log('Input manager destroyed');
    }
}

export default InputManager;