# Guide: State Management

## Purpose

How to use game state without violating the hard-cut architecture.

## Provider Setup

```tsx
import { GameProvider } from "@/components/game/game-provider";

export const MyQuestion = ({ onQuestionComplete }) => (
  <GameProvider>
    <MyGame onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);
```

## Read State

```tsx
import { useGameState, useGameCtx } from "@/components/game/game-provider";

const state = useGameState();
const ctx = useGameCtx();
```

Prefer selector hooks when possible:
- `useSpace`, `useSpaces`, `useSpaceEntities`
- `useEntity`, `useEntities`, `useEntitySpace`, `useEntityPosition`

## Dispatch Model

### Fact-style world actions

- `SPACE_CREATED`, `SPACE_REMOVED`
- `ENTITY_CREATED`, `ENTITY_UPDATED`, `ENTITY_STATE_UPDATED`, `ENTITIES_DELETED`
- `ENTITY_ADDED`, `ENTITY_REMOVED`, `ENTITY_MOVED`, `ENTITY_POSITION_UPDATED`, `ENTITIES_SWAPPED`

### Intent-style UI actions

- Modal channel in app reducer: `OPEN_MODAL`, `CLOSE_MODAL`, `MODAL_SUBMITTED`
- Terminal/drawer behavior is provider-local; use `EMIT_EVENTS` when app-level event emission is needed

## Initialization Pattern (Required)

Questions must explicitly create spaces/entities in init code.

```tsx
const dispatch = useGameDispatch();
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  initializeQuestion(dispatch);
}, [dispatch]);
```

`GridSpace` and `PoolSpace` are runtime render/interaction boundaries.
They do not create world state.

## Event Consumption Pattern

```tsx
const { events, ack } = useEngineEvents("my-engine-id");

useEffect(() => {
  for (const event of events) {
    if (event.type === "MODAL_SUBMITTED") {
      // handle modal outcome
    }
  }
  ack();
}, [events, ack]);
```

Rules:
1. Always call `ack()` after processing.
2. Use stable per-consumer engine IDs.
3. Derive local state from events or selectors, not hidden mutable caches.

## Phase Management

Keep phase transitions explicit in reducer actions:

```tsx
dispatch({ type: "SET_PHASE", payload: { phase: "playing" } });
```

## Do / Don't

Do:
- Build complete world state in init.
- Use only fact-style world actions.
- Keep placement validation and commit in space flow.

Don't:
- Assume spaces self-register by mounting.
- Dispatch deprecated world action names.
- Leave event consumers unacked.

