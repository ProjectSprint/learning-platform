# Runtime API: Canonical Question Author Reference

This is the canonical API reference for files under `src/routes/questions/**`.

If another doc or old route example conflicts with this file, treat this file as
source of truth.

## Audience and Goal

This file is written for question authors and AI agents. It documents importable
APIs by authoring flow:

1. Initialize runtime and providers.
2. Define static game shape (ADT constructors).
3. Read game state through guarded read APIs.
4. React to events with behavior triggers/helpers.
5. Mutate state via runtime wrappers only.
6. Use advanced/internal APIs only when primary APIs cannot express the case.

For each method, this doc states purpose, return behavior, side effects,
examples, and misuse risks.

## Import Policy

Preferred imports for route-level question code:

- `@/components/game/runtime`
- `@/components/game/game-provider`
- `@/components/game/engine`
- `@/components/game/engines`
- `@/components/game/domain/read`
- `@/components/game/domain/adt`

Advanced imports (intentional, not default):

- `@/components/game/runtime/behavior`
- `@/components/game/domain/question`
- `@/components/game/domain/transformers`
- `@/components/game/application`

Forbidden legacy imports:

- `@/components/game/domain/entity/entity-fns`
- `@/components/game/domain/space/space-fns`
- `@/components/game/domain/space/validation`
- `@/components/game/runtime/selectors/*`

## 1) Initialization and Runtime Entry

### `GameProvider`

- Import: `@/components/game/game-provider`
- Purpose: Mounts game contexts (`state`, `dispatch`) plus Arrow, Drawer, Hint,
  Terminal, and Drag providers.
- Return: React component.
- Side effects:
  - Creates reducer state via `applicationReducer`.
  - Mounts nested provider tree that many hooks require.
- Example:

```tsx
<GameProvider>
  <MyQuestionPage />
</GameProvider>
```

- Do: Wrap the entire question page subtree once.
- Do not: Nest multiple `GameProvider`s for one question runtime.

### `useQuestionRuntime(engineId, definition?)`

- Import: `@/components/game/runtime`
- Purpose: Main runtime hook. Returns world/progress/executionFlow/
  interactionSession wrappers, state, pending events, behavior context, and
  runtime wiring refs.
- Return: `QuestionRuntime<TContext>` object.
- Side effects:
  - Validates `definition` during render and throws if invalid.
  - Bootstraps exactly once (`bootstrapQuestion`) when definition is provided.
  - Subscribes to engine-specific event cursor (`useEngineEvents`).
  - Runs behavior reactor over event batches.
  - Creates and disposes runtime scheduler.
- Failure behavior:
  - Throws on invalid `QuestionDefinition`.
- Example:

```tsx
const {
  world,
  interactionSession,
  state,
  behaviorContext,
  registerTerminalFinish,
} = useQuestionRuntime("tcp-page", TCP_DEFINITION);
```

- Do: Call once per question page.
- Do: Use returned wrappers for gameplay mutations.
- Do not: Recreate parallel custom bootstraps in page effects.

### `validateDefinition(definition)`

- Import: `@/components/game/runtime`
- Purpose: Static/runtime validation for `QuestionDefinition`.
- Return: `ValidationError[]`.
- Side effects: none.
- Current checks:
  - `meta.id` non-empty.
  - Space IDs unique.
  - `entity.initialSpace` references an existing space.
- Example:

```ts
const errors = validateDefinition(DEFINITION);
if (errors.length) {
  throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join("; "));
}
```

- Do: Use in tests/author tooling.
- Do not: Assume it catches every semantic error; it is not exhaustive.

### `bootstrapQuestion(definition, dispatch)`

- Import: `@/components/game/runtime`
- Purpose: Deterministically initialize state from a question definition.
- Return: `void`.
- Side effects:
  - Dispatches `SET_QUESTION`.
  - Dispatches `SET_PHASE`.
  - Dispatches `SPACE_CREATED` per space.
  - Dispatches `ENTITY_CREATED` per entity.
  - Dispatches `ENTITY_ADDED` for entities with `initialSpace`.
- Example:

```ts
bootstrapQuestion(DEFINITION, dispatch);
```

- Do: Use from runtime internals or deterministic tests.
- Do not: Call repeatedly in normal page render lifecycle.

### `useGameState()`

- Import: `@/components/game/game-provider`
- Purpose: Read full `GameState` from context.
- Return: `GameState`.
- Side effects: React rerender when game state changes.
- Failure behavior: Throws if called outside `GameProvider`.

