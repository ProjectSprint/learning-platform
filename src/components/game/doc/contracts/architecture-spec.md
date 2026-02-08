# Architecture Contract: Space-Owned Interaction & Fact-Only World Events

> Authoritative spec for the target architecture. All new code MUST comply.
> Supersedes intent-style action names and implicit space creation patterns.
>
> **See also:** [Networking MIGRATION_GUIDE.md](../../../../routes/questions/networking/MIGRATION_GUIDE.md)

## When to Read

- You are writing or modifying a reducer, action, or engine component
- You are creating a new question page with spaces and entities
- You are migrating an existing question from legacy actions
- You need to decide whether an action name is valid

---

## 1. Nomenclature Rules

### World Fact Actions (Past-Tense — mandatory)

World mutations describe **facts that happened**, not intents to do something.
Every world mutation action MUST use past-tense naming:

| Fact Action                | Payload Shape |
|---------------------------|---------------|
| `SPACE_CREATED`           | `{ space: SpaceData }` |
| `SPACE_REMOVED`           | `{ spaceId: string }` |
| `ENTITY_CREATED`          | `{ entity: EntityData }` |
| `ENTITY_ADDED`            | `{ entityId, spaceId, position? }` |
| `ENTITY_REMOVED`          | `{ entityId, spaceId }` |
| `ENTITY_MOVED`            | `{ entityId, fromSpaceId, toSpaceId, fromPosition?, toPosition? }` |
| `ENTITY_POSITION_UPDATED` | `{ entityId, spaceId, position }` |
| `ENTITY_UPDATED`          | `{ entityId, updates }` |
| `ENTITY_STATE_UPDATED`    | `{ entityId, state }` |
| `ENTITIES_DELETED`        | `{ entityIds: string[] }` |
| `ENTITIES_SWAPPED`        | `{ entity1Id, space1Id, entity2Id, space2Id }` |

### Allowed Intent Actions (Present-Tense — limited scope)

Intent-style actions are ONLY permitted for **UI overlay channels** and **core lifecycle**.
These do not mutate the world (spaces/entities); they control modals, phase, and event plumbing.

**UI channel:**

```typescript
| "OPEN_MODAL"      | { payload: ModalInstance }
| "CLOSE_MODAL"     | { payload?: { modalId?: string } }
| "MODAL_SUBMITTED" | { payload: { modalId, modalActionId, values } }
```

**Core channel:**

```typescript
| "SET_PHASE"          | { payload: { phase: GamePhase } }
| "COMPLETE_QUESTION"  | (no payload)
| "ACK_EVENTS"         | { payload: { engineId, cursor } }
| "EMIT_EVENTS"        | { payload: { events: GameEventInput[] } }
```

### Forbidden Patterns

- **No imperative world actions:** `CREATE_SPACE`, `ADD_ENTITY_TO_SPACE`,
  `MOVE_ENTITY_BETWEEN_SPACES`, `UPDATE_ENTITY_POSITION`, etc.
- **No legacy aliases:** `PLACE_ITEM`, `TRANSFER_ITEM`, `CONFIGURE_DEVICE`,
  `SWAP_ITEMS`, `REPOSITION_ITEM`, `ADD_POOL_GROUP`, `UPDATE_POOL_GROUP`,
  `REMOVE_POOL_GROUP`, `PURGE_POOL_ITEMS`, `REMOVE_ITEM`,
  `UPDATE_POOL_ITEM_TOOLTIP`

---

## 2. Boundary Table

| Layer | Directory | Responsibility | Allowed Dispatches |
|-------|-----------|----------------|-------------------|
| **Question Init** | `routes/questions/**/init-spaces.ts` | Create all spaces and entities up front, set initial phase | `SPACE_CREATED`, `ENTITY_CREATED`, `ENTITY_ADDED`, `SET_PHASE` |
| **Engine** | `engine/GridSpace.tsx`, `engine/PoolSpace.tsx` | Render state, validate drops via pure functions, dispatch placement facts | `ENTITY_ADDED`, `ENTITY_MOVED`, `ENTITY_POSITION_UPDATED`, `ENTITY_REMOVED` |
| **Space Validation** | `domain/space/validation.ts`, `domain/space/space-fns.ts` | Accept/reject drops, compute placement positions | **Pure functions only — no dispatch** |
| **Reducer** | `application/state/reducers/` | Apply facts to state, append events to queue | State mutation + `eventQueue.events.push(...)` |
| **Overlay** | `presentation/modal/`, terminal, drawer | Collect user input, show/hide modals | `OPEN_MODAL`, `CLOSE_MODAL`, `MODAL_SUBMITTED` |
| **Engine Hooks** | `engines/`, `application/hooks/` | React to events, advance progression | `SET_PHASE`, `COMPLETE_QUESTION`, `ACK_EVENTS`, `EMIT_EVENTS` |

