# Networking Questions: Space/Entity Migration Guide

This guide documents the migration from the legacy puzzle/inventory system to the new Space/Entity presentation architecture.

## Overview

The migration replaces:
- `PuzzleBoard` → `GridSpaceView`
- `InventoryDrawer/InventoryPanel` → `PoolSpaceView`
- `DragProvider` (from puzzle/drag) → `DragProvider` (from presentation/interaction/drag)
- `useGameState()` → `useNewGameState()`
- Old actions (PLACE_ITEM, etc.) → New actions (ADD_ENTITY_TO_SPACE, etc.)

## Reference Implementation

**DHCP Question** has been fully migrated as a reference. Key files:
- `/src/routes/questions/networking/dhcp/-page-v2.tsx` - Migrated page component
- `/src/routes/questions/networking/dhcp/-utils/init-spaces.ts` - Space/Entity initialization
- `/src/routes/questions/networking/dhcp/-utils/use-network-state-v2.ts` - Adapted state hook

## Migration Steps

### 1. Create Initialization File (`init-spaces.ts`)

Replace `INIT_MULTI_CANVAS` with explicit Space and Entity creation:

```typescript
import { Item } from "@/components/game/domain/entity";
import { GridSpace, PoolSpace } from "@/components/game/domain/space";

export const initializeSpaces = (dispatch: GameDispatch) => {
  // Create GridSpace for each canvas
  for (const canvasId of CANVAS_ORDER) {
    const config = CANVAS_CONFIGS[canvasId];
    const gridSpace = new GridSpace({
      id: config.id,
      name: config.name,
      rows: config.rows,
      cols: config.cols,
      metrics: config.metrics,
      maxCapacity: config.maxCapacity,
      metadata: config.metadata ?? {},
    });

    dispatch({ type: "CREATE_SPACE", payload: { space: gridSpace } });
  }

  // Create PoolSpace for inventory
  const inventorySpace = new PoolSpace({
    id: "inventory",
    name: "Inventory",
    maxCapacity: undefined,
    metadata: { visible: true },
  });

  dispatch({ type: "CREATE_SPACE", payload: { space: inventorySpace } });
};

export const initializeEntities = (dispatch: GameDispatch) => {
  for (const itemConfig of INVENTORY_ITEMS) {
    const entity = new Item({
      id: itemConfig.id,
      name: itemConfig.name,
      icon: itemConfig.icon,
      data: { ...itemConfig.data, type: itemConfig.type },
      tooltip: itemConfig.tooltip,
      allowedPlaces: itemConfig.allowedPlaces,
    });

    dispatch({ type: "CREATE_ENTITY", payload: { entity } });
    dispatch({
      type: "ADD_ENTITY_TO_SPACE",
      payload: { entityId: entity.id, spaceId: "inventory" },
    });
  }
};
```

**Note**: Due to Phase 5 incomplete integration, use `any` type for dispatch:
```typescript
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;
```

### 2. Adapt State Hooks (`use-network-state-v2.ts`)

Create a version that works with `useNewGameState()`:

Key changes:
- Import `useNewGameState` instead of `useGameState`
- Access spaces via `state.spaces.get(spaceId)`
- Access entities via `state.entities.get(entityId)` or `state.entities.values()`
- Convert entities to `BoardItemLocation` for compatibility with existing network-utils
- Use `UPDATE_ENTITY_STATE` instead of `CONFIGURE_DEVICE`

```typescript
import { useNewGameState } from "@/components/game/game-provider";
import { GridSpace } from "@/components/game/domain/space/GridSpace";

const spaces = useMemo(() => {
  const result: Record<string, GridSpace | undefined> = {};
  for (const canvasId of Object.values(CANVAS_IDS)) {
    const space = state.spaces.get(canvasId);
    result[canvasId] = space instanceof GridSpace ? space : undefined;
  }
  return result;
}, [state.spaces]);

// Convert entities to BoardItemLocation for compatibility
const placements = useMemo<BoardPlacements>(() => {
  const result: BoardPlacements = { /* ... */ };

  for (const [canvasId, space] of Object.entries(spaces)) {
    if (!space) continue;

    const items: BoardItemLocation[] = [];
    for (const entity of state.entities.values()) {
      if (space.contains(entity)) {
        const position = space.getPosition(entity);
        if (position && "row" in position && "col" in position) {
          items.push({
            id: entity.id,
            itemId: entity.id,
            type: entity.type,
            blockX: position.col,
            blockY: position.row,
            status: entity.getStateValue("status") ?? "normal",
            data: entity.data,
          });
        }
      }
    }
    result[canvasId] = items;
  }

  return result;
}, [spaces, state.entities]);
```

