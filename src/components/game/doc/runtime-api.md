# RuntimeAPI — useQuestionRuntime and API Wrappers

The runtime API provides a single hook that replaces manual dispatch patterns
and four domain-specific API wrappers for safe state mutation.

```typescript
import { useQuestionRuntime } from "@/components/game/runtime";
import type { QuestionRuntime, WorldApi, ProgressApi, InteractionSessionApi, ExecutionFlowApi } from "@/components/game/runtime";
```

## useQuestionRuntime

The primary hook for question pages. Provides everything a page needs:
bootstrap, state access, event subscription, behavior context, and API wrappers.

```typescript
function useQuestionRuntime<CK extends string, TContext>(
  engineId: string,
  definition?: QuestionDefinition<CK, TContext>,
): QuestionRuntime<TContext>;
```

**Parameters:**

- `engineId` — Unique engine ID for event subscription (e.g. `"dhcp-page"`).
  Each page should use a distinct ID.
- `definition` — Optional QuestionDefinition. When provided, the runtime
  bootstraps game state on mount and activates the behavior reactor.

### Return Type: QuestionRuntime

```typescript
type QuestionRuntime<TContext> = {
  world: WorldApi;                     // Entity/space mutations
  progress: ProgressApi;               // Question completion
  executionFlow: ExecutionFlowApi;     // Phase orchestration
  interactionSession: InteractionSessionApi;  // Modal/terminal/phase control
  interactionState: InteractionSessionState;  // React-local ephemeral state
  state: GameState;                    // Current game state (read-only)
  phase: string;                       // Shortcut for state.phase
  isCompleted: boolean;                // Shortcut for state.question.status === "completed"
  events: GameEvent[];                 // Pending events for this engine
  ack: () => void;                     // Acknowledge processed events
  behaviorContext: TContext;            // Current behavior context value
  registerTerminalFinish: MutableRefObject<(() => void) | null>;  // Terminal finish callback ref
};
```

### Side Effects

1. **Bootstrap (once)** — If definition is provided, dispatches init actions on
   mount: SET_QUESTION, SET_PHASE, SPACE_CREATED (per space), ENTITY_CREATED +
   ENTITY_ADDED (only when entity has `initialSpace`). Guarded by ref, runs
   exactly once.

2. **Validation (every render)** — Validates the definition and throws if
   invalid. This is intentional: invalid definitions should fail fast.

3. **Behavior reactor (every render with events)** — When `events.length > 0`,
   processes events through behavior rules asynchronously, then calls `ack()`.

4. **Terminal bridge** — Creates a stable ref-based bridge to terminal store
   functions (writeOutput, clearHistory) so behavior handlers can access
   terminal without stale closures.

5. **Behavior scheduler lifecycle** — Runtime instantiates an internal
   `QuestionScheduler` and disposes it on unmount. `EffectContext.schedule`
   uses this scheduler so delayed behavior effects are keyed and cancellable.

### Bootstrap Lifecycle Details

Bootstrap is deterministic and one-time per mounted page instance:

1. Definition validation runs.
2. Question metadata/phase are initialized.
3. Spaces are created from `definition.spaces`.
4. Entities are created from `definition.entities`.
5. Entities with `initialSpace` are placed into spaces.

Practical timing note:
- Your page component may render once before all bootstrap actions are reflected
  in `state`.
- Space-dependent UI (`GridSpace`, `PoolSpace`, `CustomSpace`) should tolerate
  "space not ready yet" on initial render.

Recommended pattern:

```typescript
const boardReady = Boolean(
  state.spaces.internet &&
  state.spaces["client-a"]?.kind === "custom" &&
  state.spaces["client-b"]?.kind === "custom",
);

return boardReady ? <GameBoard>{/* board content */}</GameBoard> : null;
```

Use whatever readiness condition matches your question; the key is to avoid
assuming every space exists on render zero.

### Behavior-First Runtime Flow

Treat `useQuestionRuntime()` as the boundary between orchestration and rules:

- **Page layer**: wires UI and lifecycle concerns (drawer, hints, terminal
  visibility, navigation callback, phase-rule resolution).
- **Behavior layer**: owns game rule mutations and decision logic using
  `world`, `interaction`, and `progress`.

This split prevents duplicate logic between `useEffect` handlers and behavior
rules, and makes event processing easier to reason about.

