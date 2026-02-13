# BehaviorSystem — Event-Driven Interaction Handling

The behavior system provides declarative, event-driven handling of user
interactions. Instead of writing useEffect loops over events, question authors
define BehaviorRules that pattern-match on game events and execute handlers.

```typescript
import type {
  BehaviorDefinition,
  BehaviorRule,
  EffectContext,
  GuardContext,
  EventTrigger,
  ScheduledEffectContext,
} from "@/components/game/runtime";
import { entityArrived, entityClicked, modalSubmitted, terminalInput, entityEnteredSpace, entityMoved, modalClosed, phaseChanged } from "@/components/game/runtime";
```

## BehaviorDefinition

The top-level behavior configuration, attached to `QuestionDefinition.behaviors`.

```typescript
type BehaviorDefinition<TContext> = {
  initialContext: TContext;           // Initial value for question-level context
  rules: BehaviorRule<TContext>[];   // Ordered list of rules (first match wins)
};
```

**TContext** is a question-specific state object for tracking cross-rule state
that doesn't belong in GameState. Common fields:

- `navigateAway: boolean` — Signal for the page to call onQuestionComplete()
- `lastConfiguredDeviceId: string | null` — Track which device was last configured

## BehaviorRule

A single rule: when trigger matches and guard passes, run handler.

```typescript
type BehaviorRule<TContext> = {
  id: string;                                                    // Unique ID for debugging
  on: EventTrigger;                                              // Declarative event pattern
  guard?: (ctx: GuardContext<TContext>) => boolean;               // Optional filter (return true to allow)
  handler: (ctx: EffectContext<TContext>) => void | Promise<void>; // Effect to execute
};
```

**Rule evaluation:** For each event, rules are checked in order. The first rule
whose `on` trigger matches AND whose `guard` returns true (or is absent) wins.
Only one rule executes per event. Remaining rules are skipped.

## EventTrigger

Declarative pattern matchers. Each optional field narrows the match — omitted
fields match anything.

### Trigger Factory Functions

| Function | Matches Event | Parameters |
|----------|--------------|------------|
| `entityClicked(entityType?, space?)` | `ENTITY_CLICKED` | Filter by entity type and/or space ID |
| `entityEnteredSpace(space?, entityType?)` | `ENTITY_ENTERED_SPACE` | Filter by target space and/or entity type |
| `entityMoved(toSpace?, entityType?)` | `ENTITY_MOVED` | Filter by destination space and/or entity type |
| `entityArrived(space?, entityType?)` | `ENTITY_ENTERED_SPACE` or `ENTITY_MOVED` | Unified arrival trigger for either source event |
| `modalSubmitted(modalId?, modalActionId?)` | `MODAL_SUBMITTED` | Filter by modal ID and/or action button ID |
| `modalClosed(modalId?)` | `MODAL_CLOSED` | Filter by modal ID |
| `terminalInput(match?)` | `TERMINAL_INPUT` | Filter by exact string or RegExp |
| `phaseChanged(to?, from?)` | `PHASE_CHANGED` | Filter by target and/or source phase |

### Examples

```typescript
// Match any entity click
entityClicked()

// Match only router clicks
entityClicked("router")

// Match router clicks in the "board" space
entityClicked("router", "board")

// Match any modal with "save" button
modalSubmitted(undefined, "save")

// Match specific modal
modalSubmitted("router-config-abc")

// Match any terminal input
terminalInput()

// Match terminal input matching a regex
terminalInput(/^ping\s+/)

// Match transition to "terminal" phase
phaseChanged("terminal")
```

### Lane Scheduler Helpers

For lane-based flows (single-core/dual-core queues), runtime exposes pure
helpers:

```typescript
import { pickLane, hasFreeLane } from "@/components/game/runtime";
```

- `pickLane(...)` supports `first_free` and `round_robin` policies.
- `hasFreeLane(...)` checks if any enabled lane is currently available.

