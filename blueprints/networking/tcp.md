# TCP File Fragmentation Blueprint

Reference implementation for an imperative event-driven networking question with timer-based packet simulation, TCP three-way handshake, ordered delivery with head-of-line blocking, packet loss with duplicate-ACK retransmission, and dual-file progressive delivery.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `tcp-fragmentation`
- Title: `Deliver message.txt`
- Description: `Large files must be split, ordered, and delivered reliably. Build the missing TCP pieces to get message.txt across.`
- Learning Objective: Understand MTU limits, IP fragmentation, TCP three-way handshake (SYN, SYN-ACK, ACK), sequence numbering, head-of-line blocking, packet loss, duplicate ACK detection, retransmission, connection teardown (FIN), and the difference between file-level and packet-level delivery.

---

## Architecture Pattern

This question uses the imperative event-driven architecture, NOT the behavior-driven pattern used by DHCP and Internet. The key characteristics:

- `QuestionDefinition` with spaces and entities, but empty `phaseRules` array and minimal behaviors (only 1 rule for success modal navigation).
- `useQuestionRuntime` for bootstrap, but all game logic lives in a large imperative hook `useTcpState` (~1200 lines).
- Phase transitions are managed imperatively via `executionFlow.requestPhaseTransition()` inside `useTcpState`.
- Event processing uses `useEngineEvents("tcp-state")` to react to `ENTITY_ENTERED_SPACE`, `ENTITY_MOVED`, and `MODAL_CLOSED` events.
- Timer-based animations simulate packet travel across the internet using `setTimeout` with configurable delays.
- No entity click handlers. Entities are not clickable in this question.
- No terminal phase. The terminal is not used. The question goes directly from "closing" phase to "terminal" phase where the success modal is shown and the question completes.

---

## File Structure

All files live under `src/routes/questions/networking/tcp/`:

- `index.tsx` — Route definition.
- `-page.tsx` — Main page component. Contains the grid layout, server log panel, receiving buffer display, connection tunnel visualization, and drawer management. Delegates all game logic to `useTcpState`.
- `-utils/constants.ts` — Static configuration: question metadata, 3 grid space configs, 2 pool configs, entity definitions for files (message.txt, notes.txt), split packets (3 message + 6 notes), TCP tools (SYN, ACK, FIN), and system packets (SYN-ACK, FIN-ACK).
- `-utils/definition.ts` — `TCP_DEFINITION`: QuestionDefinition with `initialPhase: "mtu"`, empty phaseRules, and 6 entity groups.
- `-utils/behaviors.ts` — `TCP_BEHAVIORS`: Only 1 behavior rule (success modal navigate).
- `-utils/use-tcp-state.ts` — `useTcpState`: The main imperative hook (~1200 lines) containing all game logic, phase management, entity state transitions, timer scheduling, buffer management, and packet arrival handling.
- `-utils/modal-builders.ts` — 10 modal builder functions.
- `-utils/entity-label.ts` — `getTcpItemLabel(type)`.
- `-utils/entity-badge.ts` — `getTcpStatusMessage(item)`.
- `-utils/get-contextual-hint.ts` — `getContextualHint(state)`.

---

## Question Definition

### Spaces

3 grid spaces plus 2 pool spaces:

Grid spaces:
1. `splitter` (Content Splitter) — 1x1, maxCapacity 1. Drop zone for files to be split into packets.
2. `internet` (Internet) — 1x3, maxCapacity 3. Transit zone where packets travel. Items placed here trigger timer-based delivery to the server.
3. `server` (Server) — 4x3, maxCapacity 12. Destination where packets arrive. Arrival triggers processing logic (reject if no connection, accept if connected, buffer if out of order).

Pool spaces:
1. `inventory` (Inventory) — Main inventory pool, always visible. Holds draggable items.
2. `received` (Received) — Hidden initially. Becomes visible when SYN is received by server. Shows received non-draggable items like SYN-ACK.

### Entities

Six groups of entities with different initial placement:

Group 1 — File inventory items (start in `inventory` pool):
1. `message-file-1` (type: `message-file`) — "message.txt". Allowed in inventory, internet, splitter, server. Data: `{ tcpState: "ready" }`.

Group 2 — System packets (created but NOT placed in any space):
2. `syn-ack-flag-1` (type: `syn-ack-flag`) — "SYN-ACK". Allowed in inventory, internet. Not draggable by user. Data: `{ tcpState: "idle" }`.
3. `fin-ack-flag-1` (type: `fin-ack-flag`) — "FIN-ACK". Allowed in inventory, internet. Data: `{ tcpState: "idle" }`.

