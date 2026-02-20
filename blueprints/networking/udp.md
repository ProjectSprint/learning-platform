# UDP Video Streaming Blueprint

Declaration-first blueprint for `udp-video-streaming`.
This document is intentionally verbose and term-linked so an AI can map declarations to logic without guessing synonyms.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

Use this blueprint as the **starting specification** for creating and updating the UDP networking question.
Use the game docs for API/type mechanics.

### 0.2 Mandatory Reading Order

1. Section `1) Canonical Term Dictionary`
2. Section `2) Declarative Specification`
3. Section `3) Lifecycle and Logic Specification`
4. Section `4) Transition Matrices`
5. Section `5) Term-to-Logic Link Index`
6. Section `6) Hard Invariants`
7. Section `7) Non-Goals`
8. Section `8) Authoring and Verification Protocol`

### 0.3 No-Synonym Rule

- If a logic sentence uses a concept, it must use the exact canonical term ID from Section 1.
- Avoid alternate labels (for example, do not swap `PHASE_TCP_CHAOS_REDO` with "retry chaos phase").
- If a new term is needed, add it to Section 1 first, then use it.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value | Meaning |
|---|---|---|
| `QUESTION_ID` | `udp-video-streaming` | Unique question identifier |
| `QUESTION_TITLE` | `📺 Stream movie.mp4 to 3 viewers` | Display title |
| `QUESTION_DESCRIPTION` | `Your viewers are waiting! Establish connections and deliver the video stream to all clients.` | Display description |

### 1.2 Mode Terms

| Term ID | Value | Meaning |
|---|---|---|
| `MODE_TCP` | `tcp` | Connection overhead stage |
| `MODE_UDP` | `udp` | Streaming stage |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Meaning |
|---|---|---|---|
| `SPACE_INTERNET` | `internet` | `grid` | Transit surface where send actions are visualized |
| `SPACE_CLIENTS` | `clients` | `custom` | Shared panel rendering all active client progress bars |
| `SPACE_INVENTORY` | `inventory` | `pool` | Outgoing selectable items |
| `SPACE_PACKETS` | `packets` | `pool` | Data packets available to send (hidden until connection established) |
| `SPACE_RECEIVED` | `received` | `pool` | Receive/ack visualization items |

### 1.4 Pool Semantics Terms

| Term ID | Meaning |
|---|---|
| `POOL_MUTATION_SCOPED` | Pool writes modify only affected client subsets |
| `POOL_MUTATION_INCREMENTAL` | Pool writes add/remove/merge targeted items, not full replacement |
| `POOL_PRESERVE_UNAFFECTED` | Unaffected client items remain visible and undisturbed |
| `POOL_PLACEMENT_GUARD` | `PoolSpace` enforces `allowedPlaces` on drop; drops to disallowed pools are rejected silently |

### 1.5 Entity Family Terms

| Term ID | Family | Count | Required Metadata |
|---|---|---|---|
| `ENTITY_SYNACK` | `syn-ack-packet` | 4 (A/B/C/D) | `clientId` |
| `ENTITY_DATA` | `data-packet` | 24 (A/B/C/D × seq 1..6) | `clientId`, `seq` |
| `ENTITY_FRAME` | `frame` | 6 (seq 1..6) | `frameNumber` |
| `ENTITY_UNICAST` | `unicast-response` | 3 (A/B/C) | `clientId` |

### 1.6 Status Terms

| Term ID | UI Label | Meaning |
|---|---|---|
| `STATUS_SENDING` | `Sending` | Valid in-flight transit state |
| `STATUS_REJECTED` | `Rejected` | Invalid action rejected during TCP |
| `STATUS_WRONG_ORDER` | `Wrong order` | Invalid frame order rejected during UDP |
| `STATUS_DELIVERED` | `delivered` | Delivery success state |
| `STATUS_LOST` | `lost` | UDP frame destination loss state |
| `STATUS_PENDING` | `pending` | Not yet delivered/resolved |
| `STATUS_WAITING` | `out-of-order` | TCP data packet received out of sequence; buffered by HoL blocking (yellow) |

### 1.7 TCP Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | `handshake-synack` | Send SYN-ACK for current clients |
| `PHASE_TCP_DATA_TRANSFER` | `data-transfer` | Main TCP data sending |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | `chaos-new-client` | Introduce client D workload |
| `PHASE_TCP_CHAOS_TIMEOUT` | `chaos-timeout` | Timeout pressure prompt |
| `PHASE_TCP_CHAOS_REDO` | `chaos-redo` | Scoped reconnect of A/B/C |
| `PHASE_TCP_BREAKING_POINT` | `breaking-point` | Transition pressure before UDP |

### 1.8 UDP Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_UDP_INTRO` | `intro` | Brief transition/setup into UDP (200ms) |
| `PHASE_UDP_UNICAST` | `unicast` | User drags unicast responses from A/B/C to `SPACE_RECEIVED` |
| `PHASE_UDP_STREAMING` | `streaming` | Ordered frame sending |
| `PHASE_UDP_COMPLETE` | `complete` | Completion checkpoint |

### 1.9 Modal Terms

| Term ID | Modal ID | Action ID | Trigger |
|---|---|---|---|
| `MODAL_TCP_NEW_CLIENT` | `tcp-new-client` | implicit close | `TRIGGER_CLIENT_D_PACKET_COUNT` reached |
| `MODAL_TCP_TIMEOUT` | `tcp-timeout` | `reconnect` | D handshake complete |
| `MODAL_TCP_EXHAUSTION` | `tcp-exhaustion` | `continue` | First redo data packet acked |
| `MODAL_UDP_SUCCESS` | `udp-success` | `complete` | All UDP frames sent |

### 1.10 Timing Terms

