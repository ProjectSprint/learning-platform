# Space/Entity Architecture

## Overview

The Space/Entity architecture is the core design pattern for organizing game objects in the learning platform. It replaces the legacy puzzle/board/inventory system with a flexible, extensible model based on **plain data types and pure functions**.

## Core Concepts

### Entity (Data-First Approach)

An **Entity** is plain data representing any interactive game object - items, devices, packets, or characters.

```typescript
import { createEntityData } from "@/components/game/domain/entity";

const router = createEntityData({
  id: "router-1",
  type: "router",
  name: "Router A",
  visual: { icon: "router-icon", color: "blue" },
  data: { ports: 4, configured: false },
  state: { active: false },
});
```

**Key Properties:**
- `id`: Unique identifier
- `type`: Entity type (router, packet, cable, etc.)
- `name`: Optional display name
- `visual`: Rendering properties (icon, color, size)
- `data`: Static entity data
- `state`: Dynamic runtime state

### Space (Discriminated Union Pattern)

A **Space** is a discriminated union of plain data types that represent different container layouts.

```typescript
type SpaceData = GridSpaceData | PoolSpaceData;

interface GridSpaceData {
  kind: "grid";          // Discriminator
  id: string;
  layout: {
    size: { rows: number; cols: number };
    cellSize: { width: number; height: number };
    gap: { x: number; y: number };
  };
  maxCapacity?: number;
  allowMultiplePerCell?: boolean;
  occupied: Record<string, string[]>; // position -> entity IDs
}

interface PoolSpaceData {
  kind: "pool";          // Discriminator
  id: string;
  layout: {
    type: "horizontal-wrap" | "vertical";
    gap: number;
  };
  maxCapacity?: number;
  entityIds: string[];
}
```

**Types of Spaces:**
- **GridSpaceData**: 2D grid layout (e.g., network diagrams, circuit boards)
- **PoolSpaceData**: Unordered collection (e.g., inventory, toolbox)

## Architecture Layers

```
┌─────────────────────────────────────────┐
│   Presentation Layer                    │
│   (React Components)                     │
│   - GridSpaceView                        │
│   - PoolSpaceView                        │
│   - EntityCard                           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Application Layer                      │
│   (State Management)                     │
│   - useSpace, useEntity hooks            │
│   - Redux reducers (Immer)               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Domain Layer                           │
│   (Plain Data + Pure Functions)          │
│   - SpaceData, EntityData                │
│   - gridAdd, poolAdd, etc.               │
│   - Type guards (isGridSpace, etc.)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Infrastructure Layer                   │
│   (Low-level Primitives)                 │
│   - Grid position utilities              │
│   - Coordinate calculations              │
└─────────────────────────────────────────┘
```

## Folder Organization

The Space/Entity system is organized across the architecture layers:

```
src/components/game/
├── domain/                    # Plain Data + Pure Functions
│   ├── entity/               # Entity types and functions
│   │   ├── entity-data.ts    # Entity types (EntityData, ItemData)
│   │   └── entity-fns.ts     # Entity functions (create, update, clone)
│   ├── space/                # Space types and functions
│   │   ├── space-data.ts     # Space types (GridSpaceData, PoolSpaceData)
│   │   └── space-fns.ts      # Space functions (gridAdd, poolAdd, etc.)
│   ├── behavior/             # Entity behavior systems
│   ├── question/             # Question specifications (AST, evaluation)
│   └── validation/           # Business rules (sanitization, normalization)
│
├── infrastructure/            # Low-Level Primitives
│   └── grid/                 # Grid mathematics
│
├── application/               # State Management
│   ├── state/                # Redux actions and reducers
│   ├── hooks/                # React hooks (useSpace, useEntity)
│   └── actions/              # Action dispatchers
│
├── presentation/              # UI Components
│   ├── space/                # Space view components
│   ├── entity/               # Entity view components
│   ├── terminal/             # Terminal UI
│   ├── hint/                 # Hint system UI
│   └── modal/                # Modal dialogs
│
├── ui/                        # Shared UI Widgets
├── core/                      # Foundation & Types
└── engines/                   # Specialized Mechanics
    ├── terminal/             # Terminal command processing
    └── drag/                 # Drag-and-drop engine
```

**Key Points:**
- **Domain layer** contains plain data types and pure functions
- **Presentation layer** contains React components
- **Application layer** connects UI to domain through hooks and reducers
- Each layer has clear unidirectional dependencies

## GridSpace Example

### Creating GridSpaceData

```typescript
import { createGridSpaceData } from "@/components/game/domain/space";

const networkSpace = createGridSpaceData({
  id: "network-diagram",
  layout: {
    size: { rows: 4, cols: 6 },
    cellSize: { width: 64, height: 64 },
    gap: { x: 4, y: 4 },
  },
  maxCapacity: 20,
  allowMultiplePerCell: false,
});
```

### Adding Entities

Inside Immer reducer or mutator:

```typescript
import { gridAdd } from "@/components/game/domain/space";

// in reducer (Immer draft)
gridAdd(draft.spaces["network-diagram"], "router-1", { row: 0, col: 0 });
```

### Querying Entities

```typescript
import { gridContains, gridGetPosition, gridGetEntitiesAt } from "@/components/game/domain/space";

// Check if entity exists
if (gridContains(networkSpace, "router-1")) {
  // Get entity position
  const pos = gridGetPosition(networkSpace, "router-1");
  // { row: 0, col: 0 }

  // Get entities at a position
  const entities = gridGetEntitiesAt(networkSpace, { row: 0, col: 0 });
}
```

