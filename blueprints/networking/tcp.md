# TCP File Fragmentation Blueprint

Declaration-first blueprint for `tcp-fragmentation`.
This document is the starting specification for authoring and maintaining this question.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

Use this blueprint as the canonical source of truth for question behavior.
Use game docs for runtime API and engine contracts.

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

- Logic must use exact term IDs from Section 1.
- If a new concept is introduced, define the term first, then use it.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value |
|---|---|
| `QUESTION_ID` | `tcp-fragmentation` |
| `QUESTION_TITLE` | `📄 Deliver message.txt` |
| `QUESTION_DESCRIPTION` | `Large files must be split, ordered, and delivered reliably. Build the missing TCP pieces to get message.txt across.` |

### 1.2 Architecture Terms

| Term ID | Value | Meaning |
|---|---|---|
| `STYLE_IMPERATIVE_EVENT_DRIVEN` | `true` | Main logic is in behavior rule handlers triggered by entity arrival events, not declarative phase rules |
| `HAS_PHASE_RULES` | `false` | `phaseRules` is empty; phases are driven by `ctx.setPhase(...)` calls in handlers |
| `HAS_TERMINAL_ENGINE` | `false` | Completion is modal-based, not terminal-command based |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Dimensions | Capacity | Meaning |
|---|---|---|---|---|---|
| `SPACE_SPLITTER` | `splitter` | `grid` | 1×1 | 1 | File splitting workspace; conditionally visible |
| `SPACE_INTERNET` | `internet` | `grid` | 1×3 | 3 | Transit path for packet travel; always visible |
| `SPACE_SERVER` | `server` | `grid` | 4×3 | 12 | Server destination and processing area |
| `SPACE_INVENTORY` | `inventory` | `pool` | — | unlimited | Main source pool for files and packets |
| `SPACE_TCP_TOOLS` | `tcp-tools` | `pool` | — | unlimited | SYN / ACK / FIN tools; shown only when non-empty |
| `SPACE_RECEIVED` | `received` | `pool` | — | unlimited | SYN-ACK / FIN-ACK receive pool; hidden until `VIS_RECEIVED_DYNAMIC` |

### 1.4 Space Visibility Terms

| Term ID | Meaning |
|---|---|
| `VIS_SPLITTER_DYNAMIC` | Splitter visible only when `splitterVisible` context flag is true (set when `messageSplitterUnlocked` and a splittable file is present, or notes file is present) |
| `VIS_RECEIVED_DYNAMIC` | `SPACE_RECEIVED` added to drawer only after `receivedPoolVisible` context flag becomes true (set when SYN-ACK arrives at client) |
| `VIS_TCP_TOOLS_DYNAMIC` | `SPACE_TCP_TOOLS` visible in drawer only when it contains at least one entity |

### 1.5 Entity Family Terms

| Term ID | Family / Type | IDs | Initial Space |
|---|---|---|---|
| `ENTITY_FILE_MESSAGE` | `message-file` | `message-file-1` | `SPACE_INVENTORY` |
| `ENTITY_FILE_NOTES` | `notes-file` | `notes-file-1` | none (injected after message completion) |
| `ENTITY_PACKET_MESSAGE` | `split-packet` (fileKey: `message`) | `split-packet-1..3` | none (injected when message file split) |
| `ENTITY_PACKET_NOTES` | `split-packet` (fileKey: `notes`) | `notes-packet-1..6` | none (injected when notes file split) |
| `ENTITY_TOOL_SYN` | `syn-flag` | `syn-flag-1` | none (injected after all 3 message packets rejected) |
| `ENTITY_TOOL_ACK` | `ack-flag` | `ack-flag-1` | none (injected after SYN-ACK arrives) |
| `ENTITY_TOOL_FIN` | `fin-flag` | `fin-flag-1` | none (injected after notes completion) |
| `ENTITY_SYSTEM_SYNACK` | `syn-ack-flag` | `syn-ack-flag-1` | none (server-injected on SYN arrival) |
| `ENTITY_SYSTEM_FINACK` | `fin-ack-flag` | `fin-ack-flag-1` | none (server-injected on FIN arrival) |

### 1.6 Status / State Terms

| Term ID | `tcpState` value | Visual | Meaning |
|---|---|---|---|
| `STATE_READY` | `ready` | normal | File is ready in inventory |
| `STATE_IDLE` | `idle` | normal | Packet ready to send |
| `STATE_IN_TRANSIT` | `in-transit` | warning | Item traveling through internet pipeline |
| `STATE_PROCESSING` | `processing` | normal | Server is processing item |
| `STATE_REJECTED` | `rejected` | error | Item rejected by server |
| `STATE_RECEIVED` | `received` | success | Item accepted and received |
| `STATE_BUFFERED` | `buffered` | warning | Out-of-order packet waiting for gap to fill |
| `STATE_LOST` | `lost` | error | Packet dropped in loss scenario |
| `STATE_QUEUED` | `queued` | warning | Server grid full; packet waiting for retry |