### `useGameDispatch()`

- Import: `@/components/game/game-provider`
- Purpose: Access game action dispatcher.
- Return: `(action) => void`.
- Side effects: none until dispatch is called.
- Failure behavior: Throws if called outside `GameProvider`.

### `useGameCtx()`

- Import: `@/components/game/game-provider`
- Purpose: Convenience to get `{ state, dispatch }` together.
- Return: `GameContextValue`.
- Side effects: same rerender behavior as `useGameState()`.

### `useEngineEvents(engineId)`

- Import: `@/components/game/game-provider`
- Purpose: Read event batch for one engine cursor and acknowledge processed
  events.
- Return: `{ events, cursor, ack }`.
- Side effects:
  - `ack()` dispatches `ACK_EVENTS` with latest seen `eventId`.
  - Automatically resets cursor if queue compaction/regression is detected.
- Example:

```ts
const { events, ack } = useEngineEvents("terminal");
```

- Do: Call `ack()` after processing a batch.
- Do not: Read global event queue directly in route code.

### `useDrawerManager()`

- Import: `@/components/game/game-provider`
- Purpose: Register/control drawer instances.
- Return: `{ registerDrawer, openDrawer, closeDrawer, toggleDrawer, updateDrawerConfig }`.
- Side effects: Updates drawer store state and emits drawer-local events.

### `useDrawerEvents(drawerId?)`

- Import: `@/components/game/game-provider`
- Purpose: Consume filtered drawer event stream.
- Return: `{ events, cursor, ack }`.
- Side effects: Maintains internal cursor and resets cursor when drawer filter
  changes.

## 2) Define Static Game Data (ADT Constructors)

All methods below are pure constructors/helpers.

### `createEntityData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create `EntityData` from generic config.
- Return: `EntityData`.
- Side effects: none.

### `createItemData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create draggable `ItemData`.
- Return: `ItemData`.
- Side effects: none.
- Important behavior: `type` defaults from `config.data?.type` or falls back to
  `"item"`.

### `cloneEntityData(entity, newId)`

- Import: `@/components/game/domain/adt`
- Purpose: Clone entity while replacing `id`.
- Return: `EntityData` clone.
- Side effects: none.

### `cloneItemData(item, newId)`

- Import: `@/components/game/domain/adt`
- Purpose: Clone item while replacing `id`.
- Return: `ItemData` clone.
- Side effects: none.

### `createGridSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create empty grid space state.
- Return: `GridSpaceData` with empty `entityPositions`.
- Side effects: none.

### `createPoolSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create empty pool space state.
- Return: `PoolSpaceData` with empty `entityIds`.
- Side effects: none.

### `createPathSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create empty path space state.
- Return: `PathSpaceData` with defaults for `viewBox`, `duration`,
  `speedMultiplier`, and `showDropzone`.
- Side effects: none.

### `createCustomSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create custom display-only space state.
- Return: `CustomSpaceData`.
- Side effects: none.

### `createQueueSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create FIFO queue space state.
- Return: `QueueSpaceData` with empty `entityIds`.
- Side effects: none.

### `createMeterSpaceData(config)`

- Import: `@/components/game/domain/adt`
- Purpose: Create numeric meter space state.
- Return: `MeterSpaceData` initialized with `value = min`.
- Side effects: none.

### `toEntityId(value)`, `toSpaceId(value)`, `toPhaseId(value)`

- Import: `@/components/game/domain/adt`
- Purpose: Brand string IDs for typed APIs.
- Return: branded ID values.
- Side effects: none.

### `fromEntityId(value)`, `fromSpaceId(value)`, `fromPhaseId(value)`

- Import: `@/components/game/domain/adt`
- Purpose: Convert branded IDs back to plain strings.
- Return: `string`.
- Side effects: none.

## 3) Render and Engine Hooks

### `GameBoard`

- Import: `@/components/game/engine`
- Purpose: Wrap board with registry + arrow surface contexts.
- Side effects: Registers board surface for arrow routing.

### `GridSpace`

- Import: `@/components/game/engine`
- Purpose: State-aware grid renderer with drop handling.
- Side effects:
  - Validates placements through read guards.
  - Dispatches `ENTITY_ADDED`, `ENTITY_MOVED`, or
    `ENTITY_POSITION_UPDATED` on drop.
  - Emits development warning if configured space does not exist.

