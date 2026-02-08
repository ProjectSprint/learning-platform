# Guide: Immer Patterns

> How to write reducers and mutation functions using Immer.
> For type definitions, see [contracts/types.md](../contracts/types.md).
> For function signatures, see [contracts/functions.md](../contracts/functions.md).

## When to Read

- You are writing or modifying a reducer
- You are writing domain mutation functions
- You need to understand why `Map` and classes aren't used
- You hit an Immer error and need to debug it

---

## Why Immer

The game engine uses `useReducer` with immutable state. Without Immer, every update
requires manual spread operations:

```typescript
// Without Immer (verbose, error-prone)
return {
  ...state,
  spaces: {
    ...state.spaces,
    [spaceId]: {
      ...state.spaces[spaceId],
      entityPositions: {
        ...state.spaces[spaceId].entityPositions,
        [entityId]: position,
      },
    },
  },
};
```

With Immer's `produce`, you write mutable-looking code that produces immutable updates:

```typescript
// With Immer (readable, safe)
return produce(state, (draft) => {
  draft.spaces[spaceId].entityPositions[entityId] = position;
});
```

---

## Reducer Pattern

Every reducer follows this shape:

```typescript
import { produce } from "immer";

export const myReducer = (state: GameState, action: MyAction): GameState => {
  switch (action.type) {
    case "MY_ACTION": {
      return produce(state, (draft) => {
        // Mutate draft directly - Immer tracks changes
        draft.entities[id].state.status = "active";

        // Emit events
        const actionId = getNextActionId(draft.eventQueue);
        draft.eventQueue = appendEvents(draft.eventQueue, actionId, [
          { type: "ENTITY_UPDATED", entityId: id, updates: { state: { status: "active" } } },
        ]);
      });
    }
    default:
      return state;
  }
};
```

### Rules Inside produce()

1. **Mutate draft directly** - no spread needed
2. **Don't return AND mutate** - do one or the other
3. **Return early for no-ops** - `return` (no value) inside produce exits without changes
4. **Reassign for wholesale replacement** - `draft.eventQueue = newQueue`

---

## Plain Data Constraint

Immer's `produce()` only works with plain objects and arrays. This is why:

- **No `Map` or `Set`** - Use `Record<string, T>` instead
- **No classes** - Use plain type objects with factory functions
- **No `Date`** - Use epoch numbers (`timestamp?: number`)

```typescript
// BAD - Immer can't draft this
type GameState = {
  spaces: Map<string, SpaceData>;  // Map is not draftable
};

// GOOD - Plain object, fully draftable
type GameState = {
  spaces: Record<string, SpaceData>;
};
```

---

## Mutation Functions

Domain functions like `gridAdd` and `poolRemove` mutate data in-place. They are designed
to be called **inside** `produce()`:

```typescript
// Inside a reducer
return produce(state, (draft) => {
  const space = draft.spaces[spaceId];

  // gridAdd mutates the draft space in-place
  const added = gridAdd(space, entityId, position);
  if (!added) return; // early return = no changes

  // poolRemove mutates the draft space in-place
  poolRemove(draft.spaces["inventory"], entityId);
});
```

### Type Safety with Draft<T>

Immer wraps types in `Draft<T>`, which makes all properties mutable. Domain functions
accept the base types but work correctly with drafts because:

1. `Draft<GridSpaceData>` is assignable to `GridSpaceData` for mutation
2. The functions only mutate properties, never replace the whole object
3. No class methods or prototypes to break

---

## Common Patterns

### Nested Object Update

```typescript
return produce(state, (draft) => {
  // Direct property mutation
  draft.entities[id].visual.color = "green";
  draft.entities[id].state.configured = true;
});
```

### Array Manipulation

```typescript
return produce(state, (draft) => {
  // Push to array
  draft.spaces[id].entityIds.push(entityId);

  // Remove from array
  const idx = draft.spaces[id].entityIds.indexOf(entityId);
  if (idx !== -1) draft.spaces[id].entityIds.splice(idx, 1);
});
```

### Conditional Updates

```typescript
return produce(state, (draft) => {
  const entity = draft.entities[id];
  if (!entity) return; // No-op if entity doesn't exist

  // Only update if value actually changed
  if (entity.state.status === newStatus) return;
  entity.state.status = newStatus;
});
```

### Object.assign for Partial Merges

```typescript
return produce(state, (draft) => {
  Object.assign(draft.entities[id].data, updates.data);
  Object.assign(draft.entities[id].state, updates.state);
});
```

### Delete from Record

```typescript
return produce(state, (draft) => {
  delete draft.entities[id];
  delete draft.spaces[spaceId].entityPositions[entityId];
});
```

---

## Event Emission Pattern

Events must be appended atomically within the same `produce()` call:

```typescript
return produce(state, (draft) => {
  const actionId = getNextActionId(draft.eventQueue);
  const events: GameEventInput[] = [];

  // Do mutations
  const added = gridAdd(draft.spaces[spaceId], entityId, position);
  if (added) {
    events.push({
      type: "ENTITY_ENTERED_SPACE",
      entityId,
      spaceId,
      position,
    });
  }

  // Append events at the end
  if (events.length > 0) {
    draft.eventQueue = appendEvents(draft.eventQueue, actionId, events);
  }
});
```

**Note:** `appendEvents` returns a new queue object, so use `=` assignment, not mutation.

---

## Pitfalls

### Returning a Value Inside produce

```typescript
// BAD - produces return value, ignoring draft mutations
return produce(state, (draft) => {
  draft.entities[id].name = "New";
  return state; // This overrides all draft changes!
});

// GOOD - either mutate draft OR return, never both
return produce(state, (draft) => {
  draft.entities[id].name = "New";
  // No return = Immer uses the mutated draft
});
```

### Spreading Inside produce (Unnecessary)

```typescript
// UNNECESSARY - Immer handles immutability
return produce(state, (draft) => {
  draft.entities[id] = { ...draft.entities[id], name: "New" }; // Works but wasteful
});

// BETTER - Direct mutation
return produce(state, (draft) => {
  draft.entities[id].name = "New";
});
```

### Accessing Draft Outside produce

```typescript
// BAD - draft is only valid inside produce callback
let savedDraft;
return produce(state, (draft) => {
  savedDraft = draft; // Don't do this
});
savedDraft.entities[id].name = "New"; // Error: draft is revoked
```

### Non-Draftable Values

```typescript
// BAD - Map inside state
return produce(state, (draft) => {
  draft.entities.set(id, entity); // Error: entities is Record, not Map
});

// GOOD - Use Record operations
return produce(state, (draft) => {
  draft.entities[id] = entity;
});
```

---

## When Not to Use Immer

Some reducers don't use `produce()` because the update is a simple top-level spread:

```typescript
// Simple enough without Immer
case "SET_PHASE":
  return {
    ...state,
    phase: action.payload.phase,
    eventQueue: appendEvents(state.eventQueue, ...),
  };
```

Use `produce()` when:
- You need to mutate nested objects (2+ levels deep)
- You need to call domain mutation functions (gridAdd, poolRemove)
- The update is conditional and may result in no-op
