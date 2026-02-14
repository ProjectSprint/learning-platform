# Runtime API: Flow-Ordered Question Author Reference

This document is the canonical method reference for authors building files under
`src/routes/questions/**`.

It is intentionally explicit so humans and AI agents can follow one model:

1. Initialize runtime once.
2. Define structure declaratively.
3. Read state via guarded selectors.
4. React to events via behavior triggers.
5. Mutate through runtime APIs only.
6. Use advanced internals only when the primary API cannot express the case.

If this document conflicts with older examples, follow this document.

## Scope

This file documents callable exports that question code can import from game
modules, grouped by authoring flow. For each group, you get:

- What each method is for.
- Side effects.
- Usage examples.
- Do and don't guardrails.

## Import Paths You Should Prefer

- `@/components/game/runtime`
- `@/components/game/game-provider`
- `@/components/game/engine`
- `@/components/game/engines`
- `@/components/game/domain/adt`
- `@/components/game/domain/read`

Advanced paths (use intentionally):

- `@/components/game/runtime/behavior`
- `@/components/game/domain/transformers`
- `@/components/game/application`
- `@/components/game/domain/question`
- `@/components/game/domain/validation`
- `@/components/game/infrastructure`

Forbidden legacy imports:

- `@/components/game/domain/entity/entity-fns`
- `@/components/game/domain/space/space-fns`
- `@/components/game/domain/space/validation`
- `@/components/game/runtime/selectors/*`

---

## 1) Initialization And Runtime Entry

### Primary methods

- `GameProvider`
  - Description: wraps the page with game state contexts and providers.
  - Side effects: initializes React state and provider trees.
- `useQuestionRuntime(engineId, definition?)`
  - Description: one-stop runtime hook returning `world`, `progress`,
    `executionFlow`, `interactionSession`, `state`, `events`, `ack`, and
    `behaviorContext`.
  - Side effects: validates definition, bootstraps once, subscribes to event
    queue, runs behavior reactor, creates scheduler.
- `validateDefinition(definition)`
  - Description: validates a `QuestionDefinition` before runtime use.
  - Side effects: none (pure validation).
- `bootstrapQuestion(definition, dispatch)`
  - Description: dispatches init actions (`SET_QUESTION`, `SET_PHASE`,
    `SPACE_CREATED`, `ENTITY_CREATED`, `ENTITY_ADDED`).
  - Side effects: dispatches to reducer.

### Context access methods

- `useGameState`
  - Description: read full game state from context.
  - Side effects: rerenders on state changes.
- `useGameDispatch`
  - Description: get dispatch function.
  - Side effects: none by itself.
- `useGameCtx`
  - Description: get `{ state, dispatch }` together.
  - Side effects: same as `useGameState`.

### UI orchestration hooks (`@/components/game/game-provider`)

- `useDrawerManager`
  - Description: imperative drawer open/close/register control for drawer UI.
  - Side effects: updates drawer state in provider store.
- `useDrawerEvents`
  - Description: subscribe to drawer state transitions and actions.
  - Side effects: registers and tears down subscriptions.
- `useEngineEvents(engineId)`
  - Description: consume per-engine event batches and `ack` cursor control.
  - Side effects: reads event queue and updates cursor when `ack` is called.

### Example

```tsx
const Page = () => {
  const runtime = useQuestionRuntime("dhcp-page", DEFINITION);
  const game = useGameCtx();

  if (!runtime.state.spaces.inventory) return null;

  return (
    <GameBoard>
      <GridSpace ctx={game} config={SPACE_CONFIGS.board} />
      <PoolSpace ctx={game} config={INVENTORY_POOL_CONFIG} />
      <Modal />
    </GameBoard>
  );
};
```

### Do

- Use `useQuestionRuntime` once per page.
- Keep readiness guards when rendering spaces created by bootstrap.

### Don't

- Do not run custom bootstrap loops in page `useEffect`.
- Do not split ownership between page mutation loops and behavior rules.

---

## 2) Define Game Structure (ADT Constructors)

Use these when building data objects for initialization, test fixtures, or
advanced setup code.

### Entity constructors and clones (`@/components/game/domain/adt`)

