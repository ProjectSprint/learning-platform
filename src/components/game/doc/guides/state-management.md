# Guide: State Management

> How to access, modify, and react to game state.
> For type definitions, see [contracts/types.md](../contracts/types.md).
> For action details, see [contracts/actions.md](../contracts/actions.md).

## When to Read

- You are building a question page and need to wire up state
- You need to dispatch actions or listen to events
- You need to understand the provider hierarchy

---

## Provider Setup

Every question page wraps its content in `GameProvider`:

```tsx
import { GameProvider } from "@/components/game/game-provider";

export const MyQuestion = ({ onQuestionComplete }) => (
  <GameProvider>
    <MyGameContent onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);
```

`GameProvider` sets up:
1. `GameStateContext` + `GameDispatchContext` (core state)
2. `ArrowProvider` (visual connections)
3. `DrawerProvider` (panel management)
4. `HintProvider` (contextual hints)
5. `TerminalProvider` (CLI interface)
6. `DragProvider` (drag-and-drop)

All hooks must be called **inside** `GameProvider`.

---

## Reading State

### useGameState

Returns the full `GameState` object:

```tsx
const state = useGameState();
// state.phase, state.spaces, state.entities, state.overlay, state.question
```

### useGameCtx

Returns both state and dispatch (useful for passing to engine components):

```tsx
const ctx = useGameCtx();
// ctx.state, ctx.dispatch
```

### Selector Hooks

Prefer these over reading `state` directly for better re-render performance:

```tsx
// Entity hooks
const entity = useEntity("router-1");           // EntityData | undefined
const item = useItem("router-1");               // ItemData | undefined
const exists = useEntityExists("router-1");      // boolean
const stateVal = useEntityStateValue("router-1", "ip"); // unknown
const isDraggable = useEntityIsDraggable("router-1");   // boolean
const space = useEntitySpace("router-1");        // string | null
const gridPos = useEntityPosition("router-1");   // GridPosition | undefined
const allowed = useEntityAllowedPlaces("router-1"); // string[]
const allEntities = useEntities();               // Record<string, EntityData>
const pcs = useEntitiesByType("pc");             // EntityData[]

// Space hooks
const space = useSpace("board");                 // SpaceData | undefined
const isEmpty = useSpaceIsEmpty("board");        // boolean
const isFull = useSpaceIsFull("board");          // boolean
const entities = useSpaceEntities("board");      // string[]
const capacity = useSpaceCapacity("board");      // { current, max }
const gridPos = useEntityGridPosition("board", "router-1"); // GridPosition | undefined
const allSpaces = useSpaces();                   // Record<string, SpaceData>
```

---

## Dispatching Actions

### useGameDispatch

```tsx
const dispatch = useGameDispatch();

// Create entity
dispatch({
  type: "CREATE_ENTITY",
  payload: { entity: createItemData({ id: "pc-1", ... }) },
});

// Move entity between spaces
dispatch({
  type: "MOVE_ENTITY_BETWEEN_SPACES",
  payload: {
    entityId: "pc-1",
    fromSpaceId: "inventory",
    toSpaceId: "board",
    toPosition: { row: 0, col: 0 },
  },
});

// Open modal
dispatch({
  type: "OPEN_MODAL",
  payload: { id: "config-modal", title: "Configure", content: [...], actions: [...] },
});

// Change phase
dispatch({ type: "SET_PHASE", payload: { phase: "playing" } });

// Complete question
dispatch({ type: "COMPLETE_QUESTION" });
```

---

## Listening to Events

### useEngineEvents

The primary way to react to state changes. Each engine gets its own cursor.

```tsx
const { events, ack } = useEngineEvents("my-engine-id");

useEffect(() => {
  for (const event of events) {
    switch (event.type) {
      case "ENTITY_MOVED":
        // Handle entity placement
        break;
      case "MODAL_SUBMITTED":
        if (event.modalId === "config" && event.modalActionId === "save") {
          // Handle form submission
        }
        break;
      case "PHASE_CHANGED":
        // Handle phase transition
        break;
    }
  }
  ack(); // ALWAYS call ack() to advance cursor
}, [events, ack]);
```

