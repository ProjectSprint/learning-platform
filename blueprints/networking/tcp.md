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
| `STYLE_IMPERATIVE_EVENT_DRIVEN` | `true` | Main logic is in state hook event handlers, not declarative phase rules |
| `HAS_PHASE_RULES` | `false` | `phaseRules` is empty |
| `HAS_TERMINAL_ENGINE` | `false` | Completion is modal-based, not terminal-command based |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Meaning |
|---|---|---|---|
| `SPACE_SPLITTER` | `splitter` | `grid` | File splitting workspace |
| `SPACE_INTERNET` | `internet` | `grid` | Transit path for packet travel |
| `SPACE_SERVER` | `server` | `grid` | Server destination and processing area |
| `SPACE_INVENTORY` | `inventory` | `pool` | Main source pool |
| `SPACE_RECEIVED` | `received` | `pool` | SYN-ACK receive pool (hidden initially) |

### 1.4 Space Visibility Terms

| Term ID | Meaning |
|---|---|
| `VIS_SPLITTER_DYNAMIC` | Splitter appears only when unlocked and a splittable file exists |
| `VIS_RECEIVED_DYNAMIC` | Received pool appears after SYN/SYN-ACK flow starts |

### 1.5 Entity Family Terms

| Term ID | Family | IDs |
|---|---|---|
| `ENTITY_FILE_MESSAGE` | Message file | `message-file-1` |
| `ENTITY_FILE_NOTES` | Notes file | `notes-file-1` |
| `ENTITY_PACKET_MESSAGE` | Message fragments | `split-packet-1..3` |
| `ENTITY_PACKET_NOTES` | Notes fragments | `notes-packet-1..6` |
| `ENTITY_TOOL_SYN` | TCP open tool | `syn-flag-1` |
| `ENTITY_TOOL_ACK` | TCP open tool | `ack-flag-1` |
| `ENTITY_TOOL_FIN` | TCP close tool | `fin-flag-1` |
| `ENTITY_SYSTEM_SYNACK` | Server response packet | `syn-ack-flag-1` |
| `ENTITY_SYSTEM_FINACK` | Server response packet | `fin-ack-flag-1` |

### 1.6 Status Terms

| Term ID | Meaning |
|---|---|
| `STATE_READY` | File is ready in inventory |
| `STATE_IN_TRANSIT` | Item is traveling through internet/server pipeline |
| `STATE_PROCESSING` | Server is processing packet |
| `STATE_REJECTED` | Packet/file rejected |
| `STATE_RECEIVED` | Packet accepted and received |
| `STATE_BUFFERED` | Out-of-order packet waiting |
| `STATE_LOST` | Packet is dropped in loss scenario |
| `STATE_UNKNOWN` | Unsupported item at server |

### 1.7 Phase Terms

| Term ID | Phase Value | Meaning |
|---|---|---|
| `PHASE_MTU` | `mtu` | Initial large-file rejection |
| `PHASE_SPLITTER` | `splitter` | Splitter introduction and use |
| `PHASE_SPLIT_SEND` | `split-send` | Sending message fragments without connection |
| `PHASE_SYN` | `syn` | SYN preparation |
| `PHASE_SYN_WAIT` | `syn-wait` | SYN in transit / waiting SYN-ACK |
| `PHASE_ACK` | `ack` | ACK step after SYN-ACK |
| `PHASE_CONNECTED` | `connected` | Connected transfer for message file |
| `PHASE_NOTES` | `notes` | notes.txt unlocked |
| `PHASE_LOSS` | `loss` | Packet loss scenario active |
| `PHASE_RESEND` | `resend` | Duplicate ACK driven resend step |
| `PHASE_CLOSING` | `closing` | FIN prompt after transfer |
| `PHASE_TERMINAL` | `terminal` | Question completion phase |

### 1.8 Modal Terms