Group 3 — TCP tool items (created but NOT placed):
4. `syn-flag-1` (type: `syn-flag`) — "SYN". Allowed in inventory, internet, server. Data: `{ tcpState: "idle" }`.
5. `ack-flag-1` (type: `ack-flag`) — "ACK". Allowed in inventory, internet, server. Data: `{ tcpState: "idle" }`.
6. `fin-flag-1` (type: `fin-flag`) — "FIN". Allowed in inventory, internet, server. Data: `{ tcpState: "idle" }`.

Group 4 — Message packet items (created but NOT placed):
7-9. `split-packet-1` through `split-packet-3` (type: `split-packet`) — "Fragment". Allowed in inventory, internet, server. Data: `{ seq: 1|2|3, seqEnabled: false, tcpState: "idle", fileKey: "message" }`.

Group 5 — Notes file item (created but NOT placed):
10. `notes-file-1` (type: `notes-file`) — "notes.txt". Allowed in inventory, internet, splitter, server. Data: `{ tcpState: "ready" }`.

Group 6 — Notes packet items (created but NOT placed):
11-16. `notes-packet-1` through `notes-packet-6` (type: `split-packet`) — "Fragment". Allowed in inventory, internet, server. Data: `{ seq: 1|2|3|4|5|6, seqEnabled: false, tcpState: "idle", fileKey: "notes" }`.

Note: message.txt splits into 3 packets, notes.txt splits into 6 packets. The larger notes.txt file is used for the packet loss scenario because more packets create more opportunities for out-of-order delivery and loss.

### Phase Rules

The phaseRules array is EMPTY. All phase transitions are managed imperatively by `useTcpState` via `executionFlow.requestPhaseTransition()`.

---

## TCP Phases

The question progresses through 12 phases managed by `useTcpState`:

1. `mtu` — Initial phase. Only message.txt is in inventory. User tries to drag it to internet or server. The file is rejected because it exceeds MTU limits. MTU modal opens. Splitter space becomes visible.

2. `splitter` — User drags message.txt to the splitter space. The splitter "splits" it into 3 fragment packets that appear in inventory. The original file entity is removed from the splitter.

3. `split-send` — User drags fragment packets to internet space. Without a TCP connection, packets that reach the server are rejected. After all 3 packets are rejected, the SYN intro modal opens. SYN flag appears in inventory.

4. `syn` — User drags SYN to internet. SYN travels (2000ms delay) to server.

5. `syn-wait` — SYN is in transit. After arrival at server, server sends SYN-ACK back through internet to client. SYN-ACK arrives at the received pool. SYN-ACK received modal opens. Phase transitions to `ack`. ACK flag appears in inventory.

6. `ack` — User drags ACK to internet. ACK travels to server. ACK intro modal opens.

7. `connected` — Three-way handshake complete. Connection established. All message packets get sequence numbers enabled (displayed as "Packet #1", "Packet #2", etc.). Handshake complete modal opens. User now sends the 3 message packets. Server accepts them, tracks in receiving buffer, handles out-of-order buffering with head-of-line blocking modal.

8. `notes` — message.txt fully received. Server announces success. notes.txt file appears in inventory. User splits it in splitter, getting 6 numbered packets. Packets already have sequence numbers enabled. Loss scenario is activated for this file.

9. `loss` — Packet #2 of notes.txt is configured to be "lost" on its first send attempt. When packet #2 enters the internet space, it fades out and returns to inventory. Packet loss modal opens. Meanwhile, other packets (3, 4, 5, 6) that arrive at the server are buffered. Server sends ACKs. After 3+ duplicate ACKs requesting packet #2, phase transitions to `resend`.

10. `resend` — Duplicate ACK modal opens. Packet #2 is renamed to "Packet #2 (Resend?)". User resends packet #2. This time it goes through successfully. Buffered packets are released in order. notes.txt completes.

11. `closing` — Both files delivered. FIN flag appears in inventory. Close connection modal opens. User drags FIN to internet/server. Server sends FIN-ACK. Connection status changes to disconnected.

12. `terminal` — FIN-ACK received. Success modal opens. Question marked as completed.

---

## Timer Constants

All packet travel and processing delays:

