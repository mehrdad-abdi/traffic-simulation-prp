name: "Traffic Simulation Puzzle Game - Complete Implementation"
description: |

## Purpose
Comprehensive PRP for implementing a single-player, grid-based traffic simulation and optimization puzzle game using Phaser.js with complete context for one-pass implementation success.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Build a complete single-player, grid-based traffic simulation and optimization puzzle game where players design road intersections to maximize traffic flow efficiency within budget constraints. The game features a 2D top-down perspective with drag-and-drop road building, traffic direction controls, and real-time simulation with pathfinding.

## Why
- **Business value**: Create an engaging puzzle game that teaches traffic optimization concepts
- **Technical learning**: Demonstrate complex game systems including pathfinding, simulation, and interactive UI
- **Integration potential**: Modular design allows for future level editor, multiplayer, or educational features
- **Problem solved**: Provides an educational and entertaining way to understand traffic flow optimization

## What
A complete Phaser.js-based game with:
- Grid-based level system loaded from JSON files
- Interactive road building with budget management
- Traffic direction controls with visual arrows
- Real-time car simulation with A* pathfinding
- Win/lose conditions based on traffic flow efficiency
- Clean, intuitive 2D top-down interface

### Success Criteria
- [ ] Level loads correctly from JSON with proper grid visualization
- [ ] Players can place/delete roads within budget constraints
- [ ] Traffic direction arrows can be drawn on roads
- [ ] Cars spawn, follow paths, and reach destinations efficiently
- [ ] Game detects win/lose conditions (traffic jams, timeouts)
- [ ] All interactive elements respond correctly to mouse input
- [ ] Performance maintains 60fps during simulation
- [ ] Code follows modular architecture patterns

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://docs.phaser.io/phaser/getting-started/what-is-phaser
  why: Core Phaser.js concepts, Scene management, and game architecture
  
- url: https://docs.phaser.io/api-documentation/class/gameobjects-graphics
  why: Drawing roads, grid lines, arrows, and UI elements programmatically
  
- url: https://github.com/qiao/PathFinding.js
  why: Comprehensive A* pathfinding library for grid-based movement
  section: Grid-based pathfinding with obstacles and multiple algorithms
  critical: Supports heuristics like manhattan distance for grid movement

- url: https://qiao.github.io/PathFinding.js/visual/
  why: Interactive demo showing pathfinding on grids with obstacles
  
- url: https://gamedevacademy.org/how-to-use-pathfinding-in-phaser/
  why: Integration patterns for pathfinding in Phaser games
  critical: Plugin approach for reusable pathfinding code

- url: https://annoraaq.github.io/grid-engine/p/introduction/index.html
  why: Alternative grid engine for Phaser with collision detection
  section: Grid positioning and movement patterns

- file: /Users/mabdi/traffic-simulation-prp/levels/level-1.json
  why: Example level structure with grid definition and car types
  critical: Shows uneditable areas, entrance/exit patterns
  
- file: /Users/mabdi/traffic-simulation-prp/INITIAL.md
  why: Complete feature requirements and game mechanics
  critical: Defines grid coordinates, car spawning, and simulation rules
```

### Current Codebase tree
```bash
traffic-simulation-prp/
├── CLAUDE.md                    # Project rules and conventions
├── INITIAL.md                   # Feature requirements
├── levels/
│   └── level-1.json            # Example level configuration
├── PRPs/
│   ├── templates/
│   │   └── prp_base.md         # PRP template
│   └── traffic-simulation-game.md  # This PRP
└── examples/                   # Empty - no existing patterns
```

### Desired Codebase tree with files to be added and responsibility of file
```bash
traffic-simulation-prp/
├── index.html                  # Main game entry point and Phaser setup
├── src/
│   ├── game.js                 # Main game configuration and initialization
│   ├── scenes/
│   │   ├── GameScene.js        # Main gameplay scene with grid and interaction
│   │   └── UIScene.js          # HUD, buttons, budget display
│   ├── managers/
│   │   ├── GridManager.js      # Grid creation, cell management, rendering
│   │   ├── LevelManager.js     # Level loading, validation, data management
│   │   ├── CarManager.js       # Car spawning, movement, pathfinding
│   │   └── InputManager.js     # Mouse input, drag detection, tool states
│   ├── entities/
│   │   ├── Car.js             # Individual car behavior and rendering
│   │   ├── Road.js            # Road tile with direction arrows
│   │   └── Cell.js            # Base grid cell (editable/uneditable)
│   ├── utils/
│   │   ├── PathFinder.js      # A* pathfinding integration wrapper
│   │   ├── Constants.js       # Game constants (colors, sizes, costs)
│   │   └── Helpers.js         # Utility functions (coordinate conversion, etc.)
│   └── data/
│       └── GameState.js       # Game state management (budget, tools, etc.)
├── assets/                    # Game assets (if any sprites needed)
├── levels/
│   ├── level-1.json          # Existing level
│   └── level-2.json          # Additional test level
└── tests/                    # Test files for core functionality
    ├── test-pathfinding.html # Visual pathfinding test
    └── test-grid.html        # Grid rendering test
