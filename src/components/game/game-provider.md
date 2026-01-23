# GameProvider — Specification

The **GameProvider** is the single source of truth for all game state.
It owns state and exposes it via React context.

---

## Responsibility

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GameProvider                                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                            STATE                                    │   │
│   │                                                                     │   │
│   │  • phase (setup | playing | terminal | completed)                   │   │
│   │  • inventory groups + items                                         │   │
│   │  • canvas blocks + placed items                                     │   │
│   │  • connections                                                      │   │
│   │  • terminal history                                                 │   │
│   │  • active modal                                                     │   │
│   │  • hints                                                            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          DISPATCH                                   │   │
│   │                                                                     │   │
│   │  dispatch({ type: 'ACTION_NAME', payload: {...} })                  │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           REDUCER                                   │   │
│   │                                                                     │   │
│   │  Pure function: (state, action) => newState                         │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Context Shape

```
┌─────────────────────────────────────────┐
│           GameContext                   │
├─────────────────────────────────────────┤
│                                         │
│   state: GameState                      │
│   dispatch: (action: GameAction) => void│
│                                         │
└─────────────────────────────────────────┘
```

---

## State Shape

```
GameState
├── phase: 'setup' | 'playing' | 'terminal' | 'completed'
│
├── inventory
│   └── groups: InventoryGroup[]
│       ├── id: string
│       ├── title: string
│       ├── visible: boolean
│       └── items: InventoryItem[]
│           ├── id: string
│           ├── type: 'pc' | 'router' | 'cable' | ...
│           └── used: boolean
│
├── canvas                          ◄── single canvas (default)
│   ├── config: CanvasConfig
│   ├── blocks: Block[][]
│   ├── placedItems: PlacedItem[]
│   └── connections: Connection[]
│
├── canvases                        ◄── multi-canvas (optional)
│   └── [stateKey: string]: CanvasState
│
├── terminal
│   ├── visible: boolean
│   ├── prompt: string
│   └── history: TerminalEntry[]
│
├── overlay
│   ├── activeModal: ModalState | null
│   └── hints: Hint[]
│
└── question
    ├── id: string
    └── status: 'in_progress' | 'completed'
```

### Single vs Multi-Canvas

```ts
// Single canvas (most questions)
state.canvas = { ... }

// Multi-canvas (when stateKey is used)
state.canvases = {
  'left': { ... },
  'right': { ... },
}

// Helper to get canvas state
function getCanvasState(state: GameState, stateKey?: string): CanvasState {
  if (!stateKey) return state.canvas
  return state.canvases?.[stateKey] ?? state.canvas
}
```

---

## Actions

| Action                  | Payload                          | Effect                              |
| ----------------------- | -------------------------------- | ----------------------------------- |
| `INIT_MULTI_CANVAS`     | `{ questionId, canvases, ... }`  | Initialize state for question       |
| `ADD_INVENTORY_GROUP`   | `{ group }`                      | Add a new inventory group           |
| `UPDATE_INVENTORY_GROUP`| `{ id, title?, visible?, items? }`| Update group metadata or items      |
| `REMOVE_INVENTORY_GROUP`| `{ id }`                         | Remove an inventory group           |
| `PURGE_ITEMS`           | `{ itemIds }`                    | Remove items from inventory/canvas  |
| `PLACE_ITEM`            | `{ itemId, blockX, blockY }`     | Move item from inventory to canvas  |
| `REMOVE_ITEM`           | `{ blockX, blockY }`             | Remove item from canvas             |
| `MAKE_CONNECTION`       | `{ from, to, cableId }`          | Create connection between items     |
| `REMOVE_CONNECTION`     | `{ connectionId }`               | Remove a connection                 |
| `CONFIGURE_DEVICE`      | `{ deviceId, config }`           | Update device configuration         |
| `OPEN_MODAL`            | `{ type, deviceId }`             | Show configuration modal            |
| `CLOSE_MODAL`           | —                                | Hide modal                          |
| `SUBMIT_COMMAND`        | `{ input }`                      | Process terminal command            |
| `ADD_TERMINAL_OUTPUT`   | `{ content, type }`              | Add line to terminal history        |
| `SHOW_HINT`             | `{ message, target? }`           | Display hint                        |
| `DISMISS_HINT`          | `{ hintId }`                     | Remove hint                         |
| `SET_PHASE`             | `{ phase }`                      | Change game phase                   |
| `COMPLETE_QUESTION`     | —                                | Mark question as completed          |

---

## Inventory Groups

```ts
// Example: spawn a new credentials inventory when a domain is placed
dispatch({
  type: "ADD_INVENTORY_GROUP",
  payload: {
    group: {
      id: "letsencrypt-credentials",
      title: "Let's Encrypt Credentials",
      visible: true,
      items: [
        { id: "le-private-key", type: "private-key", name: "Private Key", used: false },
        { id: "le-public-key", type: "public-key", name: "Public Key", used: false },
      ],
    },
  },
})

// Later: hide or remove items when the domain is removed
dispatch({ type: "UPDATE_INVENTORY_GROUP", payload: { id: "letsencrypt-credentials", visible: false } })
dispatch({ type: "PURGE_ITEMS", payload: { itemIds: ["le-private-key", "le-public-key"] } })
```

---

## Phase Transitions

