# Actions API Reference

## Overview

All state changes in the game engine occur through dispatching actions. Actions are plain objects with a `type` and `payload`.

```tsx
import { useGameDispatch } from '@/components/game/game-provider';

const dispatch = useGameDispatch();
dispatch({ type: 'ACTION_TYPE', payload: { /* ... */ } });
```

## Core Actions

### INIT_MULTI_CANVAS

Initialize the game with multiple puzzle canvases.

```tsx
dispatch({
  type: 'INIT_MULTI_CANVAS',
  payload: {
    questionId: string,
    canvases: Record<string, PuzzleConfig>,
    inventoryGroups?: InventoryGroupConfig[],
    terminal?: Partial<TerminalState>,
    phase?: GamePhase,
    questionStatus?: QuestionStatus
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'INIT_MULTI_CANVAS',
  payload: {
    questionId: 'network-topology-1',
    canvases: {
      'main-network': {
        id: 'main-network',
        title: 'Main Network',
        columns: 5,
        rows: 4,
      },
      'backup-network': {
        id: 'backup-network',
        title: 'Backup Network',
        columns: 3,
        rows: 3,
      }
    },
    inventoryGroups: [
      {
        id: 'devices',
        title: 'Network Devices',
        items: [/* ... */]
      }
    ],
    phase: 'configuring'
  }
});
```

### SET_PHASE

Change the current game phase.

```tsx
dispatch({
  type: 'SET_PHASE',
  payload: {
    phase: 'setup' | 'configuring' | 'playing' | 'terminal' | 'completed'
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'SET_PHASE',
  payload: { phase: 'playing' }
});
```

### COMPLETE_QUESTION

Mark the current question as completed.

```tsx
dispatch({
  type: 'COMPLETE_QUESTION'
});
```

**Effects:**
- Sets `question.status` to `'completed'`
- Can be used to trigger completion UI

---

## Puzzle Actions

### PLACE_ITEM

Place an inventory item onto a puzzle board.

```tsx
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: string,
    blockX: number,
    blockY: number,
    puzzleId?: string  // Optional: target specific puzzle
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'router-1',
    blockX: 2,
    blockY: 1,
    puzzleId: 'main-network'
  }
});
```

**Validation:**
- Item must exist in inventory
- Block must be unoccupied
- Item must be allowed on target puzzle (via `allowedPlaces`)
- Puzzle must not exceed `maxItems` limit

### REMOVE_ITEM

Remove an item from a puzzle board.

```tsx
dispatch({
  type: 'REMOVE_ITEM',
  payload: {
    blockX: number,
    blockY: number,
    puzzleId?: string
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'REMOVE_ITEM',
  payload: {
    blockX: 2,
    blockY: 1,
    puzzleId: 'main-network'
  }
});
```

**Effects:**
- Item returned to inventory
- Block status set to `'empty'`
- Item quantity incremented (if tracked)

### REPOSITION_ITEM

Move an item from one block to another on the same puzzle.

```tsx
dispatch({
  type: 'REPOSITION_ITEM',
  payload: {
    itemId: string,
    fromBlockX: number,
    fromBlockY: number,
    toBlockX: number,
    toBlockY: number,
    puzzleId?: string
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'REPOSITION_ITEM',
  payload: {
    itemId: 'router-1',
    fromBlockX: 0,
    fromBlockY: 0,
    toBlockX: 2,
    toBlockY: 1,
    puzzleId: 'main-network'
  }
});
```

### TRANSFER_ITEM

Transfer an item between different puzzles.

```tsx
dispatch({
  type: 'TRANSFER_ITEM',
  payload: {
    itemId: string,
    fromPuzzle: string,
    fromBlockX: number,
    fromBlockY: number,
    toPuzzle: string,
    toBlockX: number,
    toBlockY: number
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'TRANSFER_ITEM',
  payload: {
    itemId: 'router-1',
    fromPuzzle: 'main-network',
    fromBlockX: 0,
    fromBlockY: 0,
    toPuzzle: 'backup-network',
    toBlockX: 1,
    toBlockY: 1
  }
});
```

### SWAP_ITEMS

Swap two items on the puzzle board (can be on different puzzles).

```tsx
dispatch({
  type: 'SWAP_ITEMS',
  payload: {
    from: {
      puzzleId?: string,
      blockX: number,
      blockY: number
    },
    to: {
      puzzleId?: string,
      blockX: number,
      blockY: number
    }
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'SWAP_ITEMS',
  payload: {
    from: { blockX: 0, blockY: 0, puzzleId: 'main-network' },
    to: { blockX: 2, blockY: 1, puzzleId: 'main-network' }
  }
});
```

### CONFIGURE_DEVICE

Configure a placed item with custom settings.

```tsx
dispatch({
  type: 'CONFIGURE_DEVICE',
  payload: {
    deviceId: string,  // Placed item ID
    config: Record<string, unknown>,
    puzzleId?: string
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'CONFIGURE_DEVICE',
  payload: {
    deviceId: 'placed-router-1',
    config: {
      ipAddress: '192.168.1.1',
      subnet: '255.255.255.0',
      gateway: '192.168.1.254'
    },
    puzzleId: 'main-network'
  }
});
```

**Effects:**
- Merges `config` into placed item's `data` field
- Useful for storing item-specific configuration

---

## Inventory Actions

### ADD_INVENTORY_GROUP

Add a new inventory group.

