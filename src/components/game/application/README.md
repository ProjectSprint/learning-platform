# Application Layer

This directory contains the application layer implementation for the game's state management system. It bridges the domain layer (entities, spaces) with the presentation layer (React components).

## Phase 4: State Management Refactoring

This implementation represents **Phase 4** of the refactoring process, which introduces a new domain-driven state structure while maintaining backward compatibility with the existing system.

## Directory Structure

```
application/
├── state/
│   ├── types/
│   │   └── index.ts          # New GameState type using Maps
│   ├── actions/
│   │   ├── space.ts          # Space-related actions
│   │   ├── entity.ts         # Entity-related actions
│   │   └── index.ts          # Combined action exports
│   ├── reducers/
│   │   ├── space.ts          # Space reducer with Immer
│   │   ├── entity.ts         # Entity reducer with Immer
│   │   └── index.ts          # Combined reducer exports
│   └── migration.ts          # Old/new state conversion utilities
├── hooks/
│   ├── useSpace.ts           # Hooks for accessing spaces
│   ├── useEntity.ts          # Hooks for accessing entities
│   └── index.ts              # Hook exports
├── index.ts                  # Main application layer exports
└── README.md                 # This file
```

## Key Features

### 1. New State Structure

The new `GameState` type uses `Map<string, Space>` and `Map<string, Entity>` instead of nested objects:

```typescript
export type GameState = {
  phase: GamePhase;
  spaces: Map<string, Space>;      // Changed from puzzle/puzzles
  entities: Map<string, Entity>;    // Changed from inventory groups
  arrows: Arrow[];                  // Unchanged
  terminal: TerminalState;          // Unchanged
  hint: HintState;                  // Unchanged
  overlay: OverlayState;            // Unchanged
  question: { id: string; status: QuestionStatus };
  sequence: number;
};
```

### 2. Domain-Driven Actions

#### Space Actions
- `CREATE_SPACE` - Add a new space to the game
- `REMOVE_SPACE` - Remove a space and all its entities
- `ADD_ENTITY_TO_SPACE` - Place an entity in a space
- `REMOVE_ENTITY_FROM_SPACE` - Remove an entity from a space
- `MOVE_ENTITY_BETWEEN_SPACES` - Transfer entity between spaces
- `UPDATE_ENTITY_POSITION` - Change entity position within a space
- `SWAP_ENTITIES` - Swap positions of two entities

#### Entity Actions
- `CREATE_ENTITY` - Create a new entity
- `UPDATE_ENTITY` - Update entity properties
- `UPDATE_ENTITY_STATE` - Update entity state
- `DELETE_ENTITY` - Remove a single entity
- `DELETE_ENTITIES` - Remove multiple entities

### 3. Legacy Action Support

The system maintains backward compatibility by providing legacy action aliases:

```typescript
// Old action
dispatch({ type: "PLACE_ITEM", payload: { itemId, blockX, blockY } });

// Maps to new action
dispatch({
  type: "ADD_ENTITY_TO_SPACE",
  payload: { entityId, spaceId, position: { row: blockY, col: blockX } }
});
```

Legacy actions supported:
- `PLACE_ITEM` → `ADD_ENTITY_TO_SPACE`
- `REMOVE_ITEM` → `REMOVE_ENTITY_FROM_SPACE`
- `REPOSITION_ITEM` → `UPDATE_ENTITY_POSITION`
- `TRANSFER_ITEM` → `MOVE_ENTITY_BETWEEN_SPACES`
- `SWAP_ITEMS` → `SWAP_ENTITIES`
- `ADD_INVENTORY_GROUP` → `CREATE_ENTITY` (for each item)
- `UPDATE_INVENTORY_GROUP` → `UPDATE_ENTITY`
- `PURGE_ITEMS` → `DELETE_ENTITIES`
- `CONFIGURE_DEVICE` → `UPDATE_ENTITY_STATE`

### 4. Immutable Updates with Immer

