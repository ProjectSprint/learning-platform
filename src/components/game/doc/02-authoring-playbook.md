# Question Authoring Playbook (Task-First)

Use this file when your goal is "I need to build or change a question", not
"I need every API detail".

Canonical contracts (method-level side effects, return behavior, and
guardrails) remain in `06-runtime-api.md`.

## Start Here

If you are creating a new question, follow this sequence:

1. Read the mental model in this file.
2. Pick your authoring options (space kinds + interaction style).
3. Build the scaffold in `03-building-questions.md`.
4. Define `QuestionDefinition` in `04-question-definition.md`.
5. Implement rules in `05-behavior-system.md`.
6. Validate side effects and lifecycle checks in this file.
7. Use `06-runtime-api.md` only for exact contract details.

## 1) Mental Model

The game engine has one intended ownership model:

1. `QuestionDefinition` declares spaces, entities, rules, and behaviors.
2. Runtime bootstraps state once from that definition.
3. UI components render from current state.
4. User actions emit events.
5. Behavior rules match events and execute effects.
6. Effects mutate state via runtime wrappers (`world`, `interaction`,
   `progress`, `flow`).

If gameplay logic lives outside that loop (for example, in page-level custom
event loops), docs and behavior drift quickly.

## 2) Principles

1. Declarative first: define data shape and rule shape before writing effects.
2. Behavior first: gameplay decisions belong in behavior rules, not page effects.
3. Wrapper first: mutate via runtime APIs, not raw reducer dispatches.
4. Single owner: one gameplay rule owner per behavior, avoid dual pathways.
5. Traceable effects: prefer scheduler/context helpers over ad-hoc timers.

## 3) Authoring Options (What You Can Choose)

### Space Options

| Need | Space Kind | Notes |
|------|------------|-------|
| Fixed board positions | `grid` | Supports row/col positions and drag-drop placement |
| Inventory collection | `pool` | Good for toolboxes, item banks, reserves |
| Animated transit lane | `path` | Supports pause/resume data keys on entities |
| Custom widget target | `custom` | No built-in entity management; render custom UI |
| FIFO queue model | `queue` | Data primitive; render via custom/question UI |
| Numeric gauge | `meter` | Data primitive; render via custom/question UI |

References:
- Space config fields: `04-question-definition.md`
- Render components: `07-components.md`
- State types: `08-types.md`

### Interaction Options

| Need | Primary Trigger/API |
|------|----------------------|
| Click entity | `entityClicked(...)` |
| Move/place entity | `whenEntityPlacedInSpace(...)`, `whenEntityTransferredToSpace(...)` |
| Modal workflow | `modalSubmitted(...)`, `modalClosed(...)` |
| Terminal commands | `terminalInput(...)` |
| Phase orchestration | `phaseChanged(...)`, `interaction.requestPhaseTransition(...)` |

References:
- Trigger and guard modeling: `05-behavior-system.md`
- Contract details and side effects: `06-runtime-api.md`

### State Placement Options

| State Type | Store In | Why |
|------------|----------|-----|
| Entity/space canonical gameplay state | `GameState` via `world.*` | Serializable, reducer-owned source of truth |
| Cross-rule ephemeral workflow flags | Behavior `context` | Question-local transient intent/state |
| Purely visual component local state | React component state | UI-only, not gameplay authority |
| Terminal UI history/visibility | Terminal provider store | Not part of `GameState` |

## 4) Build a New Question (Minimum Scaffold)

Use `03-building-questions.md` as the full procedural guide. Minimum files:

```
src/routes/questions/<category>/<question>/
  index.tsx
  -page.tsx
  -utils/constants.ts
  -utils/definition.ts
  -utils/behaviors.ts
  -utils/modal-builders.ts
```

Minimum successful path:

1. Define IDs/constants and inventory in `constants.ts`.
2. Define `QuestionDefinition` with `meta`, `initialPhase`, `spaces`,
   `entities`, `phaseRules`, `behaviors`.
3. Add at least one behavior rule with trigger + handler.
4. In `-page.tsx`, call `useQuestionRuntime(...)` once.
5. Render spaces/components from engine layer under `GameBoard`.
6. Keep page effects orchestration-only (navigation, drawer registration, etc.).

## 5) Interaction and Behavior Setup

When implementing interactions, apply this rule order:

1. Choose the event trigger (`on`).
2. Add a guard for phase/state gating.
3. Execute mutation through runtime wrappers.
4. Update behavior context only for cross-rule state.
5. Use scheduler helpers for delayed effects (`schedule`, `cancelSchedule`).

Minimal handler shape:

```typescript
const rules: BehaviorRule<MyContext>[] = [
  {
    id: "example.config-save",
    on: modalSubmitted(undefined, "save"),
    guard: ({ phase }) => phase === "setup",
    handler: ({ event, world, updateContext }) => {
      if (event.type !== "MODAL_SUBMITTED") return;
      world.updateEntity("router-1", { data: { configured: true } });
      updateContext((ctx) => { ctx.readyForTerminal = true; });
    },
  },
];
```

## 6) Side Effects and Lifecycle Checks

Use this checklist to avoid hidden behavior:

1. Bootstrap timing: first render can happen before spaces/entities exist.
2. Rule selection: first matching behavior rule wins for an event.
3. Event processing: reactor is async; handlers read latest state at execution.
4. Terminal scope: terminal UI state is provider-local, not `GameState`.
5. Scheduling: use runtime scheduler keys; do not use raw gameplay `setTimeout`.
6. Completion flow: `progress.completeQuestion()` should be rule-owned.

If any of these are unclear for a method, open `06-runtime-api.md` and check the
method-level side effect section.

## 7) Examples to Follow

Use route examples based on what you are building:

| Use Case | Route Reference |
|----------|-----------------|
| Drag + modal + terminal verification | `src/routes/questions/networking/dhcp/` |
| Complex multi-entity routing | `src/routes/questions/networking/internet/` |
| Certificate and command-heavy flow | `src/routes/questions/networking/webserver-ssl/` |
| Transport sequencing and packet flow | `src/routes/questions/networking/tcp/`, `src/routes/questions/networking/udp/` |

## 8) Troubleshooting

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| Space component renders empty | Space not bootstrapped yet or ID mismatch | `QuestionDefinition.spaces`, component `config.id`, readiness guard in page |
| Entity cannot be dropped | `allowedPlaces` or capacity/placement guard fails | Entity config, target space config, placement guards |
| Click does nothing | Trigger mismatch or guard false | `entityClicked(...)` parameters, guard phase/state conditions |
| Modal submit rule not firing | `modalId` or action mismatch | `modalSubmitted(modalId, actionId)` vs actual modal/action IDs |
| Phase never advances | No explicit phase request in rule flow | `interaction.requestPhaseTransition(...)` / `setPhase(...)` logic |
| Question never completes | Completion only in page effect or unreachable rule | Rule ordering, guard conditions, `progress.completeQuestion()` call site |
| Duplicate delayed outcomes | Non-keyed timers or repeated scheduling | `schedule(key, ...)` usage and `cancelSchedule(...)` |

## 9) API Map by Intent

Use this quick map when you need a specific API fast:

- "I need shape/config fields": `04-question-definition.md`
- "I need triggers/guards/handlers": `05-behavior-system.md`
- "I need exact method contract + side effects": `06-runtime-api.md`
- "I need component props/limitations": `07-components.md`
- "I need state/event/modal type details": `08-types.md`
- "I need architecture boundary rules": `09-adr-adt-read-transformer-effect.md`
