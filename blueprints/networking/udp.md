# UDP Video Streaming Blueprint

Reference implementation for an imperative event-driven networking question with a dual-phase architecture (TCP then UDP), multi-client TCP handshake with chaos scenarios, connectionless UDP frame broadcasting with predetermined delivery destiny, and progress bar visualization.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `udp-video-streaming`
- Title: `Stream movie.mp4 to 3 viewers`
- Description: `Your viewers are waiting! Establish connections and deliver the video stream to all clients.`
- Learning Objective: Contrast TCP's connection-oriented approach with UDP's connectionless approach for video streaming. Demonstrate why TCP's per-client handshake and per-packet acknowledgment become impractical at scale, and why UDP's fire-and-forget model is better suited for real-time streaming despite packet loss.

---

## Architecture Pattern

This question uses the imperative event-driven architecture with two separate phase hooks:

- `QuestionDefinition` with spaces and entities, but empty `phaseRules` array and empty behaviors (no rules at all).
- `useQuestionRuntime` for bootstrap only. No behavior reactor is active.
- Two independent imperative hooks manage the two halves of the question:
  - `useTcpPhase` (~1093 lines) — Manages the TCP portion: multi-client handshake, data delivery, chaos scenarios (new client, timeout, reconnection), and transition to UDP.
  - `useUdpPhase` (~262 lines) — Manages the UDP portion: frame broadcasting with predetermined delivery destiny, progress bars, and question completion.
- A `mode` state (`"tcp"` or `"udp"`) in the page component controls which phase hook is active and which view is rendered.
- Event processing uses `useEngineEvents` in both hooks to handle modal submissions.
- Entity placement detection uses `useEffect` watching space state changes (comparing previous vs current entity IDs in spaces) rather than `useEngineEvents` for space entry.
- No entity click handlers. Entities are not clickable.
- No behavior rules. Success navigation is handled directly by `useUdpPhase` calling `onQuestionComplete()` on modal submission.

---

## File Structure

All files live under `src/routes/questions/networking/udp/`:

- `index.tsx` — Route definition.
- `-page.tsx` — Main page component. Contains mode switching, TcpView and UdpView subcomponents, drawer, terminal (unused in practice), contextual hints, and notice display.
- `-components/ProgressBar.tsx` — UDP progress bar component showing per-client frame delivery status.
- `-utils/constants.ts` — Static configuration: question metadata, 8 grid space configs (internet, 4 client inboxes, 3 UDP client spaces), 1 pool config, entity builder functions (SYN, SYN-ACK, ACK, data, frame packets), inventory groups (5 groups with visibility control).
- `-utils/definition.ts` — `UDP_DEFINITION`: QuestionDefinition with `initialPhase: "setup"`, empty phaseRules, empty behaviors.
- `-utils/behaviors.ts` — `UDP_BEHAVIORS`: Empty rules array, context type `Record<string, never>`.
- `-utils/types.ts` — Type definitions: `ActiveMode`, `TcpPhase` (9 phases), `UdpPhase` (3 phases), `PacketReceiptStatus`.
- `-utils/use-tcp-phase.ts` — `useTcpPhase`: Imperative hook for TCP phase (~1093 lines).
- `-utils/use-udp-phase.ts` — `useUdpPhase`: Imperative hook for UDP phase (~262 lines).
- `-utils/frame-destiny.ts` — `FRAME_DESTINY`: Predetermined map of which frames reach which clients.
- `-utils/modal-builders.ts` — 5 modal builder functions.
- `-utils/get-contextual-hint.ts` — `getContextualHint(state)`.

---

## Question Definition

### Spaces

8 grid spaces plus 1 pool space:

Grid spaces:
1. `internet` (Internet) — 1x3, maxCapacity 3. Shared transit zone for both TCP and UDP phases. Packets and frames are dragged here to send them.
2. `client-a-inbox` (Client A) — 2x2, maxCapacity 4. TCP phase: receives SYN-ACK packets from server and accepts data packets for client A.
3. `client-b-inbox` (Client B) — 2x2, maxCapacity 4. Same as above for client B.
4. `client-c-inbox` (Client C) — 2x2, maxCapacity 4. Same as above for client C.
5. `client-d-inbox` (Client D) — 2x2, maxCapacity 4. Hidden initially. Appears when the chaos "new client" scenario triggers.
6. `client-a` (Client A) — 1x1, maxCapacity 0. UDP phase: display-only space for client A.
7. `client-b` (Client B) — 1x1, maxCapacity 0. UDP phase: display-only space for client B.
8. `client-c` (Client C) — 1x1, maxCapacity 0. UDP phase: display-only space for client C.

Pool spaces:
1. `inventory` (Inventory) — Main inventory pool. Holds all draggable items. Managed via 5 inventory groups with dynamic visibility.

### Entities

Entities are created from multiple builder functions. All entities are created but NOT placed in any space initially. The inventory groups manage which entities appear in the pool:

TCP handshake entities:
- `syn-packet-a`, `syn-packet-b`, `syn-packet-c` (type: `syn-packet`) — SYN packets from initial clients. Created but not placed initially (SYN reception is assumed at start).
- `syn-ack-packet-a` through `syn-ack-packet-d` (type: `syn-ack-packet`) — SYN-ACK packets the server sends. Placed in "Server Response" inventory group.
- `ack-packet-a` through `ack-packet-d` (type: `ack-packet`) — ACK packets from clients. Not placed initially.
- Received SYN packets (`syn-packet-a`, `syn-packet-b`, `syn-packet-c` — non-draggable versions) — Placed in "Received" inventory group to show SYNs have arrived.

TCP data entities:
- `data-packet-{clientId}-{seq}` (type: `data-packet`) for clients a, b, c and sequences 1-6 — 18 total data packets. Hidden initially, shown when handshake completes. Each labeled "Packet N -> Client X".

UDP frame entities:
- `udp-frame-1` through `udp-frame-6` (type: `frame`) — 6 UDP frames labeled "Frame 1" through "Frame 6". Hidden initially, shown when transitioning to UDP.

### Inventory Groups

5 inventory groups manage entity visibility in the pool:

1. `incoming` (Incoming Packets) — Initially hidden, empty. Used for incoming packet display.
2. `outgoing` (Server Response) — Initially visible. Contains SYN-ACK packets for clients A, B, C.
3. `data-packets` (Video Packets) — Initially hidden. Contains all 18 data packets. Becomes visible when TCP handshake completes.
4. `received` (Received) — Initially visible. Contains non-draggable received SYN packets.
5. `frames` (Video Frames) — Initially hidden. Contains 6 UDP frames. Becomes visible when transitioning to UDP.

### Phase Rules and Behaviors

Both arrays are EMPTY. All logic is imperative.

---

## Dual-Phase Architecture

### Mode State

The page component maintains a `mode` state of type `ActiveMode = "tcp" | "udp"`.

- When `mode === "tcp"`: `TcpView` is rendered (client inboxes + internet), `useTcpPhase` is active.
- When `mode === "udp"`: `UdpView` is rendered (internet + progress bars), `useUdpPhase` is active.
- Transition from TCP to UDP is triggered by `useTcpPhase` calling the `onTransitionToUdp` callback.

### TCP Phase Hook

`useTcpPhase` manages the TCP portion through 9 sub-phases:

