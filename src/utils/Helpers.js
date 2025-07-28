// Traffic Simulation Game - Helper Functions
// Utility functions for coordinate conversion, distance calculations, and styling

import { GameConfig, Colors, Coordinates } from './Constants.js';

/**
 * Coordinate Conversion Functions
 * Handle conversion between different coordinate systems:
 * - Level JSON (1-based indexing)
 * - Internal game coordinates (0-based indexing) 
 * - Phaser world coordinates (pixels)
 */

/**
 * Convert level JSON coordinates (1-based) to internal coordinates (0-based)
 * @param {number} jsonRow - Row from JSON (1-based)
 * @param {number} jsonCol - Column from JSON (1-based)
 * @returns {Object} {row, col} in 0-based coordinates
 */
export function jsonToInternal(jsonRow, jsonCol) {
    return {
        row: jsonRow - 1,
        col: jsonCol - 1
    };
}

/**
 * Convert internal coordinates (0-based) to level JSON coordinates (1-based)
 * @param {number} row - Internal row (0-based)
 * @param {number} col - Internal column (0-based)
 * @returns {Object} {row, col} in 1-based coordinates
 */
export function internalToJson(row, col) {
    return {
        row: row + 1,
        col: col + 1
    };
}

/**
 * Convert grid coordinates to world pixel coordinates (center of cell)
 * @param {number} gridRow - Grid row (0-based)
 * @param {number} gridCol - Grid column (0-based)
 * @param {number} gridOffsetX - X offset of the grid in world coordinates
 * @param {number} gridOffsetY - Y offset of the grid in world coordinates
 * @returns {Object} {x, y} in world pixel coordinates
 */
export function gridToWorld(gridRow, gridCol, gridOffsetX = 0, gridOffsetY = 0) {
    return {
        x: gridOffsetX + (gridCol * GameConfig.cellSize) + (GameConfig.cellSize / 2),
        y: gridOffsetY + (gridRow * GameConfig.cellSize) + (GameConfig.cellSize / 2)
    };
}

/**
 * Convert world pixel coordinates to grid coordinates
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate  
 * @param {number} gridOffsetX - X offset of the grid in world coordinates
 * @param {number} gridOffsetY - Y offset of the grid in world coordinates
 * @returns {Object} {row, col} in grid coordinates, or null if outside grid
 */
export function worldToGrid(worldX, worldY, gridOffsetX = 0, gridOffsetY = 0) {
    const col = Math.floor((worldX - gridOffsetX) / GameConfig.cellSize);
    const row = Math.floor((worldY - gridOffsetY) / GameConfig.cellSize);
    
    return { row, col };
}

/**
 * Handle special entrance/exit coordinates from level JSON
 * Entrance coordinates: -1 = right/bottom edge, 0 = left/top edge
 * @param {number} row - Row coordinate from JSON
 * @param {number} col - Column coordinate from JSON
 * @param {number} gridRows - Total rows in grid
 * @param {number} gridCols - Total columns in grid
 * @returns {Object} {row, col, isEntrance, side} processed coordinates
 */
export function processEntranceCoordinates(row, col, gridRows, gridCols) {
    let processedRow = row;
    let processedCol = col;
    let isEntrance = false;
    let side = null;
    
    // Handle special entrance coordinates
    if (row === Coordinates.TOP_EDGE) {
        isEntrance = true;
        side = 'top';
        processedRow = -1; // Outside grid
    } else if (row === Coordinates.BOTTOM_EDGE) {
        isEntrance = true;
        side = 'bottom';
        processedRow = gridRows; // Outside grid
    } else {
        processedRow = row - 1; // Convert to 0-based
    }
    
    if (col === Coordinates.LEFT_EDGE) {
        isEntrance = true;
        side = 'left';
        processedCol = -1; // Outside grid
    } else if (col === Coordinates.RIGHT_EDGE) {
        isEntrance = true;
        side = 'right';
        processedCol = gridCols; // Outside grid
    } else {
        processedCol = col - 1; // Convert to 0-based
    }
    
    return {
        row: processedRow,
        col: processedCol,
        isEntrance,
        side
    };
}

/**
 * Get world coordinates for entrance/exit positions including outside grid
 * @param {number} row - Grid row (can be outside grid for entrances)
 * @param {number} col - Grid column (can be outside grid for entrances)
 * @param {number} gridOffsetX - X offset of the grid
 * @param {number} gridOffsetY - Y offset of the grid
 * @param {number} spawnDistance - Distance outside grid for car spawning
 * @returns {Object} {x, y} world coordinates
 */
