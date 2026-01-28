# Networking Question: Connect Two Computers

Module: Networking Fundamentals
Difficulty: Beginner
Estimated time: 5 minutes

---

## Objective

Connect two computers to a router, configure DHCP, and verify connectivity using a terminal command.

---

## Scope

### In scope
- Validate player actions against the current game state.
- Parse terminal input into structured intent and validate that intent.
- Drive phase changes through GameProvider actions and derived state.

### Out of scope
- UI rendering, animations, or layout logic.
- Low-level drag/drop behavior (handled by PlayCanvas and InventoryPanel).
- Modal rendering and focus management (handled by OverlayLayer).

---

## Component contracts (hard dependencies)

- GameProvider
  - Owns state and dispatch, processes actions, and controls phase transitions.
- InventoryPanel
  - Drag source only, no validation and no state mutations.
- PlayCanvas
  - Handles drop targets, emits placement and connection actions.
- TerminalLayout
  - Captures input, dispatches SUBMIT_COMMAND, renders history from state.
- OverlayLayer
  - Renders configuration modals and hint toasts from state.overlay.

The question logic must not import UI components directly.

---

## Flow

Flow overview (state gates)

```
Step 0  | State flow
        |
        |   +--------+     +---------+     +----------+     +-----------+
        |   | setup  | --> | playing | --> | terminal | --> | completed |
        |   +--------+     +---------+     +----------+     +-----------+
        |
        |   Gate A: router placed + at least one PC connected
        |   Gate B: both PCs have IPs from configured router
        |   Gate C: valid ping intent
--------+--------------------------------------------------------------------
```

### Phase 1: Build the network

```
Step 1.1 | Place PC-1 on the canvas
         |
         |   +------------------------------+
         |   | CANVAS                       |
         |   |                              |
         |   |   [PC-1]                     |
         |   |                              |
         |   +------------------------------+
         |
---------+--------------------------------------------------------------------

Step 1.2 | Place the router on the canvas
         |
         |   +-------------------------------------------+
         |   | CANVAS                                    |
         |   |                                           |
         |   |   [PC-1]                 [Router: WARN]   |
         |   |                                           |
         |   +-------------------------------------------+
         |
---------+--------------------------------------------------------------------

Step 1.3 | Connect PC-1 to the router with a cable
         |
         |   +-------------------------------------------+
         |   | CANVAS                                    |
         |   |                                           |
         |   |   [PC-1]----(cable)----[Router: WARN]     |
         |   |                                           |
         |   +-------------------------------------------+
         |
         |   STATE: Router present, unconfigured.
         |          PC-1 connected, IP = none.
```

### Phase 2: Configure the router

```
Step 2.1 | Click router to open config modal
         |
         |   +----------------------------------+
         |   | ROUTER CONFIGURATION             |
         |   | DHCP: [ ]                        |
         |   | IP Range: [192.168.1.0/24]       |
         |   |                                  |
         |   | [Cancel]              [Save]     |
         |   +----------------------------------+
         |
---------+--------------------------------------------------------------------

Step 2.2 | Save config (DHCP enabled)
         |
         |   +-------------------------------------------+
         |   | CANVAS                                    |
         |   |                                           |
         |   |   [PC-1]----(cable)----[Router: OK]       |
         |   |   PC-1 IP: 192.168.1.2                    |
         |   |                                           |
         |   +-------------------------------------------+
         |
         |   STATE: Router configured, PC-1 has IP.
```

### Phase 3: Connect the second computer

```
Step 3.1 | Place PC-2 on the canvas
         |
         |   +-------------------------------------------+
         |   | CANVAS                                    |
         |   |                                           |
         |   |   [PC-1]----(cable)----[Router: OK]       |
         |   |                             [PC-2]        |
         |   |                                           |
         |   +-------------------------------------------+
         |
---------+--------------------------------------------------------------------

Step 3.2 | Connect PC-2 to the router with a cable
         |
         |   +-------------------------------------------+
         |   | CANVAS                                    |
         |   |                                           |
         |   |   [PC-1]----+                             |
         |   |              |                            |
         |   |          [Router: OK]                     |
         |   |              |                            |
         |   |   [PC-2]----+                             |
         |   |   PC-1 IP: 192.168.1.2                    |
         |   |   PC-2 IP: 192.168.1.3                    |
         |   +-------------------------------------------+
         |
         |   STATE: Both PCs connected and assigned IPs.
```

### Phase 4: Terminal challenge

```
Step 4.1 | Terminal prompt appears
         |
         |   +-----------------------------------------+
         |   | TERMINAL                                |
         |   | How can you check PC-1 -> PC-2?         |
         |   | > _                                     |
         |   +-----------------------------------------+
         |
---------+--------------------------------------------------------------------

Step 4.2 | User submits a ping command
         |
         |   ACCEPTED: ping PC-2, ping 192.168.1.3
         |   REJECTED: connect PC-1 PC-2, check network
         |
---------+--------------------------------------------------------------------

Step 4.3 | Success -> question completes
         |
         |   +-----------------------------------------+
         |   | QUESTION COMPLETE                       |
         |   | You connected two computers and         |
         |   | verified with ping.                     |
         |   | [Next Question]                         |
         |   +-----------------------------------------+
```

