// Traffic Simulation Game - Grid Management System
// Handles grid creation, cell management, and visual rendering

import { GameConfig, Colors, CellTypes, ZLayers } from '../utils/Constants.js';
import { gridToWorld, worldToGrid, gridKey, getCarColor } from '../utils/Helpers.js';
import Cell from '../entities/Cell.js';
import Road from '../entities/Road.js';

export class GridManager {
    constructor(scene) {
        this.scene = scene;
        this.levelData = null;
        this.gridDimensions = { rows: 0, columns: 0 };
        this.gridOffset = { x: 0, y: 0 };
        
        // Grid storage
        this.cells = new Map(); // Map of "row,col" -> Cell
        this.roads = new Map(); // Map of "row,col" -> Road
        
        // Visual elements
        this.gridContainer = null;
        this.entranceExitContainer = null;
        this.gridLines = null;
        
        // State
        this.isInitialized = false;
    }

    /**
     * Initialize grid with level data
     * @param {Object} levelData - Processed level data from LevelManager
     */
    initialize(levelData) {
        console.log('Initializing grid with level data:', levelData);
        
        this.levelData = levelData;
        this.gridDimensions = {
            rows: levelData.grid.rows,
            columns: levelData.grid.columns
        };
        
        // Calculate grid offset to center it on screen
        this.calculateGridOffset();
        
        // Clear existing grid
        this.destroy();
        
        // Create containers
        this.createContainers();
        
        // Create grid visual elements
        this.createGridLines();
        this.createCells();
        this.createEntranceExitIndicators();
        
        this.isInitialized = true;
        console.log('Grid initialization complete');
    }

    /**
     * Calculate grid offset to center grid on screen
     */
    calculateGridOffset() {
        const gridWidth = this.gridDimensions.columns * GameConfig.cellSize;
        const gridHeight = this.gridDimensions.rows * GameConfig.cellSize;
        
        // Center the grid in the scene
        this.gridOffset = {
            x: (this.scene.cameras.main.width - gridWidth) / 2,
            y: (this.scene.cameras.main.height - gridHeight) / 2
        };
        
        // Ensure minimum margins
        const minMargin = 50;
        this.gridOffset.x = Math.max(minMargin, this.gridOffset.x);
        this.gridOffset.y = Math.max(minMargin, this.gridOffset.y);
    }

    /**
     * Create visual containers for organization
     */
    createContainers() {
        // Main grid container
        this.gridContainer = this.scene.add.container(0, 0);
        this.gridContainer.setDepth(ZLayers.BACKGROUND);
        
        // Entrance/exit indicators container
        this.entranceExitContainer = this.scene.add.container(0, 0);
        this.entranceExitContainer.setDepth(ZLayers.UI_ELEMENTS);
    }

    /**
     * Create grid lines
     */
    createGridLines() {
        this.gridLines = this.scene.add.graphics();
        this.gridLines.setDepth(ZLayers.GRID_LINES);
        this.gridContainer.add(this.gridLines);
        
        this.drawGridLines();
    }

    /**
     * Draw the grid lines
     */
    drawGridLines() {
        if (!this.gridLines) return;
        
        this.gridLines.clear();
        this.gridLines.lineStyle(GameConfig.gridLineWidth, Colors.gridLine, 0.3);
        
        const { rows, columns } = this.gridDimensions;
        const cellSize = GameConfig.cellSize;
        
        // Vertical lines
        for (let col = 0; col <= columns; col++) {
            const x = this.gridOffset.x + col * cellSize;
            const y1 = this.gridOffset.y;
            const y2 = this.gridOffset.y + rows * cellSize;
            
            this.gridLines.lineBetween(x, y1, x, y2);
        }
        
        // Horizontal lines
        for (let row = 0; row <= rows; row++) {
            const y = this.gridOffset.y + row * cellSize;
            const x1 = this.gridOffset.x;
            const x2 = this.gridOffset.x + columns * cellSize;
            
            this.gridLines.lineBetween(x1, y, x2, y);
        }
    }

