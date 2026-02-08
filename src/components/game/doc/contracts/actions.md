# Action Contracts

> Authoritative reference for all game engine actions.
> Source: `application/state/actions/`, `application/state/reducers/`

## When to Read

- You need to dispatch an action from a question page or engine
- You need to understand what validation happens before state changes
- You need to know which events an action produces

---

## Action Architecture

Actions are the **only** way to change `GameState`. Every action flows through
`applicationReducer`, which routes to the appropriate sub-reducer.

```
Question page / Engine
       |
       v
  dispatch(action)
       |
       v
  applicationReducer (router)
       |
       +-- SpaceAction     --> spaceReducer
       +-- EntityAction    --> entityReducer
       +-- UIAction        --> uiReducer
       +-- CoreAction      --> coreReducer
       |
       v
  Reducer: validate -> mutate -> emit events
       |
       v
  New GameState (immutable via Immer)
```

### Action Union

```typescript
type Action = ApplicationAction | LegacyAction | UIAction | CoreAction;

type ApplicationAction = SpaceAction | EntityAction;
type LegacyAction = LegacySpaceAction | LegacyEntityAction;
```

---

## Space Actions

### CREATE_SPACE

Registers a new space in the game state.

```typescript
{ type: "CREATE_SPACE"; payload: { space: SpaceData } }
```

**Validation:** None (overwrites if ID exists).
**Events:** None.
**Side effects:** `state.spaces[space.id] = space`

```
dispatch(CREATE_SPACE { space })
  |
  v
state.spaces[id] = space
  |
  v
(no events emitted)
```

**Used by:** `GridSpace` and `PoolSpace` components on mount (self-registration via `useLayoutEffect`).

---

### REMOVE_SPACE

Removes a space from state. Entities remain in `state.entities` but lose their space association.

```typescript
{ type: "REMOVE_SPACE"; payload: { spaceId: string } }
```

**Validation:** No-op if space doesn't exist.
**Events:** None.
**Side effects:** `delete state.spaces[spaceId]`

---

### ADD_ENTITY_TO_SPACE

Places an entity into a space.

```typescript
{
  type: "ADD_ENTITY_TO_SPACE";
  payload: {
    entityId: string;
    spaceId: string;
    position?: Record<string, unknown>;  // GridPosition for grid, { index } for pool
  }
}
```

**Validation:**

| Check | Failure |
|-------|---------|
| Entity exists | No-op |
| Space exists | No-op |
| Grid: `gridCanAccept()` (bounds + capacity + cell occupancy) | No-op |
| Pool: capacity check | No-op |

**Events:** `ENTITY_ENTERED_SPACE` on success.

```
dispatch(ADD_ENTITY_TO_SPACE { entityId, spaceId, position })
  |
  v
Validate entity + space exist
  |
  v
Grid path:                        Pool path:
  gridCanAccept()?                  capacity check
  |  no -> return                   |  full -> return
  v                                 v
  gridAdd(space, entityId, pos)     poolAdd(space, entityId, index?)
  |                                 |
  v                                 v
emit ENTITY_ENTERED_SPACE         emit ENTITY_ENTERED_SPACE
```

---

### REMOVE_ENTITY_FROM_SPACE

Removes an entity from a specific space.

```typescript
{
  type: "REMOVE_ENTITY_FROM_SPACE";
  payload: { entityId: string; spaceId: string }
}
```

**Validation:** No-op if entity or space doesn't exist, or entity not in space.
**Events:** `ENTITY_LEFT_SPACE` on success.

```
dispatch(REMOVE_ENTITY_FROM_SPACE)
  |
  v
Grid: gridGetPosition() -> gridRemove()
Pool: indexOf()          -> poolRemove()
  |
  v
emit ENTITY_LEFT_SPACE { entityId, spaceId, position }
```

---

### MOVE_ENTITY_BETWEEN_SPACES

Transfers an entity from one space to another atomically.

```typescript
{
  type: "MOVE_ENTITY_BETWEEN_SPACES";
  payload: {
    entityId: string;
    fromSpaceId: string;
    toSpaceId: string;
    fromPosition?: Record<string, unknown>;
    toPosition?: Record<string, unknown>;
  }
}
```

**Validation:**