```

### Known Gotchas of our codebase & Library Quirks
```javascript
// CRITICAL: Phaser.js Scene Management
// Phaser requires at least one Scene to function
// Scenes handle input, rendering, and game logic separately

// CRITICAL: Coordinate Systems
// Level JSON uses 1-based indexing: row 1, column 1 = first cell
// Phaser uses pixel coordinates: convert grid to world coordinates
// Entrance coordinates: -1 = right/bottom edge, 0 = left/top edge

// CRITICAL: PathFinding.js Grid Format
// PathFinding.js expects 0 = walkable, 1 = blocked
// Must convert our road/obstacle system to this format

// CRITICAL: Canvas Drawing Performance
// Use Graphics objects for static elements (grid lines, roads)
// Call generateTexture() for static graphics to improve performance
// Separate dynamic elements (cars, arrows) from static background

// CRITICAL: Input Event Handling
// Phaser input events bubble - ensure proper event stopping
// Mouse drag detection requires tracking pointerdown/pointermove/pointerup
// Grid coordinate conversion needed for mouse position to grid cell

// CRITICAL: Animation and Timing
// Use Phaser.Tweens for smooth car movement between cells
// Scene.time.addEvent for spawning cars at intervals
// Avoid setInterval/setTimeout - use Phaser's time management
```

## Implementation Blueprint

### Data models and structure

Create the core data models to ensure type safety and consistency:
```javascript
// Game Configuration
const GameConfig = {
  cellSize: 40,           // Size of each grid cell in pixels
  roadCost: 1000,         // Cost to place one road tile
  maxWaitTime: 10000,     // Max wait time before car fails (ms)
  carSpeed: 100,          // Car movement speed (pixels per second)
  spawnDistance: 10       // Distance outside grid where cars spawn
};

// Level Data Structure (loaded from JSON)
const LevelData = {
  grid: {
    rows: Number,
    column: Number,        // Note: matches JSON format (column not columns)
    uneditable: [{
      "row-from": Number,
      "row-to": Number,
      "column-from": Number,
      "column-to": Number,
      type: String         // "tree", "building", etc.
    }]
  },
  cars: [{
    color: String,         // "red", "blue", "yellow"
    entrances: [{
      row: Number,         // -1 for right edge, 0 for left edge
      column: Number       // -1 for bottom edge, 0 for top edge
    }],
    exit: {
      row: Number,
      column: Number
    }
  }]
};

// Game State
const GameState = {
  budget: Number,
  currentTool: String,    // "place", "delete", "arrow"
  selectedCell: Object,
  isSimulating: Boolean,
  cars: Array,
  roads: Map,            // Map of "row,col" -> Road object
  level: LevelData
};
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Create Basic HTML Structure and Phaser Setup
CREATE index.html:
  - INCLUDE Phaser.js v3.85+ from CDN
  - INCLUDE PathFinding.js from CDN
  - SET UP canvas container with proper dimensions
  - CONFIGURE basic game configuration

CREATE src/game.js:
  - INITIALIZE Phaser game with proper config
  - SET UP scenes (GameScene, UIScene)
  - CONFIGURE input handling and renderer

Task 2: Implement Core Game Constants and Utilities
CREATE src/utils/Constants.js:
  - DEFINE grid dimensions, colors, costs
  - SET UP coordinate conversion functions
  - ESTABLISH game timing constants

CREATE src/utils/Helpers.js:
  - IMPLEMENT grid-to-world coordinate conversion
  - ADD utility functions for distance calculations
  - CREATE color and styling helper functions

Task 3: Build Level Management System
CREATE src/managers/LevelManager.js:
  - IMPLEMENT JSON level loading functionality
  - VALIDATE level data structure
  - PARSE grid and car definitions
  - ERROR HANDLING for malformed levels

