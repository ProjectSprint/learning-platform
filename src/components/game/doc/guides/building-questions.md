# Guide: Building Questions

> Step-by-step guide to creating a new question using the game engine.
> For API reference, see [contracts/](../contracts/).
> For architecture context, see [concepts/](../concepts/).

## When to Read

- You are creating a new question from scratch
- You need to understand the full question lifecycle
- You need a reference implementation to follow

---

## Question Structure

Every question follows this file organization:

```
src/routes/questions/<category>/<question-name>/
  -page.tsx                    # Main component (GameProvider + game content)
  -utils/
    constants.ts               # IDs, configs, inventory items, labels
    init-spaces.ts             # Entity creation on mount
    modal-builders.ts          # Modal factory functions
    get-contextual-hint.ts     # Hint text logic
    use-network-state.ts       # Derived state hook (optional)
    use-networking-terminal.ts # Terminal command handler (optional)
    item-notification.ts       # Entity labels and status messages
```

---

## Step 1: Define Constants

Create `constants.ts` with all static configuration:

```typescript
// constants.ts
import type { GridSpaceConfig, PoolSpaceConfig } from "@/components/game/domain/space";
import type { InventoryGroupConfig, Item } from "@/components/game/game-provider";

export const QUESTION_ID = "my-question";
export const QUESTION_TITLE = "My Question Title";
export const QUESTION_DESCRIPTION = "Description shown to user";

// Define space IDs
export const SPACE_IDS = {
  board: "main-board",
  target: "target-zone",
} as const;

// Grid space configs (spaces self-register on mount)
export const SPACE_CONFIGS: Record<string, GridSpaceConfig> = {
  [SPACE_IDS.board]: {
    id: SPACE_IDS.board,
    name: "Board",
    rows: 3,
    cols: 4,
    metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    maxCapacity: 12,
  },
  [SPACE_IDS.target]: {
    id: SPACE_IDS.target,
    name: "Target",
    rows: 1,
    cols: 1,
    metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    maxCapacity: 1,
  },
};

// Pool space config for inventory
export const INVENTORY_POOL_CONFIG: PoolSpaceConfig = {
  id: "inventory",
  name: "Items",
};

// Inventory items
export const INVENTORY_ITEMS: Item[] = [
  {
    id: "item-1",
    type: "widget",
    name: "Widget",
    allowedPlaces: ["inventory", SPACE_IDS.board, SPACE_IDS.target],
    icon: { icon: "twemoji:gear" },
  },
];

export const INVENTORY_GROUPS: InventoryGroupConfig[] = [
  { id: "default", title: "Items", visible: true, items: INVENTORY_ITEMS },
];
```

**Key points:**
- `allowedPlaces` controls where each item can be dropped
- `GridSpaceConfig` defines the grid dimensions and cell sizing
- Space components read these configs and self-register on mount

---

## Step 2: Create Initialization

Create `init-spaces.ts` for entity creation:

```typescript
// init-spaces.ts
import type { Dispatch } from "react";
import type { GameAction } from "@/components/game/game-provider";
import { INVENTORY_GROUPS, INVENTORY_ITEMS } from "./constants";

export const initializeQuestion = (dispatch: Dispatch<GameAction>) => {
  // Create entities from inventory groups
  for (const group of INVENTORY_GROUPS) {
    dispatch({ type: "ADD_POOL_GROUP", payload: { group } });
  }

  // Add items to inventory pool space
  for (const item of INVENTORY_ITEMS) {
    dispatch({
      type: "ADD_ENTITY_TO_SPACE",
      payload: { entityId: item.id, spaceId: "inventory" },
    });
  }
};
```

---

## Step 3: Build the Page Component

```tsx
// -page.tsx
import { GameProvider, useGameCtx, useGameDispatch, useGameState, useEngineEvents }
  from "@/components/game/game-provider";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine } from "@/components/game/engines";
import { DrawerLayout } from "@/components/game/presentation/drawer";
import { useDrawerManager } from "@/components/game/game-provider";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";

export const MyQuestion = ({ onQuestionComplete }) => (
  <GameProvider>
    <MyGame onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);

const DRAWER_ID = "inventory-drawer";

const MyGame = ({ onQuestionComplete }) => {
  const dispatch = useGameDispatch();
  const state = useGameState();
  const ctx = useGameCtx();
  const { events, ack } = useEngineEvents("my-page");
  const dragEngine = useDragEngine();
  const { registerDrawer } = useDrawerManager();
  const initializedRef = useRef(false);

  // 1. Register drawer
  useLayoutEffect(() => {
    registerDrawer({
      id: DRAWER_ID,
      contentType: "space",
      spaceId: "inventory",
      title: "Items",
      position: "bottom",
      initialState: "expanded",
      expandedSize: { base: "65vh", md: "40vh" },
      mouseAware: true,
      showFloatingButton: true,
      floatingButtonLabel: "Items",
    });
  }, [registerDrawer]);

  // 2. Initialize entities
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeQuestion(dispatch);
  }, [dispatch]);

  // 3. Listen to events
  useEffect(() => {
    for (const event of events) {
      if (event.type === "MODAL_SUBMITTED" && event.modalId === "success") {
        onQuestionComplete();
      }
    }
    ack();
  }, [events, ack, onQuestionComplete]);

  // 4. Phase management
  useEffect(() => {
    if (dragEngine.progress.status === "finished" && state.phase !== "completed") {
      dispatch({ type: "SET_PHASE", payload: { phase: "completed" } });
      dispatch({ type: "OPEN_MODAL", payload: buildSuccessModal() });
    }
  }, [dragEngine.progress.status, state.phase, dispatch]);

  // 5. Render
  return (
    <Box>
      <GameBoard>
        <GridSpace ctx={ctx} config={SPACE_CONFIGS[SPACE_IDS.board]} />
        <GridSpace ctx={ctx} config={SPACE_CONFIGS[SPACE_IDS.target]} />

        <DragOverlay getEntityLabel={(type) => type} />
        <DrawerLayout drawerId={DRAWER_ID}>
          <PoolSpace ctx={ctx} config={INVENTORY_POOL_CONFIG} />
        </DrawerLayout>
      </GameBoard>
      <Modal />
    </Box>
  );
};
```