**Rules:**
- Always call `ack()` after processing (even if you skip some events)
- Use a unique `engineId` per consumer to avoid cursor conflicts
- Events are delivered in order and only once per cursor

---

## Initialization Pattern

Questions initialize entities on mount:

```tsx
const dispatch = useGameDispatch();
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  // Create entities from inventory config
  dispatch({ type: "ADD_POOL_GROUP", payload: { group: INVENTORY_GROUP } });

  // Add entities to inventory pool
  for (const item of INVENTORY_ITEMS) {
    dispatch({
      type: "ADD_ENTITY_TO_SPACE",
      payload: { entityId: item.id, spaceId: "inventory" },
    });
  }
}, [dispatch]);
```

**Spaces self-register** via `GridSpace`/`PoolSpace` components on mount (using `useLayoutEffect`).
You don't need to `CREATE_SPACE` manually.

---

## Phase Management

Phases are managed declaratively via `resolvePhase`:

```tsx
const spec = {
  phaseRules: [
    { kind: "set", when: { kind: "eq", key: "questionStatus", value: "completed" }, to: "completed" },
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "finished" }, to: "terminal" },
    { kind: "set", when: { kind: "eq", key: "dragStatus", value: "started" }, to: "playing" },
  ],
};

useEffect(() => {
  const context = {
    dragStatus: dragEngine.progress.status,
    questionStatus: state.question.status,
  };
  const resolved = resolvePhase(spec.phaseRules, context, state.phase, "setup");

  if (state.phase !== resolved.nextPhase) {
    dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
  }
}, [dragEngine.progress.status, state.phase, state.question.status]);
```

---

## UI-Local State

These are **not** in `GameState`. Access via dedicated hooks:

### Drawer

```tsx
const { registerDrawer, updateDrawerConfig } = useDrawerManager();

// Register on mount
useLayoutEffect(() => {
  registerDrawer({
    id: "inventory-drawer",
    contentType: "space",
    spaceId: "inventory",
    position: "bottom",
    initialState: "expanded",
    expandedSize: { base: "65vh", md: "40vh" },
    mouseAware: true,
  });
}, [registerDrawer]);
```

### Arrows

```tsx
const { setArrows, clearArrows } = useBoardArrows();

useEffect(() => {
  setArrows([
    {
      id: "pc1-router",
      from: { spaceId: "pc-1-board", anchor: { base: "br", lg: "tr" } },
      to: { spaceId: "router-board", anchor: { base: "tr", lg: "tl" } },
      style: { stroke: "rgba(56, 189, 248, 0.85)", strokeWidth: 2 },
    },
  ]);
  return () => clearArrows();
}, [setArrows, clearArrows]);
```

### Hints

```tsx
const hint = useMemo(() => getContextualHint(networkState), [networkState]);
useContextualHint(hint);
```

### Terminal

```tsx
const { terminal, openTerminal, closeTerminal, setPrompt, addOutput } = useTerminalStore();

useEffect(() => {
  if (shouldShowTerminal && !terminal.visible) openTerminal();
  if (!shouldShowTerminal && terminal.visible) closeTerminal();
}, [shouldShowTerminal, terminal.visible]);
```

---

## Troubleshooting

### "Action dispatched but nothing happened"

The reducer silently no-ops on validation failure. Check:
1. Does the entity exist in `state.entities`?
2. Does the space exist in `state.spaces`?
3. For placement: is the entity an `ItemData` with the target space in `allowedPlaces`?
4. For grid placement: is the position in bounds and the cell unoccupied?

### "Events not being received"

1. Did you call `ack()` in your previous effect run?
2. Is your `engineId` unique?
3. Are you inside `GameProvider`?

### "Space not found during initialization"

Spaces self-register via `useLayoutEffect`. If you dispatch `ADD_ENTITY_TO_SPACE` before
the space component mounts, the space won't exist yet. Use the initialization ref pattern
to ensure proper ordering.