CREATE src/data/GameState.js:
  - MANAGE budget, tools, simulation state
  - TRACK placed roads and cars
  - HANDLE state persistence during gameplay

Task 4: Implement Grid System
CREATE src/entities/Cell.js:
  - DEFINE base cell types (editable, tree, building)
  - IMPLEMENT visual rendering for each type
  - HANDLE cell state management

CREATE src/entities/Road.js:
  - IMPLEMENT road placement and removal
  - ADD direction arrow system
  - MANAGE road connectivity and pathfinding data

CREATE src/managers/GridManager.js:
  - RENDER grid lines and cells
  - HANDLE grid coordinate system
  - MANAGE cell state updates and visual feedback

Task 5: Build Input and Interaction System
CREATE src/managers/InputManager.js:
  - IMPLEMENT mouse input handling
  - ADD drag detection for road placement
  - MANAGE tool states (place, delete, arrow)
  - CONVERT mouse coordinates to grid positions

Task 6: Implement Pathfinding Integration
CREATE src/utils/PathFinder.js:
  - INTEGRATE PathFinding.js library
  - CONVERT game grid to pathfinding grid format
  - IMPLEMENT A* pathfinding with manhattan heuristic
  - HANDLE dynamic grid updates

Task 7: Create Car System
CREATE src/entities/Car.js:
  - IMPLEMENT car rendering and movement
  - ADD pathfinding behavior
  - HANDLE entrance spawning and exit detection
  - MANAGE car states (moving, waiting, failed)

CREATE src/managers/CarManager.js:
  - SPAWN cars from entrances
  - MANAGE car lifecycle and cleanup
  - DETECT traffic jams and timeouts
  - HANDLE win/lose conditions

Task 8: Build Game Scenes
CREATE src/scenes/GameScene.js:
  - INTEGRATE all managers and systems
  - HANDLE game loop and updates
  - MANAGE simulation start/stop
  - IMPLEMENT level completion detection

CREATE src/scenes/UIScene.js:
  - CREATE budget display
  - ADD tool selection buttons
  - IMPLEMENT simulation controls
  - SHOW win/lose messages

Task 9: Add Simulation and Game Logic
ENHANCE CarManager with simulation logic:
  - IMPLEMENT car spawning intervals
  - ADD collision avoidance (cars stop behind others)
  - DETECT successful path completion
  - TRIGGER failure conditions

ENHANCE GameScene with win/lose detection:
  - MONITOR car success rates
  - DETECT traffic jams (cars waiting too long)
  - HANDLE level completion and failure states

Task 10: Polish and Optimization
OPTIMIZE rendering performance:
  - USE generateTexture() for static graphics
  - IMPLEMENT object pooling for cars
  - MINIMIZE draw calls during simulation

ADD visual feedback:
  - HIGHLIGHT hovered cells
  - SHOW placement preview
  - ADD visual indicators for car failures
```

### Per task pseudocode as needed added to each task

```javascript
// Task 3: Level Management Pseudocode
class LevelManager {
  async loadLevel(levelPath) {
    // PATTERN: Always validate JSON structure first
    const levelData = await fetch(levelPath).then(r => r.json());
    
    // GOTCHA: Level JSON uses "column" not "columns"
    if (!levelData.grid || !levelData.grid.column) {
      throw new Error("Invalid level format");
    }
    
    // CRITICAL: Convert 1-based indexing to 0-based for internal use
    const processedLevel = this.convertCoordinates(levelData);
    
    // PATTERN: Validate all car entrances and exits are valid
    this.validateCarPaths(processedLevel);
    
    return processedLevel;
  }
}

// Task 6: PathFinding Integration Pseudocode
class PathFinder {
  constructor() {
    // CRITICAL: PathFinding.js requires specific grid format
    this.grid = new PF.Grid(width, height);
    this.finder = new PF.AStarFinder({
      heuristic: PF.Heuristic.manhattan,  // Best for grid movement
      diagonalMovement: PF.DiagonalMovement.Never
    });
  }
  
  updateGrid(roads, obstacles) {
    // GOTCHA: 0 = walkable, 1 = blocked in PathFinding.js
    this.grid.setWalkableAt(x, y, roads.has(`${x},${y}`));
    
    // CRITICAL: Must clone grid before each pathfinding call
    const gridClone = this.grid.clone();
    return this.finder.findPath(startX, startY, endX, endY, gridClone);
  }
}

