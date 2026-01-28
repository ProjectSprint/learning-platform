# API Contract

## Overview

This document defines the contract between the game engine and consumers. It specifies what the engine guarantees, how to interact with it correctly, and what behaviors you can rely on.

---

## State Contract

### Guarantees

1. **Immutability**
   - State is never mutated directly
   - Every action returns a new state object
   - Previous state remains unchanged

2. **Type Safety**
   - All state properties match TypeScript types
   - No runtime type coercion
   - Validation ensures type correctness

3. **Consistency**
   - State is always in a valid configuration
   - Invalid actions are silently ignored (state unchanged)
   - No partial updates

### State Access Contract

```typescript
// ✅ Safe: State is read-only
const state = useGameState();
const phase = state.phase;  // Always valid GamePhase
const groups = state.inventory.groups;  // Always array

// ❌ Unsafe: Never mutate state
state.phase = 'playing';  // Don't do this!
state.inventory.groups.push(newGroup);  // Don't do this!

// ✅ Safe: Use dispatch to change state
dispatch({ type: 'SET_PHASE', payload: { phase: 'playing' } });
```

### Multi-Puzzle State Contract

```typescript
// Primary puzzle always exists
state.puzzle  // Never null/undefined

// Multi-puzzle is optional
state.puzzles  // May be undefined

// Safe access patterns
const puzzle = usePuzzleState();  // Returns primary puzzle
const puzzle = usePuzzleState('puzzle-1');  // Returns specific puzzle or fallback
const allPuzzles = useAllPuzzles();  // Always returns Record<string, PuzzleState>
```

---

## Action Contract

### Action Processing

1. **Synchronous**
   - Actions are processed synchronously
   - State updates immediately
   - No async action support

2. **Validation**
   - Invalid actions are silently ignored
   - No errors thrown for invalid actions
   - State remains unchanged on validation failure

3. **Side Effects**
   - Reducers are pure functions
   - No side effects in reducers
   - Side effects in UI layer or engines

### Action Response Contract

```typescript
// Actions don't return values
const result = dispatch({ type: 'PLACE_ITEM', payload: {...} });
// result is void

// Check state to verify action result
dispatch({ type: 'PLACE_ITEM', payload: {...} });
const newState = useGameState();
const wasPlaced = newState.puzzle.placedItems.some(item => item.itemId === 'router-1');
```

### Validation Contract

Actions may fail silently if:

1. **PLACE_ITEM**
   - Item doesn't exist in inventory → ignored
   - Block is occupied → ignored
   - Item not allowed on puzzle → ignored
   - Puzzle at max capacity → ignored
   - Coordinates out of bounds → ignored

2. **REMOVE_ITEM**
   - Block is empty → ignored
   - Coordinates out of bounds → ignored

3. **CONFIGURE_DEVICE**
   - Device doesn't exist → ignored
   - Invalid puzzleId → ignored

4. **UPDATE_INVENTORY_GROUP**
   - Group doesn't exist → ignored

5. **TRANSFER_ITEM**
   - Either puzzle doesn't exist → ignored
   - Item not found → ignored
   - Target block occupied → ignored

**Contract:** Actions never throw errors. Check state after dispatch to verify success.

---

## Engine Contract

### Lifecycle Contract

```typescript
interface EngineProgress {
  status: 'pending' | 'started' | 'finished';
  startedAt?: number;
  finishedAt?: number;
}
```

**Guarantees:**

1. **State Transitions**
   ```
   pending → started → finished
   ```
   - Can only start from `pending`
   - Can only finish from `started` or `pending`
   - Cannot transition backwards
   - `reset()` returns to `pending`

2. **Timestamps**
   - `startedAt` set only when status becomes `started`
   - `finishedAt` set only when status becomes `finished`
   - Timestamps are milliseconds since epoch

3. **Callbacks**
   - `onStarted` called exactly once when starting
   - `onFinished` called exactly once when finishing
   - Callbacks called synchronously during state transition

### Terminal Engine Contract

```typescript
interface TerminalCommandHelpers<TContext> {
  writeOutput: (content: string, type: TerminalOutputType) => void;
  clearHistory: () => void;
  finishEngine: () => void;
  context?: TContext;
}
```

**Guarantees:**

1. **Command Processing**
   - `onCommand` called for each new input entry
   - Only input entries trigger `onCommand`
   - Commands processed in order received
   - No command queuing or batching

2. **Auto-Start**
   - Engine starts automatically on first command
   - Only if status is `pending`
   - No manual start required