| Term ID | Value (ms) | Meaning |
|---|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | `1500` | Transit delay for all packets and frames |
| `TIMER_ACK_TRAVEL_MS` | `1000` | ACK delay after SYN-ACK lands |
| `TIMER_NOTICE_MS` | `2000` | Transient notice/rejection display duration |
| `TIMER_FRAME_SEND_MS` | `1500` | UDP frame send transit duration |
| `TIMER_UDP_INTRO_DELAY_MS` | `200` | Delay between mode switch and `PHASE_UDP_UNICAST` start |
| `TRIGGER_CLIENT_D_PACKET_COUNT` | `4` | TCP sent-packet threshold to reveal D |

### 1.11 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_DROP_TO_INTERNET` | User drops packet/frame into `SPACE_INTERNET` |
| `EVENT_DROP_TO_RECEIVED` | User drops `ENTITY_UNICAST` into `SPACE_RECEIVED` |
| `EVENT_MODAL_SUBMIT_RECONNECT` | Submit `MODAL_TCP_TIMEOUT` with action `reconnect` |
| `EVENT_MODAL_SUBMIT_CONTINUE` | Submit `MODAL_TCP_EXHAUSTION` with action `continue` |
| `EVENT_MODAL_SUBMIT_COMPLETE` | Submit `MODAL_UDP_SUCCESS` with action `complete` |
| `EVENT_TIMER_TCP_TRANSIT_DONE` | `TIMER_INTERNET_TRAVEL_MS` callback for TCP packets |
| `EVENT_TIMER_TCP_ACK_DONE` | `TIMER_ACK_TRAVEL_MS` callback after SYN-ACK |
| `EVENT_TIMER_UDP_INTRO_DONE` | `TIMER_UDP_INTRO_DELAY_MS` callback |
| `EVENT_TIMER_UDP_FRAME_DONE` | `TIMER_FRAME_SEND_MS` callback |

### 1.12 Component Terms

| Term ID | Component/Hook |
|---|---|
| `COMP_GAME_PROVIDER` | `GameProvider` |
| `COMP_GAME_BOARD` | `GameBoard` |
| `COMP_GRID_SPACE` | `GridSpace` |
| `COMP_POOL_SPACE` | `PoolSpace` |
| `COMP_CUSTOM_SPACE` | `CustomSpace` |
| `COMP_PROGRESS_BAR` | `ProgressBar` (custom component per client) |
| `COMP_MODAL` | `Modal` |
| `COMP_HINT` | `ContextualHint` + `useContextualHint` |
| `COMP_ARROWS` | `useBoardArrows` |
| `COMP_DRAG_OVERLAY` | `DragOverlay` |
| `COMP_DRAWER_LAYOUT` | `DrawerLayout` |

### 1.13 Context State Terms