- `INTERNET_TRAVEL_MS = 2000` — Time for a packet to traverse the internet space (from internet grid to server grid, or vice versa for SYN-ACK/FIN-ACK).
- `SERVER_REJECT_DELAY_MS = 2000` — Time before server rejects an unconnected packet.
- `PACKET_REJECT_RETURN_MS = 1500` — Time for a rejected packet to return to inventory.
- `FILE_PROCESS_DELAY_MS = 1500` — Time for server to process a file (before rejecting it as unknown).
- `FILE_REJECT_DELAY_MS = 1500` — Time for file to be marked rejected after processing.
- `ASSEMBLE_DELAY_MS = 2000` — Time for server to assemble a completed file from packets.
- `BUFFER_RELEASE_DELAY_MS = 1500` — Initial delay before releasing buffered packets in order.
- `BUFFER_STEP_DELAY_MS = 800` — Delay between each buffered packet release step.
- `LOSS_FADE_MS = 700` — Time for a "lost" packet to fade before returning to inventory.

---

## Event Processing

The `useTcpState` hook uses `useEngineEvents("tcp-state")` to process events. It handles three event types:

`ENTITY_ENTERED_SPACE` — Dispatched when an entity is first placed in a space (e.g., dragged from inventory to internet). Routes to `handleSpaceEntry(entityId, spaceId)`.

`ENTITY_MOVED` — Dispatched when an entity moves between spaces. Routes to `handleSpaceEntry(entityId, toSpaceId)`.

`MODAL_CLOSED` — Dispatched when a modal is dismissed. Routes to `handleModalClosed(modalId)` which handles specific post-modal actions:
- `mtu-limit` close: unlocks the splitter space, returns the pending file to inventory.
- `syn-ack-received` close: opens the ACK intro modal.
- `duplicate-acks` close: allows packet #2 to pass through on next attempt.

---

## Space Entry Handlers

When an entity enters a space, `handleSpaceEntry` routes to the appropriate handler:

### Splitter Space Handler

Only accepts `message-file` and `notes-file` types. When a file is dropped:
- Removes the file from the splitter space.
- For message: creates 3 fragment packets in inventory with `seqEnabled: false`. Phase becomes `split-send`. Buffer reset to 3 slots.
- For notes: creates 6 fragment packets in inventory with `seqEnabled: true` (already numbered). Activates the loss scenario (`allowPacket2Ref.current = false`). Phase becomes `loss`. Buffer reset to 6 slots.

### Internet Space Handler

Handles all entity types passing through the internet:

For `message-file` or `notes-file`: If in `mtu` phase, triggers MTU rejection flow (shows warning, then error, then MTU modal, then returns to inventory). If in any other phase, triggers a "too large" rejection that returns the file to inventory.

For `syn-flag`: Sets entity to in-transit status. After `INTERNET_TRAVEL_MS`, moves entity to server grid.

For `ack-flag`: Sets entity to in-transit. After `INTERNET_TRAVEL_MS`, moves to server grid.

For `fin-flag`: Sets entity to in-transit. After `INTERNET_TRAVEL_MS`, moves to server grid.

For `syn-ack-flag` or `fin-ack-flag` (with direction "server-to-client"): These are system-generated packets traveling from server to client. After `INTERNET_TRAVEL_MS`, triggers the appropriate arrival handler (SYN-ACK or FIN-ACK arrival).

For `split-packet`: Sets to in-transit. If this is the loss scenario and the packet is notes packet #2 on first attempt (`allowPacket2Ref.current === false`), triggers packet loss return. If this is a resend of the target packet, allows it through and reverts phase. Otherwise, after `INTERNET_TRAVEL_MS`, moves to server grid.

### Server Space Handler

Handles all entity types arriving at the server:

For `message-file` or `notes-file`: Unknown file, returns to inventory with error.

For `syn-flag`: Triggers SYN arrival. Server logs "SYN received - sending SYN-ACK". Creates SYN-ACK entity in internet space with direction "server-to-client". Received pool becomes visible.

For `ack-flag`: Triggers ACK arrival. Connection becomes active. Sequence numbers enabled on all packets. Buffer reset. Server logs "Connected". Handshake complete modal opens. Phase becomes `connected`.

For `fin-flag`: Triggers FIN arrival. FIN-ACK entity appears in inventory (for server to send). Connection becomes inactive and closed. Server logs "Disconnected". Phase becomes `terminal`.

For `split-packet`: If no active connection, packet is rejected (processing delay, then "I don't understand this package!", then return to inventory). After all 3 message packets are rejected, SYN intro modal opens and phase becomes `syn`. If connection is active, triggers `handlePacketArrival`.

