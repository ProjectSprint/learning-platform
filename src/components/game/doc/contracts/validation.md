# Validation Contracts

> Authoritative reference for all validation rules in the game engine.
> Source: `domain/space/validation.ts`, `domain/space/space-fns.ts`, `application/state/reducers/`

## When to Read

- You need to understand why a placement was rejected
- You are implementing drag-and-drop validation
- You need to pre-validate before dispatching an action
- You are debugging "nothing happened" after a dispatch

---

## Validation Layers

Validation happens at two levels:

```
1. Pre-dispatch (optional, recommended)
   Question code calls canEntityBePlaced() before dispatch
   |
   v
2. In-reducer (mandatory, always runs)
   Reducer validates internally; silently no-ops on failure
```

**Pre-dispatch validation** is for UI feedback (show invalid drop targets).
**In-reducer validation** is the safety net (prevents invalid state transitions).

Both use the same underlying pure functions.

---

## Grid Validation Rules

These rules apply to `GridSpaceData` operations.

### Bounds Check

```
isInBounds(position, space.rows, space.cols)
```

Position must satisfy:
- `0 <= row < rows`
- `0 <= col < cols`

**Checked by:** `gridAdd`, `gridCanAccept`

### Capacity Check

```
Object.keys(space.entityPositions).length < space.maxCapacity
```

If `maxCapacity` is `undefined`, capacity is unlimited.

Exception: If the entity is already in the space (move within same space), it doesn't
count against capacity.

**Checked by:** `gridAdd`, `gridCanAccept`

### Cell Occupancy Check

```
// When allowMultiplePerCell is false (default):
No other entity at the same { row, col }
```

If `space.allowMultiplePerCell` is `true`, this check is skipped.

**Checked by:** `gridAdd`, `gridCanAccept`

### Combined Grid Validation

```
gridCanAccept(space, entityId, position): boolean
  |
  +-- isInBounds(position, rows, cols)?        -> false
  +-- capacity full (excluding this entity)?   -> false
  +-- cell occupied by another entity?         -> false
  |
  v
  true
```

---

## Pool Validation Rules

These rules apply to `PoolSpaceData` operations.

### Capacity Check

```
space.entityIds.length < space.maxCapacity
```

If `maxCapacity` is `undefined`, capacity is unlimited.

Exception: If the entity is already in the pool (reorder case), it doesn't count
against capacity.

**Checked by:** `poolAdd`

### No Position Validation

Pools don't validate positions. The `index` parameter in `poolAdd` is clamped to
`[0, entityIds.length]` silently. Out-of-range indices are corrected, not rejected.

---

## Entity Placement Validation

The top-level validation function for drag-and-drop:

### canEntityBePlaced

```
canEntityBePlaced(gameState, entityId, toSpaceId, toPosition?)
  |
  v
Step 1: Entity exists?
  |  state.entities[entityId] must exist
  |  FAIL: entity not found -> false
  v
Step 2: Target space exists?
  |  state.spaces[toSpaceId] must exist
  |  FAIL: space not found -> false
  v
Step 3: Entity is an item?
  |  isItemData(entity) checks for allowedPlaces + draggable
  |  FAIL: not an item (plain entity) -> false
  v
Step 4: Item allowed in target space?
  |  entity.allowedPlaces.includes(toSpaceId)
  |  FAIL: space not in allowedPlaces -> false
  v
Step 5: Space-specific validation
  |
  +-- Grid + position: gridCanAccept(space, entityId, position)
  |     -> bounds + capacity + occupancy checks
  |
  +-- Pool (no position needed): capacity check
  |     -> maxCapacity not exceeded
  |
  +-- Neither match: false
  v
true
```

### findEntitySpace

Locates an entity's current space (useful for building `MOVE_ENTITY_BETWEEN_SPACES` payloads):

```
findEntitySpace(gameState, entityId): string | null
  |
  v
For each space in state.spaces:
  spaceContains(space, entityId)?
    yes -> return spaceId
  |
  v
null (entity not in any space)
```

---

## Reducer-Level Validation

Each reducer validates internally. When validation fails, the reducer returns the
original state unchanged (**no-op**). No error is thrown, no event is emitted.

### Space Reducer Validation Table

| Action | Validations | On Failure |
|--------|------------|------------|
| `CREATE_SPACE` | None | Overwrites existing |
| `REMOVE_SPACE` | Space exists | No-op |
| `ADD_ENTITY_TO_SPACE` | Entity + space exist, grid: `gridCanAccept`, pool: capacity | No-op |
| `REMOVE_ENTITY_FROM_SPACE` | Entity + space exist, entity in space | No-op |
| `MOVE_ENTITY_BETWEEN_SPACES` | Both spaces + entity exist, entity in source, dest accepts | **Rollback** to source |
| `UPDATE_ENTITY_POSITION` | Entity + space exist, entity in space, grid: `gridCanAccept` | No-op |
| `SWAP_ENTITIES` | Both spaces are grids, both entities in respective spaces | No-op |

### Entity Reducer Validation Table

| Action | Validations | On Failure |
|--------|------------|------------|
| `CREATE_ENTITY` | No duplicate ID | No-op (skip) |
| `UPDATE_ENTITY` | Entity exists, at least one field changed | No-op |
| `UPDATE_ENTITY_STATE` | Entity exists, state actually changed | No-op |
| `DELETE_ENTITY` | Entity exists | No-op |
| `DELETE_ENTITIES` | Non-empty array | No-op |

### UI Reducer Validation Table

| Action | Validations | On Failure |
|--------|------------|------------|
| `OPEN_MODAL` | If modal exists and already visible | No-op |
| `CLOSE_MODAL` | At least one modal is visible | No-op |
| `MODAL_SUBMITTED` | None (always emits event) | - |

### Core Reducer Validation Table

| Action | Validations | On Failure |
|--------|------------|------------|
| `SET_PHASE` | Phase must differ from current | No-op |
| `COMPLETE_QUESTION` | None | Always succeeds |
| `ACK_EVENTS` | Cursor must advance forward | No-op |
| `EMIT_EVENTS` | Non-empty events array | No-op |

---

## MOVE_ENTITY_BETWEEN_SPACES Rollback

This is the only action with rollback behavior. If the destination rejects the entity
after it's been removed from the source:

```
1. Remove entity from source      -- succeeds
2. Add entity to destination       -- FAILS
3. Rollback: add entity back to source
4. Return original state (no event emitted)
```

The rollback re-adds to the source at:
- **Grid:** the original position (via `gridGetPosition` before removal)
- **Pool:** index 0 (beginning of list)

---

## React StrictMode Guard

`MOVE_ENTITY_BETWEEN_SPACES` has a special guard for React StrictMode double-invocation:

```
If entity is NOT in source space:
  Check if entity is already in destination
    yes -> silent return (StrictMode re-invoked the same action)
    no  -> return (invalid state)
```

This prevents the action from failing on the second invocation when React re-runs effects.

---

## Validation Decision Tree

Use this to determine what validation to apply:

```
Is this a drag-and-drop?
  |
  yes -> canEntityBePlaced(state, entityId, toSpaceId, toPosition)
  |        |
  |        +-- true  -> dispatch MOVE_ENTITY_BETWEEN_SPACES or ADD_ENTITY_TO_SPACE
  |        +-- false -> show invalid drop indicator (UI)
  |
  no -> Is this a programmatic placement?
          |
          yes -> Just dispatch the action; reducer validates internally
          |
          no -> Is this a query/check?
                  |
                  yes -> Use gridCanAccept / poolIsFull / etc.
```