| Term ID | Type | Meaning |
|---|---|---|
| `CTX_MODE` | `ActiveMode` | Current active mode (`MODE_TCP` or `MODE_UDP`) |
| `CTX_TCP_PHASE` | `TcpPhase` | Current TCP phase |
| `CTX_UDP_PHASE` | `UdpPhase` | Current UDP phase |
| `CTX_REDO_STAGE` | `"handshake" \| "data"` | Sub-stage within `PHASE_TCP_CHAOS_REDO` |
| `CTX_TCP_CONNECTIONS` | `Record<TcpClientId, boolean>` | Per-client handshake completion flag |
| `CTX_TCP_DELIVERED_COUNTS` | `Record<TcpClientId, number[]>` | Per-client list of delivered seq numbers (persists across reconnect) |
| `CTX_TCP_WAITING_SEQS` | `Record<TcpClientId, number[]>` | Per-client list of out-of-order buffered seq numbers; cleared on reconnect |
| `CTX_TCP_RECONNECTING` | `TcpClientId[]` | Clients currently mid-reconnect; progress bar shows all-pending while non-empty |
| `CTX_TCP_PACKETS_SENT` | `number` | Total TCP data packets sent across all clients |
| `CTX_ACTIVE_TCP_CLIENTS` | `TcpClientId[]` | Currently visible clients (starts as A/B/C; D added at chaos) |
| `CTX_UNICASTS_RECEIVED` | `number` | Count of unicast responses dropped to `SPACE_RECEIVED` |
| `CTX_LAST_SENT_FRAME` | `number` | Highest UDP frame seq number sent so far |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID` must equal `udp-video-streaming`.
- `QUESTION_TITLE` must equal `📺 Stream movie.mp4 to 3 viewers`.
- `QUESTION_DESCRIPTION` must describe TCP setup overhead then UDP streaming completion.

### 2.2 Space Declaration

#### 2.2.1 Space Set

The question must declare all five canonical spaces:
- `SPACE_INTERNET`
- `SPACE_CLIENTS`
- `SPACE_INVENTORY`
- `SPACE_PACKETS`
- `SPACE_RECEIVED`

#### 2.2.2 Space Roles

| Space Term | Role | Allowed Gameplay Interaction |
|---|---|---|
| `SPACE_INTERNET` | Transit route | Drop target for sendable entities; grid 1×3, `maxCapacity: 3` |
| `SPACE_CLIENTS` | Shared client panel | Display-only; hosts `COMP_PROGRESS_BAR` per active client |
| `SPACE_INVENTORY` | Outgoing source pool | Select and drag SYN-ACK and frame items out |
| `SPACE_PACKETS` | Data packet pool | Select and drag data packets; hidden until client connected |
| `SPACE_RECEIVED` | Receive artifact pool | Drop target for `ENTITY_UNICAST`; display receive states |

#### 2.2.3 Space Bootstrap Guard Contract

- Any UI that renders `COMP_CUSTOM_SPACE` or `COMP_GRID_SPACE` for these spaces must ensure runtime bootstrap completion.
- Rendering before bootstrap can produce missing-space warnings.
- Required guard intent: `boardReady` style predicate over declared spaces.

#### 2.2.4 Auto-Placement Contract

- `SPACE_INTERNET` is a grid space. When `addToSpace` is called without an explicit position, the engine auto-finds the first free cell (row-first scan).
- This contract enables `ENTITY_UNICAST` injection at `PHASE_UDP_UNICAST` start without requiring pre-computed positions.

### 2.3 Entity Declaration

#### 2.3.1 Entity Family Inventory

| Entity Term | Required IDs and Count | Initial Presence |
|---|---|---|
| `ENTITY_SYNACK` | A/B/C/D variants, total 4 | A/B/C initially in `SPACE_INVENTORY`; D revealed at `PHASE_TCP_CHAOS_NEW_CLIENT` |
| `ENTITY_DATA` | A/B/C/D × seq 1..6, total 24 | Hidden (no space) until client SYN-ACK completes; re-hidden on reconnect for unsent seqs |
| `ENTITY_FRAME` | seq 1..6, total 6 | Hidden until `PHASE_UDP_INTRO` clears; injected into `SPACE_PACKETS` at `PHASE_UDP_UNICAST` |
| `ENTITY_UNICAST` | A/B/C, total 3 | Hidden (no space) until `PHASE_UDP_UNICAST`; auto-placed into `SPACE_INTERNET` |

#### 2.3.2 Entity Metadata Contract

For every entity declaration:
- Must have stable `id`.
- Must have `allowedPlaces` including all intended routes.
- `ENTITY_DATA` requires `clientId` and `seq` in data payload.
- `ENTITY_FRAME` requires `frameNumber` in data payload.
- `ENTITY_SYNACK` requires `clientId` in data payload.
- `ENTITY_UNICAST` requires `clientId` in data payload; `allowedPlaces` must be `["internet", "received"]` only.

#### 2.3.3 Placement Contract

- `ENTITY_SYNACK` for A/B/C begins in `SPACE_INVENTORY`.
- `ENTITY_SYNACK` for D becomes available during `PHASE_TCP_CHAOS_NEW_CLIENT` pathway.
- `ENTITY_DATA` enters `SPACE_PACKETS` only when the corresponding client's SYN-ACK has landed. On reconnect, only unsent seqs (not in `CTX_TCP_DELIVERED_COUNTS`) are hidden; already-delivered seqs remain in their delivered state.
- `ENTITY_FRAME` enters `SPACE_PACKETS` only after `MODE_TCP` concludes and `PHASE_UDP_UNICAST` begins.
- `ENTITY_UNICAST` is injected into `SPACE_INTERNET` via auto-placement after `TIMER_UDP_INTRO_DELAY_MS`.

### 2.4 Pool and Group Declaration

#### 2.4.1 Pool Update Principles

Every pool mutation must satisfy:
- `POOL_MUTATION_SCOPED`
- `POOL_MUTATION_INCREMENTAL`
- `POOL_PRESERVE_UNAFFECTED`
- `POOL_PLACEMENT_GUARD`

#### 2.4.2 Reconnect-Specific Pool Declaration

During reconnect path (`EVENT_MODAL_SUBMIT_RECONNECT`):
- Reset only A/B/C connection flags (`CTX_TCP_CONNECTIONS`).
- Clear only A/B/C waiting seqs (`CTX_TCP_WAITING_SEQS`).
- Preserve A/B/C delivered counts (`CTX_TCP_DELIVERED_COUNTS`) — progress survives reconnect.
- Add A/B/C to `CTX_TCP_RECONNECTING` so their progress bars show all-pending visually.
- Remove from `SPACE_INTERNET` and `SPACE_PACKETS` only the unsent packets for A/B/C (seqs not in `CTX_TCP_DELIVERED_COUNTS`).
- Preserve D-related availability and progress entirely.
- Do not rewrite entire `SPACE_INVENTORY` snapshot.

### 2.5 Mode and Phase Declaration

#### 2.5.1 Mode Declaration

| Mode Term | Objective |
|---|---|
| `MODE_TCP` | Demonstrate per-client setup and reliability overhead |
| `MODE_UDP` | Demonstrate sequential media streaming with tolerated loss |

#### 2.5.2 TCP Phase Order Declaration

1. `PHASE_TCP_HANDSHAKE_SYNACK`
2. `PHASE_TCP_DATA_TRANSFER`
3. `PHASE_TCP_CHAOS_NEW_CLIENT`
4. `PHASE_TCP_CHAOS_TIMEOUT`
5. `PHASE_TCP_CHAOS_REDO`
6. `PHASE_TCP_BREAKING_POINT`

Note: `PHASE_TCP_CONNECTED` is no longer a distinct phase. The `MODAL_TCP_CONNECTED` modal was removed from the implementation. Connection completion is indicated by the `COMP_PROGRESS_BAR` border turning green and data packets becoming available.

#### 2.5.3 UDP Phase Order Declaration

1. `PHASE_UDP_INTRO`
2. `PHASE_UDP_UNICAST`
3. `PHASE_UDP_STREAMING`
4. `PHASE_UDP_COMPLETE`

### 2.6 Modal Declaration

| Modal Term | Availability Context | Must Trigger |
|---|---|---|
| `MODAL_TCP_NEW_CLIENT` | `TRIGGER_CLIENT_D_PACKET_COUNT` reached | Introduce client D workload |
| `MODAL_TCP_TIMEOUT` | D handshake completes | Offer `EVENT_MODAL_SUBMIT_RECONNECT` |
| `MODAL_TCP_EXHAUSTION` | First redo data packet acked in `PHASE_TCP_CHAOS_REDO` | Offer `EVENT_MODAL_SUBMIT_CONTINUE` to switch to UDP |
| `MODAL_UDP_SUCCESS` | All 6 UDP frames sent | Offer `EVENT_MODAL_SUBMIT_COMPLETE` |

Each modal is shown at most once per session (guarded by `CTX_MODALS_SHOWN` flags).

### 2.7 Progress Bar Declaration

#### 2.7.1 TCP Progress Bar

Each client panel renders a `COMP_PROGRESS_BAR` with 6 slots during `MODE_TCP`.

Slot status rules (evaluated per slot index, seq = index + 1):
- If client is in `CTX_TCP_RECONNECTING`: all slots show `STATUS_PENDING` (bar fully resets visually).
- Else if seq is in `CTX_TCP_DELIVERED_COUNTS[clientId]`: slot shows `STATUS_DELIVERED` (green).
- Else if seq is in `CTX_TCP_WAITING_SEQS[clientId]`: slot shows `STATUS_WAITING` (yellow, HoL blocked).
- Else: slot shows `STATUS_PENDING` (gray).

When SYN-ACK for a client lands, remove from `CTX_TCP_RECONNECTING`; bar snaps back to real delivered/waiting state.

#### 2.7.2 HoL Blocking Logic

On each data packet ack (immediately when packet leaves `SPACE_INTERNET`):
1. Compute `expectedSeq` = lowest seq not yet in `CTX_TCP_DELIVERED_COUNTS[clientId]`.
2. If `seq === expectedSeq`: push to delivered; flush contiguous seqs from waiting into delivered.
3. If `seq > expectedSeq` and not already tracked: push to `CTX_TCP_WAITING_SEQS[clientId]` (`STATUS_WAITING`).
4. Duplicates (already delivered): ignored.

There is no separate ACK delay timer. The indicator updates in the same callback that removes the packet from `SPACE_INTERNET`.

#### 2.7.3 UDP Progress Bar

Each client panel renders a `COMP_PROGRESS_BAR` with slot count equal to total frames sent so far (`CTX_LAST_SENT_FRAME`).

Slot status rules (evaluated per slot index, frame = index + 1):
- If frame index >= `CTX_LAST_SENT_FRAME`: `STATUS_PENDING`.
- Else if frame delivered to this client: `STATUS_DELIVERED` (green).
- Else: `STATUS_LOST` (red).

### 2.8 Component Declaration

#### 2.8.1 Component Capability Map

| Component Term | Primary Capability | Important Properties |
|---|---|---|
| `COMP_GAME_PROVIDER` | Required context root | `children`, optional `initialState` |
| `COMP_GAME_BOARD` | Board and arrow surface root | children layout tree |
| `COMP_GRID_SPACE` | Grid render + drop/click integration | `id/config`, `ctx`, `title`, `responsiveSize`, `isEntityClickable`, `getEntityStatus` |
| `COMP_POOL_SPACE` | Pool render + drag start + `POOL_PLACEMENT_GUARD` | `id/config`, `ctx`, `title` |
| `COMP_CUSTOM_SPACE` | Display-only, arrow targetable panel | `id`, `children` |
| `COMP_PROGRESS_BAR` | Per-client delivery visualization | `clientId`, `frameStatuses: FrameStatus[]`, `percentage` |
| `COMP_MODAL` | Modal stack renderer | no required props |
| `COMP_HINT` | Hint emission + display | hook + presentational component |
| `COMP_ARROWS` | Arrow overlay management | `setArrows`, `clearArrows` |
| `COMP_DRAG_OVERLAY` | Drag ghost/preview | `getEntityLabel` |
| `COMP_DRAWER_LAYOUT` | Responsive panel shell | `drawerId`, `children` |

#### 2.8.2 Arrow Declaration

If arrows are used:
- Arrow endpoints must reference declared `SPACE_*` terms.
- Arrow lifecycle must be explicit: set on activation, clear on cleanup.

### 2.9 AI Authoring Contract

#### 2.9.1 AI Allowed Actions

- Extend declaration and logic as long as Section 1 terms remain canonical.
- Introduce new terms only by first updating Section 1.
- Refactor logic to reduce side effects while preserving transition semantics.

#### 2.9.2 AI Disallowed Assumptions

- Do not assume reconnect equals global reset.
- Do not assume whole-pool replacement is valid.
- Do not assume bootstrap spaces exist at first render.
- Do not treat synonyms as canonical terms.
- Do not assume `addToSpace` on a grid space requires an explicit position (auto-placement is supported).
- Do not assume a separate ACK delay timer exists for data packets.

#### 2.9.3 AI Style Contract

- Use declarative and functional decomposition.
- Express transitions as `state + event -> next state`.
- Keep side effects at boundaries (timer callback, modal callback, runtime API call).
- Keep mutation scope client-targeted and explicit.

---

## 3) Lifecycle and Logic Specification

This section uses canonical terms only.

### 3.1 Runtime Lifecycle Sequence

1. Runtime validates declaration from Section 2.
2. Runtime bootstraps all `SPACE_*` declarations and initial entities.
3. UI checks bootstrap readiness for `SPACE_INTERNET` and `SPACE_CLIENTS` before rendering dependent `COMP_*` panels.
4. User emits `EVENT_DROP_TO_INTERNET` repeatedly during `MODE_TCP`.
5. Timer events and modal submit events drive phase progression.
6. User emits `EVENT_DROP_TO_RECEIVED` for `ENTITY_UNICAST` during `PHASE_UDP_UNICAST`.
7. User emits `EVENT_DROP_TO_INTERNET` for `ENTITY_FRAME` during `PHASE_UDP_STREAMING`.
8. Final completion occurs through `EVENT_MODAL_SUBMIT_COMPLETE`.

### 3.2 TCP Logic by Phase

#### 3.2.1 `PHASE_TCP_HANDSHAKE_SYNACK`

Entry Conditions:
- `CTX_MODE` is `MODE_TCP`.
- Handshake for currently active client set is pending.

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_SYNACK`.