### 1.7 Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_MTU` | `mtu` | Initial large-file rejection, demonstrates MTU concept |
| `PHASE_SPLITTER` | `splitter` | Splitter introduction; user splits message file |
| `PHASE_SPLIT_SEND` | `split-send` | Sending message fragments without a connection; all three get rejected |
| `PHASE_SYN` | `syn` | SYN tool revealed; user sends SYN |
| `PHASE_SYN_WAIT` | `syn-wait` | SYN in transit toward server |
| `PHASE_ACK` | `ack` | SYN-ACK arrived; ACK tool revealed; user sends ACK |
| `PHASE_CONNECTED` | `connected` | Connection active; ordered data transfer for message file |
| `PHASE_NOTES` | `notes` | notes.txt file injected; user splits it |
| `PHASE_LOSS` | `loss` | Packet loss scenario active for notes packet #2 |
| `PHASE_RESEND` | `resend` | Duplicate ACK threshold reached; user must resend packet #2 |
| `PHASE_CLOSING` | `closing` | FIN tool revealed; user sends FIN to close connection |
| `PHASE_TERMINAL` | `terminal` | Question completion; success modal shown |

### 1.8 Modal Terms

| Term ID | Modal ID | Action IDs | Trigger |
|---|---|---|---|
| `MODAL_MTU` | `mtu-limit` | `close` | Message/notes file rejected in `PHASE_MTU` |
| `MODAL_SYN_INTRO` | `syn-intro` | `close` | All 3 message packets rejected |
| `MODAL_SYN_ACK` | `syn-ack-received` | `continue` | SYN-ACK arrives at client |
| `MODAL_ACK_INTRO` | `ack-intro` | `ack` | `MODAL_SYN_ACK` closed (shown once) |
| `MODAL_HANDSHAKE_COMPLETE` | `handshake-complete` | `close` | ACK arrives at server |
| `MODAL_HOL` | `hol-blocking` | `close` | First out-of-order packet buffered |
| `MODAL_PACKET_LOSS` | `packet-loss` | `close` | Notes packet #2 first loss |
| `MODAL_DUP_ACKS` | `duplicate-acks` | `close` | `RESEND_TRIGGER_DUP_ACKS` duplicate ACKs reached |
| `MODAL_CLOSE_CONNECTION` | `close-connection` | `close` | notes.txt assembly complete |
| `MODAL_SUCCESS` | `tcp-success` | `primary` | `PHASE_TERMINAL` entered |

Each modal is shown at most once per session (guarded by `CTX_MODALS_SHOWN` flags), except `MODAL_SUCCESS`.

### 1.9 Timing Terms

| Term ID | Value (ms) | Meaning |
|---|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | `800` | Transit delay for SYN/ACK/FIN and server-to-client response packets |
| `TIMER_MESSAGE_PACKET_TRAVEL_MS` | `800` | Transit delay for message split-packets |
| `TIMER_SERVER_REJECT_DELAY_MS` | `2000` | Delay before server rejects an unknown packet |
| `TIMER_PACKET_REJECT_RETURN_MS` | `1500` | Delay before rejected packet returns to inventory |
| `TIMER_FILE_PROCESS_DELAY_MS` | `1500` | Delay before server rejects oversized file |
| `TIMER_FILE_REJECT_DELAY_MS` | `1500` | Delay before rejected file returns to inventory |
| `TIMER_ASSEMBLE_DELAY_MS` | `2000` | Delay for file reassembly after all packets received |
| `TIMER_BUFFER_RELEASE_DELAY_MS` | `1500` | Initial delay before buffered packet serial release begins |
| `TIMER_BUFFER_STEP_DELAY_MS` | `800` | Per-step delay between consecutive buffered packet releases |
| `TIMER_LOSS_FADE_MS` | `700` | Delay before lost packet fades and returns to inventory |
| `TIMER_SERVER_MOVE_RETRY_MS` | `500` | Retry delay when server grid is full |
| `MAX_SERVER_MOVE_ATTEMPTS` | `8` | Maximum retry attempts before giving up on server placement |

### 1.10 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_ENTITY_ARRIVED_SPLITTER` | Entity entered `SPACE_SPLITTER` |
| `EVENT_ENTITY_ARRIVED_INTERNET` | Entity entered `SPACE_INTERNET` |
| `EVENT_ENTITY_ARRIVED_SERVER` | Entity entered `SPACE_SERVER` |
| `EVENT_MODAL_CLOSED` | Modal closed callback |

### 1.11 Buffer and Loss Terms

| Term ID | Value | Meaning |
|---|---|---|
| `LOSS_PACKET_SEQ` | `2` | Notes packet sequence number targeted for first loss |
| `RESEND_TRIGGER_DUP_ACKS` | `3` | Number of duplicate ACKs before resend is triggered |
| `BUFFER_RELEASE_SERIAL` | `true` | Buffered packets release one-by-one with `TIMER_BUFFER_STEP_DELAY_MS` between each |

### 1.12 Context State Terms

