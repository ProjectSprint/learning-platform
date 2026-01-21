# New Question Template

Fill out this template to define a new question. This information will be used to implement the question using the game engine.

---

## 1. Question Overview

**Question ID:** `tcp-reliability`

**Question Title:** `📦 Deliver the Message!`

**Question Description:** `The internet is unreliable — packets get lost! Build a reliable transport protocol to ensure your message arrives safely.`

**Learning Objective:** `Understand why TCP exists and how it achieves reliable data transfer over an unreliable network, including sequence numbers, acknowledgments, retransmission, the three-way handshake, and connection teardown.`

---

## 2. Phase 1: Canvas Game

**Type:** Drag-and-drop

**Goal:** Experience packet loss firsthand, then progressively unlock TCP mechanisms (sequence numbers, ACKs, retransmission, handshake) to achieve reliable message delivery

### 2.1 Canvas and Inventory Architecture

**Engine Capability:** This question uses conditional canvas states, dynamic inventory items, and a "chaos engine" that randomly drops/reorders packets in the internet canvas.

**Architecture Design Pattern:**

```
Question State
  ├── Canvas 1 (Client) - Always visible
  ├── Canvas 2 (Internet) - Always visible (chaos zone)
  ├── Canvas 3 (Server) - Always visible
  │
  ├── Inventory 1 (Basic) - Always visible
  │   └── message-packet (raw, no TCP)
  │
  ├── Inventory 2 (Sequence Numbers) - Conditional: appears after first packet loss
  │   └── seq-wrapper
  │
  ├── Inventory 3 (Retransmission) - Conditional: appears after server shows "missing packet"
  │   └── retransmit-timer
  │
  ├── Inventory 4 (Acknowledgments) - Conditional: appears after multi-packet challenge
  │   └── ack-mechanism
  │
  ├── Inventory 5 (Handshake) - Conditional: appears when connection gate blocks traffic
  │   ├── syn-flag
  │   ├── syn-ack-flag
  │   └── ack-flag
  │
  ├── Inventory 6 (Connection Close) - Conditional: appears after successful data transfer
  │   ├── fin-flag
  │   └── fin-ack-flag
```

### 2.1.1 Canvas Setup

**Canvas Layout:** Three canvases representing the client, the unreliable internet, and the server.

**Canvas Order:** `client` → `internet` → `server`

| Canvas Key | Title | Grid Size | Max Items | Allowed Item Types |
|------------|-------|-----------|-----------|-------------------|
| client | 💻 Client | 3 x 2 | 6 | ["message-packet", "seq-wrapper", "retransmit-timer", "ack-mechanism", "syn-flag", "ack-flag", "fin-flag"] |
| internet | ☁️ Internet | 4 x 2 | 8 | ["message-packet", "syn-flag", "syn-ack-flag", "ack-flag", "fin-flag", "fin-ack-flag", "packet-seq"] |
| server | 🖥️ Server | 3 x 2 | 6 | ["message-packet", "syn-ack-flag", "ack-flag", "fin-ack-flag", "packet-seq"] |

**Interaction Rules:**
- Items dragged to `internet` canvas may **disappear** (packet loss simulation) during chaos phases
- Items can be reordered when arriving at `server` (out-of-order delivery)
- Once TCP mechanisms are attached to packets, they gain protection against loss
- `syn-flag` must reach server before data packets can pass through
- Connection must be established (handshake complete) before data transfer

**Canvas Visibility Rules:**

| Canvas Key | Initial Visibility | Show Condition | Hide Condition | Notes |
|------------|-------------------|----------------|----------------|-------|
| client | Always visible | Always | Never | User's machine |
| internet | Always visible | Always | Never | The unreliable network (chaos zone) |
| server | Always visible | Always | Never | Destination machine |

**Canvas State Rules:**

| Canvas Key | State | Visual Indicator | Condition |
|------------|-------|------------------|-----------|
| internet | chaos | Red/orange pulsing border, ☁️💥 icon | Before TCP mechanisms attached |
| internet | semi-stable | Yellow border | Sequence numbers attached but no ACK |
| internet | stable | Green border | Full TCP stack in use |
| server | closed | 🚫 Gate icon overlay | Handshake not complete |
| server | listening | 👂 Ear icon | SYN received, waiting for ACK |
| server | open | ✅ Open gate | Connection established |

