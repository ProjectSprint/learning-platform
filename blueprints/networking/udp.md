# UDP Video Streaming Question

> **Question ID**: `udp-video-streaming`
> **Implementation Status**: 📋 Blueprint
> **Location**: `src/routes/questions/networking/udp/`
> **Last Updated**: 2026-01-29

---

## Overview

An interactive learning experience teaching UDP protocol fundamentals through video streaming simulation. Students first experience the pain of TCP connection management at scale, then discover how UDP's stateless, fire-and-forget approach solves real-time streaming challenges.

### Story & Narrative

**Question Title**: "📺 Stream movie.mp4 to 3 viewers"

**Question Description**: "Your viewers are waiting! Establish connections and deliver the video stream to all clients."

**Initial Terminal Prompt**: N/A (no terminal in this question)

---

## Learning Objectives

Students will understand:

1. **TCP Connection Overhead** — Each client requires a full handshake (SYN → SYN-ACK → ACK)
2. **TCP State Management** — Server must track connection state per client
3. **TCP Scalability Problems** — New clients cause chaos, connections timeout
4. **UDP Statelessness** — Server doesn't track connections or client state
5. **Fire-and-Forget Model** — Send once, don't wait for acknowledgment
6. **UDP Packet Loss** — Some packets don't arrive, and that's acceptable
7. **Real-Time Streaming Trade-offs** — Speed over reliability for live content

---

## Question Flow

### High-Level Progression

```
TCP PHASE (The Pain)
    ↓
Initial Handshakes (3 clients × 3 steps = 9 actions)
    ↓
Data Transfer Begins (packets with ACK waiting)
    ↓
~7 packets sent successfully
    ↓
CHAOS: Client D arrives!
    ↓
Handle Client D handshake
    ↓
Original clients A/B/C timeout
    ↓
Redo handshakes for A/B/C
    ↓
Send 1 more packet
    ↓
BREAKING POINT: "This is exhausting..." modal
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
UDP PHASE (The Liberation)
    ↓
Clear board, introduce UDP concept
    ↓
Video splits into 6 frames
    ↓
User drops frames into Outbox (sequential)
    ↓
Each frame broadcasts to all 3 clients (1.5s delay)
    ↓
Deterministic packet loss creates progress bar gaps
    ↓
All frames sent → Success modal with comparison
```

---

## Game Configuration

### TCP Phase Configuration

#### Canvas Setup (TCP)

| Canvas ID | Title | Dimensions | Max Items | Purpose |
|-----------|-------|------------|-----------|---------|
| `internet` | Internet | 4×1 | 4 | Packet transit zone |
| `client-a-inbox` | Client A | 2×2 | 4 | Client A connection inbox |
| `client-b-inbox` | Client B | 2×2 | 4 | Client B connection inbox |
| `client-c-inbox` | Client C | 2×2 | 4 | Client C connection inbox |
| `client-d-inbox` | Client D | 2×2 | 4 | Client D (appears mid-phase) |

**Canvas Visibility Rules**:
- `client-d-inbox`: Hidden initially, revealed when Client D joins

#### Inventory Groups (TCP)

| Group ID | Title | Initial Visibility | Purpose |
|----------|-------|-------------------|---------|
| `incoming` | Incoming Packets | Visible | SYN/ACK packets from clients |
| `outgoing` | Server Response | Hidden | SYN-ACK packets to send |
| `data-packets` | Video Packets | Hidden | Data packets after handshake |

#### Item Types (TCP)

| Type | Icon | Color | Draggable | Purpose |
|------|------|-------|-----------|---------|
| `syn-packet` | mdi:handshake-outline | #FBBF24 (yellow) | ✅ | Client connection request |
| `syn-ack-packet` | mdi:handshake | #F59E0B (amber) | ✅ | Server handshake response |
| `ack-packet` | mdi:check-circle-outline | #10B981 (green) | ✅ | Client handshake completion |
| `data-packet` | mdi:filmstrip | #60A5FA (blue) | ✅ | Video data packet |
| `ack-data` | mdi:check | #10B981 (green) | ❌ | Data acknowledgment (auto) |