All reducers use [Immer](https://immerjs.github.io/immer/) for immutable state updates:

```typescript
export const spaceReducer = (state: GameState, action: SpaceAction) => {
  switch (action.type) {
    case "ADD_ENTITY_TO_SPACE": {
      return produce(state, (draft) => {
        const { entityId, spaceId, position } = action.payload;
        const space = draft.spaces.get(spaceId);
        const entity = draft.entities.get(entityId);

        if (space && entity && space.canAccept(entity, position)) {
          space.add(entity, position);
          draft.sequence += 1;
        }
      });
    }
    // ...
  }
};
```

### 5. React Hooks

Hooks provide convenient access to state:

```typescript
// Space hooks
const space = useSpace("puzzle");
const entities = useSpaceEntities("puzzle");
const isFull = useSpaceIsFull("puzzle");
const isEmpty = useSpaceIsEmpty("puzzle");
const capacity = useSpaceCapacity("puzzle");

// Entity hooks
const entity = useEntity("router-1");
const routers = useEntitiesByType("router");
const state = useEntityState("router-1");
const ipAddress = useEntityStateValue<string>("router-1", "ipAddress");
const space = useEntitySpace("router-1");
const position = useEntityPosition("router-1");
```

### 6. Migration Utilities

Utilities for converting between old and new state formats:

```typescript
import { migrateOldToNew, migrateNewToOld, normalizeState } from "./migration";

// Convert old state to new
const newState = migrateOldToNew(oldState);

// Convert new state back to old (for compatibility)
const oldState = migrateNewToOld(newState);

// Auto-detect and normalize
const normalized = normalizeState(anyState);

// Type guards
if (isOldState(state)) {
  // Handle old format
}
if (isNewState(state)) {
  // Handle new format
}
```

## Migration Strategy

The application layer enables **gradual migration** from the old state structure to the new one:

### Phase 4 (Current)
- ✅ New state types defined
- ✅ New actions created with legacy aliases
- ✅ Reducers handle both old and new actions
- ✅ Migration utilities implemented
- ✅ React hooks provided
- ⏳ GameProvider still uses old state (Phase 5)

### Phase 5 (Next)
- Update GameProvider to use new state structure
- Add state migration on initialization
- Update core components to use new hooks
- Maintain backward compatibility

### Phase 6 (Future)
- Gradually migrate components from old hooks to new hooks
- Remove legacy action handlers once all components migrated
- Clean up old state types and utilities

## Usage Examples

### Creating and Using Spaces

```typescript
import { useGameDispatch } from "@/components/game/game-provider";
import { GridSpace } from "@/components/game/domain/space";

// Create a grid space
const dispatch = useGameDispatch();
const gridSpace = new GridSpace({
  id: "puzzle-1",
  name: "Network Puzzle",
  rows: 10,
  cols: 10,
  metrics: { cellWidth: 64, cellHeight: 64, gap: 4 },
  maxCapacity: 20,
});

dispatch({
  type: "CREATE_SPACE",
  payload: { space: gridSpace }
});
```

### Creating and Placing Entities

```typescript
import { Item } from "@/components/game/domain/entity";

// Create an item entity
const router = new Item({
  id: "router-1",
  type: "router",
  name: "Cisco Router",
  visual: { icon: "router" },
  data: { ipAddress: "192.168.1.1" },
});

// Add entity to the game
dispatch({
  type: "CREATE_ENTITY",
  payload: { entity: router }
});

// Place entity in a space
dispatch({
  type: "ADD_ENTITY_TO_SPACE",
  payload: {
    entityId: "router-1",
    spaceId: "puzzle-1",
    position: { row: 5, col: 5 }
  }
});
```

### Moving Entities

```typescript
// Move within same space
dispatch({
  type: "UPDATE_ENTITY_POSITION",
  payload: {
    entityId: "router-1",
    spaceId: "puzzle-1",
    position: { row: 6, col: 6 }
  }
});

// Move between spaces
dispatch({
  type: "MOVE_ENTITY_BETWEEN_SPACES",
  payload: {
    entityId: "router-1",
    fromSpaceId: "inventory",
    toSpaceId: "puzzle-1",
    toPosition: { row: 5, col: 5 }
  }
});
```

### Using Hooks in Components

```typescript
import { useSpace, useEntity, useEntityPosition } from "@/components/game/application";

function PuzzleComponent() {
  const space = useSpace("puzzle-1");
  const router = useEntity("router-1");
  const position = useEntityPosition("router-1");

  if (!space || !router) return null;

  return (
    <div>
      <h2>{space.name}</h2>
      <p>Entities: {space.getCount()} / {space.maxCapacity ?? "∞"}</p>
      <p>Router at: ({position?.row}, {position?.col})</p>
    </div>
  );
}
```

## Benefits

1. **Type Safety**: Strong typing with TypeScript for all state operations
2. **Performance**: Map-based lookups are faster than nested object traversal
3. **Maintainability**: Clear separation of concerns between domain and application layers
4. **Testability**: Pure functions and immutable updates make testing easier
5. **Flexibility**: Easy to add new space types and entity types
6. **Backward Compatibility**: Existing code continues to work during migration

## Testing

To test the application layer:

```typescript
import { applicationReducer, createDefaultState } from "./state/reducers";
import { Entity } from "../domain/entity";
import { GridSpace } from "../domain/space";

// Test entity creation
const state = createDefaultState();
const entity = new Entity({ id: "test", type: "item" });
const newState = applicationReducer(state, {
  type: "CREATE_ENTITY",
  payload: { entity }
});

expect(newState.entities.has("test")).toBe(true);
expect(newState.sequence).toBe(1);
```

## Next Steps

1. **Phase 5**: Update GameProvider to use new state structure
2. **Component Migration**: Update components to use new hooks
3. **Remove Legacy**: Once all components migrated, remove legacy action handlers
4. **Optimization**: Add memoization and performance optimizations
5. **Documentation**: Document all public APIs and provide migration guide

## See Also

- [Domain Layer README](../domain/README.md)
- [Infrastructure Layer README](../infrastructure/README.md)
- [Core Types](../core/types/README.md)