TCP phases (type `TcpPhase`):
1. `handshake-syn` — Waiting for SYN packets to be placed (skipped in practice since SYNs are pre-received).
2. `handshake-synack` — Initial phase. User drags SYN-ACK packets from inventory to internet. They auto-travel to the correct client inbox.
3. `handshake-ack` — Waiting for ACK packets. ACK packets appear in client inboxes after SYN-ACK arrives.
4. `connected` — All 3 initial clients connected. TCP Connected modal shown. Data packets become visible.
5. `data-transfer` — User drags data packets to internet, targeted at specific clients. Each packet auto-travels to its client inbox.
6. `chaos-new-client` — After 7 data packets sent, Client D appears. New Client modal. User must handle D's connection (SYN-ACK + ACK).
7. `chaos-timeout` — When Client D connects, original clients A/B/C time out. Timeout modal. User must reconnect them.
8. `chaos-redo` — User re-does the SYN-ACK handshake for A/B/C. After sending the first packet in redo phase, breaking point triggers.
9. `breaking-point` — Exhaustion modal. "You've done 20+ actions just managing connections. What if the server didn't need to track connections at all?" User clicks "Discover UDP" to transition.

### UDP Phase Hook

`useUdpPhase` manages the UDP portion through 3 sub-phases:

UDP phases (type `UdpPhase`):
1. `intro` — Brief 200ms delay, then auto-transitions to streaming.
2. `streaming` — User drags frames to internet space in order (Frame 1, then 2, etc.). Each frame is broadcast to all 3 clients simultaneously. Delivery is predetermined by `FRAME_DESTINY`. Progress bars update.
3. `complete` — All 6 frames sent. Success modal opens. Question completes.

---

## TCP Phase Mechanics

### SYN-ACK Delivery

At start, the question assumes SYNs have been received from clients A, B, C (shown as non-draggable items in the "Received" group). SYN-ACK packets for each client are in the "Server Response" group.

When user drags a SYN-ACK to the internet space:
1. Packet marked as in-transit (warning status).
2. Removed from outgoing pool group.
3. After `INTERNET_TRAVEL_MS` (1500ms), auto-transferred to the correct client inbox based on the packet's `clientId`.
4. On inbox arrival: marked as delivered (success), client status updated to "Connected", ACK packet for that client added to received pool.
5. When all 3 initial clients are connected, `handleHandshakeComplete` fires.

### Client Mismatch Validation

If a packet is placed in the wrong client's inbox (e.g., SYN-ACK for Client A dropped in Client B's inbox), the packet is rejected with error status and a notice message ("This packet is for Client A."). The packet is auto-removed after 400ms.

### Data Packet Delivery

After handshake completes, data packets become visible. Each packet is labeled with its target client and sequence number.

When user drags a data packet to internet:
1. If the target client is not connected: rejected with error, notice "Client X is not connected."
2. If the target client is "locked" (previous packet still being processed): rejected.
3. Otherwise: client locked, packet marked in-transit, removed from data-packets pool group.
4. After `INTERNET_TRAVEL_MS`, transferred to target client inbox.
5. On inbox arrival: marked as delivered, sequence tracked in `clientPackets`. After `DATA_ACK_MS` (500ms), packet removed, client unlocked, packet counter incremented.

### Chaos Scenario: New Client

After 7 data packets are sent (`packetsSent === 7`), `triggerNewClient` fires:
1. Phase becomes `chaos-new-client`.
2. Client D inbox space becomes visible.
3. Client D's SYN is marked as received.
4. SYN-ACK for Client D added to outgoing pool.
5. New Client modal opens: "Client D wants to watch your stream."

### Chaos Scenario: Timeout

When Client D's connection is established (SYN-ACK delivered to D's inbox):
1. `triggerTimeout` fires.
2. Phase becomes `chaos-timeout`.
3. Timeout modal: "While you were busy with Client D, Clients A, B, and C got impatient. Their connections timed out."
4. User clicks "Reconnect Clients".

### Chaos Scenario: Reconnect

On reconnect modal action:
1. `startReconnect` fires. Phase becomes `chaos-redo`.
2. Clients A, B, C reset to "SYN received" state.
3. All TCP spaces cleared.
4. Inventory groups reset: SYN-ACK packets for A, B, C restored.
5. User must redo the SYN-ACK handshake for all 3 clients.
6. On the very first data packet sent after reconnect, `triggerBreakingPoint` fires.

### Breaking Point