These helpers keep lane selection deterministic and avoid route-specific
selection logic drift.

### Raw EventTrigger Type

For cases where factory functions don't suffice:

```typescript
type EventTrigger =
  | { event: "ENTITY_ENTERED_SPACE"; space?: string; entityType?: string }
  | { event: "ENTITY_MOVED"; toSpace?: string; entityType?: string }
  | { event: "ENTITY_ARRIVED"; space?: string; entityType?: string }
  | { event: "ENTITY_LEFT_SPACE"; space?: string; entityType?: string }
  | { event: "ENTITY_CLICKED"; entityType?: string; space?: string }
  | { event: "ENTITY_UPDATED"; entityType?: string }
  | { event: "MODAL_OPENED"; modalId?: string }
  | { event: "MODAL_CLOSED"; modalId?: string }
  | { event: "MODAL_SUBMITTED"; modalId?: string; modalActionId?: string }
  | { event: "TERMINAL_INPUT"; match?: string | RegExp }
  | { event: "PHASE_CHANGED"; from?: string; to?: string }
  | { event: "ENGINE_STARTED" }
  | { event: "ENGINE_FINISHED" };
```

## GuardContext (Read-Only)

Passed to `guard` functions. All fields are readonly.

```typescript
type GuardContext<TContext> = {
  readonly event: GameEvent;                // The current event being processed
  readonly entity: EntityData | undefined;  // Resolved entity (if event has entityId)
  readonly state: GameState;                // Current game state snapshot
  readonly phase: string;                   // Current phase (shortcut for state.phase)
  readonly context: Readonly<TContext>;      // Current behavior context (read-only)
};
```

### Common Guard Patterns

```typescript
// Only run during terminal phase
guard: ({ phase }) => phase === "terminal",

// Only run when question is not completed
guard: ({ state }) => state.question.status !== "completed",

// Only match specific modal prefix
guard: ({ event }) =>
  event.type === "MODAL_SUBMITTED" && event.modalId.startsWith("router-config-"),

// Combine phase and entity conditions
guard: ({ phase, entity }) =>
  phase === "playing" && entity?.type === "router",
```

## EffectContext (Mutable)

Passed to `handler` functions. Provides full read/write access.

```typescript
type EffectContext<TContext> = {
  // ── Read-only event info ──
  readonly event: GameEvent;                // Current event
  readonly entity: EntityData | undefined;  // Resolved entity

  // ── Read-only state ──
  readonly state: GameState;                // Current game state
  readonly phase: string;                   // Current phase

  // ── Mutable behavior context ──
  context: TContext;
  updateContext: (updater: (ctx: TContext) => void) => void;

  // ── Runtime APIs ──
  world: WorldApi;                          // Entity/space mutations
  interaction: InteractionSessionApi;       // Modal/phase/terminal
  flow: ExecutionFlowApi;                   // Phase orchestration
  progress: ProgressApi;                    // Question completion

  // ── Effect helpers ──
  delay: (ms: number) => Promise<void>;     // Async delay
  once: (key: string, fn: () => void) => void;  // Execute fn only once per key
  schedule: (
    key: string,
    ms: number,
    fn: (ctx: ScheduledEffectContext<TContext>) => void | Promise<void>,
  ) => void;
  cancelSchedule: (key: string) => void;

  // ── Terminal helpers ──
  terminal: {
    writeOutput: (content: string, type?: "output" | "error") => void;
    clearHistory: () => void;
    finishEngine: () => void;   // Disables further terminal input
  };

  // ── Convenience shortcuts ──
  setPhase: (phase: string, source?: string) => void;
  moveToInventory: (entityId: string) => void;
  moveToGrid: (entityId: string, spaceId: string) => boolean;
};
```

### ScheduledEffectContext

Callbacks executed through `schedule(...)` receive a scheduled context.
It matches `EffectContext` but omits event/entity because it is timer-driven.

