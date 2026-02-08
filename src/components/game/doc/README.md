# Game Engine Documentation

> Flat index with "when to read" guidance. Go-style: find what you need, read it, go build.

---

## Concepts (What and Why)

| Document | When to Read |
|----------|-------------|
| [concepts/overview.md](./concepts/overview.md) | You are new to the game engine and need the 30-second overview |
| [concepts/architecture.md](./concepts/architecture.md) | You need to understand the layer structure or decide where to put code |
| [concepts/core-concepts.md](./concepts/core-concepts.md) | You need to understand GameState, Spaces, Entities, Actions, Events, Engines |

## Contracts (API Reference)

| Document | When to Read |
|----------|-------------|
| [contracts/types.md](./contracts/types.md) | You need the exact shape of GameState, SpaceData, EntityData, or any type |
| [contracts/actions.md](./contracts/actions.md) | You need to dispatch an action and want to know its validation, side effects, and events |
| [contracts/events.md](./contracts/events.md) | You need to react to state changes via events, or understand event ordering |
| [contracts/functions.md](./contracts/functions.md) | You need a pure function for entity/space manipulation, validation, or geometry |
| [contracts/validation.md](./contracts/validation.md) | You need to understand why a placement was rejected, or pre-validate before dispatch |

## Guides (How-To)

| Document | When to Read |
|----------|-------------|
| [guides/state-management.md](./guides/state-management.md) | You need to wire up state access, dispatch actions, or listen to events |
| [guides/immer-patterns.md](./guides/immer-patterns.md) | You are writing a reducer or mutation function and need Immer patterns |
| [guides/engines.md](./guides/engines.md) | You need to set up drag, terminal, or custom game progression logic |
| [guides/building-questions.md](./guides/building-questions.md) | You are creating a new question from scratch (step-by-step) |

## Architecture Boundaries

| Document | When to Read |
|----------|-------------|
| [19-core-ui-boundary.md](./19-core-ui-boundary.md) | You need to understand what belongs in core state vs UI-local providers |
| [18-drawer-system.md](./18-drawer-system.md) | You need to register, configure, or render drawers |

---

## Quick Start

```tsx
import { GameProvider, useGameState, useGameDispatch } from "@/components/game/game-provider";
import { GridSpace, PoolSpace } from "@/components/game/engine";

function MyQuestion() {
  return (
    <GameProvider>
      <MyGame />
    </GameProvider>
  );
}
```

1. Wrap with `GameProvider` (sets up state + all UI providers)
2. Define space configs in `constants.ts`
3. Render `GridSpace`/`PoolSpace` with configs (spaces self-register)
4. Initialize entities in `useEffect` with ref guard
5. Listen to events with `useEngineEvents(id)` + `ack()`
6. Register drawer in `useLayoutEffect`

Full walkthrough: [guides/building-questions.md](./guides/building-questions.md)

---

## Provider Hierarchy

```
GameProvider
  GameStateContext + GameDispatchContext   (core state)
    ArrowProvider                          (visual connections, UI-local)
      DrawerProvider                       (panel management, UI-local)
        HintProvider                       (contextual hints, UI-local)
          TerminalProvider                 (CLI interface, UI-local)
            DragProvider                   (drag-and-drop, UI-local)
```

Core state tracks progression. UI providers manage transient visual state.
See [19-core-ui-boundary.md](./19-core-ui-boundary.md).

---

## Source Structure

```
src/components/game/
  application/     Orchestration: hooks, reducers, state types
  core/            Legacy types (being migrated)
  domain/          Pure functions: entity-fns, space-fns, validation
  engine/          GridSpace, PoolSpace components (self-registering)
  engines/         Terminal, Drag engine hooks
  infrastructure/  Grid math, geometry, coordinates
  presentation/    UI components: drawer, hint, arrow, terminal, drag, modal
  game-provider.tsx  Provider + all hook exports
```
