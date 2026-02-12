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
   ENTITY_ADDED (per entity). Guarded by ref, runs exactly once.

2. **Validation (every render)** — Validates the definition and throws if
   invalid. This is intentional: invalid definitions should fail fast.

3. **Behavior reactor (every render with events)** — When `events.length > 0`,
   processes events through behavior rules asynchronously, then calls `ack()`.

4. **Terminal bridge** — Creates a stable ref-based bridge to terminal store
   functions (writeOutput, clearHistory) so behavior handlers can access
   terminal without stale closures.

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
spaces, position is required. Emits ENTITY_ENTERED_SPACE event.

**removeFromSpace(entityId, spaceId)** — Remove entity from a space. Emits
ENTITY_LEFT_SPACE event.

**moveEntity(entityId, toSpaceId, position?)** — Move entity from its current
space to a new space. Emits ENTITY_MOVED event.

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

**closeModal(modalId?)** — Closes a modal. If modalId is omitted, closes the
top modal. Emits MODAL_CLOSED event.

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