State Transition Pattern:
- On valid drop:
  - Item enters `STATUS_SENDING` on `SPACE_INTERNET`.
  - Wait `EVENT_TIMER_TCP_TRANSIT_DONE` (`TIMER_INTERNET_TRAVEL_MS`).
  - Remove from `SPACE_INTERNET`, mark delivered, move received-ack to `SPACE_RECEIVED`.
  - Wait `EVENT_TIMER_TCP_ACK_DONE` (`TIMER_ACK_TRAVEL_MS`).
  - Set `CTX_TCP_CONNECTIONS[clientId] = true`.
  - Remove client from `CTX_TCP_RECONNECTING` if present.
  - Call `exposeDataPacketsForClients`: move unsent data packets for this client into `SPACE_PACKETS`.
- On invalid drop:
  - Item enters `STATUS_REJECTED` transiently and is removed.

Exit Condition:
- All required clients connected; transition to `PHASE_TCP_DATA_TRANSFER` (initial handshake) or `redoStage = "data"` (redo handshake).

#### 3.2.2 `PHASE_TCP_DATA_TRANSFER`

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_DATA`.

Validation Rules:
- Reject if target client not in `CTX_TCP_CONNECTIONS` as `true`.
- Reject if packet already in `STATUS_SENDING`.

Valid Send Rules:
- Mark dropped `ENTITY_DATA` as `STATUS_SENDING`.
- Wait `EVENT_TIMER_TCP_TRANSIT_DONE` (`TIMER_INTERNET_TRAVEL_MS`).
- In the same callback: remove from `SPACE_INTERNET`, mark `STATUS_DELIVERED`, apply HoL logic (Section 2.7.2), increment `CTX_TCP_PACKETS_SENT`.
- No separate ACK timer; indicator updates immediately.

Client D Trigger Rule:
- When `CTX_TCP_PACKETS_SENT` reaches `TRIGGER_CLIENT_D_PACKET_COUNT`, present `MODAL_TCP_NEW_CLIENT` (once) and transition to `PHASE_TCP_CHAOS_NEW_CLIENT`.

#### 3.2.3 `PHASE_TCP_CHAOS_NEW_CLIENT`

Behavior:
- Add D to `CTX_ACTIVE_TCP_CLIENTS`.
- Move `ENTITY_SYNACK` for D to `SPACE_INVENTORY`.
- Accept D-side handshake route via `ENTITY_SYNACK` for D.

Transition Rule:
- After D SYN-ACK lands, present `MODAL_TCP_TIMEOUT` (once) and set `CTX_TCP_PHASE = PHASE_TCP_CHAOS_TIMEOUT`.

#### 3.2.4 `PHASE_TCP_CHAOS_TIMEOUT`

Behavior:
- Wait for `EVENT_MODAL_SUBMIT_RECONNECT`.

Reconnect Action Rules:
- Enter `PHASE_TCP_CHAOS_REDO` with `CTX_REDO_STAGE = "handshake"`.
- For each of A/B/C:
  - Set `CTX_TCP_CONNECTIONS[clientId] = false`.
  - Clear `CTX_TCP_WAITING_SEQS[clientId]`.
  - Add to `CTX_TCP_RECONNECTING`.
  - Move `ENTITY_SYNACK` back to `SPACE_INVENTORY`.
  - Remove unsent `ENTITY_DATA` packets (seqs not in `CTX_TCP_DELIVERED_COUNTS[clientId]`) from all spaces.
- Preserve D-related inventory and `CTX_TCP_DELIVERED_COUNTS` entirely per `POOL_PRESERVE_UNAFFECTED`.
- Do not clear `CTX_TCP_DELIVERED_COUNTS` for A/B/C.

#### 3.2.5 `PHASE_TCP_CHAOS_REDO`

Sub-Stages:
- `CTX_REDO_STAGE = "handshake"`: re-handshake A/B/C using `ENTITY_SYNACK`.
- `CTX_REDO_STAGE = "data"`: once all A/B/C reconnect, expose their unsent data packets and accept sends.

Handshake completion per client:
- Same flow as `PHASE_TCP_HANDSHAKE_SYNACK`.
- When all A/B/C reconnected: set `CTX_REDO_STAGE = "data"`, call `exposeDataPacketsForClients` for reconnected clients.

Data send in redo:
- Same flow as `PHASE_TCP_DATA_TRANSFER`.
- First acked data packet in redo triggers `PHASE_TCP_BREAKING_POINT`.

#### 3.2.6 `PHASE_TCP_BREAKING_POINT`

Behavior:
- Present `MODAL_TCP_EXHAUSTION` (once).
- Wait for `EVENT_MODAL_SUBMIT_CONTINUE`.

Transition Rule:
- On continue, set `CTX_MODE = MODE_UDP`, `CTX_UDP_PHASE = PHASE_UDP_INTRO`.
- Clear TCP transit artifacts from `SPACE_INTERNET`.
- Clear TCP pools.
- Schedule `EVENT_TIMER_UDP_INTRO_DONE` after `TIMER_UDP_INTRO_DELAY_MS`.

### 3.3 UDP Logic by Phase

#### 3.3.1 `PHASE_UDP_INTRO`

Behavior:
- Mode has just switched to `MODE_UDP`.
- TCP artifacts cleared.
- Start `TIMER_UDP_INTRO_DELAY_MS` timer.

Transition Rule:
- On `EVENT_TIMER_UDP_INTRO_DONE`: set `CTX_UDP_PHASE = PHASE_UDP_UNICAST`, inject all three `ENTITY_UNICAST` items into `SPACE_INTERNET` via auto-placement.

#### 3.3.2 `PHASE_UDP_UNICAST`

Behavior:
- A/B/C unicast response items appear in `SPACE_INTERNET`.
- User must drag each `ENTITY_UNICAST` from `SPACE_INTERNET` to `SPACE_RECEIVED`.
- `ENTITY_UNICAST` `allowedPlaces` is `["internet", "received"]`; drops to any other pool are rejected by `POOL_PLACEMENT_GUARD`.

Allowed Core Event:
- `EVENT_DROP_TO_RECEIVED` with `ENTITY_UNICAST`.

Per-unicast-drop rules:
- Mark entity state `"sending"` briefly, then remove from `SPACE_INTERNET`.
- Increment `CTX_UNICASTS_RECEIVED`.

Transition Rule:
- When `CTX_UNICASTS_RECEIVED` equals count of `UDP_CLIENT_IDS` (3): set `CTX_UDP_PHASE = PHASE_UDP_STREAMING`, inject `ENTITY_FRAME` items into `SPACE_PACKETS`.

#### 3.3.3 `PHASE_UDP_STREAMING`

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_FRAME`.

