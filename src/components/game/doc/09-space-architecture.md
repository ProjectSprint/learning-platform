# Space/Entity Architecture

## Overview

The Space/Entity architecture is the core design pattern for organizing game objects in the learning platform. It replaces the legacy puzzle/board/inventory system with a flexible, extensible model.

## Core Concepts

### Entity

An **Entity** is any interactive game object - items, devices, packets, or characters.

```typescript
const router = new Entity({
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

### Space

A **Space** is a container that organizes entities with positional or structural constraints.

**Types of Spaces:**
- **GridSpace**: 2D grid layout (e.g., network diagrams, circuit boards)
- **PoolSpace**: Unordered collection (e.g., inventory, toolbox)
- **QueueSpace**: Sequential ordering (future: packet queues)
- **PathSpace**: Network/graph structure (future: routing paths)

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
│   - Space Actions/Reducers               │
│   - Entity Actions/Reducers              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Domain Layer                           │
│   (Business Logic)                       │
│   - Space (abstract)                     │
│   - GridSpace, PoolSpace                 │
│   - Entity                               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Infrastructure Layer                   │
│   (Low-level Primitives)                 │
│   - SquareGrid, HexGrid                  │
│   - GridCell, GridCoordinate             │
└─────────────────────────────────────────┘
```

## Folder Organization

The Space/Entity system is organized across the architecture layers:

```
src/components/game/
├── domain/                    # Business Logic Layer
│   ├── entity/               # Entity models and behaviors
│   ├── space/                # Space types (GridSpace, PoolSpace, etc.)
│   ├── behavior/             # Entity behavior systems
│   ├── question/             # Question specifications (AST, evaluation)
│   └── validation/           # Business rules (sanitization, normalization)
│
├── infrastructure/            # Low-Level Primitives
│   └── grid/                 # Grid mathematics (SquareGrid, HexGrid)
│
├── application/               # State Management
│   ├── state/                # Redux actions and reducers
│   ├── hooks/                # React hooks (useSpace, useEntity)
│   └── actions/              # Action dispatchers (arrows, etc.)
│
├── presentation/              # UI Components
│   ├── space/                # Space view components (GridSpaceView, PoolSpaceView)
│   ├── entity/               # Entity view components (EntityCard)
│   ├── terminal/             # Terminal UI (input, layout, view)
│   ├── hint/                 # Hint system UI (contextual hints)
│   └── modal/                # Modal dialogs (forms, validation)
│
├── ui/                        # Shared UI Widgets
│   └── help/                 # Help components (HelpLink, InfoTooltip)
│
├── core/                      # Foundation
│   └── types/                # Type definitions
│
└── engines/                   # Specialized Mechanics
    ├── terminal/             # Terminal command processing
    └── drag/                 # Drag-and-drop engine
```

**Key Points:**
- **Domain layer** contains all business logic, including question specs and validation rules
- **Presentation layer** contains all UI components, including terminal, hints, and modals
- **Application layer** connects UI to domain through state management
- Each layer has a clear responsibility and follows unidirectional dependencies

For a complete guide on where to place new code, see [Architecture Quick Reference](../ARCHITECTURE.md).

## GridSpace Example

### Creating a GridSpace

```typescript
import { GridSpace } from "@/components/game/domain/space";
import { Entity } from "@/components/game/domain/entity";

const networkSpace = new GridSpace({
  id: "network-diagram",
  rows: 4,
  cols: 6,
  metrics: {
    cellWidth: 64,
    cellHeight: 64,
    gapX: 4,
    gapY: 4,
  },
  maxCapacity: 20,
  allowMultiplePerCell: false,
});
```

### Adding Entities

```typescript
const router = new Entity({
  id: "router-1",
  type: "router",
});

networkSpace.add(router, { row: 0, col: 0 });
```

### Querying Entities

```typescript
// Check if entity exists
if (networkSpace.contains("router-1")) {
  // Get entity position
  const pos = networkSpace.getPosition("router-1");
  // { row: 0, col: 0 }

  // Get entities at a position
  const entities = networkSpace.getEntitiesAt({ row: 0, col: 0 });
}
```

## PoolSpace Example

### Creating a PoolSpace

```typescript
import { PoolSpace } from "@/components/game/domain/space";

const inventory = new PoolSpace({
  id: "inventory",
  layout: { type: "horizontal-wrap", gap: 8 },
  maxCapacity: 50,
});
```

### Operations

```typescript
// Add without position
inventory.add(cable);

// Remove
inventory.remove(cable.id);

// Get all entities
const items = inventory.getAllEntities();
```

## State Management Integration

### Redux Actions

```typescript
import { spaceAddEntity } from "@/components/game/application/state/actions";

dispatch(spaceAddEntity({
  spaceId: "network-diagram",
  entity: router,
  position: { row: 1, col: 2 },
}));
```

### Using in Components

```typescript
import { useSpace } from "@/components/game/hooks";

function NetworkQuestion() {
  const space = useSpace("network-diagram");

  return (
    <GridSpaceView
      space={space}
      onEntityDrop={(entity, position) => {
        dispatch(spaceAddEntity({ spaceId: space.id, entity, position }));
      }}
    />
  );
}
```

## Design Principles

### 1. Composition Over Inheritance

GridSpace *has-a* SquareGrid, not *is-a* SquareGrid. This allows flexible grid implementations.

### 2. Immutability

All Space and Entity operations return new instances. State changes are explicit.

```typescript
const updated = space.add(entity, position); // New instance
// Original space unchanged
```

### 3. Type Safety

Strong TypeScript types prevent invalid operations:

```typescript
type GridPosition = { row: number; col: number };
type PoolPosition = undefined; // No position in pool

space.add(entity, position); // Type-checked per space type
```

### 4. Separation of Concerns

- **Domain**: Business rules (capacity limits, placement rules)
- **Infrastructure**: Grid math, coordinates, pixel calculations
- **Presentation**: Rendering, interactions, drag-and-drop
- **Application**: State management, persistence

## Benefits Over Legacy System

| Legacy (Puzzle/Board) | New (Space/Entity) |
|-----------------------|---------------------|
| Hardcoded for grids | Flexible space types |
| Tightly coupled UI | Clear layer separation |
| Difficult to test | Pure functions, easy to test |
| Limited to one puzzle | Multiple spaces per question |
| Complex state management | Simple, composable state |

## Migration Path

For migrating existing questions, see [Adding New Spaces](./10-adding-new-spaces.md).

## See Also

- [Core Concepts](./02-core-concepts.md)
- [State Management](./03-state-management.md)
- [Adding New Spaces](./10-adding-new-spaces.md)
