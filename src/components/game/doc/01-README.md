# Game Question Docs (Author Workflow)

This docs set is organized for the real author loop:

1. Understand the model.
2. Copy a working question.
3. Adapt it to your needs.
4. Hit a limitation.
5. Look up capabilities/API/types.
6. Apply changes and repeat.

If you only read one file first, read this one.

## The Loop

Use this every time you build or modify a question:

1. Orientation: `02-principles-and-mental-model.md`
2. Copy baseline: `03-build-a-question-by-copying.md`
3. Adapt structure/options: `04-question-definition-options.md`
4. Add interactions: `05-interactions-and-behaviors.md`
5. If blocked, find the right API fast: `06-capability-lookup.md`
6. Verify exact contracts before coding risky changes: `07-runtime-api-reference.md`
7. Apply changes in route code, then loop back to step 3/4 as needed.

## How To Use This In Practice

### First-time author (new question)

1. Read `02-principles-and-mental-model.md` (10-15 minutes).
2. Follow `03-build-a-question-by-copying.md` and make it run once.
3. Use `04-question-definition-options.md` for spaces/entities/rules shape.
4. Use `05-interactions-and-behaviors.md` for triggers, guards, handlers.
5. Use `06-capability-lookup.md` whenever you ask: "Can the engine do X?"

### Returning author (change existing question)

1. Start at `06-capability-lookup.md` to pick APIs quickly.
2. Confirm method behavior in `07-runtime-api-reference.md`.
3. Check `09-types-reference.md` if data/event shape is unclear.
4. Implement and test.

## Fast Intent Map

| If you need to... | Open first | Open second |
|-------------------|------------|-------------|
| Understand architecture and ownership | `02-principles-and-mental-model.md` | `10-architecture-contract-adr.md` |
| Build a question quickly by copying | `03-build-a-question-by-copying.md` | `04-question-definition-options.md` |
| Decide which space/rule option to use | `04-question-definition-options.md` | `06-capability-lookup.md` |
| Add interactions (click, modal, terminal, phase) | `05-interactions-and-behaviors.md` | `07-runtime-api-reference.md` |
| Understand side effects or failure behavior | `07-runtime-api-reference.md` | `02-principles-and-mental-model.md` |
| Find component prop or rendering limits | `08-component-reference.md` | `06-capability-lookup.md` |
| Find type/event shape | `09-types-reference.md` | `07-runtime-api-reference.md` |
| Debug by symptom | `06-capability-lookup.md` | `05-interactions-and-behaviors.md` |

## Ordered Files

1. `01-README.md`
2. `02-principles-and-mental-model.md`
3. `03-build-a-question-by-copying.md`
4. `04-question-definition-options.md`
5. `05-interactions-and-behaviors.md`
6. `06-capability-lookup.md`
7. `07-runtime-api-reference.md`
8. `08-component-reference.md`
9. `09-types-reference.md`
10. `10-architecture-contract-adr.md`

## Important Guardrail

Canonical method-level contracts (side effects, return behavior, failure behavior)
are in `07-runtime-api-reference.md`. If any guide and API reference conflict,
trust `07-runtime-api-reference.md`.