---

## Validation checkpoints

| # | Condition | Blocks until |
| - | --------- | ------------ |
| 1 | Router is placed | Router configuration is allowed |
| 2 | PC-1 is connected to router | PC-1 can receive an IP |
| 3 | Router DHCP is enabled | Any PC can receive an IP |
| 4 | Both PCs have IPs | Terminal phase can start |
| 5 | Valid terminal command | Question can complete |

---

## Success criteria

- [ ] PC-1 placed on the canvas
- [ ] Router placed and configured (DHCP enabled)
- [ ] PC-1 connected to the router via cable
- [ ] PC-2 placed and connected to the router via cable
- [ ] Both PCs have IP addresses
- [ ] User verifies connectivity with a ping command

---

## Implementation details (rewritten)

### State model
- Use GameProvider as the single source of truth.
- Use state.phase for the global game phase: setup -> playing -> terminal -> completed.
- Use state.question.status to track in_progress vs completed.
- Store question-specific device data in PlacedItem.data, for example:
  - Router: { dhcpEnabled: boolean, ipRange: string }
  - PC: { ip: string | null, connectedToRouterId: string | null }
- Use PlacedItem.status for visual feedback: warning (unconfigured router, no IP), success (configured router, IP assigned).

```
Step S1 | GameState (relevant slices)
        |
        |   game
        |   +-- phase
        |   +-- inventory
        |   +-- canvas
        |   |    +-- blocks
        |   |    +-- placedItems
        |   |    +-- connections
        |   +-- terminal
        |   |    +-- visible
        |   |    +-- prompt
        |   |    +-- history
        |   +-- overlay
        |   +-- question
        |        +-- id
        |        +-- status
--------+--------------------------------------------------------------------
```

### Phase transitions
- setup -> playing: once the router and at least one PC are placed and connected.
- playing -> terminal: once both PCs have valid IPs from the configured router.
- terminal -> completed: after a valid ping intent is confirmed.

```
Step P1 | Phase gates
        |
        |   [setup] --(router + PC connected)--> [playing]
        |   [playing] --(both IPs)-------------> [terminal]
        |   [terminal] --(valid ping)----------> [completed]
--------+--------------------------------------------------------------------
```

### Actions and event handling
- InventoryPanel sets drag data only.
- PlayCanvas dispatches PLACE_ITEM and MAKE_CONNECTION.
- Clicking a router dispatches OPEN_MODAL with type router-config.
- RouterConfigForm dispatches CONFIGURE_DEVICE with validated config.
- GameProvider reducer recalculates networking state after PLACE_ITEM, MAKE_CONNECTION, and CONFIGURE_DEVICE.

```
Step A1 | Drag/drop and config actions
        |
        |   InventoryPanel (drag data only)
        |            |
        |            v
        |   PlayCanvas --> dispatch(PLACE_ITEM / MAKE_CONNECTION)
        |            |
        |            v
        |   GameProvider reducer --> state update --> UI re-render
        |
        |   Router click --> dispatch(OPEN_MODAL: router-config)
        |   RouterConfigForm --> dispatch(CONFIGURE_DEVICE)
--------+--------------------------------------------------------------------
```

### Router configuration and DHCP assignment
- Validate DHCP config using a shared CIDR validator (private ranges only, prefix /8 to /30).
- Assign IPs only when:
  - Router is configured and DHCP enabled.
  - PC is connected to that router.
- Assignment must be deterministic and repeatable (stable order by connection time or item id).
- Support retroactive assignment when the router is configured after devices are connected.

```
Step D1 | DHCP assignment pipeline
        |
        |   [router config saved]
        |            |
        |            v
        |   validate CIDR -> config ok?
        |            |
        |            v
        |   gather connected PCs (routerId)
        |            |
        |            v
        |   sort PCs (stable key)
        |            |
        |            v
        |   assign IPs -> update PlacedItem.data/status
--------+--------------------------------------------------------------------
```

### Terminal parsing and validation
- Parse input into explicit command types (for example, PING { targetId | targetIp }).
- Validation checks intent and state, not raw strings.
- Accepted: ping PC-2 or ping <ip> where <ip> is PC-2.
- Rejected: unknown commands, malformed input, or targets without IPs.
- Successful validation dispatches ADD_TERMINAL_OUTPUT and COMPLETE_QUESTION.

```
Step T1 | Terminal pipeline
        |
        |   raw input
        |      |
        |      v
        |   sanitize -> parse -> validate intent
        |      |                 |
        |      |                 +-- reject -> error output
        |      v
        |   accept -> ADD_TERMINAL_OUTPUT -> COMPLETE_QUESTION
--------+--------------------------------------------------------------------
```

