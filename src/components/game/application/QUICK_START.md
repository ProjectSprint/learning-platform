# Application Layer - Quick Start Guide

Quick reference for using the new application layer state management.

## Import Statements

```typescript
// Actions
import {
  CreateSpaceAction,
  AddEntityToSpaceAction,
  CreateEntityAction,
  UpdateEntityAction,
} from "@/components/game/application";

// Hooks (available in Phase 5+)
import {
  useSpace,
  useEntity,
  useSpaceEntities,
  useEntityPosition,
} from "@/components/game/application";

// Migration utilities
import {
  migrateOldToNew,
  normalizeState,
} from "@/components/game/application";
```

## Quick Examples

### Creating a Space

```typescript
import { GridSpace } from "@/components/game/domain/space";
import { useGameDispatch } from "@/components/game/game-provider";

const dispatch = useGameDispatch();

const space = new GridSpace({
  id: "puzzle-1",
  name: "Network Puzzle",
  rows: 10,
  cols: 10,
  metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
  maxCapacity: 20,
});

dispatch({
  type: "CREATE_SPACE",
  payload: { space }
});
```

### Creating an Entity

```typescript
import { Item } from "@/components/game/domain/entity";

const router = new Item({
  id: "router-1",
  name: "Cisco Router",
  icon: { name: "router", type: "lucide" },
  allowedPlaces: ["puzzle-1"],
  data: { ipAddress: "192.168.1.1" },
});

dispatch({
  type: "CREATE_ENTITY",
  payload: { entity: router }
});
```

### Placing an Entity in a Space

```typescript
dispatch({
  type: "ADD_ENTITY_TO_SPACE",
  payload: {
    entityId: "router-1",
    spaceId: "puzzle-1",
    position: { row: 5, col: 5 }
  }
});
```

### Moving an Entity

```typescript
// Within same space
dispatch({
  type: "UPDATE_ENTITY_POSITION",
  payload: {
    entityId: "router-1",
    spaceId: "puzzle-1",
    position: { row: 6, col: 6 }
  }
});

// Between different spaces
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

### Using Hooks (Phase 5+)

```typescript
function PuzzleComponent() {
  const space = useSpace("puzzle-1");
  const entities = useSpaceEntities("puzzle-1");
  const router = useEntity("router-1");
  const position = useEntityPosition("router-1");

  if (!space) return <div>Loading...</div>;

  return (
    <div>
      <h2>{space.name}</h2>
      <p>Entities: {entities.length} / {space.maxCapacity ?? "∞"}</p>
      {router && (
        <p>Router at: ({position?.row}, {position?.col})</p>
      )}
    </div>
  );
}
```

### Legacy Actions (Still Work!)

```typescript
// Old action style - automatically converted
dispatch({
  type: "PLACE_ITEM",
  payload: {
    itemId: "router-1",
    blockX: 5,
    blockY: 5,
    puzzleId: "puzzle-1"
  }
});

// Maps to:
// type: "ADD_ENTITY_TO_SPACE"
// entityId: "router-1"
// spaceId: "puzzle-1"
// position: { row: 5, col: 5 }
```

## Action Type Reference

### Space Actions

| Action | Purpose | Payload |
|--------|---------|---------|
| `CREATE_SPACE` | Add new space | `{ space: Space }` |
| `REMOVE_SPACE` | Remove space | `{ spaceId: string }` |
| `ADD_ENTITY_TO_SPACE` | Place entity | `{ entityId, spaceId, position? }` |
| `REMOVE_ENTITY_FROM_SPACE` | Remove entity | `{ entityId, spaceId }` |
| `MOVE_ENTITY_BETWEEN_SPACES` | Transfer entity | `{ entityId, fromSpaceId, toSpaceId, toPosition? }` |
| `UPDATE_ENTITY_POSITION` | Move within space | `{ entityId, spaceId, position }` |
| `SWAP_ENTITIES` | Swap positions | `{ entity1Id, space1Id, entity2Id, space2Id }` |

### Entity Actions

| Action | Purpose | Payload |
|--------|---------|---------|
| `CREATE_ENTITY` | Add new entity | `{ entity: Entity }` |
| `UPDATE_ENTITY` | Update properties | `{ entityId, updates }` |
| `UPDATE_ENTITY_STATE` | Update state | `{ entityId, state }` |
| `DELETE_ENTITY` | Remove entity | `{ entityId }` |
| `DELETE_ENTITIES` | Remove multiple | `{ entityIds: string[] }` |

### Legacy Actions (Deprecated but Supported)

| Old Action | Maps To | Status |
|------------|---------|--------|
| `PLACE_ITEM` | `ADD_ENTITY_TO_SPACE` | ✅ Works |
| `REMOVE_ITEM` | `REMOVE_ENTITY_FROM_SPACE` | ✅ Works |
| `REPOSITION_ITEM` | `UPDATE_ENTITY_POSITION` | ✅ Works |
| `TRANSFER_ITEM` | `MOVE_ENTITY_BETWEEN_SPACES` | ✅ Works |
| `SWAP_ITEMS` | `SWAP_ENTITIES` | ✅ Works |
| `CONFIGURE_DEVICE` | `UPDATE_ENTITY_STATE` | ✅ Works |
| `PURGE_ITEMS` | `DELETE_ENTITIES` | ✅ Works |

## Hook Reference

### Space Hooks (Phase 5+)

```typescript
const space = useSpace(spaceId);                 // Get space by ID
const spaces = useSpaces();                      // Get all spaces
const entities = useSpaceEntities(spaceId);      // Get entities in space
const isFull = useSpaceIsFull(spaceId);         // Check if full
const isEmpty = useSpaceIsEmpty(spaceId);        // Check if empty
const capacity = useSpaceCapacity(spaceId);      // Get capacity info
```

### Entity Hooks (Phase 5+)

```typescript
const entity = useEntity(entityId);                     // Get entity by ID
const entities = useEntities();                         // Get all entities
const routers = useEntitiesByType("router");           // Filter by type
const state = useEntityState(entityId);                // Get entity state
const value = useEntityStateValue(entityId, "key");    // Get state value
const exists = useEntityExists(entityId);              // Check existence
const space = useEntitySpace(entityId);                // Find entity's space
const pos = useEntityPosition(entityId);               // Get position
```

## Common Patterns

### Creating a Puzzle with Items

```typescript
// 1. Create the grid space
const puzzleSpace = new GridSpace({
  id: "network-puzzle",
  name: "Build Your Network",
  rows: 8,
  cols: 12,
  metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
  maxCapacity: 30,
});