export function getEntranceWorldPosition(row, col, gridOffsetX, gridOffsetY, spawnDistance = GameConfig.spawnDistance) {
    let worldX, worldY;
    
    if (col < 0) { // Left side entrance
        worldX = gridOffsetX - (spawnDistance * GameConfig.cellSize);
        worldY = gridOffsetY + (row * GameConfig.cellSize) + (GameConfig.cellSize / 2);
    } else if (row < 0) { // Top side entrance  
        worldX = gridOffsetX + (col * GameConfig.cellSize) + (GameConfig.cellSize / 2);
        worldY = gridOffsetY - (spawnDistance * GameConfig.cellSize);
    } else { // Normal grid position or right/bottom edges
        const normal = gridToWorld(row, col, gridOffsetX, gridOffsetY);
        
        // Adjust for right/bottom edges
        if (col >= 100) { // Assuming no grid is this large, so this indicates right edge
            worldX = normal.x + (spawnDistance * GameConfig.cellSize);
        } else {
            worldX = normal.x;
        }
        
        if (row >= 100) { // Assuming no grid is this large, so this indicates bottom edge
            worldY = normal.y + (spawnDistance * GameConfig.cellSize);
        } else {
            worldY = normal.y;
        }
    }
    
    return { x: worldX, y: worldY };
}

/**
 * Distance and Pathfinding Helpers
 */

/**
 * Calculate Manhattan distance between two grid points
 * @param {number} row1 - First point row
 * @param {number} col1 - First point column
 * @param {number} row2 - Second point row
 * @param {number} col2 - Second point column
 * @returns {number} Manhattan distance
 */
export function manhattanDistance(row1, col1, row2, col2) {
    return Math.abs(row2 - row1) + Math.abs(col2 - col1);
}

/**
 * Calculate Euclidean distance between two grid points
 * @param {number} row1 - First point row
 * @param {number} col1 - First point column
 * @param {number} row2 - Second point row
 * @param {number} col2 - Second point column
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(row1, col1, row2, col2) {
    const dx = col2 - col1;
    const dy = row2 - row1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a grid coordinate is within bounds
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @param {number} maxRows - Maximum rows
 * @param {number} maxCols - Maximum columns
 * @returns {boolean} True if within bounds
 */
export function isValidGridPosition(row, col, maxRows, maxCols) {
    return row >= 0 && row < maxRows && col >= 0 && col < maxCols;
}

/**
 * Get adjacent grid positions (4-directional)
 * @param {number} row - Current row
 * @param {number} col - Current column
 * @returns {Array} Array of {row, col} adjacent positions
 */
export function getAdjacentPositions(row, col) {
    return [
        { row: row - 1, col: col },     // Up
        { row: row + 1, col: col },     // Down
        { row: row, col: col - 1 },     // Left
        { row: row, col: col + 1 }      // Right
    ];
}

/**
 * Color and Styling Helpers
 */

/**
 * Convert hex color to RGB components
 * @param {number} hex - Hex color value
 * @returns {Object} {r, g, b} RGB components (0-255)
 */
export function hexToRgb(hex) {
    return {
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255
    };
}

/**
 * Interpolate between two colors
 * @param {number} color1 - First color (hex)
 * @param {number} color2 - Second color (hex)
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {number} Interpolated color (hex)
 */
export function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
    
    return (r << 16) | (g << 8) | b;
}

/**
 * Get car color by color name from level JSON
 * @param {string} colorName - Color name from JSON ('red', 'blue', etc.)
 * @returns {number} Hex color value
 */
export function getCarColor(colorName) {
    const colorMap = {
        'red': Colors.carRed,
        'blue': Colors.carBlue,
        'yellow': Colors.carYellow,
        'green': Colors.carGreen,
        'purple': Colors.carPurple
    };
    
    return colorMap[colorName.toLowerCase()] || Colors.carBlue; // Default to blue
}

/**
 * Utility Functions
 */

/**
 * Generate a unique key for grid coordinates
 * @param {number} row - Grid row
 * @param {number} col - Grid column
 * @returns {string} Unique key string
 */
export function gridKey(row, col) {
    return `${row},${col}`;
}

/**
 * Parse a grid key back to coordinates
 * @param {string} key - Grid key string
 * @returns {Object} {row, col} coordinates
 */
export function parseGridKey(key) {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Format number with thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Generate a random ID string
 * @param {number} length - Length of ID (default 8)
 * @returns {string} Random ID
 */
export function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Export all functions as default
export default {
    // Coordinate conversion
    jsonToInternal,
    internalToJson,
    gridToWorld,
    worldToGrid,
    processEntranceCoordinates,
    getEntranceWorldPosition,
    
    // Distance and pathfinding
    manhattanDistance,
    euclideanDistance,
    isValidGridPosition,
    getAdjacentPositions,
    
    // Color and styling
    hexToRgb,
    interpolateColor,
    getCarColor,
    
    // Utilities
    gridKey,
    parseGridKey,
    clamp,
    formatNumber,
    generateId,
};