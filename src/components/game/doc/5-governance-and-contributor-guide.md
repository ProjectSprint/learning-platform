# 5) Governance and Contributor Guide

## Architecture Rules (Automated)

The following rules are enforced by boundary tests in `engine/__tests__/public-api-boundary.test.ts`:

| Rule | What it prevents |
|---|---|
| **External imports use facade only** | Files outside `src/components/game/` can only import from `@/components/game/engine`, `engine/game-provider`, `engine/runtime`, or `@/components/game/types/*` |
| **No bridge aliases in types** | No `_Type as Type` re-export patterns in `src/components/game/types/**` |
| **Types modules are type-only** | No `export const/function/class` in types modules (type guards exempted) |
| **Runtime API surface is locked** | `engine/runtime` exports are explicitly enumerated and tested |

Additional rules in `networking/__tests__/-runtime-boundaries.test.ts`:

| Rule | What it prevents |
|---|---|
| **No direct `commands.setPhase`** | Route code must use runtime API |
| **No route-level `useGameDispatch`** | Routes use `useQuestionRuntime` |
| **Definitions include behaviors** | All questions declare behavior rules |
| **No page event loops** | Gameplay logic belongs in behavior reactor |

## Module Boundaries

```
External routes → engine/ (public API)
                → types/  (type-only imports)

engine/ → internal/ (implementation)

internal/domain/adt     → no runtime deps
internal/domain/read    → adt only
internal/domain/transformers → adt, read
internal/runtime        → domain layers
internal/application    → domain, runtime
internal/presentation   → application, domain
```

## Adding New Behaviors/Events

1. Define the trigger in `types/behavior.ts` → add to `EventTrigger` union
2. Emit the event in the appropriate reducer (`application/state/reducers/`)
3. Handle matching in `runtime/behavior/reactor.ts` → `matchesEventTrigger`
4. Add contract test in `runtime/__tests__/behavior-reactor.test.ts`
5. Document in `3.1-runtime-api-reference.md`

## Adding New Config Fields

1. Add field to `types/question.ts` → `QuestionDefinition`
2. Add validation in `runtime/definition/validate.ts`
3. If the field is structural, add bootstrap handling in `runtime/bootstrap/bootstrap.ts`
4. Add test in `runtime/definition/__tests__/schema.test.ts`
5. Update docs

## PR Checklist (Game Runtime/Types)

- [ ] `pnpm check:tsc` passes
- [ ] `pnpm check:biome` passes
- [ ] `pnpm vitest run` passes (all boundary + contract tests)
- [ ] No new imports into `internal/*` from outside game package
- [ ] Types modules contain only type exports (no runtime values)
- [ ] New behaviors have contract tests
- [ ] Config changes include validation updates
- [ ] Docs updated for new APIs

## Quality Gates

All enforced via test suite:

```bash
pnpm check:tsc          # Type safety
pnpm check:biome        # Lint and formatting
pnpm vitest run         # All tests including boundary enforcement
```