Recommended:
- derive render/UI state from `behaviorContext`
- keep page effects for wiring concerns only (navigation, drawers, terminal)
- keep delayed/queued rule transitions inside behaviors via `schedule`

### Usage Pattern

```typescript
const MyPage = ({ onQuestionComplete }: { onQuestionComplete: () => void }) => {
  const {
    world,
    interactionSession,
    state,
    behaviorContext,
    isCompleted,
    registerTerminalFinish,
  } = useQuestionRuntime("my-page", MY_DEFINITION);

  const gameCtx = useGameCtx();
  const dragEngine = useDragEngine();
  const terminalEngine = useTerminalEngine({});

  // Wire terminal finish to behavior system
  registerTerminalFinish.current = terminalEngine.finish;

  // Watch for navigation signal from behaviors
  useEffect(() => {
    if (behaviorContext.navigateAway) {
      onQuestionComplete();
    }
  }, [behaviorContext.navigateAway, onQuestionComplete]);

  // Resolve phase rules
  useEffect(() => {
    const context = { dragStatus: dragEngine.progress.status, questionStatus: state.question.status };
    const resolved = resolvePhase(MY_DEFINITION.phaseRules, context, state.phase, "setup");
    if (state.phase !== resolved.nextPhase) {
      interactionSession.requestPhaseTransition(resolved.nextPhase, "my.phase_rules");
    }
  }, [dragEngine.progress.status, state.phase, state.question.status]);

  return ( /* render tree */ );
};
```

---

## WorldApi

Mutates entities and their placement in spaces. All methods return
`RuntimeApiResult`.

```typescript
type WorldApi = {
  createEntity(config: ItemDataConfig): RuntimeApiResult;
  updateEntity(entityId: string, updates: { name?: string; data?: Record<string, unknown>; visual?: Record<string, unknown> }): RuntimeApiResult;
  updateEntityState(entityId: string, state: Record<string, unknown>): RuntimeApiResult;
  deleteEntities(entityIds: string[]): RuntimeApiResult;
  addToSpace(entityId: string, spaceId: string, position?: GridPosition): RuntimeApiResult;
  removeFromSpace(entityId: string, spaceId: string): RuntimeApiResult;
  moveEntity(entityId: string, toSpaceId: string, position?: GridPosition): RuntimeApiResult;
  moveEntityToGrid(entityId: string, spaceId: string): RuntimeApiResult;
};
```

### Methods

**createEntity(config)** — Create a new entity at runtime. The entity is not
placed in any space; use addToSpace() after creation.

**updateEntity(entityId, updates)** — Update entity name, data, or visual
properties. Merges updates into existing values. Emits ENTITY_UPDATED event.

```typescript
world.updateEntity("router-1", {
  data: { dhcpEnabled: true, startIp: "192.168.1.10", endIp: "192.168.1.50" },
});
```

**updateEntityState(entityId, state)** — Update entity runtime state. Merges
into existing state. Emits ENTITY_UPDATED event.

```typescript
world.updateEntityState("pc-1", { ip: "192.168.1.10", status: "success" });
```

**deleteEntities(entityIds)** — Remove entities from state entirely.

**addToSpace(entityId, spaceId, position?)** — Add entity to a space. For grid
spaces, position is required. Pool/Path spaces ignore position. Emits
ENTITY_ENTERED_SPACE event.

**removeFromSpace(entityId, spaceId)** — Remove entity from a space. Emits
ENTITY_LEFT_SPACE event.

**moveEntity(entityId, toSpaceId, position?)** — Move entity from its current
space to a new space. Emits ENTITY_MOVED event.

PathSpace note:
- Moving into a path space emits `ENTITY_MOVED` (to path space).
- At path midpoint (`progress: 0.5`), PathSpace emits `ENTITY_UPDATED` with
  `updates.data.pathMidpointTick`.
- PathSpace engine removes entity when transit completes, which emits
  `ENTITY_LEFT_SPACE`.
- Behavior rules should listen to `ENTITY_LEFT_SPACE` with `space` filter set
  to the path space ID for post-path routing.

**moveEntityToGrid(entityId, spaceId)** — Move entity to the first available
cell in a grid space. Returns error if grid is full.

### RuntimeApiResult

```typescript
type RuntimeApiResult =
  | { ok: true }
  | { ok: false; error: { message: string } };
```

All WorldApi methods catch exceptions and return error results instead of
throwing. Check `result.ok` to detect failures.