| Term ID | Type | Meaning |
|---|---|---|
| `CTX_SPLITTER_VISIBLE` | `boolean` | Whether `SPACE_SPLITTER` is shown |
| `CTX_MESSAGE_SPLITTER_UNLOCKED` | `boolean` | Whether message file can be dropped into splitter |
| `CTX_PENDING_FILE_RETURN` | `{ entityId, spaceId } \| null` | File awaiting return to inventory after `MODAL_MTU` close |
| `CTX_SERVER_STATUS` | `string` | Current one-line server status message |
| `CTX_SERVER_LOG` | `TcpServerLogEntry[]` | Append-only server log entries |
| `CTX_CONNECTION_ACTIVE` | `boolean` | Whether TCP connection is currently established |
| `CTX_CONNECTION_CLOSED` | `boolean` | Whether TCP connection has been cleanly closed |
| `CTX_SEQUENCE_ENABLED` | `boolean` | Whether packets show sequence numbers |
| `CTX_LOSS_SCENARIO_ACTIVE` | `boolean` | Whether notes packet #2 loss interception is armed |
| `CTX_RECEIVED_POOL_VISIBLE` | `boolean` | Whether `SPACE_RECEIVED` is shown in drawer |
| `CTX_BUFFER_SLOTS` | `TcpBufferSlot[]` | Current receiving buffer display state |
| `CTX_RECEIVED_COUNT` | `number` | Number of in-order packets received |
| `CTX_WAITING_COUNT` | `number` | Number of out-of-order buffered packets |
| `CTX_RECEIVED_SEQS` | `number[]` | Sorted list of received sequence numbers |
| `CTX_WAITING_SEQS` | `number[]` | Sorted list of buffered out-of-order sequence numbers |
| `CTX_EXPECTED_TOTAL` | `number` | Total packets expected for current file (3 for message, 6 for notes) |
| `CTX_ALLOW_PACKET2` | `boolean` | Whether notes packet #2 passes loss gate (false until resend authorized) |
| `CTX_RESEND_TARGET_SEQ` | `number \| null` | Sequence number currently targeted for forced resend |
| `CTX_REJECTED_PACKETS` | `string[]` | Packet IDs rejected before handshake (gates `MODAL_SYN_INTRO`) |
| `CTX_BUFFER_RELEASE_IN_PROGRESS` | `boolean` | Whether serial buffered release is currently running |
| `CTX_ACK_TRACKING` | `{ lastAck: number \| null, duplicates: number }` | Duplicate ACK counter for triggering `PHASE_RESEND` |
| `CTX_MODALS_SHOWN` | `ModalShownFlags` | Per-modal once-shown guards |
| `CTX_COMPLETED_FILES` | `{ message: boolean, notes: boolean }` | Which files have been fully assembled |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID`, `QUESTION_TITLE`, and `QUESTION_DESCRIPTION` must match Section 1.1.
- Initial phase must be `PHASE_MTU`.

### 2.2 Space Declaration

Required spaces: `SPACE_SPLITTER`, `SPACE_INTERNET`, `SPACE_SERVER`, `SPACE_INVENTORY`, `SPACE_TCP_TOOLS`, `SPACE_RECEIVED`.

Space roles:

| Space Term | Role | Allowed Gameplay Interaction |
|---|---|---|
| `SPACE_SPLITTER` | File splitting workspace | Drop target for `ENTITY_FILE_MESSAGE` and `ENTITY_FILE_NOTES`; conditionally visible per `VIS_SPLITTER_DYNAMIC` |
| `SPACE_INTERNET` | Transit path | Drop target for all sendable entities; items auto-route to server after travel timer |
| `SPACE_SERVER` | Server destination | Receives and processes all entities from internet; 4×3 grid with retry on full |
| `SPACE_INVENTORY` | Main source pool | Drag source for files, packets; always visible |
| `SPACE_TCP_TOOLS` | Tool source pool | Drag source for SYN/ACK/FIN tools; visible per `VIS_TCP_TOOLS_DYNAMIC` |
| `SPACE_RECEIVED` | Receive artifact pool | Holds SYN-ACK and FIN-ACK for display; non-draggable; visible per `VIS_RECEIVED_DYNAMIC` |

### 2.3 Entity Declaration

- `ENTITY_FILE_MESSAGE` starts in `SPACE_INVENTORY`.
- `ENTITY_FILE_NOTES`, all packet families, all tool/system entities start with no space and are injected at the appropriate phase transition.
- `allowedPlaces` on all entities must remain as declared.
- Packet naming contract:
  - Before connection: `Fragment`
  - After connection (`CTX_SEQUENCE_ENABLED`): `Packet #<seq>`
  - During resend phase: `Packet #2 (Resend?)`
  - After resend sent: restored to `Packet #<seq>`

### 2.4 Drawer Declaration

- Drawer contains three pool slots in order: `SPACE_TCP_TOOLS` (conditional), `SPACE_INVENTORY`, `SPACE_RECEIVED` (conditional).
- `SPACE_TCP_TOOLS` slot is display-hidden when its entity list is empty.
- `SPACE_RECEIVED` slot is display-hidden until `CTX_RECEIVED_POOL_VISIBLE` becomes true; drawer auto-opens when it first becomes visible.
- Drawer position: bottom. Initial state: expanded.

### 2.5 Architecture Declaration

- `HAS_PHASE_RULES` is false: all phase transitions are driven imperatively via `ctx.setPhase(...)` inside entity arrival handlers.
- Event routing: three `buildEntityArrivedTrigger` rules (splitter, internet, server) plus `EVENT_MODAL_CLOSED` rules.
- Server placement uses retry loop (`scheduleMoveToServerWithRetry`) when `SPACE_SERVER` grid is full, up to `MAX_SERVER_MOVE_ATTEMPTS` retries.
- Completion contract:
  - Enter `PHASE_TERMINAL`
  - Open `MODAL_SUCCESS`
  - Call `progress.completeQuestion()`
  - Navigate away on `modalSubmitted(MODAL_SUCCESS, primary)` via `CTX_NAVIGATE_AWAY` flag.

### 2.6 Modal Declaration

