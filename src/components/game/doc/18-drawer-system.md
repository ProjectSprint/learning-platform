# Drawer System

## Overview
The drawer system provides a generic, responsive container that can wrap any Space (GridSpace or PoolSpace) and react to mouse and drag behavior. It lives in **UI-local DrawerProvider state** and renders inline via `DrawerLayout` so question layouts can control placement.

Current scope:
- Drawer content is provided by the question (DrawerLayout wraps children).
- Multiple drawers are allowed and stack in DOM order.
- `DrawerLayout` must be rendered inside `GameBoard` so spaces still get board context.

## DrawerInstance API
A drawer is registered by providing a `DrawerConfig`, which becomes a stored `DrawerInstance` in DrawerProvider state.

Fields:
- `id` (string, required): unique drawer identifier.
- `contentType` ("space", required): metadata for current drawer content type.
- `spaceId` (string, required): primary space ID (used for drag integration).
- `spaceIds` (string[], optional): additional space IDs (used for drag integration and ordering).
- `title` (string, optional): titlebar label.
- `position` ("bottom" | "top" | "left" | "right", optional): drawer position (default: bottom).
- `initialState` ("expanded" | "folded", optional): initial drawer state.
- `state` ("expanded" | "folded", stored): current drawer state.
- `foldedSize` (DrawerSizeMap, optional): folded size per breakpoint (base is handled by titlebar height).
- `expandedSize` (DrawerSizeMap, optional): expanded size per breakpoint.
- `mouseAware` (boolean, optional): auto expand/fold on mouse movement (default: true, disabled on base and while dragging).
- `showFloatingButton` (boolean, optional): show floating action button at base when folded.
- `floatingButtonLabel` (string, optional): label for the base floating button.

Example config:
```ts
const inventoryDrawer = {
  id: "inventory-drawer",
  contentType: "space",
  spaceId: "inventory",
  title: "Inventory",
  position: "bottom",
  initialState: "expanded",
  expandedSize: { base: "65vh", md: "40vh" },
  foldedSize: { md: "72px", lg: "80px" },
  mouseAware: true,
  showFloatingButton: true,
  floatingButtonLabel: "Inventory",
};
```

## Rendering the Drawer Layout
Drawers are rendered by `DrawerLayout` (not by `GameProvider`). The question supplies the content.

```tsx
import { DrawerLayout } from "@/components/game/presentation/drawer";
import { PoolSpace } from "@/components/game/engine";

<GameBoard>
  {/* ...spaces... */}
  <DrawerLayout drawerId="inventory-drawer">
    <Flex direction="column" gap={3}>
      <PoolSpace id="inventory" title="Inventory" />
    </Flex>
  </DrawerLayout>
</GameBoard>
```

Optional event-driven control:
```tsx
<DrawerLayout
  drawerId="inventory-drawer"
  onOpenEvents={["ENTITY_ENTERED_SPACE"]}
  onCloseEvents={["PHASE_CHANGED"]}
>
  {/* custom layout */}
</DrawerLayout>
```

Notes:
- DrawerLayout closes on drag start via DragContext (UI-local), not GameEvents.

## Controls
Drawer controls live in the `DrawerProvider` via `useDrawerManager`:
- `registerDrawer`: add a drawer to DrawerProvider state.
- `openDrawer`: expand drawer (intent + local events).
- `closeDrawer`: fold drawer (intent + local events).
- `toggleDrawer`: toggle between expanded/folded (intent + local events).
- `updateDrawerConfig`: update config fields for an existing drawer.

## Events
Drawer events are emitted **locally** (not in `GameEventQueue`) so UI can react without coupling to core state.

Intent events:
- `DRAWER_OPEN`
- `DRAWER_CLOSE`
- `DRAWER_TOGGLE`

State events:
- `DRAWER_OPENED`
- `DRAWER_CLOSED`
- `DRAWER_EXPANDED`
- `DRAWER_FOLDED`