### `PoolSpace`

- Import: `@/components/game/engine`
- Purpose: State-aware inventory renderer.
- Side effects:
  - Starts drag sessions through `DragContext`.
  - Dispatches `ENTITY_MOVED` when returning item to pool.
  - Emits development warning when missing space.

### `PathSpace`

- Import: `@/components/game/engine`
- Purpose: Path transit renderer with midpoint/completion hooks.
- Side effects:
  - Accepts drop and dispatches add/move actions.
  - Dispatches `ENTITY_UPDATED` midpoint tick (`pathMidpointTick`).
  - Dispatches `ENTITY_REMOVED` when path transit completes.

### `CustomSpace`

- Import: `@/components/game/engine`
- Purpose: Custom display container tied to a custom space id.
- Side effects:
  - Registers DOM node for board arrows.
  - Emits development warning and renders `null` if space missing/wrong kind.

### `useDragEngine(config?)`

- Import: `@/components/game/engines`
- Purpose: Engine lifecycle state for drag progression.
- Return: `DragEngine` (`progress`, `start`, `finish`, `reset`, `state`).
- Side effects:
  - Emits engine lifecycle events via `useEngineProgress`.
  - Auto-starts when first entity is placed into primary grid unless
    `autoStart: false`.

### `useTerminalEngine(config?)`

- Import: `@/components/game/engines`
- Purpose: Terminal-specific engine lifecycle + command processing bridge.
- Return: `TerminalEngine` (`progress`, `start`, `finish`, `reset`).
- Side effects:
  - Consumes `TERMINAL_INPUT` events from terminal cursor.
  - Calls `onCommand` callback for each terminal input.
  - Calls `ack()` after processing terminal events.

### `useEngineProgress(config?)`

- Import: `@/components/game/engines`
- Purpose: Generic engine lifecycle helper.
- Return: `EngineController` (`progress`, `start`, `finish`, `reset`).
- Side effects:
  - Emits `ENGINE_STARTED` and `ENGINE_FINISHED` events.
  - Invokes `onStarted`/`onFinished` callbacks if provided.

## 4) Read Layer (Guarded Queries)

### Runtime aliases from `@/components/game/runtime`

### `selectEntitySpace(state, entityId)`

- Alias for `getEntitySpaceId` from `domain/read`.
- Return: `spaceId | null`.
- Side effects: none.

### `selectDerivedPhase(rules, context, currentPhase, fallbackPhase)`

- Wrapper over `resolvePhase` semantics.
- Return: `PhaseResolution` (`nextPhase`, rule metadata).
- Side effects: none.

### `selectEntitiesByType(state, type)`

- Return entities filtered by `entity.type`.
- Side effects: none.

### `selectEntityStateValue(state, entityId, key)`

- Return typed value from entity `state` map.
- Side effects: none.

### Canonical reads from `@/components/game/domain/read`

### `getEntity(state, entityId)`

- Purpose: O(1) entity lookup.
- Return: `EntityData | undefined`.
- Side effects: none.

### `getSpace(state, spaceId)`

- Purpose: O(1) space lookup.
- Return: `SpaceData | undefined`.
- Side effects: none.

### `getSpaceEntityIds(state, spaceId)`

- Purpose: Uniformly read entity IDs for grid/pool/path/queue spaces.
- Return: `string[]`.
- Side effects: none.

### `getEntitySpaceId(state, entityId)`

- Purpose: Find owning space by scanning spaces.
- Return: `spaceId | null`.
- Side effects: none.

### `getGridEntityPosition(state, entityId, spaceId?)`

- Purpose: Read entity grid position from explicit or owning grid space.
- Return: `GridPosition | undefined`.
- Side effects: none.

### `isEntityKnown(state, entityId)`

- Purpose: Guard for entity existence.
- Return: `boolean`.
- Side effects: none.

### `isSpaceKnown(state, spaceId)`

- Purpose: Guard for space existence.
- Return: `boolean`.
- Side effects: none.

### `isEntityInSpace(state, entityId, spaceId)`

- Purpose: Guard membership in one space.
- Return: `boolean`.
- Side effects: none.

### `isEntityPlacementAllowed(state, entityId, toSpaceId, toPosition?)`

- Purpose: Validate placement rules (allowedPlaces, capacity, coordinate bounds,
  occupancy).
- Return: `boolean`.
- Side effects: none.