---

## Packet Arrival and Buffer Management

When a connected split-packet arrives at the server via `handlePacketArrival(packetId, fileKey, seq)`:

The hook maintains per-file tracking:
- `receivedSeqsRef` — Set of sequence numbers successfully received in order.
- `waitingSeqsRef` — Set of sequence numbers received out of order (buffered).
- `expectedTotalRef` — Total packets expected for the current file.
- `ackTrackingRef` — Tracks last ACK number and duplicate count.

The arrival logic computes the next expected sequence number (first gap in received set):

If `seq > expected` (out of order): Packet is buffered (status "warning"). Head-of-line blocking modal shown on first occurrence. ACK message logged with the expected sequence number. If in loss phase and enough packets are buffered (3+), triggers resend for the missing packet.

If `seq === expected` (in order): Packet is received (status "success"). If this was the resend target, clears the resend state. ACK logged. `scheduleBufferedRelease` is called to release any buffered packets that are now consecutive. If all packets received, triggers file completion.

### Buffered Release

`scheduleBufferedRelease` finds buffered packets that are now consecutive after the latest received sequence number. It releases them one at a time with `BUFFER_STEP_DELAY_MS` between each, updating their status from "waiting" to "received", logging ACKs, and checking for file completion after each release.

### File Completion

When all packets for a file are received (`handleFileComplete`):

For message: Server logs "message.txt received successfully! Waiting for notes.txt packets...". notes.txt file appears in inventory. Buffer resets to 6 slots. Phase becomes `notes`.

For notes: Server logs "notes.txt received successfully!". FIN flag appears in inventory. Loss scenario deactivated. Phase becomes `closing`. Close connection modal opens.

---

## Packet Loss Mechanics

The loss scenario is activated when notes.txt is split (phase `loss`):

- `LOSS_PACKET_SEQ = 2` — Packet #2 is the designated loss target.
- `allowPacket2Ref.current` starts as `false` when loss scenario begins.
- When packet #2 enters internet space, it is "lost": status set to error, fades after `LOSS_FADE_MS`, returns to inventory. Packet loss modal opens.
- Meanwhile, other packets (1, 3, 4, 5, 6) travel normally. Server buffers out-of-order ones.
- Server sends duplicate ACKs requesting packet #2. After 3 duplicates, `triggerResend` fires.
- Packet #2 is renamed to "Packet #2 (Resend?)". Duplicate ACK modal opens.
- When duplicate-acks modal is closed, `allowPacket2Ref.current` becomes `true`.
- User resends packet #2. This time it passes through internet normally and arrives at server.
- Buffered packets are released in order. File completes.

---

## Behaviors

Only 1 behavior rule defined:

### Success Modal Navigate Rule

Rule `tcp.success-modal-navigate`:
- Trigger: `modalSubmitted("tcp-success", "primary")`
- Handler: Sets `context.navigateAway = true`.

The behavior context type is:

```
type TcpBehaviorContext = {
  navigateAway: boolean;
};
```

Initial context: `{ navigateAway: false }`.

The page component watches `behaviorContext.navigateAway` and calls `onQuestionComplete()`.

---

## Modals

10 modals defined in `modal-builders.ts`:

### MTU Limit Modal
- ID: `mtu-limit`
- Title: "MTU Limit Reached"
- Content: Explains that message.txt is too large for a single network packet due to MTU limits. Includes link to MTU Wikipedia article.
- Actions: Close

### SYN Intro Modal
- ID: `syn-intro`
- Title: "Start the Handshake (SYN)"
- Content: Explains server rejected fragments because no TCP connection exists. Instructs to send SYN to request connection.
- Actions: Close

### SYN-ACK Received Modal
- ID: `syn-ack-received`
- Title: "SYN-ACK Received"
- Content: Server accepted SYN and replied with SYN-ACK, sharing its sequence number.
- Actions: OK (primary, closesModal)

### ACK Intro Modal
- ID: `ack-intro`
- Title: "Send ACK"
- Content: ACK confirms the server's SYN-ACK and completes the handshake.
- Actions: "Send ACK" (primary, closesModal)

### Handshake Complete Modal
- ID: `handshake-complete`
- Title: "Connection Established"
- Content: Connection established, both sides agreed on starting sequence number. Packets will be numbered for ordering and verification.
- Actions: Close

### Head-of-Line Blocking Modal
- ID: `hol-blocking`
- Title: "Head-of-Line Blocking"
- Content: Packet arrived out of order. Server buffers it, waits for the missing one, then reorders.
- Actions: Close

