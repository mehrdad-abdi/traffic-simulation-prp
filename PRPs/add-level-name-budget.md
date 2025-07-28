name: "Add Level Name and Budget Display - Complete Implementation"
description: |

## Purpose
Comprehensive PRP for implementing level name display and initial budget configuration from level JSON files, with complete context for one-pass implementation success.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Enable level files to specify level name and initial budget, display the level name on screen, and initialize the game with the level's budget instead of a hardcoded value.

## Why
- **Business value**: Each level can have unique names and balanced budget constraints
- **User experience**: Players see clear level identification and understand budget constraints
- **Game design**: Enables progressive difficulty through varied starting budgets
- **Code maintainability**: Level configuration is centralized in JSON files

## What
Update the traffic simulation game to:
- Parse level name and budget from JSON level files
- Display level name prominently in the game UI
- Initialize game budget from level configuration instead of hardcoded constants
- Maintain backward compatibility with existing level structure

### Success Criteria
- [ ] Level name is parsed from JSON and displayed on screen
- [ ] Initial budget is read from level JSON and used in game state
- [ ] Existing level-1.json works without modification
- [ ] Game UI shows both level name and current budget
- [ ] All existing functionality continues to work

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://docs.phaser.io/api-documentation/class/gameobjects-text
  why: Text object creation and styling for level name display
  
- url: https://phaser.io/examples/v3.85.0/scenes/view/ui-scene  
  why: UI scene patterns for overlay text elements
  section: Creating persistent UI elements that overlay game scenes
  
- file: /Users/mabdi/Github/traffic-simulation-prp/levels/level-1.json
  why: Example level structure showing name and budget fields already exist
  critical: JSON format is already correct - just need to process these fields
  
- file: /Users/mabdi/Github/traffic-simulation-prp/src/managers/LevelManager.js
  why: Current level loading and validation patterns to extend
  critical: Uses 1-based to 0-based coordinate conversion patterns
  
- file: /Users/mabdi/Github/traffic-simulation-prp/src/data/GameState.js
  why: Game state management and budget handling patterns
  critical: Currently uses hardcoded startingBudget from Constants.js
  
- file: /Users/mabdi/Github/traffic-simulation-prp/src/scenes/GameScene.js
  why: UI creation patterns and debug text display examples
  critical: Already has debugText and controlsText - follow same patterns
  
- file: /Users/mabdi/Github/traffic-simulation-prp/src/utils/Constants.js
  why: Current GameConfig.startingBudget constant that needs to become fallback
  
- file: /Users/mabdi/Github/traffic-simulation-prp/test-basic.html
  why: Testing patterns used in this project for validation
  critical: Uses simple HTML test runner with module imports
```

### Current Codebase Tree
```bash
traffic-simulation-prp/
├── src/
│   ├── managers/
│   │   ├── LevelManager.js      # Level loading, needs name/budget methods
│   │   ├── GridManager.js       # Grid rendering (unchanged)
│   │   ├── CarManager.js        # Car management (unchanged)
│   │   └── InputManager.js      # Input handling (unchanged)
│   ├── data/
│   │   └── GameState.js         # State management, needs level budget init
│   ├── scenes/
│   │   └── GameScene.js         # Main scene, needs level name display
│   ├── utils/
│   │   ├── Constants.js         # Config constants, startingBudget here
│   │   ├── Helpers.js           # Utility functions (unchanged)
│   │   └── PathFinder.js        # Pathfinding (unchanged)
│   └── entities/                # Game entities (unchanged)
├── levels/
│   └── level-1.json            # Already has name and budget fields
└── test-basic.html             # Testing infrastructure
```

### Desired Codebase Tree (No New Files Needed)
```bash
# All changes are modifications to existing files:
# - LevelManager.js: Add getLevelName(), getInitialBudget() methods
# - GameState.js: Update initializeWithLevel() to use level budget/name  
# - GameScene.js: Add level name display to UI
# - Constants.js: Make startingBudget a fallback value
```

### Known Gotchas of our codebase & Library Quirks
```javascript
// CRITICAL: Level JSON Structure
// Level JSON already contains name and budget fields:
// { "name": "Welcomevel", "budget": 53000, "grid": {...}, "cars": [...] }
// LevelManager.convertCoordinates() processes grid/cars but ignores name/budget

// CRITICAL: GameState Budget Initialization
// GameState.reset() sets budget = GameConfig.startingBudget (hardcoded 10000)
// GameState.initializeWithLevel() doesn't update budget from level data
// Must update initializeWithLevel() to use level.budget if present

// CRITICAL: Phaser Text Object Depth
// Existing UI text uses setDepth(1000) to appear above game elements
// Level name should use similar depth to ensure visibility

// CRITICAL: Coordinate System  
// LevelManager converts 1-based JSON coords to 0-based internal coords
// Name and budget are top-level properties - no coordinate conversion needed