| Check | Failure |
|-------|---------|
| Source and destination spaces exist | No-op |
| Entity exists | No-op |
| Entity is in source space | No-op (also guards React StrictMode double-invocation) |
| Destination accepts entity | **Rollback** to source, no event |

**Events:** `ENTITY_MOVED` on success.

```
dispatch(MOVE_ENTITY_BETWEEN_SPACES)
  |
  v
Validate all references exist
  |
  v
Check entity in source (StrictMode guard: if already at dest, skip)
  |
  v
Remove from source: gridRemove() / poolRemove()
  |
  v
Add to destination: gridCanAccept() + gridAdd() / poolAdd()
  |
  +-- Success: emit ENTITY_MOVED { fromSpaceId, toSpaceId, fromPosition, toPosition }
  |
  +-- Failure: ROLLBACK entity to source space (no event)
```

**This is the primary action for drag-and-drop.** The `DragContext` calls this on drop.

---

### UPDATE_ENTITY_POSITION

Moves an entity within the same grid space to a new position.

```typescript
{
  type: "UPDATE_ENTITY_POSITION";
  payload: {
    entityId: string;
    spaceId: string;
    position: Record<string, unknown>;
  }
}
```

**Validation:** Entity and space must exist. Entity must be in the space. Grid only.
**Events:** None (position update is silent).

```
dispatch(UPDATE_ENTITY_POSITION)
  |
  v
Validate entity in space + gridCanAccept(newPos)
  |
  v
gridRemove(entity) -> gridAdd(entity, newPos)
  |
  v
(no events emitted)
```

---

### SWAP_ENTITIES

Swaps positions of two entities. Works within or across grid spaces.

```typescript
{
  type: "SWAP_ENTITIES";
  payload: {
    entity1Id: string; space1Id: string;
    entity2Id: string; space2Id: string;
  }
}
```

**Validation:** Both spaces must be grids. Both entities must be in their respective spaces.
**Events:** Two `ENTITY_MOVED` events (one per entity).

```
dispatch(SWAP_ENTITIES)
  |
  v
Validate both spaces are grids + both entities present
  |
  v
Same space: remove both -> add at swapped positions
Diff space: remove both -> add at cross positions
  |
  v
emit ENTITY_MOVED x2 (entity1 and entity2)
```

---

## Entity Actions

### CREATE_ENTITY

Adds a new entity to the game.

```typescript
{ type: "CREATE_ENTITY"; payload: { entity: EntityData } }
```

**Validation:** No-op if entity ID already exists (prevents duplicates).
**Events:** None.

---

### UPDATE_ENTITY

Updates entity properties (name, visual, data, state, draggable).

```typescript
{
  type: "UPDATE_ENTITY";
  payload: {
    entityId: string;
    updates: {
      name?: string;
      draggable?: boolean;
      visual?: EntityVisual;
      data?: Record<string, unknown>;
      state?: Record<string, unknown>;
    }
  }
}
```

**Validation:** No-op if entity doesn't exist. Skips unchanged fields.
**Events:** `ENTITY_UPDATED` with only the changed fields.

```
dispatch(UPDATE_ENTITY { entityId, updates })
  |
  v
Compare each field against current value
  |
  v
Mutate only changed fields
  |
  v
emit ENTITY_UPDATED { entityId, updates: { ...changedOnly } }
  (no event if nothing changed)
```

---

### UPDATE_ENTITY_STATE

Updates the `state` record on an entity. Convenience action for partial state merges.

```typescript
{
  type: "UPDATE_ENTITY_STATE";
  payload: { entityId: string; state: Record<string, unknown> }
}
```

**Validation:** No-op if entity doesn't exist or state unchanged.
**Events:** `ENTITY_UPDATED` with `updates: { state: ... }`.

---

### DELETE_ENTITY

Removes an entity from state. Also removes it from all spaces it occupies.

```typescript
{ type: "DELETE_ENTITY"; payload: { entityId: string } }
```

**Validation:** No-op if entity doesn't exist.
**Events:** None (silent removal).

```
dispatch(DELETE_ENTITY { entityId })
  |
  v
For each space: if contains entity -> gridRemove() / poolRemove()
  |
  v
delete state.entities[entityId]
```

---

### DELETE_ENTITIES

Batch delete. Same behavior as DELETE_ENTITY for multiple entities.

