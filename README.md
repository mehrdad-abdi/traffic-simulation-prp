# Traffic Simulation Puzzle Game

A single-player, grid-based traffic simulation and optimization puzzle game built with Phaser.js. Players design and manage road intersections to maximize traffic flow efficiency while staying within budget constraints.

## 🎮 Game Overview

Design road networks on a grid to guide vehicles from their entrances to exits efficiently. Create intersections, manage traffic flow, and avoid traffic jams that could cause level failure. The game features:

- **2D top-down perspective** with interactive grid-based gameplay
- **Budget management** - each road costs $1000 to place
- **Traffic direction controls** with visual arrows
- **Real-time simulation** with pathfinding AI
- **Win/lose conditions** based on traffic flow efficiency

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd traffic-simulation-prp

# 2. Open the game
open index.html
# or serve locally for better performance:
python -m http.server 8000
# then visit http://localhost:8000

# 3. Play the game
# - Click on blue cells to place roads ($1000 each)
# - Click and drag on roads to add direction arrows
# - Click the delete button to remove roads
# - Click simulation to start traffic flow
```

## 📚 Table of Contents

- [Game Features](#game-features)
- [Architecture](#architecture)
- [Level Format](#level-format)
- [Development](#development)
- [Implementation Details](#implementation-details)

## 🎯 Game Features

### Core Gameplay
- **Grid-based building**: Click on editable cells to place roads
- **Budget system**: Each road costs $1000, manage your resources wisely
- **Direction arrows**: Click and drag on roads to set traffic flow directions
- **Real-time simulation**: Cars spawn from entrances and navigate to exits
- **Pathfinding AI**: Cars use A* algorithm to find optimal routes

### Game Mechanics
- **Car spawning**: Vehicles enter from designated entrance points
- **Traffic flow**: Cars follow road networks and direction arrows
- **Collision avoidance**: Cars wait behind other vehicles to prevent crashes
- **Failure conditions**: Level fails if cars wait more than 10 seconds
- **Success criteria**: All cars must reach their exits efficiently

## 🏗️ Architecture

```
src/
├── game.js                 # Main Phaser.js game configuration
├── scenes/
│   ├── GameScene.js        # Main gameplay scene with grid interaction
│   └── UIScene.js          # User interface and HUD
├── managers/
│   ├── GridManager.js      # Grid rendering and cell management
│   ├── LevelManager.js     # Level loading and validation
│   ├── CarManager.js       # Car spawning and movement
│   └── InputManager.js     # Mouse input and tool states
├── entities/
│   ├── Car.js             # Individual car behavior
│   ├── Road.js            # Road tiles with direction arrows
│   └── Cell.js            # Base grid cell types
├── utils/
│   ├── PathFinder.js      # A* pathfinding integration
│   ├── Constants.js       # Game constants and configuration
│   └── Helpers.js         # Utility functions
└── data/
    └── GameState.js       # Game state management
```

## 📋 Level Format

Levels are defined in JSON files with the following structure:

```json
{
  "grid": {
    "rows": 7,
    "column": 12,
    "uneditable": [
      {
        "row-from": 4, "row-to": 6,
        "column-from": 2, "column-to": 4,
        "type": "tree"
      }
    ]
  },
  "cars": [
    {
      "color": "red",
      "entrances": [{"row": 2, "column": -1}],
      "exit": {"row": 3, "column": 0}
    }
  ]
}
```

### Grid System
- **Coordinates**: 1-based indexing (row 1, column 1 is top-left)
- **Entrances**: Use -1 for right/bottom edges, 0 for left/top edges
- **Cell types**: "tree" (green), "building" (orange), editable (blue)

### Car Configuration
- **Colors**: Visual identification for different car types
- **Multiple entrances**: Cars can spawn from multiple entry points
- **Single exit**: Each car type has one destination

## 🛠️ Development

### Prerequisites
- Modern web browser with ES6+ support
- Local web server (recommended for development)

### Technology Stack
- **Phaser.js 3.85+**: Game engine and rendering
- **PathFinding.js**: A* pathfinding algorithm
- **Vanilla JavaScript**: No additional frameworks

### Development Workflow
1. **Level Design**: Create/modify JSON files in `levels/` directory
2. **Feature Implementation**: Follow modular architecture in `src/`
3. **Testing**: Use browser developer tools and visual testing
4. **Performance**: Monitor frame rate during simulation

## 🔧 Implementation Details

### Key Components
- **GridManager**: Handles cell rendering and coordinate conversion
- **PathFinder**: Integrates A* algorithm for car navigation
- **CarManager**: Manages vehicle lifecycle and traffic rules
- **InputManager**: Processes mouse events and tool states

### Performance Optimizations
- **Static graphics caching**: Use `generateTexture()` for grid elements
- **Object pooling**: Reuse car objects to reduce garbage collection
- **Efficient pathfinding**: Clone grids only when necessary

### Coordinate Systems
- **Level JSON**: 1-based indexing for human readability
- **Internal arrays**: 0-based indexing for programming efficiency
- **Phaser world**: Pixel coordinates for rendering

## 🎮 Playing the Game

1. **Place roads**: Click on blue (editable) cells to build your network
2. **Set directions**: Click and drag on roads to add traffic flow arrows
3. **Manage budget**: Each road costs $1000 - spend wisely
4. **Delete roads**: Toggle delete mode to remove unwanted roads
5. **Start simulation**: Watch cars navigate your road network
6. **Win condition**: All cars reach their exits without traffic jams

## 📝 Context Engineering

This project was built using Context Engineering principles with comprehensive PRPs (Product Requirements Prompts). See the `PRPs/` directory for implementation blueprints and the development workflow used to create this game.