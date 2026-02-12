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
- Avoid alternate labels (for example, do not swap `PHASE_TCP_CHAOS_REDO` with “retry chaos phase”).
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
| `SPACE_CLIENT_A` | `client-a` | `custom` | Client A status/progress panel |
| `SPACE_CLIENT_B` | `client-b` | `custom` | Client B status/progress panel |
| `SPACE_CLIENT_C` | `client-c` | `custom` | Client C status/progress panel |
| `SPACE_CLIENT_D` | `client-d` | `custom` | Late-join client status/progress panel |
| `SPACE_INVENTORY` | `inventory` | `pool` | Outgoing selectable items |
| `SPACE_RECEIVED` | `received` | `pool` | Receive/ack visualization items |

### 1.4 Pool Semantics Terms

| Term ID | Meaning |
|---|---|
| `POOL_MUTATION_SCOPED` | Pool writes modify only affected client subsets |
| `POOL_MUTATION_INCREMENTAL` | Pool writes add/remove/merge targeted items, not full replacement |
| `POOL_PRESERVE_UNAFFECTED` | Unaffected client items remain visible |

### 1.5 Entity Family Terms

| Term ID | Family | Count | Required Metadata |
|---|---|---|---|
| `ENTITY_SYNACK` | `syn-ack-packet` | 4 (A/B/C/D) | `clientId` |
| `ENTITY_DATA` | `data-packet` | 24 (A/B/C/D x 1..6) | `clientId`, `seq` |
| `ENTITY_FRAME` | `frame` | 6 (1..6) | `seq` |

### 1.6 Status Terms

| Term ID | UI Label | Meaning |
|---|---|---|
| `STATUS_SENDING` | `Sending` | Valid in-flight transit state |
| `STATUS_REJECTED` | `Rejected` | Invalid action rejected during TCP |
| `STATUS_WRONG_ORDER` | `Wrong order` | Invalid frame order rejected during UDP |
| `STATUS_DELIVERED` | `delivered` | UDP frame destination success state |
| `STATUS_LOST` | `lost` | UDP frame destination loss state |
| `STATUS_PENDING` | `pending` | Not yet delivered/resolved |

### 1.7 TCP Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | `handshake-synack` | Send SYN-ACK for current clients |
| `PHASE_TCP_CONNECTED` | `connected` | Connected checkpoint |
| `PHASE_TCP_DATA_TRANSFER` | `data-transfer` | Main TCP data sending |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | `chaos-new-client` | Introduce client D workload |
| `PHASE_TCP_CHAOS_TIMEOUT` | `chaos-timeout` | Timeout pressure prompt |
| `PHASE_TCP_CHAOS_REDO` | `chaos-redo` | Scoped reconnect of A/B/C |
| `PHASE_TCP_BREAKING_POINT` | `breaking-point` | Transition pressure before UDP |

### 1.8 UDP Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_UDP_INTRO` | `intro` | Transition/setup into UDP |
| `PHASE_UDP_STREAMING` | `streaming` | Ordered frame sending |
| `PHASE_UDP_COMPLETE` | `complete` | Completion checkpoint |

### 1.9 Modal Terms

| Term ID | Modal ID | Action ID |
|---|---|---|
| `MODAL_TCP_CONNECTED` | `tcp-connected` | implicit continue/close |
| `MODAL_TCP_NEW_CLIENT` | `tcp-new-client` | implicit continue/close |
| `MODAL_TCP_TIMEOUT` | `tcp-timeout` | `reconnect` |
| `MODAL_TCP_EXHAUSTION` | `tcp-exhaustion` | `continue` |
| `MODAL_UDP_SUCCESS` | `udp-success` | `complete` |

### 1.10 Timing Terms

| Term ID | Value (ms) | Meaning |
|---|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | `1500` | TCP transit delay |
| `TIMER_ACK_TRAVEL_MS` | `1000` | ACK delay after SYN-ACK |
| `TIMER_DATA_ACK_MS` | `500` | ACK delay after TCP data send |
| `TIMER_NOTICE_MS` | `2000` | Transient notice duration |
| `TIMER_FRAME_SEND_MS` | `1500` | UDP frame send transit duration |
| `TIMER_UDP_INTRO_DELAY_MS` | `200` | Delay before UDP streaming starts |
| `TRIGGER_CLIENT_D_PACKET_COUNT` | `4` | TCP sent-packet threshold to reveal D |

