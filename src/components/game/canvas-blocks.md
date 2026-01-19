# Canvas Block System — Specification

This document defines the **canvas block system** used across all questions.
It provides a reusable grid-based placement system for drag-and-drop puzzles.

---

## Purpose

The canvas block system exists to:

- Provide consistent drag-and-drop behavior across questions
- Handle snap-to-grid placement
- Track connections between placed items
- Be question-agnostic (networking, security, databases, etc.)

---

## Canvas Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ CANVAS                                                          │
│                                                                 │
│   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   │ 0,0 │───│ 1,0 │───│ 2,0 │───│ 3,0 │───│ 4,0 │───│ 5,0 │    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘    │
│      │         │         │         │         │         │        │
│   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   │ 0,1 │───│ 1,1 │───│ 2,1 │───│ 3,1 │───│ 4,1 │───│ 5,1 │    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘   └──┬──┘    │
│      │         │         │         │         │         │        │
│   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   │ 0,2 │───│ 1,2 │───│ 2,2 │───│ 3,2 │───│ 4,2 │───│ 5,2 │    │
│   │     │   │     │   │     │   │     │   │     │   │     │    │
│   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘    │
│                                                                 │
│   ─── = possible connection path (invisible until connected)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Grid Properties

| Property        | Description                                      |
| --------------- | ------------------------------------------------ |
| Columns         | Configurable per question (default: 6)           |
| Rows            | Configurable per question (default: 4)           |
| Block size      | Determined by units (1u, 2u, etc.)               |
| Base unit       | Responsive, based on canvas container            |
| Blocks          | Invisible until item placed or hovered           |
| Connection paths| Direct lines, drawn sequentially                 |

### Block Sizing (Units)

Blocks can have different sizes using a unit system:

```
┌───────┐   ┌───────────────┐   ┌───────────────────────┐
│  1u   │   │      2u       │   │          3u           │
│       │   │               │   │                       │
└───────┘   └───────────────┘   └───────────────────────┘

Example: A router might be 2u, a PC might be 1u
```

| Size | Use case                          |
| ---- | --------------------------------- |
| 1u   | Small devices (PC, switch)        |
| 2u   | Medium devices (router, server)   |
| 3u   | Large devices (rack, datacenter)  |

---

## Block States

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │     │ ╔═════════════╗ │
│                 │     │ ┄   HOVER    ┄ │     │ ║   PLACED    ║ │
│     EMPTY       │     │ ┄  (dashed)  ┄ │     │ ║   (solid)   ║ │
│   (invisible)   │     │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │     │ ╚═════════════╝ │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │                       │
       │                        │                       │
       ▼                        ▼                       ▼
   No visual              Shows drop zone          Shows placed item
   indicator              when dragging            with status indicator
```

| State    | Visual                  | Interaction                    |
| -------- | ----------------------- | ------------------------------ |
| empty    | Invisible               | Accepts drop                   |
| hover    | Dashed border           | Shows when dragging over       |
| occupied | Item rendered           | Click to configure/inspect     |
| invalid  | Red dashed border       | Cannot drop here               |

---

## Drag & Drop Flow

```
Step 1 │ User starts dragging item from Inventory
       │
       │   INVENTORY                    CANVAS
       │   ┌───────┐                    ┌─────────────────┐
       │   │ PC-1  │ ←── dragging       │                 │
       │   │  ✋   │                    │   ┄┄┄   ┄┄┄     │
       │   └───────┘                    │   ┄┄┄   ┄┄┄     │
       │                                └─────────────────┘
       │
───────┼───────────────────────────────────────────────────────────
       │
Step 2 │ User drags over canvas → blocks become visible
       │
       │   INVENTORY                    CANVAS
       │   ┌───────┐                    ┌─────────────────┐
       │   │       │     PC-1           │ ┌───┐ ┌───┐     │
       │   │       │      ↘             │ │   │ │ ┄ │ ←── hover
       │   └───────┘                    │ └───┘ └───┘     │
       │                                └─────────────────┘
       │
───────┼───────────────────────────────────────────────────────────
       │
Step 3 │ User drops → item snaps to block
       │
       │   INVENTORY                    CANVAS
       │   ┌───────┐                    ┌─────────────────┐
       │   │       │                    │ ┌───┐ ╔═══╗     │
       │   │       │                    │ │   │ ║PC1║     │
       │   └───────┘                    │ └───┘ ╚═══╝     │
       │                                └─────────────────┘
       │
       │   Item removed from inventory
       │   Block marked as occupied