| Term ID | Modal ID | Action IDs |
|---|---|---|
| `MODAL_MTU` | `mtu-limit` | `close` |
| `MODAL_SYN_INTRO` | `syn-intro` | `close` |
| `MODAL_SYN_ACK` | `syn-ack-received` | `continue` |
| `MODAL_ACK_INTRO` | `ack-intro` | `ack` |
| `MODAL_HANDSHAKE_COMPLETE` | `handshake-complete` | `close` |
| `MODAL_HOL` | `hol-blocking` | `close` |
| `MODAL_PACKET_LOSS` | `packet-loss` | `close` |
| `MODAL_DUP_ACKS` | `duplicate-acks` | `close` |
| `MODAL_CLOSE_CONNECTION` | `close-connection` | `close` |
| `MODAL_SUCCESS` | `tcp-success` | `primary` |

### 1.9 Timing Terms

| Term ID | Value (ms) |
|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | `2000` |
| `TIMER_SERVER_REJECT_DELAY_MS` | `2000` |
| `TIMER_PACKET_REJECT_RETURN_MS` | `1500` |
| `TIMER_FILE_PROCESS_DELAY_MS` | `1500` |
| `TIMER_FILE_REJECT_DELAY_MS` | `1500` |
| `TIMER_ASSEMBLE_DELAY_MS` | `2000` |
| `TIMER_BUFFER_RELEASE_DELAY_MS` | `1500` |
| `TIMER_BUFFER_STEP_DELAY_MS` | `800` |
| `TIMER_LOSS_FADE_MS` | `700` |

### 1.10 Event Terms

| Term ID | Meaning |
|---|---|
| `EVENT_ENTITY_ENTERED_SPACE` | Item entered a space |
| `EVENT_ENTITY_MOVED` | Item moved between spaces |
| `EVENT_MODAL_CLOSED` | Modal closed callback |
| `EVENT_DROP_TO_SPLITTER` | Splittable file dropped to splitter |
| `EVENT_DROP_TO_INTERNET` | Send attempt through internet |
| `EVENT_DROP_TO_SERVER` | Item arrives in server |

### 1.11 Buffer and Loss Terms

| Term ID | Value | Meaning |
|---|---|---|
| `LOSS_PACKET_SEQ` | `2` | notes packet sequence targeted for first loss |
| `RESEND_TRIGGER_DUP_ACKS` | `3` | Duplicate ACK threshold |
| `BUFFER_RELEASE_SERIAL` | `true` | Buffered packets release one-by-one with step delay |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- `QUESTION_ID`, `QUESTION_TITLE`, and `QUESTION_DESCRIPTION` must match Section 1.1.
- Initial phase must be `PHASE_MTU`.

### 2.2 Space Declaration

- Required spaces: `SPACE_SPLITTER`, `SPACE_INTERNET`, `SPACE_SERVER`, `SPACE_INVENTORY`, `SPACE_RECEIVED`.
- `SPACE_RECEIVED` starts hidden and is shown dynamically via `VIS_RECEIVED_DYNAMIC`.
- `SPACE_SPLITTER` is controlled by `VIS_SPLITTER_DYNAMIC`.

### 2.3 Entity Declaration

- `ENTITY_FILE_MESSAGE` starts in `SPACE_INVENTORY`.
- `ENTITY_FILE_NOTES`, all packet families, all tool/system packets are created without initial placement.
- Entity allowed-place constraints must remain unchanged.
- Packet naming contract:
  - Default: `Fragment`
  - Sequenced: `Packet #<seq>`
  - Resend marker: `Packet #2 (Resend?)`

### 2.4 Pool and Drawer Declaration

- Inventory drawer starts with only `SPACE_INVENTORY`.
- Add `SPACE_RECEIVED` to drawer only after `VIS_RECEIVED_DYNAMIC` is true.

### 2.5 Architecture Declaration

- `HAS_PHASE_RULES` is false: phase transitions are imperative.
- Runtime loop consumes `EVENT_ENTITY_ENTERED_SPACE`, `EVENT_ENTITY_MOVED`, and `EVENT_MODAL_CLOSED`.
- Completion contract:
  - Enter `PHASE_TERMINAL`
  - Open `MODAL_SUCCESS`
  - Complete question
  - Navigate on `modalSubmitted(MODAL_SUCCESS, primary)`.

### 2.6 Modal Declaration