### 3. Update Page Component

Replace imports:
```typescript
// Old
import { PuzzleBoard } from "@/components/game/puzzle/board";
import { DragProvider, DragOverlay } from "@/components/game/puzzle/drag";
import { InventoryDrawer } from "@/components/game/puzzle/inventory";
import { useGameState } from "@/components/game/game-provider";

// New
import { GridSpaceView } from "@/components/game/presentation/space/GridSpaceView";
import { PoolSpaceView } from "@/components/game/presentation/space/PoolSpaceView";
import { DragProvider, useDragContext } from "@/components/game/presentation/interaction/drag/DragContext";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { useNewGameState } from "@/components/game/game-provider";
```

### 4. Create Adapter Components

The adapter pattern bridges the gap between game state and presentation components:

#### GridSpaceAdapter

```typescript
const GridSpaceAdapter = ({ spaceId, title, onEntityClick, isEntityClickable }) => {
  const state = useNewGameState();
  const dispatch = useGameDispatch();

  const space = state.spaces.get(spaceId) as GridSpace | undefined;

  // Get entities in this space
  const entities = useMemo(() => {
    if (!space) return [];

    const result: Array<{ entity: Entity; position: GridPosition }> = [];
    for (const entity of state.entities.values()) {
      if (space.contains(entity)) {
        const position = space.getPosition(entity);
        if (position && "row" in position && "col" in position) {
          result.push({ entity, position });
        }
      }
    }
    return result;
  }, [space, state.entities]);

  // Validation callback
  const canPlaceAt = useCallback((entityId, position, targetSpaceId) => {
    const entity = state.entities.get(entityId);
    const targetSpace = state.spaces.get(targetSpaceId) as GridSpace | undefined;

    if (!entity || !targetSpace) return false;

    // Check allowed places
    if ("allowedPlaces" in entity.data) {
      const allowedPlaces = entity.data.allowedPlaces;
      if (Array.isArray(allowedPlaces) &&
          !allowedPlaces.includes(targetSpaceId) &&
          !allowedPlaces.includes("inventory")) {
        return false;
      }
    }

    return targetSpace.canAccept(entity, position);
  }, [state.entities, state.spaces]);

  // Placement callback
  const onPlaceEntity = useCallback((entityId, _fromPosition, toPosition) => {
    const entity = state.entities.get(entityId);
    if (!entity) return false;

    // Find source space
    let sourceSpaceId: string | null = null;
    for (const [sid, s] of state.spaces) {
      if (s.contains(entity)) {
        sourceSpaceId = sid;
        break;
      }
    }

    if (sourceSpaceId === spaceId) {
      // Moving within same space
      dispatch({
        type: "UPDATE_ENTITY_POSITION",
        payload: { entityId, spaceId, position: toPosition },
      });
      return true;
    }

    // Moving from another space
    if (sourceSpaceId) {
      dispatch({
        type: "MOVE_ENTITY_BETWEEN_SPACES",
        payload: {
          entityId,
          fromSpaceId: sourceSpaceId,
          toSpaceId: spaceId,
          toPosition: toPosition,
        },
      });
      return true;
    }

    return false;
  }, [dispatch, spaceId, state.entities, state.spaces]);

  if (!space) return null;

  return (
    <GridSpaceView
      space={space}
      entities={entities}
      title={title}
      getEntityLabel={(entity) => entity.name ?? entity.type}
      getEntityStatus={(entity) => ({
        status: entity.getStateValue("status"),
        message: null,
      })}
      onEntityClick={onEntityClick}
      isEntityClickable={isEntityClickable}
      canPlaceAt={canPlaceAt}
      onPlaceEntity={onPlaceEntity}
    />
  );
};
```

#### InventoryAdapter