---

## ProgressApi

Controls question completion status.

```typescript
type ProgressApi = {
  completeQuestion(): RuntimeApiResult;
  setQuestion(input: { id: string; status?: "in_progress" | "completed" }): RuntimeApiResult;
};
```

**completeQuestion()** — Marks the question as completed. Emits
COMPLETE_QUESTION action. After this, `state.question.status === "completed"`.

**setQuestion(input)** — Update question metadata. Rarely used directly.

### Usage in Behaviors

```typescript
{
  id: "my.terminal-success",
  on: terminalInput(),
  handler: ({ terminal, progress }) => {
    terminal.writeOutput("Success!");
    terminal.finishEngine();
    progress.completeQuestion();
  },
}
```

---

## InteractionSessionApi

Controls modals, phase transitions, and UI state.

```typescript
type InteractionSessionApi = {
  openModal(modal: ModalInstance): RuntimeApiResult;
  closeModal(modalId?: string): RuntimeApiResult;
  requestPhaseTransition(phase: string, source: string): RuntimeApiResult;
  setTerminalVisible(visible: boolean): RuntimeApiResult;
  setModalGateOpen(open: boolean): RuntimeApiResult;
};
```

**openModal(modal)** — Opens a data-driven modal. Emits MODAL_OPENED event.
See [types.md](./types.md) for ModalInstance schema.

```typescript
interaction.openModal({
  id: "success",
  title: "Congratulations!",
  content: [{ kind: "text", text: "You completed the question!" }],
  actions: [{ id: "primary", label: "Continue", variant: "primary" }],
  blocking: true,
});
```

**closeModal(modalId?)** — Closes modal visibility through reducer close path.
- If `modalId` is provided: closes that specific visible modal.
- If `modalId` is omitted: closes all visible modals.
- Each closed modal emits `MODAL_CLOSED`.

**requestPhaseTransition(phase, source)** — Request a phase change. The source
string is for debugging (e.g. `"dhcp.phase_rules"`). Emits PHASE_CHANGED event.
Validates that the transition is allowed (no same-phase transitions).

**setTerminalVisible(visible)** — Toggle terminal visibility. This is
React-local state (InteractionSessionState), not in GameState.

**setModalGateOpen(open)** — Toggle modal gate. React-local state.

---

## ExecutionFlowApi

Low-level phase orchestration. Most pages use InteractionSessionApi instead.

```typescript
type ExecutionFlowApi = {
  requestPhaseTransition(phase: string, source: string): RuntimeApiResult;
  dispatchIntent(intent: ExecutionFlowIntent): RuntimeApiResult;
};
```

**requestPhaseTransition** — Same as InteractionSessionApi.requestPhaseTransition
but without the wrapper. Use InteractionSessionApi in behaviors.

**dispatchIntent** — Low-level intent dispatch. Rarely used directly.

---

## InteractionSessionState

React-local ephemeral state returned by `useQuestionRuntime().interactionState`.

```typescript
type InteractionSessionState = {
  terminalVisible: boolean;
  modalGateOpen: boolean;
};
```

This state is NOT in GameState. It's managed via React useState and controlled
by InteractionSessionApi.setTerminalVisible/setModalGateOpen.

---

## Runtime Primitives

The runtime exposes several declarative primitives for building complex
question behaviors. All are importable from `@/components/game/runtime`.

### Drag-Gating Rules

Declarative rules that control when an entity is draggable from a space.
Evaluated by the drag system before allowing a drag operation.

```typescript
import type { DragGatingRule, DragGatingContext } from "@/components/game/runtime";
import { evaluateDragGating } from "@/components/game/runtime";
```

**Types:**

```typescript
type DragGatingRule = {
  spaceId: string;             // Space this rule applies to ("*" for all)
  entityType?: string;         // Entity type filter (undefined = all)
  canDrag: (ctx: DragGatingContext) => boolean;
};

type DragGatingContext = {
  readonly entityId: string;
  readonly entityType: string;
  readonly spaceId: string;
  readonly state: GameState;
};
```

**Functions:**

- `evaluateDragGating(rules, ctx)` — Returns `true` if drag is allowed,
  `false` if denied, `undefined` if no rule matches (falls back to
  `entity.draggable`).

**Usage in a definition:**

