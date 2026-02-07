# Drawer System

## Overview
The drawer system provides a generic, responsive container that can wrap any Space (GridSpace or PoolSpace) and react to mouse and drag behavior. It lives in overlay state (`overlay.drawers`) and renders through a portal so it can float above the board.

Current scope:
- `contentType: "space"` only (custom content is not supported yet).
- Multiple drawers are allowed and stack in DOM order.

## DrawerInstance API
A drawer is registered by providing a `DrawerConfig`, which becomes a stored `DrawerInstance` in overlay state.

Fields:
- `id` (string, required): unique drawer identifier.
- `contentType` ("space", required): current drawer content type.
- `spaceId` (string, required): space to render.
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

## Actions
Drawer actions live in `application/state/actions/ui.ts`:
- `REGISTER_DRAWER`: add a drawer to overlay state.
- `OPEN_DRAWER`: expand drawer (intent + state events).
- `CLOSE_DRAWER`: fold drawer (intent + state events).
- `TOGGLE_DRAWER`: toggle between expanded/folded (intent + state events).
- `UPDATE_DRAWER_CONFIG`: update config fields for an existing drawer.

## Events
Drawer events are emitted to the `GameEventQueue` so other engines can react.

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
- `OPEN_DRAWER` emits `DRAWER_OPEN`, and if state changes, also `DRAWER_OPENED` + `DRAWER_EXPANDED`.
- `CLOSE_DRAWER` emits `DRAWER_CLOSE`, and if state changes, also `DRAWER_CLOSED` + `DRAWER_FOLDED`.
- `TOGGLE_DRAWER` emits `DRAWER_TOGGLE` and the matching state event pair.

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
- Behavior is debounced to avoid flicker (200ms).
- Mouse-aware auto fold is disabled during active drag.

## Drag-and-Drop Integration
When an active drag is in progress:
- If drag starts from inside the drawer space, the drawer folds immediately.
- If drag comes from outside and the pointer enters the drawer area (including titlebar), the drawer expands.
- Titlebar shows a highlight outline when it is a drag target.

## Event Listening Patterns
Use `useDrawerEvents` to listen for drawer events:

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
- Do not render `<PoolSpace />` separately; the drawer renders the space for you.
- Use `showFloatingButton` to enable the base breakpoint FAB.

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

## Troubleshooting
- Drawer does not appear: confirm it is registered and `overlay.drawers` contains the ID.
- Drawer opens but is empty: verify `spaceId` exists and is initialized.
- Drawer does not expand on hover: check `mouseAware` and ensure not on base breakpoint.
- Drag behavior not working: confirm DragProvider is mounted at `GameProvider` level.

## Related Docs
- `doc/03-state-management.md` (GameProvider, actions, overlay state)
- `doc/07-usage-guide.md` (general UI wiring patterns)
