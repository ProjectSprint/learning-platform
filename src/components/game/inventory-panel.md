# InventoryPanel — Specification

The **InventoryPanel** displays available items and handles drag initiation.
It is a drag source only — no drop, no game logic.

---

## Responsibility

- Display inventory items
- Handle drag start
- Show item count/availability
- Remove visual when item is used

---

## Layout

```
┌─────────────────────────┐
│     INVENTORY           │
│                         │
│   ┌─────────────────┐   │
│   │      PC-1       │   │
│   │       💻        │   │
│   └─────────────────┘   │
│                         │
│   ┌─────────────────┐   │
│   │      PC-2       │   │
│   │       💻        │   │
│   └─────────────────┘   │
│                         │
│   ┌─────────────────┐   │
│   │     Cable       │   │
│   │      ───        │   │
│   │      ×2         │◄──┼── quantity badge
│   └─────────────────┘   │
│                         │
│   ┌─────────────────┐   │
│   │     Router      │   │
│   │       📦        │   │
│   └─────────────────┘   │
│                         │
│   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│   │     (used)      │◄──┼── used item (dimmed/hidden)
│   └ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                         │
└─────────────────────────┘
```

---

## Item States

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │   ┄┄┄┄┄┄┄┄┄┄┄   │     │                 │
│    AVAILABLE    │     │    DRAGGING     │     │      USED       │
│                 │     │   ┄┄┄┄┄┄┄┄┄┄┄   │     │    (hidden)     │
│   solid border  │     │  dashed, ghost  │     │                 │
│   full opacity  │     │   50% opacity   │     │   removed from  │
│                 │     │                 │     │      list       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
   Ready to drag         Being dragged           On canvas
```

| State     | Visual                      | Interaction           |
| --------- | --------------------------- | --------------------- |
| available | Solid, full opacity         | Draggable             |
| dragging  | Ghost, dashed border        | —                     |
| used      | Hidden from panel           | —                     |

---

## Drag Behavior

```
Step 1 │ User mousedown/touchstart on item
       │
       │   ┌─────────────────┐
       │   │     PC-1        │ ◄── cursor: grab
       │   │      💻         │
       │   └─────────────────┘
       │
───────┼───────────────────────────────────────────────────────
       │
Step 2 │ Drag starts → item becomes ghost
       │
       │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
       │   │     PC-1        │ ◄── ghost in inventory
       │   │      💻         │
       │   └ ─ ─ ─ ─ ─ ─ ─ ─ ┘
       │
       │                 ┌─────────────────┐
       │                 │     PC-1        │ ◄── drag preview follows cursor
       │                 │      💻         │
       │                 └─────────────────┘
       │
───────┼───────────────────────────────────────────────────────
       │
Step 3a│ Drop on valid target → item removed from inventory
       │
       │   (PC-1 no longer in panel)
       │
───────┼───────────────────────────────────────────────────────
       │
Step 3b│ Drop on invalid target → item returns
       │
       │   ┌─────────────────┐
       │   │     PC-1        │ ◄── back to available
       │   │      💻         │
       │   └─────────────────┘
```

---

## Data Transfer

When dragging, set data for the canvas to read:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   onDragStart(event) {                                          │
│     event.dataTransfer.setData('application/json', JSON.stringify({
│       itemId: item.id,                                          │
│       itemType: item.type,                                      │
│     }))                                                         │
│     event.dataTransfer.effectAllowed = 'move'                   │
│   }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## InventoryItem Component

Each item in the panel:

```
┌─────────────────────────────────────────────────────────────────┐
│                        InventoryItem                            │
│                                                                 │
│   Props:                                                        │
│     • item: { id, type, name, icon }                            │
│                                                                 │
│   State:                                                        │
│     • isDragging: boolean (local)                               │
│                                                                 │
│   Renders:                                                      │
│     • Icon                                                      │
│     • Label                                                     │
│     • Quantity badge (if > 1)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Must Do