- All modal IDs and action IDs must match Section 1.8.
- All modals are guarded by `CTX_MODALS_SHOWN` (shown at most once), except `MODAL_SUCCESS`.
- Modal close side effects:
  - `MODAL_MTU` close: set `CTX_MESSAGE_SPLITTER_UNLOCKED = true`, return pending file to inventory, sync splitter visibility.
  - `MODAL_SYN_ACK` close: open `MODAL_ACK_INTRO` once.
  - `MODAL_DUP_ACKS` close: set `CTX_ALLOW_PACKET2 = true`.

### 2.7 Receiving Buffer Display Declaration

The receiving buffer panel is visible when `CTX_CONNECTION_ACTIVE` or when `CTX_RECEIVED_COUNT > 0` or `CTX_WAITING_COUNT > 0`.

Each `TcpBufferSlot` has:
- `seq`: sequence number (1-based)
- `status`: `"empty"` | `"received"` | `"waiting"`

Slot status rules:
- `CTX_RECEIVED_SEQS.includes(seq)` → `"received"` (✅)
- `CTX_WAITING_SEQS.includes(seq)` → `"waiting"` (⏳)
- Otherwise → `"empty"` (___)

Slot count defaults:
- If `CTX_BUFFER_SLOTS` is non-empty: use its length.
- Else if phase is `PHASE_NOTES`, `PHASE_LOSS`, `PHASE_RESEND`, `PHASE_CLOSING`, or `PHASE_TERMINAL`: 6 slots.
- Otherwise: 3 slots.

### 2.8 AI Authoring Contract

- You may change copy text, hints, and ordering explanations.
- You must not rename canonical IDs, phase values, space IDs, or modal IDs.
- You must preserve timer intent and sequencing behavior.
- You must preserve event-driven architecture (`STYLE_IMPERATIVE_EVENT_DRIVEN`).
- You must not change `LOSS_PACKET_SEQ` or `RESEND_TRIGGER_DUP_ACKS`.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap spaces and initial entities (`ENTITY_FILE_MESSAGE` in `SPACE_INVENTORY`).
2. Start in `PHASE_MTU`.
3. Route entity arrival events to splitter, internet, and server handlers.
4. Apply timers for transit, reject, retry, assembly, and buffer release.
5. Drive phase transitions with `ctx.setPhase(...)`.
6. Finalize by entering `PHASE_TERMINAL`, opening `MODAL_SUCCESS`, completing question.

### 3.2 `PHASE_MTU` — MTU Rejection

Entry: initial state.

Trigger: `EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_FILE_MESSAGE` or `ENTITY_FILE_NOTES`.

Handler (`handleFileMtuReject`):
1. Set entity `STATE_PROCESSING`.
2. Wait `TIMER_FILE_PROCESS_DELAY_MS`.
3. Set entity `STATE_REJECTED`.
4. Wait `TIMER_FILE_REJECT_DELAY_MS`.
5. Open `MODAL_MTU` (once); store entity in `CTX_PENDING_FILE_RETURN`.
6. Transition to `PHASE_SPLITTER`.

`MODAL_MTU` close handler:
- Set `CTX_MESSAGE_SPLITTER_UNLOCKED = true`.
- Return `CTX_PENDING_FILE_RETURN` entity to `SPACE_INVENTORY` as `STATE_READY`.
- Sync splitter visibility.

### 3.3 `PHASE_SPLITTER` — File Splitting

Trigger: `EVENT_ENTITY_ARRIVED_SPLITTER` with `ENTITY_FILE_MESSAGE` or `ENTITY_FILE_NOTES`.

Handler (`handleSplitterDrop`):
- Delete the file entity from the world.
- Hide splitter (`CTX_SPLITTER_VISIBLE = false`).

For message file:
- Configure message packets as `Fragment` (sequence disabled, `STATE_IDLE`).
- Add message packets to `SPACE_INVENTORY`.
- Reset `CTX_REJECTED_PACKETS`.
- Reset buffer state for 3 packets.
- Transition to `PHASE_SPLIT_SEND`.

For notes file:
- Configure notes packets as `Packet #<seq>` (sequence enabled, `STATE_IDLE`).
- Add notes packets to `SPACE_INVENTORY`.
- Set `CTX_ALLOW_PACKET2 = false`, `CTX_LOSS_SCENARIO_ACTIVE = true`.
- Reset buffer state for 6 packets.
- Transition to `PHASE_LOSS`.

### 3.4 `PHASE_SPLIT_SEND` — Pre-Connection Packet Rejection

Trigger: `EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_PACKET_MESSAGE` and `CTX_CONNECTION_ACTIVE = false`.

Handler (`handlePacketRejected`):
1. Set `STATE_PROCESSING`; log `"Processing..."`.
2. Wait `TIMER_SERVER_REJECT_DELAY_MS`.
3. Log `"I don't understand this package!"`; set `STATE_REJECTED`.
4. Wait `TIMER_PACKET_REJECT_RETURN_MS`.
5. Set `STATE_IDLE`; return packet to `SPACE_INVENTORY`.
6. Push packet ID to `CTX_REJECTED_PACKETS`.

When `CTX_REJECTED_PACKETS.length === 3` (all message packets rejected):
- Open `MODAL_SYN_INTRO` (once).
- Add `ENTITY_TOOL_SYN` to `SPACE_TCP_TOOLS`.
- Transition to `PHASE_SYN`.

### 3.5 `PHASE_SYN` and `PHASE_SYN_WAIT` — TCP Handshake (SYN)

