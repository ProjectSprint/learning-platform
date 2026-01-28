# TCP File Fragmentation Question

> **Question ID**: `tcp-fragmentation`
> **Implementation Status**: ✅ Complete
> **Location**: `src/routes/questions/networking/tcp/`
> **Last Updated**: 2026-01-29

---

## Overview

An interactive learning experience teaching TCP protocol fundamentals through file transmission simulation. Students learn MTU limitations, TCP handshake, packet sequencing, head-of-line blocking, packet loss detection, and graceful connection teardown.

### Story & Narrative

**Question Title**: "📄 Deliver message.txt"

**Question Description**: "Large files must be split, ordered, and delivered reliably. Build the missing TCP pieces to get message.txt across."

**Initial Terminal Prompt**: "Connection closed. Use the terminal to inspect the exchange."

---

## Learning Objectives

Students will understand:

1. **MTU (Maximum Transmission Unit)** - Network size limitations requiring file fragmentation
2. **File Fragmentation** - Splitting large files into transmittable packets
3. **TCP Three-Way Handshake** - SYN → SYN-ACK → ACK connection establishment
4. **Sequence Numbers** - Packet numbering for ordering and verification
5. **Head-of-Line Blocking** - Out-of-order packet buffering behavior
6. **Packet Loss** - Network unreliability and packet disappearance
7. **Duplicate ACK Detection** - Using repeated ACKs to detect loss (fast retransmit)
8. **Connection Teardown** - Graceful FIN/FIN-ACK close sequence
9. **Protocol Inspection** - Using terminal commands to analyze network traffic

---

## Question Flow

### High-Level Progression

```
MTU Discovery
    ↓
File Splitting
    ↓
Connection Requirement
    ↓
Three-Way Handshake (SYN → SYN-ACK → ACK)
    ↓
Data Transfer (message.txt - 3 packets)
    ↓
Second File (notes.txt - 6 packets)
    ↓
Packet Loss Scenario (packet #2 drops)
    ↓
Duplicate ACK Detection (3 duplicates)
    ↓
Fast Retransmit (resend #2)
    ↓
Connection Teardown (FIN → FIN-ACK)
    ↓
Terminal Inspection (tcpdump)
    ↓
Completion
```

---

## Game Configuration

### Canvas Setup

Three canvases represent the data flow pipeline:

| Canvas ID | Title | Dimensions | Max Items | Initial Visibility | Purpose |
|-----------|-------|------------|-----------|-------------------|---------|
| `splitter` | Content Splitter | 1×1 | 1 | Hidden | File fragmentation zone |
| `internet` | Internet | 3×1 | 3 | Visible | Packet transit simulation |
| `server` | Server | 3×4 | 12 | Visible | Data reception & buffering |

**Canvas Visibility Rules**:
- `splitter`: Hidden initially, revealed after MTU limit modal (phase: mtu → splitter)
- `internet`: Always visible
- `server`: Always visible

### Inventory Groups

Four progressive inventory groups:

| Group ID | Title | Initial Visibility | Purpose |
|----------|-------|-------------------|---------|
| `files` | Files | Visible | Original files to transmit |
| `split` | Split Packages | Hidden | File fragments (shown after splitting) |
| `tcp-tools` | TCP Tools | Hidden | SYN, ACK, FIN flags (revealed progressively) |
| `received` | Received | Hidden | Server responses (SYN-ACK, ACKs, FIN-ACK) |

**Visibility Triggers**:
- `split`: Shown when file placed in splitter
- `tcp-tools`: Shown when handshake needed
- `received`: Shown when server sends first response

### Item Types

| Type | Icon | Color | Draggable | Allowed Placement | Purpose |
|------|------|-------|-----------|------------------|---------|
| `message-file` | mdi:file-document-outline | #93C5FD (blue) | ✅ | splitter, internet | First file (3 packets) |
| `notes-file` | mdi:file-document-outline | #60A5FA (blue) | ✅ | splitter, internet | Second file (6 packets) |
| `split-packet` | mdi:package-variant | #A3A3A3 → #FACC15 (gray → yellow when sequenced) | ✅ | internet, server | File fragments |
| `syn-flag` | mdi:flag-outline | #FBBF24 (yellow) | ✅ | internet, server | Handshake initiation |
| `syn-ack-flag` | mdi:flag-checkered | #F59E0B (amber) | ❌ | - | Server response (auto-generated) |
| `ack-flag` | mdi:flag | #10B981 (green) | ✅ | internet, server | Handshake completion |
| `fin-flag` | mdi:flag-remove | #F97316 (orange) | ✅ | internet, server | Connection close request |
| `fin-ack-flag` | mdi:flag-remove-outline | #FB923C (orange) | ❌ | - | Close ack (auto-generated) |

**Item Data Schema**:

```typescript
// File items
{
  tcpState: "ready" | "rejected"
}

// Split packets
{
  seq: number,              // 1-6 (packet sequence number)
  seqEnabled: boolean,      // true after handshake completes
  tcpState: "idle" | "in-transit" | "lost" | "buffered" | "received" | "processing" | "rejected",
  fileKey: "message" | "notes"
}

// TCP flags (SYN, ACK, FIN)
{
  tcpState: "idle" | "in-transit" | "delivered" | "received",
  direction?: "server-to-client"  // For server-generated responses
}
```

---

## Phase State Machine

The game uses 11 distinct phases with precise transition rules:

```typescript
type TcpPhase =
  | "mtu"        // Initial: try sending file directly
  | "splitter"   // File rejected, must split
  | "split-send" // Fragment ready, needs connection
  | "syn"        // Must initiate handshake
  | "syn-wait"   // Waiting for SYN-ACK response
  | "ack"        // Must complete handshake
  | "connected"  // Connection active, sending data
  | "notes"      // First file complete, send second
  | "loss"       // Packet loss scenario active
  | "resend"     // Duplicate ACKs detected, waiting for retransmit
  | "closing"    // All data sent, must close connection
  | "terminal"   // Connection closed, terminal available
```

### Detailed Phase Transitions

#### 1. mtu → splitter

**Trigger**: User drags file (message.txt or notes.txt) directly to `internet` canvas

**Conditions**:
- Phase is `mtu`
- File item placed on internet canvas

**Actions**:
1. Reject the file placement (remove from internet)
2. Update file item: `tcpState: "rejected"`
3. Show MTU limit modal (if not shown before)
4. Set phase to `splitter`
5. Reveal `splitter` canvas (set visible: true)
6. Add file back to inventory with status reset