```typescript
type ScheduledEffectContext<TContext> = Omit<
  EffectContext<TContext>,
  "event" | "entity"
> & {
  readonly state: GameState;
  readonly phase: string;
};
```

### Key EffectContext Members

**world** — Mutate entities and spaces. See [runtime-api.md](./runtime-api.md).
```typescript
world.updateEntity(entityId, { data: { dhcpEnabled: true } });
world.updateEntityState(entityId, { ip: "192.168.1.10", status: "success" });
```

**interaction** — Open/close modals and request phase transitions.
```typescript
interaction.openModal(buildSuccessModal());
interaction.closeModal("config-123");
interaction.requestPhaseTransition("terminal", "my-rule");
```

**progress** — Mark question as completed.
```typescript
progress.completeQuestion();
```

**terminal** — Write output and control the terminal engine.
```typescript
terminal.writeOutput("Reply from 192.168.1.10: bytes=32 time<1ms TTL=64");
terminal.writeOutput("Error: Unknown command", "error");
terminal.finishEngine();  // Disables input, signals engine lifecycle
```

**updateContext** — Mutate the behavior context (Immer-style).
```typescript
updateContext(ctx => {
  ctx.navigateAway = true;
});
updateContext(ctx => {
  ctx.lastConfiguredDeviceId = deviceId;
});
```

**delay** — Async delay for handler. Makes handler async.
```typescript
handler: async ({ terminal, delay }) => {
  terminal.writeOutput("Processing...");
  await delay(1000);
  terminal.writeOutput("Done!");
}
```

**once** — Execute a function only once per unique key. Useful for
one-time setup effects.
```typescript
once("initial-help", () => {
  terminal.writeOutput("Type 'help' for available commands.");
});
```

**schedule / cancelSchedule** — Keyed timer orchestration owned by runtime.
Scheduling with the same key replaces prior timer. Use this for deterministic
deferred actions without manual `setTimeout` lifecycle handling.
```typescript
schedule("udp:send:frame-1", 1500, (sctx) => {
  sctx.world.removeFromSpace("frame-1", "internet");
});

cancelSchedule("udp:send:frame-1");
```

**setPhase** — Shortcut for `interaction.requestPhaseTransition(phase, source)`.
```typescript
setPhase("terminal");
setPhase("completed", "my-rule");
```

## Side Effects

The behavior reactor (`useBehaviorReactor`) has these side effects:

1. **Event processing** — On each render where `events.length > 0`, the reactor
   iterates all events, matches rules, and executes handlers asynchronously.
2. **Event acknowledgment** — After all events are processed, `ack()` is called
   to advance the engine cursor. This prevents double-processing.
3. **Context mutation** — `updateContext()` mutates the context ref directly
   (not via React state). Context changes are visible immediately to subsequent
   rules in the same batch but do NOT trigger re-renders.
4. **Processing guard** — A `processingRef` prevents concurrent processing if
   a new render occurs while handlers are still executing.

## Behavior-Driven Flow (Recommended Architecture)

Use this execution model as your default:

1. UI emits a domain event (`ENTITY_MOVED`, `MODAL_SUBMITTED`, `TERMINAL_INPUT`).
2. Reactor scans rules top-to-bottom.
3. First matching trigger + passing guard executes.
4. Handler mutates through runtime APIs (`world`, `interaction`, `progress`).
5. Runtime emits resulting events and updates state.
6. Reactor calls `ack()` after the batch finishes.

Why this matters:
- Rule ordering is part of behavior design, not an implementation detail.
- "First match wins" means broad fallback rules should be placed last.
- Mutations in page-level `useEffect` and behavior handlers can conflict; keep
  rule decisions in behaviors whenever possible.

### Page vs Behavior Responsibilities

Prefer this split:

- **Page (`-page.tsx`)**
  - Render UI
  - Register drawers/arrows
  - Show/hide terminal
  - Resolve declarative phase rules
  - React to behavior context flags (for example, navigate on completion)