### 1.11 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_DROP_TO_INTERNET` | User drops packet/frame into `SPACE_INTERNET` |
| `EVENT_MODAL_SUBMIT_RECONNECT` | Submit `MODAL_TCP_TIMEOUT` with action `reconnect` |
| `EVENT_MODAL_SUBMIT_CONTINUE` | Submit `MODAL_TCP_EXHAUSTION` with action `continue` |
| `EVENT_MODAL_SUBMIT_COMPLETE` | Submit `MODAL_UDP_SUCCESS` with action `complete` |
| `EVENT_TIMER_TCP_TRANSIT_DONE` | `TIMER_INTERNET_TRAVEL_MS` callback |
| `EVENT_TIMER_TCP_ACK_DONE` | `TIMER_ACK_TRAVEL_MS` callback |
| `EVENT_TIMER_TCP_DATA_ACK_DONE` | `TIMER_DATA_ACK_MS` callback |
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
| `COMP_MODAL` | `Modal` |
| `COMP_HINT` | `ContextualHint` + `useContextualHint` |
| `COMP_ARROWS` | `useBoardArrows` |
| `COMP_DRAG_OVERLAY` | `DragOverlay` |
| `COMP_DRAWER_LAYOUT` | `DrawerLayout` |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID` must equal `udp-video-streaming`.
- `QUESTION_TITLE` must equal `📺 Stream movie.mp4 to 3 viewers`.
- `QUESTION_DESCRIPTION` must describe TCP setup overhead then UDP streaming completion.

### 2.2 Space Declaration

#### 2.2.1 Space Set

The question must declare all seven canonical spaces:
- `SPACE_INTERNET`
- `SPACE_CLIENT_A`
- `SPACE_CLIENT_B`
- `SPACE_CLIENT_C`
- `SPACE_CLIENT_D`
- `SPACE_INVENTORY`
- `SPACE_RECEIVED`

#### 2.2.2 Space Roles

| Space Term | Role | Allowed Gameplay Interaction |
|---|---|---|
| `SPACE_INTERNET` | Transit route | Drop target for sendable entities |
| `SPACE_CLIENT_A` | Client panel | Display-only |
| `SPACE_CLIENT_B` | Client panel | Display-only |
| `SPACE_CLIENT_C` | Client panel | Display-only |
| `SPACE_CLIENT_D` | Dynamic client panel | Display-only |
| `SPACE_INVENTORY` | Outgoing source pool | Select and drag items out |
| `SPACE_RECEIVED` | Receive artifact pool | Display receive states/items |

#### 2.2.3 Space Bootstrap Guard Contract

- Any UI that renders `COMP_CUSTOM_SPACE` or `COMP_GRID_SPACE` for these spaces must ensure runtime bootstrap completion.
- Rendering before bootstrap can produce missing-space warnings.
- Required guard intent: `boardReady` style predicate over declared spaces.

### 2.3 Entity Declaration

#### 2.3.1 Entity Family Inventory

| Entity Term | Required IDs and Count | Initial Presence |
|---|---|---|
| `ENTITY_SYNACK` | A/B/C/D variants, total 4 | A/B/C initially visible in `SPACE_INVENTORY` |
| `ENTITY_DATA` | A/B/C/D, each `seq` 1..6, total 24 | Availability progresses by connection state |
| `ENTITY_FRAME` | `seq` 1..6, total 6 | Injected when transitioning into `MODE_UDP` |

#### 2.3.2 Entity Metadata Contract

For every entity declaration:
- Must have stable `id`.
- Must have `allowedPlaces` including all intended routes.
- `ENTITY_DATA` requires `clientId` and `seq`.
- `ENTITY_FRAME` requires `seq`.
- `ENTITY_SYNACK` requires `clientId`.

#### 2.3.3 Placement Contract

- `ENTITY_SYNACK` for A/B/C begins in `SPACE_INVENTORY`.
- `ENTITY_SYNACK` for D becomes available during `PHASE_TCP_CHAOS_NEW_CLIENT` pathway.
- `ENTITY_FRAME` enters `SPACE_INVENTORY` only after `MODE_TCP` concludes.

### 2.4 Pool and Group Declaration

#### 2.4.1 Pool Update Principles

Every pool mutation must satisfy:
- `POOL_MUTATION_SCOPED`
- `POOL_MUTATION_INCREMENTAL`
- `POOL_PRESERVE_UNAFFECTED`

#### 2.4.2 Reconnect-Specific Pool Declaration

During reconnect path (`EVENT_MODAL_SUBMIT_RECONNECT`):
- Reset only A/B/C-related pool state.
- Preserve D-related availability.
- Do not rewrite entire `SPACE_INVENTORY` snapshot.

### 2.5 Mode and Phase Declaration

#### 2.5.1 Mode Declaration

| Mode Term | Objective |
|---|---|
| `MODE_TCP` | Demonstrate per-client setup and reliability overhead |
| `MODE_UDP` | Demonstrate sequential media streaming with tolerated loss |

#### 2.5.2 TCP Phase Order Declaration

1. `PHASE_TCP_HANDSHAKE_SYNACK`
2. `PHASE_TCP_CONNECTED`
3. `PHASE_TCP_DATA_TRANSFER`
4. `PHASE_TCP_CHAOS_NEW_CLIENT`
5. `PHASE_TCP_CHAOS_TIMEOUT`
6. `PHASE_TCP_CHAOS_REDO`
7. `PHASE_TCP_BREAKING_POINT`

#### 2.5.3 UDP Phase Order Declaration

1. `PHASE_UDP_INTRO`
2. `PHASE_UDP_STREAMING`
3. `PHASE_UDP_COMPLETE`

### 2.6 Modal Declaration

| Modal Term | Availability Context | Must Trigger |
|---|---|---|
| `MODAL_TCP_CONNECTED` | Early stable connection checkpoint | Learning feedback |
| `MODAL_TCP_NEW_CLIENT` | `TRIGGER_CLIENT_D_PACKET_COUNT` reached | Introduce `SPACE_CLIENT_D` workload |
| `MODAL_TCP_TIMEOUT` | D joins and pressure escalates | Offer `EVENT_MODAL_SUBMIT_RECONNECT` |
| `MODAL_TCP_EXHAUSTION` | Breaking-point condition reached | Offer `EVENT_MODAL_SUBMIT_CONTINUE` |
| `MODAL_UDP_SUCCESS` | UDP flow finished | Offer `EVENT_MODAL_SUBMIT_COMPLETE` |

### 2.7 Arrow and Component Declaration

#### 2.7.1 Component Capability Map

| Component Term | Primary Capability | Important Properties |
|---|---|---|
| `COMP_GAME_PROVIDER` | Required context root | `children`, optional `initialState` |
| `COMP_GAME_BOARD` | Board and arrow surface root | children layout tree |
| `COMP_GRID_SPACE` | Grid render + drop/click integration | `id/config`, `ctx`, `title`, `responsiveSize`, `onEntityClick`, `isEntityClickable`, `getEntityLabel`, `getEntityStatus` |
| `COMP_POOL_SPACE` | Pool render + drag start | `id/config`, `ctx`, `title` |
| `COMP_CUSTOM_SPACE` | Display-only, arrow targetable panel | `id`, `children` |
| `COMP_MODAL` | Modal stack renderer | no required props |
| `COMP_HINT` | Hint emission + display | hook + presentational component |
| `COMP_ARROWS` | Arrow overlay management | `setArrows`, `clearArrows` |
| `COMP_DRAG_OVERLAY` | Drag ghost/preview | `getEntityLabel` |
| `COMP_DRAWER_LAYOUT` | Responsive panel shell | `drawerId`, `children` |

#### 2.7.2 Arrow Declaration

If arrows are used:
- Arrow endpoints must reference declared `SPACE_*` terms.
- Arrow lifecycle must be explicit: set on activation, clear on cleanup.

### 2.8 AI Authoring Contract

#### 2.8.1 AI Allowed Actions

- Extend declaration and logic as long as Section 1 terms remain canonical.
- Introduce new terms only by first updating Section 1.
- Refactor logic to reduce side effects while preserving transition semantics.

#### 2.8.2 AI Disallowed Assumptions

- Do not assume reconnect equals global reset.
- Do not assume whole-pool replacement is valid.
- Do not assume bootstrap spaces exist at first render.
- Do not treat synonyms as canonical terms.

#### 2.8.3 AI Style Contract

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
3. UI checks bootstrap readiness for `SPACE_INTERNET` and `SPACE_CLIENT_*` before rendering dependent `COMP_*` panels.
4. User emits `EVENT_DROP_TO_INTERNET` repeatedly.
5. Timer events and modal submit events drive phase progression.
6. Final completion occurs through `EVENT_MODAL_SUBMIT_COMPLETE`.

### 3.2 TCP Logic by Phase

#### 3.2.1 `PHASE_TCP_HANDSHAKE_SYNACK`

Entry Conditions:
- `MODE_TCP` active.
- Handshake for currently active client set is pending.

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_SYNACK`.

