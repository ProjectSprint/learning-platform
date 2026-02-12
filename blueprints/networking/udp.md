# UDP Video Streaming Blueprint

Reference implementation for a dual-stage networking question that starts with TCP-style connection/state overhead, then transitions to UDP frame streaming.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `udp-video-streaming`
- Title: `📺 Stream movie.mp4 to 3 viewers`
- Description: `Your viewers are waiting! Establish connections and deliver the video stream to all clients.`
- Learning objective:
  - Show TCP connection/state management cost across multiple clients.
  - Contrast with UDP-style fire-and-forget frame delivery and tolerated loss.

---

## Implementation Snapshot

Current route implementation lives in:

- `src/routes/questions/networking/udp/-page.tsx`
- `src/routes/questions/networking/udp/-utils/constants.ts`
- `src/routes/questions/networking/udp/-utils/definition.ts`
- `src/routes/questions/networking/udp/-utils/use-tcp-phase.ts`
- `src/routes/questions/networking/udp/-utils/use-udp-phase.ts`

This blueprint reflects the **current code behavior**, including recent updates:

- Client D appears after **4** sent data packets.
- Reconnect only resets A/B/C packet paths and preserves D-related inventory state.
- UDP frame dropped into internet stays visible with `Sending` status until travel delay ends.
- TCP/UDP client panels are rendered only when board spaces are bootstrapped (`boardReady` guard).

---

## Architecture Pattern

This question uses an imperative hook-driven flow (not behavior-rule gameplay logic):

- `QuestionDefinition` has empty `phaseRules` and empty `behaviors.rules`.
- `useQuestionRuntime` is used for bootstrap/runtime APIs.
- Gameplay logic is split into two hooks:
  - `useTcpPhase` for TCP stage.
  - `useUdpPhase` for UDP stage.
- `mode: "tcp" | "udp"` in `-page.tsx` selects the active stage.
- Modal submit events are consumed via `useEngineEvents` in each hook.
- Space entry handling is done by watching `spaces.internet` diffs (new item detection).

Notes:

- `TcpPhase` type still includes `handshake-syn` and `handshake-ack`, but current flow starts at `handshake-synack` and does not actively use those phases.
- Terminal UI is present in page shell, but this question does not drive a terminal gameplay phase.

---

## Spaces and UI Layout

Defined in `UDP_DEFINITION`:

- Grid spaces:
  - `internet` (1x3) transit/send surface.
- Custom spaces:
  - `client-a`, `client-b`, `client-c`, `client-d`.
  - Used as status/progress panels, not packet inbox grids.
- Pool spaces:
  - `inventory`
  - `received`

Page rendering:

- TCP mode:
  - Top row: client status panels (`CustomSpace`) for A/B/C, plus D when enabled.
  - Bottom row: `internet` `GridSpace` with packet badges (`Sending`/`Rejected`).
- UDP mode:
  - Top row: A/B/C progress panels.
  - Bottom row: `internet` `GridSpace` with frame badges (`Sending`/`Wrong order`).

Bootstrap guard:

- `boardReady` check in `-page.tsx` ensures internet + custom spaces exist before rendering panel/grid composition.

---

## Entities and Initial Placement

`UDP_DEFINITION` creates entities from:

- `SYN_ACK_PACKETS` (A/B/C/D), with A/B/C initially placed in `inventory`.
- `DATA_PACKETS` (clients A/B/C/D, seq 1..6 each = 24 packets), no initial placement.
- `FRAME_ITEMS` (UDP frames 1..6), no initial placement.

Important behavior:

- Received SYN/ACK display items are created/managed imperatively via pool update helpers in `useTcpPhase`.
- Inventory grouping is logically represented via `POOL_GROUP_IDS` and helper functions; runtime pool operations are merged/reconciled into available pool spaces (`inventory`/`received`).

---

## TCP Stage (`useTcpPhase`)

### Key constants

- `INTERNET_TRAVEL_MS = 1500`
- `ACK_TRAVEL_MS = 1000`
- `DATA_ACK_MS = 500`
- `NOTICE_MS = 2000`
- `NEW_CLIENT_TRIGGER_PACKET_COUNT = 4`

### Active phase progression

Typical path in current implementation:

