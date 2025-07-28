// Traffic Simulation Game - Pathfinding Integration
// A* pathfinding integration wrapper using PathFinding.js library

import { isValidGridPosition } from './Helpers.js';

/**
 * PathFinder class that integrates PathFinding.js for traffic simulation
 */
export class PathFinder {
    constructor() {
        // Check if PathFinding.js is loaded
        if (typeof PF === 'undefined') {
            throw new Error('PathFinding.js library not loaded! Make sure PF is available globally.');
        }
        
        // Check if required components are available
        if (!PF.AStarFinder || !PF.Grid || !PF.Heuristic) {
            throw new Error('PathFinding.js components missing! AStarFinder, Grid, or Heuristic not available.');
        }
        
        this.grid = null;
        this.finder = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
        
        // Initialize A* finder with optimal settings for grid movement
        this.initializeFinder();
        
        console.log('PathFinder initialized');
    }

    /**
     * Initialize the A* pathfinder with optimal settings
     */
    initializeFinder() {
        // CRITICAL: PathFinding.js requires specific grid format
        this.finder = new PF.AStarFinder({
            allowDiagonal: false,        // No diagonal movement
            dontCrossCorners: true,      // Don't cut corners
            heuristic: PF.Heuristic.manhattan,  // Best for grid movement
            weight: 1 // Standard A* weight
        });
        
        console.log('A* finder initialized with manhattan heuristic');
    }

