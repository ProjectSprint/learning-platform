# Core Concepts

## Game State

The entire game is represented by a single `GameState` object that contains all game data:

```typescript
type GameState = {
  phase: GamePhase;                    // Current game phase
  inventory: { groups: InventoryGroup[] };  // Item inventory
  puzzle: PuzzleState;                 // Primary puzzle state
  puzzles?: Record<string, PuzzleState>;    // Multiple puzzles
  terminal: TerminalState;             // Terminal state
  overlay: OverlayState;               // Modal state
  question: { id: string; status: QuestionStatus };  // Question tracking
  sequence: number;                    // Action sequence number
};
```

## Game Phases

Games progress through distinct phases:

| Phase | Description | Use Case |
|-------|-------------|----------|
| `setup` | Initial state, no user interaction | Loading, initialization |
| `configuring` | User customizes game settings | Device configuration, preferences |
| `playing` | Active gameplay | Main puzzle interaction |
| `terminal` | Terminal-focused interaction | Command-based challenges |
| `completed` | Game finished | Show results, completion state |

## Actions and Dispatch

All state changes happen through actions. Actions are dispatched to trigger state updates:

```typescript
type GameAction =
  | PuzzleAction     // Puzzle interactions
  | CoreAction       // Game lifecycle
  | InventoryAction  // Inventory management
  | ModalAction      // Modal control
  | TerminalAction;  // Terminal interactions

// Example: Placing an item
dispatch({
  type: 'PLACE_ITEM',
  payload: {
    itemId: 'router-1',
    blockX: 0,
    blockY: 1,
    puzzleId: 'network-diagram'
  }
});
```

## Puzzle System

### Blocks and Grid

Puzzles use a grid-based system where each cell is a "block":

```typescript
type Block = {
  x: number;           // Column position
  y: number;           // Row position
  status: BlockStatus; // empty | hover | occupied | invalid
  itemId?: string;     // ID of placed item (if occupied)
};
```

Blocks are organized in a 2D array: `blocks[row][column]`

### Puzzle Configuration

Each puzzle is configured with:

```typescript
type PuzzleConfig = {
  id: string;                    // Unique puzzle identifier
  title?: string;                // Display title
  columns: number;               // Grid width
  rows: number;                  // Grid height
  orientation?: 'horizontal' | 'vertical';  // Layout direction
  puzzleId?: string;             // Alternative ID for multi-puzzle
  maxItems?: number;             // Maximum items allowed
  initialPlacements?: Placement[]; // Pre-placed items
};
```

### Placed Items

Items placed on the puzzle board:

```typescript
type PlacedItem = {
  id: string;              // Unique placement ID
  itemId: string;          // Original inventory item ID
  type: string;            // Item type
  blockX: number;          // X position on grid
  blockY: number;          // Y position on grid
  status: PlacedItemStatus; // normal | warning | success | error
  icon?: IconInfo;         // Display icon
  data: Record<string, unknown>; // Custom metadata
};
```

## Inventory System

### Inventory Groups

Items are organized in groups:

```typescript
type InventoryGroup = {
  id: string;         // Group identifier
  title: string;      // Display title
  visible: boolean;   // Show/hide group
  items: InventoryItem[]; // Items in this group
};
```

### Inventory Items

```typescript
type InventoryItem = {
  id: string;                  // Unique item ID
  type: string;                // Item type
  name?: string;               // Display name
  allowedPlaces: string[];     // Puzzle IDs where item can be placed
  quantity?: number;           // Available quantity
  icon?: IconInfo;             // Display icon
  data?: Record<string, unknown>;  // Custom metadata
  draggable?: boolean;         // Can be dragged (default: true)
  category?: string;           // Item category
};
```

### Placement Rules

Items specify which puzzles they can be placed on via `allowedPlaces`:

- `['*']` - Can be placed anywhere
- `['puzzle-1', 'puzzle-2']` - Only on specific puzzles
- `[]` - Cannot be placed (display-only)

## Terminal System

### Terminal State

```typescript
type TerminalState = {
  visible: boolean;      // Terminal visibility
  prompt: string;        // Command prompt text
  history: TerminalEntry[]; // Command history
};
```

### Terminal Entries

```typescript
type TerminalEntry = {
  id: string;                 // Unique entry ID
  type: TerminalEntryType;    // prompt | input | output | error | hint
  content: string;            // Entry text
  timestamp: number;          // Creation time
};
```

Entry types:
- `prompt` - Command prompt
- `input` - User input
- `output` - Standard output
- `error` - Error messages
- `hint` - Helpful hints

## Modal System

Modals are data-driven and support various field types:

### Modal Instance

```typescript
type ModalInstance = {
  id?: string;              // Optional modal ID
  title?: string;           // Modal title
  content: ModalContentBlock[]; // Modal content
  actions: ModalAction[];   // Action buttons
  blocking?: boolean;       // Prevent closing without action
  initialValues?: Record<string, unknown>; // Initial field values
};
```

### Field Types

- `text` - Single-line text input
- `textarea` - Multi-line text input
- `checkbox` - Boolean toggle
- `select` - Dropdown selection
- `readonly` - Display-only value

### Modal Actions

Buttons in modals:

```typescript
type ModalAction = {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  validate?: boolean;        // Run field validation
  closesModal?: boolean;     // Close modal after action
  onClick?: (ctx: ModalActionContext) => void | Promise<void>;
};
```

## Engines

Engines add reactive behavior to the game:

### Engine Lifecycle

1. **Pending** - Engine created but not started
2. **Started** - Engine active, processing events
3. **Finished** - Engine completed

### Engine Progress

```typescript
type EngineProgress = {
  status: 'pending' | 'started' | 'finished';
  startedAt?: number;    // Timestamp when started
  finishedAt?: number;   // Timestamp when finished
};
```

### Available Engines

1. **Terminal Engine** - Processes terminal commands
2. **Drag Engine** - Tracks puzzle item placements

## Validation and Sanitization

The engine includes built-in validation:

- **Inventory normalization** - Ensures valid item structures
- **Placement validation** - Checks if items can be placed
- **Duplicate prevention** - Prevents duplicate item IDs
- **Sanitization** - Removes invalid data

### Limits

- Maximum inventory items: 100 per group
- Puzzle grid maximum: 20×20 blocks
- Terminal history: Unlimited (consider manual clearing)