    /**
     * Create all cells based on level data
     */
    createCells() {
        const { rows, columns } = this.gridDimensions;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                this.createCell(row, col);
            }
        }
    }

    /**
     * Create a single cell
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     */
    createCell(row, col) {
        // Determine cell type from level data
        const cellType = this.getCellType(row, col);
        
        // Create cell with world position adjustment
        const cell = new Cell(this.scene, row, col, cellType);
        cell.setPosition(
            this.gridOffset.x + col * GameConfig.cellSize + GameConfig.cellSize / 2,
            this.gridOffset.y + row * GameConfig.cellSize + GameConfig.cellSize / 2
        );
        
        // Store cell
        const key = gridKey(row, col);
        this.cells.set(key, cell);
        
        // Add to container
        this.gridContainer.add(cell);
    }

    /**
     * Get cell type for a position based on level data
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {string} Cell type
     */
    getCellType(row, col) {
        if (!this.levelData) {
            return CellTypes.EDITABLE;
        }
        
        // Check if cell is in uneditable areas
        const key = gridKey(row, col);
        if (this.levelData.uneditableCells && this.levelData.uneditableCells.has(key)) {
            return this.levelData.cellTypes.get(key) || CellTypes.TREE;
        }
        
        return CellTypes.EDITABLE;
    }

    /**
     * Create entrance and exit indicators
     */
    createEntranceExitIndicators() {
        if (!this.levelData || !this.levelData.cars) {
            return;
        }
        
        this.levelData.cars.forEach((carData, carIndex) => {
            // Create entrance indicators
            carData.entrances.forEach((entrance, entranceIndex) => {
                this.createEntranceIndicator(entrance, carData.color, `${carIndex}-${entranceIndex}`);
            });
            
            // Create exit indicator
            this.createExitIndicator(carData.exit, carData.color, carIndex);
        });
    }

    /**
     * Create entrance indicator
     * @param {Object} entrance - Entrance data with processed coordinates
     * @param {string} color - Car color
     * @param {string} id - Unique identifier
     */
    createEntranceIndicator(entrance, color, id) {
        let worldX, worldY;
        
        if (entrance.isEntrance) {
            // Calculate position outside grid based on entrance side
            const cellSize = GameConfig.cellSize;
            const margin = cellSize / 2;
            
            switch (entrance.side) {
                case 'left':
                    worldX = this.gridOffset.x - margin;
                    worldY = this.gridOffset.y + (entrance.row + 0.5) * cellSize;
                    break;
                case 'right':
                    worldX = this.gridOffset.x + this.gridDimensions.columns * cellSize + margin;
                    worldY = this.gridOffset.y + (entrance.row + 0.5) * cellSize;
                    break;
                case 'top':
                    worldX = this.gridOffset.x + (entrance.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y - margin;
                    break;
                case 'bottom':
                    worldX = this.gridOffset.x + (entrance.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y + this.gridDimensions.rows * cellSize + margin;
                    break;
                default:
                    // Default to grid position if side is not recognized
                    worldX = this.gridOffset.x + (entrance.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y + (entrance.row + 0.5) * cellSize;
            }
        } else {
            // Normal grid position
            worldX = this.gridOffset.x + (entrance.col + 0.5) * cellSize;
            worldY = this.gridOffset.y + (entrance.row + 0.5) * cellSize;
        }
        
        // Create car sprite/shape for entrance
        const carIndicator = this.scene.add.graphics();
        carIndicator.setPosition(worldX, worldY);
        
        // Draw a simple car shape
        const carColor = getCarColor(color);
        const carSize = GameConfig.cellSize * 0.3;
        
        carIndicator.fillStyle(carColor, 1.0);
        carIndicator.fillRoundedRect(-carSize / 2, -carSize / 2, carSize, carSize, 2);
        
        // Add border
        carIndicator.lineStyle(1, Colors.textPrimary, 1.0);
        carIndicator.strokeRoundedRect(-carSize / 2, -carSize / 2, carSize, carSize, 2);
        
        this.entranceExitContainer.add(carIndicator);
    }

    /**
     * Create exit indicator
     * @param {Object} exit - Exit data with processed coordinates
     * @param {string} color - Car color
     * @param {number} carIndex - Car index
     */
    createExitIndicator(exit, color, carIndex) {
        let worldX, worldY;
        
        if (exit.isEntrance) {
            // Calculate position outside grid based on exit side
            const cellSize = GameConfig.cellSize;
            const margin = cellSize / 2;
            
            switch (exit.side) {
                case 'left':
                    worldX = this.gridOffset.x - margin;
                    worldY = this.gridOffset.y + (exit.row + 0.5) * cellSize;
                    break;
                case 'right':
                    worldX = this.gridOffset.x + this.gridDimensions.columns * cellSize + margin;
                    worldY = this.gridOffset.y + (exit.row + 0.5) * cellSize;
                    break;
                case 'top':
                    worldX = this.gridOffset.x + (exit.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y - margin;
                    break;
                case 'bottom':
                    worldX = this.gridOffset.x + (exit.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y + this.gridDimensions.rows * cellSize + margin;
                    break;
                default:
                    // Default to grid position
                    worldX = this.gridOffset.x + (exit.col + 0.5) * cellSize;
                    worldY = this.gridOffset.y + (exit.row + 0.5) * cellSize;
            }
        } else {
            // Normal grid position
            worldX = this.gridOffset.x + (exit.col + 0.5) * cellSize;
            worldY = this.gridOffset.y + (exit.row + 0.5) * cellSize;
        }
        
        // Create flag shape for exit
        const flagIndicator = this.scene.add.graphics();
        flagIndicator.setPosition(worldX, worldY);
        
        const flagColor = getCarColor(color);
        const flagSize = GameConfig.cellSize * 0.3;
        
        // Flag pole
        flagIndicator.lineStyle(2, Colors.textPrimary, 1.0);
        flagIndicator.lineBetween(0, -flagSize / 2, 0, flagSize / 2);
        
        // Flag
        flagIndicator.fillStyle(flagColor, 1.0);
        flagIndicator.fillTriangle(
            2, -flagSize / 2,
            flagSize * 0.7, -flagSize / 4,
            2, 0
        );
        
        // Flag border
        flagIndicator.lineStyle(1, Colors.textPrimary, 1.0);
        flagIndicator.strokeTriangle(
            2, -flagSize / 2,
            flagSize * 0.7, -flagSize / 4,
            2, 0
        );
        
        this.entranceExitContainer.add(flagIndicator);
    }

    /**
     * Place a road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if successful
     */
    placeRoad(row, col) {
        const key = gridKey(row, col);
        
        // Check if position is valid and editable
        if (!this.isValidPosition(row, col) || !this.isPositionEditable(row, col)) {
            return false;
        }
        
        // Check if road already exists
        if (this.roads.has(key)) {
            return false;
        }
        
        // Create road
        const road = new Road(this.scene, row, col);
        road.setPosition(
            this.gridOffset.x + col * GameConfig.cellSize + GameConfig.cellSize / 2,
            this.gridOffset.y + row * GameConfig.cellSize + GameConfig.cellSize / 2
        );
        
        // Store road
        this.roads.set(key, road);
        
        // Update cell type
        const cell = this.cells.get(key);
        if (cell) {
            cell.setCellType(CellTypes.ROAD);
        }
        
        // Add to container
        this.gridContainer.add(road);
        
        console.log(`Road placed at ${row},${col}`);
        return true;
    }

    /**
     * Remove a road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if successful
     */
    removeRoad(row, col) {
        const key = gridKey(row, col);
        const road = this.roads.get(key);
        
        if (!road) {
            return false;
        }
        
        // Remove road
        road.destroy();
        this.roads.delete(key);
        
        // Update cell type back to editable
        const cell = this.cells.get(key);
        if (cell) {
            cell.setCellType(CellTypes.EDITABLE);
        }
        
        console.log(`Road removed from ${row},${col}`);
        return true;
    }

    /**
     * Get road at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {Road|null} Road instance or null
     */
    getRoad(row, col) {
        return this.roads.get(gridKey(row, col)) || null;
    }

    /**
     * Check if road exists at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if road exists
     */
    hasRoad(row, col) {
        return this.roads.has(gridKey(row, col));
    }

    /**
     * Get cell at coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {Cell|null} Cell instance or null
     */
    getCell(row, col) {
        return this.cells.get(gridKey(row, col)) || null;
    }

    /**
     * Check if position is within grid bounds
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if valid
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridDimensions.rows &&
               col >= 0 && col < this.gridDimensions.columns;
    }

    /**
     * Check if position is editable (can place roads)
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if editable
     */
    isPositionEditable(row, col) {
        if (!this.isValidPosition(row, col)) {
            return false;
        }
        
        const cell = this.getCell(row, col);
        return cell ? cell.isEditable() : false;
    }

    /**
     * Convert world coordinates to grid coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object|null} {row, col} or null if outside grid
     */
    worldToGrid(worldX, worldY) {
        const gridPos = worldToGrid(worldX, worldY, this.gridOffset.x, this.gridOffset.y);
        
        if (this.isValidPosition(gridPos.row, gridPos.col)) {
            return gridPos;
        }
        
        return null;
    }

    /**
     * Convert grid coordinates to world coordinates
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {Object} {x, y} world coordinates
     */
    gridToWorld(row, col) {
        return gridToWorld(row, col, this.gridOffset.x, this.gridOffset.y);
    }

    /**
     * Get all roads data for pathfinding
     * @returns {Map} Map of road positions
     */
    getRoadsData() {
        return new Map(this.roads);
    }

    /**
     * Get grid dimensions
     * @returns {Object} {rows, columns}
     */
    getGridDimensions() {
        return { ...this.gridDimensions };
    }

    /**
     * Get grid offset
     * @returns {Object} {x, y}
     */
    getGridOffset() {
        return { ...this.gridOffset };
    }

    /**
     * Update visual state based on game state
     * @param {Object} gameState - Current game state
     */
    updateVisualState(gameState) {
        // Update cell highlights, selections, etc.
        if (gameState.hoveredCell) {
            const cell = this.getCell(gameState.hoveredCell.row, gameState.hoveredCell.col);
            if (cell) {
                cell.setHighlighted(true);
            }
        }
        
        if (gameState.selectedCell) {
            const cell = this.getCell(gameState.selectedCell.row, gameState.selectedCell.col);
            if (cell) {
                cell.setSelected(true);
            }
        }
    }

    /**
     * Clear all visual highlights and selections
     */
    clearVisualState() {
        this.cells.forEach(cell => {
            cell.setHighlighted(false);
            cell.setSelected(false);
        });
        
        this.roads.forEach(road => {
            road.setHighlighted(false);
        });
    }

    /**
     * Get level data
     * @returns {Object|null} Level data
     */
    getLevelData() {
        return this.levelData;
    }

    /**
     * Check if grid is initialized
     * @returns {boolean} True if initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Destroy all cells
        this.cells.forEach(cell => cell.destroy());
        this.cells.clear();
        
        // Destroy all roads
        this.roads.forEach(road => road.destroy());
        this.roads.clear();
        
        // Destroy containers and graphics
        if (this.gridContainer) {
            this.gridContainer.destroy();
            this.gridContainer = null;
        }
        
        if (this.entranceExitContainer) {
            this.entranceExitContainer.destroy();
            this.entranceExitContainer = null;
        }
        
        if (this.gridLines) {
            this.gridLines.destroy();
            this.gridLines = null;
        }
        
        this.isInitialized = false;
        console.log('Grid destroyed');
    }
}

export default GridManager;