### Rule: Engine Components as Pure Renderers

`GridSpace` and `PoolSpace` MUST NOT create world state on mount.
They receive space IDs, read from `state.spaces[id]`, and render.
If the space does not exist in state, they render `null`.

```tsx
// ✅ CORRECT: Engine reads existing space
const space = state.spaces[resolvedId];
if (!space) return null;

// ❌ WRONG: Engine creates space on mount
useLayoutEffect(() => {
  dispatch({ type: "CREATE_SPACE", payload: { space: createGridSpaceData(config) } });
}, []);
```

---

## 3. Event/Fact Taxonomy

### Action Rename Map (Old → New)

| Legacy (Intent) | Target (Fact) | Notes |
|-----------------|---------------|-------|
| `CREATE_SPACE` | `SPACE_CREATED` | |
| `REMOVE_SPACE` | `SPACE_REMOVED` | |
| `ADD_ENTITY_TO_SPACE` | `ENTITY_ADDED` | |
| `REMOVE_ENTITY_FROM_SPACE` | `ENTITY_REMOVED` | |
| `MOVE_ENTITY_BETWEEN_SPACES` | `ENTITY_MOVED` | |
| `UPDATE_ENTITY_POSITION` | `ENTITY_POSITION_UPDATED` | |
| `SWAP_ENTITIES` | `ENTITIES_SWAPPED` | |
| `CREATE_ENTITY` | `ENTITY_CREATED` | |
| `UPDATE_ENTITY` | `ENTITY_UPDATED` | |
| `UPDATE_ENTITY_STATE` | `ENTITY_STATE_UPDATED` | |
| `DELETE_ENTITY` | *(use `ENTITIES_DELETED` with single-element array)* | Consolidated |
| `DELETE_ENTITIES` | `ENTITIES_DELETED` | |

### Legacy Alias → Fact Mapping

| Legacy Alias | Intermediate (Current) | Target (Fact) |
|-------------|----------------------|---------------|
| `PLACE_ITEM` | `ADD_ENTITY_TO_SPACE` | `ENTITY_ADDED` |
| `REMOVE_ITEM` | `REMOVE_ENTITY_FROM_SPACE` | `ENTITY_REMOVED` |
| `REPOSITION_ITEM` | `UPDATE_ENTITY_POSITION` | `ENTITY_POSITION_UPDATED` |
| `TRANSFER_ITEM` | `MOVE_ENTITY_BETWEEN_SPACES` | `ENTITY_MOVED` |
| `SWAP_ITEMS` | `SWAP_ENTITIES` | `ENTITIES_SWAPPED` |
| `ADD_POOL_GROUP` | `CREATE_ENTITY` (×N) | `ENTITY_CREATED` (×N) |
| `UPDATE_POOL_GROUP` | `UPDATE_ENTITY` (×N) | `ENTITY_UPDATED` (×N) |
| `UPDATE_POOL_ITEM_TOOLTIP` | `UPDATE_ENTITY` | `ENTITY_UPDATED` |
| `PURGE_POOL_ITEMS` | `DELETE_ENTITIES` | `ENTITIES_DELETED` |
| `CONFIGURE_DEVICE` | `UPDATE_ENTITY` | `ENTITY_UPDATED` |

### Target Action Union

```typescript
// application/state/actions/index.ts (target state)

type WorldAction =
  | SpaceCreatedAction
  | SpaceRemovedAction
  | EntityCreatedAction
  | EntityAddedAction
  | EntityRemovedAction
  | EntityMovedAction
  | EntityPositionUpdatedAction
  | EntityUpdatedAction
  | EntityStateUpdatedAction
  | EntitiesDeletedAction
  | EntitiesSwappedAction;

type UIAction =
  | { type: "OPEN_MODAL"; payload: ModalInstance }
  | { type: "CLOSE_MODAL"; payload?: { modalId?: string } }
  | { type: "MODAL_SUBMITTED"; payload: { modalId: string; modalActionId: string; values: Record<string, unknown> } };

type CoreAction =
  | { type: "SET_PHASE"; payload: { phase: GamePhase } }
  | { type: "COMPLETE_QUESTION" }
  | { type: "ACK_EVENTS"; payload: { engineId: string; cursor: number } }
  | { type: "EMIT_EVENTS"; payload: { events: GameEventInput[] } };

type Action = WorldAction | UIAction | CoreAction;
// No LegacyAction in union
```