- All modal IDs and action IDs must match Section 1.8.
- Modal-close side effects:
  - `MODAL_MTU` close returns file and unlocks splitter path.
  - `MODAL_SYN_ACK` close opens `MODAL_ACK_INTRO` once.
  - `MODAL_DUP_ACKS` close allows loss packet resend.

### 2.7 AI Authoring Contract

- You may change copy text, hints, and ordering explanations.
- You must not rename canonical IDs, phase values, space IDs, or modal IDs.
- You must preserve timer intent and sequencing behavior.
- You must preserve event-driven architecture (`STYLE_IMPERATIVE_EVENT_DRIVEN`).

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap spaces/entities.
2. Start in `PHASE_MTU` with message file only.
3. Route entity movement events through space handlers.
4. Apply timers for transit/reject/assembly/buffer release.
5. Drive phases with `setPhase(...)` transitions.
6. Finalize by opening `MODAL_SUCCESS` in `PHASE_TERMINAL`.

### 3.2 Connection Establishment Logic

- `PHASE_MTU`: dropping files to internet triggers reject animation and `MODAL_MTU`.
- `PHASE_SPLITTER`: user splits `ENTITY_FILE_MESSAGE` into `ENTITY_PACKET_MESSAGE`.
- `PHASE_SPLIT_SEND`: message packets sent without connection are rejected; after all 3 rejects, show `MODAL_SYN_INTRO`, reveal SYN tool, move to `PHASE_SYN`.
- `PHASE_SYN` + `PHASE_SYN_WAIT`: SYN transit to server, server emits SYN-ACK toward client, `SPACE_RECEIVED` becomes visible.
- `PHASE_ACK`: SYN-ACK arrival opens modal and unlocks ACK send.
- `PHASE_CONNECTED`: ACK arrival marks connection active and enables sequence display.

### 3.3 Ordered Delivery and HOL Logic

- Connected packet arrival uses expected-sequence window.
- If `seq > expected`: mark packet buffered (`STATE_BUFFERED`), show `MODAL_HOL` once, emit ACK for first missing sequence.
- If `seq == expected`: mark received and release consecutive buffered packets with delayed serial release.
- ACK tracking keeps last ACK and duplicate count.

### 3.4 notes.txt and Loss Logic

- On message completion, insert `ENTITY_FILE_NOTES`, reset expected packet total to 6, transition to `PHASE_NOTES`.
- Splitting notes activates `PHASE_LOSS`, sets `LOSS_PACKET_SEQ = 2`, and blocks first pass of packet #2.
- First transmission of notes packet #2:
  - mark `STATE_LOST`
  - fade and return to inventory
  - show `MODAL_PACKET_LOSS` once
- If duplicate ACK threshold (`RESEND_TRIGGER_DUP_ACKS`) is reached, transition to `PHASE_RESEND`, rename packet #2 to resend label, show `MODAL_DUP_ACKS`.
- Resending packet #2 restores normal name and flow, then buffered release can finish notes delivery.

### 3.5 Close and Completion Logic

- After notes completion: add FIN tool, open `MODAL_CLOSE_CONNECTION`, phase `PHASE_CLOSING`.
- FIN arrival sets disconnected status and transitions to `PHASE_TERMINAL`.
- Page opens `MODAL_SUCCESS` and calls question completion.

---

## 4) Transition Matrices

### 4.1 Phase Transition Matrix

| Current Phase | Trigger | Preconditions | Effects | Next Phase |
|---|---|---|---|---|
| `PHASE_MTU` | Drop file to internet | file type is message/notes | reject + show `MODAL_MTU` | `PHASE_SPLITTER` |
| `PHASE_SPLITTER` | Drop message file to splitter | message file present | spawn message packets | `PHASE_SPLIT_SEND` |
| `PHASE_SPLIT_SEND` | All 3 message packets rejected | no active connection | show `MODAL_SYN_INTRO`, add SYN | `PHASE_SYN` |
| `PHASE_SYN` | SYN dropped to internet | SYN in inventory | set in-transit | `PHASE_SYN_WAIT` |
| `PHASE_SYN_WAIT` | SYN-ACK arrives | server-to-client travel done | move SYN-ACK to received, add ACK | `PHASE_ACK` |
| `PHASE_ACK` | ACK arrives at server | ACK sent | connection active, seq enabled | `PHASE_CONNECTED` |
| `PHASE_CONNECTED` | message file complete | all message seq received | add notes file | `PHASE_NOTES` |
| `PHASE_NOTES` | notes file split | notes file in splitter | activate loss flow | `PHASE_LOSS` |
| `PHASE_LOSS` | duplicate ACK threshold hit | missing seq #2, dup >= 3 | rename packet #2, modal | `PHASE_RESEND` |
| `PHASE_RESEND` | packet #2 resent | resend target sequence sent | clear resend target | `PHASE_LOSS` |
| `PHASE_LOSS` | notes complete | all notes seq received | add FIN, show close modal | `PHASE_CLOSING` |
| `PHASE_CLOSING` | FIN arrives | FIN sent | disconnected | `PHASE_TERMINAL` |

