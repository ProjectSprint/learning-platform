# ADR: Game Domain Layer Contract (ADT + Read + Transformer + Effect)

## Status
Accepted (hard migration baseline)

## Context
The previous game engine structure mixed data modeling, read logic, and mutation logic across reducers, hooks, and helper modules (`space-fns`, `validation`, runtime selectors, compat converters). This made it difficult to reason about ownership and created drift between route usage and engine architecture.

## Decision
We freeze the boundary contract below and enforce it via code structure, API contracts, and lint restrictions.

### 1. ADT layer (`domain/adt`, `domain/entity`, `domain/space` data)
Responsibilities:
- Types, constructors, and guards.
- Branded IDs (`EntityId`, `SpaceId`, `PhaseId`) and readonly helpers.

Rules:
- ADT modules must not import runtime/effect modules.
- ADT modules must not own transition orchestration.

### 2. Read layer (`domain/read`)
Responsibilities:
- Pure guarded reads over state.
- Naming contract:
  - `is*` => predicates / guard checks
  - `get*` => direct lookup
  - `select*` => derived query

Rules:
- Inputs are readonly state projections.
- No mutation and no side effects.
- Runtime/hooks/pages should read through this layer.

### 3. Transformer layer (`domain/transformers`)
Responsibilities:
- Deterministic state transitions.
- Naming contract:
  - `apply*` => unconditional transition
  - `try*` => guarded transition with explicit noop reason

Rules:
- Transition result is explicit (`applied` or `noop`).
- Reducers are thin adapters calling transformers.
- Event queue append semantics are centralized and deterministic.

### 4. Effect layer (`runtime`, `application/hooks`, engine components)
Responsibilities:
- Dispatch orchestration, user interaction wiring, modal/terminal IO, timers, and route integration.
- No direct mutable domain logic embedded in route effects.

Rules:
- Effect layer can depend on ADT/Read/Transformer.
- Domain layers cannot depend on effect/runtime layers.

## Naming and API Contracts
- `readApi` must expose only `is/get/select` methods.
- `transformApi` must expose only `apply/try` transitions (except event queue helpers).

## Invariants
- Single-space ownership per entity is enforced in development (`assertSingleSpaceOwnership`).
- Transition failures must produce noop reasons rather than silent mutation fallback.
- Space-kind handling must be exhaustive for transition logic.

## Migration Policy
- Compatibility bridge modules are removed once callsites are migrated.
- Deprecated imports (`application/compat/*`, `domain/space/validation`, runtime selector wrappers) are blocked by lint restrictions.
- New route logic must not introduce alternative mutation pathways.

## Verification Gates
- `pnpm check:biome`
- `pnpm check:tsc`
- Domain read/transformer tests + invariant tests + reducer parity tests.