**Item Data Schema (TCP)**:

```typescript
// Connection packets (SYN, SYN-ACK, ACK)
{
  clientId: "a" | "b" | "c" | "d",
  tcpState: "pending" | "in-transit" | "delivered"
}

// Data packets
{
  clientId: "a" | "b" | "c" | "d",
  seq: number,
  tcpState: "pending" | "in-transit" | "delivered" | "acked"
}
```

---

### UDP Phase Configuration

#### Canvas Setup (UDP)

| Canvas ID | Title | Dimensions | Max Items | Purpose |
|-----------|-------|------------|-----------|---------|
| `outbox` | Outbox | 1×1 | 1 | Fire-and-forget send zone |
| `client-a` | Client A | 1×1 | 0 | Display only (progress bar) |
| `client-b` | Client B | 1×1 | 0 | Display only (progress bar) |
| `client-c` | Client C | 1×1 | 0 | Display only (progress bar) |

**Note**: Client canvases in UDP phase are display-only, showing progress bars. They don't accept item drops.

#### Inventory Groups (UDP)

| Group ID | Title | Initial Visibility | Purpose |
|----------|-------|-------------------|---------|
| `frames` | Video Frames | Visible | F1-F6 frames to send |

#### Item Types (UDP)

| Type | Icon | Color | Draggable | Purpose |
|------|------|-------|-----------|---------|
| `frame` | mdi:filmstrip-box | #8B5CF6 (purple) | ✅ | Video frame to broadcast |

**Item Data Schema (UDP)**:

```typescript
{
  frameNumber: 1 | 2 | 3 | 4 | 5 | 6,
  state: "ready" | "sending" | "sent"
}
```

---

## Phase State Machine

### TCP Phases

```typescript
type TcpPhase =
  | "handshake-syn"      // Initial: 3 SYN packets in internet
  | "handshake-synack"   // Server must send SYN-ACKs
  | "handshake-ack"      // Clients send final ACKs
  | "connected"          // All 3 clients connected
  | "data-transfer"      // Sending video packets
  | "chaos-new-client"   // Client D arrives
  | "chaos-timeout"      // Original clients timed out
  | "chaos-redo"         // Redoing handshakes
  | "breaking-point"     // Show exhaustion modal
```

### UDP Phases

```typescript
type UdpPhase =
  | "intro"              // UDP introduction, clear board
  | "streaming"          // Active frame sending
  | "complete"           // All frames sent
```

---

## Detailed Phase Transitions

### TCP Phase Details

#### 1. handshake-syn (Initial State)

**Initial Setup**:
- 3 SYN packets appear in `internet` canvas (from Client A, B, C)
- Each labeled: "SYN from Client A", "SYN from Client B", "SYN from Client C"

**User Action**: Drag each SYN to correct client inbox

**Validation**:
- SYN packet with `clientId: "a"` must go to `client-a-inbox`
- Wrong placement → rejected with notification: "This packet is for Client A"

**Transition**: When all 3 SYN packets delivered → `handshake-synack`

**Side Effects**:
- Each successful SYN placement shows client status: "🟡 SYN received"
- Generate SYN-ACK in `outgoing` inventory for that client

---

#### 2. handshake-synack

**State**: 3 SYN-ACK packets in `outgoing` inventory

**User Action**: Drag each SYN-ACK through `internet` to destination client

**Mechanic**:
1. User drags SYN-ACK to `internet` canvas
2. After 1s delay, packet "arrives" (auto-moves to client inbox)
3. Client status updates: "🟡 SYN-ACK sent, waiting for ACK..."

**Transition**: When all 3 SYN-ACK delivered → `handshake-ack`