- `createEntityData(config)`
  - Description: create a generic `EntityData` object.
  - Side effects: none.
- `createItemData(config)`
  - Description: create an `ItemData` object with item defaults.
  - Side effects: none.
- `cloneEntityData(entity, newId)`
  - Description: deep-ish clone entity with a new id.
  - Side effects: none.
- `cloneItemData(item, newId)`
  - Description: deep-ish clone item with a new id.
  - Side effects: none.

### Space constructors (`@/components/game/domain/adt`)

- `createGridSpaceData(config)`
- `createPoolSpaceData(config)`
- `createPathSpaceData(config)`
- `createQueueSpaceData(config)`
- `createMeterSpaceData(config)`
- `createCustomSpaceData(config)`
  - Description: create typed space records for each space kind.
  - Side effects: none.

### Branded id helpers (`@/components/game/domain/adt`)

- `toEntityId`, `toSpaceId`, `toPhaseId`
  - Description: cast raw strings into branded ids.
  - Side effects: none.
- `fromEntityId`, `fromSpaceId`, `fromPhaseId`
  - Description: unwrap branded ids back to plain strings.
  - Side effects: none.

### Example

```ts
import { createItemData, createGridSpaceData } from "@/components/game/domain/adt";

const entity = createItemData({
  id: "router-1",
  name: "Router",
  allowedPlaces: ["inventory", "board"],
});

const board = createGridSpaceData({
  id: "board",
  rows: 2,
  cols: 2,
  metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
});
```

### Do

- Use ADT constructors for fixtures and controlled setup.

### Don't

- Do not mutate constructors into transition logic; transitions belong to
  transformers/runtime.

---

## 3) Render And Engine Hooks

### Components (`@/components/game/engine`)

- `GameBoard`
  - Description: root visual board wrapper.
  - Side effects: UI rendering only.
- `GridSpace`
  - Description: renders state-aware grid space.
  - Side effects: UI rendering and drag handlers.
- `PoolSpace`
  - Description: renders state-aware inventory/pool.
  - Side effects: UI rendering and drag handlers.
- `PathSpace`
  - Description: renders path lane/animation space.
  - Side effects: UI rendering and path interactions.
- `CustomSpace`
  - Description: custom container for bespoke content.
  - Side effects: UI rendering only.

### Engine hooks (`@/components/game/engines`)

- `useDragEngine(config?)`
  - Description: derived drag progress state.
  - Side effects: subscribes to game state, updates local engine progress.
- `useTerminalEngine(config?)`
  - Description: terminal lifecycle helpers.
  - Side effects: terminal output history updates.
- `useEngineProgress(config?)`
  - Description: generic engine progress controller.
  - Side effects: local state updates and emitted progress events.

### Do

- Keep UI rendering concerns here.

### Don't

- Do not embed game-rule mutation logic into render components.

---

## 4) Read State And Derive Facts

### Runtime selector aliases (`@/components/game/runtime`)

- `selectEntitySpace`
  - Description: alias for `getEntitySpaceId`.
  - Side effects: none.
- `selectDerivedPhase`
  - Description: resolve next phase from phase rules and condition context.
  - Side effects: none.
- `selectEntitiesByType`
  - Description: filter entities by type.
  - Side effects: none.
- `selectEntityStateValue`
  - Description: read one state key from one entity.
  - Side effects: none.

### Canonical read layer (`@/components/game/domain/read`)

- `readApi`
  - Description: typed read contract object.
  - Side effects: none.
- `getEntity`, `getSpace`, `getSpaceEntityIds`, `getEntitySpaceId`,
  `getGridEntityPosition`
  - Description: direct lookup methods.
  - Side effects: none.
- `isEntityKnown`, `isSpaceKnown`, `isEntityInSpace`,
  `isEntityPlacementAllowed`
  - Description: guarded predicates.
  - Side effects: none.
- `selectEntitiesByType`, `selectEntityStateValue`, `selectSpaceEntityCount`,
  `selectSpaceIsFull`, `selectSpaceIsEmpty`, `selectGridEmptyPositions`,
  `selectDerivedPhase`
  - Description: derived selectors.
  - Side effects: none.

### Guard helpers (`@/components/game/domain/space`, `@/components/game/domain/entity`)

