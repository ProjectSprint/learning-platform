# Game Infrastructure Layer

This module provides low-level, reusable abstractions for game systems. It's designed to be domain-agnostic and support multiple game types.

## Structure

```
infrastructure/
├── geometry/          # Coordinate systems and spatial utilities
│   ├── coordinates.ts # Point2D, GridCoordinate, distance calculations
│   └── index.ts
├── grid/             # Grid abstractions for various layouts
│   ├── core/
│   │   ├── GridBase.ts   # Abstract base class for all grids
│   │   └── GridCell.ts   # Generic cell representation
│   ├── variants/
│   │   ├── SquareGrid.ts # Rectangular grid (fully implemented)
│   │   ├── HexGrid.ts    # Hexagonal grid (stub)
│   │   └── RadialGrid.ts # Polar/circular grid (stub)
│   └── index.ts
└── index.ts
```

## Components

### Geometry

The geometry module provides coordinate system primitives:

- `Point2D` - 2D pixel/screen coordinates (x, y)
- `GridCoordinate` - Grid indices (row, col)
- `Dimensions` - Size representation (width, height)
- Utility functions for distance, snapping, clamping, etc.

### Grid System

The grid system follows an object-oriented design with polymorphic grid types:

#### GridBase (Abstract)

Abstract base class defining the grid contract:

**Abstract Methods (must be implemented by subclasses):**
- `getCellAt(coord)` - Get cell at coordinate
- `getNeighbors(coord, includeDiagonals)` - Get neighboring cells
- `coordToPixel(coord)` - Convert grid coord to pixel position
- `pixelToCoord(point)` - Convert pixel position to grid coord
- `getAllCells()` - Get all cells in the grid

**Concrete Helper Methods:**
- `isValidCoord(coord)` - Bounds checking
- `getDistance(a, b)` - Manhattan distance
- `getTotalWidth()` / `getTotalHeight()` - Grid dimensions
- `getCellCenter(coord)` - Center point of cell
- `getRow(row)` / `getColumn(col)` - Get cells by row/column
- `forEach()`, `map()`, `filter()`, `find()` - Functional iteration

#### GridCell

Generic container for grid cell data:
- Stores position (`coord`) and optional data
- Immutable - creates new instances for updates
- Type-safe with generics `GridCell<T>`

#### SquareGrid (Implemented)

Rectangular grid with rows and columns:

```typescript
// Create empty grid
const grid = SquareGrid.empty<CellData>(rows, cols, metrics);

// Create from data
const grid = SquareGrid.fromData(dataArray, metrics);

// Access cells
const cell = grid.getCellAt({ row: 1, col: 2 });

// Update immutably
const updated = grid.updateCell({ row: 0, col: 0 }, newData);

// Coordinate conversion
const pixel = grid.coordToPixel({ row: 1, col: 1 });
const coord = grid.pixelToCoord({ x: 100, y: 100 });

// Neighbors
const neighbors = grid.getNeighbors({ row: 1, col: 1 }, true);
```

**Grid Metrics:**
```typescript
type GridMetrics = {
  cellWidth: number;   // Width of each cell in pixels
  cellHeight: number;  // Height of each cell in pixels
  gapX?: number;       // Horizontal gap between cells
  gapY?: number;       // Vertical gap between cells
};
```

#### HexGrid (Stub)

Hexagonal grid support - planned for future implementation.
Will support:
- Flat-top and pointy-top orientations
- Cube coordinate system
- Six-way neighbor traversal

#### RadialGrid (Stub)

Radial/polar grid support - planned for future implementation.
Will support:
- Concentric rings
- Angular sectors
- Polar coordinate system

## Design Principles

1. **Immutability** - Grid operations return new instances rather than mutating
2. **Type Safety** - Full TypeScript generics support
3. **Polymorphism** - Abstract base class enables grid type interchangeability
4. **Separation of Concerns** - Geometry separate from grid logic
5. **Extensibility** - Easy to add new grid types (hex, radial, isometric, etc.)

## Migration Path

This infrastructure replaces the old puzzle-specific grid utilities:

### Old (puzzle/grid/)
- `blocks.ts` - Block grid creation and manipulation
- `math.ts` - Coordinate conversions
- `types.ts` - Grid types

### New (infrastructure/grid/)
- `GridBase` - Abstract grid interface
- `SquareGrid` - Concrete rectangular implementation
- `geometry/coordinates` - Coordinate utilities

The new system is more flexible and supports future grid types beyond squares.

## Usage Example

```typescript
import { SquareGrid, createGridCoord } from '@/components/game/infrastructure';

// Create a 3x3 grid with 50px cells and 10px gaps
const grid = SquareGrid.empty(3, 3, {
  cellWidth: 50,
  cellHeight: 50,
  gapX: 10,
  gapY: 10
});

// Get a cell
const cell = grid.getCellAt(createGridCoord(1, 1));

// Convert to pixels (center cell = 60px from origin)
const position = grid.coordToPixel(createGridCoord(1, 1));
// { x: 60, y: 60 }

// Find neighbors
const neighbors = grid.getNeighbors(createGridCoord(1, 1));
// Returns 4 neighboring cells (N, S, E, W)

// Update data immutably
const updated = grid.updateCell(
  createGridCoord(0, 0),
  { type: 'occupied', itemId: '123' }
);
```

## Future Enhancements

- [ ] Implement HexGrid with cube coordinates
- [ ] Implement RadialGrid with polar coordinates
- [ ] Add IsometricGrid for 2.5D layouts
- [ ] Add TriangleGrid for triangular tessellations
- [ ] Grid serialization/deserialization
- [ ] Grid transformation utilities (rotate, flip, etc.)
- [ ] Pathfinding algorithms (A*, Dijkstra)
- [ ] Field of view calculations
