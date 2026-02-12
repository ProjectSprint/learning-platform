# UDP Video Streaming Blueprint

Blueprint for a dual-stage networking question. This document is a
starting specification for authoring and updating the question, with
declarations first and logic second.

Canonical docs for engine contracts:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 1) Question Declaration

### 1.1 Meta

- Question ID: `udp-video-streaming`
- Title: `📺 Stream movie.mp4 to 3 viewers`
- Description: `Your viewers are waiting! Establish connections and deliver the video stream to all clients.`
- Learning objective:
  - Demonstrate TCP connection/state overhead across multiple clients.
  - Contrast that with UDP fire-and-forget streaming and tolerated loss.

### 1.2 Core Terms

- `Mode`: top-level stage, either `tcp` or `udp`.
- `Phase`: sub-stage inside a mode.
- `Internet`: transit grid where packets/frames are dropped and visibly processed.
- `Inventory`: sendable item pool.
- `Received`: inbound/ack display pool.
- `Client panel`: custom display space for per-client connection/progress.
- `Sending`: transient status badge for in-flight success path.
- `Rejected`: transient status badge for invalid action path.

### 1.3 Space Declaration

| Space ID | Kind | Purpose | Key Contract |
|---|---|---|---|
| `internet` | `grid` | Transit surface for packet/frame send flow | Single logical route where in-flight visibility is shown |
| `client-a` | `custom` | TCP/UDP status panel for client A | Display-only; no drag/drop storage |
| `client-b` | `custom` | TCP/UDP status panel for client B | Display-only; no drag/drop storage |
| `client-c` | `custom` | TCP/UDP status panel for client C | Display-only; no drag/drop storage |
| `client-d` | `custom` | Dynamic TCP status panel for late client | Display-only; shown only when enabled |
| `inventory` | `pool` | Outgoing items user can send | Hosts SYN-ACK/data/frames depending on stage |
| `received` | `pool` | Inbound acknowledgements/receive artifacts | Visual feedback for receive side |

### 1.4 Entity Declaration

| Family | Count | Primary Meaning | Placement Pattern |
|---|---|---|---|
| `syn-ack-packet` | 4 (A/B/C/D variants) | TCP handshake starter for each client | A/B/C start in `inventory`; D is enabled later |
| `data-packet` | 24 (A/B/C/D × seq 1..6) | TCP transfer load per client | Added/available as connection progresses |
| `frame` | 6 (seq 1..6) | UDP stream units | Injected into `inventory` during UDP transition |

Entity declaration requirements:
- Each entity has a stable `id`.
- `allowedPlaces` must include valid target spaces for intended flow.
- Sequence-bearing entities (`data`, `frame`) must carry order metadata (`seq`).
- Client-bound entities must carry client identity (`clientId`).

### 1.5 Pool and Group Semantics

- `inventory` is the mutable send queue shown to user.
- `received` is the receive-feedback queue.
- Pool updates must be incremental and scoped.
- Reconnect flows must mutate only affected client subsets.
- Existing unaffected pool items must stay intact.
- Avoid full inventory rewrites unless the game intentionally resets all clients.

### 1.6 Mode and Phase Declaration

Mode declaration:
- `tcp`: connection and reliable transfer pressure.
- `udp`: sequential streaming with loss tolerance.

TCP phase declaration:
1. `handshake-synack`
2. `connected`
3. `data-transfer`
4. `chaos-new-client`
5. `chaos-timeout`
6. `chaos-redo`
7. `breaking-point`

UDP phase declaration:
1. `intro`
2. `streaming`
3. `complete`

### 1.7 Modal Declaration

| Modal ID | Trigger Context | Action ID | Expected Effect |
|---|---|---|---|
| `tcp-connected` | First stable connected point | implicit close/continue | Player understands early success before chaos |
| `tcp-new-client` | Packet threshold reached in TCP | implicit close/continue | Introduce client D pressure |
| `tcp-timeout` | D handshake contributes to contention | `reconnect` | Start scoped reconnect for A/B/C |
| `tcp-exhaustion` | Redo pressure reaches failure point | `continue` | Transition from TCP to UDP stage |
| `udp-success` | All UDP frames processed | `complete` | Mark complete and exit question |

### 1.8 Arrow and Component Contracts

This question can use these runtime/presentation components as declarative primitives.

| Component/Hook | Key Properties | Behavior and Usage Contract |
|---|---|---|
| `GameProvider` | `children`, optional `initialState` | Required top-level provider for all game hooks/components |
| `GameBoard` | children tree | Provides board registry and arrow drawing surface |
| `GridSpace` | `id/config`, `ctx`, `title`, `responsiveSize`, `onEntityClick`, `isEntityClickable`, `getEntityLabel`, `getEntityStatus` | Renders grid space and handles drop/click integration |
| `PoolSpace` | `id/config`, `ctx`, `title` | Renders pool inventory and starts drags for pool items |
| `CustomSpace` | `id`, `children` | Display-only container; no entity storage; can be arrow target |
| `Modal` | no required props | Renders modal stack and emits submit/close events |
| `ContextualHint` + `useContextualHint` | hint string/derivation | Displays phase-sensitive guidance text |
| `useBoardArrows` | `setArrows`, `clearArrows` with arrow `{ id, from, to, style }` | Draws directional overlays between `spaceId` anchors |
| `DragOverlay` | `getEntityLabel` | Visual drag preview while dragging |
| `DrawerLayout` | `drawerId`, `children` | Responsive drawer shell for pools or supporting panels |

