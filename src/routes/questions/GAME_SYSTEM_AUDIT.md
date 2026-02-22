# Game System Usage Audit — `src/routes/questions`

> Audit of how `src/routes/questions` leverages (or bypasses) the game system APIs in `src/components/game`.
> Generated: 2026-02-21 | Last updated: 2026-02-22

---

## TL;DR

| Category | Assessment |
|----------|-----------|
| Factories (`SpaceFactory`, `EntityFactory`, `ConditionFactory`, `PhaseRuleFactory`) | **Fully leveraged** |
| Public World API (`world.*`) | **Fully leveraged** |
| Engine Hooks (`useDragEngine`, `useTerminalEngine`) | **Fully leveraged** |
| Engine Components (`GameBoard`, `GridSpace`, `PoolSpace`, etc.) | **Fully leveraged** |
| Domain Read API (`lookupEntity`, `selectEntitiesByType`, etc.) | ~~Bypassed~~ **Adopted** — runtime read APIs now used across question files |
| Space Type Guards (`isGridSpace`, `isPoolSpace`, etc.) | ~~Bypassed~~ **Adopted** — `isGridSpace` now used in dhcp, internet, webserver-ssl |
| ADT Constructors (`createEntityData`, `createGridSpaceData`, etc.) | **Bypassed** — not needed at this layer (correct) |
| Question AST Evaluators (`evaluateCondition`, `resolveVisibility`) | **Partially leveraged** — `resolvePhase` used, the rest ignored |
| `useEngineProgress` hook | **Intentionally unused** — internal infra behind `useDragEngine`/`useTerminalEngine` |
| `interaction.closeModal` | **Available, not needed** — modals close via UI; no programmatic close required |
| `flow.requestPhaseTransition` / `flow.dispatchIntent` | **Correct as-is** — `interactionSession.*` used in pages; `flow.*` for behavior handlers |

---

## Cross-Cutting Anti-Patterns

### 1. ~~Domain Read API Completely Ignored~~ (Fixed)

**Status: Resolved (2026-02-22)**

Runtime read APIs (`listSpaceEntityIds`, `lookupEntity`, `selectEntitiesByType`, `isGridSpace`, `selectGridEmptyPositions`) are now imported and used across question files. The `Object.values(state.entities).filter(...)` and `Object.keys(space.entityPositions)` patterns have been replaced.

**Remaining:** `webserver-ssl/-utils/behaviors.ts` still uses `Object.keys(space.entityPositions)` and `state.entities[entityId]` in a few places within narrowed `GridSpaceData` contexts. These are minor and not the systemic anti-pattern originally flagged.

---

### 2. ~~Space Type Guards Bypassed~~ (Fixed)

**Status: Resolved (2026-02-22)**

`isGridSpace` is now used in `dhcp/use-network-state.ts`, `internet/use-internet-state.ts`, `webserver-ssl/use-ssl-state.ts`, and `webserver-ssl/behaviors.ts`.

**Remaining:** Two trivial `kind ===` checks in `tcp/-page.tsx` (`kind === "pool"` for visibility) and `udp/-page.tsx` (`kind === "grid"` / `kind === "custom"` for board-readiness). These are simple boolean guards, not narrowing for property access.

---

### 3. ~~`isGridSpace` Locally Reimplemented in TCP~~ (Fixed)

**Status: Resolved (2026-02-22)**

Local `isGridSpace` function removed from `tcp/-utils/behaviors.ts`. Now imports from the game system runtime.

---

### 4. ~~`selectGridEmptyPositions` Locally Reimplemented in TCP~~ (Fixed)

**Status: Resolved (2026-02-22)**

Local `findEmptyGridPosition` removed from `tcp/-utils/behaviors.ts`. Now uses `selectGridEmptyPositions` from the runtime.

---

### 5. ~~Phase Management Mixed: Declarative + Imperative~~ (By Design)

**Status: Resolved as by-design (2026-02-22)**

The manual `useEffect` that calls `deriveQuestionPhase` + `interactionSession.requestPhaseTransition` is the **canonical pattern**. The runtime does NOT auto-evaluate `phaseRules` — they are a declarative data structure that requires an imperative evaluation driver. The canonical API reference (`3.1-runtime-api-reference.md`, end-to-end example, lines 474–488) demonstrates this exact pattern. UDP avoids it by using `phaseRules: []` and managing phase-like state through behavior context.

---

### 6. ~~`parseCoordinate` Helper Duplicated Across 3 Files~~ (Fixed)

**Status: Resolved (2026-02-22)**

Extracted to `networking/-utils/board-helpers.ts`. All page files now import from there.

---

### 7. ~~`toBoardItemStatus` / `toEntityStatus` Duplicated Across 4 Files~~ (Fixed)

**Status: Resolved (2026-02-22)**

Extracted to `networking/-utils/board-helpers.ts`. All page and state hook files now import from there.

---

### 8. ~~IP Validation Logic~~ (Fixed)

**Status: Resolved (2026-02-22)**

Core functions (`isValidIp`, `isPrivateIp`, `parseIpToNumber`, `parseIpRangeBase`, `calculateIpRangeSize`, `validateIpRange`) extracted to `networking/-utils/network-utils.ts`. Both `dhcp/-utils/network-utils.ts` and `internet/-utils/network-utils.ts` re-export from the shared module. Modal builders import `PRIVATE_IP_RANGES` from the shared module. Dead `PRIVATE_IP_RANGES` removed from `dhcp/-utils/constants.ts` and `internet/-utils/constants.ts`. Local `isValidIP`/`parseIP`/`calculateRange` in `dhcp/-utils/get-contextual-hint.ts` replaced with shared `isValidIp`/`parseIpToNumber`/`calculateIpRangeSize` imports.

---

### 9. ~~Module Progress Store Duplicated~~ (Resolved — Intentionally Inlined)

**Status: Resolved (2026-02-22)**

The shared `create-progress-store.ts` factory was deleted. Each module (`networking`, `software`) owns its progress store inline in its `module-progress.ts`. The "duplication" is inherently module-specific code (question lists, typed IDs, navigation helpers) — the shared abstraction added indirection without meaningful deduplication.

---

### 10. `overlay.modals` State Inspected Directly — Accepted As-Is

**Status: Accepted (2026-02-22)**

Five instances across three state hooks read `state.overlay.modals` directly:
- `dhcp/-utils/use-network-state.ts` (1 instance)
- `internet/-utils/use-internet-state.ts` (3 instances)
- `webserver-ssl/-utils/use-ssl-state.ts` (1 instance)

The game system does not currently expose a `getOpenModal` or `isModalOpen(state, modalId)` read helper. Accepted as-is — adding a helper for five call sites would be over-abstraction. If the overlay state shape changes, these are easy to grep and update.

---

## Remaining Work

### Open Items

None — all items resolved or accepted.

### Resolved Items
- ~~#1 Domain Read API~~ — Adopted
- ~~#2 Space Type Guards~~ — Adopted
- ~~#3 Local isGridSpace in TCP~~ — Removed
- ~~#4 Local findEmptyGridPosition in TCP~~ — Removed
- ~~#5 Phase management~~ — By design
- ~~#6 parseCoordinate duplication~~ — Extracted
- ~~#7 toBoardItemStatus duplication~~ — Extracted
- ~~#8 IP validation duplication~~ — Extracted to shared, dead code removed
- ~~#9 Module Progress Store~~ — Intentionally inlined
- ~~#10 overlay.modals direct access~~ — Accepted as-is
