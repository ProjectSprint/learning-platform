# GameLayout — Specification

The **GameLayout** handles structural layout only.
It composes child components without logic.

---

## Responsibility

- Arrange game segments on screen
- Responsive layout (desktop → mobile)
- No game logic, no state reading

---

## Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER (optional, outside GameLayout)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┬─────────────────────────────────────────────────────┐   │
│   │               │                                                     │   │
│   │   INVENTORY   │                    PLAY CANVAS                      │   │
│   │    PANEL      │                                                     │   │
│   │               │                                                     │   │
│   │    width:     │                     flex: 1                         │   │
│   │    fixed      │                                                     │   │
│   │    (200px)    │                                                     │   │
│   │               │                                                     │   │
│   │               │                                                     │   │
│   │               │                                                     │   │
│   │               │                                                     │   │
│   │               │                                                     │   │
│   │               │                                                     │   │
│   └───────────────┴─────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         TERMINAL PANEL                              │   │
│   │                          height: fixed                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Layout (Future)

```
┌───────────────────────────┐
│         HEADER            │
├───────────────────────────┤
│                           │
│       PLAY CANVAS         │
│        (full width)       │
│                           │
│                           │
├───────────────────────────┤
│   INVENTORY (horizontal   │
│   scrollable strip)       │
├───────────────────────────┤
│      TERMINAL PANEL       │
│                           │
└───────────────────────────┘
```

---

## Segments

Each segment is a self-contained module:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               GameLayout                                    │
│                                                                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │  InventoryPanel │   │   PlayCanvas    │   │  TerminalPanel  │          │
│   │                 │   │                 │   │                 │          │
│   │   • standalone  │   │   • standalone  │   │   • standalone  │          │
│   │   • own styles  │   │   • own styles  │   │   • own styles  │          │
│   │   • no coupling │   │   • no coupling │   │   • no coupling │          │
│   │                 │   │                 │   │                 │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          OverlayLayer                               │   │
│   │                     (portal, renders above)                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Segment Properties

| Segment        | Position      | Size                  | Scroll        |
| -------------- | ------------- | --------------------- | ------------- |
| InventoryPanel | Left          | Fixed width (200px)   | Internal      |
| PlayCanvas     | Center        | Flex (fill remaining) | None          |
| TerminalPanel  | Bottom        | Fixed height (150px)  | Internal      |
| OverlayLayer   | Above all     | Full viewport         | None          |

---

## Must Do

- Compose children without logic
- Handle responsive breakpoints
- Keep segments modular and independent

```tsx
export function GameLayout() {
  return (
    <Box display="flex" flexDirection="column" height="100vh">
      <Box display="flex" flex="1" overflow="hidden">
        <InventoryPanel />
        <PlayCanvas />
      </Box>
      <TerminalPanel />
      <OverlayLayer />
    </Box>
  )
}
```

---

## Must NOT Do

```
❌ Reading game state

const { state } = useGame()
if (state.phase === 'terminal') {
  // change layout
}
```

```
❌ Conditional rendering based on game logic

{state.inventory.length > 0 && <InventoryPanel />}
```

```
❌ Passing game data as props

<PlayCanvas items={state.canvasItems} />  // ❌ PlayCanvas reads from context
```

---

## Visibility Control

Segments control their own visibility based on state:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   GameLayout always renders all segments                        │
│                                                                 │
│   Each segment decides internally whether to show content:      │
│                                                                 │
│   InventoryPanel:                                               │
│       - Always visible                                          │
│       - Shows remaining items                                   │
│                                                                 │
│   PlayCanvas:                                                   │
│       - Always visible                                          │
│       - Shows placed items                                      │
│                                                                 │
│   TerminalPanel:                                                │
│       - Reads state.terminal.visible                            │
│       - Hides/shows itself                                      │
│                                                                 │
│   OverlayLayer:                                                 │
│       - Reads state.overlay.activeModal                         │
│       - Renders modal if present                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## CSS Structure

```
.game-layout
├── .game-main (flex row)
│   ├── .inventory-panel
│   └── .play-canvas
├── .terminal-panel
└── .overlay-layer (portal)
```

---

## Performance

### Render Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   GameLayout is a static shell — it should almost never        │
│   re-render after initial mount.                                │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     GameLayout                          │   │
│   │                   (renders once)                        │   │
│   │                                                         │   │
│   │   ┌───────────┐ ┌───────────┐ ┌───────────┐            │   │
│   │   │ Inventory │ │  Canvas   │ │ Terminal  │            │   │
│   │   │ (own ctx) │ │ (own ctx) │ │ (own ctx) │            │   │
│   │   └───────────┘ └───────────┘ └───────────┘            │   │
│   │                                                         │   │
│   │   Each segment reads its own slice of context           │   │
│   │   GameLayout doesn't read any context                   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CSS Performance

| Strategy | Implementation |
|----------|----------------|
| CSS containment | `contain: layout` on segments |
| Will-change | Avoid, let browser optimize |
| Flexbox | Use instead of JS for layout |
| No layout thrashing | No JS-based measurements |

---

## Reliability

### Graceful Degradation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   If a segment fails to render:                                 │
│                                                                 │
│   ┌───────────┐ ┌───────────────────────────┐ ┌───────────┐    │
│   │ Inventory │ │     ⚠️ Canvas Error       │ │ Terminal  │    │
│   │  (works)  │ │   "Failed to load canvas" │ │  (works)  │    │
│   │           │ │      [ Retry ]            │ │           │    │
│   └───────────┘ └───────────────────────────┘ └───────────┘    │
│                                                                 │
│   Each segment wrapped in its own error boundary               │
│   Failure in one doesn't crash the others                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Segment Error Boundaries

```tsx
<Box display="flex" flex="1">
  <SegmentErrorBoundary name="inventory">
    <InventoryPanel />
  </SegmentErrorBoundary>

  <SegmentErrorBoundary name="canvas">
    <PlayCanvas />
  </SegmentErrorBoundary>
</Box>

<SegmentErrorBoundary name="terminal">
  <TerminalPanel />
</SegmentErrorBoundary>
```

---

## Security

### Content Security

| Risk | Mitigation |
|------|------------|
| Iframe injection | No dynamic iframes |
| Script injection | No `dangerouslySetInnerHTML` |
| Style injection | CSS-in-JS scoped styles |

### Layout Stability

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Layout is static — no user-controlled dimensions:             │
│                                                                 │
│   ❌ <Box width={userInput} />                                  │
│   ✅ <Box width="200px" />                                      │
│                                                                 │
│   Prevents layout manipulation attacks                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usability Additions

### Landmark Regions

```tsx
<Box as="main" role="main">
  <Box as="aside" role="complementary" aria-label="Inventory">
    <InventoryPanel />
  </Box>

  <Box as="section" role="region" aria-label="Game Canvas">
    <PlayCanvas />
  </Box>

  <Box as="section" role="region" aria-label="Command Terminal">
    <TerminalPanel />
  </Box>
</Box>
```

### Skip Links

```tsx
<a href="#game-canvas" className="skip-link">
  Skip to Game Canvas
</a>
<a href="#terminal" className="skip-link">
  Skip to Terminal
</a>
```