### 4.2 Event Routing Matrix

| Event | Router | Handler |
|---|---|---|
| `EVENT_ENTITY_ENTERED_SPACE` | by space ID | splitter/internet/server handlers |
| `EVENT_ENTITY_MOVED` | by destination space ID | splitter/internet/server handlers |
| `EVENT_MODAL_CLOSED` | by modal ID | modal close side effects |

### 4.3 Modal Side Effect Matrix

| Modal ID | Close/Submit Effect |
|---|---|
| `mtu-limit` | Unlock splitter path and return pending file |
| `syn-ack-received` | Open ACK intro modal |
| `duplicate-acks` | Allow resend path for packet #2 |
| `tcp-success` (`primary`) | Set navigate-away context |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic

| Term | Logic Usage |
|---|---|
| `SPACE_SPLITTER` | File split trigger and packet generation |
| `SPACE_INTERNET` | Transit timing and loss simulation |
| `SPACE_SERVER` | SYN/ACK/FIN/packet processing |
| `SPACE_RECEIVED` | SYN-ACK client receive visualization |

### 5.2 Entity Terms -> Logic

| Term | Logic Usage |
|---|---|
| `ENTITY_PACKET_MESSAGE` | Initial ordering lesson and reject-before-handshake gate |
| `ENTITY_PACKET_NOTES` | Loss and resend lesson |
| `ENTITY_TOOL_SYN` | Handshake start |
| `ENTITY_TOOL_ACK` | Handshake completion |
| `ENTITY_TOOL_FIN` | Connection close |

### 5.3 Phase Terms -> Logic

| Term | Logic Usage |
|---|---|
| `PHASE_MTU` | MTU rejection bootstrapping |
| `PHASE_CONNECTED` | Ordered receive and ACK loop |
| `PHASE_LOSS` | Loss and duplicate ACK observation |
| `PHASE_RESEND` | Forced resend guidance |
| `PHASE_TERMINAL` | Success modal and completion |

### 5.4 Timing Terms -> Logic

| Term | Logic Usage |
|---|---|
| `TIMER_INTERNET_TRAVEL_MS` | internet-to-server and server-to-client travel |
| `TIMER_ASSEMBLE_DELAY_MS` | file completion staging |
| `TIMER_BUFFER_STEP_DELAY_MS` | paced buffered release |
| `TIMER_LOSS_FADE_MS` | packet loss fade animation |

---

## 6) Hard Invariants

- Canonical IDs (spaces, entities, modals, phases) remain stable.
- Loss target remains sequence 2 in notes scenario.
- Rejected pre-handshake message packet count gate remains exactly 3.
- Buffered release remains ordered and delayed; no batch instant flush.
- `MODAL_SUCCESS` remains completion gateway.

---

## 7) Non-Goals

- Not a full TCP spec simulation.
- Not congestion-control or window-size modeling.
- Not terminal-driven diagnostics.
- Not multi-connection or multi-server simulation.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update terms in Section 1 before logic edits.
2. Apply changes in Section 2 declarations.
3. Update lifecycle logic and matrices.
4. Re-run term-to-logic index consistency checks.

### 8.2 Consistency Checks

- Every phase used in logic exists in Section 1.7.
- Every modal used in logic exists in Section 1.8.
- Every timer mentioned in logic exists in Section 1.9.
- No undeclared synonym appears in Sections 2-5.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
