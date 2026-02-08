# Core Concepts

## GameState (Single Source of Truth)

All game data lives in one immutable `GameState` object:

```typescript
type GameState = {
  // Core
  phase: GamePhase;              // setup | configuring | playing | terminal | completed
  sequence: number;              // Action counter (increments on each change)

  // Spaces & Entities
  spaces: Record<string, SpaceData>;      // GridSpace or PoolSpace
  entities: Record<string, EntityData>;   // Items, routers, PCs, cables, etc.

  // UI State (core-managed)
  overlay: OverlayState;         // Modals
  question: QuestionState;       // Question ID, status

  // Events
  eventQueue: GameEventQueue;    // Ordered event history
  eventCursors: Record<string, number>;  // Engine consumption pointers
};
```

Terminal UI state is local to `TerminalProvider` and is not part of `GameState`.

**Access:** `const state = useGameState()`
**Modify:** `dispatch({ type: "ACTION_NAME", payload: {...} })`
**Details:** See [contracts/types.md](../contracts/types.md)

---

## Spaces (Game Boards)

**Spaces** = Where entities live and interact

### GridSpace (2D Positioned)

Grid with rows/columns, entities at specific `{row, col}` positions.

**Use for:** Network diagrams, puzzle boards, layouts requiring positioning

```typescript
type GridSpaceData = {
  kind: "grid";
  id: string;
  rows: number;
  cols: number;
  entityPositions: Record<string, GridPosition>;  // entityId → {row, col}
  allowMultiplePerCell: boolean;
  maxCapacity?: number;
};
```

**Example:** Router board (1×1), Internet space (4×1)

### PoolSpace (Unordered Collection)

List of entities without specific positions (inventory, item pool).

**Use for:** Inventory, available items, toolbox

```typescript
type PoolSpaceData = {
  kind: "pool";
  id: string;
  entityIds: string[];  // Ordered list
  layout: "grid" | "list";
  columns?: number;
  maxCapacity?: number;
};
```

**Example:** Available equipment, inventory drawer

**Polymorphic:** Use `SpaceData = GridSpaceData | PoolSpaceData` for functions that work with both types.

