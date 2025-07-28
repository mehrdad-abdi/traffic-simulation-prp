// Traffic Simulation Game - Level Management System
// Handles loading, validation, and processing of level JSON files

import { LevelLimits, CellTypes } from '../utils/Constants.js';
import { jsonToInternal, processEntranceCoordinates, isValidGridPosition } from '../utils/Helpers.js';

export class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.processedLevel = null;
    }

    /**
     * Load and process a level from JSON file
     * @param {string} levelPath - Path to the level JSON file
     * @returns {Promise<Object>} Processed level data
     */
    async loadLevel(levelPath) {
        try {
            console.log(`Loading level from: ${levelPath}`);
            
            // PATTERN: Always validate JSON structure first
            const response = await fetch(levelPath);
            if (!response.ok) {
                throw new Error(`Failed to load level: ${response.status} ${response.statusText}`);
            }
            
            const levelData = await response.json();
            
            // Store original level data
            this.currentLevel = levelData;
            
            // Validate basic structure
            this.validateLevelStructure(levelData);
            
            // CRITICAL: Convert 1-based indexing to 0-based for internal use
            const processedLevel = this.convertCoordinates(levelData);
            
            // PATTERN: Validate all car entrances and exits are valid
            this.validateCarPaths(processedLevel);
            
            // Process uneditable areas
            this.processUneditableAreas(processedLevel);
            
            // Store processed level
            this.processedLevel = processedLevel;
            
            console.log('Level loaded successfully:', processedLevel);
            return processedLevel;
            
        } catch (error) {
            console.error('Error loading level:', error);
            throw new Error(`Level loading failed: ${error.message}`);
        }
    }

    /**
     * Validate the basic structure of level JSON
     * @param {Object} levelData - Raw level data from JSON
     * @throws {Error} If level structure is invalid
     */
    validateLevelStructure(levelData) {
        // Check required top-level properties
        if (!levelData.grid) {
            throw new Error("Level must have a 'grid' property");
        }
        
        if (!levelData.cars) {
            throw new Error("Level must have a 'cars' property");
        }
        
        // GOTCHA: Level JSON uses "column" not "columns"
        if (!levelData.grid.column || typeof levelData.grid.column !== 'number') {
            throw new Error("Grid must have a 'column' property (singular) with a number value");
        }
        
        if (!levelData.grid.rows || typeof levelData.grid.rows !== 'number') {
            throw new Error("Grid must have a 'rows' property with a number value");
        }
        
        // Validate grid size limits
        if (levelData.grid.rows < LevelLimits.minGridSize || levelData.grid.rows > LevelLimits.maxGridSize) {
            throw new Error(`Grid rows must be between ${LevelLimits.minGridSize} and ${LevelLimits.maxGridSize}`);
        }
        
        if (levelData.grid.column < LevelLimits.minGridSize || levelData.grid.column > LevelLimits.maxGridSize) {
            throw new Error(`Grid columns must be between ${LevelLimits.minGridSize} and ${LevelLimits.maxGridSize}`);
        }
        
        // Validate cars array
        if (!Array.isArray(levelData.cars) || levelData.cars.length === 0) {
            throw new Error("Level must have at least one car");
        }
        
        if (levelData.cars.length > LevelLimits.maxCarTypes) {
            throw new Error(`Too many car types: ${levelData.cars.length}. Maximum is ${LevelLimits.maxCarTypes}`);
        }
        
        // Validate each car
        levelData.cars.forEach((car, index) => {
            this.validateCarStructure(car, index);
        });
    }

    /**
     * Validate individual car structure
     * @param {Object} car - Car data from JSON
     * @param {number} index - Car index for error messages
     */
    validateCarStructure(car, index) {
        if (!car.color || typeof car.color !== 'string') {
            throw new Error(`Car ${index} must have a color (string)`);
        }
        
        if (!car.entrances || !Array.isArray(car.entrances) || car.entrances.length === 0) {
            throw new Error(`Car ${index} must have at least one entrance`);
        }
        
        if (car.entrances.length > LevelLimits.maxEntrancesPerCar) {
            throw new Error(`Car ${index} has too many entrances: ${car.entrances.length}. Maximum is ${LevelLimits.maxEntrancesPerCar}`);
        }
        
        if (!car.exit || typeof car.exit !== 'object') {
            throw new Error(`Car ${index} must have an exit object`);
        }
        
        // Validate entrance coordinates
        car.entrances.forEach((entrance, entranceIndex) => {
            if (typeof entrance.row !== 'number' || typeof entrance.column !== 'number') {
                throw new Error(`Car ${index}, entrance ${entranceIndex}: row and column must be numbers`);
            }
        });
        
        // Validate exit coordinates
        if (typeof car.exit.row !== 'number' || typeof car.exit.column !== 'number') {
            throw new Error(`Car ${index}: exit row and column must be numbers`);
        }
    }

    /**
     * Convert coordinates from 1-based JSON format to 0-based internal format
     * @param {Object} levelData - Raw level data
     * @returns {Object} Level data with converted coordinates
     */
    convertCoordinates(levelData) {
        const processed = {
            grid: {
                rows: levelData.grid.rows,
                columns: levelData.grid.column, // Note: converting to plural internally
                uneditable: []
            },
            cars: []
        };
        
        // Process uneditable areas
        if (levelData.grid.uneditable) {
            processed.grid.uneditable = levelData.grid.uneditable.map(area => {
                return {
                    rowFrom: area["row-from"] - 1,     // Convert to 0-based
                    rowTo: area["row-to"] - 1,         // Convert to 0-based
                    columnFrom: area["column-from"] - 1, // Convert to 0-based
                    columnTo: area["column-to"] - 1,   // Convert to 0-based
                    type: area.type
                };
            });
        }
        
        // Process cars
        processed.cars = levelData.cars.map(car => {
            const processedCar = {
                color: car.color,
                entrances: [],
                exit: null
            };
            
            // Process entrances with special coordinate handling
            processedCar.entrances = car.entrances.map(entrance => {
                return processEntranceCoordinates(
                    entrance.row, 
                    entrance.column, 
                    processed.grid.rows, 
                    processed.grid.columns
                );
            });
            
            // Process exit with special coordinate handling
            processedCar.exit = processEntranceCoordinates(
                car.exit.row, 
                car.exit.column, 
                processed.grid.rows, 
                processed.grid.columns
            );
            
            return processedCar;
        });
        
        return processed;
    }

    /**
     * Validate that all car paths have valid entrances and exits
     * @param {Object} processedLevel - Level with converted coordinates
     */
    validateCarPaths(processedLevel) {
        processedLevel.cars.forEach((car, carIndex) => {
            // Validate entrances
            car.entrances.forEach((entrance, entranceIndex) => {
                if (!entrance.isEntrance) {
                    // If not a special entrance, must be within grid
                    if (!isValidGridPosition(entrance.row, entrance.col, processedLevel.grid.rows, processedLevel.grid.columns)) {
                        throw new Error(`Car ${carIndex}, entrance ${entranceIndex}: coordinates (${entrance.row}, ${entrance.col}) are outside grid`);
                    }
                }
            });
            
            // Validate exit
            if (!car.exit.isEntrance) {
                // If not a special exit, must be within grid
                if (!isValidGridPosition(car.exit.row, car.exit.col, processedLevel.grid.rows, processedLevel.grid.columns)) {
                    throw new Error(`Car ${carIndex}: exit coordinates (${car.exit.row}, ${car.exit.col}) are outside grid`);
                }
            }
        });
    }

    /**
     * Process uneditable areas into a usable format
     * @param {Object} processedLevel - Level data to process
     */
    processUneditableAreas(processedLevel) {
        // Create a Set for fast lookup of uneditable cells
        processedLevel.uneditableCells = new Set();
        
        if (processedLevel.grid.uneditable) {
            processedLevel.grid.uneditable.forEach(area => {
                // Validate area bounds
                if (area.rowFrom < 0 || area.rowTo >= processedLevel.grid.rows ||
                    area.columnFrom < 0 || area.columnTo >= processedLevel.grid.columns) {
                    console.warn(`Uneditable area extends outside grid bounds: `, area);
                }
                
                // Add all cells in the area to the set
                for (let row = Math.max(0, area.rowFrom); row <= Math.min(processedLevel.grid.rows - 1, area.rowTo); row++) {
                    for (let col = Math.max(0, area.columnFrom); col <= Math.min(processedLevel.grid.columns - 1, area.columnTo); col++) {
                        const cellKey = `${row},${col}`;
                        processedLevel.uneditableCells.add(cellKey);
                        
                        // Also store the type for rendering
                        if (!processedLevel.cellTypes) {
                            processedLevel.cellTypes = new Map();
                        }
                        processedLevel.cellTypes.set(cellKey, area.type);
                    }
                }
            });
        }
    }

    /**
     * Check if a cell is editable
     * @param {number} row - Grid row (0-based)
     * @param {number} col - Grid column (0-based)
     * @returns {boolean} True if cell is editable
     */
    isCellEditable(row, col) {
        if (!this.processedLevel) {
            return false;
        }
        
        const cellKey = `${row},${col}`;
        return !this.processedLevel.uneditableCells.has(cellKey);
    }

    /**
     * Get cell type (for rendering)
     * @param {number} row - Grid row (0-based)
     * @param {number} col - Grid column (0-based)
     * @returns {string} Cell type
     */
    getCellType(row, col) {
        if (!this.processedLevel) {
            return CellTypes.EDITABLE;
        }
        
        const cellKey = `${row},${col}`;
        return this.processedLevel.cellTypes?.get(cellKey) || CellTypes.EDITABLE;
    }

    /**
     * Get current level data
     * @returns {Object|null} Processed level data
     */
    getCurrentLevel() {
        return this.processedLevel;
    }

    /**
     * Get grid dimensions
     * @returns {Object} {rows, columns}
     */
    getGridDimensions() {
        if (!this.processedLevel) {
            return { rows: 0, columns: 0 };
        }
        
        return {
            rows: this.processedLevel.grid.rows,
            columns: this.processedLevel.grid.columns
        };
    }

    /**
     * Get all car data
     * @returns {Array} Array of car objects
     */
    getCarData() {
        if (!this.processedLevel) {
            return [];
        }
        
        return this.processedLevel.cars;
    }
}

// Export singleton instance
export const levelManager = new LevelManager();
export default levelManager;