# Game Engine Architecture

## Layered Architecture

The engine follows a **4-layer functional architecture** with strict unidirectional dependencies:

```
┌─────────────────────────────────────┐
│      presentation/  (React UI)      │  ← Components, views, drag overlays
├─────────────────────────────────────┤
│     application/  (Orchestration)   │  ← Hooks, reducers, state management
├─────────────────────────────────────┤
│      domain/  (Business Logic)      │  ← Pure functions, entities, spaces
├─────────────────────────────────────┤
│   infrastructure/  (Foundation)     │  ← Grid math, geometry, coordinates
└─────────────────────────────────────┘

Dependencies flow DOWN only (presentation → application → domain → infrastructure)
NEVER import upward (e.g., domain cannot import from application)
```

## Layer Responsibilities

### Infrastructure (Lowest Layer)

**Purpose:** Reusable, domain-agnostic utilities

**Contains:**
- Grid systems (square, hex, radial)
- Geometry (coordinates, distance, bounds checking)
- Pure mathematical operations

**Example:**
```typescript
// infrastructure/geometry/coordinates.ts
export const isInBounds = (coord: GridCoordinate, rows: number, cols: number): boolean => {
  return coord.row >= 0 && coord.row < rows && coord.col >= 0 && coord.col < cols;
};
```

**Rules:**
- ✅ No business logic
- ✅ No dependencies on domain
- ✅ Fully reusable

---

### Domain (Business Logic Layer)

**Purpose:** Game rules, entities, validation - the "what"

**Contains:**
- Entity data types (`EntityData`, `ItemData`)
- Space data types (`GridSpaceData`, `PoolSpaceData`)
- Pure functions (`entity-fns.ts`, `space-fns.ts`)
- Validation rules

**Example:**
```typescript
// domain/space/space-fns.ts
export const gridAdd = (
  space: GridSpaceData,
  entityId: string,
  position: GridPosition
): boolean => {
  if (!isInBounds(position, space.rows, space.cols)) return false;
  // ... validation and mutation
  space.entityPositions[entityId] = position;
  return true;
};
```

**Rules:**
- ✅ Pure functions only
- ✅ Plain data types (no classes)
- ✅ No React code
- ✅ No UI concerns
- ✅ Can import from infrastructure

---

### Application (Orchestration Layer)

**Purpose:** Connect UI to domain, manage state - the "how"

**Contains:**
- React hooks (`useGameState`, `useGameDispatch`, `useSpace`, `useEntity`)
- Reducers (action → state transformation)
- Actions (user intent declarations)
- Event queue management

**Example:**
```typescript
// application/state/reducers/space.ts
export const spaceReducer = (state: GameState, action: SpaceAction): GameState => {
  return produce(state, (draft) => {
    const space = draft.spaces[action.payload.spaceId];
    const success = gridAdd(space, entityId, position); // ← calls domain function

    if (success) {
      draft.eventQueue.events.push({ type: "ENTITY_ENTERED_SPACE", ... });
      draft.sequence += 1;
    }
  });
};
```

**Rules:**
- ✅ Uses Immer for state updates
- ✅ Calls domain pure functions
- ✅ Emits events
- ✅ No UI rendering
- ✅ Can import from domain and infrastructure

---

### Presentation (UI Layer)

**Purpose:** Render state, handle user input - the "view"

**Contains:**
- React components (`GridSpaceView`, `PoolSpaceView`, `EntityCard`)
- Terminal UI (`TerminalView`, input handling)
- Modal UI (`Modal`, form dialogs)
- Drag-and-drop overlays

**Example:**
```typescript
// presentation/space/GridSpaceView.tsx
export const GridSpaceView = ({ space }: Props) => {
  const dispatch = useGameDispatch();

  const handleDrop = (entityId: string, position: GridPosition) => {
    dispatch({
      type: "ADD_ENTITY_TO_SPACE",
      payload: { spaceId: space.id, entityId, position }
    });
  };

  return <Grid>{/* render cells */}</Grid>;
};
```

**Rules:**
- ✅ Thin components (rendering only)
- ✅ Dispatch actions, don't manipulate state
- ✅ No business logic
- ✅ Can import from all lower layers

---

## FP Decision Tree

### "Should I write a pure function or a reducer?"

```
┌─ Need to change game state?
│
├─ YES → Write a REDUCER (in application/)
│   │
│   ├─ Reducer receives action
│   ├─ Calls pure functions from domain/
│   ├─ Updates state with Immer
│   ├─ Emits events
│   └─ Returns new state
│
└─ NO → Write a PURE FUNCTION (in domain/)
    │
    ├─ Query state (getEntityStateValue)
    ├─ Validate (gridCanAccept)
    ├─ Calculate (distance, manhattanDistance)
    └─ Transform data (cloneEntityData)
```

### "Where does my code go?"

| I'm adding... | Layer | Directory | Example |
|---------------|-------|-----------|---------|
| New entity type | Domain | `domain/entity/` | Router, Packet |
| New space type | Domain | `domain/space/` | QueueSpace |
| Grid math | Infrastructure | `infrastructure/geometry/` | `snapToGrid()` |
| Pure function | Domain | `domain/entity-fns.ts` | `setEntityStateValue()` |
| React component | Presentation | `presentation/space/` | `GridSpaceView` |
| Action type | Application | `application/state/actions/` | `ADD_ENTITY` |
| Reducer logic | Application | `application/state/reducers/` | `spaceReducer` |
| React hook | Application | `application/hooks/` | `useSpace` |
| Terminal command | Engines | `engines/terminal/` | Command processor |

---

## Unidirectional Data Flow

### User Action → State Update → Re-render