```

---

## Connection System

Connections link two occupied blocks (e.g., cable between PC and Router).

### Connection Types

| Type       | Visual          | Behavior                              |
| ---------- | --------------- | ------------------------------------- |
| cable      | Solid line      | Physical connection (ethernet)        |
| wireless   | Dashed line     | Wireless connection (future)          |
| data-flow  | Animated arrow  | Shows data direction (future)         |

### Creating a Connection

```
Step 1 │ User drags cable from inventory
       │
       │   Cable follows cursor, no snap yet
       │
───────┼───────────────────────────────────────────────────────────
       │
Step 2 │ User hovers over first device → attaches
       │
       │   ╔═══╗
       │   ║PC1║──○ ←── cable end attached, waiting for second
       │   ╚═══╝
       │
───────┼───────────────────────────────────────────────────────────
       │
Step 3 │ User drags to second device → connection made
       │
       │   ╔═══╗         ╔══════╗
       │   ║PC1║─────────║Router║
       │   ╚═══╝         ╚══════╝
       │
       │   Cable removed from inventory
       │   Connection registered in state
```

### Connection Rules

| Rule                                      | Behavior                          |
| ----------------------------------------- | --------------------------------- |
| Cable requires two endpoints              | Cancel if dropped on empty space  |
| Can't connect device to itself            | Invalid drop indicator            |
| Can't duplicate existing connection       | Invalid drop indicator            |
| Connection removed if device removed      | Auto-cleanup                      |

---

## Canvas Configuration

Each question provides a canvas config:

```ts
type CanvasConfig = {
  id: string
  columns: number
  rows: number

  // Optional state namespace (for multi-canvas)
  stateKey?: string               // defaults to 'canvas'

  // Optional constraints
  maxItems?: number                // limit total placed items

  // Optional pre-placed items (for tutorials)
  initialPlacements?: Placement[]
}

// Note: Item placement is controlled by the item's `allowedPlaces` property.
// Items must have the canvas key in their allowedPlaces to be placed there.

type Placement = {
  blockX: number
  blockY: number
  itemType: string
  itemId: string
  locked?: boolean   // can't be moved/removed
}
```

---

## Block Data Structure

```ts
type Block = {
  x: number
  y: number
  state: 'empty' | 'occupied'
  item: PlacedItem | null
}

type PlacedItem = {
  id: string
  type: string                    // 'pc' | 'router' | 'switch' | etc.
  status: 'normal' | 'warning' | 'success' | 'error'
  data: Record<string, unknown>   // question-specific data (e.g., IP, config)
}

