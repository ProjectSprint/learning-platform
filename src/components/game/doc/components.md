# Components — UI Components Reference

This document covers all React components used to render a question game.

## GameProvider

Top-level context provider. Wraps the entire question in game state management.

```typescript
import { GameProvider } from "@/components/game/game-provider";
```

```tsx
<GameProvider>
  <MyPage />
</GameProvider>
```

**Side effects:** Creates a useReducer with applicationReducer and wraps
children in a nested provider chain:

```
GameStateContext.Provider
  └── GameDispatchContext.Provider
        └── ArrowProvider        (arrow layer state)
              └── DrawerProvider (drawer panel state)
                    └── HintProvider     (hint text state)
                          └── TerminalProvider (terminal history, prompt, visibility)
                                └── DragProvider     (drag-and-drop state)
```

**All hooks below require GameProvider as ancestor.** If a hook throws
"must be used within GameProvider", the component is not wrapped.

**Props:**
- `children: ReactNode` — Required.
- `initialState?: GameState` — Optional override for testing.

---

## GameBoard

Wrapper that provides arrow drawing and board registration context.

```typescript
import { GameBoard } from "@/components/game/engine";
```

```tsx
<GameBoard>
  <GridSpace ... />
  <GridSpace ... />
  <PoolSpace ... />
  <DragOverlay ... />
</GameBoard>
```

All GridSpace and PoolSpace components should be children of GameBoard.
GameBoard provides `BoardRegistryProvider` (for tracking board positions) and
`BoardArrowSurface` (SVG layer for arrows between spaces).

---

## GridSpace

Declarative grid space renderer with integrated drag-and-drop.

```typescript
import { GridSpace } from "@/components/game/engine";
```

```tsx
<GridSpace
  ctx={gameCtx}
  config={SPACE_CONFIG}
  title="Router Board"
  responsiveSize={{ base: [1, 3], lg: [3, 1] }}
  onEntityClick={(entity) => handleClick(entity)}
  isEntityClickable={(entity) => entity.type === "router"}
  getEntityLabel={(entity) => entity.name ?? entity.type}
  getEntityStatus={(entity) => ({
    status: entity.state.status as "success" | "warning" | "error" | undefined,
    message: String(entity.state.ip ?? ""),
  })}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Space ID (alternative to config) |
| `config` | `GridSpaceConfig` | Space config. Requires `id` or `config` (at least one). |
| `ctx` | `GameContextValue` | Game context from `useGameCtx()`. Optional but recommended for explicit wiring. |
| `title` | `string` | Display title. Falls back to config.name, then config.id. |
| `responsiveSize` | `Record<string, [cols, rows]>` | Responsive grid remapping. Keys are Chakra breakpoints. |
| `onEntityClick` | `(entity: EntityData) => void` | Called when entity is clicked (not dragged). |
| `isEntityClickable` | `(entity: EntityData) => boolean` | Determines if entity shows click affordance. |
| `getEntityLabel` | `(entity: EntityData) => string` | Display label for entity card. |
| `getEntityStatus` | `(entity: EntityData) => { status?: string; message?: string \| null }` | Status badge for entity. |

**Side effects:**
- Reads space data from GameState by `config.id` or `id`.
- Validates entity placement using `canEntityBePlaced()`.
- Dispatches `ENTITY_ADDED`, `ENTITY_MOVED`, or `ENTITY_POSITION_UPDATED` on drop.
- Emits `ENTITY_CLICKED` event when entity is clicked (not dragged).
- Uses ResizeObserver to track board dimensions for arrow positioning.

**Click vs drag detection:** GridSpaceView detects click by measuring pointer
movement (threshold = 5px). Small movements trigger click; larger movements
trigger drag.

**Responsive remapping:** When `responsiveSize` is provided, entity positions
are remapped from data coordinates to view coordinates. Example: a 3×1 data
grid displayed as 1×3 on mobile.

**Limitation:** GridSpace does not create the space. The space must exist in
GameState (created by bootstrapQuestion from QuestionDefinition). If the space
is not found, GridSpace renders nothing and logs a dev warning.

---

## PoolSpace

Declarative inventory/pool renderer with drag initiation.

```typescript
import { PoolSpace } from "@/components/game/engine";
```

```tsx
<PoolSpace
  ctx={gameCtx}
  config={INVENTORY_POOL_CONFIG}
  title="Equipment"
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Space ID (defaults to "inventory") |
| `config` | `PoolSpaceConfig` | Pool config. Requires `id` or `config`. |
| `ctx` | `GameContextValue` | Game context from `useGameCtx()` |
| `title` | `string` | Display title |

**Side effects:**
- Reads pool data from GameState.
- Tracks which entities are placed in other spaces (dimmed in pool).
- Initiates drag via DragContext when entity is pointer-downed.
- Dispatches `ENTITY_MOVED` when entity is returned to pool.

**Limitation:** Only draggable entities (`ItemData.draggable === true`) that
are currently in the pool can be dragged. Entities placed in grid spaces are
shown dimmed and cannot be dragged from pool.

---

## DragOverlay

Floating drag preview that follows the pointer during drag.

```typescript
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
```

```tsx
<DragOverlay getEntityLabel={(type) => getNetworkingItemLabel(type)} />
```

**Props:**
- `getEntityLabel: (entityType: string) => string` — Maps entity type to display label.

**Side effects:**
- Reads active drag state from DragContext.
- Positions a floating element at pointer coordinates during drag.
- Animates drop to target position on release.
- Hides the source entity during drag.

Must be a child of GameBoard (inside DragProvider).

---

## DrawerLayout

Responsive drawer panel for inventory or custom content.

```typescript
import { DrawerLayout } from "@/components/game/presentation/drawer";
```