State Transition Pattern:
- On valid drop:
  - Item enters `STATUS_SENDING` on `SPACE_INTERNET`.
  - Wait `EVENT_TIMER_TCP_TRANSIT_DONE`.
  - Then wait `EVENT_TIMER_TCP_ACK_DONE`.
  - Client connection state marks connected.
- On invalid drop:
  - Item enters `STATUS_REJECTED` transiently and is removed.

Exit Condition:
- Required handshake targets complete; transition to `PHASE_TCP_CONNECTED`.

#### 3.2.2 `PHASE_TCP_CONNECTED`

Entry Conditions:
- Handshake completion reached for current client set.

Behavior:
- Present `MODAL_TCP_CONNECTED`.
- Enable `ENTITY_DATA` availability for connected clients.

Exit Condition:
- Resume sending flow in `PHASE_TCP_DATA_TRANSFER`.

#### 3.2.3 `PHASE_TCP_DATA_TRANSFER`

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_DATA`.

Validation Rules:
- Reject if target client disconnected.
- Reject if target client send-lock active.

Valid Send Rules:
- Mark dropped `ENTITY_DATA` as `STATUS_SENDING`.
- Wait `EVENT_TIMER_TCP_TRANSIT_DONE`.
- Wait `EVENT_TIMER_TCP_DATA_ACK_DONE`.
- Increment sent packet counter.

Client D Trigger Rule:
- When sent packet count reaches `TRIGGER_CLIENT_D_PACKET_COUNT`, present `MODAL_TCP_NEW_CLIENT` and transition path to `PHASE_TCP_CHAOS_NEW_CLIENT`.

#### 3.2.4 `PHASE_TCP_CHAOS_NEW_CLIENT`

Behavior:
- Enable `SPACE_CLIENT_D` participation.
- Accept D-side handshake route via `ENTITY_SYNACK` for D.

Transition Rule:
- After D connection progression completes, present `MODAL_TCP_TIMEOUT` and set phase `PHASE_TCP_CHAOS_TIMEOUT`.

#### 3.2.5 `PHASE_TCP_CHAOS_TIMEOUT`

Behavior:
- Wait for `EVENT_MODAL_SUBMIT_RECONNECT`.

Reconnect Action Rules:
- Enter `PHASE_TCP_CHAOS_REDO`.
- Apply reconnect mutation only to A/B/C related state.
- Preserve D-related inventory and progress according to `POOL_PRESERVE_UNAFFECTED`.

#### 3.2.6 `PHASE_TCP_CHAOS_REDO`

Behavior:
- Re-established sending path for A/B/C.
- First successful resend progression can trigger breaking pressure.

Transition Rule:
- Move to `PHASE_TCP_BREAKING_POINT` when breaking condition is met.

#### 3.2.7 `PHASE_TCP_BREAKING_POINT`

Behavior:
- Present `MODAL_TCP_EXHAUSTION`.
- Wait for `EVENT_MODAL_SUBMIT_CONTINUE`.

Transition Rule:
- On continue, switch `MODE_TCP` -> `MODE_UDP`.
- Clear TCP transit artifacts from `SPACE_INTERNET`.
- Prepare UDP inventory injection for `ENTITY_FRAME`.

### 3.3 UDP Logic by Phase

#### 3.3.1 `PHASE_UDP_INTRO`

Behavior:
- On mode switch, inject `ENTITY_FRAME` into `SPACE_INVENTORY`.
- Start `EVENT_TIMER_UDP_INTRO_DONE`.

Transition Rule:
- After intro timer, enter `PHASE_UDP_STREAMING`.

#### 3.3.2 `PHASE_UDP_STREAMING`

Allowed Core Event:
- `EVENT_DROP_TO_INTERNET` with `ENTITY_FRAME`.

Ordering Rule:
- Only expected sequence number is valid.

Wrong-Order Rule:
- Mark as `STATUS_WRONG_ORDER`.
- Keep visible briefly.
- Remove after notice window.

Correct-Order Rule:
- Mark as `STATUS_SENDING`.
- Keep visible in `SPACE_INTERNET` until `EVENT_TIMER_UDP_FRAME_DONE`.
- Remove frame from transit after timer completion.
- Apply delivery outcome map to A/B/C:
  - seq 1 -> A delivered, B delivered, C delivered
  - seq 2 -> A delivered, B delivered, C lost
  - seq 3 -> A delivered, B delivered, C delivered
  - seq 4 -> A lost, B delivered, C delivered
  - seq 5 -> A delivered, B lost, C delivered
  - seq 6 -> A delivered, B delivered, C delivered

Transition Rule:
- After sequence 6 resolves, enter `PHASE_UDP_COMPLETE`.

#### 3.3.3 `PHASE_UDP_COMPLETE`

Behavior:
- Present `MODAL_UDP_SUCCESS`.
- Mark question progress complete.

Exit Rule:
- On `EVENT_MODAL_SUBMIT_COMPLETE`, execute completion handoff callback.

### 3.4 Hint and Progress Logic

Hint source inputs:
- active mode (`MODE_TCP` or `MODE_UDP`)
- active phase (`PHASE_*`)
- expected UDP frame sequence
- sent packet count

TCP progress vocabulary:
- `received`
- `out-of-order`
- `missing`

UDP progress vocabulary:
- `STATUS_PENDING`
- `STATUS_DELIVERED`
- `STATUS_LOST`

---

## 4) Transition Matrices

### 4.1 TCP Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_DROP_TO_INTERNET` with `ENTITY_SYNACK` | target client eligible | set `STATUS_SENDING`, schedule `EVENT_TIMER_TCP_TRANSIT_DONE` | `PHASE_TCP_HANDSHAKE_SYNACK` |
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_TIMER_TCP_TRANSIT_DONE` | in-flight SYNACK exists | update handshake state, schedule `EVENT_TIMER_TCP_ACK_DONE` | `PHASE_TCP_HANDSHAKE_SYNACK` |
| `PHASE_TCP_HANDSHAKE_SYNACK` | `EVENT_TIMER_TCP_ACK_DONE` | transit+ack chain valid | mark connected, reveal connected artifacts | `PHASE_TCP_CONNECTED` when targets done |
| `PHASE_TCP_DATA_TRANSFER` | `EVENT_DROP_TO_INTERNET` with `ENTITY_DATA` | client connected and unlocked | set `STATUS_SENDING`, schedule `EVENT_TIMER_TCP_TRANSIT_DONE` and `EVENT_TIMER_TCP_DATA_ACK_DONE` | `PHASE_TCP_DATA_TRANSFER` |
| `PHASE_TCP_DATA_TRANSFER` | packet count reaches `TRIGGER_CLIENT_D_PACKET_COUNT` | threshold exact | present `MODAL_TCP_NEW_CLIENT`, enable D path | `PHASE_TCP_CHAOS_NEW_CLIENT` |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | D handshake completed | D eligible and handshake done | present `MODAL_TCP_TIMEOUT` | `PHASE_TCP_CHAOS_TIMEOUT` |
| `PHASE_TCP_CHAOS_TIMEOUT` | `EVENT_MODAL_SUBMIT_RECONNECT` | modal open | scoped reconnect A/B/C only | `PHASE_TCP_CHAOS_REDO` |
| `PHASE_TCP_CHAOS_REDO` | break trigger reached | resend pressure condition true | present `MODAL_TCP_EXHAUSTION` | `PHASE_TCP_BREAKING_POINT` |
| `PHASE_TCP_BREAKING_POINT` | `EVENT_MODAL_SUBMIT_CONTINUE` | modal open | switch mode, clear TCP transit, inject UDP frames | `PHASE_UDP_INTRO` |

### 4.2 UDP Event-to-Transition Matrix

| Current Phase | Event Term | Preconditions | Immediate Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_UDP_INTRO` | `EVENT_TIMER_UDP_INTRO_DONE` | intro timer started | enable interactive streaming | `PHASE_UDP_STREAMING` |
| `PHASE_UDP_STREAMING` | `EVENT_DROP_TO_INTERNET` wrong-order `ENTITY_FRAME` | seq mismatch | mark `STATUS_WRONG_ORDER`, remove after notice | `PHASE_UDP_STREAMING` |
| `PHASE_UDP_STREAMING` | `EVENT_DROP_TO_INTERNET` correct-order `ENTITY_FRAME` | seq matches expected | mark `STATUS_SENDING`, keep visible until `EVENT_TIMER_UDP_FRAME_DONE` | `PHASE_UDP_STREAMING` |
| `PHASE_UDP_STREAMING` | `EVENT_TIMER_UDP_FRAME_DONE` | in-flight frame exists | remove frame from transit, apply delivery map | `PHASE_UDP_STREAMING` or `PHASE_UDP_COMPLETE` |
| `PHASE_UDP_COMPLETE` | `EVENT_MODAL_SUBMIT_COMPLETE` | `MODAL_UDP_SUCCESS` open | execute completion handoff | terminal state |