```typescript
const definition: QuestionDefinition = {
  // ...
  dragRules: [
    {
      spaceId: "board",
      entityType: "router",
      canDrag: ({ state }) => state.phase === "setup",
    },
    {
      spaceId: "*",
      canDrag: ({ state }) => state.question.status !== "completed",
    },
  ],
};
```

---

### PathSpace Checkpoints

Helpers for configuring entity behavior at PathSpace midpoints (pause/resume).

```typescript
import type { PathCheckpoint } from "@/components/game/runtime";
import { pathCheckpointData, pathResumeData, isMidpointTick } from "@/components/game/runtime";
```

**Types:**

```typescript
type PathCheckpoint = {
  at?: number;        // Progress point (0-1). Default: 0.5
  pause: boolean;     // Whether entity pauses at this checkpoint
  emitEvent?: string; // Optional event name to emit
};
```

**Functions:**

- `pathCheckpointData(checkpoint)` — Returns entity data flags
  (`{ pathPauseAtMidpoint, pathResumeToken }`) to attach when creating entities
  that travel through PathSpaces.
- `pathResumeData(currentToken)` — Returns data to bump the resume token,
  resuming a paused entity.
- `isMidpointTick(updates)` — Returns `true` if an entity update event
  represents a midpoint tick.

**Usage in a behavior handler:**

```typescript
{
  id: "my.packet-pause",
  on: whenEntityPlacedInSpace("egress-path"),
  handler: ({ entity, world }) => {
    if (!entity) return;
    // Pause entity at midpoint
    world.updateEntity(entity.id, {
      data: pathCheckpointData({ pause: true }),
    });
  },
}

{
  id: "my.packet-resume",
  on: entityClicked("packet"),
  handler: ({ entity, world }) => {
    if (!entity) return;
    world.updateEntity(entity.id, {
      data: pathResumeData(entity.data.pathResumeToken),
    });
  },
}
```

---

### Entity Templates & Spawn Plans

Factory utilities for stamping entities from reusable templates and executing
spawn plans that create + place entities in a single step.

```typescript
import type { EntityTemplate, SpawnPlan } from "@/components/game/runtime";
import { stampTemplate, stampBatch, executeSpawnPlan, executeSpawnPlans } from "@/components/game/runtime";
```

**Types:**

```typescript
type EntityTemplate = Omit<ItemDataConfig, "id"> & {
  idPrefix?: string;    // Optional ID prefix for generated entities
};

type SpawnPlan = {
  config: ItemDataConfig;
  spaceId?: string;
  position?: Record<string, unknown>;
};
```

**Functions:**

- `stampTemplate(template, id, overrides?)` — Produce a concrete
  `ItemDataConfig` from a template with a specific ID.
- `stampBatch(template, count, prefix?, perItemOverrides?)` — Stamp multiple
  entities with sequential IDs (`${prefix}-0`, `${prefix}-1`, …).
- `executeSpawnPlan(plan, world)` — Create an entity and optionally place it
  in a space.
- `executeSpawnPlans(plans, world)` — Execute multiple spawn plans.

**Usage in a behavior handler:**

```typescript
const PACKET_TEMPLATE: EntityTemplate = {
  name: "Packet",
  allowedPlaces: ["inventory", "egress-path"],
  icon: { icon: "mdi:email" },
  data: { type: "packet" },
};

{
  id: "my.spawn-packets",
  on: phaseChanged("playing"),
  handler: ({ world }) => {
    const plans = stampBatch(PACKET_TEMPLATE, 3, "pkt").map(config => ({
      config,
      spaceId: "inventory",
    }));
    executeSpawnPlans(plans, world);
  },
}
```

---

### Split/Join Operators

Decompose a parent entity into children and track their completion with
configurable join policies.

```typescript
import type { SplitDescriptor, JoinPolicy, JoinTracker } from "@/components/game/runtime";
import { createJoinTracker, markChildComplete, isJoinComplete, joinRemaining } from "@/components/game/runtime";
```

**Types:**

```typescript
type SplitDescriptor = {
  parentId: string;
  children: Array<{ id: string; data?: Record<string, unknown> }>;
};

type JoinPolicy = "all" | "any" | { count: number };

type JoinTracker = {
  parentId: string;
  childIds: string[];
  completedIds: string[];
  policy: JoinPolicy;
};
```

**Functions:**

- `createJoinTracker(parentId, childIds, policy?)` — Create a tracker.
  Default policy is `"all"`.