```
     ┌────────┐
     │  INIT  │
     └────┬───┘
          │ INIT_MULTI_CANVAS
          ▼
     ┌────────┐
     │ SETUP  │◄────────────────────────┐
     └────┬───┘                         │
          │ all required items placed   │
          ▼                             │
     ┌────────┐                         │
     │PLAYING │                         │ (if user removes items)
     └────┬───┘                         │
          │ validation passes           │
          ▼                             │
     ┌────────┐                         │
     │TERMINAL│─────────────────────────┘
     └────┬───┘        wrong answer (stay in terminal)
          │ correct answer
          ▼
     ┌──────────┐
     │COMPLETED │
     └──────────┘
```

---

## Must Do

- Use `useReducer` for state management
- Be the single source of truth
- Provide context to all children
- Keep state serializable (for persistence)

---

## Must NOT Do

```
❌ Side effects in reducer

function reducer(state, action) {
  if (action.type === 'COMPLETE') {
    localStorage.save(state)  // ❌ side effect
  }
}
```

```
❌ Direct DOM manipulation

useEffect(() => {
  document.querySelector('.canvas').style.opacity = 1  // ❌
}, [])
```

```
❌ Animations in provider

useEffect(() => {
  gsap.to(...)  // ❌ belongs in UI components
}, [])
```

---

## Persistence Hook (Future)

State will be persisted to localStorage to survive refresh:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   GameProvider                                                  │
│       │                                                         │
│       ├── useReducer(reducer, initialState)                     │
│       │                                                         │
│       └── useEffect(() => {                                     │
│               localStorage.setItem('gameState', JSON.stringify) │
│           }, [state])                                           │
│                                                                 │
│   On mount:                                                     │
│       initialState = localStorage.getItem('gameState') || {}    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage

```tsx
// Access state and dispatch in any child component
const { state, dispatch } = useGame()

// Dispatch an action
dispatch({ type: 'PLACE_ITEM', payload: { itemId: 'pc-1', blockX: 2, blockY: 1 } })

// Read state
if (state.phase === 'terminal') {
  // show terminal
}
```

---

## Performance

### Memoization Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Context Split:                                                │
│                                                                 │
│   ┌─────────────────────┐   ┌─────────────────────┐            │
│   │   StateContext      │   │  DispatchContext    │            │
│   │   (state only)      │   │  (dispatch only)    │            │
│   └─────────────────────┘   └─────────────────────┘            │
│                                                                 │
│   Components that only dispatch don't re-render on state change │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Selectors

```ts
// Memoized selectors to prevent unnecessary re-renders
const useInventory = () => {
  const state = useGameState()
  return useMemo(
    () =>
      state.inventory.groups.flatMap(group =>
        group.items.filter(i => !i.used),
      ),
    [state.inventory.groups],
  )
}

const useCanvasItems = () => {
  const state = useGameState()
  return useMemo(() => state.canvas.placedItems, [state.canvas.placedItems])
}
```

### Render Optimization

| Strategy | Implementation |
|----------|----------------|
| Context splitting | Separate state and dispatch contexts |
| Memoized selectors | `useMemo` for derived state |
| Stable dispatch | `dispatch` reference never changes |
| Shallow compare | Only update changed state slices |

---

## Reliability

### Error Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   GameProvider                                                  │
│   └── GameErrorBoundary                                         │
│       └── GameLayout                                            │
│                                                                 │
│   On error:                                                     │
│     1. Log error to console/service                             │
│     2. Show "Something went wrong" UI                           │
│     3. Offer "Reset Game" button                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Validation

```ts
// Validate state on load from localStorage
function validateState(state: unknown): GameState | null {
  if (!state || typeof state !== 'object') return null
  if (!isValidPhase(state.phase)) return null
  if (!Array.isArray(state.inventory?.groups)) return null
  // ... validate each section
  return state as GameState
}

// On load
const saved = localStorage.getItem('gameState')
const parsed = saved ? JSON.parse(saved) : null
const validated = validateState(parsed)
const initialState = validated ?? createDefaultState()
```

### Recovery Strategy

| Scenario | Recovery |
|----------|----------|
| Corrupted state | Reset to default, notify user |
| Missing fields | Merge with defaults |
| Invalid action | Ignore, log warning |
| Reducer throws | Catch in error boundary, reset state |

### State Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max inventory items | 50 | Memory |
| Max placed items | 20 | Performance |
| Max connections | 30 | Render performance |
| Max terminal history | 100 | Memory |

---

## Security

### Input Sanitization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   All user input must be sanitized before storing in state:     │
│                                                                 │
│   1. Terminal input → strip HTML tags                           │
│   2. Config values → validate format, escape strings            │
│   3. Device names → alphanumeric + hyphen only                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sanitization Rules

```ts
// Terminal input
function sanitizeTerminalInput(input: string): string {
  return input
    .slice(0, 200)           // max length
    .replace(/<[^>]*>/g, '') // strip HTML
    .trim()
}

// Config values
function sanitizeConfigValue(value: string): string {
  return value
    .slice(0, 100)
    .replace(/[<>"'&]/g, '') // remove dangerous chars
    .trim()
}

// IP addresses
function sanitizeIP(ip: string): string | null {
  const pattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
  return pattern.test(ip) ? ip : null
}
```

### Action Validation

```ts
function reducer(state: GameState, action: GameAction): GameState {
  // Validate action payload before processing
  switch (action.type) {
    case 'SUBMIT_COMMAND':
      const input = sanitizeTerminalInput(action.payload.input)
      if (!input) return state // reject empty
      // ... process

    case 'CONFIGURE_DEVICE':
      const config = validateDeviceConfig(action.payload.config)
      if (!config) return state // reject invalid
      // ... process
  }
}
```

### localStorage Security

| Risk | Mitigation |
|------|------------|
| XSS reading state | No sensitive data in state |
| State tampering | Validate on load |
| Storage overflow | Limit state size, catch quota errors |