Ordering Rule:
- Only frame with `frameNumber === CTX_LAST_SENT_FRAME + 1` is valid.

Wrong-Order Rule:
- Mark as `STATUS_WRONG_ORDER`.
- Display notice for `TIMER_NOTICE_MS`.
- Remove frame from `SPACE_INTERNET` after notice window.

Correct-Order Rule:
- Mark as `STATUS_SENDING`.
- Increment `CTX_LAST_SENT_FRAME`.
- Keep visible in `SPACE_INTERNET` until `EVENT_TIMER_UDP_FRAME_DONE` (`TIMER_FRAME_SEND_MS`).
- Remove frame from transit after timer completion.
- Apply delivery outcome map to A/B/C:
  - seq 1 → A delivered, B delivered, C delivered
  - seq 2 → A delivered, B delivered, C lost
  - seq 3 → A delivered, B delivered, C delivered
  - seq 4 → A lost, B delivered, C delivered
  - seq 5 → A delivered, B lost, C delivered
  - seq 6 → A delivered, B delivered, C delivered

Transition Rule:
- After frame 6 resolves, set `CTX_UDP_PHASE = PHASE_UDP_COMPLETE`.

#### 3.3.4 `PHASE_UDP_COMPLETE`

Behavior:
- Present `MODAL_UDP_SUCCESS`.
- Mark question progress complete.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_COMPLETE`, execute completion handoff callback.

### 3.4 Hint and Progress Logic

Hint source inputs:
- `CTX_MODE`
- `CTX_TCP_PHASE` / `CTX_UDP_PHASE`
- `CTX_LAST_SENT_FRAME`
- `CTX_TCP_PACKETS_SENT`
- `CTX_TCP_CONNECTIONS`

TCP progress bar vocabulary (per `COMP_PROGRESS_BAR` `FrameStatus`):
- `"received"` — delivered (green)
- `"out-of-order"` — HoL buffered (yellow)
- `"pending"` — not yet sent or reconnecting (gray)

UDP progress bar vocabulary:
- `"delivered"` — green
- `"lost"` — red
- `"pending"` — gray

---

## 4) Transition Matrices

### 4.1 TCP Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_DROP_TO_INTERNET` with `ENTITY_SYNACK` | client eligible, not already connected | set `STATUS_SENDING`, schedule `EVENT_TIMER_TCP_TRANSIT_DONE` | stays |
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_TIMER_TCP_TRANSIT_DONE` | in-flight SYNACK exists | remove from internet, update handshake state, schedule `EVENT_TIMER_TCP_ACK_DONE` | stays |
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_TIMER_TCP_ACK_DONE` | transit+ack chain valid | mark `CTX_TCP_CONNECTIONS[id] = true`, remove from `CTX_TCP_RECONNECTING`, expose data packets | `PHASE_TCP_DATA_TRANSFER` when all targets connected |
| `PHASE_TCP_DATA_TRANSFER` | `EVENT_DROP_TO_INTERNET` with `ENTITY_DATA` | client connected, packet not sending | set `STATUS_SENDING`, schedule `EVENT_TIMER_TCP_TRANSIT_DONE` | stays |
| `PHASE_TCP_DATA_TRANSFER` | `EVENT_TIMER_TCP_TRANSIT_DONE` | in-flight data packet exists | remove from internet, apply HoL logic, increment `CTX_TCP_PACKETS_SENT` | stays or `PHASE_TCP_CHAOS_NEW_CLIENT` |
| `PHASE_TCP_DATA_TRANSFER` | `CTX_TCP_PACKETS_SENT` reaches `TRIGGER_CLIENT_D_PACKET_COUNT` | threshold exact | present `MODAL_TCP_NEW_CLIENT`, enable D path | `PHASE_TCP_CHAOS_NEW_CLIENT` |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | D handshake completed | D eligible and SYN-ACK landed | present `MODAL_TCP_TIMEOUT` | `PHASE_TCP_CHAOS_TIMEOUT` |
| `PHASE_TCP_CHAOS_TIMEOUT` | `EVENT_MODAL_SUBMIT_RECONNECT` | modal open | scoped reconnect A/B/C only; hide unsent packets; add to `CTX_TCP_RECONNECTING` | `PHASE_TCP_CHAOS_REDO` |
| `PHASE_TCP_CHAOS_REDO` | all A/B/C SYN-ACK landed | `CTX_REDO_STAGE = "handshake"` | set `CTX_REDO_STAGE = "data"`, expose unsent data packets | stays |
| `PHASE_TCP_CHAOS_REDO` | first redo data packet acked | `CTX_REDO_STAGE = "data"` | present `MODAL_TCP_EXHAUSTION` | `PHASE_TCP_BREAKING_POINT` |
| `PHASE_TCP_BREAKING_POINT` | `EVENT_MODAL_SUBMIT_CONTINUE` | modal open | switch mode, clear TCP transit, schedule `EVENT_TIMER_UDP_INTRO_DONE` | `PHASE_UDP_INTRO` |