type Connection = {
  id: string
  type: 'cable' | 'wireless'
  from: { x: number, y: number }  // block coordinates
  to: { x: number, y: number }    // block coordinates
}
```

---

## Canvas State

```ts
type CanvasState = {
  config: CanvasConfig
  blocks: Block[][]               // 2D grid
  connections: Connection[]
  selectedBlock: { x: number, y: number } | null
}
```

---

## Events

The canvas emits these events for the question logic to handle:

| Event              | Payload                              | When                        |
| ------------------ | ------------------------------------ | --------------------------- |
| `item:placed`      | `{ block, item }`                    | Item dropped on block       |
| `item:removed`     | `{ block, item }`                    | Item removed from block     |
| `item:clicked`     | `{ block, item }`                    | Placed item clicked         |
| `connection:made`  | `{ connection }`                     | Cable connected two items   |
| `connection:removed`| `{ connection }`                    | Connection removed          |

---

## Visual Feedback

| Scenario                     | Feedback                                    |
| ---------------------------- | ------------------------------------------- |
| Dragging over valid block    | Dashed border, slight scale up              |
| Dragging over invalid block  | Red dashed border, no scale                 |
| Item placed                  | Snap animation, subtle bounce               |
| Connection made              | Line draws from A to B                      |
| Item has warning             | Pulsing yellow indicator                    |
| Item configured successfully | Flash green, then solid                     |

---

## Accessibility

| Requirement                  | Implementation                              |
| ---------------------------- | ------------------------------------------- |
| Keyboard navigation          | Arrow keys to move between blocks           |
| Screen reader                | Announce block state, item type             |
| Focus indicators             | Visible focus ring on selected block        |
| Alternative to drag          | Select item, then select target block       |

---

## Integration with Questions

The canvas is question-agnostic. Questions integrate by:

1. Providing `CanvasConfig` with grid size and allowed items
2. Listening to canvas events
3. Updating `PlacedItem.data` for question-specific state
4. Updating `PlacedItem.status` for visual feedback

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   QUESTION LOGIC                                                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ - Defines inventory items                               │   │
│   │ - Handles item:clicked → show config modal              │   │
│   │ - Handles connection:made → assign IPs, check state     │   │
│   │ - Updates item status based on validation               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          │ events / state updates               │
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ CANVAS BLOCK SYSTEM                                     │   │
│   │ - Handles drag & drop                                   │   │
│   │ - Manages grid and blocks                               │   │
│   │ - Renders items and connections                         │   │
│   │ - Emits events                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PlayCanvas Component

The React component that renders the canvas block system.

### Component Hierarchy

```
PlayCanvas
├── CanvasGrid
│   └── Block (×n)
│       └── PlacedItem (if occupied)
│           └── StatusIndicator
├── ConnectionLayer
│   └── ConnectionLine (×n)
└── DragPreview (when dragging)
```

### Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                         PlayCanvas                              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                       DOES                              │   │
│   │                                                         │   │
│   │   • Render grid of blocks                               │   │
│   │   • Handle drop events                                  │   │
│   │   • Render placed items from state                      │   │
│   │   • Render connections between items                    │   │
│   │   • Dispatch PLACE_ITEM on valid drop                   │   │
│   │   • Dispatch MAKE_CONNECTION on cable drop              │   │
│   │   • Emit item:clicked when item clicked                 │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     DOES NOT                            │   │
│   │                                                         │   │
│   │   • Validate game logic                                 │   │
│   │   • Open modals directly                                │   │
│   │   • Assign IPs or configure devices                     │   │
│   │   • Determine win/lose state                            │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Must Do

- Read canvas state from `state.canvas`
- Dispatch `PLACE_ITEM` when item dropped on valid block
- Dispatch `MAKE_CONNECTION` when cable connects two devices
- Dispatch `OPEN_MODAL` when placed item is clicked
- Use `gsap-drag` to register Draggable + InertiaPlugin and compute snap-to-grid positions

---

## Must NOT Do

```
❌ Game logic in canvas

if (item.type === 'router' && !item.data.configured) {
  item.status = 'warning'  // ❌ reducer handles this
}
```

```
❌ Opening modals directly

onClick={() => setModalOpen(true)}  // ❌ dispatch OPEN_MODAL instead
```

```
❌ Validating connections

if (canConnect(from, to)) {  // ❌ reducer validates
  // ...
}
```

---

## Multi-Canvas Support

For questions that need multiple canvases (e.g., source/destination, before/after):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────────────────────┐   ┌─────────────────────────────┐        │
│   │      CANVAS LEFT            │   │      CANVAS RIGHT           │        │
│   │      stateKey: 'left'       │   │      stateKey: 'right'      │        │
│   │                             │   │                             │        │
│   │   ┌───┐       ┌───┐        │   │   ┌───┐       ┌───┐        │        │
│   │   │PC1│───────│ R │        │   │   │PC3│───────│ R │        │        │
│   │   └───┘       └───┘        │   │   └───┘       └───┘        │        │
│   │                             │   │                             │        │
│   └─────────────────────────────┘   └─────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Usage

```tsx
// Single canvas (default)
<PlayCanvas config={config} />

// Multi-canvas with stateKey
<Box display="flex" gap={4}>
  <PlayCanvas config={{ ...config, stateKey: 'left' }} />
  <PlayCanvas config={{ ...config, stateKey: 'right' }} />
</Box>
```

### State Structure

```ts
// Single canvas
state.canvas = { blocks, connections, ... }

// Multi-canvas
state.canvases = {
  'left': { blocks, connections, ... },
  'right': { blocks, connections, ... },
}
```

### Actions with stateKey

```ts
// Without stateKey (default 'canvas')
dispatch({ type: 'PLACE_ITEM', payload: { ... } })