// CRITICAL: Event System
// GameState emits 'levelLoaded' event in initializeWithLevel()  
// GameScene listens to 'budgetChanged' event for budget updates
// Must ensure level name and budget trigger appropriate events

// CRITICAL: Error Handling
// LevelManager.validateLevelStructure() validates required fields
// Should validate name/budget fields but make them optional for backward compatibility
```

## Implementation Blueprint

### Data Models and Structure
Current level JSON structure is already correct:
```javascript
// Level JSON (already exists in level-1.json)
{
  "name": "Welcomevel",           // Level display name
  "budget": 53000,                // Starting budget for this level
  "grid": { /* grid config */ },  // Existing grid structure
  "cars": [ /* car config */ ]    // Existing car structure
}

// GameState additions needed:
{
  levelName: string,              // Store current level name
  budget: number,                 // Will come from level instead of constant
  // ... existing properties
}
```

### List of Tasks to be Completed

```yaml
Task 1: Update LevelManager to Expose Level Name and Budget
MODIFY src/managers/LevelManager.js:
  - ADD getLevelName() method to return current level name
  - ADD getInitialBudget() method to return level budget  
  - MODIFY validateLevelStructure() to accept name/budget as optional
  - PRESERVE all existing coordinate conversion and validation logic

Task 2: Update GameState to Use Level Budget and Name
MODIFY src/data/GameState.js:
  - ADD levelName property to store current level name
  - MODIFY initializeWithLevel() to use level budget instead of constant
  - MODIFY initializeWithLevel() to store level name
  - ADD getLevelName() method for UI access
  - PRESERVE all existing budget management methods

Task 3: Update GameScene to Display Level Name
MODIFY src/scenes/GameScene.js:
  - ADD level name text element to createUI() method
  - MODIFY updateDebugDisplay() to show level name
  - FOLLOW existing controlsText and debugText patterns
  - PRESERVE all existing UI elements and functionality

Task 4: Update Constants to Make Budget a Fallback
MODIFY src/utils/Constants.js:
  - RENAME startingBudget to defaultBudget for clarity
  - ADD comment explaining it's used when level doesn't specify budget
  - PRESERVE all other constants unchanged

Task 5: Add Validation Tests
CREATE validation tests for new functionality:
  - Test level name parsing and display
  - Test budget initialization from level
  - Test fallback behavior when name/budget missing
  - FOLLOW existing test-basic.html patterns
```

### Per Task Pseudocode

```javascript
// Task 1: LevelManager Updates
class LevelManager {
  // ADD method to get level name
  getLevelName() {
    // PATTERN: Return original level data property
    return this.currentLevel?.name || 'Unnamed Level';
  }
  
  // ADD method to get initial budget
  getInitialBudget() {
    // PATTERN: Return level budget or fallback to constant
    return this.currentLevel?.budget || GameConfig.defaultBudget;
  }
  
  // MODIFY validation to make name/budget optional
  validateLevelStructure(levelData) {
    // PRESERVE existing required field validation
    // ADD optional field validation
    if (levelData.name && typeof levelData.name !== 'string') {
      throw new Error("Level name must be a string");
    }
    if (levelData.budget && typeof levelData.budget !== 'number') {
      throw new Error("Level budget must be a number");  
    }
  }
}

// Task 2: GameState Updates  
class GameState {
  reset() {
    // PRESERVE existing reset logic
    this.levelName = null;  // ADD level name tracking
    // budget initialization moved to initializeWithLevel()
  }
  
  initializeWithLevel(levelData) {
    // PATTERN: Use existing level initialization flow
    this.level = levelData;
    this.levelName = levelManager.getLevelName();        // ADD name from level
    this.budget = levelManager.getInitialBudget();       // ADD budget from level
    
    // PRESERVE existing initialization
    this.emit('levelLoaded', levelData);
    this.emit('budgetChanged', this.budget);             // TRIGGER budget update
  }
}

// Task 3: GameScene UI Updates
class GameScene {
  createUI() {
    // PRESERVE existing debugText and controlsText
    
    // ADD level name display following existing patterns
    this.levelNameText = this.add.text(
      this.cameras.main.centerX, 10,  // Top center position
      '',  // Will be updated in updateDebugDisplay
      {
        fontSize: '24px',
        color: '#ffffff', 
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 15, y: 8 }
      }
    );
    this.levelNameText.setOrigin(0.5, 0);  // Center horizontally
    this.levelNameText.setDepth(1000);     // PATTERN: Same depth as other UI
  }
  
  updateDebugDisplay() {
    // PRESERVE existing debug info
    
    // UPDATE level name display
    if (this.levelNameText && this.gameState.levelName) {
      this.levelNameText.setText(this.gameState.levelName);
    }
  }
}
```

### Integration Points
```yaml
LEVELMANAGER:
  - method: getLevelName() returns current level name or default
  - method: getInitialBudget() returns level budget or fallback
  - validation: Optional name/budget field validation

