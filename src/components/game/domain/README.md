# Domain Layer

The domain layer is split into explicit boundaries:

- `adt/`: foundational types + constructors (brands, readonly helpers, create*)
- `entity/` + `space/`: plain data models and type guards
- `read/`: pure query APIs (`is*`, `get*`, `select*`)
- `transformers/`: deterministic transition APIs (`apply*`, `try*`)
- `invariants.ts`: runtime invariant checks used as safety rails

## Boundary Rules

1. ADT and data-model modules do not own transition orchestration.
2. Read modules are pure and never mutate state.
3. Transformer modules own state transition semantics and noop reasons.
4. Runtime/effect layers depend on domain; domain does not depend on runtime.

## Naming Contract

- Read API:
  - `is*` for predicates/type guards
  - `get*` for direct lookups
  - `select*` for derived queries
- Transformer API:
  - `apply*` for unconditional transitions
  - `try*` for guarded transitions with explicit noop outcomes

## Key Entry Points

- Read: `src/components/game/domain/read/index.ts`
- Transformers: `src/components/game/domain/transformers/index.ts`
- Invariants: `src/components/game/domain/invariants.ts`

See `src/components/game/doc/adr-adt-read-transformer-effect.md` for the frozen contract.