- `markChildComplete(tracker, childId)` — Returns a new tracker with the
  child marked complete (immutable).
- `isJoinComplete(tracker)` — Returns `true` when the join policy is satisfied.
- `joinRemaining(tracker)` — Number of children still needed.

**Usage in a behavior handler:**

```typescript
{
  id: "my.task-split",
  on: entityClicked("task"),
  handler: ({ entity, updateContext }) => {
    if (!entity) return;
    const tracker = createJoinTracker(entity.id, ["sub-a", "sub-b", "sub-c"], "all");
    updateContext(ctx => { ctx.joinTracker = tracker; });
  },
}

{
  id: "my.subtask-done",
  on: whenEntityArrivedAtSpace("done-zone"),
  handler: ({ entity, context, updateContext, progress }) => {
    if (!entity) return;
    const updated = markChildComplete(context.joinTracker, entity.id);
    updateContext(ctx => { ctx.joinTracker = updated; });
    if (isJoinComplete(updated)) {
      progress.completeQuestion();
    }
  },
}
```

---

### Status/Effect Rules & Timeline Actions

Declarative status badge resolution for entities, plus delayed timeline
actions for scheduling entity mutations.

```typescript
import type { StatusRule, StatusBadge, StatusRuleContext, TimelineAction } from "@/components/game/runtime";
import { evaluateStatusRules, delayedUpdate, delayedDelete, delayedMove } from "@/components/game/runtime";
```

**Types:**

```typescript
type StatusBadge = {
  status: "info" | "warning" | "success" | "error";
  message: string;
};

type StatusRule = {
  id: string;
  entityType?: string;
  match: (entity: StatusRuleContext) => boolean;
  badge: StatusBadge;
};

type TimelineAction = {
  key: string;
  delayMs: number;
  action: "updateEntity" | "deleteEntity" | "moveEntity" | "custom";
  entityId?: string;
  updates?: Record<string, unknown>;
  toSpaceId?: string;
};
```

**Functions:**

- `evaluateStatusRules(rules, ctx)` — First-match badge resolution. Returns
  `StatusBadge | undefined`.
- `delayedUpdate(key, entityId, delayMs, updates)` — Create a timeline action
  for a delayed entity update.
- `delayedDelete(key, entityId, delayMs)` — Create a timeline action for a
  delayed entity removal.
- `delayedMove(key, entityId, toSpaceId, delayMs)` — Create a timeline action
  for a delayed entity move.

**Usage in a behavior handler:**

```typescript
// Status rules in getEntityStatus callback
const STATUS_RULES: StatusRule[] = [
  {
    id: "configured",
    entityType: "router",
    match: (e) => !!e.data.dhcpEnabled,
    badge: { status: "success", message: "DHCP enabled" },
  },
  {
    id: "unconfigured",
    entityType: "router",
    match: () => true,
    badge: { status: "warning", message: "Not configured" },
  },
];

// Timeline action via schedule
{
  id: "my.delayed-cleanup",
  on: phaseChanged("completed"),
  handler: ({ schedule, world }) => {
    const action = delayedDelete("cleanup-temp", "temp-entity", 2000);
    schedule(action.key, action.delayMs, (sctx) => {
      sctx.world.deleteEntities([action.entityId!]);
    });
  },
}
```

---

### Workflow / State Machine

Declarative state machine for entity lifecycles with guarded transitions
and timed auto-transitions.

```typescript
import type { WorkflowDefinition, WorkflowState, WorkflowTransition, WorkflowInstance } from "@/components/game/runtime/behavior/workflow";
import { createWorkflow, transitionWorkflow, checkAutoTransition, validateWorkflow } from "@/components/game/runtime/behavior/workflow";
```

**Types:**

```typescript
type WorkflowState = {
  name: string;
  autoTransitionMs?: number;    // Auto-transition after this many ms
  autoTransitionTo?: string;    // Target state for auto-transition
};

type WorkflowTransition = {
  from: string;
  to: string;
  guard?: (ctx: WorkflowTransitionContext) => boolean;
};

type WorkflowDefinition = {
  initialState: string;
  states: WorkflowState[];
  transitions?: WorkflowTransition[];  // If empty, all transitions allowed
};

type WorkflowInstance = {
  currentState: string;
  enteredAt: number;
  history: string[];
};
```

**Functions:**