**Details:** See [contracts/types.md](../contracts/types.md#spacedata)

---

## Entities (Game Objects)

**Entities** = Draggable items, devices, anything in the game

```typescript
type EntityData = {
  id: string;           // Unique ID
  type: string;         // "router", "pc", "cable", "packet", etc.
  name?: string;        // Display name

  visual: {             // Appearance
    icon?: string;      // Icon ID
    color?: string;     // Color
    // ...
  };

  data: Record<string, unknown>;   // Static properties (model, specs)
  state: Record<string, unknown>;  // Dynamic state (IP address, config)

  behaviorIds: string[];  // Behaviors attached to this entity
};
```

**Items = Entities with extra fields:**

```typescript
type ItemData = EntityData & {
  allowedPlaces: string[];  // Which spaces can accept this
  draggable: boolean;       // Can be dragged?
  icon?: IconInfo;          // Display icon
  tooltip?: ItemTooltip;    // Hover tooltip
  category?: string;        // Grouping category
};
```

**State vs Data:**
- `state` = **mutable** (changes during gameplay): IP address, DHCP enabled, connection status
- `data` = **immutable** (static properties): Model number, specifications, type

**Details:** See [contracts/types.md](../contracts/types.md#entitydata)

---

## Actions (State Changes)

**Actions** = Declarative intent to change state

```typescript
type GameAction =
  | CoreAction         // SET_PHASE, COMPLETE_QUESTION, INIT_MULTI_SPACE
  | SpaceAction        // ADD_ENTITY_TO_SPACE, REMOVE_ENTITY_FROM_SPACE
  | EntityAction       // CREATE_ENTITY, UPDATE_ENTITY, DELETE_ENTITY
  | ModalAction;       // OPEN_MODAL, CLOSE_MODAL
```

**Dispatch pattern:**

```typescript
const dispatch = useGameDispatch();

dispatch({
  type: "ADD_ENTITY_TO_SPACE",
  payload: {
    spaceId: "router-board",
    entityId: "router-1",
    position: { row: 0, col: 0 }
  }
});
```

**Flow:**

```
User interaction
      ↓
dispatch(action)
      ↓
Reducer receives action
      ↓
Calls pure functions (gridAdd, setEntityStateValue, etc.)
      ↓
Mutates state (via Immer)
      ↓
Emits events
      ↓
Returns new state
      ↓
React re-renders
```

**Details:** See [contracts/actions.md](../contracts/actions.md)

---

## Events (State Change Notifications)

**Events** = Immutable log of what happened

Events are emitted by reducers when state changes:

```typescript
type GameEvent =
  | { type: "ENTITY_ENTERED_SPACE"; entityId: string; spaceId: string; position?: GridPosition; }
  | { type: "ENTITY_LEFT_SPACE"; entityId: string; spaceId: string; }
  | { type: "ENTITY_MOVED"; entityId: string; fromSpace: string; toSpace: string; }
  | { type: "MODAL_OPENED"; modalId: string; }
  | { type: "PHASE_CHANGED"; from: GamePhase; to: GamePhase; }
  | ...
```

**Event Queue:** Append-only, ordered list in `GameState.eventQueue`

**Consumption:** Engines use `useEngineEvents(engineId)` to read events after their cursor position

**Why?** Deterministic ordering, engine isolation, time-travel debugging

**Details:** See [contracts/events.md](../contracts/events.md)

---

## Engines (Reactive Automation)

**Engines** = React hooks that listen to events and execute logic

### Lifecycle

```
pending → started → finished
```

Each engine tracks its own event cursor, so multiple engines can consume the same events independently.

### Common Engines

**Terminal Engine:** Process commands (terminal UI state is local)

```typescript
const terminal = useTerminalStore();
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    if (input === "ping 192.168.1.1") {
      helpers.writeOutput("Reply from 192.168.1.1: bytes=32 time=1ms", "output");
      terminal.addOutput("Reply from 192.168.1.1: bytes=32 time=1ms");
    }
  }
});
```

**Drag Engine:** Handle drag-and-drop interactions

### Custom Engines

```typescript
function MyCustomEngine() {
  const { events, ack } = useEngineEvents("my-engine");

  useEffect(() => {
    events.forEach(event => {
      if (event.type === "ENTITY_ENTERED_SPACE") {
        // React to entity placement
      }
    });
    ack(); // Advance cursor
  }, [events, ack]);

  return null;
}
```

**Details:** See [guides/engines.md](../guides/engines.md)

---

## Phases (Game Lifecycle)

Games progress through distinct phases:

| Phase | Purpose | Typical Actions |
|-------|---------|-----------------|
| `setup` | Initial loading | Load data, initialize state |
| `configuring` | Pre-game configuration | Configure router, set IPs |
| `playing` | Main gameplay | Drag items, build topology |
| `terminal` | Command interface | Run ping, traceroute commands |
| `completed` | Game finished | Show results, score |

**Transition:** `dispatch({ type: "SET_PHASE", payload: { phase: "playing" } })`

**Conditional rendering:**

```typescript
const state = useGameState();

if (state.phase === "configuring") {
  return <ConfigurationScreen />;
} else if (state.phase === "playing") {
  return <GameBoard />;
}
```

---

## Modals (Configuration Dialogs)

**Modals** = Popup dialogs for entity configuration

```typescript
type ModalInstance = {
  id: string;
  title: string;
  content: ModalContentBlock[];  // Text, fields, links
  actions: ModalAction[];        // Buttons
  blocking?: boolean;            // Can't close without action?
};
```

**Open:** `dispatch({ type: "OPEN_MODAL", payload: modalInstance })`
**Close:** `dispatch({ type: "CLOSE_MODAL" })`

**Example:** Router DHCP configuration modal

```typescript
const dhcpModal = {
  id: "router-dhcp-config",
  title: "Router Configuration",
  content: [
    { type: "field", name: "dhcpEnabled", label: "Enable DHCP", fieldType: "checkbox" },
    { type: "field", name: "ipStart", label: "IP Range Start", fieldType: "text" },
  ],
  actions: [
    { id: "save", label: "Save", variant: "solid" }
  ]
};

dispatch({ type: "OPEN_MODAL", payload: dhcpModal });
```

**Details:** See contracts for modal types

---

## Terminal (Command Interface)

**Terminal** = CLI within the game for running commands. Terminal UI state is local to
`TerminalProvider`/`useTerminalStore` and not stored in `GameState`.

**Send command (UI → events):**

```typescript
const terminal = useTerminalStore();
terminal.addInput("ping 192.168.1.1");
dispatch({
  type: "EMIT_EVENTS",
  payload: { events: [{ type: "TERMINAL_INPUT", payload: { input: "ping 192.168.1.1" } }] }
});
```

**Terminal engine processes commands and writes output via the store**

**Details:** See [guides/engines.md](../guides/engines.md#terminal-engine)

---

## Validation (Ensuring Valid State)

Validation happens at multiple levels:

1. **Type-level:** TypeScript ensures correct types
2. **Action-level:** Reducers validate before applying changes
3. **Domain-level:** Pure functions validate inputs (e.g., `gridCanAccept()`)

**Invalid actions are silently ignored** (state unchanged, no error thrown)

**Example:**

```typescript
// Try to add entity to grid
dispatch({ type: "ADD_ENTITY_TO_SPACE", payload: {...} });

// If position is out of bounds, action is ignored
// If cell is occupied, action is ignored
// State remains unchanged
```

**Details:** See [contracts/validation.md](../contracts/validation.md)

---

## Key Takeaways

1. **Everything is immutable** - Use Immer to update state
2. **Single source of truth** - All data in GameState
3. **Actions change state** - Dispatch, don't mutate
4. **Events record history** - Engines consume events
5. **Pure functions** - Domain logic has no side effects
6. **Layered architecture** - presentation → application → domain → infrastructure

---

## See Also

- [Overview](./overview.md) - What is the game engine?
- [Architecture](./architecture.md) - Layered structure and FP patterns
- [Contracts/Types](../contracts/types.md) - Complete type reference
- [Contracts/Functions](../contracts/functions.md) - Pure function API
- [Contracts/Actions](../contracts/actions.md) - Action reference
- [Guides/State Management](../guides/state-management.md) - How to work with state