```
1. User clicks entity
          ↓
2. Component dispatches action
   dispatch({ type: "ADD_ENTITY_TO_SPACE", payload: {...} })
          ↓
3. Reducer receives action
   spaceReducer(state, action)
          ↓
4. Reducer calls domain pure function
   gridAdd(space, entityId, position)
          ↓
5. Pure function validates & mutates (in Immer draft)
   - isInBounds() check
   - Capacity check
   - Occupancy check
   - Mutate entityPositions
          ↓
6. Reducer emits event
   draft.eventQueue.events.push({ type: "ENTITY_ENTERED_SPACE", ... })
          ↓
7. Reducer returns new state
   return produce(state, draft => {...})
          ↓
8. React re-renders components
   useGameState() returns new state
```

**Key:** State changes flow in ONE direction only. Never mutate state directly!

---

## Why Functional?

### Plain Data Types (No Classes)

**❌ Old (OOP):**
```typescript
class Entity {
  private state: Record<string, unknown> = {};

  setState(key: string, value: unknown) {
    this.state[key] = value; // Mutable!
  }
}
```

**✅ New (FP):**
```typescript
type EntityData = {
  id: string;
  state: Record<string, unknown>;
};

const setEntityStateValue = (entity: EntityData, key: string, value: unknown): void => {
  entity.state[key] = value; // Only in Immer produce()!
};
```

**Why?**
- ✅ Immer requires plain objects (Proxies don't work with class methods)
- ✅ Serialization (JSON.stringify works)
- ✅ Structural sharing (performance)
- ✅ Type safety (discriminated unions)

### Pure Functions (No Side Effects)

**Benefits:**
- ✅ **Testable:** Same input always produces same output
- ✅ **Predictable:** No hidden dependencies
- ✅ **Composable:** Combine functions to build complex logic
- ✅ **Debuggable:** Easy to trace data flow

**See:** [Contracts/Functions](../contracts/functions.md) for complete pure function reference

---

## Folder Structure

```
src/components/game/
├── infrastructure/           # Grid math, geometry, coordinates
│   ├── geometry/
│   │   └── coordinates.ts   # isInBounds, distance, etc.
│   └── grid/
│       └── SquareGrid.ts    # Grid implementations
│
├── domain/                   # Business logic (pure)
│   ├── entity/
│   │   ├── entity-data.ts   # EntityData type
│   │   └── entity-fns.ts    # Pure functions
│   ├── space/
│   │   ├── space-data.ts    # SpaceData types
│   │   └── space-fns.ts     # Pure functions
│   └── validation/
│       └── sanitize.ts      # Validation rules
│
├── application/              # State management
│   ├── hooks/
│   │   └── useSpace.ts      # React hooks
│   └── state/
│       ├── actions/         # Action types
│       ├── reducers/        # Reducers
│       └── types/           # GameState, GameAction
│
├── presentation/             # UI components
│   ├── space/
│   │   ├── GridSpaceView.tsx
│   │   └── PoolSpaceView.tsx
│   ├── entity/
│   │   └── EntityCard.tsx
│   ├── terminal/
│   │   └── TerminalView.tsx
│   └── modal/
│       └── Modal.tsx
│
├── engines/                  # Specialized mechanics
│   ├── terminal/
│   └── drag/
│
├── core/                     # Foundation
│   ├── types/               # Global types
│   └── game-provider.tsx    # React Context
│
└── doc/                      # Documentation (you are here)
```

---

## Common Patterns

### Pattern 1: Creating a New Entity Type

```typescript
// 1. Define type in domain/entity/entity-data.ts
export type RouterData = EntityData & {
  // Inherits: id, type, state, data, visual, behaviorIds
};

// 2. Use pure function to create
const router = createEntityData({
  id: "router-1",
  type: "router",
  state: { dhcpEnabled: false },
  // ...
});

// 3. Render in presentation/
<EntityCard entity={router} />
```

### Pattern 2: Adding a New Space

```typescript
// 1. Use pure function in domain/
const routerBoard = createGridSpaceData({
  id: "router-board",
  rows: 1,
  cols: 1,
  // ...
});

// 2. Add to state via reducer
dispatch({ type: "CREATE_SPACE", payload: { space: routerBoard } });

// 3. Render in presentation/
<GridSpaceView space={routerBoard} />
```

### Pattern 3: State Update Flow

```typescript
// 1. User action (presentation/)
dispatch({ type: "ADD_ENTITY_TO_SPACE", payload: {...} });

// 2. Reducer (application/)
produce(state, draft => {
  gridAdd(draft.spaces[id], entityId, position); // domain/
  draft.eventQueue.events.push({ type: "ENTITY_ENTERED_SPACE" });
});

// 3. Re-render (presentation/)
const state = useGameState(); // Gets new state
```

---

## Anti-Patterns (Don't Do This!)

### ❌ UI in Domain
```typescript
// domain/entity/Entity.ts
export const renderEntity = () => <div>Entity</div>; // WRONG!
```

### ❌ Business Logic in Presentation
```typescript
// presentation/GridView.tsx
const isValid = coord.row >= 0 && coord.row < rows; // WRONG! Use gridCanAccept()
```

### ❌ Importing Upward
```typescript
// domain/space/Space.ts
import { useGameState } from "../../application/hooks"; // WRONG! Violates layering
```

### ❌ Direct State Mutation
```typescript
const state = useGameState();
state.sequence += 1; // WRONG! Always use dispatch
```

---

## See Also

- [Core Concepts](./core-concepts.md) - Fundamental game concepts
- [Contracts/Types](../contracts/types.md) - All TypeScript types
- [Contracts/Functions](../contracts/functions.md) - Pure function reference
- [Guides/State Management](../guides/state-management.md) - How to work with state
