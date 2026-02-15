# 1) Mental Model and Author Loop

This doc is the top-level map.

The structure is grouped to match how you actually work:

- `1` + `1.1`: understand model and principles
- `2` + `2.1` + `2.2`: build by copying and adapting
- `3` + `3.1` + `3.2` + `3.3`: capability lookup and deep references
- `4`: architecture contract

## 1.0 Understand First

1. Read `1.1-principles-and-mental-model.md`.
2. Confirm where gameplay logic should live (behavior rules, not page loops).
3. Start building only after this is clear.

## 2.0 Build Loop (Copy -> Adapt -> Interact)

1. Copy and run baseline: `2-build-a-question-by-copying.md`.
2. Adapt question shape: `2.1-question-definition-options.md`.
3. Add user interactions and rules: `2.2-interactions-and-behaviors.md`.
4. Implement in route code.
5. Repeat steps 2-4 until behavior matches your scenario.

## 3.0 When You Hit a Limitation

Start at `3-capability-lookup.md`, then jump to:

- `3.1-runtime-api-reference.md` for exact method contract/side effects
- `3.2-component-reference.md` for rendering/component constraints
- `3.3-types-reference.md` for data/event/modal shapes

This is your fast loop while implementing:

1. "I need X" -> `3-capability-lookup.md`
2. "exact behavior?" -> `3.1-runtime-api-reference.md`
3. apply in code
4. if blocked again, return to step 1

## 4.0 Architecture Contract

Use `4-architecture-contract-adr.md` when you need boundary rules
(ADT/Read/Transformer/Effect responsibilities).

## Quick Intent Map

| Need | Open first | Open second |
|------|------------|-------------|
| Understand ownership boundaries | `1.1-principles-and-mental-model.md` | `4-architecture-contract-adr.md` |
| Build a new question quickly | `2-build-a-question-by-copying.md` | `2.1-question-definition-options.md` |
| Add behavior rules | `2.2-interactions-and-behaviors.md` | `3.1-runtime-api-reference.md` |
| Find "can engine do this?" | `3-capability-lookup.md` | `3.1-runtime-api-reference.md` |
| Check component constraints | `3.2-component-reference.md` | `3.3-types-reference.md` |
| Debug symptoms | `3-capability-lookup.md` | `2.2-interactions-and-behaviors.md` |

## Ordered Files (Grouped)

1. `1-mental-model-and-loop.md`
2. `1.1-principles-and-mental-model.md`
3. `2-build-a-question-by-copying.md`
4. `2.1-question-definition-options.md`
5. `2.2-interactions-and-behaviors.md`
6. `3-capability-lookup.md`
7. `3.1-runtime-api-reference.md`
8. `3.2-component-reference.md`
9. `3.3-types-reference.md`
10. `4-architecture-contract-adr.md`

## Guardrail

If any guide conflicts with API behavior, trust
`3.1-runtime-api-reference.md`.
