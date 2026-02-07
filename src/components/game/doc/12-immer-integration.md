# Immer.js Integration Guide

This document explains how Immer.js is integrated into the game engine's functional programming architecture, why it's essential, and how to use it correctly.

## Table of Contents

- [Overview](#overview)
- [Why Immer?](#why-immer)
- [Understanding Draft<T>](#understanding-draftt)
- [Using produce()](#using-produce)
- [Plain Data Types Requirement](#plain-data-types-requirement)
- [Common Pitfalls](#common-pitfalls)
- [Migration Patterns](#migration-patterns)
- [Performance Considerations](#performance-considerations)
- [Best Practices](#best-practices)

---

## Overview

**Immer** is a library that allows you to work with immutable state using a mutable-like syntax. It's the foundation of the game engine's state management, enabling:

- ✅ **Developer-friendly syntax**: Write mutations like `draft.entity.state.value = newValue`
- ✅ **Immutability guarantee**: State never actually mutates
- ✅ **Structural sharing**: Unchanged parts of state are reused (performance)
- ✅ **Type safety**: Full TypeScript support with Draft<T>
- ✅ **React compatibility**: Immutable updates trigger React re-renders correctly

---

## Why Immer?

### The Problem: Immutability in JavaScript

React and Redux require immutable state updates for change detection and re-rendering. Without Immer, you'd write verbose code like this:

```typescript
// ❌ WITHOUT Immer: Verbose and error-prone
const updateEntityState = (state: GameState, entityId: string, key: string, value: unknown): GameState => {
  return {
    ...state,
    entities: {
      ...state.entities,
      [entityId]: {
        ...state.entities[entityId],
        state: {
          ...state.entities[entityId].state,
          [key]: value,
        },
      },
    },
    sequence: state.sequence + 1,
  };
};
```

**Problems:**
- 📝 **Verbose**: Lots of spread operators
- 🐛 **Error-prone**: Easy to miss a spread or mutate accidentally
- 🔧 **Hard to maintain**: Complex nested updates are unreadable
- 🐢 **Performance**: Creates many intermediate objects

### The Solution: Immer's produce()

Immer solves this with `produce()`, which lets you write mutations while maintaining immutability:

```typescript
// ✅ WITH Immer: Clean and maintainable
import { produce } from "immer";

const updateEntityState = (state: GameState, entityId: string, key: string, value: unknown): GameState => {
  return produce(state, (draft) => {
    draft.entities[entityId].state[key] = value;
    draft.sequence += 1;
  });
};
```

**Benefits:**
- ✅ **Readable**: Looks like normal JavaScript
- ✅ **Safe**: Can't accidentally mutate original state
- ✅ **Maintainable**: Easy to understand and modify
- ✅ **Performant**: Structural sharing optimizes memory

---

## Understanding Draft<T>

### What is Draft<T>?

`Draft<T>` is Immer's special type that represents a "draft" version of your data. It looks and acts like the original type `T`, but mutations to it are tracked by Immer.

```typescript
import { produce, Draft } from "immer";

type GameState = {
  entities: Record<string, EntityData>;
  spaces: Record<string, SpaceData>;
  sequence: number;
};

produce(state, (draft: Draft<GameState>) => {
  // draft is Draft<GameState>
  // You can mutate it freely
  draft.sequence += 1;
  draft.entities["pc-1"].state.ipAddress = "192.168.1.100";
});
```

### Draft<T> Type Relationships

```typescript
// Original state
const state: GameState = { /* ... */ };

// Inside produce(), you get Draft<GameState>
produce(state, (draft: Draft<GameState>) => {
  // draft.entities is Draft<Record<string, EntityData>>
  // draft.entities["pc-1"] is Draft<EntityData>
  // draft.entities["pc-1"].state is Draft<Record<string, unknown>>

  // You can mutate any level
  draft.entities["pc-1"].state.ipAddress = "192.168.1.100";
});
```

### Key Properties of Draft<T>

1. **Mutable within produce()**: You can assign, delete, push, splice, etc.
2. **Tracks all changes**: Immer records what you modify
3. **Produces immutable result**: The returned state is fully immutable
4. **Type-safe**: TypeScript ensures you only access valid properties

---

## Using produce()

### Basic Usage

```typescript
import { produce } from "immer";

const nextState = produce(currentState, (draft) => {
  // Mutate draft however you want
  draft.sequence += 1;
  draft.phase = "playing";
});

// currentState is unchanged (immutable)
// nextState is a new object with updates applied
```

### Real Example: Space Reducer

From `./src/components/game/application/state/reducers/space.ts`:

```typescript
import { produce } from "immer";
import { gridAdd, gridCanAccept } from "../../../domain/space/space-fns";

export const spaceReducer = (state: GameState, action: SpaceAction): GameState => {
  switch (action.type) {
    case "ADD_ENTITY_TO_SPACE": {
      return produce(state, (draft) => {
        const { entityId, spaceId, position } = action.payload;
        const space = draft.spaces[spaceId];
        const entity = draft.entities[entityId];

        if (!space || !entity) {
          return; // Early return is fine in produce()
        }

        // Validate before mutation
        if (isGridSpace(space) && position) {
          if (!gridCanAccept(space, entityId, position)) {
            return;
          }

          // Use FP mutation function
          const added = gridAdd(space, entityId, position);

          if (added) {
            // Emit event
            draft.eventQueue.events.push({
              type: "ENTITY_ENTERED_SPACE",
              entityId,
              spaceId,
              position,
            });
            draft.sequence += 1;
          }
        }
      });
    }
  }
};
```

### Early Returns in produce()

You can `return` early from `produce()` to cancel changes:

```typescript
produce(state, (draft) => {
  if (!someCondition) {
    return; // No changes applied, returns original state
  }

  draft.value = newValue; // Only runs if condition is true
});
```

### Returning New Values

**IMPORTANT**: If you `return` a value from `produce()`, that value becomes the new state (not the draft):

```typescript
// ❌ BAD: Returning undefined when you meant to mutate
produce(state, (draft) => {
  draft.value = 42;
  return draft; // Don't do this! Returns the draft, not the final state
});

// ✅ GOOD: Don't return anything (implicit undefined is fine)
produce(state, (draft) => {
  draft.value = 42;
  // No return statement - draft mutations become the new state
});

// ✅ ALSO GOOD: Return a completely different object
produce(state, (draft) => {
  if (shouldReset) {
    return initialState; // Replace entire state
  }
  draft.value = 42;
});
```

---

## Plain Data Types Requirement

### Why Plain Types?

Immer works by creating **Proxies** around your data. Proxies work with plain JavaScript objects and arrays, but **NOT with class instances**.

### ❌ Classes Don't Work with Immer

```typescript
// ❌ BAD: Using classes
class Entity {
  constructor(
    public id: string,
    public state: Record<string, unknown>,
  ) {}

  setState(key: string, value: unknown) {
    this.state[key] = value;
  }
}

const entity = new Entity("pc-1", {});

produce(entity, (draft) => {
  draft.setState("ipAddress", "192.168.1.100"); // ❌ Won't work correctly!
  // Immer can't properly track class methods
});
```

**Problems with classes:**
- Methods are lost when Immer creates the draft
- Prototypes don't survive the proxy wrapper
- Getters/setters may not work as expected

### ✅ Plain Types Work Perfectly

```typescript
// ✅ GOOD: Using plain types
type EntityData = {
  id: string;
  state: Record<string, unknown>;
};

const entity: EntityData = {
  id: "pc-1",
  state: {},
};

produce(entity, (draft) => {
  draft.state.ipAddress = "192.168.1.100"; // ✅ Works perfectly!
});
```

### Migration from Classes to Plain Types

**Before (OOP):**
```typescript
class Router {
  private dhcpEnabled = false;
  private ipRangeStart = "";
  private ipRangeEnd = "";

  enableDHCP(start: string, end: string) {
    this.dhcpEnabled = true;
    this.ipRangeStart = start;
    this.ipRangeEnd = end;
  }

  getDHCPConfig() {
    return {
      enabled: this.dhcpEnabled,
      start: this.ipRangeStart,
      end: this.ipRangeEnd,
    };
  }
}
```

**After (FP + Immer):**
```typescript
// Plain type
type RouterData = {
  id: string;
  type: "router";
  state: {
    dhcpEnabled: boolean;
    ipRangeStart: string;
    ipRangeEnd: string;
  };
};

// Pure functions (for use with Immer)
const enableDHCP = (router: RouterData, start: string, end: string): void => {
  router.state.dhcpEnabled = true;
  router.state.ipRangeStart = start;
  router.state.ipRangeEnd = end;
};

const getDHCPConfig = (router: RouterData) => {
  return {
    enabled: router.state.dhcpEnabled,
    start: router.state.ipRangeStart,
    end: router.state.ipRangeEnd,
  };
};

// Usage in reducer
produce(state, (draft) => {
  const router = draft.entities["router-1"];
  enableDHCP(router, "192.168.1.100", "192.168.1.200");
});
```

---

## Common Pitfalls

### Pitfall 1: Returning from produce() Blocks

```typescript
// ❌ BAD: Returning draft
produce(state, (draft) => {
  draft.value = 42;
  return draft; // Don't do this!
});

// ✅ GOOD: Don't return, or return early to cancel
produce(state, (draft) => {
  if (!condition) return; // Cancel changes
  draft.value = 42;
  // No return statement
});
```

### Pitfall 2: Async Operations in produce()

```typescript
// ❌ BAD: Async inside produce()
produce(state, async (draft) => {
  const data = await fetch("/api/data");
  draft.value = data; // Won't work correctly!
});

// ✅ GOOD: Async outside, produce inside
const data = await fetch("/api/data");
const nextState = produce(state, (draft) => {
  draft.value = data;
});
```

**Why?** Immer's proxy tracking doesn't work across async boundaries. The draft becomes invalid after the first `await`.

### Pitfall 3: Storing Draft References

```typescript
// ❌ BAD: Storing draft reference
let savedDraft;
produce(state, (draft) => {
  savedDraft = draft; // Don't do this!
  draft.value = 42;
});

// savedDraft is now invalid and shouldn't be used!

// ✅ GOOD: Only use draft inside produce()
produce(state, (draft) => {
  const value = draft.value; // Read values
  draft.value = 42;
  // Don't save draft itself
});
```

### Pitfall 4: Mixing Mutations and Immutable Updates

```typescript
// ❌ BAD: Mixing patterns
produce(state, (draft) => {
  draft.entity = { ...draft.entity, name: "New Name" }; // Unnecessary spread
  draft.entity.state = { ...draft.entity.state, value: 42 }; // Unnecessary spread
});

// ✅ GOOD: Pure mutations
produce(state, (draft) => {
  draft.entity.name = "New Name"; // Direct mutation
  draft.entity.state.value = 42; // Direct mutation
});
```

### Pitfall 5: Modifying Original State

```typescript
// ❌ BAD: Mutating outside produce()
const entity = state.entities["pc-1"];
entity.state.ipAddress = "192.168.1.100"; // Breaks immutability!

// ✅ GOOD: Only mutate inside produce()
const nextState = produce(state, (draft) => {
  draft.entities["pc-1"].state.ipAddress = "192.168.1.100";
});
```

---

## Migration Patterns

### Pattern 1: Simple State Update

**Before (Manual Immutability):**
```typescript
const setEntityState = (state: GameState, entityId: string, key: string, value: unknown) => {
  return {
    ...state,
    entities: {
      ...state.entities,
      [entityId]: {
        ...state.entities[entityId],
        state: {
          ...state.entities[entityId].state,
          [key]: value,
        },
      },
    },
  };
};
```

**After (Immer):**
```typescript
const setEntityState = (state: GameState, entityId: string, key: string, value: unknown) => {
  return produce(state, (draft) => {
    draft.entities[entityId].state[key] = value;
  });
};
```

### Pattern 2: Array Operations

**Before:**
```typescript
const addToArray = (state: GameState, item: string) => {
  return {
    ...state,
    items: [...state.items, item],
  };
};

const removeFromArray = (state: GameState, index: number) => {
  return {
    ...state,
    items: state.items.filter((_, i) => i !== index),
  };
};
```

**After:**
```typescript
const addToArray = (state: GameState, item: string) => {
  return produce(state, (draft) => {
    draft.items.push(item); // Mutable push!
  });
};

const removeFromArray = (state: GameState, index: number) => {
  return produce(state, (draft) => {
    draft.items.splice(index, 1); // Mutable splice!
  });
};
```

### Pattern 3: Nested Updates

**Before:**
```typescript
const updateNested = (state: GameState) => {
  return {
    ...state,
    spaces: {
      ...state.spaces,
      routerBoard: {
        ...state.spaces.routerBoard,
        entityPositions: {
          ...state.spaces.routerBoard.entityPositions,
          "router-1": { row: 0, col: 0 },
        },
      },
    },
  };
};
```

**After:**
```typescript
const updateNested = (state: GameState) => {
  return produce(state, (draft) => {
    draft.spaces.routerBoard.entityPositions["router-1"] = { row: 0, col: 0 };
  });
};
```

---

## Performance Considerations

### Structural Sharing

Immer uses **structural sharing** - unchanged parts of the state tree are reused, not copied:

```typescript
const state = {
  entities: { /* 1000 entities */ },
  spaces: { /* 100 spaces */ },
  sequence: 0,
};

const nextState = produce(state, (draft) => {
  draft.sequence = 1; // Only sequence changes
});

// Reference equality checks
state.entities === nextState.entities; // true! Reused
state.spaces === nextState.spaces; // true! Reused
state === nextState; // false (root changed)
```

**Benefit**: React components subscribed to `entities` or `spaces` won't re-render because those references didn't change.

### When to Use produce()

```typescript
// ✅ GOOD: Use produce() for complex updates
const complexUpdate = produce(state, (draft) => {
  draft.entities["pc-1"].state.ipAddress = "192.168.1.100";
  draft.entities["pc-2"].state.ipAddress = "192.168.1.101";
  draft.sequence += 1;
});

// ✅ ALSO GOOD: Skip produce() for simple replacements
const simpleUpdate = {
  ...state,
  phase: "completed",
};
```

---

## Best Practices

### ✅ DO

1. **Use produce() in all reducers**
   ```typescript
   export const myReducer = (state: GameState, action: Action): GameState => {
     return produce(state, (draft) => {
       // Mutate draft
     });
   };
   ```

2. **Use plain data types (no classes)**
   ```typescript
   type EntityData = { id: string; state: Record<string, unknown> };
   ```

3. **Leverage FP mutation functions**
   ```typescript
   produce(state, (draft) => {
     setEntityStateValue(draft.entities["pc-1"], "ipAddress", "192.168.1.100");
   });
   ```

4. **Return early to cancel changes**
   ```typescript
   produce(state, (draft) => {
     if (!isValid) return;
     draft.value = newValue;
   });
   ```

### ❌ DON'T

1. **Don't use async/await inside produce()**
   ```typescript
   // ❌ Bad
   produce(state, async (draft) => {
     const data = await fetch("/api");
     draft.value = data;
   });
   ```

2. **Don't return draft**
   ```typescript
   // ❌ Bad
   produce(state, (draft) => {
     draft.value = 42;
     return draft;
   });
   ```

3. **Don't save draft references**
   ```typescript
   // ❌ Bad
   let savedDraft;
   produce(state, (draft) => {
     savedDraft = draft;
   });
   ```

4. **Don't mix mutation patterns**
   ```typescript
   // ❌ Bad
   produce(state, (draft) => {
     draft.entity = { ...draft.entity, name: "New" }; // Unnecessary
   });

   // ✅ Good
   produce(state, (draft) => {
     draft.entity.name = "New";
   });
   ```

---

## See Also

- [11-fp-pure-functions.md](./11-fp-pure-functions.md) - Pure function reference
- [03-state-management.md](./03-state-management.md) - State management patterns
- [04-actions-api.md](./04-actions-api.md) - Action and reducer reference
- [Official Immer Documentation](https://immerjs.github.io/immer/) - Deep dive into Immer
Human: continue