- Read inventory from `state.inventory.items`
- Filter out used items (`item.used === true`)
- Set drag data on drag start
- Show quantity for stackable items (cables)
- Use native HTML5 drag events; GSAP Draggable + Inertia stay in PlayCanvas via `gsap-drag`

---

## Must NOT Do

```
❌ Dispatching placement actions

onDragEnd={() => {
  dispatch({ type: 'PLACE_ITEM' })  // ❌ canvas handles this
}}
```

```
❌ Checking game state for conditional logic

if (state.phase === 'terminal') {
  return null  // ❌ always render, let CSS handle visibility
}
```

```
❌ Validating drop targets

if (!canPlaceHere(x, y)) {
  // ❌ canvas validates, not inventory
}
```

---

## Accessibility

| Requirement           | Implementation                              |
| --------------------- | ------------------------------------------- |
| Keyboard drag         | Enter to pick up, arrows to move, Enter to drop |
| Screen reader         | "PC-1, draggable item"                      |
| Focus visible         | Outline on focus                            |
| Role                  | `role="listitem"` with `aria-grabbed`       |

---

## Performance

### Render Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   InventoryPanel renders a list of items.                       │
│   Use memoization to prevent re-rendering unchanged items.      │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  const InventoryItem = memo(({ item }) => { ... })      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Only re-render when:                                          │
│     • item.used changes                                         │
│     • item is being dragged                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Virtualization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   For inventories with many items (future):                     │
│                                                                 │
│   Current: Render all items (< 20 items expected)               │
│   Future:  Use virtualization if > 50 items                     │
│                                                                 │
│   Implementation: react-window or similar                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Drag Performance

| Optimization | Implementation |
|--------------|----------------|
| Native drag | Use HTML5 drag API, not JS simulation |
| No re-render on drag | Drag state is local, not in context |
| Lightweight preview | Simple element, no heavy components |

---

## Reliability

### Item Validation

```ts
// Validate item before rendering
function isValidItem(item: unknown): item is InventoryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.used === 'boolean'
  )
}

// Filter invalid items
const validItems = items.filter(isValidItem)
```

### Drag Failure Recovery

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   If drag fails or is cancelled:                                │
│                                                                 │
│   1. Item returns to original position                          │
│   2. Drag state reset to idle                                   │
│   3. No state mutation occurred                                 │
│                                                                 │
│   Drag only commits on successful drop (handled by Canvas)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   When all items are used:                                      │
│                                                                 │
│   ┌───────────────────────┐                                     │
│   │      INVENTORY        │                                     │
│   │                       │                                     │
│   │   All items placed    │                                     │
│   │        ✓              │                                     │
│   │                       │                                     │
│   └───────────────────────┘                                     │
│                                                                 │
│   Show helpful message, not empty container                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security

### Drag Data Security

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Data transferred during drag:                                 │
│                                                                 │
│   ✅ Safe:                                                      │
│   {                                                             │
│     "itemId": "pc-1",                                           │
│     "itemType": "pc"                                            │
│   }                                                             │
│                                                                 │
│   ❌ Never include:                                             │
│   - User data                                                   │
│   - Configuration values                                        │
│   - Executable code                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Drop Validation

```ts
// Canvas validates drop data, not inventory
// But inventory should only set valid data

function onDragStart(e: DragEvent, item: InventoryItem) {
  const data = {
    itemId: sanitizeId(item.id),      // alphanumeric only
    itemType: sanitizeType(item.type), // from allowed list
  }
  e.dataTransfer.setData('application/json', JSON.stringify(data))
}
```

### Allowed Item Types

```ts
const ALLOWED_TYPES = ['pc', 'router', 'switch', 'cable'] as const

function sanitizeType(type: string): string {
  return ALLOWED_TYPES.includes(type as any) ? type : 'unknown'
}
```