- `createWorkflow(definition, nowMs?)` — Create a new workflow instance.
- `transitionWorkflow(instance, definition, toState, ctx?, nowMs?)` — Attempt
  a transition. Returns same instance if invalid/guarded.
- `checkAutoTransition(instance, definition, nowMs?)` — Returns target state
  name if auto-transition is due, or `undefined`.
- `validateWorkflow(definition)` — Returns an array of error strings.

**Usage in a behavior handler:**

```typescript
const ENTITY_WORKFLOW: WorkflowDefinition = {
  initialState: "idle",
  states: [
    { name: "idle" },
    { name: "processing", autoTransitionMs: 3000, autoTransitionTo: "done" },
    { name: "done" },
  ],
  transitions: [
    { from: "idle", to: "processing" },
    { from: "processing", to: "done" },
  ],
};

{
  id: "my.start-processing",
  on: entityClicked("task"),
  handler: ({ entity, world, schedule }) => {
    if (!entity) return;
    const wf = createWorkflow(ENTITY_WORKFLOW);
    const next = transitionWorkflow(wf, ENTITY_WORKFLOW, "processing");
    world.updateEntityState(entity.id, { workflow: next });

    // Check for auto-transition
    schedule("wf-auto", next.currentState === "processing" ? 3000 : 0, (sctx) => {
      const target = checkAutoTransition(next, ENTITY_WORKFLOW);
      if (target) {
        const final = transitionWorkflow(next, ENTITY_WORKFLOW, target);
        sctx.world.updateEntityState(entity.id, { workflow: final });
      }
    });
  },
}
```

---

### Resource Locks

Exclusive and shared lock primitives for managing resource contention
between entities or tasks.

```typescript
import type { ResourceLockState, LockRequest, LockMode } from "@/components/game/runtime";
import { createResourceLock, tryAcquire, releaseLock, isLocked, isHeldBy, waitQueueSize } from "@/components/game/runtime";
```

**Types:**

```typescript
type LockMode = "exclusive" | "shared";

type LockRequest = {
  resourceId: string;
  requesterId: string;
  mode: LockMode;
};

type ResourceLockState = {
  resourceId: string;
  holders: string[];
  mode: LockMode | null;
  waitQueue: LockRequest[];
};
```

**Functions:**

- `createResourceLock(resourceId)` — Create initial lock state.
- `tryAcquire(lock, request)` — Returns `{ lock, acquired }`. If contention,
  requester is queued.
- `releaseLock(lock, requesterId)` — Returns `{ lock, promoted }`. Promotes
  next waiter if any.
- `isLocked(lock)` — Check if resource is currently held.
- `isHeldBy(lock, requesterId)` — Check if a specific requester holds it.
- `waitQueueSize(lock)` — Number of waiters in queue.

**Usage in a behavior handler:**

```typescript
{
  id: "my.acquire-bus",
  on: whenEntityArrivedAtSpace("bus-stop"),
  handler: ({ entity, context, updateContext }) => {
    if (!entity) return;
    const { lock, acquired } = tryAcquire(context.busLock, {
      resourceId: "bus",
      requesterId: entity.id,
      mode: "exclusive",
    });
    updateContext(ctx => { ctx.busLock = lock; });
    if (!acquired) {
      // Entity must wait
    }
  },
}

{
  id: "my.release-bus",
  on: whenEntityArrivedAtSpace("bus-exit"),
  handler: ({ entity, context, updateContext }) => {
    if (!entity) return;
    const { lock, promoted } = releaseLock(context.busLock, entity.id);
    updateContext(ctx => { ctx.busLock = lock; });
    // promoted is the next requester ID, if any
  },
}
```

---

### Lane Scheduler

Deterministic lane selection for multi-lane queue/processing flows.

```typescript
import type { LaneSchedulerInput, LaneSelectionPolicy, LaneSelectionResult } from "@/components/game/runtime";
import { pickLane, hasFreeLane } from "@/components/game/runtime";
```

**Types:**

```typescript
type LaneSelectionPolicy = "first_free" | "round_robin";

type LaneSchedulerInput<TLaneId extends string> = {
  lanes: TLaneId[];
  enabledLanes?: TLaneId[];
  policy: LaneSelectionPolicy;
  cursor?: number;
  isOccupied: (laneId: TLaneId) => boolean;
};

type LaneSelectionResult<TLaneId extends string> = {
  laneId: TLaneId | null;
  cursor: number;
};
```

**Functions:**