### `selectSpaceEntityCount(state, spaceId)`

- Purpose: Derived count helper.
- Return: `number`.
- Side effects: none.

### `selectSpaceIsFull(state, spaceId)`

- Purpose: Derived fullness guard.
- Return: `boolean`.
- Notes: Uses `maxDepth` for queue spaces when present.
- Side effects: none.

### `selectSpaceIsEmpty(state, spaceId)`

- Purpose: Derived emptiness guard.
- Return: `boolean`.
- Side effects: none.

### `selectGridEmptyPositions(state, spaceId)`

- Purpose: Find available coordinates in grid space.
- Return: `GridPosition[]`.
- Side effects: none.

### `readApi`

- Purpose: Branded-ID façade over read functions.
- Return: object with `is/get/select` family methods.
- Side effects: none.
- Use when: Working inside branded-domain code paths.

### Hook-level read convenience from `@/components/game/game-provider`

- `useEntity(entityId)`
- `useEntities()`
- `useEntitiesByType(type)`
- `useEntityState(entityId)`
- `useEntityStateValue(entityId, key)`
- `useEntityExists(entityId)`
- `useEntitySpace(entityId)`
- `useEntityPosition(entityId)`
- `useItem(entityId)`
- `useEntityIsDraggable(entityId)`
- `useEntityAllowedPlaces(entityId)`
- `useSpace(spaceId)`
- `useSpaces()`
- `useSpaceEntities(spaceId)`
- `useSpaceIsFull(spaceId)`
- `useSpaceIsEmpty(spaceId)`
- `useSpaceCapacity(spaceId)`
- `useEntityGridPosition(entityId)`

Common behavior across these hooks:

- Purpose: React-friendly subscriptions to read layer.
- Return: Derived values noted by each name.
- Side effects: rerender when relevant game state changes.
- Failure behavior: Throws only if called outside `GameProvider` (because they
  depend on `useGameState`).

### Validation helper from `@/components/game/game-provider`

### `findPoolItem(groups, itemId)`

- Purpose: Locate one item by id inside normalized inventory groups.
- Return: `{ groupIndex, itemIndex, item } | null`.
- Side effects: none.
- Use when: Building modal defaults or inventory diagnostics from static pool
  config data.

### Type guards used by question code

### `isItemData(entity)`

- Import: `@/components/game/domain/entity/entity-data`
- Purpose: Narrow `EntityData` to `ItemData`.
- Return: type predicate (`entity is ItemData`).
- Side effects: none.

### `isGridSpace(space)`, `isPoolSpace(space)`, `isPathSpace(space)`, `isQueueSpace(space)`, `isMeterSpace(space)`

- Import: `@/components/game/domain/space`
- Purpose: Narrow `SpaceData` union by kind before reading kind-specific fields.
- Return: type predicate for each concrete space type.
- Side effects: none.

### `isValidGridPosition(value)`

- Import: `@/components/game/domain/space`
- Purpose: Runtime guard for `{ row, col }` shape.
- Return: `boolean`.
- Side effects: none.

### Declarative condition helpers from `@/components/game/domain/question`

### `evaluateCondition(condition, context)`

- Purpose: Evaluate one declarative condition tree (`and/or/not/flag/eq/in`).
- Return: `boolean`.
- Side effects: none.

### `resolvePhase(rules, context, currentPhase, fallbackPhase)`

- Purpose: Resolve phase according to ordered phase rules.
- Return: `PhaseResolution` (`nextPhase`, `shouldRetain`).
- Side effects: none.
- Important semantics:
  - Matching `retain` short-circuits immediately.
  - Matching `set` updates candidate phase and evaluation continues.
  - Final winner is last matching `set` unless a `retain` matched earlier.

### `resolveVisibility(rules, context, key, current)`

- Purpose: Resolve declarative visibility for one inventory group or one space key.
- Return: `boolean`.
- Side effects: none.

## 5) Behavior Triggers and Rule Helpers

### Trigger factory methods (`@/components/game/runtime`)

All trigger factories are pure and return `EventTrigger` objects.

### `whenEntityPlacedInSpace(space?, entityType?)`

- Matches `ENTITY_ENTERED_SPACE`.
- Side effects: none.

### `whenEntityTransferredToSpace(space?, entityType?)`

- Matches `ENTITY_MOVED` by destination space.
- Side effects: none.

### `whenEntityArrivedAtSpace(space?, entityType?)`

