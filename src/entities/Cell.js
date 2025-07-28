// Traffic Simulation Game - Cell Entity
// Base grid cell with different types (editable, tree, building)

import { GameConfig, Colors, CellTypes, ZLayers } from '../utils/Constants.js';
import { gridToWorld } from '../utils/Helpers.js';

/**
 * Cell class representing a single grid cell with visual rendering
 */
export class Cell extends Phaser.GameObjects.Container {
    constructor(scene, row, col, cellType = CellTypes.EDITABLE) {
        // Calculate world position
        const worldPos = gridToWorld(row, col);
        super(scene, worldPos.x, worldPos.y);
        
        // Store cell properties
        this.row = row;
        this.col = col;
        this.cellType = cellType;
        this.isHighlighted = false;
        this.isSelected = false;
        
        // Set depth for proper layering
        this.setDepth(ZLayers.CELLS);
        
        // Create visual components
        this.createVisuals();
        
        // Add to scene
        scene.add.existing(this);
        
        // Set up interactivity
        this.setupInteractivity();
    }

    /**
     * Create visual components for the cell
     */
    createVisuals() {
        // Create main cell background
        this.background = this.scene.add.graphics();
        this.add(this.background);
        
        // Create highlight overlay (initially hidden)
        this.highlight = this.scene.add.graphics();
        this.highlight.setVisible(false);
        this.add(this.highlight);
        
        // Create selection border (initially hidden)
        this.selectionBorder = this.scene.add.graphics();
        this.selectionBorder.setVisible(false);
        this.add(this.selectionBorder);
        
        // Draw the cell based on type
        this.updateVisuals();
    }

    /**
     * Update visual appearance based on cell type and state
     */
    updateVisuals() {
        this.drawBackground();
        this.drawHighlight();
        this.drawSelectionBorder();
    }

    /**
     * Draw the main cell background
     */
    drawBackground() {
        this.background.clear();
        
        const color = this.getCellColor();
        const size = GameConfig.cellSize;
        const halfSize = size / 2;
        
        // Fill the cell
        this.background.fillStyle(color, this.getCellAlpha());
        this.background.fillRect(-halfSize, -halfSize, size, size);
        
        // Draw cell type specific details
        this.drawCellTypeDetails();
        
        // Draw border (thin dashed grid lines)
        this.drawCellBorder();
    }

    /**
     * Draw cell type specific visual details
     */
    drawCellTypeDetails() {
        const halfSize = GameConfig.cellSize / 2;
        
        switch (this.cellType) {
            case CellTypes.TREE:
                // Draw a simple tree representation
                this.drawTree();
                break;
                
            case CellTypes.BUILDING:
                // Draw a simple building representation
                this.drawBuilding();
                break;
                
            case CellTypes.EDITABLE:
                // Editable cells are just the background color
                break;
                
            case CellTypes.ROAD:
                // Roads are handled by Road entity, but draw basic gray if needed
                this.background.fillStyle(Colors.road, 1.0);
                this.background.fillRect(-halfSize, -halfSize, GameConfig.cellSize, GameConfig.cellSize);
                break;
        }
    }

    /**
     * Draw a simple tree representation
     */
    drawTree() {
        const size = GameConfig.cellSize;
        const centerX = 0;
        const centerY = 0;
        
        // Tree trunk (brown rectangle)
        this.background.fillStyle(0x8B4513, 1.0); // Brown
        this.background.fillRect(centerX - 2, centerY + 8, 4, 8);
        
        // Tree foliage (green circles)
        this.background.fillStyle(0x228B22, 1.0); // Forest green
        this.background.fillCircle(centerX, centerY - 2, 8);
        this.background.fillCircle(centerX - 6, centerY + 2, 6);
        this.background.fillCircle(centerX + 6, centerY + 2, 6);
    }

    /**
     * Draw a simple building representation
     */
    drawBuilding() {
        const size = GameConfig.cellSize;
        const centerX = 0;
        const centerY = 0;
        
        // Building body (darker orange rectangle)
        this.background.fillStyle(0xD2691E, 1.0); // Saddle brown
        this.background.fillRect(centerX - 12, centerY - 10, 24, 20);
        
        // Windows (dark rectangles)
        this.background.fillStyle(0x2F4F4F, 1.0); // Dark slate gray
        this.background.fillRect(centerX - 8, centerY - 6, 4, 4);
        this.background.fillRect(centerX + 4, centerY - 6, 4, 4);
        this.background.fillRect(centerX - 8, centerY + 2, 4, 4);
        this.background.fillRect(centerX + 4, centerY + 2, 4, 4);
        
        // Door (brown rectangle)
        this.background.fillStyle(0x8B4513, 1.0); // Brown
        this.background.fillRect(centerX - 2, centerY + 2, 4, 8);
    }

    /**
     * Draw cell border with dashed lines
     */
    drawCellBorder() {
        const size = GameConfig.cellSize;
        const halfSize = size / 2;
        
        this.background.lineStyle(GameConfig.gridLineWidth, Colors.gridLine, 0.5);
        
        // Create dashed border effect
        const dashLength = 4;
        const gapLength = 2;
        
        // Top border
        this.drawDashedLine(-halfSize, -halfSize, halfSize, -halfSize, dashLength, gapLength);
        // Right border
        this.drawDashedLine(halfSize, -halfSize, halfSize, halfSize, dashLength, gapLength);
        // Bottom border
        this.drawDashedLine(halfSize, halfSize, -halfSize, halfSize, dashLength, gapLength);
        // Left border
        this.drawDashedLine(-halfSize, halfSize, -halfSize, -halfSize, dashLength, gapLength);
    }