3. **Helpers**
   - `writeOutput` dispatches immediately
   - `clearHistory` removes all entries
   - `finishEngine` transitions to finished
   - Helpers always available in `onCommand`

**Example Contract:**

```typescript
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    // Contract guarantees:
    // - input is the string content from terminal
    // - helpers are always defined
    // - this is called synchronously

    helpers.writeOutput('response', 'output');  // Immediate dispatch
  }
});
```

### Drag Engine Contract

```typescript
interface DragEngineState {
  puzzle: PuzzleState;
  placedItems: PlacedItem[];
}
```

**Guarantees:**

1. **Auto-Start**
   - If `autoStart: true`, starts when first item placed
   - Checks `placedItems.length > 0`
   - Only starts once

2. **State Synchronization**
   - `engine.state` always reflects current game state
   - Updates on every state change
   - Snapshot is immutable

3. **Manual Control**
   - `start()` can be called manually
   - `finish()` can be called manually
   - Manual calls override auto-start

**Example Contract:**

```typescript
const engine = useDragEngine({ autoStart: true });

// Contract guarantees:
// - engine.state.puzzle matches current puzzle state
// - engine.state.placedItems === puzzle.placedItems
// - Updates automatically on state changes
```

---

## Validation Contract

### Input Sanitization

The engine sanitizes all inputs:

1. **Inventory Items**
   ```typescript
   // Required fields checked
   item.id: string  // Required, must exist
   item.type: string  // Required, must exist

   // Invalid items filtered out
   { id: 'valid', type: 'router' }  // ✅ Kept
   { id: '', type: 'router' }       // ❌ Filtered
   { id: 'valid' }                  // ❌ Filtered (no type)
   { type: 'router' }               // ❌ Filtered (no id)
   ```

2. **Inventory Groups**
   ```typescript
   // Duplicate group IDs prevented
   groups: [
     { id: 'group-1', ... },
     { id: 'group-1', ... }  // ❌ Second ignored
   ]

   // Duplicate item IDs across groups prevented
   groups: [
     { id: 'g1', items: [{ id: 'item-1', ... }] },
     { id: 'g2', items: [{ id: 'item-1', ... }] }  // ❌ Filtered
   ]
   ```

3. **Item Limit**
   ```typescript
   // Max 100 items per group
   {
     id: 'group',
     items: [...101 items]  // ❌ Truncated to 100
   }
   ```

### Placement Validation

```typescript
// Item allowed on puzzle
item.allowedPlaces = ['*']           // ✅ Any puzzle
item.allowedPlaces = ['puzzle-1']    // ✅ Only puzzle-1
item.allowedPlaces = ['puzzle-1', 'puzzle-2']  // ✅ Either

// Block validation
block.status === 'empty'    // ✅ Can place
block.status === 'hover'    // ✅ Can place
block.status === 'occupied' // ❌ Cannot place
block.status === 'invalid'  // ❌ Cannot place
```

---

## Component Integration Contract

### Provider Requirements

```typescript
// ✅ Correct: Wrap with GameProvider
<GameProvider>
  <YourComponent />
</GameProvider>

// ❌ Error: Using hooks outside provider
function YourComponent() {
  const state = useGameState();  // Throws error
}
```

**Contract:**
- `useGameState()` throws if used outside `GameProvider`
- `useGameDispatch()` throws if used outside `GameProvider`
- `usePuzzleState()` throws if used outside `GameProvider`

### Re-render Contract

```typescript
// Component re-renders when state changes
function Component() {
  const state = useGameState();  // Subscribes to all state changes
  return <div>{state.phase}</div>;
}

// Every action that changes state triggers re-render
dispatch({ type: 'SET_PHASE', payload: { phase: 'playing' } });
// → Component re-renders
```

**Contract:**
- All components using `useGameState()` re-render on any state change
- Use selective access to avoid unnecessary re-renders
- Memoization recommended for expensive components

---

## Data Structure Contracts

### Puzzle Grid Contract

```typescript
// Grid structure
puzzle.blocks: Block[][]

// Access pattern
const block = puzzle.blocks[row][column];
const block = puzzle.blocks[blockY][blockX];

// Dimensions
puzzle.blocks.length === puzzle.config.rows
puzzle.blocks[0].length === puzzle.config.columns
```

**Contract:**
- Grid is always fully populated (no sparse arrays)
- Blocks are zero-indexed
- `blockY` corresponds to row, `blockX` to column
- Grid is immutable (new grid on each update)