Contract notes:
- `GridSpace`, `PoolSpace`, and `CustomSpace` do not create spaces.
- Spaces are created by runtime bootstrap from `QuestionDefinition.spaces`.
- Render a board readiness guard before custom/grid composition to avoid bootstrap race warnings.

### 1.9 AI Authoring Contract

What AI can do:
- Use this blueprint as the creation baseline for structure and flow.
- Apply declarative and functional decomposition while preserving invariants.
- Introduce helper-level refactors that reduce mutation scope and side effects.

What AI cannot assume:
- Blueprint-only context is insufficient for runtime API details.
- Reconnect is not a global reset.
- Full pool rewrite is not an acceptable default mutation strategy.

Required context order:
1. This blueprint.
2. Game docs listed at the top (`question-definition`, `runtime-api`, `behavior-system`, `components`).
3. Existing accepted behavior and checks in repository workflows.

Declarative/FP style rules:
- Prefer pure derivation helpers for state decisions.
- Keep side effects at boundaries (event handlers, timers, modal callbacks, runtime API wrappers).
- Express transitions as `state + event -> next state`.
- Keep mutations local to affected clients/entities.

---

## 2) Logic and Lifecycle

### 2.1 Runtime Lifecycle

1. Runtime validates question definition.
2. Runtime bootstraps spaces/entities from declaration.
3. UI renders only after required spaces exist (`boardReady` style guard).
4. User actions produce events and timer-driven transitions.
5. Modal actions gate major phase changes.

### 2.2 TCP Logic

Key timings:
- `INTERNET_TRAVEL_MS = 1500`
- `ACK_TRAVEL_MS = 1000`
- `DATA_ACK_MS = 500`
- `NOTICE_MS = 2000`
- `NEW_CLIENT_TRIGGER_PACKET_COUNT = 4`

Handshake/send logic:
- SYN-ACK dropped into `internet` becomes in-flight.
- After transit, client marks SYN-ACK sent.
- After ACK delay, client becomes connected and receives ACK artifact.
- Connected clients unlock their data packet progression.

Data transfer logic:
- Data packet dropped into `internet` is rejected if disconnected or client-locked.
- Valid packet enters `sending`, then clears after send+ack cycle.
- Successful send increments packet count.

Chaos logic:
- After 4 sent packets, client D path appears.
- D handshake progression leads to timeout pressure.
- Reconnect action enters `chaos-redo` and resets only A/B/C paths.
- D-related items and progress remain preserved.
- Breaking point opens TCP exhaustion modal and offers UDP transition.

### 2.3 UDP Logic

Key timings:
- `FRAME_SEND_MS = 1500`
- `NOTICE_MS = 2000`
- Intro delay: `200ms`

Streaming logic:
- Frames are strict-order (`expectedFrame = lastSent + 1`).
- Wrong-order frame is rejected, briefly shown, then removed.
- Correct frame is marked `sending` and stays visible in `internet` until timer finishes.
- After send completes, frame leaves `internet` and delivery map is applied.

Delivery outcome map:
- Frame 1: A/B/C delivered
- Frame 2: C lost
- Frame 3: A/B/C delivered
- Frame 4: A lost
- Frame 5: B lost
- Frame 6: A/B/C delivered

Completion logic:
- After last frame resolution, open `udp-success`.
- Completion action marks question complete and exits.

### 2.4 Hint and Progress Logic

- Contextual hint depends on mode, phase, expected frame, and packets sent.
- TCP client progress supports `received`, `out-of-order`, `missing`.
- UDP client progress supports `pending`, `delivered`, `lost`.

---

## 3) Hard Invariants

- Correct-order UDP frame must remain visible in `internet` with `Sending` until `FRAME_SEND_MS` completes.
- Client D appearance threshold is exactly `NEW_CLIENT_TRIGGER_PACKET_COUNT = 4`.
- Reconnect during chaos only resets A/B/C and preserves D packet inventory/progress.
- Existing packets for unaffected clients must remain visible.
- Custom/grid space render must wait for bootstrap readiness.

---

## 4) Known Caveats

1. Some historical TCP phase labels can exist for completeness even if not all are actively traversed.
2. This question intentionally uses hook orchestration for flow control rather than behavior-rule-first orchestration.
3. Timer cleanup and lock management are correctness-critical for race prevention.

---

## 5) Verification Checklist

- Validate declaration and logic consistency:
  - Space kinds and IDs match intended rendering roles.
  - Entity family counts and sequence semantics remain valid.
  - Modal IDs/actions still match transition contracts.
  - D trigger and reconnect scope invariants are unchanged.
  - UDP sending visibility invariant is preserved.
- Run quality gates when behavior/code changes:
  - `pnpm check:biome`
  - `pnpm check:tsc`