---

## 4. Drop Lifecycle Sequence

### Grid Drop (entity from pool → grid cell)

```
User drops entity on grid cell
  │
  ▼
DragOverlay fires onDrop
  │
  ▼
Engine (GridSpace) resolves target space ID + grid position
  │
  ▼
Engine calls canEntityBePlaced(state, entityId, spaceId, position)
  │  (pure function — domain/space/validation.ts)
  │
  ├── false → show rejection indicator, no dispatch
  │
  ▼  true
Engine calls findEntitySpace(state, entityId) to locate source
  │
  ├── source === null (entity in no space)
  │     → dispatch ENTITY_ADDED { entityId, spaceId, position }
  │
  ├── source === target (same space, different cell)
  │     → dispatch ENTITY_POSITION_UPDATED { entityId, spaceId, position }
  │
  ├── source !== target (cross-space transfer)
  │     → dispatch ENTITY_MOVED { entityId, fromSpaceId, toSpaceId, fromPosition?, toPosition }
  │
  ▼
Reducer applies fact:
  1. Validate (entity exists, space exists, grid/pool accepts)
  2. Mutate state (Immer draft)
  3. Append event to eventQueue (ENTITY_ENTERED_SPACE, ENTITY_MOVED, etc.)
  │
  ▼
React re-renders with new state
Event consumers (useEngineEvents) react
```

### Pool Return (entity from grid → pool)

```
User drops entity on pool area (or clicks "return")
  │
  ▼
PoolSpace.handleEntityReturn(entityId)
  │
  ▼
Find current space: findEntitySpace(state, entityId)
  │
  ▼
dispatch ENTITY_MOVED { entityId, fromSpaceId: currentSpace, toSpaceId: poolId }
  │
  ▼
Reducer removes from source grid, adds to pool, emits ENTITY_MOVED event
```

### Swap (entity A ↔ entity B)

```
Engine detects occupied target cell
  │
  ▼
dispatch ENTITIES_SWAPPED { entity1Id, space1Id, entity2Id, space2Id }
  │
  ▼
Reducer swaps positions, emits 2× ENTITY_MOVED events
```

---

## 5. Forbidden Patterns

### ❌ NEVER: Dispatch `CREATE_SPACE` from component mount

```tsx
// ❌ FORBIDDEN — spaces are created in init-spaces.ts, not on mount
useLayoutEffect(() => {
  dispatch({
    type: "CREATE_SPACE",
    payload: { space: createGridSpaceData(config) },
  });
}, []);
```

```tsx
// ✅ CORRECT — question init creates spaces before render
// routes/questions/networking/dhcp/-utils/init-spaces.ts
export function initSpaces(dispatch: GameDispatch) {
  dispatch({ type: "SPACE_CREATED", payload: { space: createGridSpaceData(routerConfig) } });
  dispatch({ type: "SPACE_CREATED", payload: { space: createPoolSpaceData(inventoryConfig) } });
  // entities too
  dispatch({ type: "ENTITY_CREATED", payload: { entity: routerEntity } });
  dispatch({ type: "ENTITY_ADDED", payload: { entityId: "router-1", spaceId: "inventory" } });
}
```

### ❌ NEVER: Use legacy aliases in new code

```typescript
// ❌ FORBIDDEN
dispatch({ type: "PLACE_ITEM", payload: { itemId, blockX, blockY } });
dispatch({ type: "TRANSFER_ITEM", payload: { ... } });
dispatch({ type: "CONFIGURE_DEVICE", payload: { ... } });

// ✅ CORRECT
dispatch({ type: "ENTITY_ADDED", payload: { entityId, spaceId, position } });
dispatch({ type: "ENTITY_MOVED", payload: { entityId, fromSpaceId, toSpaceId, toPosition } });
dispatch({ type: "ENTITY_UPDATED", payload: { entityId, updates: { data: config } } });
```

### ❌ NEVER: Use intent-style names for world mutations