### 2.1.2 Inventory Setup

**Inventory Configuration:** This question uses six inventory groups that unlock progressively as the player experiences network problems.

**Inventory Visibility Timeline:**

| Inventory Key | Initial Items | Phase 1 (Raw) | Phase 2 (Seq) | Phase 3 (Timer) | Phase 4 (ACK) | Phase 5 (Handshake) | Phase 6 (Close) |
|---|---|---|---|---|---|---|---|
| basic | message-packet-1, message-packet-2, message-packet-3 | Visible | Visible | Visible | Visible | Visible | Visible |
| sequence | seq-wrapper-1 | Hidden | Visible | Visible | Visible | Visible | Visible |
| retransmit | retransmit-timer-1 | Hidden | Hidden | Visible | Visible | Visible | Visible |
| acks | ack-mechanism-1 | Hidden | Hidden | Hidden | Visible | Visible | Visible |
| handshake | syn-flag-1, ack-flag-1 | Hidden | Hidden | Hidden | Hidden | Visible | Visible |
| connection-close | fin-flag-1 | Hidden | Hidden | Hidden | Hidden | Hidden | Visible |

**Item Visibility Rules:**

| Item ID | Initial State | Becomes Visible When | Notes |
|---------|---|---|---|
| `message-packet-1` | Visible | Always visible | First data packet |
| `message-packet-2` | Visible | Always visible | Second data packet |
| `message-packet-3` | Visible | Always visible | Third data packet |
| `seq-wrapper-1` | Hidden | First packet loss experienced | Enables sequence numbers |
| `retransmit-timer-1` | Hidden | Server shows "missing packet" ghost | Enables automatic retry |
| `ack-mechanism-1` | Hidden | Multi-packet delivery attempted | Enables acknowledgments |
| `syn-flag-1` | Hidden | Connection gate appears on server | For handshake initiation |
| `ack-flag-1` | Hidden | Connection gate appears on server | For handshake completion |
| `fin-flag-1` | Hidden | Data successfully transferred | For graceful connection close |

### 2.2 Item Types