GAMESTATE:  
  - property: levelName stores current level display name
  - method: initializeWithLevel() uses level budget instead of constant
  - event: budgetChanged emitted when level budget is set

UI_DISPLAY:
  - element: levelNameText shows current level name at top center
  - update: updateDebugDisplay() refreshes level name display
  - styling: Follows existing controlsText/debugText patterns

CONSTANTS:
  - rename: startingBudget becomes defaultBudget (fallback value)
  - usage: Used only when level JSON doesn't specify budget
```

## Validation Loop

### Level 1: Module Loading & Basic Functionality
```bash
# Open test-basic.html in browser
# Expected: All existing tests pass, no console errors

# Manual test - Check level loading:
# 1. Open index.html
# 2. Verify level name "Welcomevel" appears at top center
# 3. Verify budget shows $53000 (from level-1.json) not $10000
# 4. Verify all existing functionality works (road placement, simulation)
```

### Level 2: Level Name Display Test
```javascript
// ADD to test-basic.html after existing tests:
await test('Level name loads and displays', async () => {
  const { levelManager } = await import('./src/managers/LevelManager.js');
  const { gameState } = await import('./src/data/GameState.js');
  
  // Load level and check name is available
  const levelData = await levelManager.loadLevel('levels/level-1.json');
  const levelName = levelManager.getLevelName();
  
  if (levelName !== 'Welcomevel') {
    throw new Error(`Expected 'Welcomevel', got '${levelName}'`);
  }
  
  // Check GameState stores level name
  gameState.initializeWithLevel(levelData);
  if (gameState.levelName !== 'Welcomevel') {
    throw new Error(`GameState levelName not set correctly`);
  }
});
```

### Level 3: Budget Initialization Test
```javascript
// ADD to test-basic.html:
await test('Level budget initializes correctly', async () => {
  const { levelManager } = await import('./src/managers/LevelManager.js');
  const { gameState } = await import('./src/data/GameState.js');
  
  // Load level and check budget
  const levelData = await levelManager.loadLevel('levels/level-1.json');
  const initialBudget = levelManager.getInitialBudget();
  
  if (initialBudget !== 53000) {
    throw new Error(`Expected budget 53000, got ${initialBudget}`);
  }
  
  // Check GameState uses level budget
  gameState.initializeWithLevel(levelData);
  if (gameState.budget !== 53000) {
    throw new Error(`GameState budget not initialized from level`);
  }
});
```

### Level 4: Backward Compatibility Test
```javascript
// ADD to test-basic.html:
await test('Backward compatibility with missing name/budget', async () => {
  const { levelManager } = await import('./src/managers/LevelManager.js');
  
  // Mock level without name/budget
  const mockLevel = {
    grid: { rows: 5, column: 5, uneditable: [] },
    cars: [{ color: 'red', entrances: [{row: 1, column: 0}], exit: {row: 1, column: -1} }]
  };
  
  levelManager.currentLevel = mockLevel;
  
  const name = levelManager.getLevelName();
  const budget = levelManager.getInitialBudget();
  
  if (name !== 'Unnamed Level') {
    throw new Error(`Expected fallback name, got '${name}'`);
  }
  
  if (typeof budget !== 'number' || budget <= 0) {
    throw new Error(`Expected fallback budget, got ${budget}`);
  }
});
```

## Final Validation Checklist
- [ ] Level name "Welcomevel" displays at top center of screen
- [ ] Initial budget shows $53000 (from level-1.json) not $10000  
- [ ] All existing tests in test-basic.html still pass
- [ ] Road placement and simulation functionality unchanged
- [ ] Budget decreases properly when placing roads
- [ ] Level name persists throughout gameplay
- [ ] Fallback behavior works for levels without name/budget
- [ ] No console errors when loading game

---

## Anti-Patterns to Avoid
- ❌ Don't break existing level files - make name/budget optional
- ❌ Don't hardcode level names in UI - always get from level data
- ❌ Don't ignore the existing event system - emit budgetChanged when initializing
- ❌ Don't create new constants when existing patterns work
- ❌ Don't modify coordinate conversion logic - name/budget don't need conversion
- ❌ Don't change existing UI layouts drastically - add level name cleanly
- ❌ Don't skip validation - ensure name is string and budget is positive number

## Quality Assessment
**Confidence Score: 9/10**

This PRP provides comprehensive context for implementing level name and budget display with:
- ✅ Complete analysis of existing codebase patterns and structures  
- ✅ Detailed implementation plan preserving all existing functionality
- ✅ Clear task breakdown with specific file modifications needed
- ✅ Comprehensive validation tests following project patterns
- ✅ Backward compatibility considerations for existing levels
- ✅ Anti-patterns section preventing common implementation mistakes

The high confidence score reflects thorough understanding of the existing architecture, minimal scope changes, and comprehensive testing approach.