```typescript
// ❌ FORBIDDEN — imperative
dispatch({ type: "ADD_ENTITY_TO_SPACE", payload: { ... } });
dispatch({ type: "MOVE_ENTITY_BETWEEN_SPACES", payload: { ... } });

// ✅ CORRECT — past-tense fact
dispatch({ type: "ENTITY_ADDED", payload: { ... } });
dispatch({ type: "ENTITY_MOVED", payload: { ... } });
```

### ❌ NEVER: Let engine skip validation before dispatch

```typescript
// ❌ FORBIDDEN — dispatch without validation
const onPlaceEntity = (entityId: string, _, toPosition: GridPosition) => {
  dispatch({ type: "ENTITY_ADDED", payload: { entityId, spaceId, position: toPosition } });
  return true;
};

// ✅ CORRECT — validate, then dispatch
const onPlaceEntity = (entityId: string, _, toPosition: GridPosition) => {
  if (!canEntityBePlaced(state, entityId, spaceId, toPosition)) {
    return false;
  }
  dispatch({ type: "ENTITY_ADDED", payload: { entityId, spaceId, position: toPosition } });
  return true;
};
```

### ❌ NEVER: Perform business logic inside presentation components

```tsx
// ❌ FORBIDDEN — validation in presentation
const GridSpaceView = ({ space }) => {
  const isValid = position.row >= 0 && position.row < space.rows; // WRONG

// ✅ CORRECT — validation in domain, engine calls it
// domain/space/validation.ts
canEntityBePlaced(state, entityId, spaceId, position);
```

---

## 6. Migration Checklist

### Per-Question Migration

- [ ] `init-spaces.ts` creates ALL spaces and entities (no component-mount creation)
- [ ] `init-spaces.ts` uses fact-style actions (`SPACE_CREATED`, `ENTITY_CREATED`, `ENTITY_ADDED`)
- [ ] Page component calls `initSpaces(dispatch)` in `useEffect` with ref guard
- [ ] GridSpace/PoolSpace receive `id` only (no `config` prop triggering mount-creation)
- [ ] All entity placement dispatches use fact actions
- [ ] No legacy aliases in any question file

### Global Migration (Engine Layer)

- [ ] `engine/GridSpace.tsx` — remove `useLayoutEffect` that dispatches `CREATE_SPACE`
- [ ] `engine/PoolSpace.tsx` — remove `useLayoutEffect` that dispatches `CREATE_SPACE`
- [ ] `application/state/actions/space.ts` — rename all action types to past-tense
- [ ] `application/state/actions/entity.ts` — rename all action types to past-tense
- [ ] `application/state/actions/index.ts` — remove `LegacyAction` from `Action` union
- [ ] `application/state/reducers/space.ts` — update case labels to match new names
- [ ] `application/state/reducers/entity.ts` — update case labels to match new names
- [ ] All engine components dispatch fact-style actions only
- [ ] All legacy reducer branches (`PLACE_ITEM`, `TRANSFER_ITEM`, etc.) removed
- [ ] All networking question routes updated to fact-style
- [ ] `pnpm check:tsc` passes
- [ ] `pnpm check:biome` passes

---

## 7. State Transition Invariants

These invariants MUST hold at all times. Violations indicate a bug.

### Event Emission

> **Every world mutation action MUST emit a corresponding event to the event queue.**

| Fact Action | Emitted Event(s) |
|------------|-----------------|
| `SPACE_CREATED` | *(none — space creation is setup-only)* |
| `SPACE_REMOVED` | *(none)* |
| `ENTITY_CREATED` | *(none — entity creation is setup-only)* |
| `ENTITY_ADDED` | `ENTITY_ENTERED_SPACE` |
| `ENTITY_REMOVED` | `ENTITY_LEFT_SPACE` |
| `ENTITY_MOVED` | `ENTITY_MOVED` |
| `ENTITY_POSITION_UPDATED` | *(none — position update is silent)* |
| `ENTITY_UPDATED` | `ENTITY_UPDATED` |
| `ENTITY_STATE_UPDATED` | `ENTITY_UPDATED` (with `updates: { state }`) |
| `ENTITIES_DELETED` | *(none — silent removal)* |
| `ENTITIES_SWAPPED` | `ENTITY_MOVED` ×2 |

### Ordering Invariants