**Side Effects**:
- Generate ACK packet in `incoming` for each client

---

#### 3. handshake-ack

**State**: 3 ACK packets in `incoming` inventory (labeled by client)

**User Action**: Drag each ACK to correct client inbox

**Transition**: When all 3 ACK delivered → `connected`

**Side Effects**:
- Each client status: "🟢 Connected"
- Show brief modal: "All clients connected! Now send the video data."
- Reveal `data-packets` inventory with video packets

---

#### 4. connected → data-transfer

**State**: Video packets available in inventory

**Mechanic**:
- Packets labeled: "Packet 1 → Client A", "Packet 1 → Client B", etc.
- User must send packets through internet
- Each packet requires waiting for ACK before next packet to same client

**Packet Flow**:
1. User drags packet to `internet`
2. 1s delay → packet arrives at client
3. 0.5s delay → ACK appears in `incoming`
4. User must route ACK to server (or auto-handled for simplicity)

**Counter**: Track packets sent (display: "Packets sent: 7/18")

**Transition**: After 7 packets successfully sent → `chaos-new-client`

---

#### 5. chaos-new-client

**Trigger**: 7th packet ACK received

**Actions**:
1. Show modal:
   > **"📱 New Viewer Joined!"**
   >
   > Client D wants to watch too!
   > Handle their connection request.

2. Reveal `client-d-inbox` canvas
3. Add SYN packet from Client D to `internet`

**User Action**: Complete full handshake for Client D (SYN → SYN-ACK → ACK)

**Transition**: When Client D handshake complete → `chaos-timeout`

---

#### 6. chaos-timeout

**Trigger**: Client D connection established

**Actions**:
1. Show modal:
   > **"⚠️ Connection Timeout!"**
   >
   > While you were busy with Client D, Clients A, B, and C got impatient.
   >
   > Their connections timed out. You need to reconnect them.
   >
   > **TCP requires constant state management.**

2. Reset Client A, B, C status to: "🔴 Disconnected (timeout)"
3. Generate new SYN packets from A, B, C in `internet`

**Transition**: Immediate → `chaos-redo`

---

#### 7. chaos-redo

**State**: Must redo handshakes for 3 original clients

**User Action**: Complete handshakes for A, B, C again

**Transition**: When all reconnected + 1 data packet sent → `breaking-point`

---

#### 8. breaking-point

**Trigger**: 1 data packet sent after reconnection

**Actions**:
1. Show modal:
   > **"😤 This is exhausting..."**
   >
   > You've done **20+ actions** just managing connections.
   >
   > And you've barely sent any actual video data!
   >
   > Every client needs:
   > - 3-step handshake to connect
   > - Acknowledgment for every packet
   > - Timeout tracking and reconnection
   >
   > **What if the server didn't have to care about any of this?**
   >
   > [Continue to UDP →]

2. On modal dismiss → Clear board, transition to UDP phase

---

### UDP Phase Details

#### 9. intro

**Actions**:
1. Clear all TCP canvases and inventory
2. Show new layout:
   - `outbox` canvas (center)
   - 3 client displays with empty progress bars
   - `frames` inventory with F1-F6

3. Show intro text (inline, not modal):
   > **UDP: Fire and Forget**
   >
   > Drop frames into the Outbox. They'll be sent to ALL clients automatically.
   >
   > No handshakes. No acknowledgments. No waiting.

**Transition**: Immediate → `streaming`

---

#### 10. streaming

**State**: 6 frames in inventory, outbox ready

**Mechanic**:
1. User drags frame to `outbox`
2. Validation: Must be next sequential frame
   - If F3 dropped before F2 sent → reject with notification: "Send Frame 2 first"
3. Item state changes to `"sending"`
4. Item notification shows: "Sending..."
5. After 1.5s delay:
   - Frame consumed (removed from outbox)
   - Each client's progress bar updates based on destiny table
   - Lost frames show as gap (unfilled segment)