**Side Effects**:
- Modal shown: `mtu-limit` (see Modal System section)
- Server terminal: No change (remains "🔴 Disconnected")

---

#### 2. splitter → split-send

**Trigger**: User drops file onto `splitter` canvas

**Conditions**:
- Phase is `splitter`
- File item (message-file or notes-file) placed in splitter

**Actions**:
1. Determine packet count: message.txt → 3 packets, notes.txt → 6 packets
2. Generate split packets with sequences 1 through N
3. Hide `files` inventory group
4. Show `split` inventory group
5. Populate split group with packet items
6. Set phase to `split-send`
7. Remove file from splitter

**Split Packet Generation**:
```typescript
for (let seq = 1; seq <= packetCount; seq++) {
  {
    id: `${fileKey}-packet-${seq}`,
    type: 'split-packet',
    name: 'Fragment',
    icon: { kind: 'mdi', name: 'package-variant', color: '#A3A3A3' },
    data: {
      seq: seq,
      seqEnabled: false,
      tcpState: 'idle',
      fileKey: fileKey  // 'message' or 'notes'
    },
    allowedPlaces: ['*']
  }
}
```

**Side Effects**:
- Server terminal: No change
- Contextual hint: "Send a fragment through the Internet and see how the server responds."

---

#### 3. split-send → syn

**Trigger**: User sends split packet to server without established connection

**Conditions**:
- Phase is `split-send`
- Split packet transferred to `server` canvas
- Connection not established (sequenceEnabled = false)

**Actions**:
1. Server rejects packet after processing delay (2000ms)
2. Remove rejected packet from server
3. Show SYN intro modal (if not shown before)
4. Set phase to `syn`
5. Add SYN flag to `tcp-tools` inventory group
6. Make `tcp-tools` group visible

**Server Response**:
- Server terminal logs:
  1. "Processing..." (immediately)
  2. "I don't understand this package!" (after 2000ms)

**Side Effects**:
- Modal shown: `syn-intro`
- Contextual hint: "The server rejected the fragment. Send a SYN to start the handshake."

---

#### 4. syn → syn-wait

**Trigger**: User sends SYN flag to internet

**Conditions**:
- Phase is `syn`
- SYN flag placed on `internet` canvas

**Actions**:
1. Mark SYN as in-transit: `tcpState: "in-transit"`
2. After travel time (2000ms), transfer SYN to server
3. Set phase to `syn-wait`
4. Server processes SYN (3000ms delay)

**Server Response Sequence**:
1. Server terminal: "Processing..." (when SYN arrives)
2. After 3000ms:
   - Server terminal: "🟡 SYN received - sending SYN-ACK..."
   - Mark SYN as received
   - Generate SYN-ACK flag
   - Add SYN-ACK to `received` inventory group
   - Make `received` group visible
   - Send SYN-ACK to internet (travels back to client)

**Side Effects**:
- Contextual hint: "SYN sent. Wait for the SYN-ACK response."
- Server status: "🟡 SYN received - sending SYN-ACK..."

---

#### 5. syn-wait → ack

**Trigger**: SYN-ACK arrives from server

**Conditions**:
- Phase is `syn-wait`
- SYN-ACK flag arrives at client (completes internet travel)

**Actions**:
1. Mark SYN-ACK as received
2. Show SYN-ACK received modal
3. Set phase to `ack`
4. Add ACK flag to `tcp-tools` inventory
5. Server status: "🟡 SYN-ACK sent - waiting for ACK..."

**Modal Chain**:
- First modal: `syn-ack-received` with "OK" button
- On click: Opens `ack-intro` modal with "Send ACK" button

**Side Effects**:
- Contextual hint: "SYN-ACK received. Send an ACK to complete the connection."

---

#### 6. ack → connected

**Trigger**: User sends ACK flag to internet/server

**Conditions**:
- Phase is `ack`
- ACK flag transferred to server

**Actions**:
1. Mark ACK as in-transit during travel
2. After travel + processing (2000ms + 3000ms):
   - Mark ACK as received
   - Set `connectionActive = true`
   - Set `sequenceEnabled = true`
   - Update all split packets: `seqEnabled: true`
   - Update packet names: "Fragment" → "Packet #1", "Packet #2", etc.
   - Update packet colors: #A3A3A3 → #FACC15 (gray → yellow)
   - Show handshake complete modal
   - Set phase to `connected`

**Server Response**:
- Server terminal: "🟢 Connected - Waiting for data..."

**Side Effects**:
- Modal shown: `handshake-complete`
- Connection tunnel appears (animated)
- Contextual hint: "Send the numbered packets through the Internet."
- Buffer display becomes visible

---

#### 7. connected → notes

**Trigger**: All 3 message.txt packets delivered and received

**Conditions**:
- Phase is `connected`
- Received sequences: {1, 2, 3}
- File key: "message"
- All packets processed by server

**Actions**:
1. Server assembles file (2000ms delay)
2. Server terminal: "Processing..." then "📄 message.txt received successfully!"
3. Server terminal: "Waiting for notes.txt packets..."
4. Remove message packets from server
5. Set phase to `notes`
6. Add notes.txt file back to `files` inventory
7. Show `files` group again
8. Reset buffer state (clear received/waiting sequences)

**Side Effects**:
- Contextual hint: "notes.txt is ready. Drop it onto the Content Splitter."
- Connection remains active

---

#### 8. notes → loss

**Trigger**: notes.txt dropped onto splitter

**Conditions**:
- Phase is `notes`
- notes-file item placed in splitter

**Actions**:
1. Generate 6 split packets (sequences 1-6)
2. Hide `files` group
3. Update `split` group with new packets
4. Set `lossScenarioActive = true`
5. Set phase to `loss`
6. Reset buffer (clear sequences)