- Matches either `ENTITY_ENTERED_SPACE` or `ENTITY_MOVED` arrival.
- Side effects: none.

### `entityClicked(entityType?, space?)`

- Matches `ENTITY_CLICKED`.
- Side effects: none.

### `modalClosed(modalId?)`

- Matches `MODAL_CLOSED`.
- Side effects: none.

### `modalSubmitted(modalId?, modalActionId?)`

- Matches `MODAL_SUBMITTED`.
- Side effects: none.

### `terminalInput(match?)`

- Matches `TERMINAL_INPUT`.
- `match` supports exact string or `RegExp`.
- Side effects: none.

### `phaseChanged(to?, from?)`

- Matches `PHASE_CHANGED`.
- Side effects: none.

### Drag and layout helpers (`@/components/game/runtime`)

### `evaluateDragGating(rules, ctx)`

- Purpose: First-match drag eligibility evaluation.
- Return: `boolean | undefined` (`undefined` means no matching rule).
- Side effects: none.

### `evaluateVisibility(rules, ctx)`

- Purpose: Resolve visibility map for target IDs.
- Return: `Record<string, boolean>`.
- Side effects: none.

### `evaluateShapeRules(rules, ctx)`

- Purpose: Resolve dynamic space shape overrides.
- Return: `Record<string, SpaceShapeOverrides>`.
- Side effects: none.

### Lane helpers (`@/components/game/runtime`)

### `hasFreeLane(input)`

- Purpose: Check if any enabled lane is available.
- Return: `boolean`.
- Side effects: none.

### `pickLane(input)`

- Purpose: Pick lane by `first_free` or `round_robin` policy.
- Return: `{ laneId, cursor }`.
- Side effects: none.

### Split/join helpers (`@/components/game/runtime`)

### `createJoinTracker(parentId, childIds, policy?)`

- Return: initial `JoinTracker`.
- Side effects: none.

### `markChildComplete(tracker, childId)`

- Return: new `JoinTracker` (immutable update).
- Side effects: none.

### `isJoinComplete(tracker)`

- Return: `boolean` according to join policy.
- Side effects: none.

### `joinRemaining(tracker)`

- Return: remaining completions to satisfy join policy.
- Side effects: none.

### Resource lock helpers (`@/components/game/runtime`)

### `createResourceLock(resourceId)`

- Return: empty `ResourceLockState`.
- Side effects: none.

### `tryAcquire(lock, request)`

- Return: `{ lock, acquired }`.
- Behavior:
  - Shared+shared can coexist.
  - Contended requests are queued once.
- Side effects: none (immutable lock transitions).

### `releaseLock(lock, requesterId)`

- Return: `{ lock, promoted }`.
- Behavior: Promotes next waiting requester when lock becomes free.
- Side effects: none.

### `isLocked(lock)`

- Return: `boolean`.
- Side effects: none.

### `isHeldBy(lock, requesterId)`

- Return: `boolean`.
- Side effects: none.

### `waitQueueSize(lock)`

- Return: `number`.
- Side effects: none.

### Path checkpoint helpers (`@/components/game/runtime`)

### `pathCheckpointData(checkpoint)`

- Purpose: Create entity data flags for midpoint pause/resume behavior.
- Return: `Record<string, unknown>`.
- Side effects: none.

### `pathResumeData(currentToken)`

- Purpose: Bump resume token payload.
- Return: `Record<string, unknown>`.
- Side effects: none.

### `isMidpointTick(updates)`

- Purpose: Detect midpoint marker in entity updates.
- Return: `boolean`.
- Side effects: none.

### Inspector helpers (`@/components/game/runtime`)

### `createBehaviorInspector(maxEntries?)`

- Purpose: In-memory behavior trace collector.
- Return: `BehaviorInspector`.
- Side effects: stores bounded log entries in memory.

### `createConsoleInspector(maxEntries?)`

- Purpose: Inspector with console output for dev tracing.
- Return: `BehaviorInspector`.
- Side effects: logs via `console.debug`/`console.warn`.

### `NOOP_INSPECTOR`

- Purpose: Production-safe no-op inspector.
- Return: `BehaviorInspector`.
- Side effects: none.

## 6) Runtime Mutation APIs (Primary Write Surface)

All runtime wrapper methods return `RuntimeApiResult`.

- Success: `{ ok: true }`
- Failure: `{ ok: false, error: { message } }`

Question code should treat `ok: false` as operational failure and handle it.

