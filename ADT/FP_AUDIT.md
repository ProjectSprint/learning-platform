# FP Audit of Current Game Engine

## Scope
- Reviewed: `src/components/game/{runtime,application,domain,engines}`.
- Goal: identify non-FP practices, while allowing imperative code for external integrations and performance-sensitive paths.

## Verdict
- Overall architecture is mostly FP-leaning: plain data, reducer-driven state, explicit event queue.
- You still have several mutable/effectful pockets that are not purely functional.

## Imperative Boundaries That Are Reasonable
1. React runtime integration and orchestration
- `src/components/game/runtime/context/use-question-runtime.ts:84`
- `src/components/game/runtime/context/use-question-runtime.ts:109`
- Reason: this is UI framework boundary work (`useEffect`, refs, provider wiring).

2. Immer-backed in-place mutation for reducer performance
- `src/components/game/application/state/reducers/space.ts:38`
- `src/components/game/domain/space/space-fns.ts:86`
- `src/components/game/domain/space/space-fns.ts:137`
- `src/components/game/domain/space/space-fns.ts:323`
- Reason: localized mutability inside `produce` is a pragmatic performance tradeoff.

3. Terminal side effects and async command handling
- `src/components/game/engines/terminal/use-terminal-engine.ts:59`
- `src/components/game/runtime/behavior/reactor.ts:262`
- Reason: terminal I/O and timers are external-effect boundaries.

## Non-FP Practices To Refactor
1. Hidden mutable behavior context (`useRef`) instead of state transitions
- `src/components/game/runtime/behavior/reactor.ts:62`
- `src/components/game/runtime/behavior/reactor.ts:255`
- Why non-FP: context is mutated outside reducer/event log, so transitions are less replayable and harder to reason about.
- Suggestion: model behavior-context changes as explicit events or reducer actions.

2. Reducer impurity via `Date.now()`
- `src/components/game/engines/use-engine-progress.ts:43`
- `src/components/game/engines/use-engine-progress.ts:55`
- Why non-FP: reducers should be referentially transparent.
- Suggestion: inject timestamp in dispatched action payload (`START at`, `FINISH at`) and keep reducer pure.

3. Mutable anti-spam map inside dispatcher closure
- `src/components/game/runtime/execution-flow/dispatcher.ts:29`
- `src/components/game/runtime/execution-flow/dispatcher.ts:42`
- Why non-FP: hidden mutable `Map` controls behavior outside state tree.
- Suggestion: store rapid-intent bookkeeping in runtime state (or explicit dispatcher state record).

4. Reactor side channels (`onceKeys`, `processingRef`) affect semantics outside state
- `src/components/game/runtime/behavior/reactor.ts:68`
- `src/components/game/runtime/behavior/reactor.ts:69`
- `src/components/game/runtime/behavior/reactor.ts:263`
- Why non-FP: event processing behavior depends on mutable refs, not solely `(state, event)`.
- Suggestion: represent one-shot keys and in-flight flags as explicit runtime state.

5. Behavior helper mismatch (likely bug): `moveToInventory`
- `src/components/game/runtime/behavior/reactor.ts:282`
- `src/components/game/runtime/behavior/reactor.ts:283`
- Why risky: helper named “move to inventory” currently calls `removeFromSpace(entityId, "inventory")`.
- Suggestion: change helper to `world.moveEntity(entityId, "inventory")` (or equivalent).

## Practical Priority Order
1. Fix `moveToInventory` semantic bug first.
2. Remove `Date.now()` from reducers.
3. Move behavior context/once-key state into explicit reducer-driven state.
4. Keep Immer-local mutation as-is unless profiling says otherwise.
