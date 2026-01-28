# State Management

## Overview

The game engine uses a centralized state management pattern based on React Context and useReducer. All state is immutable and changes flow through a reducer pipeline.

## Provider Setup

### GameProvider

Wrap your game components with `GameProvider`:

```tsx
import { GameProvider } from '@/components/game/game-provider';

function App() {
  return (
    <GameProvider>
      <YourGame />
    </GameProvider>
  );
}
```

### Custom Initial State

You can provide custom initial state:

```tsx
import { GameProvider, type GameState } from '@/components/game/game-provider';

const customState: GameState = {
  phase: 'configuring',
  inventory: {
    groups: [
      {
        id: 'devices',
        title: 'Network Devices',
        visible: true,
        items: [
          {
            id: 'router-1',
            type: 'router',
            name: 'Router',
            allowedPlaces: ['network-diagram'],
            quantity: 3,
          }
        ]
      }
    ]
  },
  // ... rest of state
};

<GameProvider initialState={customState}>
  <YourGame />
</GameProvider>
```

## Accessing State

### useGameState

Read the entire game state:

```tsx
import { useGameState } from '@/components/game/game-provider';

function Component() {
  const state = useGameState();

  console.log(state.phase);           // Current phase
  console.log(state.inventory.groups); // Inventory groups
  console.log(state.puzzle.placedItems); // Placed items

  return <div>Phase: {state.phase}</div>;
}
```

### usePuzzleState

Access puzzle state (supports multi-puzzle):

```tsx
import { usePuzzleState } from '@/components/game/game-provider';

function PuzzleComponent({ puzzleId }: { puzzleId?: string }) {
  const puzzleState = usePuzzleState(puzzleId);

  // Access puzzle-specific data
  console.log(puzzleState.config);      // Puzzle configuration
  console.log(puzzleState.blocks);      // Grid blocks
  console.log(puzzleState.placedItems); // Items on this puzzle

  return <div>Items: {puzzleState.placedItems.length}</div>;
}
```

### useAllPuzzles

Get all puzzle states as a record:

```tsx
import { useAllPuzzles } from '@/components/game/game-provider';

function MultiPuzzleView() {
  const puzzles = useAllPuzzles();

  return (
    <div>
      {Object.entries(puzzles).map(([id, puzzle]) => (
        <div key={id}>
          Puzzle {id}: {puzzle.placedItems.length} items
        </div>
      ))}
    </div>
  );
}
```

## Dispatching Actions

### useGameDispatch

Get the dispatch function:

```tsx
import { useGameDispatch } from '@/components/game/game-provider';

function Component() {
  const dispatch = useGameDispatch();

  const handlePlaceItem = () => {
    dispatch({
      type: 'PLACE_ITEM',
      payload: {
        itemId: 'router-1',
        blockX: 0,
        blockY: 1,
      }
    });
  };

  return <button onClick={handlePlaceItem}>Place Item</button>;
}
```

## State Structure Deep Dive

### Complete State Shape

```typescript
{
  // Game lifecycle
  phase: 'setup' | 'configuring' | 'playing' | 'terminal' | 'completed',
  sequence: number,  // Incremented on each action

  // Question tracking
  question: {
    id: string,
    status: 'in_progress' | 'completed'
  },

  // Inventory system
  inventory: {
    groups: [
      {
        id: string,
        title: string,
        visible: boolean,
        items: [
          {
            id: string,
            type: string,
            name?: string,
            allowedPlaces: string[],
            quantity?: number,
            icon?: { type: 'emoji' | 'lucide', value: string },
            data?: Record<string, unknown>,
            draggable?: boolean,
            category?: string,
          }
        ]
      }
    ]
  },

  // Primary puzzle
  puzzle: {
    config: {
      id: string,
      title?: string,
      columns: number,
      rows: number,
      orientation?: 'horizontal' | 'vertical',
      maxItems?: number,
      initialPlacements?: Array<{
        blockX: number,
        blockY: number,
        itemType: string
      }>
    },
    blocks: Block[][],  // 2D array [row][column]
    placedItems: PlacedItem[],
    selectedBlock: { x: number, y: number } | null
  },

  // Multi-puzzle support (optional)
  puzzles?: {
    [puzzleId: string]: PuzzleState
  },

  // Terminal
  terminal: {
    visible: boolean,
    prompt: string,
    history: [
      {
        id: string,
        type: 'prompt' | 'input' | 'output' | 'error' | 'hint',
        content: string,
        timestamp: number
      }
    ]
  },

  // Modal overlay
  overlay: {
    activeModal: ModalInstance | null
  }
}
```