### Hints and progression
- Use progressive hints via SHOW_HINT and DISMISS_HINT, with time-based triggers.
- Hints must be descriptive but never reveal the exact terminal answer.
- When the terminal phase starts, set state.terminal.visible and prompt text.

```
Step H1 | Hints (progressive + phase-gated)
        |
        |   [activity monitor] -> idle >= 30s -> hint #1 (placement)
        |                      -> idle >= 60s -> hint #2 (router config)
        |                      -> idle >= 90s -> hint #3 (DHCP concept)
        |                      -> terminal phase -> hint #4 (ping intent)
        |
        |   SHOW_HINT (state.overlay.hints)
        |        |
        |        v
        |   OverlayLayer renders toast -> DISMISS_HINT
--------+--------------------------------------------------------------------
```

```
Step H2 | Hint script (trigger -> text + docs)
        |
        |   Condition: router not placed, idle >= 30s
        |     "Drag the router from inventory to the canvas."
        |     docsUrl: https://www.google.com/search?q=what+is+a+router
        |
        |   Condition: router placed, no PC-1 connection, idle >= 30s
        |     "Connect PC-1 to the router using a cable."
        |     docsUrl: https://www.google.com/search?q=ethernet+cable
        |
        |   Condition: router unconfigured, idle >= 60s
        |     "Open the router settings and enable DHCP."
        |     docsUrl: https://www.google.com/search?q=dhcp+router+configuration
        |
        |   Condition: PCs connected, missing IPs, idle >= 90s
        |     "Choose a private IP range so the router can assign IPs."
        |     docsUrl: https://www.google.com/search?q=private+ip+range
        |
        |   Condition: 2 invalid cable drops
        |     "A cable must connect two placed devices."
        |     docsUrl: https://www.google.com/search?q=ethernet+cable+connection
        |
        |   Condition: 2 invalid router config saves
        |     "Use a private CIDR range like 192.168.1.0/24."
        |     docsUrl: https://www.google.com/search?q=cidr+notation+private+ip+range
        |
        |   Terminal: prompt visible, idle >= 30s
        |     "Use a command that tests reachability between two computers."
        |     docsUrl: https://www.google.com/search?q=ping+command
        |
        |   Terminal: 2 invalid commands
        |     "That reachability test is commonly called ping."
        |     docsUrl: https://www.google.com/search?q=ping+command
        |
        |   Terminal: 3 invalid commands
        |     "Target the other PC or its IP address."
        |     docsUrl: https://www.google.com/search?q=ping+ip+address
--------+--------------------------------------------------------------------
```

### Hint rules (usability guardrails)

```
Rule H2 | Trigger gates
        |
        |   1) Only one hint per phase at a time
        |   2) Hint level increases only on continued inactivity
        |   3) Any meaningful action resets the idle timer
        |        - place item, connect cable, save config, submit command
        |   4) Suppress hints while a modal is open
        |   5) Do not repeat the same hint text in a session
--------+--------------------------------------------------------------------
```

```
Rule H3 | Hint priority (when multiple apply)
        |
        |   if terminal visible -> show terminal hint
        |   else if router unconfigured -> show router hint
        |   else if missing connections -> show connection hint
        |   else -> show placement hint
--------+--------------------------------------------------------------------
```

```
Rule H4 | Accessibility + reliability
        |
        |   - Toast uses aria-live="polite" for screen readers
        |   - Provide dismiss button (keyboard focusable)
        |   - Auto-dismiss after 10s unless user is focused on toast
        |   - Cap total visible hints to 3
--------+--------------------------------------------------------------------
```

### Error handling
- Invalid actions return early with non-blocking error output.
- Reducer remains pure and side-effect free.
- Error messages are descriptive without giving away the solution.

---

## Quality attributes

### Maintainability
- Keep parser, validator, and DHCP logic in isolated, pure functions.
- Reuse shared validators (CIDR, input sanitization) rather than duplicating logic.
- Use typed actions and a single reducer entry point for all state mutations.

### Usability and accessibility
- Ensure keyboard-only interaction paths exist (InventoryPanel, PlayCanvas, TerminalLayout).
- Provide clear focus states and ARIA roles for terminal, modals, and hint toasts.
- Keep error copy short, specific, and non-punitive.

### Performance
- Limit recomputation to reducer actions; avoid per-render derived logic.
- Respect caps from component specs (placed items, connections, history length).
- Lazy-load modal content; avoid heavy DOM updates during drag.

### Scalability
- Drive behavior from CanvasConfig and inventory definitions (data-driven).
- Support multi-canvas in the future by honoring optional canvasId.
- Keep device-type logic extensible (switches, servers, wireless) without rewrites.

### Reliability
- Validate action payloads and sanitize all user-provided data.
- Guard against invalid connection graphs and missing devices.
- Keep transitions deterministic and idempotent for repeated actions.

### Security
- Sanitize terminal input and terminal output before storing in state.
- Validate drag data and config input on receipt, not just on entry.
- Never execute commands; only parse and match against known patterns.
- Avoid dangerouslySetInnerHTML in all output paths.