```typescript
{ type: "DELETE_ENTITIES"; payload: { entityIds: string[] } }
```

---

## UI Actions (Modals)

### OPEN_MODAL

Opens or shows a modal.

```typescript
{ type: "OPEN_MODAL"; payload: ModalInstance }
```

**Validation:** If modal already exists and is visible, no-op.
**Events:** `MODAL_OPENED`.

```
dispatch(OPEN_MODAL { id, title, content, actions })
  |
  v
Modal exists + visible? -> no-op
Modal exists + hidden?  -> set visible: true  -> emit MODAL_OPENED
New modal?              -> create + visible   -> emit MODAL_OPENED
```

---

### CLOSE_MODAL

Hides a specific modal or all visible modals.

```typescript
{ type: "CLOSE_MODAL"; payload?: { modalId?: string } }
```

**Events:** `MODAL_CLOSED` (one per modal closed, with `reason: "programmatic"`).

```
dispatch(CLOSE_MODAL { modalId })
  |
  v
modalId provided?
  yes -> close that modal -> emit MODAL_CLOSED
  no  -> close ALL visible modals -> emit MODAL_CLOSED x N
```

---

### MODAL_SUBMITTED

Records a modal form submission.

```typescript
{
  type: "MODAL_SUBMITTED";
  payload: {
    modalId: string;
    modalActionId: string;
    values: Record<string, unknown>;
  }
}
```

**Events:** `MODAL_SUBMITTED` (always, no validation in reducer).

This is how question pages receive user input from modal forms.

---

## Core Actions

### SET_PHASE

Transitions the game phase.

```typescript
{ type: "SET_PHASE"; payload: { phase: GamePhase } }
```

**Validation:** No-op if same phase.
**Events:** `PHASE_CHANGED`.

---

### COMPLETE_QUESTION

Marks the question as completed.

```typescript
{ type: "COMPLETE_QUESTION" }
```

**Events:** None.
**Side effects:** `state.question.status = "completed"`

---

### ACK_EVENTS

Acknowledges events up to a cursor position for a specific engine.

```typescript
{ type: "ACK_EVENTS"; payload: { engineId: string; cursor: number } }
```

**Validation:** Cursor must advance forward. Clamped to `lastEventId`.
**Events:** None.
**Side effects:** `state.eventCursors[engineId] = cursor`

---

### EMIT_EVENTS

Injects events directly into the queue (used by engines/providers that need to emit
events without a reducer mutation, e.g., TerminalProvider emitting TERMINAL_INPUT).

```typescript
{ type: "EMIT_EVENTS"; payload: { events: GameEventInput[] } }
```

**Validation:** No-op if events array is empty.
**Events:** The provided events are appended to the queue.

---

## Legacy Actions (Deprecated)

These actions exist for backward compatibility. They are internally mapped to modern actions.

| Legacy Action | Maps To | Notes |
|--------------|---------|-------|
| `PLACE_ITEM` | `ADD_ENTITY_TO_SPACE` | Uses `blockX`/`blockY` -> `{ row, col }` |
| `REMOVE_ITEM` | `REMOVE_ENTITY_FROM_SPACE` | Finds entity by grid position |
| `REPOSITION_ITEM` | `UPDATE_ENTITY_POSITION` | Uses `blockX`/`blockY` |
| `TRANSFER_ITEM` | `MOVE_ENTITY_BETWEEN_SPACES` | Uses `fromSpace`/`toSpace` strings |
| `SWAP_ITEMS` | `SWAP_ENTITIES` | Finds entities by grid positions |
| `ADD_POOL_GROUP` | `CREATE_ENTITY` (x N) | Creates entities from InventoryGroupConfig |
| `UPDATE_POOL_GROUP` | `UPDATE_ENTITY` (x N) | Updates entities from item configs |
| `UPDATE_POOL_ITEM_TOOLTIP` | `UPDATE_ENTITY` | Sets `data.tooltip` |
| `REMOVE_POOL_GROUP` | (no-op) | Not fully implemented |
| `PURGE_POOL_ITEMS` | `DELETE_ENTITIES` | Batch delete by item IDs |
| `CONFIGURE_DEVICE` | `UPDATE_ENTITY` | Sets `data` from config |

**Do not use legacy actions in new code.** Use the modern equivalents directly.