### 4.3 Modal Action Matrix

| Modal Term | Action | State Mutation Scope | Follow-up |
|---|---|---|---|
| `MODAL_TCP_TIMEOUT` | `reconnect` | A/B/C scoped reset only | enter `PHASE_TCP_CHAOS_REDO` |
| `MODAL_TCP_EXHAUSTION` | `continue` | stage transition scope | enter `PHASE_UDP_INTRO` |
| `MODAL_UDP_SUCCESS` | `complete` | progress completion scope | exit question callback |

---

## 5) Term-to-Logic Link Index

Use this index to verify one-to-one alignment.

### 5.1 Space Terms -> Logic Usage

| Space Term | Declared In | Used In Logic Sections |
|---|---|---|
| `SPACE_INTERNET` | 1.3, 2.2 | 3.1, 3.2, 3.3, 4.1, 4.2 |
| `SPACE_CLIENT_A` | 1.3, 2.2 | 3.4 |
| `SPACE_CLIENT_B` | 1.3, 2.2 | 3.4 |
| `SPACE_CLIENT_C` | 1.3, 2.2 | 3.4 |
| `SPACE_CLIENT_D` | 1.3, 2.2 | 3.2.4 |
| `SPACE_INVENTORY` | 1.3, 2.2 | 2.3.3, 3.3.1 |
| `SPACE_RECEIVED` | 1.3, 2.2 | 2.2, 3.2 |