### 4.2 UDP Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_UDP_INTRO` | `EVENT_TIMER_UDP_INTRO_DONE` | intro timer started | set `CTX_UDP_PHASE = PHASE_UDP_UNICAST`, inject `ENTITY_UNICAST` into `SPACE_INTERNET` | `PHASE_UDP_UNICAST` |
| `PHASE_UDP_UNICAST` | `EVENT_DROP_TO_RECEIVED` with `ENTITY_UNICAST` | `CTX_UDP_PHASE = PHASE_UDP_UNICAST` | remove from internet, increment `CTX_UNICASTS_RECEIVED` | stays or `PHASE_UDP_STREAMING` |
| `PHASE_UDP_UNICAST` | `CTX_UNICASTS_RECEIVED` reaches 3 | all unicasts received | inject `ENTITY_FRAME` into `SPACE_PACKETS` | `PHASE_UDP_STREAMING` |
| `PHASE_UDP_STREAMING` | `EVENT_DROP_TO_INTERNET` wrong-order `ENTITY_FRAME` | seq mismatch | mark `STATUS_WRONG_ORDER`, remove after `TIMER_NOTICE_MS` | stays |
| `PHASE_UDP_STREAMING` | `EVENT_DROP_TO_INTERNET` correct-order `ENTITY_FRAME` | seq matches `CTX_LAST_SENT_FRAME + 1` | mark `STATUS_SENDING`, increment `CTX_LAST_SENT_FRAME`, schedule `EVENT_TIMER_UDP_FRAME_DONE` | stays |
| `PHASE_UDP_STREAMING` | `EVENT_TIMER_UDP_FRAME_DONE` | in-flight frame exists | remove frame from transit, apply delivery map | stays or `PHASE_UDP_COMPLETE` |
| `PHASE_UDP_COMPLETE` | `EVENT_MODAL_SUBMIT_COMPLETE` | `MODAL_UDP_SUCCESS` open | execute completion handoff | terminal state |