```tsx
dispatch({
  type: 'ADD_INVENTORY_GROUP',
  payload: {
    group: InventoryGroupConfig
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'ADD_INVENTORY_GROUP',
  payload: {
    group: {
      id: 'cables',
      title: 'Cables',
      visible: true,
      items: [
        {
          id: 'ethernet-cable',
          type: 'cable',
          name: 'Ethernet Cable',
          allowedPlaces: ['*'],
          quantity: 10
        }
      ]
    }
  }
});
```

### UPDATE_INVENTORY_GROUP

Update an existing inventory group.

```tsx
dispatch({
  type: 'UPDATE_INVENTORY_GROUP',
  payload: {
    id: string,
    title?: string,
    visible?: boolean,
    items?: InventoryItem[]
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'UPDATE_INVENTORY_GROUP',
  payload: {
    id: 'devices',
    visible: false  // Hide the group
  }
});
```

### REMOVE_INVENTORY_GROUP

Remove an inventory group.

```tsx
dispatch({
  type: 'REMOVE_INVENTORY_GROUP',
  payload: {
    id: string
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'REMOVE_INVENTORY_GROUP',
  payload: { id: 'obsolete-items' }
});
```

### PURGE_ITEMS

Remove multiple items from inventory permanently.

```tsx
dispatch({
  type: 'PURGE_ITEMS',
  payload: {
    itemIds: string[]
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'PURGE_ITEMS',
  payload: {
    itemIds: ['router-1', 'switch-old', 'cable-damaged']
  }
});
```

**Effects:**
- Items removed from all inventory groups
- Does not affect already-placed items

---

## Terminal Actions

### SUBMIT_COMMAND

Submit a terminal command.

```tsx
dispatch({
  type: 'SUBMIT_COMMAND',
  payload: {
    input: string
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'SUBMIT_COMMAND',
  payload: { input: 'ping 192.168.1.1' }
});
```

**Effects:**
- Adds input entry to terminal history
- Terminal engine (if active) processes the command

### ADD_TERMINAL_OUTPUT

Add output to the terminal history.

```tsx
dispatch({
  type: 'ADD_TERMINAL_OUTPUT',
  payload: {
    content: string,
    type: 'output' | 'error' | 'hint'
  }
});
```

**Example:**
```tsx
dispatch({
  type: 'ADD_TERMINAL_OUTPUT',
  payload: {
    content: 'Connection successful!',
    type: 'output'
  }
});

dispatch({
  type: 'ADD_TERMINAL_OUTPUT',
  payload: {
    content: 'Error: Connection refused',
    type: 'error'
  }
});
```

### CLEAR_TERMINAL_HISTORY

Clear all terminal history.

```tsx
dispatch({
  type: 'CLEAR_TERMINAL_HISTORY'
});
```

**Example:**
```tsx
dispatch({ type: 'CLEAR_TERMINAL_HISTORY' });
```

**Effects:**
- Removes all entries from terminal history
- Terminal remains visible if it was visible

---

## Modal Actions

### OPEN_MODAL

Open a modal dialog.

```tsx
dispatch({
  type: 'OPEN_MODAL',
  payload: ModalInstance
});
```

**Example:**
```tsx
dispatch({
  type: 'OPEN_MODAL',
  payload: {
    id: 'configure-router',
    title: 'Configure Router',
    content: [
      { kind: 'text', text: 'Enter router configuration' },
      {
        kind: 'field',
        field: {
          kind: 'text',
          id: 'ipAddress',
          label: 'IP Address',
          placeholder: '192.168.1.1'
        }
      }
    ],
    actions: [
      {
        id: 'cancel',
        label: 'Cancel',
        variant: 'secondary',
        closesModal: true
      },
      {
        id: 'save',
        label: 'Save',
        variant: 'primary',
        validate: true,
        onClick: ({ values, close, dispatch }) => {
          dispatch({
            type: 'CONFIGURE_DEVICE',
            payload: {
              deviceId: 'router-1',
              config: values
            }
          });
          close();
        }
      }
    ]
  }
});
```

### CLOSE_MODAL

Close the active modal.

```tsx
dispatch({
  type: 'CLOSE_MODAL'
});
```

**Example:**
```tsx
dispatch({ type: 'CLOSE_MODAL' });
```

---

## Action Patterns

### Sequential Actions

For operations requiring multiple steps:

```tsx
const placeAndConfigure = (itemId: string, config: Record<string, unknown>) => {
  // First, place the item
  dispatch({
    type: 'PLACE_ITEM',
    payload: { itemId, blockX: 0, blockY: 0 }
  });

  // Then configure it (in a useEffect or callback)
  dispatch({
    type: 'CONFIGURE_DEVICE',
    payload: { deviceId: `placed-${itemId}`, config }
  });
};
```

### Conditional Actions

Based on current state:

```tsx
const tryPlaceItem = () => {
  const state = useGameState();
  const block = state.puzzle.blocks[0][0];

  if (block.status === 'empty') {
    dispatch({
      type: 'PLACE_ITEM',
      payload: { itemId: 'router-1', blockX: 0, blockY: 0 }
    });
  }
};
```

### Action Composition

Combine multiple actions:

```tsx
const resetPuzzle = () => {
  const state = useGameState();

  // Remove all placed items
  state.puzzle.placedItems.forEach(item => {
    dispatch({
      type: 'REMOVE_ITEM',
      payload: { blockX: item.blockX, blockY: item.blockY }
    });
  });

  // Clear terminal
  dispatch({ type: 'CLEAR_TERMINAL_HISTORY' });
};
```