### `world.createEntity(config)`

- Purpose: Create item entity.
- Side effects: Dispatches `ENTITY_CREATED`.

### `world.updateEntity(entityId, updates)`

- Purpose: Patch entity name/data/visual.
- Side effects: Dispatches `ENTITY_UPDATED`.

### `world.updateEntityState(entityId, state)`

- Purpose: Merge dynamic runtime state.
- Side effects: Dispatches `ENTITY_STATE_UPDATED`.

### `world.deleteEntities(entityIds)`

- Purpose: Bulk delete entities.
- Side effects: Dispatches `ENTITIES_DELETED`.

### `world.addToSpace(entityId, spaceId, position?)`

- Purpose: Add entity to space.
- Side effects: Dispatches `ENTITY_ADDED`.

### `world.removeFromSpace(entityId, spaceId)`

- Purpose: Remove entity from space.
- Side effects: Dispatches `ENTITY_REMOVED`.

### `world.moveEntity(entityId, toSpaceId, position?)`

- Purpose: Move entity between spaces (or add if unowned).
- Side effects: Dispatches `ENTITY_MOVED` or `ENTITY_ADDED`.

### `world.moveEntityToGrid(entityId, spaceId)`

- Purpose: Place entity into first available grid coordinate.
- Side effects: Reads state and dispatches move/add when possible.
- Failure behavior: returns `{ ok: false }` if target not grid or no empty slot.

### `progress.completeQuestion()`

- Purpose: Mark question done.
- Side effects: Dispatches `COMPLETE_QUESTION`.

### `progress.setQuestion({ id, status? })`

- Purpose: Set question identity/status.
- Side effects: Dispatches `SET_QUESTION`.

### `executionFlow.requestPhaseTransition(phase, source)`

- Purpose: Request validated phase transition intent.
- Side effects:
  - Dispatches `SET_PHASE` on accepted transition.
  - Emits `RUNTIME_WARNING` events for invalid/duplicate/rapid intents.
- Failure behavior: returns `{ ok: false }` for unsupported, empty, or duplicate
  phase transitions.

### `executionFlow.dispatchIntent(intent)`

- Purpose: Dispatch low-level execution flow intent.
- Side effects: same dispatcher path as above.

### `interactionSession.openModal(modal)`

- Purpose: Open modal.
- Side effects: Dispatches `OPEN_MODAL`.

### `interactionSession.closeModal(modalId?)`

- Purpose: Close modal by id or top-most.
- Side effects: Dispatches `CLOSE_MODAL`.

### `interactionSession.requestPhaseTransition(phase, source)`

- Purpose: Phase transition convenience through execution flow dispatcher.
- Side effects: same as `executionFlow.requestPhaseTransition`.

### `interactionSession.setTerminalVisible(visible)`

- Purpose: Update runtime-local interaction state.
- Side effects: updates `interactionState.terminalVisible` only.

### `interactionSession.setModalGateOpen(open)`

- Purpose: Update runtime-local modal gating flag.
- Side effects: updates `interactionState.modalGateOpen` only.

### `createCommands(ctx)`

- Import: `@/components/game/runtime`
- Purpose: Build raw command object used by wrappers.
- Return: `Commands` object.
- Side effects: none at creation time.
- Write side effects of returned methods:
  - `createEntity`, `updateEntity`, `updateEntityState`, `deleteEntities`
  - `addToSpace`, `removeFromSpace`, `moveEntity`, `moveEntityToGrid`
  - `completeQuestion`, `openModal`, `closeModal`

### `createWorldApi`, `createProgressApi`, `createExecutionFlowApi`, `createInteractionSessionApi`

- Import: `@/components/game/runtime`
- Purpose: Build wrapper objects around commands/dispatcher.
- Return: wrapper objects used by runtime.
- Side effects: none at creation; side effects occur when wrapper methods run.
- Use when: custom harnesses/tests or runtime extension work.

## 7) Advanced Behavior Module (`@/components/game/runtime/behavior`)

Use this module when you intentionally need helpers that are not the primary
question authoring path.

### Spawn helpers

- `stampTemplate(template, id, overrides?)`
- `stampBatch(template, count, prefix?, perItemOverrides?)`
- `executeSpawnPlan(plan, world)`
- `executeSpawnPlans(plans, world)`

Behavior:

- Template helpers are pure config builders.
- Execute helpers call `world.createEntity` and optional `world.addToSpace`.