1. Phase becomes `breaking-point`.
2. Exhaustion modal: "You've done 20+ actions just managing connections. And you've barely sent any actual video data! What if the server didn't need to track connections at all?"
3. User clicks "Discover UDP".
4. `transitionToUdp` is called: all TCP pool groups hidden, frames pool group made visible, TCP spaces cleared, `onTransitionToUdp` callback invoked.
5. Page mode switches to `"udp"`.

---

## UDP Phase Mechanics

### Frame Broadcasting

The UDP phase renders a single internet space and a progress display (no client inboxes — UDP doesn't use them).

When user drags a frame to the internet space:
1. Frame order validation: must match `expectedFrame` (sequential: 1, 2, 3...). Wrong order shows error notice "Send Frame N first." and returns the frame after 400ms.
2. If correct order: frame marked as "sending" (warning status), removed from pool.
3. After `FRAME_SEND_MS` (1500ms): frame removed from internet space. `lastSentFrame` updated. Client delivery results applied based on `FRAME_DESTINY`.
4. When `frameNumber >= TOTAL_FRAMES` (6): phase becomes `complete`.

### Frame Destiny

`FRAME_DESTINY` is a hardcoded map defining which clients receive each frame:

```
Frame 1: A=delivered, B=delivered, C=delivered
Frame 2: A=delivered, B=delivered, C=lost
Frame 3: A=delivered, B=delivered, C=delivered
Frame 4: A=lost,      B=delivered, C=delivered
Frame 5: A=delivered,  B=lost,      C=delivered
Frame 6: A=delivered, B=delivered, C=delivered
```

This means:
- Client A receives 5/6 frames (83%) — loses frame 4
- Client B receives 5/6 frames (83%) — loses frame 5
- Client C receives 5/6 frames (83%) — loses frame 2

Each client loses a different frame, demonstrating that UDP packet loss is unpredictable but acceptable for streaming.

### Progress Bars

The `UdpView` renders a progress display showing:
- Next expected frame number.
- Per-client progress bars showing frame delivery status:
  - `"pending"` — Frame not yet sent.
  - `"delivered"` — Frame reached this client.
  - `"lost"` — Frame did not reach this client.
  - Percentage of frames received.

### Question Completion

When all 6 frames are sent:
1. Phase becomes `complete`.
2. Success modal opens: "All clients received enough frames to watch the video. UDP sends data without connections or acknowledgments. Some packets get lost — and that's okay for streaming."
3. `progress.completeQuestion()` is called.
4. On modal submission ("Complete" button), `useUdpPhase` calls `onQuestionComplete()` directly (no behavior rule needed).

---

## Modals

5 modals defined in `modal-builders.ts`:

### TCP Connected Modal
- ID: `tcp-connected`
- Title: "All Clients Connected!"
- Content: 3 TCP connections established. Took 9 actions just for setup. Now send actual video data.
- Actions: "Continue" (primary, closesModal)

### New Client Modal
- ID: `tcp-new-client`
- Title: "New Viewer Joined!"
- Content: Client D wants to watch the stream. Handle their connection request.
- Actions: "Handle Connection" (primary, closesModal)

### Timeout Modal
- ID: `tcp-timeout`
- Title: "Connection Timeout!"
- Content: While busy with Client D, Clients A/B/C timed out. TCP requires constant state management.
- Actions: "Reconnect Clients" (primary, closesModal, action ID: `reconnect`)

### Breaking Point Modal
- ID: `tcp-exhaustion`
- Title: "This is exhausting..."
- Content: 20+ actions managing connections, barely any video data sent. What if the server didn't need to track connections?
- Blocking: `true` (cannot dismiss by clicking backdrop)
- Actions: "Discover UDP" (primary, closesModal, action ID: `continue`)

### UDP Success Modal
- ID: `udp-success`
- Title: "Stream Delivered!"
- Content: All clients received enough frames. UDP sends data without connections or acknowledgments. Some packets get lost — okay for streaming.
- Actions: "Complete" (primary, closesModal, action ID: `complete`)

---

## Event Processing

### TCP Phase Events

`useTcpPhase` uses `useEngineEvents("udp-tcp-phase")` for modal submissions only:
- `tcp-timeout` modal with `reconnect` action: calls `startReconnect()`.
- `tcp-exhaustion` modal with `continue` action: calls `transitionToUdp()`.

Entity placement is detected via `useEffect` watching space state changes, not via `useEngineEvents`. Two effects track internet space and inbox spaces respectively, comparing previous entity IDs against current ones to find newly placed items.

### UDP Phase Events

`useUdpPhase` uses `useEngineEvents("udp-phase")` for modal submissions only:
- `udp-success` modal with `complete` action: calls `onQuestionComplete()`.

Frame placement detection uses `useEffect` watching `spaces.internet` changes.

---

## Page Layout

The page renders:

1. Title and description header.
2. GameBoard with mode-dependent content:
   - TCP mode (`TcpView`): Grid of 3-4 client inbox spaces (A, B, C, optionally D) above an internet transit space. Client status text displayed above each inbox.
   - UDP mode (`UdpView`): Internet space above a progress display box showing per-client frame delivery bars.
3. Active notice display (error or info messages that auto-dismiss after 2 seconds).
4. ContextualHint component.
5. DragOverlay for drag preview.
6. DrawerLayout with inventory pool.
7. TerminalLayout (present but closed; not used in gameplay).
8. Modal component.

### TCP Layout

Grid template:
- Mobile: single column, all spaces stacked vertically.
- Desktop: client inboxes in a row, internet space spanning full width below.
- When Client D appears, the grid expands from 3 to 4 columns.

### UDP Layout

Flex column layout:
- Internet space at top.
- Progress panel below with "UDP Streaming" header, expected frame indicator, and per-client progress bars.

---

## Game Flow

1. Initial state: TCP mode. Internet space and 3 client inboxes visible. "Received" pool shows SYNs from A/B/C. "Server Response" pool has SYN-ACK packets.
2. Complete handshake: Drag SYN-ACK packets to internet. They auto-travel to correct client. ACKs appear. All 3 clients connected. Connected modal.
3. Send data: Data packets appear. Drag them to internet targeted at specific clients.
4. Chaos — new client: After 7 packets, Client D appears. New viewer modal. Handle D's SYN-ACK.
5. Chaos — timeout: A/B/C time out. Timeout modal. User clicks "Reconnect Clients".
6. Chaos — redo: Re-handshake A/B/C. On first packet, breaking point triggers.
7. Breaking point: Exhaustion modal. User clicks "Discover UDP". Mode switches.
8. UDP streaming: 6 frames in inventory. Drag in order to internet. Each broadcasts to all clients. Predetermined delivery destiny determines losses. Progress bars update in real-time.
9. Completion: All 6 frames sent. Success modal. "Complete" navigates away.

---

## Educational Content

Concepts taught through TCP phase:
- TCP Three-Way Handshake: Per-client SYN, SYN-ACK, ACK connection setup
- Connection State Management: Each client has independent connection state
- Per-Packet Acknowledgment: Data packets must be individually acknowledged
- TCP Overhead: Connection setup + acknowledgment makes TCP expensive for multi-client streaming
- Scalability Problem: Adding clients multiplies the handshake and acknowledgment burden
- Connection Timeout: Idle connections expire, requiring reconnection

Concepts taught through UDP phase:
- Connectionless Protocol: UDP sends data without establishing connections
- Broadcasting: One frame is sent to all clients simultaneously
- Fire-and-Forget: No acknowledgments, no retransmission
- Acceptable Loss: Some frames are lost but streaming continues smoothly
- Streaming Use Case: Real-time media tolerates loss better than delay

The progression from TCP frustration to UDP simplicity is the core pedagogical arc: the user experiences firsthand why TCP's reliability guarantees become a liability for real-time streaming.