### 4.3 Modal Action Matrix

| Modal Term | Action | State Mutation Scope | Follow-up |
|---|---|---|---|
| `MODAL_TCP_NEW_CLIENT` | close | no state change | continue in `PHASE_TCP_CHAOS_NEW_CLIENT` |
| `MODAL_TCP_TIMEOUT` | `reconnect` | A/B/C scoped reset only; D preserved | enter `PHASE_TCP_CHAOS_REDO` |
| `MODAL_TCP_EXHAUSTION` | `continue` | stage transition scope | enter `PHASE_UDP_INTRO` |
| `MODAL_UDP_SUCCESS` | `complete` | progress completion scope | exit question callback |

---

## 5) Term-to-Logic Link Index

Use this index to verify one-to-one alignment.

### 5.1 Space Terms -> Logic Usage

| Space Term | Declared In | Used In Logic Sections |
|---|---|---|
| `SPACE_INTERNET` | 1.3, 2.2 | 3.1, 3.2, 3.3, 4.1, 4.2 |
| `SPACE_CLIENTS` | 1.3, 2.2 | 2.7, 3.4 |
| `SPACE_INVENTORY` | 1.3, 2.2 | 2.3.3, 3.2.3 |
| `SPACE_PACKETS` | 1.3, 2.2 | 2.3.3, 3.2.1, 3.2.5, 3.3.2 |
| `SPACE_RECEIVED` | 1.3, 2.2 | 3.2.1, 3.3.2 |

### 5.2 Entity Terms -> Logic Usage

| Entity Term | Declared In | Used In Logic Sections |
|---|---|---|
| `ENTITY_SYNACK` | 1.5, 2.3 | 3.2.1, 3.2.3, 4.1 |
| `ENTITY_DATA` | 1.5, 2.3 | 2.7, 3.2.2, 3.2.4, 4.1 |
| `ENTITY_FRAME` | 1.5, 2.3 | 3.3.2, 3.3.3, 4.2 |
| `ENTITY_UNICAST` | 1.5, 2.3 | 3.3.1, 3.3.2, 4.2 |

### 5.3 Phase Terms -> Logic Usage

| Phase Term | Declared In | Used In Logic Sections |
|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | 1.7, 2.5 | 3.2.1, 4.1 |
| `PHASE_TCP_DATA_TRANSFER` | 1.7, 2.5 | 3.2.2, 4.1 |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | 1.7, 2.5 | 3.2.3, 4.1 |
| `PHASE_TCP_CHAOS_TIMEOUT` | 1.7, 2.5 | 3.2.4, 4.1 |
| `PHASE_TCP_CHAOS_REDO` | 1.7, 2.5 | 3.2.5, 4.1 |
| `PHASE_TCP_BREAKING_POINT` | 1.7, 2.5 | 3.2.6, 4.1 |
| `PHASE_UDP_INTRO` | 1.8, 2.5 | 3.3.1, 4.2 |
| `PHASE_UDP_UNICAST` | 1.8, 2.5 | 3.3.2, 4.2 |
| `PHASE_UDP_STREAMING` | 1.8, 2.5 | 3.3.3, 4.2 |
| `PHASE_UDP_COMPLETE` | 1.8, 2.5 | 3.3.4, 4.2 |

### 5.4 Modal Terms -> Logic Usage