    /**
     * Initialize grid with specified dimensions
     * @param {number} width - Grid width (columns)
     * @param {number} height - Grid height (rows)
     */
    initializeGrid(width, height) {
        this.gridWidth = width;
        this.gridHeight = height;
        
        // Create new grid - all cells blocked by default
        this.grid = new PF.Grid(width, height);
        
        // Initially all cells are blocked (1), we'll update with roads
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.grid.setWalkableAt(x, y, false); // false = blocked
            }
        }
        
        console.log(`PathFinding grid initialized: ${width}x${height}`);
    }

    /**
     * Update the pathfinding grid with current road and obstacle data
     * @param {Map} roads - Map of road positions ("row,col" -> Road object)
     * @param {Set} obstacles - Set of obstacle positions ("row,col")
     * @param {number} gridRows - Total grid rows
     * @param {number} gridCols - Total grid columns
     */
    updateGrid(roads, obstacles, gridRows, gridCols) {
        // Reinitialize grid if dimensions changed
        if (this.gridWidth !== gridCols || this.gridHeight !== gridRows) {
            this.initializeGrid(gridCols, gridRows);
        }
        
        if (!this.grid) {
            this.initializeGrid(gridCols, gridRows);
        }
        
        // Reset all cells to blocked
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid.setWalkableAt(x, y, false);
            }
        }
        
        // GOTCHA: 0 = walkable, 1 = blocked in PathFinding.js
        // Set roads as walkable (0/false)
        for (let [posKey, road] of roads) {
            const [row, col] = posKey.split(',').map(Number);
            
            // PathFinding.js uses (x, y) where x=col, y=row
            if (isValidGridPosition(row, col, gridRows, gridCols)) {
                this.grid.setWalkableAt(col, row, true); // true = walkable
            }
        }
        
        // Obstacles remain blocked (already set to false above)
        // But let's explicitly ensure obstacles are blocked
        if (obstacles) {
            for (let posKey of obstacles) {
                const [row, col] = posKey.split(',').map(Number);
                
                if (isValidGridPosition(row, col, gridRows, gridCols)) {
                    this.grid.setWalkableAt(col, row, false); // false = blocked
                }
            }
        }
        
        console.log(`Grid updated: ${roads.size} roads, ${obstacles ? obstacles.size : 0} obstacles`);
    }

    /**
     * Find path between two points
     * @param {number} startRow - Start row (game coordinates)
     * @param {number} startCol - Start column (game coordinates)
     * @param {number} endRow - End row (game coordinates)
     * @param {number} endCol - End column (game coordinates)
     * @returns {Array|null} Array of [x, y] coordinates or null if no path
     */
    findPath(startRow, startCol, endRow, endCol) {
        if (!this.grid || !this.finder) {
            console.error('PathFinder not properly initialized');
            return null;
        }
        
        // Convert game coordinates (row, col) to PathFinding.js coordinates (x, y)
        const startX = startCol;
        const startY = startRow;
        const endX = endCol;
        const endY = endRow;
        
        // Validate coordinates
        if (!isValidGridPosition(startRow, startCol, this.gridHeight, this.gridWidth) ||
            !isValidGridPosition(endRow, endCol, this.gridHeight, this.gridWidth)) {
            console.warn(`Invalid coordinates: start(${startRow},${startCol}) end(${endRow},${endCol})`);
            return null;
        }
        
        // Check if start and end positions are walkable
        if (!this.grid.isWalkableAt(startX, startY)) {
            console.warn(`Start position (${startRow},${startCol}) is not walkable`);
            return null;
        }
        
        if (!this.grid.isWalkableAt(endX, endY)) {
            console.warn(`End position (${endRow},${endCol}) is not walkable`);
            return null;
        }
        
        // CRITICAL: Must clone grid before each pathfinding call
        const gridClone = this.grid.clone();
        
        try {
            // Find path using A*
            const path = this.finder.findPath(startX, startY, endX, endY, gridClone);
            
            if (path && path.length > 0) {
                console.log(`Path found: ${path.length} steps from (${startRow},${startCol}) to (${endRow},${endCol})`);
                
                // Convert path coordinates back to game format: [x, y] -> {row, col}
                return path.map(([x, y]) => ({
                    row: y,
                    col: x
                }));
            } else {
                console.warn(`No path found from (${startRow},${startCol}) to (${endRow},${endCol})`);
                return null;
            }
        } catch (error) {
            console.error('Pathfinding error:', error);
            return null;
        }
    }

    /**
     * Find path with entrance/exit support (positions may be outside grid)
     * @param {Object} start - Start position {row, col, isEntrance, side}
     * @param {Object} end - End position {row, col, isEntrance, side}
     * @param {number} gridRows - Grid rows
     * @param {number} gridCols - Grid columns
     * @returns {Array|null} Path or null
     */
    findPathWithEntrances(start, end, gridRows, gridCols) {
        // Handle entrance/exit positions that may be outside the grid
        let actualStart = start;
        let actualEnd = end;
        
        // If start is an entrance, find nearest valid grid position
        if (start.isEntrance) {
            actualStart = this.findNearestValidPosition(start, gridRows, gridCols);
            if (!actualStart) {
                console.warn('No valid start position found near entrance');
                return null;
            }
        }
        
        // If end is an exit, find nearest valid grid position
        if (end.isEntrance) {
            actualEnd = this.findNearestValidPosition(end, gridRows, gridCols);
            if (!actualEnd) {
                console.warn('No valid end position found near exit');
                return null;
            }
        }
        
        // Find path between actual positions
        return this.findPath(actualStart.row, actualStart.col, actualEnd.row, actualEnd.col);
    }

    /**
     * Find nearest valid (walkable) grid position to an entrance/exit
     * @param {Object} position - Position with {row, col, isEntrance, side}
     * @param {number} gridRows - Grid rows
     * @param {number} gridCols - Grid columns
     * @returns {Object|null} Valid position {row, col} or null
     */
    findNearestValidPosition(position, gridRows, gridCols) {
        // If position is already valid and walkable, return it
        if (isValidGridPosition(position.row, position.col, gridRows, gridCols)) {
            if (this.grid && this.grid.isWalkableAt(position.col, position.row)) {
                return { row: position.row, col: position.col };
            }
        }
        
        // Search nearby positions in expanding circles
        const maxSearchRadius = Math.max(gridRows, gridCols);
        
        for (let radius = 1; radius <= maxSearchRadius; radius++) {
            // Search positions at current radius
            for (let deltaRow = -radius; deltaRow <= radius; deltaRow++) {
                for (let deltaCol = -radius; deltaCol <= radius; deltaCol++) {
                    // Only check positions on the current radius boundary
                    if (Math.abs(deltaRow) !== radius && Math.abs(deltaCol) !== radius) {
                        continue;
                    }
                    
                    const testRow = position.row + deltaRow;
                    const testCol = position.col + deltaCol;
                    
                    if (isValidGridPosition(testRow, testCol, gridRows, gridCols)) {
                        if (this.grid && this.grid.isWalkableAt(testCol, testRow)) {
                            return { row: testRow, col: testCol };
                        }
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Check if a position is walkable
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     * @returns {boolean} True if walkable
     */
    isWalkable(row, col) {
        if (!this.grid) {
            return false;
        }
        
        if (!isValidGridPosition(row, col, this.gridHeight, this.gridWidth)) {
            return false;
        }
        
        return this.grid.isWalkableAt(col, row);
    }

    /**
     * Get grid dimensions
     * @returns {Object} {width, height}
     */
    getGridDimensions() {
        return {
            width: this.gridWidth,
            height: this.gridHeight
        };
    }

    /**
     * Debug: Print grid state to console
     */
    debugPrintGrid() {
        if (!this.grid) {
            console.log('No grid to print');
            return;
        }
        
        console.log('PathFinding Grid State (. = walkable, # = blocked):');
        let output = '';
        
        for (let y = 0; y < this.gridHeight; y++) {
            let row = '';
            for (let x = 0; x < this.gridWidth; x++) {
                row += this.grid.isWalkableAt(x, y) ? '.' : '#';
            }
            output += row + '\n';
        }
        
        console.log(output);
    }

    /**
     * Get pathfinding statistics
     * @returns {Object} Stats object
     */
    getStats() {
        if (!this.grid) {
            return { walkableCells: 0, blockedCells: 0, totalCells: 0 };
        }
        
        let walkableCells = 0;
        let blockedCells = 0;
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid.isWalkableAt(x, y)) {
                    walkableCells++;
                } else {
                    blockedCells++;
                }
            }
        }
        
        return {
            walkableCells,
            blockedCells,
            totalCells: walkableCells + blockedCells,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight
        };
    }

    /**
     * Clear pathfinding grid
     */
    clear() {
        if (this.grid) {
            // Reset all cells to blocked
            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    this.grid.setWalkableAt(x, y, false);
                }
            }
        }
    }

    /**
     * Destroy pathfinder and clean up resources
     */
    destroy() {
        this.grid = null;
        this.finder = null;
        this.gridWidth = 0;
        this.gridHeight = 0;
        
        console.log('PathFinder destroyed');
    }
}

// Export singleton instance
export const pathFinder = new PathFinder();
export default pathFinder;