- `pickLane(input)` — Select the next available lane based on policy. Returns
  `{ laneId, cursor }`. `laneId` is `null` if all lanes are occupied.
- `hasFreeLane(input)` — Check if any enabled lane is available.

**Usage in a behavior handler:**

```typescript
{
  id: "my.dispatch-to-lane",
  on: whenEntityArrivedAtSpace("dispatch"),
  handler: ({ entity, context, updateContext, world }) => {
    if (!entity) return;
    const result = pickLane({
      lanes: ["lane-a", "lane-b"],
      policy: "round_robin",
      cursor: context.laneCursor,
      isOccupied: (id) => !!context.laneOccupied[id],
    });
    if (result.laneId) {
      world.moveEntity(entity.id, result.laneId);
      updateContext(ctx => {
        ctx.laneCursor = result.cursor;
        ctx.laneOccupied[result.laneId!] = true;
      });
    }
  },
}
```

---

### Layout & Shape Rules

Declarative rules for conditional space/section visibility and dynamic
space configuration changes based on runtime state.

```typescript
import type { LayoutVisibilityRule, SpaceShapeRule, LayoutRuleContext, SpaceShapeOverrides } from "@/components/game/runtime";
import { evaluateVisibility, evaluateShapeRules } from "@/components/game/runtime";
```

**Types:**

```typescript
type LayoutVisibilityRule = {
  targetId: string;
  visible: (ctx: LayoutRuleContext) => boolean;
};

type SpaceShapeRule = {
  spaceId: string;
  compute: (ctx: LayoutRuleContext) => SpaceShapeOverrides | undefined;
};

type LayoutRuleContext = {
  readonly state: GameState;
  readonly phase: string;
};

type SpaceShapeOverrides = {
  rows?: number;
  cols?: number;
  maxCapacity?: number;
  speedMultiplier?: number;
  title?: string;
};
```

**Functions:**

- `evaluateVisibility(rules, ctx)` — Returns `Record<string, boolean>` mapping
  target IDs to visibility.
- `evaluateShapeRules(rules, ctx)` — Returns `Record<string, SpaceShapeOverrides>`
  mapping space IDs to overrides.

**Usage in a definition:**

```typescript
const definition: QuestionDefinition = {
  // ...
  layoutRules: [
    {
      targetId: "terminal-panel",
      visible: ({ phase }) => phase === "terminal" || phase === "completed",
    },
  ],
  shapeRules: [
    {
      spaceId: "processing-grid",
      compute: ({ state }) => {
        const entityCount = Object.keys(state.entities).length;
        return entityCount > 4 ? { rows: 2, cols: 3 } : undefined;
      },
    },
  ],
};
```

---

### Behavior Inspector

Development-only debug logging for the behavior system. Provides structured
traces of rule matching, guard evaluation, and handler execution.

```typescript
import type { BehaviorInspector, InspectorLogEntry } from "@/components/game/runtime";
import { createBehaviorInspector, createConsoleInspector, NOOP_INSPECTOR } from "@/components/game/runtime";
```

**Types:**

```typescript
type InspectorLogEntry = {
  timestamp: number;
  eventType: string;
  eventId: number;
  ruleId: string;
  action: "matched" | "guard-passed" | "guard-failed" | "handler-executed" | "handler-error";
  entityId?: string;
  spaceId?: string;
  detail?: string;
};

type BehaviorInspector = {
  log: (entry: InspectorLogEntry) => void;
  getEntries: () => readonly InspectorLogEntry[];
  clear: () => void;
  subscribe: (listener: (entry: InspectorLogEntry) => void) => () => void;
};
```

**Functions:**

- `createBehaviorInspector(maxEntries?)` — In-memory inspector with FIFO
  eviction (default 200 entries).
- `createConsoleInspector(maxEntries?)` — Wraps the in-memory inspector and
  also logs to `console.debug` / `console.warn` with formatted output.
- `NOOP_INSPECTOR` — No-op inspector for production (all methods are no-ops).

**Usage:**

```typescript
// Development: enable console tracing
const inspector = import.meta.env.DEV
  ? createConsoleInspector()
  : NOOP_INSPECTOR;

// Subscribe to entries programmatically
const unsub = inspector.subscribe((entry) => {
  if (entry.action === "handler-error") {
    console.error("Behavior error:", entry);
  }
});

// Read all entries
const entries = inspector.getEntries();
```