- **Behavior rules**
  - Validate moves/commands
  - Open/close modals
  - Update entity/space state
  - Progress/transition decisions tied to gameplay events

Imperative hooks are still valid for orchestration, but avoid giving them
independent gameplay rule branches that duplicate behavior handlers.

## Complete Example

```typescript
import type { TerminalInputEvent } from "@/components/game/application/state/types/events";
import type { BehaviorDefinition, BehaviorRule } from "@/components/game/runtime";
import { entityClicked, modalSubmitted, terminalInput } from "@/components/game/runtime";

type MyBehaviorContext = {
  navigateAway: boolean;
};

const rules: BehaviorRule<MyBehaviorContext>[] = [
  // 1. Handle entity clicks → open config modal
  {
    id: "my.router-click",
    on: entityClicked("router"),
    handler: ({ entity, interaction }) => {
      if (!entity) return;
      interaction.openModal({
        id: `config-${entity.id}`,
        title: "Router Configuration",
        content: [
          { kind: "field", field: { id: "dhcpEnabled", kind: "checkbox", label: "Enable DHCP" } },
          { kind: "field", field: { id: "startIp", kind: "text", label: "Start IP", placeholder: "192.168.1.10" } },
        ],
        actions: [
          { id: "save", label: "Save", variant: "primary", validate: true },
          { id: "cancel", label: "Cancel", closesModal: true },
        ],
      });
    },
  },

  // 2. Handle modal save → update entity data
  {
    id: "my.config-save",
    on: modalSubmitted(undefined, "save"),
    guard: ({ event }) =>
      event.type === "MODAL_SUBMITTED" && event.modalId.startsWith("config-"),
    handler: ({ event, world }) => {
      if (event.type !== "MODAL_SUBMITTED") return;
      const entityId = event.modalId.replace("config-", "");
      world.updateEntity(entityId, {
        data: {
          dhcpEnabled: !!event.values.dhcpEnabled,
          startIp: String(event.values.startIp ?? ""),
        },
      });
    },
  },

  // 3. Handle terminal commands
  {
    id: "my.terminal-command",
    on: terminalInput(),
    guard: ({ phase }) => phase === "terminal",
    handler: ({ event, state, terminal, interaction, progress }) => {
      const input = (event as TerminalInputEvent).input.trim().toLowerCase();
      if (input === "help") {
        terminal.writeOutput("Commands: ping <ip>, help");
        return;
      }
      if (input.startsWith("ping ")) {
        const target = input.split(" ")[1];
        // Validate against entity state...
        terminal.writeOutput(`Reply from ${target}: bytes=32 time<1ms TTL=64`);
        interaction.openModal(buildSuccessModal());
        terminal.finishEngine();
        progress.completeQuestion();
        return;
      }
      terminal.writeOutput("Unknown command. Type 'help'.", "error");
    },
  },

  // 4. Handle success modal → navigate away
  {
    id: "my.success-navigate",
    on: modalSubmitted("success", "primary"),
    handler: ({ updateContext }) => {
      updateContext(ctx => {
        ctx.navigateAway = true;
      });
    },
  },
];

export const MY_BEHAVIORS: BehaviorDefinition<MyBehaviorContext> = {
  initialContext: { navigateAway: false },
  rules,
};
```

## Limitations

- **First match wins.** Only one rule executes per event. If you need multiple
  handlers for the same event, combine logic in a single handler.
- **No event re-emission.** Handlers cannot emit new events that trigger other
  rules in the same batch. State changes made via world/interaction APIs will
  emit events consumed in the NEXT batch.
- **Context is ref-based.** Changes via `updateContext()` do not trigger React
  re-renders. The page sees updated context on the next render caused by other
  state changes.
- **Async handlers block subsequent events.** If a handler uses `delay()`, the
  next event in the batch waits until the delay completes.
- **Guard type narrowing.** Guards receive `GameEvent` union type. You must
  narrow the type manually (e.g. `event.type === "MODAL_SUBMITTED"`) to access
  event-specific fields.