### 5.2 Entity Terms -> Logic Usage

| Entity Term | Declared In | Used In Logic Sections |
|---|---|---|
| `ENTITY_SYNACK` | 1.5, 2.3 | 3.2.1, 3.2.4, 4.1 |
| `ENTITY_DATA` | 1.5, 2.3 | 3.2.3, 4.1 |
| `ENTITY_FRAME` | 1.5, 2.3 | 3.3.1, 3.3.2, 4.2 |

### 5.3 Phase Terms -> Logic Usage

| Phase Term | Declared In | Used In Logic Sections |
|---|---|---|
| `PHASE_TCP_HANDSHAKE_SYNACK` | 1.7, 2.5 | 3.2.1, 4.1 |
| `PHASE_TCP_CONNECTED` | 1.7, 2.5 | 3.2.2, 4.1 |
| `PHASE_TCP_DATA_TRANSFER` | 1.7, 2.5 | 3.2.3, 4.1 |
| `PHASE_TCP_CHAOS_NEW_CLIENT` | 1.7, 2.5 | 3.2.4, 4.1 |
| `PHASE_TCP_CHAOS_TIMEOUT` | 1.7, 2.5 | 3.2.5, 4.1 |
| `PHASE_TCP_CHAOS_REDO` | 1.7, 2.5 | 3.2.6, 4.1 |
| `PHASE_TCP_BREAKING_POINT` | 1.7, 2.5 | 3.2.7, 4.1 |
| `PHASE_UDP_INTRO` | 1.8, 2.5 | 3.3.1, 4.2 |
| `PHASE_UDP_STREAMING` | 1.8, 2.5 | 3.3.2, 4.2 |
| `PHASE_UDP_COMPLETE` | 1.8, 2.5 | 3.3.3, 4.2 |