```typescript
const InventoryAdapter = () => {
  const state = useNewGameState();
  const { setActiveDrag, setLastDropResult } = useDragContext();

  const inventorySpace = state.spaces.get("inventory");

  // Get entities in inventory
  const entities = useMemo(() => {
    if (!inventorySpace) return [];

    const result: Entity[] = [];
    for (const entity of state.entities.values()) {
      if (inventorySpace.contains(entity)) {
        result.push(entity);
      }
    }
    return result;
  }, [inventorySpace, state.entities]);

  // Get IDs of placed entities (in other spaces)
  const placedEntityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [spaceId, space] of state.spaces) {
      if (spaceId === "inventory") continue;

      for (const entity of state.entities.values()) {
        if (space.contains(entity)) {
          ids.add(entity.id);
        }
      }
    }
    return ids;
  }, [state.spaces, state.entities]);

  const handleEntityDragStart = useCallback((entity, event) => {
    event.preventDefault();
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();

    setLastDropResult(null);
    setActiveDrag({
      source: "pool",
      sourceSpaceId: "inventory",
      data: {
        entityId: entity.id,
        entityType: entity.type,
        entityName: entity.name,
        isReposition: false,
      },
      element: target as HTMLElement,
      initialRect: rect,
    });
  }, [setActiveDrag, setLastDropResult]);

  if (!inventorySpace) return null;

  return (
    <PoolSpaceView
      space={inventorySpace as any}
      entities={entities}
      placedEntityIds={placedEntityIds}
      title="Inventory"
      onEntityDragStart={handleEntityDragStart}
    />
  );
};
```

### 5. Update Initialization

Replace:
```typescript
// Old
dispatch({
  type: "INIT_MULTI_CANVAS",
  payload: spec.init.payload,
});
```

With:
```typescript
// New
import { initializeDhcpQuestion } from "./-utils/init-spaces";

useEffect(() => {
  if (initializedRef.current) return;

  initializedRef.current = true;
  initializeDhcpQuestion(dispatch);
}, [dispatch]);
```

## Known Issues & Workarounds

### 1. New Actions Not in GameAction Type

**Issue**: CREATE_SPACE, CREATE_ENTITY, etc. aren't in the main GameAction union type yet.

**Workaround**: Use `any` type for dispatch with biome-ignore comment:
```typescript
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;
```

### 2. PoolSpace Type Incompatibility

**Issue**: PoolSpaceView expects specific PoolSpace type that may not match exactly.

**Workaround**: Use type assertion with biome-ignore:
```typescript
<PoolSpaceView
  // biome-ignore lint/suspicious/noExplicitAny: PoolSpace type compatibility
  space={inventorySpace as any}
  ...
/>
```

### 3. BoardItemLocation Compatibility

**Issue**: Existing network-utils expect BoardItemLocation format.

**Solution**: Create conversion helper in state hook:
```typescript
const entityToBoardItem = (entity: Entity, space: GridSpace): BoardItemLocation | null => {
  const position = space.getPosition(entity);
  if (!position || !("row" in position && "col" in position)) {
    return null;
  }

  return {
    id: entity.id,
    itemId: entity.id,
    type: entity.type,
    blockX: position.col,
    blockY: position.row,
    status: entity.getStateValue("status") ?? "normal",
    data: entity.data,
  };
};
```

## Checklist for Each Question

- [ ] Create `init-spaces.ts` with Space/Entity initialization
- [ ] Create `use-*-state-v2.ts` adapted for new state format
- [ ] Update page component imports
- [ ] Create GridSpaceAdapter component
- [ ] Create InventoryAdapter component
- [ ] Replace INIT_MULTI_CANVAS with new initialization
- [ ] Update entity click handlers
- [ ] Update drag & drop callbacks
- [ ] Test TypeScript compilation
- [ ] Test Biome linting
- [ ] Manual testing (if possible)

## Testing

After migration:
```bash
pnpm check:tsc
pnpm check:biome
```

Both should pass with only biome warnings for `any` usage (documented workarounds).

## Next Steps

Once all networking questions are migrated:
1. Remove old `-page.tsx` files
2. Rename `-page-v2.tsx` to `-page.tsx`
3. Remove old `use-*-state.ts` files
4. Rename `use-*-state-v2.ts` to `use-*-state.ts`
5. Update exports and route configurations

## Benefits of Migration

1. **Cleaner Architecture**: Separation of domain (Space/Entity) and presentation (Views)
2. **Type Safety**: Better type inference with domain models
3. **Reusability**: Presentation components can be reused across different questions
4. **Maintainability**: Changes to presentation don't affect game logic
5. **Future-Proof**: Aligned with Phase 5+ architecture

## Support

For questions or issues:
- See `/src/components/game/application/README.md` for application layer docs
- See `/src/components/game/domain/README.md` for domain model docs
- Check existing DHCP migration as reference implementation