## Reducer Pipeline

Actions flow through multiple reducers in sequence:

```
Action Dispatched
      ↓
Core Reducer (handles INIT_MULTI_CANVAS, SET_PHASE, COMPLETE_QUESTION)
      ↓
Inventory Reducer (handles ADD_INVENTORY_GROUP, UPDATE_INVENTORY_GROUP, etc.)
      ↓
Puzzle Reducer (handles PLACE_ITEM, REMOVE_ITEM, REPOSITION_ITEM, etc.)
      ↓
Terminal Reducer (handles SUBMIT_COMMAND, ADD_TERMINAL_OUTPUT, etc.)
      ↓
Modal Reducer (handles OPEN_MODAL, CLOSE_MODAL)
      ↓
New State Returned
```

Each reducer:
1. Receives the current state and action
2. Processes relevant actions
3. Returns updated state (or original if action not handled)

## Multi-Puzzle Management

### Single Puzzle Mode

By default, there's one puzzle stored in `state.puzzle`:

```tsx
const state = useGameState();
const puzzle = state.puzzle; // Primary puzzle
```

### Multi-Puzzle Mode

For multiple puzzles, use `state.puzzles`:

```tsx
// Initialize with INIT_MULTI_CANVAS
dispatch({
  type: 'INIT_MULTI_CANVAS',
  payload: {
    questionId: 'q1',
    canvases: {
      'network-1': {
        id: 'network-1',
        columns: 5,
        rows: 4,
      },
      'network-2': {
        id: 'network-2',
        columns: 3,
        rows: 3,
      }
    }
  }
});

// Access specific puzzle
const puzzle1 = state.puzzles?.['network-1'];
const puzzle2 = state.puzzles?.['network-2'];
```

### Puzzle-Specific Actions

Most puzzle actions accept an optional `puzzleId`:

```tsx
// Place item on specific puzzle
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'router-1',
    blockX: 0,
    blockY: 0,
    puzzleId: 'network-1'  // Optional: targets specific puzzle
  }
});

// Without puzzleId, action applies to primary puzzle
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'switch-1',
    blockX: 1,
    blockY: 1
    // No puzzleId: uses state.puzzle
  }
});
```

## State Immutability

The reducer always returns a new state object. Never mutate state directly:

```tsx
// ❌ WRONG - Direct mutation
const state = useGameState();
state.phase = 'playing'; // Don't do this!

// ✅ CORRECT - Dispatch action
const dispatch = useGameDispatch();
dispatch({ type: 'SET_PHASE', payload: { phase: 'playing' } });
```

## Performance Considerations

### Selective State Access

Only subscribe to the state you need:

```tsx
// ❌ Subscribes to all state changes
const state = useGameState();
return <div>{state.terminal.visible}</div>;

// ✅ Better: Use memo or derived values
const terminalVisible = useGameState().terminal.visible;
```

### Memoization

Use React.memo for components that shouldn't re-render on every state change:

```tsx
import { memo } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Only re-renders when data changes
  return <div>{/* ... */}</div>;
});
```

## Finding Inventory Items

Use the helper function to locate items:

```tsx
import { findInventoryItem, useGameState } from '@/components/game/game-provider';

const state = useGameState();
const result = findInventoryItem(state.inventory.groups, 'router-1');

if (result) {
  console.log(result.item);       // The item
  console.log(result.groupIndex); // Which group it's in
  console.log(result.itemIndex);  // Position in group
}
```