- `isGridSpace`, `isPoolSpace`, `isPathSpace`, `isQueueSpace`, `isMeterSpace`,
  `isValidGridPosition`, `isItemData`
  - Description: runtime type guards.
  - Side effects: none.

### Hook-level readers (`@/components/game/game-provider` and `@/components/game/application`)

- `useEntities`, `useEntitiesByType`, `useEntity`, `useEntityExists`,
  `useEntityPosition`, `useEntitySpace`, `useEntityState`,
  `useEntityStateValue`, `useSpace`, `useSpaceCapacity`, `useSpaceEntities`,
  `useSpaceIsEmpty`, `useSpaceIsFull`, `useSpaces`
  - Description: React convenience selectors over game context.
  - Side effects: rerender on relevant state changes.
- Provider-only convenience hooks:
  `useEntityAllowedPlaces`, `useEntityIsDraggable`, `useItem`,
  `useEntityGridPosition`
  - Description: convenience entity helpers for page/UI logic.
  - Side effects: rerender on relevant state changes.

### Example

```ts
const state = useGameState();
const routerSpace = getEntitySpaceId(state, "router-1");
const boardOpenSlots = selectGridEmptyPositions(state, "board");
const canPlace = isEntityPlacementAllowed(state, "router-1", "board", { row: 0, col: 1 });
```

### Do

- Prefer `domain/read` and runtime selector aliases for all reads.

### Don't

- Do not read by ad-hoc scanning in multiple page files.

---

## 5) Interaction Event Wiring (Behavior Layer)

These methods are mostly pure helpers used in behavior rules.

### Triggers (`@/components/game/runtime`)

- `entityClicked`
- `modalSubmitted`
- `modalClosed`
- `phaseChanged`
- `terminalInput`
- `whenEntityPlacedInSpace`
- `whenEntityTransferredToSpace`
- `whenEntityArrivedAtSpace`
  - Description: trigger matchers for behavior rules.
  - Side effects: none.

### Gating and layout (`@/components/game/runtime`)

- `evaluateDragGating`
  - Description: evaluate drag eligibility from rules.
  - Side effects: none.
- `evaluateVisibility`
  - Description: evaluate layout visibility rules.
  - Side effects: none.
- `evaluateShapeRules`
  - Description: evaluate shape overrides for spaces.
  - Side effects: none.

### Split/join/locks/lane helpers (`@/components/game/runtime`)

- Join helpers: `createJoinTracker`, `markChildComplete`, `isJoinComplete`,
  `joinRemaining`.
- Lock helpers: `createResourceLock`, `tryAcquire`, `releaseLock`, `isLocked`,
  `isHeldBy`, `waitQueueSize`.
- Lane helpers: `hasFreeLane`, `pickLane`.
- Path checkpoint helpers: `pathCheckpointData`, `pathResumeData`,
  `isMidpointTick`.
  - Description: orchestration helpers for concurrent flows and path timing.
  - Side effects: mutate helper objects local to behavior runtime, not game
    state.

### Inspector helpers (`@/components/game/runtime`)

- `createBehaviorInspector`, `createConsoleInspector`, `NOOP_INSPECTOR`
  - Description: behavior execution tracing.
  - Side effects: in-memory logs, optional console output.

### Example

```ts
import { entityClicked, modalSubmitted, whenEntityPlacedInSpace } from "@/components/game/runtime";

const triggers = [
  entityClicked("router-1"),
  modalSubmitted("configure-router"),
  whenEntityPlacedInSpace("router-1", "board"),
];
```

### Do

- Keep all event-to-rule decisions in behavior definitions.

### Don't

- Do not replicate trigger logic in page-level `useEffect` trees.

---

## 6) Mutate World, Phase, And Session

### Runtime object APIs (from `useQuestionRuntime`)

#### `world`

- `world.createEntity(config)`
  - Description: create entity via command dispatch.
  - Side effects: dispatches `ENTITY_CREATED`, appends events.
- `world.updateEntity(entityId, updates)`
  - Side effects: dispatches `ENTITY_UPDATED`, may append events.
- `world.updateEntityState(entityId, state)`
  - Side effects: dispatches `ENTITY_STATE_UPDATED`, may append events.