### 5.4 Modal Terms -> Logic Usage

| Modal Term | Declared In | Used In Logic Sections |
|---|---|---|
| `MODAL_TCP_CONNECTED` | 1.9, 2.6 | 3.2.2 |
| `MODAL_TCP_NEW_CLIENT` | 1.9, 2.6 | 3.2.3 |
| `MODAL_TCP_TIMEOUT` | 1.9, 2.6 | 3.2.4, 3.2.5, 4.3 |
| `MODAL_TCP_EXHAUSTION` | 1.9, 2.6 | 3.2.7, 4.3 |
| `MODAL_UDP_SUCCESS` | 1.9, 2.6 | 3.3.3, 4.3 |

### 5.5 Timing Terms -> Logic Usage

| Timing Term | Declared In | Used In Logic Sections |
|---|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | 1.10 | 3.2.1, 3.2.3 |
| `TIMER_ACK_TRAVEL_MS` | 1.10 | 3.2.1 |
| `TIMER_DATA_ACK_MS` | 1.10 | 3.2.3 |
| `TIMER_NOTICE_MS` | 1.10 | 3.3.2 |
| `TIMER_FRAME_SEND_MS` | 1.10 | 3.3.2 |
| `TIMER_UDP_INTRO_DELAY_MS` | 1.10 | 3.3.1 |
| `TRIGGER_CLIENT_D_PACKET_COUNT` | 1.10 | 3.2.3, 4.1 |