```tsx
<DrawerLayout drawerId="inventory-drawer">
  <PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
</DrawerLayout>
```

**Props:**
- `drawerId: string` — Must match the ID used in `registerDrawer()`.
- `children: ReactNode` — Drawer body content.

**Setup:** Register the drawer in useLayoutEffect before rendering DrawerLayout:

```typescript
const { registerDrawer } = useDrawerManager();

useLayoutEffect(() => {
  registerDrawer({
    id: "inventory-drawer",
    contentType: "space",
    spaceId: "inventory",
    title: "Items",
    position: "bottom",
    initialState: "expanded",
    expandedSize: { base: "65vh", md: "40vh" },
    foldedSize: { sm: "30vh" },
    mouseAware: true,
    showFloatingButton: true,
    floatingButtonLabel: "Items",
  });
}, [registerDrawer]);
```

**Side effects:**
- Reads drawer state from DrawerProvider.
- Renders as fixed-position panel at the configured position.
- Supports mouse-aware auto-expand/fold.
- Shows floating toggle button when configured.

---

## Modal

Data-driven modal renderer. Reads modal state from GameState.overlay.

```typescript
import { Modal } from "@/components/game/presentation/modal";
```

```tsx
<Modal />
```

**No props required.** Reads modal stack from GameState.

**Side effects:**
- Renders modals in a React portal.
- Handles backdrop click → MODAL_CLOSED event (reason: "backdrop").
- Handles Escape key → MODAL_CLOSED event (reason: "escape").
- Handles action button click → MODAL_SUBMITTED event (if not closesModal) or
  MODAL_CLOSED event (if closesModal).
- Runs field validators before submit when action has `validate: true`.
- Supports modal stacking (multiple open modals).

**Must be rendered inside GameProvider.** Place it at the end of the page JSX,
outside GameBoard (modals render in a portal anyway).

---

## Terminal Components

Terminal UI for command-line interaction within games.

```typescript
import {
  TerminalLayout,
  TerminalView,
  TerminalInput,
  useTerminalStore,
  useTerminalInput,
} from "@/components/game/presentation/terminal";
```

### TerminalLayout

Wraps terminal view and input in a responsive container.

```tsx
<TerminalLayout
  visible={terminal.visible}
  focusRef={terminalInput.inputRef}
  view={
    <TerminalView
      history={terminal.history}
      prompt={terminal.prompt}
      isCompleted={isCompleted}
    />
  }
  input={
    <TerminalInput
      value={terminalInput.value}
      onChange={terminalInput.onChange}
      onKeyDown={terminalInput.onKeyDown}
      inputRef={terminalInput.inputRef}
      placeholder={isCompleted ? "Terminal disabled" : "Type a command"}
      disabled={isCompleted}
    />
  }
/>
```

### useTerminalStore

Hook to access terminal state and control functions.

```typescript
const {
  terminal,       // { visible, history, prompt }
  openTerminal,   // () => void
  closeTerminal,  // () => void
  setPrompt,      // (prompt: string) => void
  addEntry,       // (entry: TerminalEntry) => void
  addOutput,      // (content: string, type?: "output" | "error") => void
} = useTerminalStore();
```

**Terminal state is local to TerminalProvider, NOT in GameState.**

### useTerminalInput

Hook for input field state management.

```typescript
const terminalInput = useTerminalInput();
// terminalInput.value, .onChange, .onKeyDown, .inputRef
```

### useTerminalEngine

Lifecycle hook for terminal engine start/finish.

```typescript
import { useTerminalEngine } from "@/components/game/engines";

const terminalEngine = useTerminalEngine({});
registerTerminalFinish.current = terminalEngine.finish;
```

Wire `terminalEngine.finish` to `registerTerminalFinish.current` so behaviors
can call `terminal.finishEngine()` which delegates to the engine's finish.

---

## ContextualHint

Displays a contextual hint message to guide the user.

```typescript
import { ContextualHint, useContextualHint } from "@/components/game/presentation/hint";
```

```tsx
const hint = useMemo(() => getHintForState(state), [state]);
useContextualHint(hint);  // Sets the hint in HintProvider

// In JSX:
<ContextualHint />
```

**Props:** None. Reads hint from HintProvider.

---

## Board Arrows

SVG arrows drawn between spaces on the GameBoard.

```typescript
import type { Arrow } from "@/components/game/game-provider";
import { useBoardArrows } from "@/components/game/presentation/space/arrow";
```

```typescript
const { setArrows, clearArrows } = useBoardArrows();

const arrows = useMemo<Arrow[]>(() => [
  {
    id: "pc1-to-router",
    from: { spaceId: "pc-1-board", anchor: { base: "br", lg: "tr" } },
    to: { spaceId: "router-board", anchor: { base: "tl", lg: "tl" } },
    style: { stroke: "rgba(56, 189, 248, 0.85)", strokeWidth: 2, headSize: 12, bow: 0.1 },
  },
], []);

useEffect(() => {
  setArrows(arrows);
  return () => clearArrows();
}, [arrows, setArrows, clearArrows]);
```

Arrow anchors are responsive: `{ base: "br", lg: "tr" }` means bottom-right
on small screens, top-right on large screens (using Chakra breakpoints).

---

## useDragEngine

Tracks drag-and-drop progress for phase management.

```typescript
import { useDragEngine } from "@/components/game/engines";

const dragEngine = useDragEngine();
// dragEngine.progress.status: "pending" | "started" | "finished"
// dragEngine.start()   — mark engine started
// dragEngine.finish()  — mark engine finished
// dragEngine.reset()   — reset to pending
```

**Auto-start:** By default, `useDragEngine` auto-starts when the first entity
is placed (`placedItems.length > 0`).

**Usage with phase rules:** The `dragStatus` condition key maps to
`dragEngine.progress.status` in the phase rule context.