- `world.deleteEntities(entityIds)`
  - Side effects: dispatches `ENTITIES_DELETED`.
- `world.addToSpace(entityId, spaceId, position?)`
  - Side effects: dispatches `ENTITY_ADDED`.
- `world.removeFromSpace(entityId, spaceId)`
  - Side effects: dispatches `ENTITY_REMOVED`.
- `world.moveEntity(entityId, toSpaceId, position?)`
  - Side effects: dispatches `ENTITY_MOVED` or `ENTITY_ADDED`.
- `world.moveEntityToGrid(entityId, spaceId)`
  - Side effects: reads state then dispatches move/add.

#### `progress`

- `progress.completeQuestion()`
  - Side effects: dispatches `COMPLETE_QUESTION`.
- `progress.setQuestion({ id, status? })`
  - Side effects: dispatches `SET_QUESTION`.

#### `executionFlow`

- `executionFlow.requestPhaseTransition(phase, source)`
  - Side effects: dispatches flow intent, may emit warnings/events.
- `executionFlow.dispatchIntent(intent)`
  - Side effects: dispatches execution-flow intent.

#### `interactionSession`

- `interactionSession.openModal(modal)`
  - Side effects: dispatches `OPEN_MODAL`.
- `interactionSession.closeModal(modalId?)`
  - Side effects: dispatches `CLOSE_MODAL`.
- `interactionSession.requestPhaseTransition(phase, source)`
  - Side effects: forwards to execution-flow dispatcher.
- `interactionSession.setTerminalVisible(visible)`
  - Side effects: local runtime interaction state update.
- `interactionSession.setModalGateOpen(open)`
  - Side effects: local runtime interaction state update.

### Command factory (`@/components/game/runtime`)

- `createCommands(ctx)`
  - Description: low-level command object factory.
  - Side effects: none when created.

Produced command methods:

- `createEntity`, `updateEntity`, `updateEntityState`, `deleteEntities`,
  `addToSpace`, `removeFromSpace`, `moveEntity`, `moveEntityToGrid`,
  `completeQuestion`, `openModal`, `closeModal`.
  - Side effects: dispatch reducer actions.

### Wrapper factories (`@/components/game/runtime`)

- `createWorldApi`, `createProgressApi`, `createExecutionFlowApi`,
  `createInteractionSessionApi`
  - Description: factory functions used by runtime internals.
  - Side effects: none at creation; returned methods dispatch and mutate local
    interaction state.

### Example

```ts
const { world, progress, interactionSession } = useQuestionRuntime("ssl-page", SSL_DEFINITION);

world.moveEntity("cert-1", "https-server", { row: 0, col: 0 });
interactionSession.openModal(buildCertModal());
progress.completeQuestion();
```

### Do

- Prefer wrapper objects from `useQuestionRuntime`.
- Treat return value `RuntimeApiResult` as authoritative success/failure signal.

### Don't

- Do not dispatch raw actions from question pages if a wrapper method exists.

---

## 7) Behavior Submodule (Advanced)

Import path: `@/components/game/runtime/behavior`.

Use this when `@/components/game/runtime` barrel does not expose the helper you
need.

### Extra methods not re-exported by runtime barrel

- Spawn helpers: `stampTemplate`, `stampBatch`, `executeSpawnPlan`,
  `executeSpawnPlans`.
- Status timeline helpers: `evaluateStatusRules`, `delayedUpdate`,
  `delayedMove`, `delayedDelete`.
- Workflow helpers: `createWorkflow`, `transitionWorkflow`,
  `checkAutoTransition`, `validateWorkflow`.
- Reactor and scheduler internals: `useBehaviorReactor`, `QuestionScheduler`.

Side effects:

- Spawn helpers: dispatch only when used inside effect handlers.
- Timeline helpers: schedule delayed effects.
- `useBehaviorReactor`: subscribes to event stream and executes handlers.
- `QuestionScheduler`: manages keyed timed callbacks.

Do:

- Keep these in behavior modules, not page UI files.

Don't:

- Do not create ad-hoc timer chains if scheduler helpers can express it.

---

## 8) Application Reducer Surface (Internal/Expert)