**Order Enforcement**:
```typescript
const expectedFrame = lastSentFrame + 1; // starts at 0, so first expected is 1
if (droppedFrame.frameNumber !== expectedFrame) {
  rejectItem("Send Frame " + expectedFrame + " first");
}
```

**Progress Bar Updates** (per frame):

| Frame | Client A | Client B | Client C |
|-------|----------|----------|----------|
| F1    | ✅ fills | ✅ fills | ✅ fills |
| F2    | ✅ fills | ✅ fills | ❌ gap   |
| F3    | ✅ fills | ✅ fills | ✅ fills |
| F4    | ❌ gap   | ✅ fills | ✅ fills |
| F5    | ✅ fills | ❌ gap   | ✅ fills |
| F6    | ✅ fills | ✅ fills | ✅ fills |

**Client Display During Streaming**:
```
Client A: [■■■□■■] 83%
          "83% received — good enough for streaming"

Client B: [■■■■□■] 83%
          "83% received — good enough for streaming"

Client C: [■□■■■■] 83%
          "83% received — good enough for streaming"
```

**Transition**: When F6 consumed → `complete`

---

#### 11. complete

**Trigger**: F6 consumed by outbox

**Actions**:
1. Show success modal:
   > **"🎉 Stream Delivered!"**
   >
   > All clients received enough frames to watch the video.
   >
   > ---
   >
   > **What you learned:**
   >
   > • **UDP sends data without connections or handshakes**
   > • **Server doesn't track what each client received**
   > • **Some packets get lost — and that's okay for streaming**
   > • **No ACKs, no waiting, no state — just fire and forget**
   >
   > ---
   >
   > **Comparison:**
   >
   > | | TCP Phase | UDP Phase |
   > |---|-----------|-----------|
   > | Actions | 20+ | 6 |
   > | Connections | Stateful | Stateless |
   > | Packet loss | Retransmit | Accept gaps |
   > | Use case | File downloads | Live streaming |
   >
   > ---
   >
   > **When to use UDP:**
   > - Live video/audio streaming
   > - Online gaming
   > - DNS queries
   > - VoIP calls
   >
   > Real-time matters more than perfection.

2. Call `onQuestionComplete()` callback
3. Mark question as complete

---

## Packet Destiny Table (Deterministic)

This table defines which frames successfully reach which clients:

```typescript
const FRAME_DESTINY: Record<number, Record<string, boolean>> = {
  1: { a: true,  b: true,  c: true  },
  2: { a: true,  b: true,  c: false }, // Client C loses F2
  3: { a: true,  b: true,  c: true  },
  4: { a: false, b: true,  c: true  }, // Client A loses F4
  5: { a: true,  b: false, c: true  }, // Client B loses F5
  6: { a: true,  b: true,  c: true  },
};
```

**Result**:
- Client A: 5/6 received (83%) — missing F4
- Client B: 5/6 received (83%) — missing F5
- Client C: 5/6 received (83%) — missing F2

---

## UI Components

### TCP Phase Layout

```
┌─────────────────────────────────────────────────────────────┐
│  INCOMING PACKETS                                           │
│  [SYN-A] [SYN-B] [SYN-C]                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                          │
│                    │  INTERNET   │                          │
│                    │  [ ][ ][ ][ ]│                          │
│                    └─────────────┘                          │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ CLIENT A │   │ CLIENT B │   │ CLIENT C │                │
│  │  [ ][ ]  │   │  [ ][ ]  │   │  [ ][ ]  │                │
│  │  [ ][ ]  │   │  [ ][ ]  │   │  [ ][ ]  │                │
│  │ 🔴 Disconn│   │ 🔴 Disconn│   │ 🔴 Disconn│                │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SERVER RESPONSE                                            │
│  (empty until SYN-ACK generated)                           │
└─────────────────────────────────────────────────────────────┘
```

