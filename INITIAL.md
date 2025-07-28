## FEATURE:

A single-player, grid-based traffic simulation and optimization puzzle game. 
The player’s goal is to design and manage road intersections to maximize traffic flow efficiency while staying within a fixed budget. 
Players place roads, traffic signs, and lights on a grid to guide vehicles safely and quickly to their destinations.
If player designs an improper road, a traffic jam may be created which leads in the level fail.

- The game **View** is 2D top-down perspective
- **Technology**: use Phaser.js game engine, HTML5 Canvas, JavaScript

### Level Definition:

Each level is defined in a level file which is a json file
  - The level file includes the grid. 
     - The number of rows and the number of columns should be defined.
     - all cells are editable unless any cell is defined as uneditable (like a stone/ building / tree / etc).
     - If a matrix cell is editable, during the game, the player can make a road on it.
  - The level file includes a list of car typed
     - Each car type has a color.
     - Each car type has a list of entrances.
     - Each car type has an exit point.

Example level file:
```
{
    "grid": {
        "rows": 7,
        "column": 12,
        "uneditable": [
            {
                "row-from": 4,
                "row-to": 6,
                "column-from": 2,
                "column-to": 4,
                "type": "tree"
            },
            {
                "row-from": 4,
                "row-to": 6,
                "column-from": 9,
                "column-to": 11,
                "type": "building"
            }
        ]
    },
    "cars": [
        {
            "color": "red",
            "entrances": [
                {
                    "row": 2,
                    "column": -1
                },
                {
                    "row": -1,
                    "column": 6
                }
            ],
            "exit": {
                "row": 3,
                "column": 0
            }
        }
    ]
}
```

### Level Load:

When the level is loads, the grid will be drawn from the level file.
If a cell is tree --> use green color, If a cell is building --> orange color, if it's editable --> blue color
Use a thin dashed grid lines to show cells border
When the player clicks on a cell, if the cell is editable, place a road on it. When placing a road, reduce 1000$ from the budget. If no budget don't place any road. Road --> gray
If the player clicks on a road cell, and drags to a neighbor cell, a arrow will be shown in the road. Straight arrow or turning arrow. The arrow will be white (with gray background because it is drawn on the road). If the players repeats the click and drag, extend the arrow (example: go straight and turn right) or turn righ and turn left.
If the player clicks on delete button, the button will turn into active state. when the delete button is active, and player clicks on a road, the road will be deleted. If the delete button is pressed again, it will be deactivate.
Cells index from 1. For example if the block in row 1 and column 2 is a tree, it means that the cell in the first row and the second column.
Car entrance: In a car entrance one of row or columns are 0 or -1. 0 in rows means left, -1 means right. 0 in columns means top, -1 means buttom. So, if the entrance of yellow cars is row 4 and column -1, it means that the yellow cars will enter the grid from right in row 4. In the entrance positions of the cars, draw a car with it's color. If multiple cars enter from one entrance don't draw them on top of each other, draw one of them in behind of other. For the exit point of each car type, use a flag with the car color.

### Simulation:

When the player click simulation, cars start spawning from 10 cells farther of the entrance. So, if the entrance is row 2 and column 0 (left), the car will be spawned on cell row 2 and column -10 and will move to the cell 2 and column 0 (the entrance) and then they will enter the grid. 
In the grid they will move straight unless they reach a cell that there's a turning arrow sign is drawn.
Based on the arrow, they can move to a neighbor cell.
If there's a path between the entrance and the exit, thet car will follow it. They always follow the shortest path.

The cars never collide. If the car notices that there is another in front of it, it will stop until the other car is passed and it is unblocked.
If a car waits for more than 10 seconds and cannot enter the grid, the players fail. In this case show a circle around the car and show the fail message.