`PHASE_SYN` entry: `ENTITY_TOOL_SYN` available in `SPACE_TCP_TOOLS`.

Trigger: `EVENT_ENTITY_ARRIVED_INTERNET` with `ENTITY_TOOL_SYN`.

Handler (`handleInternetItem`):
- Set `STATE_IN_TRANSIT`.
- Transition to `PHASE_SYN_WAIT`.
- Schedule `scheduleMoveToServerWithRetry` to move SYN to `SPACE_SERVER`.

`EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_TOOL_SYN` → `handleSynArrival`:
1. Set SYN `STATE_RECEIVED`, make non-draggable.
2. Log `"🟡 SYN received - sending SYN-ACK..."`.
3. Set `ENTITY_SYSTEM_SYNACK` `STATE_IN_TRANSIT` (direction: `server-to-client`).
4. Place SYN-ACK into `SPACE_INTERNET` via `moveEntityToGrid`.

`EVENT_ENTITY_ARRIVED_INTERNET` with `ENTITY_SYSTEM_SYNACK` (direction `server-to-client`) → `handleInternetItem`:
- Set `STATE_IN_TRANSIT`.
- Wait `TIMER_INTERNET_TRAVEL_MS`.
- Call `handleSynAckArrival`.

`handleSynAckArrival`:
- Set SYN-ACK `STATE_RECEIVED`; move to `SPACE_RECEIVED` (non-draggable).
- Set `CTX_RECEIVED_POOL_VISIBLE = true`.
- Open `MODAL_SYN_ACK` (once).
- Add `ENTITY_TOOL_ACK` to `SPACE_TCP_TOOLS`.
- Transition to `PHASE_ACK`.

`MODAL_SYN_ACK` close → open `MODAL_ACK_INTRO` (once).

### 3.6 `PHASE_ACK` — TCP Handshake (ACK)

Trigger: `EVENT_ENTITY_ARRIVED_INTERNET` with `ENTITY_TOOL_ACK`.

Handler: set `STATE_IN_TRANSIT`; schedule `scheduleMoveToServerWithRetry`.

`EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_TOOL_ACK` → `handleAckArrival`:
1. Set ACK `STATE_RECEIVED`, make non-draggable.
2. Set `CTX_CONNECTION_ACTIVE = true`, `CTX_SEQUENCE_ENABLED = true`.
3. Configure message and notes packets with sequence numbers.
4. Reset buffer state for 3 packets (message file).
5. Log `"🟢 Connected - Waiting for data..."`.
6. Open `MODAL_HANDSHAKE_COMPLETE` (once).
7. Transition to `PHASE_CONNECTED`.
8. Add message packets to `SPACE_INVENTORY` (they now show as `Packet #<seq>`).

### 3.7 `PHASE_CONNECTED` — Ordered Message Delivery

Trigger: `EVENT_ENTITY_ARRIVED_INTERNET` with `ENTITY_PACKET_MESSAGE`.

Handler: set `STATE_IN_TRANSIT`; schedule `scheduleMoveToServerWithRetry` with `TIMER_MESSAGE_PACKET_TRAVEL_MS`.

`EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_PACKET_MESSAGE` → `handlePacketArrival` (fileKey: `message`).

HoL blocking logic:
1. Compute `expectedSeq` = lowest seq not yet in `CTX_RECEIVED_SEQS`.
2. If `seq > expectedSeq`: push to `CTX_WAITING_SEQS`, set `STATE_BUFFERED`, open `MODAL_HOL` (once), log ACK.
3. If `seq === expectedSeq`: push to `CTX_RECEIVED_SEQS`, set `STATE_RECEIVED`, log ACK, call `scheduleBufferedRelease`.
4. If `seq < expectedSeq`: already received; set `STATE_RECEIVED`, log ACK.

`scheduleBufferedRelease`:
- Guard: if `CTX_BUFFER_RELEASE_IN_PROGRESS`, return.
- Collect contiguous waiting seqs starting from next expected.
- Set `CTX_BUFFER_RELEASE_IN_PROGRESS = true`.
- Wait `TIMER_BUFFER_RELEASE_DELAY_MS`, then release each seq with `TIMER_BUFFER_STEP_DELAY_MS` spacing.
- Each step: move seq from `CTX_WAITING_SEQS` to `CTX_RECEIVED_SEQS`, set `STATE_RECEIVED`, update buffer display, log ACK.

When `CTX_RECEIVED_SEQS.length === CTX_EXPECTED_TOTAL` → `handleFileComplete(message)`:
- Log `"📄 message.txt received successfully!"`.
- Inject `ENTITY_FILE_NOTES` into `SPACE_INVENTORY`.
- Set `CTX_SPLITTER_VISIBLE = true`.
- Reset buffer for 6 packets.
- Transition to `PHASE_NOTES`.

### 3.8 `PHASE_NOTES` — Notes File Splitting

Same splitter drop flow as Section 3.3, notes path.

On notes file split:
- Notes packets appear in `SPACE_INVENTORY` as `Packet #1` through `Packet #6`.
- `CTX_LOSS_SCENARIO_ACTIVE = true`, `CTX_ALLOW_PACKET2 = false`.
- Transition to `PHASE_LOSS`.

### 3.9 `PHASE_LOSS` — Packet Loss Scenario

