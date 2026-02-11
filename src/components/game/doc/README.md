# Package game — Interactive Educational Game Engine

Package game provides a React framework for building interactive educational
games with drag-and-drop, modals, terminal interaction, and event-driven
behaviors.

A question author defines a QuestionDefinition (spaces, entities, behaviors)
and the runtime handles bootstrap, event dispatch, and behavior execution.

## Import Paths

```typescript
// Runtime (main API for question pages)
import { useQuestionRuntime, type QuestionDefinition } from "@/components/game/runtime";
import { entityClicked, modalSubmitted, terminalInput } from "@/components/game/runtime";
import type { BehaviorDefinition, BehaviorRule, EffectContext } from "@/components/game/runtime";

// Provider and hooks
import { GameProvider, useGameCtx, useGameState } from "@/components/game/game-provider";
import { useDrawerManager } from "@/components/game/game-provider";

// Engine components (declarative wrappers with state integration)
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";

// Presentation (UI-only, no state logic)
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { DrawerLayout } from "@/components/game/presentation/drawer";
import { Modal } from "@/components/game/presentation/modal";
import { TerminalLayout, TerminalView, TerminalInput, useTerminalStore, useTerminalInput } from "@/components/game/presentation/terminal";
import { ContextualHint, useContextualHint } from "@/components/game/presentation/hint";
import { useBoardArrows } from "@/components/game/presentation/space/arrow";

// Domain types
import type { EntityData, ItemData } from "@/components/game/domain/entity/entity-data";
import type { GridSpaceConfig, PoolSpaceConfig, GridPosition } from "@/components/game/domain/space/space-data";

// Engines (drag tracking, terminal lifecycle)
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
```

## Quick Start

```tsx
const MY_DEFINITION: QuestionDefinition<MyConditionKey, MyBehaviorContext> = {
  meta: { id: "my-question", title: "My Question", description: "..." },
  initialPhase: "setup",
  spaces: [
    { kind: "grid", config: { id: "board", rows: 2, cols: 2, metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 } } },
    { kind: "pool", config: { id: "inventory", name: "Items" } },
  ],
  entities: [
    { config: { id: "item-1", allowedPlaces: ["inventory", "board"], icon: { icon: "twemoji:gear" } }, initialSpace: "inventory" },
  ],
  phaseRules: [],
  behaviors: MY_BEHAVIORS,
};

export const MyQuestion = ({ onQuestionComplete }) => (
  <GameProvider>
    <MyPage onQuestionComplete={onQuestionComplete} />
  </GameProvider>
);

const MyPage = ({ onQuestionComplete }) => {
  const { world, state, behaviorContext } = useQuestionRuntime("my-page", MY_DEFINITION);
  const gameCtx = useGameCtx();

  useEffect(() => {
    if (behaviorContext.navigateAway) onQuestionComplete();
  }, [behaviorContext.navigateAway, onQuestionComplete]);

  return (
    <GameBoard>
      <GridSpace ctx={gameCtx} config={BOARD_CONFIG} />
      <DragOverlay getEntityLabel={(type) => type} />
      <DrawerLayout drawerId="inventory-drawer">
        <PoolSpace ctx={gameCtx} config={INVENTORY_CONFIG} />
      </DrawerLayout>
      <Modal />
    </GameBoard>
  );
};
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [building-questions.md](./building-questions.md) | Step-by-step guide to creating a new question from scratch |
| [question-definition.md](./question-definition.md) | QuestionDefinition type reference (spaces, entities, phase rules) |
| [behavior-system.md](./behavior-system.md) | Behavior rules, event triggers, guards, and EffectContext |
| [runtime-api.md](./runtime-api.md) | useQuestionRuntime hook and API wrappers (WorldApi, ProgressApi, etc.) |
| [components.md](./components.md) | GameProvider, GameBoard, GridSpace, PoolSpace, Modal, Terminal, etc. |
| [types.md](./types.md) | GameState, EntityData, SpaceData, GameEvent, ModalInstance |

## Architecture Overview

```
Question Page
    │
    ├── QuestionDefinition (declarative config)
    │     ├── spaces[]        → bootstrap creates GridSpaceData / PoolSpaceData
    │     ├── entities[]      → bootstrap creates ItemData, places in initial spaces
    │     ├── phaseRules[]    → page resolves phases from condition context
    │     └── behaviors       → reactor matches events → runs handlers
    │
    ├── useQuestionRuntime(engineId, definition)
    │     ├── bootstrapQuestion()     (side effect: dispatches init actions once)
    │     ├── useBehaviorReactor()    (side effect: processes events, runs handlers)
    │     └── returns { world, progress, interaction, state, behaviorContext, ... }
    │
    └── Render tree
          GameProvider (context: state + dispatch)
            └── ArrowProvider → DrawerProvider → HintProvider → TerminalProvider → DragProvider
                  └── GameBoard (arrow surface)
                        ├── GridSpace (state-aware grid with drag-drop)
                        ├── PoolSpace (state-aware inventory)
                        ├── DragOverlay (drag preview)
                        ├── DrawerLayout (responsive drawer panel)
                        └── Modal (data-driven modal renderer)
```

## Design Principles

1. **Declarative definitions over imperative init.** Questions describe WHAT
   exists (QuestionDefinition), not HOW to create it.
2. **Behaviors over event loops.** Questions react to events via BehaviorRule
   handlers, not useEffect loops over events.
3. **API wrappers over raw dispatch.** Use `world.updateEntity()` not
   `dispatch({ type: "ENTITY_UPDATED", ... })`.
4. **Plain data types, not classes.** All state is JSON-serializable for Immer
   compatibility.
5. **First matching rule wins.** Behavior rules are evaluated in order; the
   first rule whose trigger and guard match handles the event.

## Limitations

- Terminal UI state (history, prompt, visibility) is local to TerminalProvider,
  NOT in GameState. Access via useTerminalStore().
- GridSpace/PoolSpace do not create spaces on mount. Spaces are created by
  bootstrapQuestion() from the QuestionDefinition.
- Phase transitions require explicit request via interactionSession or setPhase
  in behaviors. There is no automatic phase advancement.
- The behavior reactor processes events asynchronously. State reads inside a
  handler see the latest state at execution time, not at event emission time.
- Event queue is append-only. Events cannot be removed or replayed.

## Real Examples

See `src/routes/questions/networking/` for complete implementations:
- **DHCP** — Drag-and-drop topology, entity click → modal config, terminal ping
- **TCP** — Packet sequencing with imperative state hooks
- **SSL** — Certificate issuance modals, curl/openssl terminal commands
- **Internet** — Complex multi-entity routing with NAT, DNS, PPPoE