Notes:
- `openDrawer` emits `DRAWER_OPEN`, and if state changes, also `DRAWER_OPENED` + `DRAWER_EXPANDED`.
- `closeDrawer` emits `DRAWER_CLOSE`, and if state changes, also `DRAWER_CLOSED` + `DRAWER_FOLDED`.
- `toggleDrawer` emits `DRAWER_TOGGLE` and the matching state event pair.

## Breakpoint Configuration
Sizes are defined by breakpoint keys: `base`, `sm`, `md`, `lg`, `xl`, `2xl`.

- `expandedSize`: controls drawer size when expanded.
- `foldedSize`: controls drawer size when folded (base ignores this and uses titlebar height).

Example:
```ts
expandedSize: { base: "60vh", md: "40vh", xl: "32vh" },
foldedSize: { md: "72px", xl: "88px" },
```

## Mouse-Aware Behavior
When `mouseAware` is enabled (and not base):
- If folded: entering the drawer area (including titlebar) expands it.
- If expanded: leaving the drawer area folds it.
- Behavior uses a 0ms debounce (immediate response).
- Mouse-aware auto fold is disabled during active drag.

## Drag-and-Drop Integration
When an active drag is in progress:
- The drawer stays available while dragging (no auto-fold on drag start).
- If drag comes from outside and the pointer enters the drawer area (including titlebar), the drawer expands.
- Titlebar shows a highlight outline when it is a drag target.

## Event Listening Patterns
Use `useDrawerEvents` to listen for drawer events (local to DrawerProvider):

```ts
const { events, ack } = useDrawerEvents("inventory-drawer");
useEffect(() => {
  if (events.length === 0) return;
  // react to events
  ack();
}, [events, ack]);
```

## Common Patterns
- Inventory drawer (PoolSpace) with mouse-aware auto expand.
- Side panel drawer (GridSpace) with manual control.

### PoolSpace Example (Inventory Drawer)
```ts
const { registerDrawer } = useDrawerManager();

useEffect(() => {
  registerDrawer({
    id: "inventory-drawer",
    contentType: "space",
    spaceId: "inventory",
    title: "Inventory",
    position: "bottom",
    initialState: "expanded",
    expandedSize: { base: "65vh", md: "40vh" },
    foldedSize: { md: "72px", lg: "80px" },
    mouseAware: true,
    showFloatingButton: true,
    floatingButtonLabel: "Inventory",
  });
}, [registerDrawer]);
```

Notes:
- Render `<PoolSpace />` (or any custom layout) inside `DrawerLayout`.
- Use `showFloatingButton` to enable the base breakpoint FAB.

```tsx
<DrawerLayout drawerId="inventory-drawer">
  <Flex direction="column" gap={3}>
    <PoolSpace id="inventory" title="Inventory" />
  </Flex>
</DrawerLayout>
```

### GridSpace Example (Side Panel)
```ts
const { registerDrawer, openDrawer, closeDrawer } = useDrawerManager();

useEffect(() => {
  registerDrawer({
    id: "router-side-panel",
    contentType: "space",
    spaceId: "router-debug",
    title: "Router Debug",
    position: "right",
    initialState: "folded",
    expandedSize: { base: "80vw", md: "360px" },
    foldedSize: { md: "64px", lg: "72px" },
    mouseAware: false,
  });
}, [registerDrawer]);

// Manual control example
const handleOpen = () => openDrawer("router-side-panel");
const handleClose = () => closeDrawer("router-side-panel");
```

```tsx
<DrawerLayout drawerId="router-side-panel">
  <GridSpace id="router-debug" title="Router Debug" />
</DrawerLayout>
```

## Troubleshooting
- Drawer does not appear: confirm it is registered via `registerDrawer` (DrawerProvider owns state).
- Drawer opens but is empty: confirm children are rendered and the space IDs exist.
- Drawer does not expand on hover: check `mouseAware` and ensure not on base breakpoint.
- Drag behavior not working: confirm DragProvider is mounted at `GameProvider` level.

## Related Docs
- `doc/03-state-management.md` (GameProvider, actions, overlay state)
- `doc/07-usage-guide.md` (general UI wiring patterns)