Packet loss interception (`handlePacketLossReturn`):
- Applies when `CTX_LOSS_SCENARIO_ACTIVE = true`, entity is `ENTITY_PACKET_NOTES` with `seq === LOSS_PACKET_SEQ`, and `CTX_ALLOW_PACKET2 = false`.
- Triggers at `EVENT_ENTITY_ARRIVED_INTERNET` (before server) or `EVENT_ENTITY_ARRIVED_SERVER` if internet was bypassed.
- Set `STATE_LOST`.
- Wait `TIMER_LOSS_FADE_MS`.
- Return packet to `SPACE_INVENTORY`; open `MODAL_PACKET_LOSS` (once).

Duplicate ACK tracking:
- Each `logAckMessage` call checks if the ACK number repeats.
- If same ACK repeated: increment `CTX_ACK_TRACKING.duplicates`.
- When `CTX_ACK_TRACKING.duplicates >= RESEND_TRIGGER_DUP_ACKS` and `CTX_RESEND_TARGET_SEQ === null`: call `triggerResend`.

`triggerResend(missingSeq)`:
- Set `CTX_RESEND_TARGET_SEQ = missingSeq`.
- Rename notes packet `#2` to `Packet #2 (Resend?)`.
- Transition to `PHASE_RESEND`.
- Open `MODAL_DUP_ACKS` (once).

### 3.10 `PHASE_RESEND` — Forced Resend

`MODAL_DUP_ACKS` close: set `CTX_ALLOW_PACKET2 = true`.

When notes packet #2 is sent and `CTX_RESEND_TARGET_SEQ === seq`:
- Set `CTX_ALLOW_PACKET2 = true`.
- Rename packet back to `Packet #2`.
- Transition back to `PHASE_LOSS`.
- Packet proceeds normally through server arrival and `handlePacketArrival`.

After resend, `scheduleBufferedRelease` runs to release the buffered packets #3–#6.

When all 6 notes packets received → `handleFileComplete(notes)`:
- Log `"📄 notes.txt received successfully!"`.
- Set `CTX_LOSS_SCENARIO_ACTIVE = false`.
- Add `ENTITY_TOOL_FIN` to `SPACE_TCP_TOOLS`.
- Transition to `PHASE_CLOSING`.
- Open `MODAL_CLOSE_CONNECTION` (once).

### 3.11 `PHASE_CLOSING` — Connection Teardown

Trigger: `EVENT_ENTITY_ARRIVED_INTERNET` with `ENTITY_TOOL_FIN`.

Handler: set `STATE_IN_TRANSIT`; schedule `scheduleMoveToServerWithRetry`.

`EVENT_ENTITY_ARRIVED_SERVER` with `ENTITY_TOOL_FIN` → `handleFinArrival`:
1. Set FIN `STATE_RECEIVED`, make non-draggable.
2. Set `ENTITY_SYSTEM_FINACK` `STATE_RECEIVED`; move to `SPACE_RECEIVED` (non-draggable).
3. Set `CTX_CONNECTION_ACTIVE = false`, `CTX_CONNECTION_CLOSED = true`.
4. Log `"🔴 Disconnected"`.
5. Transition to `PHASE_TERMINAL`.

### 3.12 `PHASE_TERMINAL` — Completion

On entering `PHASE_TERMINAL` (detected by page-level `useEffect`):
- Open `MODAL_SUCCESS`.
- Call `progress.completeQuestion()`.

`MODAL_SUCCESS` submit (`primary`) → set `CTX_NAVIGATE_AWAY = true` → `onQuestionComplete()` called.

### 3.13 Server Grid Full — Retry Logic

`scheduleMoveToServerWithRetry(ctx, entityId, key, attempt)`:
- Attempt `moveEntityToGrid` into `SPACE_SERVER`.
- If full: set entity `STATE_QUEUED`, schedule retry after `TIMER_SERVER_MOVE_RETRY_MS`.
- Max attempts: `MAX_SERVER_MOVE_ATTEMPTS`. On exhaustion: log error and stop.

---

## 4) Transition Matrices

### 4.1 Phase Transition Matrix

| Current Phase | Trigger | Preconditions | Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_MTU` | File dropped to server | any file entity | reject animation, `MODAL_MTU`, store pending return | `PHASE_SPLITTER` |
| `PHASE_SPLITTER` | Message file dropped to splitter | `CTX_MESSAGE_SPLITTER_UNLOCKED` | delete file, spawn message packets as `Fragment` | `PHASE_SPLIT_SEND` |
| `PHASE_SPLIT_SEND` | All 3 message packets rejected | `CTX_REJECTED_PACKETS.length === 3` | `MODAL_SYN_INTRO`, add SYN to `SPACE_TCP_TOOLS` | `PHASE_SYN` |
| `PHASE_SYN` | SYN dropped to internet | SYN in `SPACE_TCP_TOOLS` | set `STATE_IN_TRANSIT` | `PHASE_SYN_WAIT` |
| `PHASE_SYN_WAIT` | SYN arrives at server | SYN in transit | SYN received, server emits SYN-ACK toward client | `PHASE_SYN_WAIT` (SYN-ACK traveling) |
| `PHASE_SYN_WAIT` | SYN-ACK arrives at client | SYN-ACK timer done | lock in `SPACE_RECEIVED`, show `MODAL_SYN_ACK`, add ACK | `PHASE_ACK` |
| `PHASE_ACK` | ACK arrives at server | ACK sent | connection active, seq enabled, show `MODAL_HANDSHAKE_COMPLETE` | `PHASE_CONNECTED` |
| `PHASE_CONNECTED` | All 3 message packets received | `CTX_RECEIVED_SEQS.length === 3` | assemble message, inject notes file | `PHASE_NOTES` |
| `PHASE_NOTES` | Notes file dropped to splitter | notes file present | delete file, spawn notes packets as `Packet #1..6` | `PHASE_LOSS` |
| `PHASE_LOSS` | Duplicate ACK threshold reached | `CTX_ACK_TRACKING.duplicates >= 3`, `CTX_RESEND_TARGET_SEQ === null` | rename packet #2, show `MODAL_DUP_ACKS` | `PHASE_RESEND` |
| `PHASE_RESEND` | Packet #2 sent | `CTX_RESEND_TARGET_SEQ === seq` | restore name, `CTX_ALLOW_PACKET2 = true` | `PHASE_LOSS` |
| `PHASE_LOSS` | All 6 notes packets received | `CTX_RECEIVED_SEQS.length === 6` | assemble notes, add FIN, show `MODAL_CLOSE_CONNECTION` | `PHASE_CLOSING` |
| `PHASE_CLOSING` | FIN arrives at server | FIN sent | disconnected, FIN-ACK locked in received | `PHASE_TERMINAL` |
| `PHASE_TERMINAL` | Page detects terminal phase | `PHASE_TERMINAL` entered | open `MODAL_SUCCESS`, complete question | terminal |