### Status helpers

- `evaluateStatusRules(rules, ctx)`
- `delayedUpdate(key, entityId, delayMs, updates)`
- `delayedDelete(key, entityId, delayMs)`
- `delayedMove(key, entityId, toSpaceId, delayMs)`

Behavior:

- `evaluateStatusRules` returns first matching badge.
- `delayed*` builders are pure `TimelineAction` constructors.

### Workflow helpers

- `createWorkflow(definition, nowMs?)`
- `transitionWorkflow(instance, definition, toState, ctx?, nowMs?)`
- `checkAutoTransition(instance, definition, nowMs?)`
- `validateWorkflow(definition)`

Behavior:

- All are pure state-machine helpers.
- `transitionWorkflow` is no-op when transition is invalid/disallowed.

### Reactor/scheduler internals

- `useBehaviorReactor(definition, deps)`
- `QuestionScheduler`

Side effects:

- Reactor consumes events, runs first-match rules, and calls `ack()`.
- Scheduler owns keyed timers and supports cancellation/disposal.

## 8) Internal Expert Surfaces (Use Sparingly)

### `@/components/game/application`

- `applicationReducer`, `entityReducer`, `spaceReducer`, `createDefaultState`
- Use case: reducer tests, harnesses, deterministic state transition checks.
- Side effects: reducers are pure, but they represent core mutation semantics.

### `@/components/game/domain/transformers`

- `transformApi`
- `transitionApplied`, `transitionNoop`
- `getNextActionId`, `applyAppendEvents`
- `applyCreateSpace`, `tryRemoveSpace`, `tryAddEntityToSpace`,
  `tryRemoveEntityFromSpace`, `tryMoveEntityAcrossSpaces`,
  `tryUpdateGridEntityPosition`, `trySwapGridEntities`
- `tryCreateEntity`, `tryPatchEntity`, `tryPatchEntityState`,
  `applyDeleteEntities`
- `trySetQuestion`, `trySetPhase`, `applyCompleteQuestion`, `tryAckEvents`,
  `tryEmitEvents`

Behavior:

- Deterministic transition layer used by reducers.
- Most `try*` methods return explicit no-op reasons instead of throwing.

## 9) Practical Guardrails for Humans and AI Agents

Do:

1. Start with `useQuestionRuntime`.
2. Read with `domain/read` (`is/get/select`) or runtime read aliases.
3. Write through `world/progress/executionFlow/interactionSession` wrappers.
4. Keep gameplay branching in behavior rules.
5. Handle `RuntimeApiResult` failures explicitly.

Do not:

1. Do not split mutation ownership between behaviors and ad-hoc page loops.
2. Do not dispatch raw reducer actions from route pages when wrapper methods
   exist.
3. Do not import legacy helper paths listed in this document.
4. Do not add unmanaged timers when `schedule/cancelSchedule` can express the
   behavior.

## 10) Minimal End-to-End Example

```tsx
const Page = ({ onQuestionComplete }: { onQuestionComplete: () => void }) => {
  const {
    world,
    interactionSession,
    state,
    behaviorContext,
    registerTerminalFinish,
  } = useQuestionRuntime("my-page", MY_DEFINITION);

  const game = useGameCtx();
  const drag = useDragEngine();
  const terminalEngine = useTerminalEngine({});

  registerTerminalFinish.current = terminalEngine.finish;

  useEffect(() => {
    if (behaviorContext.navigateAway) onQuestionComplete();
  }, [behaviorContext.navigateAway, onQuestionComplete]);

  useEffect(() => {
    const phase = selectDerivedPhase(
      MY_DEFINITION.phaseRules,
      {
        dragStatus: drag.progress.status,
        questionStatus: state.question.status,
      },
      state.phase,
      "setup",
    );

    if (phase.nextPhase !== state.phase) {
      interactionSession.requestPhaseTransition(phase.nextPhase, "my.phase.rules");
    }
  }, [drag.progress.status, interactionSession, state.phase, state.question.status]);

  return (
    <GameBoard>
      <GridSpace ctx={game} config={SPACE_CONFIGS.board} />
      <DrawerLayout drawerId="inventory-drawer">
        <PoolSpace ctx={game} config={INVENTORY_POOL_CONFIG} />
      </DrawerLayout>
      <DragOverlay getEntityLabel={(type) => type} />
      <Modal />
    </GameBoard>
  );
};
```