## PoolSpace Example

### Creating PoolSpaceData

```typescript
import { createPoolSpaceData } from "@/components/game/domain/space";

const inventory = createPoolSpaceData({
  id: "inventory",
  layout: { type: "horizontal-wrap", gap: 8 },
  maxCapacity: 50,
});
```

### Operations

```typescript
import { poolAdd, poolRemove, spaceGetEntityCount } from "@/components/game/domain/space";

// Add without position (pool has no positions)
poolAdd(inventory, "cable-id");

// Remove
poolRemove(inventory, "cable-id");

// Get all entity IDs
const entityIds = inventory.entityIds;

// Get count
const count = spaceGetEntityCount(inventory);
```

## Type Guards and Polymorphism

The FP model uses type guards for discriminated union handling:

```typescript
import { isGridSpace, isPoolSpace } from "@/components/game/domain/space";

function printSpaceInfo(space: SpaceData) {
  if (isGridSpace(space)) {
    console.log(`Grid: ${space.layout.size.rows}x${space.layout.size.cols}`);
  } else if (isPoolSpace(space)) {
    console.log(`Pool: ${space.entityIds.length} items`);
  }
}

// Polymorphic functions work on any space
import { spaceContains, spaceIsFull } from "@/components/game/domain/space";

spaceContains(anySpace, "entity-id");  // Works for both grid and pool
```

## State Management Integration

### Using in Components

```typescript
import { useSpace, useGameDispatch } from "@/components/game/game-provider";
import { gridAdd } from "@/components/game/domain/space";

function NetworkQuestion() {
  const space = useSpace("network-diagram");
  const dispatch = useGameDispatch();

  const handleDrop = (entityId: string, position: { row: number; col: number }) => {
    dispatch({
      type: "ADD_ENTITY_TO_SPACE",
      payload: { spaceId: space.id, entityId, position },
    });
  };

  return (
    <GridSpaceView
      space={space}
      onEntityDrop={handleDrop}
    />
  );
}
```

### Reducer with Immer

```typescript
import { produce } from "immer";
import { gridAdd } from "@/components/game/domain/space";

const applicationReducer = produce((draft: GameState, action: Action) => {
  switch (action.type) {
    case "ADD_ENTITY_TO_SPACE": {
      const { spaceId, entityId, position } = action.payload;
      const space = draft.spaces[spaceId];

      if (space && isGridSpace(space)) {
        // gridAdd mutates the draft in-place
        gridAdd(space, entityId, position);
      }
      break;
    }
  }
});
```

## Design Principles

### 1. Data-First, Functions-Second

All state is plain data. Functions operate on data:

```typescript
// ✅ FP approach - data + function
const space = createGridSpaceData({ /* ... */ });
const updatedSpace = gridAdd(space, "entity-1", position);
```

### 2. Pure Functions in Domain Layer

Domain functions are pure (no side effects). Mutation only happens in Immer reducers:

```typescript
// ✅ Pure - returns new object
const newData = updateEntityState(entity, "active", true);

// Mutates in-place (inside Immer draft)
updateEntityState(draft.entities[id], "active", true);
```

### 3. Discriminated Union Type Safety

Type guards ensure compile-time type safety:

```typescript
function handleSpace(space: SpaceData) {
  if (isGridSpace(space)) {
    // TypeScript knows this is GridSpaceData
    gridAdd(space, entityId, position);  // ✅ Type safe
  }
}
```

### 4. Separation of Concerns

- **Domain**: Plain data + pure functions (business rules, type guards)
- **Infrastructure**: Grid math, coordinates, pixel calculations
- **Presentation**: Rendering, interactions, drag-and-drop
- **Application**: State management (Immer reducers), hooks

## Benefits Over Legacy System

| Legacy (OOP Classes) | New (FP Data + Functions) |
|----------------------|---------------------------|
| Classes with methods | Plain data + pure functions |
| `new GridSpace()` mutation | `createGridSpaceData()` factory |
| `space.add()` method | `gridAdd(space, ...)` function |
| Complex inheritance | Discriminated unions |
| Hard to test | Pure functions easy to test |
| Map-based state | Record-based state (better serialization) |

## Benefits Over Legacy System

| Legacy (Puzzle/Board) | New (Space/Entity FP) |
|-----------------------|-----------------------|
| Hardcoded for grids | Flexible data types |
| Tightly coupled UI | Clear layer separation |
| Difficult to test | Pure functions, easy to test |
| Limited to one puzzle | Multiple spaces per question |
| Complex state management | Simple, composable state |

## Migration from OOP

The old OOP class-based architecture has been completely migrated to FP:

**Old (OOP):**
```typescript
const space = new GridSpace({ id: "...", rows: 4, cols: 6 });
space.add(entity, position);
const pos = space.getPosition(entityId);
```

**New (FP):**
```typescript
const space = createGridSpaceData({ id: "...", layout: { size: { rows: 4, cols: 6 }, ... } });
gridAdd(space, entityId, position);
const pos = gridGetPosition(space, entityId);
```

For adding new space types, see [Adding New Spaces](./10-adding-new-spaces.md).

## See Also

- [Core Concepts](./02-core-concepts.md)
- [State Management](./03-state-management.md)
- [Adding New Spaces](./10-adding-new-spaces.md)