### 4.2 Event Routing Matrix

| Event | Entity Type(s) | Router | Handler |
|---|---|---|---|
| `EVENT_ENTITY_ARRIVED_SPLITTER` | `message-file`, `notes-file` | space: `splitter` | `handleSplitterDrop` |
| `EVENT_ENTITY_ARRIVED_INTERNET` | any | space: `internet` | `handleInternetItem` |
| `EVENT_ENTITY_ARRIVED_SERVER` | any | space: `server` | `handleServerItem` |
| `EVENT_MODAL_CLOSED` | — | modal ID | modal close side effects per 2.6 |

### 4.3 Modal Side Effect Matrix

| Modal Term | Close / Submit Effect |
|---|---|
| `MODAL_MTU` | Set `CTX_MESSAGE_SPLITTER_UNLOCKED = true`; return pending file; sync splitter |
| `MODAL_SYN_ACK` | Open `MODAL_ACK_INTRO` (once) |
| `MODAL_DUP_ACKS` | Set `CTX_ALLOW_PACKET2 = true` |
| `MODAL_SUCCESS` (`primary`) | Set `CTX_NAVIGATE_AWAY = true` → navigate away |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic

| Term | Logic Usage |
|---|---|
| `SPACE_SPLITTER` | File split trigger (3.3, 3.8) |
| `SPACE_INTERNET` | Transit timing (3.5, 3.6, 3.7, 3.9, 3.11); server-to-client response routing |
| `SPACE_SERVER` | SYN/ACK/FIN/packet processing (3.5, 3.6, 3.7, 3.9, 3.11); retry on full (3.13) |
| `SPACE_TCP_TOOLS` | SYN/ACK/FIN source (3.5, 3.6, 3.11); visibility guard (2.4) |
| `SPACE_RECEIVED` | SYN-ACK/FIN-ACK display (3.5, 3.11) |
| `SPACE_INVENTORY` | Packet and file source; return target for rejected/lost entities |

### 5.2 Entity Terms -> Logic

| Term | Logic Usage |
|---|---|
| `ENTITY_FILE_MESSAGE` | MTU rejection (3.2); splitter drop (3.3) |
| `ENTITY_FILE_NOTES` | Post-message injection (3.7); splitter drop (3.8) |
| `ENTITY_PACKET_MESSAGE` | Pre-handshake rejection gate (3.4); ordered delivery (3.7) |
| `ENTITY_PACKET_NOTES` | Loss and resend lesson (3.9, 3.10) |
| `ENTITY_TOOL_SYN` | Handshake start (3.5) |
| `ENTITY_TOOL_ACK` | Handshake completion (3.6) |
| `ENTITY_TOOL_FIN` | Connection close (3.11) |
| `ENTITY_SYSTEM_SYNACK` | Server-to-client SYN-ACK response (3.5) |
| `ENTITY_SYSTEM_FINACK` | Server-to-client FIN-ACK response (3.11) |

### 5.3 Phase Terms -> Logic

| Term | Logic Usage |
|---|---|
| `PHASE_MTU` | 3.2, 4.1 |
| `PHASE_SPLITTER` | 3.3, 4.1 |
| `PHASE_SPLIT_SEND` | 3.4, 4.1 |
| `PHASE_SYN` | 3.5, 4.1 |
| `PHASE_SYN_WAIT` | 3.5, 4.1 |
| `PHASE_ACK` | 3.6, 4.1 |
| `PHASE_CONNECTED` | 3.7, 4.1 |
| `PHASE_NOTES` | 3.8, 4.1 |
| `PHASE_LOSS` | 3.9, 4.1 |
| `PHASE_RESEND` | 3.10, 4.1 |
| `PHASE_CLOSING` | 3.11, 4.1 |
| `PHASE_TERMINAL` | 3.12, 4.1 |

### 5.4 Modal Terms -> Logic