// With stateKey
dispatch({ type: 'PLACE_ITEM', payload: { stateKey: 'left', ... } })
```

### Cross-Canvas Connections

| Scenario | Support |
|----------|---------|
| Items within same canvas | ✅ Supported |
| Items across canvases | ❌ Not supported (use question logic) |

---

## Decisions

| Question                          | Decision                                      |
| --------------------------------- | --------------------------------------------- |
| Can items span multiple blocks?   | No, one item per block                        |
| Can blocks have different sizes?  | Yes, determined by units                      |
| Connection rendering              | Direct line, sequential (no pathfinding)      |
| Mobile touch support              | Same behavior as mouse                        |
| Multi-canvas                      | Supported via optional `stateKey`             |

---

## Performance

### Render Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Canvas has multiple render layers:                            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Layer 3: DragPreview (only during drag)                │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  Layer 2: ConnectionLayer (SVG lines)                   │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │  Layer 1: BlockGrid + PlacedItems                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Each layer updates independently                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Memoization Strategy

```ts
// Memoize blocks that haven't changed
const Block = memo(({ x, y, item, status }) => {
  // Only re-render when these props change
}, (prev, next) => {
  return prev.item?.id === next.item?.id &&
         prev.status === next.status
})

// Memoize connections
const ConnectionLine = memo(({ from, to }) => {
  // SVG line between two points
})
```

### Grid Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max columns | 12 | Screen width |
| Max rows | 8 | Screen height |
| Max placed items | 20 | Render performance |
| Max connections | 30 | SVG performance |

### Connection Rendering

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Connections rendered as single SVG layer:                     │
│                                                                 │
│   <svg className="connections-layer">                           │
│     {connections.map(conn => (                                  │
│       <line key={conn.id} x1={...} y1={...} x2={...} y2={...} />│
│     ))}                                                         │
│   </svg>                                                        │
│                                                                 │
│   SVG is GPU accelerated, handles many lines efficiently        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reliability

### State Validation

```ts
// Validate canvas state on load
function validateCanvasState(state: unknown): CanvasState | null {
  if (!state || typeof state !== 'object') return null

  // Validate grid dimensions
  if (!isValidGrid(state.blocks)) return null

  // Validate each placed item
  if (!state.placedItems.every(isValidPlacedItem)) return null

  // Validate connections reference valid items
  if (!state.connections.every(c => isValidConnection(c, state.placedItems))) {
    return null
  }

  return state as CanvasState
}
```

### Connection Integrity

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Connection rules enforced:                                    │
│                                                                 │
│   1. Both endpoints must exist                                  │
│   2. No duplicate connections                                   │
│   3. No self-connections                                        │
│   4. Auto-remove orphaned connections                           │
│                                                                 │
│   On item removal:                                              │
│     connections = connections.filter(c =>                       │
│       c.from !== removedId && c.to !== removedId                │
│     )                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Block State Recovery

```ts
// If block state is corrupted, rebuild from placed items
function rebuildBlocks(config: CanvasConfig, items: PlacedItem[]): Block[][] {
  const blocks = createEmptyGrid(config.columns, config.rows)

  for (const item of items) {
    if (isValidPosition(item.x, item.y, config)) {
      blocks[item.y][item.x] = {
        x: item.x,
        y: item.y,
        state: 'occupied',
        item,
      }
    }
  }

  return blocks
}
```

### Drop Failure Handling

| Scenario | Recovery |
|----------|----------|
| Drop on occupied block | Reject, show feedback |
| Drop outside canvas | Cancel drag, return item |
| Invalid item type | Reject, log warning |
| Connection to self | Reject, show feedback |

---

## Security

### Drop Data Validation

```ts
function handleDrop(e: DragEvent) {
  const raw = e.dataTransfer.getData('application/json')

  // Parse safely
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return // reject malformed data
  }

  // Validate structure
  if (!isValidDropData(data)) {
    return // reject invalid structure
  }

  // Validate item type
  if (!ALLOWED_ITEM_TYPES.includes(data.itemType)) {
    return // reject unknown type
  }

  // Validate item exists in inventory
  if (!inventory.find(i => i.id === data.itemId)) {
    return // reject non-existent item
  }

  // Safe to process
  dispatch({ type: 'PLACE_ITEM', payload: data })
}
```

### Position Validation

```ts
function isValidPosition(x: number, y: number, config: CanvasConfig): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < config.columns &&
    y >= 0 &&
    y < config.rows
  )
}
```

### Item Data Sanitization

```ts
// PlacedItem.data can contain question-specific data
// Sanitize before storing

function sanitizeItemData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Only allow primitive values
    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, 200).replace(/<[^>]*>/g, '')
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    }
    // Reject objects, arrays, functions
  }

  return sanitized
}
```