| Modal Term | Declared In | Used In Logic Sections |
|---|---|---|
| `MODAL_TCP_NEW_CLIENT` | 1.9, 2.6 | 3.2.3, 4.1 |
| `MODAL_TCP_TIMEOUT` | 1.9, 2.6 | 3.2.3, 3.2.4, 4.3 |
| `MODAL_TCP_EXHAUSTION` | 1.9, 2.6 | 3.2.6, 4.3 |
| `MODAL_UDP_SUCCESS` | 1.9, 2.6 | 3.3.4, 4.3 |

### 5.5 Timing Terms -> Logic Usage

| Timing Term | Declared In | Used In Logic Sections |
|---|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | 1.10 | 3.2.1, 3.2.2 |
| `TIMER_ACK_TRAVEL_MS` | 1.10 | 3.2.1 |
| `TIMER_NOTICE_MS` | 1.10 | 3.3.3 |
| `TIMER_FRAME_SEND_MS` | 1.10 | 3.3.3 |
| `TIMER_UDP_INTRO_DELAY_MS` | 1.10 | 3.3.1 |
| `TRIGGER_CLIENT_D_PACKET_COUNT` | 1.10 | 3.2.2, 4.1 |

### 5.6 Context State Terms -> Logic Usage

| Context Term | Declared In | Used In Logic Sections |
|---|---|---|
| `CTX_TCP_CONNECTIONS` | 1.13 | 3.2.1, 3.2.2, 3.2.4 |
| `CTX_TCP_DELIVERED_COUNTS` | 1.13 | 2.7.1, 2.7.2, 3.2.4 |
| `CTX_TCP_WAITING_SEQS` | 1.13 | 2.7.1, 2.7.2, 3.2.4 |
| `CTX_TCP_RECONNECTING` | 1.13 | 2.7.1, 3.2.1, 3.2.4 |
| `CTX_TCP_PACKETS_SENT` | 1.13 | 3.2.2, 4.1 |
| `CTX_ACTIVE_TCP_CLIENTS` | 1.13 | 3.2.3 |
| `CTX_UNICASTS_RECEIVED` | 1.13 | 3.3.2, 4.2 |
| `CTX_LAST_SENT_FRAME` | 1.13 | 2.7.3, 3.3.3 |

---

## 6) Hard Invariants

All implementations derived from this blueprint must preserve every invariant below.

1. `ENTITY_FRAME` correct-order send must keep visible `STATUS_SENDING` on `SPACE_INTERNET` until `EVENT_TIMER_UDP_FRAME_DONE`.
2. Client D reveal threshold must remain exactly `TRIGGER_CLIENT_D_PACKET_COUNT = 4`.
3. `EVENT_MODAL_SUBMIT_RECONNECT` must reset A/B/C connection flags only and preserve D-related inventory/progress entirely.
4. Pool mutation during reconnect must satisfy `POOL_MUTATION_SCOPED`, `POOL_MUTATION_INCREMENTAL`, `POOL_PRESERVE_UNAFFECTED`, and `POOL_PLACEMENT_GUARD`.
5. Space-dependent UI must not render before bootstrap readiness for declared spaces.
6. `MODE_TCP` -> `MODE_UDP` transition must clear TCP transit artifacts before unicast/frame flow begins.
7. Wrong-order UDP frames must not advance `CTX_LAST_SENT_FRAME`.
8. `CTX_TCP_DELIVERED_COUNTS` must never be cleared on reconnect; delivered progress is permanent.
9. `CTX_TCP_WAITING_SEQS` must be cleared on reconnect; buffered out-of-order packets are lost on timeout.
10. Progress bar indicator for data packets must update in the same callback that removes the packet from `SPACE_INTERNET`; no separate ACK delay timer is permitted.
11. `ENTITY_UNICAST` `allowedPlaces` must be exactly `["internet", "received"]`; drops to `SPACE_PACKETS` or `SPACE_INVENTORY` must be rejected by `POOL_PLACEMENT_GUARD`.
12. `ENTITY_UNICAST` injection into `SPACE_INTERNET` must use auto-placement (no explicit grid position required); the engine fills the first available cell.
13. `PHASE_UDP_UNICAST` must complete (all 3 unicasts received) before `ENTITY_FRAME` items are exposed in `SPACE_PACKETS`.

---

## 7) Non-Goals

1. This blueprint does not mandate behavior-rule-only architecture.
2. This blueprint does not define visual theme or typography decisions.
3. This blueprint does not enforce terminal gameplay usage for this question.
4. This blueprint does not require arrow overlays; arrows are optional.
5. This blueprint does not define the internal rendering of `COMP_PROGRESS_BAR` beyond the slot status contract in Section 2.7.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 if new concepts are introduced.
2. Update Section 2 declarations for structural changes.
3. Update Section 3 logic with canonical terms only.
4. Update Section 4 transition matrices.
5. Update Section 5 term-link index.
6. Re-check Section 6 invariants.

### 8.2 Consistency Checks

- Each logic sentence should reference at least one canonical ID family (`PHASE_*`, `ENTITY_*`, `SPACE_*`, `EVENT_*`, `MODAL_*`, `TIMER_*`, `MODE_*`, `CTX_*`).
- No undeclared synonyms should appear in transition-critical paragraphs.
- Every `PHASE_*` used in Sections 3 and 4 must exist in Section 1.7 or 1.8.
- Every modal action used in Section 4.3 must exist in Section 1.9.
- Every timer mentioned in logic must exist in Section 1.10.
- Every context field referenced must exist in Section 1.13.

### 8.3 Quality Gates

When code behavior changes, run:
- `pnpm check:biome`
- `pnpm check:tsc`

For docs-only updates:
- Validate section order and internal references.
- Validate all tables preserve one-to-one declaration-to-logic mapping.