| Term | Logic Usage |
|---|---|
| `MODAL_MTU` | 3.2, 4.3 |
| `MODAL_SYN_INTRO` | 3.4 |
| `MODAL_SYN_ACK` | 3.5, 4.3 |
| `MODAL_ACK_INTRO` | 3.5, 4.3 |
| `MODAL_HANDSHAKE_COMPLETE` | 3.6 |
| `MODAL_HOL` | 3.7 |
| `MODAL_PACKET_LOSS` | 3.9 |
| `MODAL_DUP_ACKS` | 3.9, 3.10, 4.3 |
| `MODAL_CLOSE_CONNECTION` | 3.10 |
| `MODAL_SUCCESS` | 3.12, 4.3 |

### 5.5 Timing Terms -> Logic

| Term | Logic Usage |
|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | SYN/ACK/FIN transit (3.5, 3.6, 3.11); server-to-client response (3.5) |
| `TIMER_MESSAGE_PACKET_TRAVEL_MS` | Message packet transit (3.7) |
| `TIMER_SERVER_REJECT_DELAY_MS` | Pre-handshake packet rejection (3.4) |
| `TIMER_PACKET_REJECT_RETURN_MS` | Return-to-inventory delay after rejection (3.4) |
| `TIMER_FILE_PROCESS_DELAY_MS` | File MTU rejection processing (3.2) |
| `TIMER_FILE_REJECT_DELAY_MS` | File return-to-inventory after MTU rejection (3.2) |
| `TIMER_ASSEMBLE_DELAY_MS` | File assembly delay after all packets received (3.7, 3.10) |
| `TIMER_BUFFER_RELEASE_DELAY_MS` | Initial delay before buffered release (3.7) |
| `TIMER_BUFFER_STEP_DELAY_MS` | Per-step spacing in serial buffered release (3.7) |
| `TIMER_LOSS_FADE_MS` | Lost packet fade before return (3.9) |
| `TIMER_SERVER_MOVE_RETRY_MS` | Server grid full retry interval (3.13) |

### 5.6 Context State Terms -> Logic

| Term | Logic Usage |
|---|---|
| `CTX_SPLITTER_VISIBLE` | 2.4, 3.3, 3.7, 3.8 |
| `CTX_MESSAGE_SPLITTER_UNLOCKED` | 3.3, 4.3 |
| `CTX_CONNECTION_ACTIVE` | 3.4, 3.6, 3.7, 3.11 |
| `CTX_LOSS_SCENARIO_ACTIVE` | 3.9, 3.10 |
| `CTX_ALLOW_PACKET2` | 3.9, 3.10, 4.3 |
| `CTX_RESEND_TARGET_SEQ` | 3.9, 3.10 |
| `CTX_REJECTED_PACKETS` | 3.4 |
| `CTX_RECEIVED_SEQS` | 2.7, 3.7 |
| `CTX_WAITING_SEQS` | 2.7, 3.7 |
| `CTX_ACK_TRACKING` | 3.9 |
| `CTX_BUFFER_RELEASE_IN_PROGRESS` | 3.7 |
| `CTX_RECEIVED_POOL_VISIBLE` | 2.4, 3.5 |
| `CTX_MODALS_SHOWN` | 2.6, all modal sections |
| `CTX_COMPLETED_FILES` | 3.7, 3.10 |

---

## 6) Hard Invariants

1. Canonical IDs (spaces, entities, modals, phases) must remain stable and match Section 1 exactly.
2. `LOSS_PACKET_SEQ` must remain `2`; notes packet #2 is always the first loss target.
3. Pre-handshake message packet rejection gate must require exactly 3 rejections before `MODAL_SYN_INTRO` and SYN reveal.
4. Buffered packet release must be serial and delayed; no batch instant flush.
5. `CTX_BUFFER_RELEASE_IN_PROGRESS` must gate against concurrent release runs.
6. `RESEND_TRIGGER_DUP_ACKS` must remain `3`; resend triggers on the third duplicate ACK.
7. `MODAL_SUCCESS` is the completion gateway; question is not marked complete until `PHASE_TERMINAL` is entered.
8. `ENTITY_SYSTEM_SYNACK` and `ENTITY_SYSTEM_FINACK` must be non-draggable when locked in `SPACE_RECEIVED`.
9. Server grid full must retry up to `MAX_SERVER_MOVE_ATTEMPTS` times; never silently drop the entity.
10. `CTX_MODALS_SHOWN` flags prevent any modal from appearing more than once, except `MODAL_SUCCESS`.
11. Notes packet #2 loss gate (`CTX_ALLOW_PACKET2 = false`) must be reset to `true` only via `MODAL_DUP_ACKS` close or explicit resend path; never reset by reconnect or phase change.

---

## 7) Non-Goals

1. Not a full TCP spec simulation.
2. Not congestion-control or window-size modeling.
3. Not terminal-driven diagnostics.
4. Not multi-connection or multi-server simulation.
5. Not real-time packet reordering simulation; ordering is player-driven.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 terms before any logic edits.
2. Apply structural changes in Section 2 declarations.
3. Update lifecycle logic in Section 3 using canonical terms only.
4. Update transition matrices in Section 4.
5. Update term-to-logic index in Section 5.
6. Re-check Section 6 invariants.

### 8.2 Consistency Checks

- Every phase used in logic must exist in Section 1.7.
- Every modal used in logic must exist in Section 1.8.
- Every timer mentioned in logic must exist in Section 1.9.
- Every context field referenced must exist in Section 1.12.
- No undeclared synonym may appear in Sections 2–5.
- Each logic sentence should reference at least one canonical ID family.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
