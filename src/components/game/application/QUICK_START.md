# Application Layer Quick Start

## 1) Wrap Question With Provider

```tsx
import { GameProvider } from "@/components/game/game-provider";

export const MyQuestion = ({ onQuestionComplete }) => (
  <GameProvider>
    <MyGame onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);
```

## 2) Initialize Explicitly

```ts
import {
	createGridSpaceData,
	createItemData,
	createPoolSpaceData,
} from "@/components/game/domain/adt";
import type { GameAction } from "@/components/game/game-provider";

type GameDispatch = (action: GameAction) => void;

export const initializeQuestion = (dispatch: GameDispatch) => {
  dispatch({ type: "SET_QUESTION", payload: { id: "my-question", status: "in_progress" } });
  dispatch({ type: "SET_PHASE", payload: { phase: "setup" } });

  dispatch({
    type: "SPACE_CREATED",
    payload: {
      space: createGridSpaceData({
        id: "board",
        rows: 1,
        cols: 1,
        metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
      }),
    },
  });

  dispatch({
    type: "SPACE_CREATED",
    payload: { space: createPoolSpaceData({ id: "inventory", name: "Inventory" }) },
  });

  const entity = createItemData({
    id: "router-1",
    name: "Router",
    allowedPlaces: ["inventory", "board"],
  });

  dispatch({ type: "ENTITY_CREATED", payload: { entity } });
  dispatch({ type: "ENTITY_ADDED", payload: { entityId: entity.id, spaceId: "inventory" } });
};
```

## 3) Render Engine Components

```tsx
import { GridSpace, PoolSpace } from "@/components/game/engine";
import { useGameCtx } from "@/components/game/game-provider";

const gameCtx = useGameCtx();

return (
  <>
    <GridSpace ctx={gameCtx} id="board" />
    <PoolSpace ctx={gameCtx} id="inventory" />
  </>
);
```

## 4) React To Events

```tsx
import { useEngineEvents } from "@/components/game/game-provider";

const { events, ack } = useEngineEvents("my-question-page");

useEffect(() => {
  for (const event of events) {
    if (event.type === "MODAL_SUBMITTED") {
      // handle form result
    }
  }
  ack();
}, [events, ack]);
```

## Action Summary

World facts:
- `SPACE_CREATED`, `SPACE_REMOVED`
- `ENTITY_CREATED`, `ENTITY_UPDATED`, `ENTITY_STATE_UPDATED`, `ENTITIES_DELETED`
- `ENTITY_ADDED`, `ENTITY_REMOVED`, `ENTITY_MOVED`, `ENTITY_POSITION_UPDATED`, `ENTITIES_SWAPPED`

Intent channels:
- Modal intent in reducer: `OPEN_MODAL`, `CLOSE_MODAL`, `MODAL_SUBMITTED`
- Terminal/drawer are provider-local flows (and optional `EMIT_EVENTS`)

## Hard-Cut Rules

- Do not use deprecated world names such as `CREATE_SPACE`, `ADD_ENTITY_TO_SPACE`, `MOVE_ENTITY_BETWEEN_SPACES`.
- Do not rely on space mount side effects for world creation.
- Keep placement authority in space logic, not page-level imperative mutation code.