**Loss Mechanism Activation**:
- Packet #2 will be dropped when sent to internet
- `allowPacket2Ref = false` (blocks packet #2)

**Side Effects**:
- Contextual hint: "Send the notes.txt packets through the Internet. Packet #2 will go missing."

---

#### 9. loss → resend (via duplicate ACK detection)

**Trigger**: 3 duplicate ACKs received from server

**Conditions**:
- Phase is `loss`
- Server has sent same ACK number 3+ times consecutively
- Missing packet exists in inventory

**Actions**:
1. Set phase to `resend`
2. Highlight missing packet (#2) in inventory:
   - Name: "Packet #2 (Resend?)"
   - Color: #F87171 (red)
3. Show duplicate ACKs modal
4. Set `resendTargetSeq = 2`

**Duplicate ACK Logic**:
```typescript
// Track last ACK number
if (ackNumber === lastAckNumber) {
  duplicateCount++;
} else {
  duplicateCount = 0;
}

if (duplicateCount >= 3) {
  // Trigger resend phase
}
```

**Side Effects**:
- Modal shown: `duplicate-acks` with missing sequence number
- Contextual hint: "Duplicate ACKs detected. Resend the missing packet."

---

#### 10. resend → loss (retransmit happens)

**Trigger**: User sends highlighted packet #2

**Conditions**:
- Phase is `resend`
- Packet with seq=2 sent to internet
- `resendTargetSeq = 2`

**Actions**:
1. Set `allowPacket2Ref = true` (allow packet through)
2. Packet travels normally (not dropped)
3. Reset packet highlight (remove "Resend?" label, restore yellow color)
4. Set phase back to `loss`
5. Continue loss scenario

**Side Effects**:
- Server receives packet #2
- Buffered packets (3, 4, 5, 6) released sequentially
- Buffer release timing: 800ms between each packet

---

#### 11. loss → closing

**Trigger**: All 6 notes.txt packets delivered and received

**Conditions**:
- Phase is `loss` or `resend`
- Received sequences: {1, 2, 3, 4, 5, 6}
- File key: "notes"

**Actions**:
1. Server assembles file (2000ms delay)
2. Server terminal: "Processing..." then "📄 notes.txt received successfully!"
3. Remove notes packets from server
4. Show close connection modal
5. Add FIN flag to `tcp-tools` inventory
6. Set phase to `closing`

**Side Effects**:
- Modal shown: `close-connection`
- Contextual hint: "Send FIN to close the connection cleanly."

---

#### 12. closing → terminal

**Trigger**: FIN/FIN-ACK exchange completes

**Conditions**:
- Phase is `closing`
- FIN flag sent and received by server
- FIN-ACK received by client

**Actions**:
1. FIN travels to server (2000ms)
2. Server processes FIN (3000ms)
3. Server sends FIN-ACK back
4. FIN-ACK travels to client (2000ms)
5. Set `connectionActive = false`
6. Set phase to `terminal`
7. Enable terminal input
8. Hide connection tunnel (fade 600ms)

**Server Response**:
- Server terminal: "🔴 Disconnected"

**Side Effects**:
- Terminal prompt becomes active
- Contextual hint: "Use `tcpdump` in the terminal to inspect the exchange."
- Connection tunnel disappears

---

#### 13. terminal → completed

**Trigger**: User runs `tcpdump` or `tcpdump -explain` command

**Conditions**:
- Phase is `terminal`
- Terminal command executed: "tcpdump" or "tcpdump -explain"

**Actions**:
1. Display tcpdump output in terminal
2. Show success modal
3. Call `onQuestionComplete()` callback
4. Mark question as complete
5. Enable "Next question" button

**Side Effects**:
- Modal shown: `tcp-success`
- Question completed
- Navigate to next question on modal close

---

## User Interface Elements

### Contextual Hints

Phase-specific hints guide the user. Display at top of game area.

| Phase | Hint Text |
|-------|-----------|
| `mtu` | "Drag message.txt to the Internet to send it." |
| `splitter` (visible) | "The file is too big. Drop it onto the Content Splitter." |
| `split-send` | "Send a fragment through the Internet and see how the server responds." |
| `syn` | "The server rejected the fragment. Send a SYN to start the handshake." |
| `syn-wait` | "SYN sent. Wait for the SYN-ACK response." |
| `ack` | "SYN-ACK received. Send an ACK to complete the connection." |
| `connected` (no packets sent) | "Send the numbered packets through the Internet." |
| `connected` (packets sent) | "Try sending packets out of order to see them buffered for ordering." |
| `connected` (loss active, waiting) | "The server is waiting for the missing packet. Send it next." |
| `notes` | "notes.txt is ready. Drop it onto the Content Splitter." |
| `loss` | "Send the notes.txt packets through the Internet. Packet #2 will go missing." |
| `resend` | "Duplicate ACKs detected. Resend the missing packet." |
| `closing` | "Send FIN to close the connection cleanly." |
| `terminal` | "Use `tcpdump` in the terminal to inspect the exchange." |

**Special Case**: If connection lost (sequenceEnabled becomes false after being true):
- Override hint: "Connection lost. Re-establish before sending data."

### Server Terminal Messages

Real-time server log displayed in dedicated terminal view. Each message is a terminal entry with type and content.

**Initial State**:
```
> 🔴 Disconnected
```

**Fragment Rejected** (no connection):
```
> Processing...
> I don't understand this package!
```

**SYN Received**:
```
> Processing...
> 🟡 SYN received - sending SYN-ACK...
> 🟡 SYN-ACK sent - waiting for ACK...
```

**ACK Received** (handshake complete):
```
> 🟢 Connected - Waiting for data...
```

**Packet Acknowledged** (dynamic based on buffer state):

When all packets received in order:
```
> Replying with ACK 2, all packets received.
> Replying with ACK 3, all packets received.
```

When packets buffered or missing:
```
> Replying with ACK 2, packet #1 is buffered for ordering.
> Replying with ACK 4, packet #2 is missing; packets #5, #6 are buffered for ordering.
> Replying with ACK 3, packets #4, #5 are buffered for ordering.
```

**File Assembly**:
```
> Processing...
> 📄 message.txt received successfully!
> Waiting for notes.txt packets...
```

```
> Processing...
> 📄 notes.txt received successfully!
```

**Connection Close**:
```
> 🔴 Disconnected
```

**ACK Message Generation Rules**:

1. Find smallest missing sequence number → this is the ACK number
2. List all missing packet numbers
3. List all buffered (waiting) packet numbers
4. Format message:
   - If nothing missing/buffered: "Replying with ACK {N}, all packets received."
   - If missing or buffered: "Replying with ACK {N}, {missing/buffered details}."

**Examples**:
- Received {1}, Waiting {}, Missing {2,3}: "Replying with ACK 2, all packets received."
- Received {1,2}, Waiting {4,5}, Missing {3}: "Replying with ACK 3, packets #4, #5 are buffered for ordering."
- Received {1}, Waiting {3,4}, Missing {2}: "Replying with ACK 2, packets #3, #4 are buffered for ordering."

### Connection Tunnel

Animated visual element appearing between internet and server canvases.

**Visibility**:
- Show when: `connectionActive = true`
- Hide when: `connectionActive = false`

**Appearance**:
- Background: Gray bar (8px height, rounded)
- Foreground: Cyan-to-teal gradient bar
- Animation: Width expands 0% → 100% over 600ms when appearing
- Animation: Opacity fades 100% → 0% over 600ms when disappearing

**Label**: "Connection tunnel" (displayed above bar)

### Receiving Buffer Display

Visual representation of packet buffer state on server.

**Visibility**:
- Show when: `connectionActive = true` OR `receivedCount > 0` OR `waitingCount > 0`
- Hide when: connection never established and no packets received

**Display Format**:

Show buffer slots for all expected sequences (3 for message, 6 for notes):

```
[#1 ✅] [#2 ___] [#3 ⏳] [#4 ___] [#5 ⏳] [#6 ⏳]
```

**Slot States**:
- `✅` = Packet received and processed (in receivedSeqs)
- `⏳` = Packet buffered, waiting for earlier packet (in waitingSeqs)
- `___` = Empty slot, packet not yet arrived

**Update Timing**:
- Updates immediately when sequences change
- Released packets change `⏳` → `✅` with 800ms stagger between each

### Item Status & Labels

Items show dynamic status messages and labels based on state.

#### Status Messages (displayed under item)

**Files** (message-file, notes-file):
- tcpState: `ready` → "Ready"
- tcpState: `rejected` → "Too large"

**Split Packets**:
- tcpState: `idle` → "Ready"
- tcpState: `in-transit` → "Sending..."
- tcpState: `received` → "Received"
- tcpState: `buffered` → "Buffered for ordering"
- tcpState: `lost` → "Lost!"
- tcpState: `processing` → "Processing..."
- tcpState: `rejected` → "Rejected"

**TCP Flags** (SYN, ACK, FIN):
- tcpState: `idle` → "Ready"
- tcpState: `in-transit` → "Sending..."
- tcpState: `received` → "Arrived"

**Server Responses** (SYN-ACK, FIN-ACK):
- In transit: "Receiving"
- Arrived: "ACK Arrived" or "ACK {number} Arrived"

#### Item Labels (item name)

**Files**:
- "message.txt"
- "notes.txt"

**Split Packets**:
- Before sequencing enabled: "Fragment"
- After sequencing enabled: "Packet #1", "Packet #2", etc.
- When highlighted for resend: "Packet #2 (Resend?)"

**TCP Flags**:
- "SYN"
- "ACK"
- "FIN"

**Server Responses**:
- "SYN-ACK"
- "FIN-ACK"
- "ACK #1", "ACK #2", etc. (for data acknowledgments)

---

## Modal System

Ten modals guide the learning experience with exact text content.

### 1. MTU Limit Modal

**ID**: `mtu-limit`

**Trigger**: File placed directly on internet (phase: mtu)

**Content**:
- **Title**: "🚧 MTU Limit Reached"
- **Body**:
  1. "message.txt is too large to fit in a single network packet."
  2. "Networks enforce an MTU (Maximum Transmission Unit) which caps packet size."
  3. "We need to split the file before it can travel."
  4. Link: "What is MTU?" → https://en.wikipedia.org/wiki/Maximum_transmission_unit

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: Reveals splitter canvas

---

### 2. SYN Introduction Modal

**ID**: `syn-intro`

**Trigger**: Fragment rejected by server (phase: split-send → syn)

**Content**:
- **Title**: "🟡 Start the Handshake (SYN)"
- **Body**:
  1. "The server rejected the fragments because no TCP connection exists yet."
  2. "Send a SYN to request a connection and sync a starting sequence number."
  3. "If the server agrees, it responds with SYN-ACK."

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: Adds SYN flag to inventory

---

### 3. SYN-ACK Received Modal

**ID**: `syn-ack-received`

**Trigger**: SYN-ACK arrives from server (phase: syn-wait → ack)

**Content**:
- **Title**: "✅ SYN-ACK Received"
- **Body**:
  1. "The server accepted your SYN and replied with SYN-ACK."
  2. "That means it is ready and has shared its own sequence number."

**Actions**:
- Button: "OK" (primary, does NOT close modal, opens next modal)

**Chaining**: On "OK" click → Opens ACK Introduction modal

---

### 4. ACK Introduction Modal

**ID**: `ack-intro`

**Trigger**: Chained from SYN-ACK modal

**Content**:
- **Title**: "✅ Send ACK"
- **Body**:
  1. "ACK confirms the server's SYN-ACK and completes the handshake."
  2. "Send the ACK so the connection opens and data can flow."

**Actions**:
- Button: "Send ACK" (primary, closes modal)

**Effect**: Adds ACK flag to inventory

---

### 5. Handshake Complete Modal

**ID**: `handshake-complete`

**Trigger**: ACK received by server (phase: ack → connected)

**Content**:
- **Title**: "🔗 Connection Established"
- **Body**:
  1. "Connection established! During the handshake, both sides agreed on a starting sequence number."
  2. "Now your packets will be numbered so the server can order and verify them."

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: Enables packet sequencing, shows connection tunnel

---

### 6. Head-of-Line Blocking Modal

**ID**: `hol-blocking`

**Trigger**: First time packet arrives out of order (buffered)

**Content**:
- **Title**: "⏳ Head-of-Line Blocking"
- **Body**:
  1. "That packet arrived out of order. The server won't reject it."
  2. "It buffers the packet, waits for the missing one, then reorders the stream to rebuild the file."

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: None (educational only)

---

### 7. Packet Loss Modal

**ID**: `packet-loss`

**Trigger**: Packet #2 of notes.txt dropped (phase: loss)

**Content**:
- **Title**: "💨 Packets Lost"
- **Body**:
  1. "Packet #2 vanished in the internet. Real networks can be unreliable, so packets sometimes disappear."
  2. "The server is waiting for the missing packet."

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: None (packet already removed from internet)

---

### 8. Duplicate ACKs Modal

**ID**: `duplicate-acks`

**Trigger**: 3 duplicate ACKs detected (phase: loss → resend)

**Content**:
- **Title**: "🔁 Duplicate ACKs"
- **Body**:
  1. "The server keeps repeating ACK {missingSeq}. It still needs packet #{missingSeq}."
  2. "Three duplicate ACKs signal loss, so resend packet #{missingSeq} now."

**Variables**:
- `{missingSeq}`: The sequence number being requested (typically 2)

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: Highlights missing packet in inventory (red color, "Resend?" label)

---

### 9. Close Connection Modal

**ID**: `close-connection`

**Trigger**: All notes.txt packets delivered (phase: loss → closing)

**Content**:
- **Title**: "👋 Close the Connection"
- **Body**:
  1. "The transfer is complete. Send FIN so both sides can close the connection cleanly."

**Actions**:
- Button: "Close" (primary, closes modal)

**Effect**: Adds FIN flag to inventory

---

### 10. Success Modal

**ID**: `tcp-success`

**Trigger**: FIN/FIN-ACK exchange complete OR tcpdump command executed

**Content**:
- **Title**: "✅ Delivery Complete"
- **Body**:
  1. "You handled MTU limits, ordering, loss, and the handshake."
  2. "TCP turned unreliable delivery into a reliable stream."

**Actions**:
- Button: "Next question" (primary, closes modal, calls onQuestionComplete)

**Effect**: Marks question complete, navigates to next question

---

## Terminal Commands

Seven commands available in terminal phase.

### 1. help

**Input**: `help`

**Output**:
```
Supported commands:
- netstat
- netstat -an
- tcpdump
- tcpdump -explain
- tcpdump -count
- ss -t
- help
- clear
```

---

### 2. netstat / netstat -an

**Input**: `netstat` or `netstat -an`

**Output**:
```
Active Connections

Proto  Local Address      Foreign Address    State
TCP    192.168.1.10:54321 93.184.216.34:80  ESTABLISHED
```

---

### 3. ss -t

**Input**: `ss -t`

**Output**:
```
State  Recv-Q Send-Q Local Address:Port Peer Address:Port
ESTAB  0      0      192.168.1.10:54321 93.184.216.34:80
```

**Error Cases**:
- Input: `ss` (without -t) → Output: "Usage: ss -t"
- Input: `ss -a` (wrong flag) → Output: "Usage: ss -t"

---

### 4. tcpdump

**Input**: `tcpdump`

**Output** (complete packet exchange):
```
15:04:32.001 IP 192.168.1.10 > 93.184.216.34: Flags [S], seq 1000
15:04:32.045 IP 93.184.216.34 > 192.168.1.10: Flags [S.], seq 2000, ack 1001
15:04:32.046 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2001

15:04:32.100 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1001:1101, ack 2001
15:04:32.150 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101

15:04:32.200 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1101:1201, ack 2001
15:04:32.205 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)
15:04:32.255 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)
15:04:32.305 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101 (dup)

15:04:32.400 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1101:1201, ack 2001 (retransmission)
15:04:32.450 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1201

15:04:32.500 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1201:1301, ack 2001
15:04:32.550 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1301

15:04:33.000 IP 192.168.1.10 > 93.184.216.34: Flags [F.], seq 1301, ack 2001
15:04:33.050 IP 93.184.216.34 > 192.168.1.10: Flags [F.], seq 2001, ack 1302
15:04:33.051 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2002

--- Connection closed gracefully ---
```

**Structure**:
1. Three-way handshake (SYN, SYN-ACK, ACK)
2. Blank line
3. Message.txt packets (3 packets, each with ACK)
4. Blank line
5. Notes.txt packets (packet 2 lost, 3 duplicate ACKs, retransmission, remaining packets)
6. Blank line
7. Connection close (FIN, FIN-ACK, ACK)
8. Closing message

**Effect**: Triggers success modal and question completion

---

### 5. tcpdump -explain

**Input**: `tcpdump -explain`

**Output**:
```
TCP Flags explained:
  [S]  = SYN      - Start connection
  [S.] = SYN-ACK  - Acknowledge + start
  [.]  = ACK      - Acknowledgment
  [P.] = PSH-ACK  - Push data + ack
  [F.] = FIN-ACK  - Finish + ack

Your session:
  1. Three-way handshake (SYN -> SYN-ACK -> ACK)
  2. Data transfer (3 packets, loss + retransmission)
  3. Connection close (FIN -> FIN-ACK -> ACK)

Total packets: 16
Retransmissions: 1
Packet loss: 1
```

**Effect**: Triggers success modal and question completion

---

### 6. tcpdump -count

**Input**: `tcpdump -count`

**Output**:
```
Total packets: 16
Retransmissions: 1
Packet loss: 1
```

---

### 7. clear

**Input**: `clear`

**Effect**: Clears terminal history (empties all entries)

---

### Error Handling

**Before terminal phase**:
- Any command input → Output: "Error: Terminal is not ready yet."

**Unknown command**:
- Input: `foo` → Output: "Unknown command: foo. Type 'help' for available commands."

**Invalid tcpdump flag**:
- Input: `tcpdump -v` → Output: "Unknown tcpdump option. Try tcpdump -explain"

**Invalid ss usage**:
- Input: `ss` → Output: "Usage: ss -t"

---

## Educational Content

### Item Tooltips

Each item type has an educational tooltip with Wikipedia link.

| Item Type | Tooltip Text | Wikipedia Link |
|-----------|--------------|----------------|
| `message-file` | "A large file that must be split into smaller packets before it can travel across the network." | https://en.wikipedia.org/wiki/File_size |
| `notes-file` | "Another file that needs to be split into packets before it can traverse the network." | https://en.wikipedia.org/wiki/File_size |
| `split-packet` | "A fragment of the original file. It must be delivered in order to reassemble the message." | https://en.wikipedia.org/wiki/IP_fragmentation |
| `syn-flag` | "SYN starts a TCP handshake to establish a connection." | https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment |
| `ack-flag` | "ACK completes the handshake so data can flow." | https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_establishment |
| `fin-flag` | "FIN closes a TCP connection cleanly after data transfer." | https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Connection_termination |

**Tooltip Display**: Show on hover over inventory item, with "Learn more →" link to Wikipedia.

---

## Timing Constants

All delays specified in milliseconds.

| Constant | Value | Purpose |
|----------|-------|---------|
| `INTERNET_TRAVEL_MS` | 2000 | Time for item to travel through internet canvas |
| `SERVER_PROCESS_MS` | 3000 | Server processing delay before response |
| `SERVER_REJECT_DELAY_MS` | 2000 | Delay before removing rejected items from server |
| `MESSAGE_REJECT_DELAY_MS` | 2000 | Delay before removing rejected file from internet |
| `ASSEMBLE_DELAY_MS` | 2000 | File assembly processing time |
| `BUFFER_RELEASE_DELAY_MS` | 1500 | Delay before starting buffer release sequence |
| `BUFFER_STEP_DELAY_MS` | 800 | Delay between releasing each buffered packet |
| `LOSS_FADE_MS` | 700 | Lost packet fade duration before removal |

---

## Business Logic Details

### Packet Flow Simulation

**Pattern**: Watch canvas for new items → Mark in-transit → Delay → Transfer to next canvas

**Implementation Approach**:
1. Track previous canvas item IDs in ref
2. On canvas change, find new items (not in previous set)
3. For each new item, apply business logic based on type and phase
4. Register all timers for cleanup

**Example - Internet Canvas**:
- New item detected → Mark as "in-transit"
- After INTERNET_TRAVEL_MS → Transfer to server canvas
- If item is packet #2 during loss phase → Mark as "lost", remove after LOSS_FADE_MS

### Packet Loss Mechanism

**Fixed Loss**: Packet #2 of notes.txt (6 packets total) is deterministically dropped.

**Control Variables**:
- `lossScenarioRef.current`: boolean, true when notes.txt packets active
- `allowPacket2Ref.current`: boolean, false initially, set true after 3 duplicate ACKs

**Logic**:
```
When item arrives at internet canvas:
  If item type is split-packet
    AND lossScenarioActive is true
    AND item.seq is 2
    AND allowPacket2 is false:
      → Mark item as "lost" (status: error, tcpState: "lost")
      → Show packet loss modal (once)
      → After LOSS_FADE_MS, remove item from internet
      → Do NOT transfer to server
```

**Retransmit Gate**:
```
When 3 duplicate ACKs detected:
  → Set allowPacket2 to true
  → Highlight packet #2 in inventory (red, "Resend?" label)
  → Change phase to "resend"

When packet #2 sent again:
  → allowPacket2 is true, so packet NOT dropped
  → Packet travels normally to server
  → Buffered packets released
```

### Buffer Management

**Head-of-Line Blocking**:

When packet arrives at server, check if it's in sequence:
1. Find smallest missing sequence (expected next)
2. If arriving packet seq > smallest missing:
   - Packet is OUT OF ORDER
   - Add seq to waitingSeqs set
   - Mark item as "buffered" (status: warning, tcpState: "buffered")
   - Show head-of-line blocking modal (once)
   - Do NOT process packet yet
3. If arriving packet seq = smallest missing:
   - Packet is IN ORDER
   - Add seq to receivedSeqs set
   - Mark item as "received" (status: success, tcpState: "received")
   - Process packet immediately
   - Check if buffered packets can now be released

**Buffer Release**:

When in-order packet arrives and closes a gap:
1. Find all consecutive buffered packets starting from next expected seq
2. For each buffered packet, schedule release:
   - Delay: index × BUFFER_STEP_DELAY_MS
   - Action: Move from waitingSeqs to receivedSeqs, update status to "received"
3. Release happens with visual stagger (800ms between each)

**Example**:
- Received: {1}
- Arrives: 3, 4, 5 (out of order)
- Waiting: {3, 4, 5}
- Then arrives: 2 (in order)
- Received: {1, 2}
- Waiting: {3, 4, 5}
- Release sequence:
  - t=0: seq 3 released → Received: {1, 2, 3}
  - t=800ms: seq 4 released → Received: {1, 2, 3, 4}
  - t=1600ms: seq 5 released → Received: {1, 2, 3, 4, 5}

### Duplicate ACK Detection

**Tracking**:
- `lastAckNumberRef.current`: number | null (last ACK number sent)
- `duplicateAckCountRef.current`: number (consecutive duplicate count)

**Logic**:
```
When server sends ACK:
  If ACK number > total expected packets:
    → Ignore (post-completion ACK)
    → Reset duplicate count to 0
  Else if ACK number = lastAckNumber:
    → Increment duplicate count
  Else:
    → Reset duplicate count to 0

  Update lastAckNumber to current ACK number

  If duplicateAckCount >= 3:
    → Trigger resend phase
    → Show duplicate ACK modal
    → Highlight missing packet
```

**Fast Retransmit**:
- 3 duplicate ACKs = packet loss signal
- Enter "resend" phase
- Enable retransmit gate (allowPacket2 = true)

### ACK Message Generation

**Dynamic Server Messages**:

When server acknowledges packets, message describes buffer state:

```
For each ACK sent:
  1. Determine next expected sequence (smallest not received)
  2. Find missing packets (not received, not waiting)
  3. Find buffered packets (in waiting set)
  4. Generate message:
     - If nothing missing/buffered: "all packets received"
     - If only missing: "packet #{X} is missing"
     - If only buffered: "packets #{X}, #{Y} are buffered for ordering"
     - If both: "packet #{X} is missing; packets #{Y}, #{Z} are buffered for ordering"
```

**Format Examples**:
- `"Replying with ACK 2, all packets received."`
- `"Replying with ACK 3, packet #2 is missing."`
- `"Replying with ACK 2, packets #3, #4 are buffered for ordering."`
- `"Replying with ACK 4, packet #2 is missing; packets #5, #6 are buffered for ordering."`

### State Synchronization

**Problem**: Game state updates are asynchronous, need instant access for logic decisions.

**Solution**: Use refs for instant state + useState for rendering.

**Pattern**:
```typescript
// Instant state (for logic)
const receivedSeqsRef = useRef<Set<number>>(new Set());
const waitingSeqsRef = useRef<Set<number>>(new Set());

// Reactive state (for UI)
const [receivedSeqs, setReceivedSeqs] = useState<number[]>([]);
const [waitingSeqs, setWaitingSeqs] = useState<number[]>([]);

// Sync function
const syncBufferState = () => {
  setReceivedSeqs(Array.from(receivedSeqsRef.current));
  setWaitingSeqs(Array.from(waitingSeqsRef.current));
};

// Update pattern
receivedSeqsRef.current.add(seq);  // Instant
syncBufferState();                  // Trigger re-render
```

### Timer Registry

**Problem**: Component unmount while timers active causes memory leaks and errors.

**Solution**: Register all timers, clean up on unmount.

**Pattern**:
```typescript
const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

const registerTimer = (timerId: ReturnType<typeof setTimeout>) => {
  timersRef.current.add(timerId);
};

// When creating timer
const timer = setTimeout(() => { ... }, delay);
registerTimer(timer);

// Cleanup on unmount
useEffect(() => {
  return () => {
    for (const timerId of timersRef.current) {
      clearTimeout(timerId);
    }
    timersRef.current.clear();
  };
}, []);
```

### Item Tracking

**Problem**: Need to find item's current location across multiple canvases.

**Solution**: Search all canvases, return location + item.

**Pattern**:
```typescript
const findItemLocationLatest = (itemId: string) => {
  for (const [canvasKey, canvas] of Object.entries(canvasesRef.current)) {
    const item = canvas.placedItems.find(i => i.id === itemId);
    if (item) {
      return { canvasId: canvasKey, item };
    }
  }
  return null;
};
```

### Conditional Updates

**Problem**: Dispatching identical updates causes unnecessary re-renders.

**Solution**: Check if update actually changes item before dispatching.

**Pattern**:
```typescript
const updateItemIfNeeded = (
  item: PlacedItem,
  canvasId: string,
  updates: { status?: string; [key: string]: unknown }
) => {
  let needsUpdate = false;

  // Check status change
  if (updates.status && updates.status !== item.status) {
    needsUpdate = true;
  }

  // Check data changes
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'status') continue;
    if (item.data?.[key] !== value) {
      needsUpdate = true;
      break;
    }
  }

  if (!needsUpdate) return;

  dispatch({
    type: 'CONFIGURE_DEVICE',
    payload: {
      deviceId: item.id,
      puzzleId: canvasId,
      config: updates
    }
  });
};
```

### Previous State Detection

**Problem**: Need to detect NEW items placed on canvas (not existing items).

**Solution**: Track previous item IDs, compare with current.

**Pattern**:
```typescript
const prevInternetIdsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  const currentIds = new Set(internetCanvas.placedItems.map(i => i.id));

  // Find new items (in current but not in previous)
  const newItems = internetCanvas.placedItems.filter(
    item => !prevInternetIdsRef.current.has(item.id)
  );

  // Process new items
  for (const item of newItems) {
    handleNewItemOnInternet(item);
  }

  // Update previous for next comparison
  prevInternetIdsRef.current = currentIds;
}, [internetCanvas.placedItems]);
```

### Modal Deduplication

**Problem**: Same modal can be triggered multiple times.

**Solution**: Track shown modals in ref, check before showing.

**Pattern**:
```typescript
const modalShownRef = useRef({
  mtu: false,
  synIntro: false,
  holBlocking: false,
  packetLoss: false,
  // ... all modals
});

// Before showing modal
if (!modalShownRef.current.mtu) {
  modalShownRef.current.mtu = true;
  dispatch({ type: 'OPEN_MODAL', payload: buildMtuModal() });
}
```

---

## Visual Feedback

### Connection Tunnel Animation

**Element**: Horizontal bar between internet and server

**States**:
- Hidden: Connection not established
- Appearing: Width animates 0% → 100% over 600ms (cubic-bezier easing)
- Visible: Full width, gradient background
- Disappearing: Opacity fades 100% → 0% over 600ms

**Gradient**: Linear gradient from cyan (#06B6D4) to teal (#14B8A6)

**Label**: "Connection tunnel" displayed above bar

**Triggers**:
- Show: connectionActive changes false → true
- Hide: connectionActive changes true → false

### Buffer Display Updates

**Real-time Updates**: Buffer display reflects current receivedSeqs and waitingSeqs state.

**Visual States**:
- Empty slot: Gray text `[#N ___]`
- Buffered slot: Yellow text `[#N ⏳]`
- Received slot: Green text `[#N ✅]`

**Update Animation**: When buffered packet releases, emoji changes ⏳ → ✅ with 800ms stagger between packets.

### Item Status Colors

Items use game engine status field for visual indication:

| Status | Visual Effect | Used For |
|--------|---------------|----------|
| `normal` | Default appearance | Idle items |
| `success` | Green highlight | Received packets |
| `warning` | Yellow/orange highlight | In-transit, buffered items |
| `error` | Red highlight | Lost packets, rejected items |

### Server Status Display

**Location**: Above server canvas

**Content**: Current server log last entry (or status message)

**Color Coding**:
- 🔴 Red: Disconnected
- 🟡 Yellow: Handshaking (SYN received, SYN-ACK sent, waiting for ACK)
- 🟢 Green: Connected

**Examples**:
- "🔴 Disconnected"
- "🟡 SYN-ACK sent - waiting for ACK..."
- "🟢 Connected - Waiting for data..."
- "Replying with ACK 3, all packets received."
- "📄 message.txt received successfully!"

---

## Success Criteria

Question completion requires:

1. ✅ **MTU Understanding** - File rejected, modal shown, splitter used
2. ✅ **File Fragmentation** - File split into packets
3. ✅ **Connection Requirement** - Fragment rejected without connection
4. ✅ **Three-Way Handshake** - SYN → SYN-ACK → ACK completed
5. ✅ **Sequence Numbering** - Packets numbered after handshake
6. ✅ **First File Transfer** - 3 message.txt packets delivered
7. ✅ **Head-of-Line Blocking** - Out-of-order packet buffered (demonstrated)
8. ✅ **Packet Loss** - Packet #2 dropped, loss modal shown
9. ✅ **Duplicate ACK Detection** - 3 duplicate ACKs received, resend triggered
10. ✅ **Fast Retransmit** - Missing packet resent successfully
11. ✅ **Second File Complete** - All 6 notes.txt packets delivered
12. ✅ **Connection Teardown** - FIN → FIN-ACK completed
13. ✅ **Terminal Inspection** - `tcpdump` or `tcpdump -explain` executed

**Completion Trigger**: Running `tcpdump` or `tcpdump -explain` in terminal phase.

**Completion Action**:
1. Show success modal
2. Call `onQuestionComplete()` callback
3. Mark question as complete in system
4. Enable navigation to next question

---

## Implementation Reference

### File Structure

```
src/routes/questions/networking/tcp/
├── index.tsx                      # Route definition
├── -page.tsx                      # Main component (434 lines)
│                                  # - Renders canvases, inventory, modals
│                                  # - Manages game/business phase sync
│                                  # - Displays server terminal, buffer, tunnel
│                                  # - Shows contextual hints
└── -utils/
    ├── constants.ts               # Canvas configs, item definitions (184 lines)
    ├── use-tcp-state.ts           # Business logic state machine (1,195 lines)
    │                              # - Phase management
    │                              # - Packet flow simulation (internet, server)
    │                              # - Buffer management (HOL blocking)
    │                              # - Duplicate ACK tracking
    │                              # - Server log generation
    │                              # - Timer registry
    │                              # - Modal deduplication
    ├── use-tcp-terminal.ts        # Terminal command handler (75 lines)
    ├── modal-builders.ts          # Modal factory functions (188 lines)
    ├── get-contextual-hint.ts     # Phase-based hint logic (86 lines)
    ├── inventory-tooltips.ts      # Educational tooltips (41 lines)
    └── item-notification.ts       # Item labels & status messages (64 lines)
```

**Total Implementation**: ~2,267 lines

### Key Files Explained

**-page.tsx**:
- Renders UI: canvases, inventory, server terminal, buffer display, connection tunnel
- Syncs business phase (useTcpState) with game phase (useGameState)
- Shows contextual hints based on phase
- Displays modals at appropriate triggers

**use-tcp-state.ts** (Core Business Logic):
- Manages TCP-specific phase state (11 phases)
- Watches canvas changes, detects new items
- Simulates packet travel with timers
- Implements buffer logic (received/waiting sets)
- Tracks duplicate ACKs
- Generates server log messages
- Builds and shows modals
- Handles packet loss scenario
- Manages timer cleanup

**use-tcp-terminal.ts**:
- Handles terminal commands (tcpdump, netstat, help, etc.)
- Generates command outputs
- Triggers question completion on tcpdump

**modal-builders.ts**:
- Factory functions for all 10 modals
- Returns modal instances with exact content
- Handles modal chaining (SYN-ACK → ACK)

**get-contextual-hint.ts**:
- Returns hint text based on current phase and state
- Handles special cases (packet waiting, out of order, connection lost)

**inventory-tooltips.ts**:
- Returns tooltip text and Wikipedia links for each item type

**item-notification.ts**:
- Returns item labels (names) based on state
- Returns status messages based on tcpState
- Handles sequencing, resend highlighting

---

## Testing Scenarios

### Happy Path (Perfect Execution)

1. Drag message.txt to internet → MTU modal, splitter appears
2. Drag message.txt to splitter → 3 packets created
3. Drag packet #1 to internet → Server rejects, SYN modal, SYN appears
4. Drag SYN to internet → SYN-ACK arrives, ACK modal, ACK appears
5. Drag ACK to internet → Handshake complete modal, connection active, packets numbered
6. Drag packet #1 to internet → Travels, arrives, ACK received
7. Drag packet #2 to internet → Travels, arrives, ACK received
8. Drag packet #3 to internet → Travels, arrives, ACK received, message.txt assembled
9. Drag notes.txt to splitter → 6 packets created, loss scenario active
10. Drag packet #1 to internet → Arrives, ACK sent
11. Drag packet #2 to internet → **LOST**, packet loss modal
12. Drag packet #3 to internet → Buffered (HOL blocking modal), duplicate ACK #2
13. Drag packet #4 to internet → Buffered, duplicate ACK #2
14. Drag packet #5 to internet → Buffered, duplicate ACK #2, resend phase triggered
15. Drag packet #2 again → Travels (not lost), arrives, buffer releases
16. Drag packet #6 to internet → Arrives, notes.txt assembled, close modal, FIN appears
17. Drag FIN to internet → FIN-ACK exchange, connection closes
18. Type `tcpdump` in terminal → Full log displayed, success modal, question complete

### Edge Case 1: Out-of-Order Delivery (Message Phase)

1. Complete handshake normally
2. Drag packet #3 first → Buffered, HOL modal, ACK #1 sent
3. Drag packet #1 → Received, ACK #2 sent, packet #3 released, ACK #4 sent
4. Drag packet #2 → Received, message.txt assembled

**Expected**: Buffer display shows `[#1 ___] [#2 ___] [#3 ⏳]` then releases when #1 arrives.

### Edge Case 2: Sending Data Before Handshake

1. Drag message.txt to splitter → 3 packets
2. Drag packet #1 to internet (before handshake) → Server rejects
3. Server log: "Processing..." then "I don't understand this package!"
4. SYN intro modal appears

**Expected**: Data rejected until connection established.

### Edge Case 3: Multiple Out-of-Order (Notes Phase)

1. Complete message.txt transfer
2. Split notes.txt → 6 packets
3. Send packets: #1, #3, #4, #5, #6 (skip #2 intentionally)
4. Packets #3, #4, #5, #6 all buffered
5. Duplicate ACKs accumulate (3 × ACK #2)
6. Resend modal shown
7. Send #2 → All buffered packets release in sequence

**Expected**: Buffer shows `[#1 ✅] [#2 ___] [#3 ⏳] [#4 ⏳] [#5 ⏳] [#6 ⏳]`, then releases with stagger.

### Edge Case 4: Early Resend Attempt (Before 3 Duplicates)

1. Packet #2 lost, packets #3, #4 sent (buffered)
2. Duplicate ACK count = 2 (not yet 3)
3. User tries to resend #2 before 3rd duplicate ACK

**Expected**: Packet still gets lost (allowPacket2 still false), loss happens again, duplicate count continues.

### Edge Case 5: Terminal Commands Before Phase

1. During mtu or connected phase, try typing `tcpdump`

**Expected**: "Error: Terminal is not ready yet."

### Edge Case 6: Unknown Commands

1. In terminal phase, type `ls`

**Expected**: "Unknown command: ls. Type 'help' for available commands."

---

## End of Blueprint

This blueprint represents the complete source of truth for the TCP File Fragmentation question. All content, behavior, timing, and logic are specified to enable implementation without ambiguity.

**Implementation Checklist**:
- [ ] Canvas setup (3 canvases with exact configs)
- [ ] Inventory groups (4 groups, progressive visibility)
- [ ] Item types (8 types with exact data schemas)
- [ ] Phase state machine (11 phases with all transitions)
- [ ] Packet flow simulation (internet/server canvas watchers)
- [ ] Buffer management (HOL blocking, release with stagger)
- [ ] Duplicate ACK detection (tracking, threshold, fast retransmit)
- [ ] Packet loss mechanism (packet #2, retransmit gate)
- [ ] Server log generation (dynamic ACK messages)
- [ ] Modal system (10 modals with exact text)
- [ ] Terminal commands (7 commands with outputs)
- [ ] Contextual hints (phase-based, 14 variations)
- [ ] Visual elements (connection tunnel, buffer display, status colors)
- [ ] Educational tooltips (6 item types with Wikipedia links)
- [ ] Timer management (registry, cleanup)
- [ ] Item status & labels (dynamic based on state)
- [ ] Success criteria & completion trigger

**Blueprint Version**: 2.0 (Complete Specification)
**Last Updated**: 2026-01-29