    /**
     * Draw a dashed line between two points
     */
    drawDashedLine(x1, y1, x2, y2, dashLength, gapLength) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        let currentDistance = 0;
        let isDash = true;
        
        while (currentDistance < distance) {
            const segmentLength = Math.min(
                isDash ? dashLength : gapLength,
                distance - currentDistance
            );
            
            const startX = x1 + currentDistance * unitX;
            const startY = y1 + currentDistance * unitY;
            const endX = startX + segmentLength * unitX;
            const endY = startY + segmentLength * unitY;
            
            if (isDash) {
                this.background.lineBetween(startX, startY, endX, endY);
            }
            
            currentDistance += segmentLength;
            isDash = !isDash;
        }
    }

    /**
     * Draw highlight overlay
     */
    drawHighlight() {
        this.highlight.clear();
        
        if (this.isHighlighted) {
            const size = GameConfig.cellSize;
            const halfSize = size / 2;
            
            this.highlight.fillStyle(Colors.highlight, 0.3);
            this.highlight.fillRect(-halfSize, -halfSize, size, size);
        }
    }

    /**
     * Draw selection border
     */
    drawSelectionBorder() {
        this.selectionBorder.clear();
        
        if (this.isSelected) {
            const size = GameConfig.cellSize;
            const halfSize = size / 2;
            
            this.selectionBorder.lineStyle(2, Colors.highlight, 1.0);
            this.selectionBorder.strokeRect(-halfSize, -halfSize, size, size);
        }
    }

    /**
     * Set up mouse interactivity
     */
    setupInteractivity() {
        if (this.cellType === CellTypes.EDITABLE || this.cellType === CellTypes.ROAD) {
            // Make interactive area
            const size = GameConfig.cellSize;
            const halfSize = size / 2;
            
            this.setInteractive(new Phaser.Geom.Rectangle(-halfSize, -halfSize, size, size), 
                               Phaser.Geom.Rectangle.Contains);
            
            // Mouse events
            this.on('pointerover', this.onPointerOver, this);
            this.on('pointerout', this.onPointerOut, this);
            this.on('pointerdown', this.onPointerDown, this);
        }
    }

    /**
     * Mouse over event handler
     */
    onPointerOver() {
        this.setHighlighted(true);
        
        // Emit hover event
        this.scene.events.emit('cellHovered', {
            row: this.row,
            col: this.col,
            cellType: this.cellType,
            cell: this
        });
    }

    /**
     * Mouse out event handler
     */
    onPointerOut() {
        this.setHighlighted(false);
        
        // Emit hover end event
        this.scene.events.emit('cellHoverEnd', {
            row: this.row,
            col: this.col,
            cellType: this.cellType,
            cell: this
        });
    }

    /**
     * Mouse down event handler
     */
    onPointerDown(pointer) {
        // Emit click event
        this.scene.events.emit('cellClicked', {
            row: this.row,
            col: this.col,
            cellType: this.cellType,
            cell: this,
            pointer: pointer
        });
    }

    /**
     * Get cell color based on type
     * @returns {number} Hex color value
     */
    getCellColor() {
        switch (this.cellType) {
            case CellTypes.EDITABLE:
                return Colors.editable;
            case CellTypes.TREE:
                return Colors.tree;
            case CellTypes.BUILDING:
                return Colors.building;
            case CellTypes.ROAD:
                return Colors.road;
            default:
                return Colors.editable;
        }
    }

    /**
     * Get cell alpha (transparency) based on type
     * @returns {number} Alpha value (0-1)
     */
    getCellAlpha() {
        switch (this.cellType) {
            case CellTypes.EDITABLE:
                return 0.7; // Semi-transparent to show it's buildable
            case CellTypes.TREE:
            case CellTypes.BUILDING:
                return 1.0; // Solid for obstacles
            case CellTypes.ROAD:
                return 1.0; // Solid for roads
            default:
                return 0.7;
        }
    }

    /**
     * Set highlighted state
     * @param {boolean} highlighted - Whether cell is highlighted
     */
    setHighlighted(highlighted) {
        if (this.isHighlighted !== highlighted) {
            this.isHighlighted = highlighted;
            this.highlight.setVisible(highlighted);
            this.drawHighlight();
        }
    }

    /**
     * Set selected state
     * @param {boolean} selected - Whether cell is selected
     */
    setSelected(selected) {
        if (this.isSelected !== selected) {
            this.isSelected = selected;
            this.selectionBorder.setVisible(selected);
            this.drawSelectionBorder();
        }
    }

    /**
     * Change cell type and update visuals
     * @param {string} newType - New cell type
     */
    setCellType(newType) {
        if (this.cellType !== newType) {
            this.cellType = newType;
            this.updateVisuals();
            
            // Update interactivity
            this.removeInteractive();
            this.setupInteractivity();
        }
    }

    /**
     * Check if this cell can be edited (roads placed/removed)
     * @returns {boolean} True if editable
     */
    isEditable() {
        return this.cellType === CellTypes.EDITABLE || this.cellType === CellTypes.ROAD;
    }

    /**
     * Get cell key for map storage
     * @returns {string} Unique cell key
     */
    getKey() {
        return `${this.row},${this.col}`;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.off('pointerover');
        this.off('pointerout'); 
        this.off('pointerdown');
        
        // Destroy graphics objects
        if (this.background) this.background.destroy();
        if (this.highlight) this.highlight.destroy();
        if (this.selectionBorder) this.selectionBorder.destroy();
        
        // Call parent destroy
        super.destroy();
    }
}

export default Cell;