---

## Step 4: Add Modals

Create `modal-builders.ts`:

```typescript
import type { ModalInstance } from "@/components/game/game-provider";

export const buildSuccessModal = (): ModalInstance => ({
  id: "success",
  title: "Congratulations!",
  content: [{ kind: "text", text: "You completed the question!" }],
  actions: [
    { id: "primary", label: "Continue", variant: "primary", closesModal: true },
  ],
  blocking: true,
});

export const buildConfigModal = (entityId: string, data: Record<string, unknown>): ModalInstance => ({
  id: `config-${entityId}`,
  title: "Configure Device",
  content: [
    { kind: "field", field: { id: "ip", kind: "text", label: "IP Address", placeholder: "192.168.1.1" } },
  ],
  actions: [
    { id: "save", label: "Save", variant: "primary", validate: true },
    { id: "cancel", label: "Cancel", variant: "ghost", closesModal: true },
  ],
  initialValues: { ip: data.ip ?? "" },
});
```

Handle submissions via events:

```tsx
if (event.type === "MODAL_SUBMITTED" && event.modalId.startsWith("config-")) {
  const entityId = event.modalId.replace("config-", "");
  dispatch({
    type: "UPDATE_ENTITY",
    payload: { entityId, updates: { data: { ip: event.values.ip } } },
  });
}
```

---

## Step 5: Add Contextual Hints

```typescript
// get-contextual-hint.ts
export const getContextualHint = (state: MyState): string | null => {
  if (state.itemsPlaced === 0) return "Drag items from inventory to the board";
  if (!state.configured) return "Click the device to configure it";
  if (state.phase === "terminal") return "Use the terminal to verify";
  return null;
};
```

Wire up in the page:

```tsx
const hint = useMemo(() => getContextualHint(myState), [myState]);
useContextualHint(hint);

// In JSX:
<ContextualHint />
```

---

## Step 6: Add Arrows (Optional)

```tsx
const { setArrows, clearArrows } = useBoardArrows();

const arrows = useMemo<Arrow[]>(() => [
  {
    id: "board-to-target",
    from: { spaceId: SPACE_IDS.board, anchor: { base: "br", lg: "tr" } },
    to: { spaceId: SPACE_IDS.target, anchor: { base: "tl", lg: "tl" } },
    style: { stroke: "rgba(56, 189, 248, 0.85)", strokeWidth: 2 },
  },
], []);

useEffect(() => {
  setArrows(arrows);
  return () => clearArrows();
}, [arrows, setArrows, clearArrows]);
```

---

## Lifecycle Summary

```
Mount
  |
  v
useLayoutEffect: registerDrawer()          -- Drawer ready
  |
  v
GridSpace/PoolSpace mount: CREATE_SPACE    -- Spaces registered
  |
  v
useEffect: initializeQuestion(dispatch)     -- Entities created + placed in pool
  |
  v
User drags items -> MOVE_ENTITY_BETWEEN_SPACES -> ENTITY_MOVED events
  |
  v
Engine processes events -> updates derived state -> phase transitions
  |
  v
User configures devices -> OPEN_MODAL -> MODAL_SUBMITTED -> UPDATE_ENTITY
  |
  v
All items placed + configured -> phase: "terminal" (or "completed")
  |
  v
Terminal phase: user types commands -> TERMINAL_INPUT -> onCommand handler
  |
  v
Success -> OPEN_MODAL (success) -> MODAL_SUBMITTED -> COMPLETE_QUESTION
  |
  v
onQuestionComplete() callback
```

---

## Checklist for New Questions

- [ ] `constants.ts` with IDs, configs, inventory items
- [ ] `init-spaces.ts` with entity creation
- [ ] Page component with `GameProvider` wrapper
- [ ] Drawer registered in `useLayoutEffect`
- [ ] Entity initialization with `useRef` guard
- [ ] Event listener with `useEngineEvents` + `ack()`
- [ ] Phase management (drag -> terminal -> completed)
- [ ] Modal builders for config and success
- [ ] `DragOverlay` + `Modal` components rendered
- [ ] Contextual hints (optional)
- [ ] Arrows (optional)
- [ ] Terminal setup (if question has CLI phase)