// Task 7: Car Movement Pseudocode
class Car extends Phaser.GameObjects.Sprite {
  update(time, delta) {
    // PATTERN: Use Phaser tweens for smooth movement
    if (this.hasPath && !this.isMoving) {
      const nextCell = this.path[this.pathIndex];
      
      // CRITICAL: Convert grid coordinates to world coordinates
      const worldPos = GridManager.gridToWorld(nextCell.x, nextCell.y);
      
      this.isMoving = true;
      this.scene.tweens.add({
        targets: this,
        x: worldPos.x,
        y: worldPos.y,
        duration: GameConfig.carSpeed,
        onComplete: () => {
          this.isMoving = false;
          this.pathIndex++;
          this.checkIfReachedExit();
        }
      });
    }
    
    // GOTCHA: Track waiting time to detect traffic jams
    if (!this.isMoving && this.hasPath) {
      this.waitTime += delta;
      if (this.waitTime > GameConfig.maxWaitTime) {
        this.triggerFailure();
      }
    }
  }
}
```

### Integration Points
```yaml
HTML_SETUP:
  - index.html: Main entry point with Phaser and PathFinding.js CDN links
  - canvas: Full-screen canvas with proper aspect ratio handling
  
PHASER_CONFIG:
  - game.js: Central game configuration and scene management
  - scenes: GameScene for gameplay, UIScene for interface
  
ASSET_LOADING:
  - levels: JSON files loaded via Phaser.Loader or fetch API
  - graphics: All visual elements created via Phaser.Graphics (no external images)
  
STATE_MANAGEMENT:
  - GameState.js: Centralized state for budget, tools, simulation
  - Event system: Phaser events for communication between managers
```

## Validation Loop

### Level 1: Basic Setup & Structure
```bash
# Create basic HTML and verify Phaser loads
# Open index.html in browser
# Expected: Phaser canvas appears, no console errors

# Test level loading
# Expected: level-1.json loads without errors, grid displays correctly
```

### Level 2: Interactive Features
```bash
# Test road placement
# Click on editable cells
# Expected: Roads appear, budget decreases

# Test deletion mode
# Click delete button, then click roads
# Expected: Roads disappear, budget increases

# Test arrow placement
# Click and drag on roads
# Expected: Direction arrows appear
```

### Level 3: Simulation System
```bash
# Test car spawning
# Click simulation button
# Expected: Cars spawn at entrances, move toward exits

# Test pathfinding
# Create road paths between entrances and exits
# Expected: Cars follow roads, avoid obstacles

# Test failure conditions
# Block all paths or create long waits
# Expected: Game detects failure, shows appropriate message
```

### Level 4: Performance Validation
```bash
# Test with multiple cars
# Spawn 10+ cars simultaneously
# Expected: Maintains 60fps, no lag during simulation

# Test memory usage
# Run simulation for extended time
# Expected: No memory leaks, stable performance
```

## Final validation Checklist
- [ ] Level loads correctly from JSON: `Open index.html, verify grid displays`
- [ ] Road placement works: `Click cells, verify roads appear and budget changes`
- [ ] Arrow system functions: `Drag on roads, verify arrows appear`
- [ ] Car simulation works: `Start simulation, verify cars spawn and move`
- [ ] Pathfinding accurate: `Cars follow created roads to exits`
- [ ] Failure detection works: `Block paths, verify game detects failures`
- [ ] Performance acceptable: `60fps during simulation with multiple cars`
- [ ] All interactions responsive: `No input lag or visual glitches`

---

## Anti-Patterns to Avoid
- ❌ Don't use setInterval/setTimeout - use Phaser's time management
- ❌ Don't modify DOM directly - use Phaser's scene management  
- ❌ Don't ignore coordinate system conversions (1-based JSON vs 0-based arrays)
- ❌ Don't forget to clone PathFinding grid before each pathfinding call
- ❌ Don't create new Graphics objects every frame - cache static elements
- ❌ Don't handle input without proper bounds checking
- ❌ Don't assume JSON data is valid - always validate level structure

## Quality Assessment
**Confidence Score: 9/10**

This PRP provides comprehensive context for implementing a complete traffic simulation game with:
- ✅ Detailed architecture with clear file responsibilities
- ✅ Complete external library documentation and gotchas
- ✅ Step-by-step implementation plan with validation gates
- ✅ Specific code patterns and anti-patterns
- ✅ Performance considerations and optimization strategies
- ✅ Clear success criteria and testing approach

The high confidence score reflects the comprehensive research, detailed implementation blueprint, and inclusion of all critical context needed for successful one-pass implementation.