### Placed Items Contract

```typescript
type PlacedItem = {
  id: string;              // Unique, auto-generated
  itemId: string;          // References inventory item
  type: string;            // Item type
  blockX: number;          // Grid X position
  blockY: number;          // Grid Y position
  status: PlacedItemStatus;
  icon?: IconInfo;
  data: Record<string, unknown>;  // Always defined, may be empty
};
```

**Contract:**
- `id` is unique across all placed items
- `id` is auto-generated (format: `placed-{itemId}-{sequence}`)
- `data` always exists (never undefined)
- `status` defaults to `'normal'`
- Position matches grid coordinates

### Terminal History Contract

```typescript
type TerminalEntry = {
  id: string;      // Unique, auto-generated
  type: TerminalEntryType;
  content: string;
  timestamp: number;  // Milliseconds since epoch
};
```

**Contract:**
- Entries ordered chronologically
- `id` unique per entry
- `timestamp` set at entry creation
- History never auto-clears (manual clearing required)

---

## Error Handling Contract

### No Exceptions

**Contract:** The engine never throws exceptions for invalid operations.

```typescript
// ❌ Invalid operation
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'non-existent',  // Item doesn't exist
    blockX: 999,             // Out of bounds
    blockY: 999
  }
});

// ✅ State unchanged, no error thrown
const state = useGameState();
// State is exactly the same
```

### Hook Errors

**Contract:** Hooks throw only when used incorrectly:

```typescript
// ✅ Correct usage
function Component() {
  const state = useGameState();  // Inside GameProvider
}

// ❌ Throws Error
function Component() {
  const state = useGameState();  // Outside GameProvider
}
// Error: "useGameState must be used within GameProvider"
```

---

## Performance Contract

### Synchronous Guarantees

**Contract:**
- All reducers are synchronous
- Actions complete immediately
- No async waiting required

```typescript
dispatch({ type: 'PLACE_ITEM', payload: {...} });
const state = useGameState();
// State is already updated, synchronously
```

### No Optimization

**Contract:**
- No automatic memoization
- No automatic shouldComponentUpdate
- Components re-render on all state changes

**Recommendation:**
```typescript
import { memo } from 'react';

// Optimize with React.memo
const ExpensiveComponent = memo(function ExpensiveComponent(props) {
  // Only re-renders when props change
});
```

---

## Backward Compatibility

### Breaking Changes

The engine does NOT guarantee backward compatibility for:

1. Internal implementation details
2. Undocumented behavior
3. Type structure changes
4. Validation rule changes

### Stable APIs

The following are considered stable:

1. Hook names and signatures (`useGameState`, `useGameDispatch`, etc.)
2. Action types (e.g., `PLACE_ITEM`, `REMOVE_ITEM`)
3. Core state structure (`GameState` type)
4. Engine lifecycle (`pending` → `started` → `finished`)

---

## Type Safety Contract

### TypeScript Support

**Contract:**
- All exports are fully typed
- No `any` types in public API
- Strict null checking supported
- Generic types preserved

```typescript
// ✅ Full type inference
const state = useGameState();
state.phase  // Type: GamePhase

const dispatch = useGameDispatch();
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'router',
    blockX: 0,
    blockY: 0,
    puzzleId: 'optional'  // Type-checked
  }
});

// ✅ Generic type support
const engine = useTerminalEngine<{ score: number }>({
  context: { score: 0 },
  onCommand: (input, helpers) => {
    helpers.context?.score  // Type: number | undefined
  }
});
```

---

## Summary

### What You Can Rely On

1. ✅ State is immutable
2. ✅ Actions are synchronous
3. ✅ Invalid actions are silently ignored
4. ✅ No exceptions from engine operations
5. ✅ Hooks throw when used incorrectly
6. ✅ Engine lifecycle is predictable
7. ✅ Type safety is guaranteed
8. ✅ State always valid and consistent

### What You Cannot Rely On

1. ❌ Action success without state check
2. ❌ Automatic optimization
3. ❌ Async action support
4. ❌ Error messages for invalid actions
5. ❌ State persistence
6. ❌ Undo/redo functionality
7. ❌ Animation coordination
8. ❌ Backward compatibility for internals

### Best Practices

1. Always wrap with `GameProvider`
2. Check state after dispatch to verify success
3. Use TypeScript for type safety
4. Validate inputs before dispatch
5. Memoize expensive components
6. Clear terminal history periodically
7. Use engines for reactive logic
8. Keep inventory groups under 100 items