Define the types of items in this question. Icons are from [Iconify](https://icon-sets.iconify.design/).

| Type | Display Label | Icon | Description |
|------|---------------|------|-------------|
| message-packet | Packet | `mdi:package-variant` | Raw data packet (vulnerable to loss) |
| packet-seq | Packet #N | `mdi:package-variant-closed` | Packet with sequence number attached |
| seq-wrapper | Sequence # | `mdi:numeric` | Adds sequence number to packets |
| retransmit-timer | ⏱️ Timer | `mdi:timer-outline` | Enables automatic retransmission |
| ack-mechanism | ACK System | `mdi:check-network` | Enables acknowledgment messages |
| syn-flag | SYN | `mdi:flag-outline` | Synchronize flag for handshake |
| syn-ack-flag | SYN-ACK | `mdi:flag-checkered` | Server's handshake response |
| ack-flag | ACK | `mdi:flag` | Acknowledgment flag |
| fin-flag | FIN | `mdi:flag-remove` | Finish flag for connection close |
| fin-ack-flag | FIN-ACK | `mdi:flag-remove-outline` | Finish acknowledgment |

**Click Behavior:**

| Type | On Click | Opens Modal |
|------|----------|-------------|
| message-packet | View packet info | packet-info |
| packet-seq | View sequence details | packet-seq-info |
| seq-wrapper | Learn about sequencing | seq-explanation |
| retransmit-timer | Learn about retransmission | retransmit-explanation |
| ack-mechanism | Learn about ACKs | ack-explanation |
| syn-flag | Learn about SYN | syn-explanation |
| syn-ack-flag | Learn about SYN-ACK | syn-ack-explanation |
| ack-flag | Learn about ACK | ack-explanation |
| fin-flag | Learn about FIN | fin-explanation |
| fin-ack-flag | Learn about FIN-ACK | fin-ack-explanation |

### 2.3 Item States & Status Messages

#### Item Type: `message-packet`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "Ready to send" | In inventory, not yet sent |
| in-transit | "Sending..." | In internet canvas |
| lost | "💨 Lost!" | Packet was dropped by chaos engine |
| delivered | "✅ Delivered" | Arrived at server |

#### Item Type: `packet-seq`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "Packet #N ready" | Sequenced packet in client |
| in-transit | "Packet #N sending..." | In internet canvas |
| waiting | "Packet #N waiting for ACK" | Sent but not acknowledged |
| acked | "Packet #N ✅" | Acknowledged by server |
| retransmitting | "Packet #N resending..." | Timer triggered resend |

#### Item Type: `seq-wrapper`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "Drag onto packets" | Not yet applied |
| applied | "Sequencing active" | Applied to client's TCP stack |

#### Item Type: `retransmit-timer`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "Drag to client" | Not yet attached |
| watching | "Watching for timeouts..." | Active, no timeouts |
| triggered | "⏱️ Timeout! Resending..." | Retransmission in progress |

#### Item Type: `ack-mechanism`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "Drag to enable ACKs" | Not yet attached |
| active | "ACKs enabled" | Server will send acknowledgments |

#### Canvas: `server`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| closed | "🚫 Connection closed" | No handshake initiated |
| syn-received | "SYN received, send ACK!" | SYN arrived, waiting for ACK |
| established | "✅ Connection open" | Handshake complete |
| receiving | "Receiving packets..." | Data transfer in progress |
| fin-wait | "FIN received, closing..." | Graceful shutdown initiated |
| closed-complete | "Connection closed gracefully" | FIN-ACK exchange complete |

### 2.4 Connection Rules

**Connection Method:** Items flow from client → internet → server. The internet canvas acts as a "chaos zone" that can drop or reorder packets.

**Chaos Engine Rules:**

| Phase | Packet Loss Rate | Reorder Rate | Notes |
|-------|------------------|--------------|-------|
| Raw packets | 100% | N/A | Always lost (teaches the problem) |
| Sequence numbers only | 50% | 30% | Sometimes works, sometimes fails |
| Seq + Timer | 20% | 30% | Retransmission helps |
| Seq + Timer + ACK | 10% | 20% | Much more reliable |
| Full TCP (after handshake) | 5% | 10% | Simulates real-world conditions |

**Packet Flow Requirements:**

| Scenario | Required Items | Result |
|----------|----------------|--------|
| Raw packet to internet | message-packet | Packet vanishes (100% loss) |
| Sequenced packet to internet | packet-seq | May arrive, server knows what's missing |
| With retransmit timer | packet-seq + retransmit-timer on client | Auto-resends on timeout |
| With ACK | packet-seq + ack-mechanism | Server confirms receipt |
| Before handshake | Any data packet | Blocked by server gate |
| After handshake | Any data packet | Allowed through |

### 2.5 Tooltips

| Item Type | Tooltip Text |
|-----------|--------------|
| message-packet | "Raw data with no protection. Will it survive the internet?" |
| packet-seq | "Now the server knows which packet this is and what order it should arrive" |
| seq-wrapper | "Sequence numbers let the receiver know if packets are missing or out of order" |
| retransmit-timer | "If no ACK arrives in time, send the packet again!" |
| ack-mechanism | "The receiver tells the sender which packets arrived safely" |
| syn-flag | "SYN = 'Let's synchronize!' - Starts the three-way handshake" |
| syn-ack-flag | "SYN-ACK = 'OK, let's synchronize!' - Server agrees to connect" |
| ack-flag | "ACK = 'Got it!' - Confirms receipt of data or completes handshake" |
| fin-flag | "FIN = 'I'm finished!' - Initiates graceful connection close" |
| fin-ack-flag | "FIN-ACK = 'OK, goodbye!' - Confirms connection closure" |

### 2.6 Modals

#### Modal: `packet-lost`

**Trigger:** First time a packet vanishes in the internet canvas

**Title:** `💨 Packet Lost!`

**Content:**
> Oh no! Your packet disappeared in the internet.
>
> The internet is built on **unreliable** networks. Packets can be:
> - **Lost** (router overloaded, cable damaged)
> - **Delayed** (congestion, long routes)
> - **Reordered** (packets take different paths)
>
> This is why we need **TCP** — a protocol that makes unreliable networks reliable!

**Unlocks:** `seq-wrapper` item appears in inventory

---

#### Modal: `seq-explanation`

**Trigger:** Click on seq-wrapper OR first time applying it

**Title:** `🔢 Sequence Numbers`

**Content:**
> Every TCP packet gets a **sequence number**.
>
> This lets the receiver:
> - Know **which packet** this is
> - Detect **missing packets** (gaps in sequence)
> - **Reorder** packets that arrive out of order
>
> Without sequence numbers, the receiver has no idea what's missing!

**Visual:** Show packets labeled #1, #2, #3 arriving as #1, #3 — receiver shows "Where's #2?"

---

#### Modal: `server-missing-packet`

**Trigger:** Sequenced packet arrives but one is missing

**Title:** `❓ Missing Packet Detected`

**Content:**
> The server received packets #1 and #3, but #2 is missing!
>
> With sequence numbers, the server **knows** something is wrong.
> But the client doesn't know the packet was lost...
>
> What if the client could **automatically resend** lost packets?

**Unlocks:** `retransmit-timer` item appears in inventory

---

#### Modal: `retransmit-explanation`

**Trigger:** Click on retransmit-timer OR first time applying it

**Title:** `⏱️ Retransmission Timer`

**Content:**
> TCP sets a **timer** when sending each packet.
>
> If no acknowledgment arrives before the timer expires:
> - Assume the packet was **lost**
> - **Resend** the packet automatically
>
> This is called **retransmission** — TCP's way of recovering from loss!

**Visual:** Animation showing packet sent → timer ticking → timeout → resend

---

#### Modal: `ack-explanation`

**Trigger:** Click on ack-mechanism OR when needed for multi-packet

**Title:** `✅ Acknowledgments (ACKs)`

**Content:**
> How does the sender know a packet arrived?
>
> The receiver sends back an **ACK** (acknowledgment):
> - "ACK 1" = "I got packet 1, send #2 next"
> - "ACK 1, ACK 1, ACK 1" = "I keep getting duplicates, #2 is missing!"
>
> **Duplicate ACKs** trigger fast retransmit — don't even wait for the timer!

**Visual:** Client ↔ Server with ACK arrows flowing back

---

#### Modal: `connection-gate`

**Trigger:** User tries to send data but server gate is closed

**Title:** `🚫 Connection Not Established`

**Content:**
> Before sending data, client and server must **agree to communicate**.
>
> This is the **three-way handshake**:
> 1. **Client → SYN** ("I want to connect")
> 2. **Server → SYN-ACK** ("OK, I acknowledge and want to connect too")
> 3. **Client → ACK** ("Got it, let's go!")
>
> Only after this handshake can data flow freely.

**Unlocks:** `syn-flag` and `ack-flag` items appear in inventory

---

#### Modal: `syn-explanation`

**Trigger:** Click on SYN flag

**Title:** `🤝 SYN - Synchronize`

**Content:**
> **SYN** stands for "synchronize."
>
> When the client sends a SYN packet, it's saying:
> - "Hello, I want to establish a connection"
> - "Here's my initial sequence number"
>
> The server must respond with SYN-ACK to continue.

---

#### Modal: `syn-ack-explanation`

**Trigger:** Click on SYN-ACK flag (auto-generated by server)

**Title:** `🤝 SYN-ACK - Synchronize + Acknowledge`

**Content:**
> The server responds with **SYN-ACK**:
>
> - **SYN** = "I also want to synchronize"
> - **ACK** = "I acknowledge your SYN"
>
> Now the client must send a final ACK to complete the handshake.

---

#### Modal: `handshake-complete`

**Trigger:** ACK reaches server, handshake completes

**Title:** `✅ Connection Established!`

**Content:**
> The three-way handshake is complete!
>
> ```
> Client          Server
>   |---- SYN ----->|
>   |<-- SYN-ACK ---|
>   |---- ACK ----->|
>   |               |
>   | [Connection   |
>   |  Established] |
> ```
>
> Now data can flow reliably in both directions.

**Action:** Server gate opens, data packets can now be sent

---

#### Modal: `fin-explanation`

**Trigger:** Click on FIN flag OR when data transfer complete

**Title:** `👋 FIN - Graceful Goodbye`

**Content:**
> When communication is done, TCP closes the connection gracefully:
>
> 1. **Client → FIN** ("I'm done sending")
> 2. **Server → FIN-ACK** ("OK, I acknowledge")
> 3. **Server → FIN** ("I'm also done")
> 4. **Client → ACK** ("Goodbye!")
>
> This ensures no data is lost during shutdown.

---

#### Modal: `message-delivered`

**Trigger:** All three packets successfully delivered and ACKed

**Title:** `📬 Message Delivered!`

**Content:**
> All packets arrived safely!
>
> **What TCP did for you:**
> - ✅ Numbered each packet (sequence numbers)
> - ✅ Confirmed delivery (acknowledgments)
> - ✅ Resent lost packets (retransmission)
> - ✅ Reordered mixed-up packets
> - ✅ Established connection first (handshake)
>
> Now close the connection gracefully to complete the challenge!

**Unlocks:** `fin-flag` appears in inventory

---

### 2.7 Animations

#### Animation: `packet-vanish`

**Trigger:** Packet dropped by chaos engine in internet canvas

**Description:** Packet fades out with a "poof" effect and 💨 emoji

**Duration:** 0.5 seconds

---

#### Animation: `packet-travel`

**Trigger:** Packet moving between canvases

**Description:** Packet slides horizontally with slight bounce, trail effect shows path

**Duration:** 1 second per canvas transition

---

#### Animation: `retransmit-pulse`

**Trigger:** Retransmission timer expires

**Description:** Timer item pulses red, then triggers packet-travel animation for resend

**Duration:** 0.3 second pulse, then normal travel

---

#### Animation: `ack-return`

**Trigger:** Server sends ACK back to client

**Description:** Small "ACK #N" badge flies from server to client (reverse direction)

**Duration:** 0.5 seconds

---

#### Animation: `handshake-sequence`

**Trigger:** Full handshake completes

**Description:** 
1. SYN travels client → server
2. SYN-ACK travels server → client  
3. ACK travels client → server
4. Gate opens with "unlock" animation
5. Confetti burst

**Duration:** 3 seconds total

---

#### Animation: `connection-close`

**Trigger:** FIN/FIN-ACK exchange completes

**Description:**
1. FIN travels client → server
2. FIN-ACK travels server → client
3. Gate closes gently
4. "Connection closed" badge appears

**Duration:** 2 seconds total

---

### 2.8 Hints

**Progressive Hints:**

| Hint # | Condition | Hint Text |
|--------|-----------|-----------|
| 1 | Packet lost, no action for 10s | "Your packet vanished! The internet is unreliable. Look for new tools in your inventory." |
| 2 | Has seq-wrapper, not applied for 15s | "Try dragging the Sequence # tool to your packets. This will help track what's missing." |
| 3 | Server shows missing packet, no action for 10s | "The server knows packet #2 is missing, but the client doesn't. Check your inventory for something new." |
| 4 | Has retransmit-timer, not applied for 15s | "The Timer can automatically resend lost packets. Drag it to your client." |
| 5 | Multi-packet stuck, ACK not used | "The client needs to know which packets arrived. Enable the ACK System." |
| 6 | Data blocked by gate | "The server won't accept data without a connection. Start with a SYN to say hello!" |
| 7 | SYN sent, waiting on ACK | "The server sent SYN-ACK. Send an ACK back to complete the handshake." |
| 8 | Data delivered, FIN not sent | "Great! All data delivered. Now close the connection gracefully with FIN." |

**Error Hints:**

| Error Condition | Hint Text |
|-----------------|-----------|
| Trying to send data before handshake | "🚫 The server gate is closed! Complete the three-way handshake first." |
| Sending ACK before SYN | "You need to send SYN first. The handshake goes: SYN → SYN-ACK → ACK" |
| Sending FIN before data complete | "Your message isn't fully delivered yet! Finish sending data before closing." |

### 2.9 Phase Transitions

**Phase Flow:**

```
raw-packets → sequencing → retransmission → acknowledgment → handshake → data-transfer → connection-close → terminal → completed
```

**Transition Rules:**

| Current Phase | Trigger | Next Phase | Actions |
|---------------|---------|------------|---------|
| `raw-packets` | First packet lost in internet | `sequencing` | Show packet-lost modal, unlock seq-wrapper |
| `sequencing` | Server detects missing packet | `retransmission` | Show server-missing-packet modal, unlock retransmit-timer |
| `retransmission` | Attempt multi-packet send | `acknowledgment` | Show ack-explanation modal, unlock ack-mechanism |
| `acknowledgment` | All TCP tools attached, try to send | `handshake` | Show connection-gate modal, unlock syn-flag and ack-flag |
| `handshake` | Three-way handshake complete | `data-transfer` | Show handshake-complete modal, open server gate |
| `data-transfer` | All 3 packets delivered and ACKed | `connection-close` | Show message-delivered modal, unlock fin-flag |
| `connection-close` | FIN/FIN-ACK exchange complete | `terminal` | Show connection closed, enable terminal |
| `terminal` | User runs verification commands | `completed` | Success modal + question complete |

**Phase Behaviors:**

| Phase | Chaos Level | Available Items | UI State |
|-------|-------------|-----------------|----------|
| `raw-packets` | 100% loss | message-packet only | Internet shows angry red chaos |
| `sequencing` | 50% loss | + seq-wrapper | Internet shows orange |
| `retransmission` | 20% loss | + retransmit-timer | Internet shows yellow |
| `acknowledgment` | 10% loss | + ack-mechanism | Internet shows light green |
| `handshake` | 5% loss | + syn-flag, ack-flag | Server gate visible |
| `data-transfer` | 5% loss | All items | Server gate open |
| `connection-close` | 0% loss | + fin-flag | Stable connection |
| `terminal` | N/A | All (read-only) | Terminal visible |
| `completed` | N/A | All (read-only) | Success modal |

---

## 3. Phase 2: Terminal Game

**Type:** Command-line

**Goal:** Verify TCP connection states and packet flow

### 3.1 Terminal Setup

**Prompt:**
> Your TCP connection worked! Use the terminal to inspect what happened under the hood.

**Visible UI:**
- Terminal panel appears at bottom
- All canvases remain visible (read-only)
- Packet flow animation can replay

### 3.2 Expected Commands

**Command 1:** `netstat -an`

**Expected Response:**
```
Active Connections

Proto  Local Address      Foreign Address    State
TCP    192.168.1.10:54321 93.184.216.34:80  ESTABLISHED
```

**Command 2:** `tcpdump`

**Expected Response:**
```
15:04:32.001 IP 192.168.1.10 > 93.184.216.34: Flags [S], seq 1000
15:04:32.045 IP 93.184.216.34 > 192.168.1.10: Flags [S.], seq 2000, ack 1001
15:04:32.046 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2001

15:04:32.100 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1001:1101, ack 2001
15:04:32.150 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1101

15:04:32.200 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1101:1201, ack 2001
15:04:32.250 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1201

15:04:32.300 IP 192.168.1.10 > 93.184.216.34: Flags [P.], seq 1201:1301, ack 2001
15:04:32.350 IP 93.184.216.34 > 192.168.1.10: Flags [.], ack 1301

15:04:33.000 IP 192.168.1.10 > 93.184.216.34: Flags [F.], seq 1301, ack 2001
15:04:33.050 IP 93.184.216.34 > 192.168.1.10: Flags [F.], seq 2001, ack 1302
15:04:33.051 IP 192.168.1.10 > 93.184.216.34: Flags [.], ack 2002

--- Connection closed gracefully ---
```

**Command 3:** `tcpdump -explain`

**Expected Response:**
```
TCP Flags explained:
  [S]  = SYN      - Start connection
  [S.] = SYN-ACK  - Acknowledge + start
  [.]  = ACK      - Acknowledgment
  [P.] = PSH-ACK  - Push data + ack
  [F.] = FIN-ACK  - Finish + ack

Your session:
  1. Three-way handshake (SYN → SYN-ACK → ACK)
  2. Data transfer (3 packets, each ACKed)
  3. Connection close (FIN → FIN-ACK → ACK)

Total packets: 11
Retransmissions: 0
Packet loss: 0%
```

### 3.3 Additional Commands

| Command | Syntax | Response |
|---------|--------|----------|
| `netstat` | Show connections | Lists active TCP connections |
| `netstat -an` | Detailed connections | Shows addresses and states |
| `tcpdump` | Packet capture | Shows all packets with flags |
| `tcpdump -explain` | Explained capture | Adds flag explanations |
| `tcpdump -count` | Packet count | Shows summary statistics |
| `ss -t` | Socket statistics | Shows TCP socket states |
| `help` | Help | Lists supported commands |
| `clear` | Clear | Clears terminal history |

### 3.4 Command Responses

**Error Responses:**

| Error Condition | Error Message |
|-----------------|---------------|
| Unknown command | Unknown command: {command}. Type 'help' for available commands. |
| tcpdump before connection | Error: No packets captured. Complete the TCP connection first. |
| netstat before connection | Error: No active connections. |

### 3.5 Phase Completion

**Trigger:** User runs `tcpdump` or `tcpdump -explain` successfully

**Next Phase:** Completed

---

## 4. Phase 3: Completed

**Type:** Success

### 4.1 Success Modal

**Title:** `📦 Message Delivered Reliably!`

**Message:**
> Congratulations! You've built TCP from scratch and understand why it exists.
>
> You learned:
> - **The problem**: The internet is unreliable — packets get lost, delayed, reordered
> - **Sequence numbers**: Let the receiver detect missing or out-of-order packets
> - **Acknowledgments (ACKs)**: Confirm which packets arrived safely
> - **Retransmission**: Automatically resend lost packets after a timeout
> - **Three-way handshake**: SYN → SYN-ACK → ACK establishes a connection
> - **Connection close**: FIN → FIN-ACK ensures graceful shutdown
>
> TCP transforms an unreliable network into a reliable communication channel.
> Every time you browse the web, send an email, or transfer a file — TCP is doing this for you!

**Action Button:** `Next question`

---

## 5. Additional Notes

### 5.1 Relationship to Previous Puzzles

This puzzle can work standalone or assume knowledge from:
- Basic networking concepts (IP addresses, packets)
- The SSL puzzle (which uses TCP underneath)

### 5.2 Simplified vs Reality

| Concept | This Puzzle | Real World |
|---------|-------------|------------|
| Sequence numbers | Simple 1, 2, 3 | Byte-based, large random initial values |
| Retransmission timer | Fixed 3 seconds | Adaptive based on RTT |
| Packet loss | Controlled chaos engine | Random, varies by network |
| Handshake | Always succeeds eventually | Can timeout, get rejected |
| Window size | Not covered | Flow control via sliding window |
| Congestion control | Not covered | Slow start, congestion avoidance |

### 5.3 Teaching Points

| Concept | Why It Matters |
|---------|----------------|
| Reliability on unreliable networks | Foundation of internet architecture |
| Sequence numbers | Ordering is not guaranteed |
| ACKs | Sender needs feedback |
| Retransmission | Recovery from loss |
| Handshake | Both sides must agree |
| Graceful close | No data loss at shutdown |

### 5.4 Common Misconceptions Addressed

| Misconception | Reality |
|---------------|---------|
| "The internet is reliable" | Packets can be lost, delayed, or reordered anytime |
| "Packets arrive in order" | They often don't — TCP reorders them |
| "If I send it, it arrives" | Without TCP, there's no guarantee |
| "TCP is just overhead" | TCP solves real, constant problems |
| "Connections are instant" | Handshake takes round-trip time |

### 5.5 Visual Design Notes

**Color Coding:**
- Raw packets: Gray
- Sequenced packets: Blue with number badge
- ACKs: Green arrows (reverse direction)
- SYN/FIN flags: Yellow/Orange
- Lost packets: Red fade-out

**Internet Canvas Chaos Levels:**
- 100% loss: Angry red storm clouds, lightning bolts
- 50% loss: Orange clouds, occasional flashes
- 20% loss: Yellow clouds, mild turbulence
- 5% loss: Light gray clouds, mostly calm
- 0% loss: Clear blue, stable

---

## Checklist

Before implementation, ensure you have defined:

**Phase 1 - Canvas Game:**
- [x] Canvas setup (3 canvases: client, internet, server)
- [x] Canvas state rules (chaos levels, server gate)
- [x] Item types with display labels, icons, and click behavior (10 types)
- [x] Item states and status messages for each type
- [x] Chaos engine rules (packet loss/reorder rates per phase)
- [x] Multiple inventories (6 groups, progressive unlock)
- [x] Conditional inventory visibility rules
- [x] Tooltips for all item types
- [x] Modal triggers and definitions (11 modals)
- [x] Animations (6 animations)
- [x] Progressive hints and error hints
- [x] Phase transition rules (8 phases)

**Phase 2 - Terminal Game:**
- [x] Terminal prompt
- [x] Expected commands (netstat, tcpdump)
- [x] Success and error responses
- [x] Additional commands (ss, help)
- [x] Phase completion trigger

**Phase 3 - Completed:**
- [x] Success modal content with learning summary

**Overall:**
- [x] Question ID: `tcp-reliability`
- [x] Question title: `📦 Deliver the Message!`
- [x] Question description
- [x] Learning objective