### UDP Phase Layout

```
┌─────────────────────────────────────────────────────────────┐
│  VIDEO FRAMES                                               │
│  [F1] [F2] [F3] [F4] [F5] [F6]                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                          │
│                    │   OUTBOX    │                          │
│                    │             │                          │
│                    │    [ ]      │                          │
│                    │             │                          │
│                    │ Drop frame  │                          │
│                    │   here      │                          │
│                    └─────────────┘                          │
│                          │                                  │
│            ┌─────────────┼─────────────┐                    │
│            ▼             ▼             ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   CLIENT A   │ │   CLIENT B   │ │   CLIENT C   │        │
│  │ [■■■□■■] 83% │ │ [■■■■□■] 83% │ │ [■□■■■■] 83% │        │
│  │ good enough  │ │ good enough  │ │ good enough  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Progress Bar Component

**Visual Representation**:
- 6 segments (one per frame)
- Filled segment (■): Frame received
- Empty segment (□): Frame lost/not yet sent
- Color: Filled = green (#10B981), Empty = gray (#D1D5DB)

**Text Below Bar**:
- During streaming: "Waiting for frames..." or "X% received"
- After completion: "83% received — good enough for streaming"

---

## Modal Content

### Modal 1: All Clients Connected (TCP)

**ID**: `tcp-connected`

**Trigger**: All 3 initial handshakes complete

**Content**:
> **"🟢 All Clients Connected!"**
>
> Great! You've established TCP connections with all 3 viewers.
>
> That took **9 actions** just to set up connections.
>
> Now let's send the actual video data...

**Actions**: [Continue]

---

### Modal 2: New Client Joined (TCP)

**ID**: `tcp-new-client`

**Trigger**: 7 data packets sent

**Content**:
> **"📱 New Viewer Joined!"**
>
> Client D wants to watch your stream!
>
> You'll need to handle their connection request before they can receive video.

**Actions**: [Handle Connection]

---

### Modal 3: Connection Timeout (TCP)

**ID**: `tcp-timeout`

**Trigger**: Client D handshake complete

**Content**:
> **"⚠️ Connection Timeout!"**
>
> While you were busy with Client D, Clients A, B, and C got impatient.
>
> Their connections **timed out**. You need to reconnect them.
>
> This is the reality of TCP:
> - Every connection requires **active state management**
> - Idle connections **expire**
> - Server must track **every client individually**

**Actions**: [Reconnect Clients]

---

### Modal 4: Breaking Point (TCP → UDP Transition)

**ID**: `tcp-exhaustion`

**Trigger**: 1 data packet sent after reconnection

**Content**:
> **"😤 This is exhausting..."**
>
> You've done **20+ actions** and barely sent any video!
>
> TCP requires the server to:
> - Complete a **3-step handshake** per client
> - **Track connection state** for every client
> - **Wait for ACKs** before sending more data
> - Handle **timeouts and reconnections**
>
> For live streaming to thousands of viewers, this doesn't scale.
>
> ---
>
> **What if the server didn't need to track connections at all?**
>
> What if it could just... send data and move on?

**Actions**: [Discover UDP →]

---

### Modal 5: Success (UDP Complete)

**ID**: `udp-success`

**Trigger**: F6 consumed

**Content**:
> **"🎉 Stream Delivered!"**
>
> All clients received enough frames to enjoy the video.
>
> ---
>
> **What you learned:**
>
> **UDP (User Datagram Protocol)**
> - No connection setup — just send
> - No acknowledgments — fire and forget
> - No state tracking — server doesn't remember clients
> - Packets may be lost — acceptable for real-time content
>
> ---
>
> **TCP vs UDP**
>
> | Aspect | TCP | UDP |
> |--------|-----|-----|
> | Connection | Required (3-way handshake) | None |
> | Reliability | Guaranteed delivery | Best effort |
> | Ordering | Guaranteed order | No guarantee |
> | Speed | Slower (waits for ACKs) | Faster (no waiting) |
> | Server state | Per-client tracking | Stateless |
> | Use case | File downloads, web pages | Streaming, gaming, VoIP |
>
> ---
>
> **Real-world UDP uses:**
> - 🎬 Netflix, YouTube (video streaming)
> - 🎮 Online games (real-time updates)
> - 📞 Zoom, Discord (voice/video calls)
> - 🌐 DNS (quick lookups)
>
> When **speed matters more than perfection**, UDP wins.

**Actions**: [Complete ✓]

---

## Contextual Hints

Phase-based hints shown below the main UI:

| Phase | Hint Text |
|-------|-----------|
| `handshake-syn` | "Drag each SYN packet to the correct client inbox" |
| `handshake-synack` | "Send SYN-ACK responses back through the internet" |
| `handshake-ack` | "Route the final ACK packets to complete connections" |
| `connected` | "Connections established! Now send video packets" |
| `data-transfer` | "Send packets and wait for acknowledgments" |
| `chaos-new-client` | "A new client! Complete their handshake" |
| `chaos-timeout` | "Connections timed out! Reconnect the clients" |
| `chaos-redo` | "Redo the handshakes for disconnected clients" |
| `udp-intro` | "Drop frames into the Outbox — they'll reach all clients" |
| `udp-streaming` | "Send frames in order: F1, F2, F3..." |
| `udp-complete` | "Stream complete!" |

---

## Item Notifications

### TCP Phase Notifications

| Item State | Notification |
|------------|--------------|
| SYN in internet | "Waiting to be routed..." |
| SYN in wrong inbox | "❌ Wrong client!" |
| SYN in correct inbox | "✓ SYN delivered" |
| SYN-ACK sending | "Sending..." |
| Data packet waiting for ACK | "Waiting for ACK..." |
| Data packet ACKed | "✓ Acknowledged" |

### UDP Phase Notifications

| Item State | Notification |
|------------|--------------|
| Frame ready | "Ready to send" |
| Frame in outbox (sending) | "Sending..." |
| Frame wrong order | "❌ Send Frame X first" |

---

## Client Status Display

### TCP Phase Status

| State | Display |
|-------|---------|
| Disconnected | "🔴 Disconnected" |
| SYN received | "🟡 SYN received" |
| SYN-ACK sent | "🟡 SYN-ACK sent, waiting..." |
| Connected | "🟢 Connected" |
| Timed out | "🔴 Disconnected (timeout)" |

### UDP Phase Status

| State | Display |
|-------|---------|
| Waiting | "[□□□□□□] 0% — Waiting for frames..." |
| Partial | "[■■□■□□] 50% — Receiving..." |
| Complete | "[■■■□■■] 83% — good enough for streaming" |

---

## Success Criteria

Question completion requires:

1. ✅ **TCP Handshake Experience** — Completed initial 3 client handshakes
2. ✅ **TCP Data Transfer** — Sent at least 7 packets with ACK waiting
3. ✅ **Chaos Experienced** — Handled Client D, experienced timeouts
4. ✅ **Reconnection Pain** — Redid handshakes after timeout
5. ✅ **UDP Transition** — Saw exhaustion modal, transitioned to UDP
6. ✅ **UDP Streaming** — Sent all 6 frames via outbox
7. ✅ **Packet Loss Understanding** — Observed gaps in progress bars
8. ✅ **Completion** — All frames consumed, success modal shown

**Completion Trigger**: F6 consumed by outbox in UDP phase

---

## Implementation Reference

### File Structure

```
src/routes/questions/networking/udp/
├── index.tsx                      # Route definition
├── -page.tsx                      # Main component
│                                  # - Phase management (TCP vs UDP)
│                                  # - Canvas rendering
│                                  # - Progress bar display
│                                  # - Modal triggers
└── -utils/
    ├── constants.ts               # Canvas configs, item definitions
    ├── use-tcp-phase.ts           # TCP phase state machine
    ├── use-udp-phase.ts           # UDP phase state machine
    ├── frame-destiny.ts           # Deterministic packet loss table
    ├── modal-builders.ts          # Modal factory functions
    ├── get-contextual-hint.ts     # Phase-based hints
    └── progress-bar.tsx           # Client progress bar component
