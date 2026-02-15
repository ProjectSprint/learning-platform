# Capability Lookup (When You Hit a Limitation)

Use this file when you are in the middle of implementation and ask:

- "Can the engine do this?"
- "Which API should I use?"
- "Where is the right type or component?"

Then jump to the linked deep reference.

## Capability Map by Intent

| I want to... | Primary API/Concept | Check Types In | Deep Reference |
|--------------|---------------------|----------------|----------------|
| Create spaces and entities | `QuestionDefinition.spaces`, `QuestionDefinition.entities` | `SpaceDefinition`, `EntityDefinition` | `04-question-definition-options.md` |
| React when an entity is clicked | `entityClicked(...)` trigger | `GameEvent`, `EntityData` | `05-interactions-and-behaviors.md` |
| React to placement or movement | `whenEntityPlacedInSpace(...)`, `whenEntityTransferredToSpace(...)` | Space/event types | `05-interactions-and-behaviors.md` |
| Handle modal submit flows | `modalSubmitted(...)`, `modalClosed(...)` | `ModalInstance`, `ModalSubmittedEvent` | `05-interactions-and-behaviors.md` |
| Handle terminal command flows | `terminalInput(...)`, `terminal.writeOutput(...)` | `TerminalInputEvent` | `05-interactions-and-behaviors.md` |
| Change phase from behavior | `interaction.requestPhaseTransition(...)` or `setPhase(...)` | phase fields in `GameState` | `07-runtime-api-reference.md` |
| Complete question from behavior | `progress.completeQuestion()` | `QuestionStatus` | `07-runtime-api-reference.md` |
| Update entity config/state | `world.updateEntity(...)`, `world.updateEntityState(...)` | `EntityData` | `07-runtime-api-reference.md` |
| Move entities between spaces | `world.addToSpace(...)`, `world.moveEntity(...)`, `world.removeFromSpace(...)` | `SpaceData`, placement constraints | `07-runtime-api-reference.md` |
| Schedule delayed behavior safely | `schedule(key, ...)`, `cancelSchedule(key)` | behavior context shape | `05-interactions-and-behaviors.md` |
| Render board/inventory/transit | `GameBoard`, `GridSpace`, `PoolSpace`, `PathSpace` | component props | `08-component-reference.md` |
| Render custom widgets or queue/meter UIs | `CustomSpace` + custom UI | `QueueSpaceData`, `MeterSpaceData` | `08-component-reference.md`, `09-types-reference.md` |

## Decision Helpers

### Need to store something: where should it live?

| If it is... | Put it in... |
|-------------|--------------|
| Core gameplay truth | `GameState` via `world.*` |
| Cross-rule transient workflow flag | behavior `context` |
| Pure visual-only UI detail | local component state |
| Terminal history/prompt visibility | terminal provider state |

### Need delayed effects: what should I use?

- Use runtime `schedule` with stable keys.
- Use `cancelSchedule` when flow invalidates pending work.
- Avoid ad-hoc gameplay `setTimeout` in page components.

## Symptom -> Likely Cause -> Where To Check

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| Space renders empty | Space not in bootstrap or ID mismatch | `04-question-definition-options.md` |
| Rule never fires | Trigger mismatch or guard false | `05-interactions-and-behaviors.md` |
| Modal submit ignored | Wrong modal/action ID pair | `05-interactions-and-behaviors.md` |
| Entity cannot drop | `allowedPlaces`, capacity, or placement guard | `04-question-definition-options.md`, `07-runtime-api-reference.md` |
| Phase never changes | No explicit phase request in active rule path | `05-interactions-and-behaviors.md`, `07-runtime-api-reference.md` |
| Duplicate delayed outcomes | repeated scheduling without key discipline | `05-interactions-and-behaviors.md` |
| Completion never happens | completion handled in wrong layer or unreachable rule | `02-principles-and-mental-model.md`, `05-interactions-and-behaviors.md` |

## Final Verification Before Commit

1. Re-check method contracts in `07-runtime-api-reference.md`.
2. Re-check involved shapes in `09-types-reference.md`.
3. Confirm page-level code does not own gameplay branching.