dispatch({ type: "CREATE_SPACE", payload: { space: puzzleSpace } });

// 2. Create inventory space (pool)
const inventorySpace = new PoolSpace({
  id: "inventory",
  name: "Available Items",
});

dispatch({ type: "CREATE_SPACE", payload: { space: inventorySpace } });

// 3. Create items
const items = [
  new Item({
    id: "router-1",
    name: "Router",
    icon: { name: "router", type: "lucide" },
    allowedPlaces: ["network-puzzle"],
  }),
  new Item({
    id: "switch-1",
    name: "Switch",
    icon: { name: "network", type: "lucide" },
    allowedPlaces: ["network-puzzle"],
  }),
];

items.forEach(item => {
  dispatch({ type: "CREATE_ENTITY", payload: { entity: item } });
  dispatch({
    type: "ADD_ENTITY_TO_SPACE",
    payload: { entityId: item.id, spaceId: "inventory" }
  });
});
```

### Drag and Drop

```typescript
function handleDrop(entityId: string, toSpaceId: string, position: any) {
  // Find current space
  const fromSpace = useEntitySpace(entityId);

  if (fromSpace) {
    dispatch({
      type: "MOVE_ENTITY_BETWEEN_SPACES",
      payload: {
        entityId,
        fromSpaceId: fromSpace.id,
        toSpaceId,
        toPosition: position
      }
    });
  }
}
```

### Updating Entity Configuration

```typescript
// Update router IP address
dispatch({
  type: "UPDATE_ENTITY_STATE",
  payload: {
    entityId: "router-1",
    state: {
      ipAddress: "192.168.2.1",
      subnet: "255.255.255.0"
    }
  }
});
```

## Migration Helper

```typescript
// Convert old state to new state
import { migrateOldToNew } from "@/components/game/application";

const oldState = getOldGameState();
const newState = migrateOldToNew(oldState);
```

## Troubleshooting

### "New state hooks not yet available"

**Issue:** Hooks throw error about not being available.

**Solution:** Wait for Phase 5. GameProvider hasn't been updated yet.

### TypeScript errors with Entity types

**Issue:** Immer Draft types causing issues.

**Solution:** The reducers handle this internally with `asEntity()` helper.

### Legacy actions not working

**Issue:** Old action dispatched but nothing happens.

**Solution:** Check that the action type is spelled correctly. Legacy actions are supported.

## Best Practices

1. **Use New Actions**: Prefer new action types over legacy ones
2. **Type Safety**: Let TypeScript help you with action payloads
3. **Hooks Over Direct Access**: Use hooks instead of accessing state directly (Phase 5+)
4. **Validation**: Spaces validate entities before accepting them
5. **Rollback**: Failed operations automatically rollback
6. **Immutability**: Never mutate state directly, always dispatch actions

## See Also

- [Application Layer README](./README.md) - Full documentation
- [Domain Layer](../domain/README.md) - Entity and Space classes
- [Phase 4 Summary](../../../../PHASE_4_SUMMARY.md) - Implementation details