1. `handshake-synack`
2. `connected`
3. `data-transfer`
4. `chaos-new-client`
5. `chaos-timeout`
6. `chaos-redo`
7. `breaking-point` (then transition to UDP mode)

### Handshake and sending behavior

- User drops `syn-ack-packet` into `internet`.
- Packet is marked in-transit and removed from outgoing pool.
- After travel delay, client is marked `SYN-ACK sent`.
- After ACK delay, client becomes connected and received ACK item is shown.
- Remaining data packets for that client are ensured in pool.

Data packet handling:

- Drop data packet to `internet`.
- Reject if client disconnected or client lock active.
- Otherwise mark in-transit, lock client, then complete send after travel + ack cycle.
- On completion: clear lock, increment packet count.

### Chaos transitions

- At 4 sent packets: open new-client modal and enable Client D path.
- When D finishes handshake in `chaos-new-client`: trigger timeout modal.
- Reconnect action (`tcp-timeout` / `reconnect`) enters `chaos-redo`:
  - Resets only A/B/C connection state.
  - Clears A/B/C in-flight internet items.
  - Removes A/B/C-scoped packet items from pool groups.
  - Re-injects A/B/C received SYN and SYN-ACK items.
  - Preserves D-related packet availability.
- First packet sent during `chaos-redo` triggers breaking-point modal.
- `tcp-exhaustion` / `continue` transitions to UDP mode:
  - Received list cleared.
  - UDP frames injected into pool.
  - Internet transit cleared.

---

## UDP Stage (`useUdpPhase`)

### Key constants

- `FRAME_SEND_MS = 1500`
- `NOTICE_MS = 2000`
- Intro delay before streaming: `200ms`

### Phase progression

1. `intro`
2. `streaming`
3. `complete`

### Streaming rules

- Frames must be sent strictly in order (`expectedFrame = lastSent + 1`).
- Wrong-order frame:
  - Mark `rejected`.
  - Show notice.
  - Remove from internet after short delay.
- Correct frame:
  - Mark `sending`.
  - Keep visible in internet while timer runs.
  - Remove after `FRAME_SEND_MS`.
  - Apply per-client delivery destiny for that frame.

Delivery map (`frame-destiny.ts`):

- Frame 1: A/B/C delivered
- Frame 2: C lost
- Frame 3: A/B/C delivered
- Frame 4: A lost
- Frame 5: B lost
- Frame 6: A/B/C delivered

On completion:

- Open `udp-success` modal.
- Mark question complete via `progress.completeQuestion()`.
- On modal submit (`complete`), call `onQuestionComplete()`.

---

## Modal Contracts

Modal builders in `-utils/modal-builders.ts`:

- `tcp-connected`
- `tcp-new-client`
- `tcp-timeout` (`reconnect` action)
- `tcp-exhaustion` (`continue` action, blocking)
- `udp-success` (`complete` action)

Event handling:

- TCP hook (`useEngineEvents("udp-tcp-phase")`): handles reconnect/continue modal actions.
- UDP hook (`useEngineEvents("udp-phase")`): handles final completion modal action.

---

## Contextual Hints and Progress

- `getContextualHint()` derives hint text from `mode`, current sub-phase, `expectedFrame`, and `packetsSent`.
- TCP client progress bars show packet receipt ordering status:
  - `received`, `out-of-order`, `missing`.
- UDP progress bars show frame status:
  - `pending`, `delivered`, `lost`.

---

## Known Implementation Caveats

1. `TcpPhase` includes values not actively used in the main flow (`handshake-syn`, `handshake-ack`).
2. `INVENTORY_GROUPS` is exported in constants but not consumed directly by this route's runtime bootstrap.
3. Gameplay logic is intentionally imperative; behavior rules are empty.
4. The question relies on timer-based sequencing, so race prevention refs (`activeRef`, lock refs, timer cleanup) are part of core correctness.

---

## Verification Checklist (When Updating This Question)

- Ensure blueprint and route stay aligned on:
  - Client D trigger threshold.
  - Reconnect scope (A/B/C-only reset behavior).
  - UDP frame visibility while sending.
  - Space layout model (`internet` grid + client custom spaces).
- Validate with:
  - `pnpm check:biome`
  - `pnpm check:tsc`