### Packet Loss Modal
- ID: `packet-loss`
- Title: "Packets Lost"
- Content: Packet #2 vanished in the internet. Networks are unreliable. Server is waiting for the missing packet.
- Actions: Close

### Duplicate ACK Modal
- ID: `duplicate-acks`
- Title: "Duplicate ACKs"
- Content: Server keeps repeating ACK for the missing packet. Three duplicate ACKs signal loss. Instructs to resend. Dynamic: shows the specific missing sequence number.
- Actions: Close

### Close Connection Modal
- ID: `close-connection`
- Title: "Close the Connection"
- Content: Transfer complete. Send FIN to close the connection cleanly.
- Actions: Close

### Success Modal
- ID: `tcp-success`
- Title: "Delivery Complete"
- Content: Summary of what was handled: MTU limits, ordering, loss, and the handshake. TCP turned unreliable delivery into a reliable stream.
- Actions: "Next question" (primary, closesModal)

---

## Page Layout

The page renders:

1. Title and description header.
2. GameBoard containing:
   - Grid layout with 2 or 3 columns depending on splitter visibility:
     - Before splitter visible: 2 areas (internet, server)
     - After splitter visible: 3 areas (splitter, internet, server)
   - Server grid uses responsive sizing: `{ base: [2, 6], xl: [3, 4] }`.
   - Connection tunnel visualization (horizontal bar, visible when connected, animated with CSS transitions).
   - Server log panel (monospace, scrollable, shows all server messages).
   - Receiving buffer display (shows buffer slots with seq numbers and status icons: empty "___", received checkmark, waiting hourglass). Visible when connection is active or items have been received.
   - Board arrow from internet to server space.
   - ContextualHint component.
   - DragOverlay for drag preview.
   - DrawerLayout with inventory pool. Received pool shown when `receivedPoolVisible` is true.
3. Modal component.

No terminal is rendered in the TCP question page. The success modal serves as the final interaction.

---

## Drawer Management

The drawer contains up to 2 pool spaces:
- `inventory` — Always visible.
- `received` — Shown when `receivedPoolVisible` becomes true (after first SYN arrives at server).

When the received pool becomes visible, the drawer is opened and its `spaceIds` config is updated to include both pools.

---

## Game Flow

1. Initial state: Internet and Server spaces visible. message.txt in inventory.
2. MTU discovery: Drag message.txt to internet. File is rejected (too large). MTU modal opens. Splitter space appears.
3. Split file: Drag message.txt to splitter. 3 fragment packets appear in inventory.
4. Failed delivery: Drag fragments to internet/server. Server rejects them (no connection). After all 3 rejected, SYN intro modal. SYN flag appears in inventory.
5. Three-way handshake: Drag SYN to internet (travels to server). Server sends SYN-ACK (travels back). SYN-ACK modal. ACK flag appears. Drag ACK to internet (travels to server). Handshake complete modal.
6. Deliver message.txt: Drag numbered packets to internet. They travel to server. Server tracks buffer. Out-of-order packets trigger head-of-line blocking modal. All 3 received, message.txt assembled.
7. Second file: notes.txt appears. Drag to splitter. 6 numbered packets. Loss scenario active.
8. Packet loss: Send packets. Packet #2 is lost on first attempt. Other packets buffered at server. Duplicate ACKs. Resend packet #2.
9. Connection teardown: FIN appears. Drag to internet/server. Server sends FIN-ACK. Connection closed.
10. Success: Success modal opens. "Next question" navigates away.

---

## Educational Content

Concepts taught:
- MTU (Maximum Transmission Unit): Maximum packet size enforced by networks
- IP Fragmentation: Splitting large files into smaller packets for transmission
- TCP Three-Way Handshake: SYN, SYN-ACK, ACK sequence to establish a connection
- Sequence Numbers: Numbering packets so the receiver can order and verify them
- Head-of-Line Blocking: Server buffers out-of-order packets and waits for the missing one
- Packet Loss: Packets can disappear in transit on unreliable networks
- Duplicate ACKs: Server repeatedly requests the missing packet; 3 duplicates signal loss
- Retransmission: Resending lost packets to ensure reliable delivery
- Connection Teardown: FIN flag to cleanly close a TCP connection
- Reliable Delivery: TCP guarantees ordered, complete delivery despite unreliable network

Entity tooltips provide explanations with links to Wikipedia articles.
