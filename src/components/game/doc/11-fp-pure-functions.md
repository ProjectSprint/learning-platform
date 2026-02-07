# Pure Function Reference

This document provides a comprehensive reference for all pure functions in the game engine's functional programming (FP) architecture. These functions replace methods from the original OOP classes (Entity, Item, Space, GridSpace, PoolSpace) and are designed to work seamlessly with Immer.js for immutable state management.

## Table of Contents

- [Overview](#overview)
- [Entity Functions](#entity-functions)
- [Item Functions](#item-functions)
- [Space Functions](#space-functions)
  - [Grid Space Functions](#grid-space-functions)
  - [Pool Space Functions](#pool-space-functions)
  - [Polymorphic Space Functions](#polymorphic-space-functions)
- [Geometry Functions](#geometry-functions)
- [Function Composition Patterns](#function-composition-patterns)
- [Pure Functions vs Reducers](#pure-functions-vs-reducers)

---

## Overview

### Why Pure Functions?

The game engine uses pure functions for several critical reasons:

1. **Testability**: Pure functions are easy to test in isolation
2. **Predictability**: Same inputs always produce same outputs
3. **Composability**: Functions can be combined to create complex behaviors
4. **Immer Compatibility**: Works perfectly with Immer's Draft<T> for mutation-like syntax
5. **No Side Effects**: No hidden dependencies or global state mutations

### Function Categories

Functions are organized into three categories:

1. **Factory Functions**: Create new data structures (e.g., `createEntityData`)
2. **Query Functions**: Read data without modification (e.g., `getEntityStateValue`)
3. **Mutation Functions**: Modify data in-place for use with Immer (e.g., `setEntityStateValue`, `gridAdd`)

### Mutation Functions & Immer

Functions marked as "mutation functions" are designed to work with **Immer's `produce()`**. They mutate the data in-place, but when called within `produce()`, Immer ensures immutability is maintained.

```typescript
// ✅ Correct: Mutation function inside Immer produce()
const newState = produce(state, (draft) => {
  const entity = draft.entities.get(entityId);
  if (entity) {
    setEntityStateValue(entity, "status", "active"); // Mutates draft
  }
});

// ❌ Incorrect: Mutation function without Immer
const entity = state.entities.get(entityId);
setEntityStateValue(entity, "status", "active"); // Breaks immutability!
```

---

## Entity Functions

Functions for working with `EntityData` and `ItemData` objects.

### Factory Functions

#### `createEntityData(config: EntityDataConfig): EntityData`

Creates a new EntityData object from configuration.

**Parameters:**
- `config: EntityDataConfig` - Entity configuration object

**Returns:** `EntityData` - A new entity data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { createEntityData } from "@/components/game/domain/entity/entity-fns";

const router = createEntityData({
  id: "router-1",
  type: "router",
  name: "Network Router",
  visual: {
    color: "blue.500",
    icon: "mdi:router",
  },
  data: {
    model: "RT-AX88U",
  },
  state: {
    dhcpEnabled: false,
    ipRangeStart: "",
    ipRangeEnd: "",
  },
  behaviorIds: ["configurable"],
});
```

#### `createItemData(config: ItemDataConfig): ItemData`

Creates a new ItemData object (inventory item) from configuration.

**Parameters:**
- `config: ItemDataConfig` - Item configuration object

**Returns:** `ItemData` - A new item data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { createItemData } from "@/components/game/domain/entity/entity-fns";

const cable = createItemData({
  id: "cable-1",
  name: "Ethernet Cable",
  visual: {
    icon: "mdi:ethernet-cable",
  },
  data: {},
  state: {},
  allowedPlaces: ["pc-1-board", "router-board"],
  icon: { name: "mdi:ethernet-cable", color: "yellow.500" },
  draggable: true,
  category: "networking",
});
```

### Query Functions

#### `getEntityStateValue<T>(entity: EntityData, key: string): T | undefined`

Gets a specific state value from an entity with type safety.

**Parameters:**
- `entity: EntityData` - The entity data
- `key: string` - The state key to retrieve

**Returns:** `T | undefined` - The state value, or undefined if not found

**Side Effects:** None (pure)

**Example:**

```typescript
import { getEntityStateValue } from "@/components/game/domain/entity/entity-fns";

const dhcpEnabled = getEntityStateValue<boolean>(router, "dhcpEnabled");
const ipAddress = getEntityStateValue<string>(pc, "ipAddress");

if (dhcpEnabled) {
  console.log("DHCP is enabled");
}
```

### Mutation Functions (for Immer)

#### `setEntityStateValue(entity: EntityData, key: string, value: unknown): void`

Sets a state value on an entity. **Mutates in-place** (for use with Immer `produce()`).

**Parameters:**
- `entity: EntityData` - The entity data to mutate
- `key: string` - The state key
- `value: unknown` - The new value

**Returns:** `void`

**Side Effects:** Mutates `entity.state` (designed for Immer Draft<T>)

**Example:**

```typescript
import { produce } from "immer";
import { setEntityStateValue } from "@/components/game/domain/entity/entity-fns";

const newState = produce(gameState, (draft) => {
  const router = draft.entities.get("router-1");
  if (router) {
    setEntityStateValue(router, "dhcpEnabled", true);
    setEntityStateValue(router, "ipRangeStart", "192.168.1.100");
    setEntityStateValue(router, "ipRangeEnd", "192.168.1.200");
  }
});
```

#### `updateEntityState(entity: EntityData, updates: Record<string, unknown>): void`

Updates multiple state values at once. **Mutates in-place** (for use with Immer `produce()`).

**Parameters:**
- `entity: EntityData` - The entity data to mutate
- `updates: Record<string, unknown>` - Object with state updates

**Returns:** `void`

**Side Effects:** Mutates `entity.state`

**Example:**

```typescript
import { produce } from "immer";
import { updateEntityState } from "@/components/game/domain/entity/entity-fns";

const newState = produce(gameState, (draft) => {
  const pc = draft.entities.get("pc-1");
  if (pc) {
    updateEntityState(pc, {
      ipAddress: "192.168.1.150",
      gateway: "192.168.1.1",
      status: "connected",
    });
  }
});
```

#### `resetEntityState(entity: EntityData, initialState?: Record<string, unknown>): void`

Resets the entity state to initial values. **Mutates in-place** (for use with Immer `produce()`).

**Parameters:**
- `entity: EntityData` - The entity data to mutate
- `initialState?: Record<string, unknown>` - The initial state to reset to (defaults to empty object)

**Returns:** `void`

**Side Effects:** Mutates `entity.state`

**Example:**

```typescript
import { produce } from "immer";
import { resetEntityState } from "@/components/game/domain/entity/entity-fns";

const newState = produce(gameState, (draft) => {
  const router = draft.entities.get("router-1");
  if (router) {
    // Reset to empty state
    resetEntityState(router);

    // Or reset to specific initial state
    resetEntityState(router, {
      dhcpEnabled: false,
      ipRangeStart: "",
      ipRangeEnd: "",
    });
  }
});
```

### Cloning Functions

#### `cloneEntityData(entity: EntityData, newId: string): EntityData`

Clones an entity with a new ID. Creates a **deep copy** of the entity data.

**Parameters:**
- `entity: EntityData` - The entity data to clone
- `newId: string` - The ID for the cloned entity

**Returns:** `EntityData` - A new entity data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { cloneEntityData } from "@/components/game/domain/entity/entity-fns";

// Clone an existing PC to create a second PC
const pc1 = gameState.entities.get("pc-1");
const pc2 = cloneEntityData(pc1, "pc-2");

console.log(pc2.id); // "pc-2"
console.log(pc2.state); // Deep copy of pc1's state
```

#### `cloneItemData(item: ItemData, newId: string): ItemData`

Clones an item with a new ID. Creates a **deep copy** of the item data.

**Parameters:**
- `item: ItemData` - The item data to clone
- `newId: string` - The ID for the cloned item

**Returns:** `ItemData` - A new item data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { cloneItemData } from "@/components/game/domain/entity/entity-fns";

// Clone a cable to create multiple identical cables
const cable1 = itemInventory.find(i => i.id === "cable-1");
const cable2 = cloneItemData(cable1, "cable-2");
```

---

## Item Functions

Additional query functions specific to `ItemData`.

### `canPlaceIn(item: ItemData, placeId: string): boolean`

Checks if an item can be placed in a specific space.

**Parameters:**
- `item: ItemData` - The item data
- `placeId: string` - The ID of the space

**Returns:** `boolean` - True if the item can be placed there

**Example:**

```typescript
import { canPlaceIn } from "@/components/game/domain/entity/entity-fns";

const cable = gameState.entities.get("cable-1") as ItemData;
if (canPlaceIn(cable, "router-board")) {
  console.log("Cable can be placed on router board");
}
```

### `isDraggable(item: ItemData): boolean`

Checks if an item can be dragged.

**Returns:** `boolean` - True if the item is draggable

### `getItemTooltip(item: ItemData): ItemTooltip | undefined`

Gets the tooltip configuration for an item.

**Returns:** `ItemTooltip | undefined` - The tooltip configuration, or undefined

### `getItemIcon(item: ItemData): IconInfo | undefined`

Gets the icon for an item.

**Returns:** `IconInfo | undefined` - The icon configuration, or undefined

### `isInCategory(item: ItemData, category: string): boolean`

Checks if an item belongs to a specific category.

**Parameters:**
- `category: string` - The category to check

**Returns:** `boolean` - True if the item is in this category

---

## Space Functions

Functions for working with `SpaceData` (GridSpaceData and PoolSpaceData).

### Factory Functions

#### `createGridSpaceData(config: GridSpaceConfig): GridSpaceData`

Creates a new GridSpaceData object (e.g., network diagram, puzzle board).

**Parameters:**
- `config: GridSpaceConfig` - Grid space configuration

**Returns:** `GridSpaceData` - A new grid space data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { createGridSpaceData } from "@/components/game/domain/space/space-fns";

const routerBoard = createGridSpaceData({
  id: "router-board",
  name: "Router",
  maxCapacity: 3,
  metadata: {},
  rows: 1,
  cols: 1,
  metrics: "square",
  allowMultiplePerCell: false,
});
```

#### `createPoolSpaceData(config: PoolSpaceConfig): PoolSpaceData`

Creates a new PoolSpaceData object (e.g., inventory, item pool).

**Parameters:**
- `config: PoolSpaceConfig` - Pool space configuration

**Returns:** `PoolSpaceData` - A new pool space data object

**Side Effects:** None (pure)

**Example:**

```typescript
import { createPoolSpaceData } from "@/components/game/domain/space/space-fns";

const inventory = createPoolSpaceData({
  id: "inventory",
  name: "Available Items",
  maxCapacity: undefined, // Unlimited
  metadata: {},
  layout: "grid",
  columns: 3,
  allowReorder: true,
});
```

---

### Grid Space Functions

Functions for working with grid-based spaces (2D grids with row/column positioning).

#### `gridAdd(space: GridSpaceData, entityId: string, position: GridPosition): boolean`

Adds an entity to a grid space at the specified position. **Mutates in-place** (for use with Immer `produce()`).

**Parameters:**
- `space: GridSpaceData` - The grid space data to mutate
- `entityId: string` - The ID of the entity to add
- `position: GridPosition` - The grid position (row, col)

**Returns:** `boolean` - True if successfully added, false otherwise

**Side Effects:** Mutates `space.entityPositions`

**Validation:**
- Position must be within grid bounds
- Space must not exceed maxCapacity
- Cell must be unoccupied (unless `allowMultiplePerCell` is true)

**Example:**

```typescript
import { produce } from "immer";
import { gridAdd } from "@/components/game/domain/space/space-fns";

const newState = produce(gameState, (draft) => {
  const routerSpace = draft.spaces.get("router-board") as GridSpaceData;
  const success = gridAdd(routerSpace, "router-1", { row: 0, col: 0 });

  if (success) {
    console.log("Router added to board");
  } else {
    console.error("Failed to add router - position occupied or invalid");
  }
});
```

#### `gridRemove(space: GridSpaceData, entityId: string): boolean`

Removes an entity from a grid space. **Mutates in-place**.

**Parameters:**
- `space: GridSpaceData` - The grid space data to mutate
- `entityId: string` - The ID of the entity to remove

**Returns:** `boolean` - True if successfully removed, false if entity not found

**Side Effects:** Mutates `space.entityPositions`

**Example:**

```typescript
import { produce } from "immer";
import { gridRemove } from "@/components/game/domain/space/space-fns";

const newState = produce(gameState, (draft) => {
  const internetSpace = draft.spaces.get("internet") as GridSpaceData;
  gridRemove(internetSpace, "packet-1");
});
```

#### `gridContains(space: GridSpaceData, entityId: string): boolean`

Checks if a grid space contains an entity.

**Returns:** `boolean` - True if the entity is in the space

**Side Effects:** None (pure)

#### `gridGetPosition(space: GridSpaceData, entityId: string): GridPosition | undefined`

Gets the position of an entity in a grid space.

**Returns:** `GridPosition | undefined` - The entity's position, or undefined if not in the space

**Example:**

```typescript
import { gridGetPosition } from "@/components/game/domain/space/space-fns";

const position = gridGetPosition(routerSpace, "router-1");
if (position) {
  console.log(`Router is at row ${position.row}, col ${position.col}`);
}
```

#### `gridCanAccept(space: GridSpaceData, entityId: string, position: GridPosition): boolean`

Checks if a grid space can accept an entity at the specified position (validation without mutation).

**Returns:** `boolean` - True if the entity can be added at the position

**Example:**

```typescript
import { gridCanAccept } from "@/components/game/domain/space/space-fns";

if (gridCanAccept(internetSpace, "packet-2", { row: 1, col: 2 })) {
  // Safe to add packet
  dispatch({ type: "PLACE_ENTITY", payload: { spaceId: "internet", entityId: "packet-2", position: { row: 1, col: 2 } } });
}
```

#### `gridGetEntitiesAt(space: GridSpaceData, position: GridPosition): string[]`

Gets all entity IDs at a specific grid position.

**Returns:** `string[]` - Array of entity IDs at that position

#### `gridIsOccupied(space: GridSpaceData, position: GridPosition): boolean`

Checks if a position is occupied by any entity.

**Returns:** `boolean` - True if the position has at least one entity

#### `gridGetEmptyPositions(space: GridSpaceData): GridPosition[]`

Gets all empty positions in the grid.

**Returns:** `GridPosition[]` - Array of grid coordinates with no entities

#### `gridGetOccupiedPositions(space: GridSpaceData): GridPosition[]`

Gets all occupied positions in the grid.

**Returns:** `GridPosition[]` - Array of grid coordinates with at least one entity

#### `gridGetEntityCount(space: GridSpaceData): number`

Gets the number of entities in a grid space.

**Returns:** `number` - The entity count

#### `gridIsFull(space: GridSpaceData): boolean`

Checks if a grid space is at maximum capacity.

**Returns:** `boolean` - True if the space is full

#### `gridIsEmpty(space: GridSpaceData): boolean`

Checks if a grid space is empty.

**Returns:** `boolean` - True if the space contains no entities

---

### Pool Space Functions

Functions for working with pool-based spaces (list/array of entities with optional ordering).

#### `poolAdd(space: PoolSpaceData, entityId: string, index?: number): boolean`

Adds an entity to a pool space at the specified index. **Mutates in-place** (for use with Immer `produce()`).

**Parameters:**
- `space: PoolSpaceData` - The pool space data to mutate
- `entityId: string` - The ID of the entity to add
- `index?: number` - Optional index to insert at (defaults to end)

**Returns:** `boolean` - True if successfully added, false otherwise

**Side Effects:** Mutates `space.entityIds`

**Validation:**
- Space must not exceed maxCapacity

**Example:**

```typescript
import { produce } from "immer";
import { poolAdd } from "@/components/game/domain/space/space-fns";

const newState = produce(gameState, (draft) => {
  const inventory = draft.spaces.get("inventory") as PoolSpaceData;

  // Add to end of inventory
  poolAdd(inventory, "cable-1");

  // Add at specific index (beginning)
  poolAdd(inventory, "router-1", 0);
});
```

#### `poolRemove(space: PoolSpaceData, entityId: string): boolean`

Removes an entity from a pool space. **Mutates in-place**.

**Parameters:**
- `space: PoolSpaceData` - The pool space data to mutate
- `entityId: string` - The ID of the entity to remove

**Returns:** `boolean` - True if successfully removed, false if entity not found

**Side Effects:** Mutates `space.entityIds`

#### `poolContains(space: PoolSpaceData, entityId: string): boolean`

Checks if a pool space contains an entity.

**Returns:** `boolean` - True if the entity is in the space

#### `poolGetEntityCount(space: PoolSpaceData): number`

Gets the number of entities in a pool space.

**Returns:** `number` - The entity count

#### `poolIsFull(space: PoolSpaceData): boolean`

Checks if a pool space is at maximum capacity.

**Returns:** `boolean` - True if the space is full

#### `poolIsEmpty(space: PoolSpaceData): boolean`

Checks if a pool space is empty.

**Returns:** `boolean` - True if the space contains no entities

---

### Polymorphic Space Functions

Functions that work with any `SpaceData` type (Grid or Pool) using discriminated union pattern.

#### `spaceContains(space: SpaceData, entityId: string): boolean`

Checks if a space contains an entity (polymorphic - works with both Grid and Pool).

**Parameters:**
- `space: SpaceData` - The space data (Grid or Pool)
- `entityId: string` - The ID of the entity to check for

**Returns:** `boolean` - True if the entity is in the space

**Side Effects:** None (pure)

**Example:**

```typescript
import { spaceContains } from "@/components/game/domain/space/space-fns";

// Works with any space type
const inInventory = spaceContains(inventorySpace, "cable-1"); // PoolSpace
const onBoard = spaceContains(routerBoard, "router-1"); // GridSpace
```

#### `spaceRemove(space: SpaceData, entityId: string): boolean`

Removes an entity from a space (polymorphic). **Mutates in-place**.

**Example:**

```typescript
import { produce } from "immer";
import { spaceRemove } from "@/components/game/domain/space/space-fns";

const newState = produce(gameState, (draft) => {
  const space = draft.spaces.get(spaceId); // Could be Grid or Pool
  if (space) {
    spaceRemove(space, entityId); // Works for both types
  }
});
```

#### `spaceGetEntityCount(space: SpaceData): number`

Gets the number of entities in a space (polymorphic).

#### `spaceIsFull(space: SpaceData): boolean`

Checks if a space is at maximum capacity (polymorphic).

#### `spaceIsEmpty(space: SpaceData): boolean`

Checks if a space is empty (polymorphic).

---

## Geometry Functions

Pure functions for coordinate calculations and geometric operations.

### Point Functions

#### `createPoint(x: number, y: number): Point2D`

Creates a Point2D from x and y coordinates.

#### `pointsEqual(a: Point2D, b: Point2D): boolean`

Checks if two points are equal.

#### `distance(a: Point2D, b: Point2D): number`

Calculates the Euclidean distance between two points.

**Example:**

```typescript
import { distance, createPoint } from "@/components/game/infrastructure/geometry/coordinates";

const point1 = createPoint(0, 0);
const point2 = createPoint(3, 4);
const dist = distance(point1, point2); // 5.0
```

#### `addPoints(a: Point2D, b: Point2D): Point2D`

Adds two points together (vector addition).

#### `subtractPoints(a: Point2D, b: Point2D): Point2D`

Subtracts point b from point a (vector subtraction).

#### `scalePoint(p: Point2D, factor: number): Point2D`

Scales a point by a factor (scalar multiplication).

### Grid Functions

#### `createGridCoord(row: number, col: number): GridCoordinate`

Creates a GridCoordinate from row and column indices.

#### `gridCoordsEqual(a: GridCoordinate, b: GridCoordinate): boolean`

Checks if two grid coordinates are equal.

#### `manhattanDistance(a: GridCoordinate, b: GridCoordinate): number`

Calculates the Manhattan distance between two grid coordinates.

**Example:**

```typescript
import { manhattanDistance, createGridCoord } from "@/components/game/infrastructure/geometry/coordinates";

const coord1 = createGridCoord(0, 0);
const coord2 = createGridCoord(2, 3);
const dist = manhattanDistance(coord1, coord2); // 5 (2 + 3)
```

#### `isInBounds(coord: GridCoordinate, rows: number, cols: number): boolean`

Checks if a grid coordinate is within bounds.

**Parameters:**
- `coord: GridCoordinate` - The coordinate to check
- `rows: number` - Number of rows in the grid
- `cols: number` - Number of columns in the grid

**Returns:** `boolean` - True if coordinate is within bounds

**Example:**

```typescript
import { isInBounds } from "@/components/game/infrastructure/geometry/coordinates";

const valid = isInBounds({ row: 1, col: 2 }, 3, 3); // true
const invalid = isInBounds({ row: 5, col: 2 }, 3, 3); // false
```

### Utility Functions

#### `clamp(value: number, min: number, max: number): number`

Clamps a value between min and max.

#### `clampPoint(point: Point2D, minX: number, minY: number, maxX: number, maxY: number): Point2D`

Clamps a point within a rectangular boundary.

#### `snapToGrid(value: number, gridSize: number, offset?: number): number`

Snaps a value to the nearest grid step.

#### `snapPointToGrid(point: Point2D, gridWidth: number, gridHeight: number, offsetX?: number, offsetY?: number): Point2D`

Snaps a point to the nearest grid position.

---

## Function Composition Patterns

Pure functions shine when composed together to create complex behaviors.

### Pattern 1: Query Composition

Combine multiple queries to check complex conditions:

```typescript
import { gridContains, gridGetPosition, gridIsOccupied } from "@/components/game/domain/space/space-fns";
import { getEntityStateValue } from "@/components/game/domain/entity/entity-fns";

// Check if router is on board and configured
const isRouterReady = (gameState: GameState): boolean => {
  const routerSpace = gameState.spaces.get("router-board") as GridSpaceData;
  const router = gameState.entities.get("router-1");

  if (!router || !routerSpace) return false;

  const isPlaced = gridContains(routerSpace, "router-1");
  const isDhcpEnabled = getEntityStateValue<boolean>(router, "dhcpEnabled");

  return isPlaced && isDhcpEnabled === true;
};
```

### Pattern 2: Validation Chain

Chain validation functions to ensure state correctness:

```typescript
import { gridCanAccept, gridIsFull } from "@/components/game/domain/space/space-fns";
import { canPlaceIn } from "@/components/game/domain/entity/entity-fns";

// Check if item can be placed on a specific space at a specific position
const canPlaceItemAt = (
  item: ItemData,
  space: GridSpaceData,
  position: GridPosition
): boolean => {
  // 1. Item must allow this space
  if (!canPlaceIn(item, space.id)) {
    return false;
  }

  // 2. Space must not be full
  if (gridIsFull(space)) {
    return false;
  }

  // 3. Position must be valid
  if (!gridCanAccept(space, item.id, position)) {
    return false;
  }

  return true;
};
```

### Pattern 3: Data Transformation Pipeline

Transform data through a series of pure functions:

```typescript
import { cloneEntityData, updateEntityState } from "@/components/game/domain/entity/entity-fns";
import { createGridCoord, isInBounds } from "@/components/game/infrastructure/geometry/coordinates";

// Create multiple configured entities from a template
const createConfiguredEntities = (
  template: EntityData,
  configs: Array<{ id: string; state: Record<string, unknown> }>
): EntityData[] => {
  return configs.map(({ id, state }) => {
    // Clone template
    const entity = cloneEntityData(template, id);

    // Apply configuration (using Immer would be better for real use)
    entity.state = { ...entity.state, ...state };

    return entity;
  });
};
```

### Pattern 4: Reducer Helper Functions

Use pure functions inside reducers for cleaner code:

```typescript
import { produce } from "immer";
import { gridAdd, gridRemove } from "@/components/game/domain/space/space-fns";

// Reducer action handler
const handleMoveEntity = (
  state: GameState,
  action: { fromSpace: string; toSpace: string; entityId: string; position: GridPosition }
): GameState => {
  return produce(state, (draft) => {
    const fromSpace = draft.spaces.get(action.fromSpace) as GridSpaceData;
    const toSpace = draft.spaces.get(action.toSpace) as GridSpaceData;

    if (!fromSpace || !toSpace) return;

    // Remove from source
    gridRemove(fromSpace, action.entityId);

    // Add to destination
    gridAdd(toSpace, action.entityId, action.position);
  });
};
```

### Pattern 5: Polymorphic Operations

Use polymorphic functions for code reuse across space types:

```typescript
import { spaceContains, spaceRemove, spaceGetEntityCount } from "@/components/game/domain/space/space-fns";

// Transfer entity between any two spaces (Grid or Pool)
const transferEntity = (
  fromSpace: SpaceData,
  toSpace: SpaceData,
  entityId: string
): boolean => {
  // Works regardless of space type!
  if (!spaceContains(fromSpace, entityId)) {
    return false;
  }

  // Remove from source (polymorphic)
  spaceRemove(fromSpace, entityId);

  // Add to destination (type-specific logic would go here)
  // ... (requires type checking for position in Grid case)

  return true;
};
```

---

## Pure Functions vs Reducers

### When to Use Pure Functions

Use **pure functions** when:

1. **Reading data**: Query state without modification
2. **Creating new data structures**: Factory functions
3. **Inside reducers**: For mutation operations with Immer
4. **Validation**: Check conditions before state changes
5. **Calculations**: Compute derived values

**Example:**

```typescript
// ✅ Pure function: reading and validating
const isConnectionValid = (gameState: GameState): boolean => {
  const routerSpace = gameState.spaces.get("router-board") as GridSpaceData;
  return gridContains(routerSpace, "router-1") && gridContains(routerSpace, "cable-1");
};
```

### When to Use Reducers

Use **reducers** when:

1. **Dispatching actions**: State changes triggered by user/system events
2. **Complex state transitions**: Multiple related changes
3. **Event emission**: Need to emit events to event queue
4. **Cross-cutting concerns**: Sequence updates, phase transitions
5. **Side effects** (in combination with middleware/engines)

**Example:**

```typescript
// ✅ Reducer: handles action, emits events, updates state
const spaceReducer = (state: GameState, action: SpaceAction): GameState => {
  switch (action.type) {
    case "ADD_ENTITY_TO_SPACE": {
      return produce(state, (draft) => {
        const space = draft.spaces.get(action.payload.spaceId) as GridSpaceData;
        const entity = draft.entities.get(action.payload.entityId);

        if (!space || !entity) return;

        // Use pure function inside reducer
        const success = gridAdd(space, action.payload.entityId, action.payload.position);

        if (success) {
          // Emit event (reducer responsibility)
          draft.eventQueue.events.push({
            type: "ENTITY_ENTERED_SPACE",
            entityId: action.payload.entityId,
            spaceId: action.payload.spaceId,
            timestamp: Date.now(),
          });

          // Update sequence (cross-cutting concern)
          draft.sequence += 1;
        }
      });
    }
  }
};
```

### Decision Tree

```
Need to change game state?
├─ Yes → Use Reducer + Pure Functions
│   ├─ Dispatch action
│   ├─ Reducer calls pure functions (gridAdd, setEntityStateValue, etc.)
│   └─ Reducer emits events, updates sequence
│
└─ No → Use Pure Functions Only
    ├─ Query state (getEntityStateValue, gridContains, etc.)
    ├─ Validate (canPlaceIn, gridCanAccept, etc.)
    └─ Calculate (distance, manhattanDistance, etc.)
```

---

## Best Practices

### ✅ DO

1. **Use pure functions for all queries**
   ```typescript
   const dhcpEnabled = getEntityStateValue<boolean>(router, "dhcpEnabled");
   ```

2. **Use pure functions inside Immer produce()**
   ```typescript
   produce(state, draft => {
     setEntityStateValue(draft.entities.get(id), "status", "active");
   });
   ```

3. **Compose functions for complex logic**
   ```typescript
   const isReady = isPlaced(entity) && isConfigured(entity) && isConnected(entity);
   ```

4. **Use type parameters for type safety**
   ```typescript
   const value = getEntityStateValue<string>(entity, "ipAddress");
   ```

### ❌ DON'T

1. **Don't mutate without Immer**
   ```typescript
   // ❌ BAD: Direct mutation breaks immutability
   setEntityStateValue(entity, "status", "active");
   ```

2. **Don't skip validation**
   ```typescript
   // ❌ BAD: No validation before adding
   gridAdd(space, entityId, position);

   // ✅ GOOD: Validate first
   if (gridCanAccept(space, entityId, position)) {
     gridAdd(space, entityId, position);
   }
   ```

3. **Don't use reducers for simple queries**
   ```typescript
   // ❌ BAD: Dispatch for read-only query
   dispatch({ type: "GET_ENTITY_STATE", payload: { entityId, key } });

   // ✅ GOOD: Direct query
   const value = getEntityStateValue(entity, key);
   ```

4. **Don't mix concerns**
   ```typescript
   // ❌ BAD: Pure function with side effects
   const addEntity = (space, entity) => {
     gridAdd(space, entity.id, { row: 0, col: 0 });
     console.log("Added!"); // Side effect!
     fetch("/api/log"); // Side effect!
   };

   // ✅ GOOD: Pure function only
   const addEntity = (space, entity, position) => {
     return gridAdd(space, entity.id, position);
   };
   ```

---

## See Also

- [08-api-contract.md](./08-api-contract.md) - Complete API contracts and guarantees
- [12-immer-integration.md](./12-immer-integration.md) - Immer.js integration patterns
- [13-type-reference.md](./13-type-reference.md) - Complete type system reference
- [03-state-management.md](./03-state-management.md) - State management patterns
- [04-actions-api.md](./04-actions-api.md) - Action and reducer reference