1. **Space before entity placement:** A space MUST exist in `state.spaces` before any
   `ENTITY_ADDED` targeting it. `init-spaces.ts` must dispatch `SPACE_CREATED` before
   `ENTITY_ADDED`.

2. **Entity before placement:** An entity MUST exist in `state.entities` before any
   `ENTITY_ADDED` targeting it. `init-spaces.ts` must dispatch `ENTITY_CREATED` before
   `ENTITY_ADDED`.

3. **No silent no-ops in new code:** Validation MUST happen before dispatch. Fact actions
   should always succeed. The reducer still validates as a safety net, but callers must
   not rely on silent no-op behavior.

4. **Atomic cross-space moves:** `ENTITY_MOVED` removes from source and adds to destination
   atomically. If the destination rejects, the entity rolls back to source and no event
   is emitted.

### Init Sequence

```
Question mounts
  │
  ▼
useEffect (with ref guard) calls initSpaces(dispatch)
  │
  ▼
initSpaces dispatches in order:
  1. SPACE_CREATED  × N  (all grid and pool spaces)
  2. ENTITY_CREATED × M  (all entities)
  3. ENTITY_ADDED   × M  (place entities into initial spaces)
  4. SET_PHASE { phase: "setup" | "configuring" | "playing" }
  │
  ▼
React renders: GridSpace/PoolSpace read state.spaces[id], render entities
```

---

## 8. Example: Fully Compliant Question Init

```typescript
// routes/questions/networking/dhcp/-utils/init-spaces.ts

import type { Action } from "@/components/game/application/state/actions";
import { createGridSpaceData, createPoolSpaceData } from "@/components/game/domain/space/space-fns";
import { createEntityData } from "@/components/game/domain/entity/entity-fns";
import type { GridSpaceConfig, PoolSpaceConfig } from "@/components/game/domain/space/space-data";

const ROUTER_GRID: GridSpaceConfig = {
  id: "router-board",
  rows: 1,
  cols: 4,
  metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
};

const INVENTORY_POOL: PoolSpaceConfig = {
  id: "inventory",
  layout: "grid",
  columns: 2,
};

export function initSpaces(dispatch: (action: Action) => void) {
  // 1. Create spaces
  dispatch({
    type: "SPACE_CREATED",
    payload: { space: createGridSpaceData(ROUTER_GRID) },
  });
  dispatch({
    type: "SPACE_CREATED",
    payload: { space: createPoolSpaceData(INVENTORY_POOL) },
  });

  // 2. Create entities
  const cable = createEntityData({
    id: "cable-1",
    type: "cable",
    name: "Ethernet Cable",
    visual: { icon: "cable", color: "blue" },
  });
  dispatch({ type: "ENTITY_CREATED", payload: { entity: cable } });

  // 3. Place entities into initial spaces
  dispatch({
    type: "ENTITY_ADDED",
    payload: { entityId: "cable-1", spaceId: "inventory" },
  });

  // 4. Set phase
  dispatch({ type: "SET_PHASE", payload: { phase: "playing" } });
}
```

```tsx
// routes/questions/networking/dhcp/-page.tsx

import { useEffect, useRef } from "react";
import { GameProvider, useGameDispatch } from "@/components/game/game-provider";
import { GridSpace, PoolSpace } from "@/components/game/engine";
import { initSpaces } from "./-utils/init-spaces";

function DhcpGame() {
  const dispatch = useGameDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initSpaces(dispatch);
  }, [dispatch]);

  return (
    <>
      <GridSpace id="router-board" title="Router Board" />
      <PoolSpace id="inventory" title="Inventory" />
    </>
  );
}

export default function DhcpPage() {
  return (
    <GameProvider>
      <DhcpGame />
    </GameProvider>
  );
}
```

---

## Summary Decision Tree

```
Is this a world mutation (spaces, entities)?
  │
  ├── YES → Use past-tense fact action (ENTITY_ADDED, ENTITY_MOVED, etc.)
  │          Validate BEFORE dispatch
  │          Reducer applies fact + emits event
  │
  └── NO → Is this a UI overlay (modal, terminal, drawer)?
             │
             ├── YES → Use present-tense intent (OPEN_MODAL, CLOSE_MODAL, etc.)
             │
             └── NO → Is this core lifecycle?
                        │
                        ├── YES → Use SET_PHASE, COMPLETE_QUESTION, ACK_EVENTS, EMIT_EVENTS
                        │
                        └── NO → Probably a pure function. No dispatch needed.
```
