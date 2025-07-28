// Traffic Simulation Game - Constants and Configuration
// All game constants, colors, and configuration values

// Core Game Configuration
export const GameConfig = {
    // Grid and Layout
    cellSize: 40,               // Size of each grid cell in pixels
    gridLineWidth: 1,           // Width of grid lines
    
    // Economy
    startingBudget: 10000,      // Starting budget for the player
    roadCost: 1000,             // Cost to place one road tile
    
    // Timing and Performance
    maxWaitTime: 10000,         // Max wait time before car fails (ms)
    carSpeed: 2000,             // Car movement duration between cells (ms)
    carSpawnInterval: 3000,     // Time between car spawns (ms)
    spawnDistance: 10,          // Distance outside grid where cars spawn
    
    // Animation
    arrowDrawDuration: 200,     // Duration for arrow drawing animation
    cellHighlightDuration: 100, // Duration for cell highlight animation
    
    // Simulation
    maxCarsPerType: 5,          // Maximum cars of each type to spawn
    successThreshold: 0.8,      // 80% of cars must reach destination to win
};

// Visual Colors
export const Colors = {
    // Cell Types
    editable: 0x3498db,         // Blue for editable cells
    tree: 0x27ae60,             // Green for trees
    building: 0xe67e22,         // Orange for buildings
    road: 0x95a5a6,             // Gray for roads
    
    // Grid and UI
    gridLine: 0x34495e,         // Dark gray for grid lines
    background: 0x2c3e50,       // Dark blue-gray background
    highlight: 0xf1c40f,        // Yellow for highlights
    
    // Arrows and Direction
    arrow: 0xffffff,            // White for direction arrows
    arrowShadow: 0x000000,      // Black for arrow shadow
    
    // Car Colors (matching level JSON)
    carRed: 0xe74c3c,           // Red cars
    carBlue: 0x3498db,          // Blue cars  
    carYellow: 0xf1c40f,        // Yellow cars
    carGreen: 0x27ae60,         // Green cars
    carPurple: 0x9b59b6,        // Purple cars
    
    // UI Elements
    buttonNormal: 0x34495e,     // Normal button color
    buttonHover: 0x5d6d7e,      // Button hover color
    buttonActive: 0xf39c12,     // Active button color
    textPrimary: 0xffffff,      // Primary text color
    textSecondary: 0xbdc3c7,    // Secondary text color
    
    // Status Colors
    success: 0x27ae60,          // Green for success
    warning: 0xf39c12,          // Orange for warning
    error: 0xe74c3c,            // Red for error
};

// Tool Types
export const Tools = {
    PLACE: 'place',             // Place roads
    DELETE: 'delete',           // Delete roads
    ARROW: 'arrow',             // Draw direction arrows
};

// Direction Types for arrows
export const Directions = {
    UP: 'up',
    DOWN: 'down', 
    LEFT: 'left',
    RIGHT: 'right',
    UP_RIGHT: 'up-right',
    UP_LEFT: 'up-left',
    DOWN_RIGHT: 'down-right',
    DOWN_LEFT: 'down-left',
};

// Cell Types
export const CellTypes = {
    EDITABLE: 'editable',
    TREE: 'tree',
    BUILDING: 'building',
    ROAD: 'road',
};

// Car States
export const CarStates = {
    SPAWNING: 'spawning',
    MOVING: 'moving',
    WAITING: 'waiting',
    REACHED_EXIT: 'reached_exit',
    FAILED: 'failed',
};

// Game States
export const GameStates = {
    BUILDING: 'building',       // Player is building roads
    SIMULATING: 'simulating',   // Cars are moving
    WON: 'won',                 // Level completed successfully
    LOST: 'lost',               // Level failed
};

// Coordinate System Constants
export const Coordinates = {
    // Special coordinate values for entrances/exits
    LEFT_EDGE: 0,               // Left edge of grid
    RIGHT_EDGE: -1,             // Right edge of grid  
    TOP_EDGE: 0,                // Top edge of grid
    BOTTOM_EDGE: -1,            // Bottom edge of grid
};

// Z-Index layers for proper rendering order
export const ZLayers = {
    BACKGROUND: 0,
    GRID_LINES: 10,
    CELLS: 20,
    ROADS: 30,
    ARROWS: 40,
    CARS: 50,
    UI_BACKGROUND: 100,
    UI_ELEMENTS: 110,
    UI_TEXT: 120,
    TOOLTIPS: 200,
};

// Audio (for future enhancement)
export const Audio = {
    carMove: 'car_move',
    roadPlace: 'road_place',
    roadDelete: 'road_delete',
    success: 'level_success',
    failure: 'level_failure',
    click: 'ui_click',
};

// Level bounds and validation
export const LevelLimits = {
    minGridSize: 3,             // Minimum grid size
    maxGridSize: 20,            // Maximum grid size
    maxCarTypes: 10,            // Maximum different car types
    maxEntrancesPerCar: 5,      // Maximum entrances per car type
};

// Export all constants as a single object for convenience
export default {
    GameConfig,
    Colors,
    Tools,
    Directions,
    CellTypes,
    CarStates,
    GameStates,
    Coordinates,
    ZLayers,
    Audio,
    LevelLimits,
};