---

## 6) Hard Invariants

All implementations derived from this blueprint must preserve every invariant below.

1. `ENTITY_FRAME` correct-order send must keep visible `STATUS_SENDING` on `SPACE_INTERNET` until `EVENT_TIMER_UDP_FRAME_DONE`.
2. Client D reveal threshold must remain exactly `TRIGGER_CLIENT_D_PACKET_COUNT = 4`.
3. `EVENT_MODAL_SUBMIT_RECONNECT` must reset A/B/C only and preserve D-related inventory/progress.
4. Pool mutation during reconnect must satisfy `POOL_MUTATION_SCOPED`, `POOL_MUTATION_INCREMENTAL`, and `POOL_PRESERVE_UNAFFECTED`.
5. Space-dependent UI must not render before bootstrap readiness for declared spaces.
6. `MODE_TCP` -> `MODE_UDP` transition must clear TCP transit artifacts before frame flow begins.
7. Wrong-order UDP frames must not advance expected frame sequence.

---

## 7) Non-Goals

1. This blueprint does not mandate behavior-rule-only architecture.
2. This blueprint does not define visual theme or typography decisions.
3. This blueprint does not enforce terminal gameplay usage for this question.
4. This blueprint does not require arrow overlays; arrows are optional.

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

- Each logic sentence should reference at least one canonical ID family (`PHASE_*`, `ENTITY_*`, `SPACE_*`, `EVENT_*`, `MODAL_*`, `TIMER_*`, `MODE_*`).
- No undeclared synonyms should appear in transition-critical paragraphs.
- Every `PHASE_*` used in Sections 3 and 4 must exist in Section 1.7 or 1.8.
- Every modal action used in Section 4.3 must exist in Section 1.9.
- Every timer mentioned in logic must exist in Section 1.10.

### 8.3 Quality Gates

When code behavior changes, run:
- `pnpm check:biome`
- `pnpm check:tsc`

For docs-only updates:
- Validate section order and internal references.
- Validate all tables preserve one-to-one declaration-to-logic mapping.