```

### Key State Variables

```typescript
// Global
interface QuestionState {
  currentPhase: "tcp" | "udp";
  tcpPhase: TcpPhase;
  udpPhase: UdpPhase;
  
  // TCP tracking
  tcpActionsCount: number;
  packetsAcked: number;
  clientsConnected: Set<string>;
  
  // UDP tracking
  lastFrameSent: number; // 0-6
  clientProgress: {
    a: boolean[]; // [true, true, true, false, true, true]
    b: boolean[];
    c: boolean[];
  };
}
```

### Outbox Processing Logic

```typescript
function processOutbox(frame: FrameItem) {
  // Validate order
  if (frame.frameNumber !== state.lastFrameSent + 1) {
    rejectItem(frame, `Send Frame ${state.lastFrameSent + 1} first`);
    return;
  }
  
  // Set sending state
  updateItemState(frame, "sending");
  
  // Process after delay
  setTimeout(() => {
    // Remove from outbox
    consumeItem(frame);
    
    // Update each client based on destiny
    const destiny = FRAME_DESTINY[frame.frameNumber];
    for (const client of ["a", "b", "c"]) {
      if (destiny[client]) {
        state.clientProgress[client][frame.frameNumber - 1] = true;
      }
      // If false, leave as gap (already false)
    }
    
    // Update last sent
    state.lastFrameSent = frame.frameNumber;
    
    // Check completion
    if (frame.frameNumber === 6) {
      transitionTo("complete");
      showModal("udp-success");
    }
  }, 1500);
}
```

---

## Testing Scenarios

### Happy Path

1. Route 3 SYN packets to correct inboxes
2. Send 3 SYN-ACKs through internet
3. Route 3 ACKs to correct inboxes
4. Send 7 data packets (with ACK handling)
5. Client D joins → complete handshake
6. Original clients timeout → reconnect all
7. Send 1 more packet → exhaustion modal
8. Transition to UDP
9. Send F1 through F6 sequentially
10. Observe progress bars with gaps
11. Success modal appears

### Edge Case 1: Wrong Client Routing (TCP)

1. Drag SYN from Client A to Client B inbox
2. **Expected**: Rejected with notification "This packet is for Client A"

### Edge Case 2: Wrong Frame Order (UDP)

1. In UDP phase, drag F3 before sending F1 and F2
2. **Expected**: Rejected with notification "Send Frame 1 first"

### Edge Case 3: Rapid Frame Sending (UDP)

1. Drop F1, immediately try to drop F2 while F1 still "sending"
2. **Expected**: F2 queued or rejected until F1 consumed (implementation choice)

---

## Accessibility Considerations

1. **Progress bars**: Include aria-label with percentage and status
2. **Color coding**: Don't rely solely on color — use icons (■/□) and text
3. **Status changes**: Announce via aria-live regions
4. **Keyboard navigation**: All drag targets keyboard-accessible

---

## Performance Notes

1. **Timer cleanup**: Clear all timers on phase transition
2. **State batching**: Batch progress bar updates to avoid excessive re-renders
3. **Canvas clearing**: Properly dispose TCP canvases before UDP phase

---

## End of Blueprint

This blueprint represents the complete specification for the UDP Video Streaming question. It teaches UDP through contrast with TCP, using the problem-first methodology of experiencing TCP's connection management pain before discovering UDP's stateless simplicity.

**Blueprint Version**: 1.0
**Last Updated**: 2026-01-29