Import path: `@/components/game/application`.

- `applicationReducer`
- `entityReducer`
- `spaceReducer`
- `createDefaultState`

Description:

- Reducer-level APIs for state machines, tests, and infrastructure code.

Side effects:

- Reducers are pure in contract, but operate over action-driven state
  transitions and can trigger invariant assertions in development.

Do:

- Use for engine tests, harnesses, and controlled infrastructure code.

Don't:

- Do not wire question route gameplay through direct reducer calls.

---

## 9) Transformer Surface (Internal/Expert)

Import path: `@/components/game/domain/transformers`.

### Methods

- API object and result helpers:
  - `transformApi`
  - `transitionApplied`
  - `transitionNoop`
  - `getNextActionId`
  - `applyAppendEvents`
- Space transitions:
  - `applyCreateSpace`
  - `tryRemoveSpace`
  - `tryAddEntityToSpace`
  - `tryRemoveEntityFromSpace`
  - `tryMoveEntityAcrossSpaces`
  - `tryUpdateGridEntityPosition`
  - `trySwapGridEntities`
- Entity transitions:
  - `tryCreateEntity`
  - `tryPatchEntity`
  - `tryPatchEntityState`
  - `applyDeleteEntities`
- Game/core transitions:
  - `trySetQuestion`
  - `trySetPhase`
  - `applyCompleteQuestion`
  - `tryAckEvents`
  - `tryEmitEvents`

Description:

- Deterministic transition layer used by reducers and runtime internals.

Side effects:

- Mutates the provided draft-like state object by design.
- Emits transition payloads and noop reasons.

Do:

- Use when implementing engine internals, reducers, or deterministic tests.

Don't:

- Do not mix these directly into route-level UI effects unless there is no
  wrapper alternative.

---

## 10) Invariants And Domain-Level Helpers

### Invariants (`@/components/game/domain` or `.../domain/invariants`)

- `assertNever`
- `findOwnershipViolations`
- `assertSingleSpaceOwnership`

Side effects:

- `assert*` methods throw on violations.

### Question AST helpers (`@/components/game/domain/question`)

- `evaluateCondition`
- `resolvePhase`
- `resolveVisibility`

Side effects:

- none.

### Validation/sanitize helpers (`@/components/game/domain/validation`)

- Pool helpers:
  - `findPoolItem`
  - `normalizePoolGroup`
  - `normalizePoolGroups`
  - `normalizePoolItems`
- Sanitize helpers:
  - `sanitizeConfigValue`
  - `sanitizeDeviceConfig`
  - `sanitizeTerminalInput`
  - `sanitizeTerminalOutput`
  - `sanitizeText`

Side effects:

- none (pure transformations/sanitization).

---

## 11) Low-Level Infrastructure (Optional)

Import path: `@/components/game/infrastructure`.

### Geometry methods

- `createPoint`, `createGridCoord`, `pointsEqual`, `gridCoordsEqual`,
  `distance`, `manhattanDistance`, `addPoints`, `subtractPoints`, `scalePoint`,
  `snapToGrid`, `snapPointToGrid`, `isInBounds`, `clamp`, `clampPoint`.

### Grid classes

- `GridBase`, `GridCell`, `SquareGrid`, `HexGrid`, `RadialGrid`.

Side effects:

- geometry methods are pure.
- class usage depends on your instantiation and consumers.

Do:

- Use this layer for specialized geometry or custom grid logic.

Don't:

- Do not duplicate these utilities inside question routes.

---

## 12) Do And Don't Summary For AI Agents

Do:

1. Start from `useQuestionRuntime` and wrapper APIs.
2. Keep reads in `domain/read` (`is/get/select`).
3. Keep mutations in `world/progress/executionFlow/interactionSession`.
4. Keep event logic in behaviors, not in page mutation effects.
5. Use ADT constructors for deterministic fixtures/setup.

Don't:

1. Do not import removed legacy helpers.
2. Do not split gameplay ownership between behavior rules and ad-hoc page loops.
3. Do not bypass wrapper APIs with direct reducer dispatch unless explicitly
   required by engine internals.
4. Do not add untracked async timers when scheduler-based APIs are available.
