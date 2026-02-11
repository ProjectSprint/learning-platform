# Internet Gateway Blueprint

Reference implementation for a behavior-driven networking question with multiple configurable entities, network validation logic, and responsive board arrows.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `internet-gateway`
- Title: `Connect to the Internet!`
- Description: `Now you can setup a router, but you can't reach Google yet. Connect to your ISP and configure the router to access the internet!`
- Learning Objective: Understand the full chain from home network to internet: Router LAN (DHCP + DNS), Router NAT (address translation), Router WAN (PPPoE ISP authentication), Internet Gateway, DNS resolution, and end-to-end connectivity verification.

---

## Architecture Pattern

This question uses the full behavior-driven architecture:

- `QuestionDefinition` with spaces, entities, phaseRules, and behaviors
- `useQuestionRuntime` for bootstrap and behavior reactor
- `BehaviorDefinition` with 14 rules handling entity clicks, modal saves, terminal commands, and navigation
- Custom `useInternetState` hook for derived state (placement tracking, configuration validation)
- `resolvePhase` for declarative phase transitions based on drag status, all-devices-placed, and question status
- Board arrows connecting spaces visually

---

## File Structure

All files live under `src/routes/questions/networking/internet/`:

- `index.tsx` — Route definition. Wraps `InternetQuestion` with navigation handler.
- `-page.tsx` — Main page component. Sets up `GameProvider`, `useQuestionRuntime`, phase resolution, terminal, arrows, contextual hints, and renders the board layout.
- `-utils/constants.ts` — Static configuration: question metadata, space configs, inventory items, IP validation ranges, PPPoE credentials, DNS servers, Google IP.
- `-utils/definition.ts` — `INTERNET_DEFINITION`: QuestionDefinition with 3 condition keys (`questionStatus`, `dragStatus`, `allDevicesPlaced`) and 4 phase rules.
- `-utils/behaviors.ts` — `INTERNET_BEHAVIORS`: 14 behavior rules (7 entity clicks, 3 modal saves, 1 success navigation, 2 terminal commands).
- `-utils/modal-builders.ts` — 8 modal builder functions for router LAN/NAT/WAN configs, PC/IGW/DNS/Google status views, and success.
- `-utils/network-utils.ts` — IP validation utilities: `isValidIp`, `isPrivateIp`, `isPublicIp`, `parseIpToNumber`, `validateIpRange`, `buildInternetNetworkSnapshot`.
- `-utils/use-internet-state.ts` — Custom hook computing derived state from entity placement and configuration.
- `-utils/entity-label.ts` — `getInternetItemLabel(type)`: maps entity type to display name.
- `-utils/entity-badge.ts` — `getInternetStatusMessage(item)`: maps entity to status badge text.
- `-utils/get-contextual-hint.ts` — `getContextualHint(state)`: returns hint string based on current progress.

---

## Question Definition

### Spaces

7 grid spaces plus 1 pool, representing a home-to-internet topology:

1. `local` (Client) — 1x1, maxCapacity 1. Holds the PC.
2. `conn-1` (Connector) — 1x1, maxCapacity 1. Holds the Ethernet cable connecting PC to router.
3. `router` (Router) — 1x3, maxCapacity 3. Holds Router LAN, Router NAT, and Router WAN side-by-side.
4. `conn-2` (Connector) — 1x1, maxCapacity 1. Holds the Fiber cable connecting router to ISP.
5. `igw` (Gateway) — 1x1, maxCapacity 1. Holds the Internet Gateway (modem).
6. `dns` (DNS Server) — 1x1, maxCapacity 1. Holds the DNS server.
7. `google` (Google) — 1x1, maxCapacity 1. Holds the Google server (the destination).
8. `inventory` (pool) — Holds all 9 items initially.

### Entities

9 draggable inventory items, all starting in the `inventory` pool:

1. `cable-1` (type: `cable`) — "Ethernet Cable". Allowed in `inventory` and `conn-1`.
2. `fiber-1` (type: `fiber`) — "Fiber Cable". Allowed in `inventory` and `conn-2`.
3. `pc-1` (type: `pc`) — "PC". Allowed in `inventory` and `local`.
4. `router-lan-1` (type: `router-lan`) — "Router (LAN)". Allowed in `inventory` and `router`.
5. `router-nat-1` (type: `router-nat`) — "Router (NAT)". Allowed in `inventory` and `router`.
6. `router-wan-1` (type: `router-wan`) — "Router (WAN)". Allowed in `inventory` and `router`.
7. `igw-1` (type: `igw`) — "Internet Gateway". Allowed in `inventory` and `igw`.
8. `dns-1` (type: `dns`) — "DNS Server". Allowed in `inventory` and `dns`.
9. `google-1` (type: `google`) — "Google". Allowed in `inventory` and `google`.

Each entity has a tooltip with educational content and a "See more" link.

### Phase Rules

4 declarative phase rules evaluated in order via `resolvePhase`. The definition uses 3 condition keys:

- `allDevicesPlaced` — boolean, true when all 9 entities are placed in their target spaces. Computed by `useInternetState`.
- `dragStatus` — from `useDragEngine().progress.status`: "pending", "started", or "finished".
- `questionStatus` — from `state.question.status`: "in_progress" or "completed".

Rules (evaluated top to bottom, first match wins):

1. When `allDevicesPlaced === true` → phase `configuring`. This triggers once all 9 items are placed correctly.
2. When `dragStatus === "started"` → phase `playing`. Activates as soon as the user starts dragging items.
3. When `dragStatus === "finished"` → phase `terminal`. Reached after drag engine considers placement finished.
4. When `questionStatus === "completed"` → phase `completed`.

The phase resolution runs in a useEffect on the page, calling `interactionSession.requestPhaseTransition()` when the resolved phase differs from the current phase. The initial phase is `setup`.

---

## Behavior Rules

14 rules in total, defined in `behaviors.ts`. The behavior context type is:

```
type InternetBehaviorContext = {
  navigateAway: boolean;
};
```

Initial context: `{ navigateAway: false }`.

### Entity Click Rules (7 rules)

All entity click rules open status/config modals when the user clicks on placed entities.

Rule `internet.router-lan-click`:
- Trigger: `entityClicked("router-lan")`
- No guard.
- Handler: Opens the Router LAN Configuration modal (`buildRouterLanConfigModal`) pre-populated with current entity data. This modal allows configuring DHCP, start/end IP range, and DNS server.

Rule `internet.router-nat-click`:
- Trigger: `entityClicked("router-nat")`
- No guard.
- Handler: Opens the Router NAT Configuration modal (`buildRouterNatConfigModal`). This modal has an explanatory text about NAT and a single checkbox to enable/disable NAT.

Rule `internet.router-wan-click`:
- Trigger: `entityClicked("router-wan")`
- No guard.
- Handler: Opens the Router WAN Configuration modal (`buildRouterWanConfigModal`). This modal collects PPPoE username and password for ISP authentication.

Rule `internet.pc-click`:
- Trigger: `entityClicked("pc")`
- No guard.
- Handler: Opens a read-only PC Status modal (`buildPcStatusModal`) showing the PC's assigned IP and connectivity status. Uses `deriveStatus(state)` to determine if google is reachable.

Rule `internet.igw-click`:
- Trigger: `entityClicked("igw")`
- No guard.
- Handler: Opens a read-only IGW Status modal showing whether PPPoE authentication succeeded.

Rule `internet.dns-click`:
- Trigger: `entityClicked("dns")`
- No guard.
- Handler: Opens a read-only DNS Status modal showing the configured DNS server IP and whether it's active.

Rule `internet.google-click`:
- Trigger: `entityClicked("google")`
- No guard.
- Handler: Opens a Google Status modal showing domain, IP (if resolvable), reachability status, and a reason string if unreachable. Reasons: "DNS not configured", "NAT disabled", or "WAN not connected".

### Modal Save Rules (3 rules)

All modal save rules use the same trigger pattern: `modalSubmitted(undefined, "save")` with a guard that checks the modal ID prefix.

Rule `internet.router-lan-save`:
- Trigger: `modalSubmitted(undefined, "save")`
- Guard: `event.modalId.startsWith("router-lan-config-")`
- Handler: Extracts the device ID from the modal ID, then calls `world.updateEntity(deviceId, { data: { dhcpEnabled, startIp, endIp, dnsServer } })` with values from the modal form.

Rule `internet.router-nat-save`:
- Trigger: `modalSubmitted(undefined, "save")`
- Guard: `event.modalId.startsWith("router-nat-config-")`
- Handler: Calls `world.updateEntity(deviceId, { data: { natEnabled } })`.

Rule `internet.router-wan-save`:
- Trigger: `modalSubmitted(undefined, "save")`
- Guard: `event.modalId.startsWith("router-wan-config-")`
- Handler: Calls `world.updateEntity(deviceId, { data: { username, password } })`.

### Success Navigation Rule

Rule `internet.success-modal-navigate`:
- Trigger: `modalSubmitted("success", "primary")`
- No guard.
- Handler: Sets `context.navigateAway = true` via `updateContext`. The page watches `behaviorContext.navigateAway` in a useEffect and calls `onQuestionComplete()`.

### Terminal Command Rules (2 rules)

Rule `internet.terminal-command`:
- Trigger: `terminalInput()`
- Guard: `phase === "terminal" && state.question.status !== "completed"`. Only processes commands during terminal phase and before completion.
- Handler: Parses the input into command and arguments. Uses `deriveStatus(state)` to check current network configuration. Supports these commands:

  `help` — Prints a man-page-style help output with synopsis, commands section, and examples. Lists: ifconfig, nslookup [domain], curl [hostname or IP], help.

  `ifconfig` — Displays the PC's assigned IP via `status.pcIp`. Shows either `eth0: <ip>` or `eth0: No IP assigned`.

  `nslookup <domain>` — Requires DNS server to be configured (checks `status.hasValidDnsServer`). If DNS not configured, outputs error. If domain is `google.com`, resolves to `142.250.80.46` (the hardcoded `GOOGLE_IP`). Any other domain returns "Unknown host".

  `curl <hostname or IP>` — The success command. Validates the target is either `google.com` or `142.250.80.46`. Then checks in order: WAN connected (PPPoE valid), NAT enabled, and (for domain targets) DNS configured. Each failure produces a specific error message. On success, outputs the HTTP response and opens the success modal, finishes the terminal engine, and completes the question.

  Any other command produces: `Error: Unknown command. Type "help" for available commands.`

Rule `internet.terminal-not-ready`:
- Trigger: `terminalInput()`
- Guard: `phase !== "terminal"`. Catches terminal input before the terminal phase.
- Handler: Writes `Error: Terminal is not ready yet.`

---

## Modals

### Router LAN Configuration Modal

- ID pattern: `router-lan-config-{deviceId}`
- Title: "Router LAN Configuration"
- Fields:
  1. `dhcpEnabled` — checkbox, label "Enable DHCP", has helpLink "What is DHCP?"
  2. `startIp` — text, placeholder "192.168.1.100", validated with `validatePrivateIp` (must be valid IP format AND a private IP)
  3. `endIp` — text, placeholder "192.168.1.200", validated with `validateEndIp` (must be valid private IP AND greater than startIp with range of at least 2)
  4. `dnsServer` — text, placeholder "8.8.8.8", validated with `validateDnsServer` (must be a valid IP AND one of the known public DNS servers: 8.8.8.8, 8.8.4.4, 1.1.1.1, 1.0.0.1, 208.67.222.222), has helpLink "What is DNS?"
- Actions: Cancel (ghost, closes modal, no validation), Save (primary, triggers validation)
- All fields pre-populate with current entity data values.

### Router NAT Configuration Modal

- ID pattern: `router-nat-config-{deviceId}`
- Title: "Router NAT Configuration"
- Content: Explanatory text about NAT, then a single field.
- Fields:
  1. `natEnabled` — checkbox, label "Enable NAT", has helpLink "What is NAT?"
- Actions: Cancel (ghost), Save (primary)

### Router WAN Configuration Modal

- ID pattern: `router-wan-config-{deviceId}`
- Title: "Router WAN Configuration"
- Content: Instructional text telling the user to enter ISP credentials using the placeholder values.
- Fields:
  1. `username` — text, placeholder "user@telkom.net", validated conditionally (required when connection type is pppoe)
  2. `password` — text, placeholder "indihome123", validated conditionally
- Actions: Cancel (ghost), Save (primary)
- The correct credentials are: username `user@telkom.net`, password `indihome123`.

### PC Status Modal (read-only)

- ID pattern: `pc-status-{deviceId}`
- Title: "PC Status"
- Fields: `ip` (readonly, shows assigned private IP or "Not assigned"), `status` (readonly, "Connected to internet" or "Waiting for connection")
- Actions: Close (primary, closes modal)

### IGW Status Modal (read-only)

- ID pattern: `igw-status-{deviceId}`
- Title: "Internet Gateway Status"
- Fields: `status` (readonly, "Authenticated" or "Waiting for authentication")
- Actions: Close

### DNS Status Modal (read-only)

- ID pattern: `dns-status-{deviceId}`
- Title: "DNS Server Status"
- Fields: `ip` (readonly), `status` (readonly, "Active" or "Unreachable")
- Actions: Close

### Google Status Modal (read-only)

- ID pattern: `google-status-{deviceId}`
- Title: "Google Server Status"
- Fields: `domain` (readonly, "google.com"), `ip` (readonly, resolved IP or "Can't resolve"), `status` (readonly, "Reachable" or "Unreachable"), `reason` (readonly, only shown when unreachable — e.g. "DNS not configured", "NAT disabled", "WAN not connected")
- Actions: Close

### Success Modal

- ID: `success`
- Title: "Connected to the Internet!"
- Content: Congratulations message summarizing what was learned: Router LAN + DHCP, Router WAN + PPPoE, Router NAT, DNS resolution, and the full request path (PC → Router LAN → Router NAT → Router WAN → IGW → Internet → Google).
- Actions: "Next question" (primary, closes modal)

---

## Derived Status Function

The `deriveStatus(state)` function in behaviors.ts computes the full network connectivity status from entity data:

- Finds router-lan, router-nat, router-wan entities from `state.entities`
- Checks LAN config: dhcpEnabled, startIp/endIp are valid private IPs, dnsServer is a known public DNS
- Checks NAT: natEnabled boolean
- Checks WAN: username/password match the valid PPPoE credentials
- Computes `googleReachable`: true only when ALL of dhcpEnabled, hasValidIpRange, hasValidDnsServer, natEnabled, and hasValidPppoeCredentials are true
- Returns: `{ pcIp, dnsServer, hasValidDnsServer, natEnabled, hasValidPppoeCredentials, wanConnected, googleReachable, googleIp }`

---

## Entity Display

### Labels (`entity-label.ts`)

Maps entity type strings to human-readable labels for the board UI. For example: `router-lan` → "Router (LAN)", `cable` → "Ethernet Cable", `igw` → "Internet Gateway", `dns` → "DNS Server", `google` → "Google".

### Status Badges (`entity-badge.ts`)

Computes status message strings for placed entities. Status depends on entity type and current configuration state. The status badge appears below the entity on the grid space.

### Clickable Entities

All 7 core entity types are clickable: `router-lan`, `router-nat`, `router-wan`, `pc`, `igw`, `dns`, `google`. Cable and fiber entities are NOT clickable.

---

## Board Arrows

6 SVG arrows connect the 7 spaces in a chain: local → conn-1 → router → conn-2 → igw → dns → google. Arrows use responsive anchors (different anchor points at different breakpoints). All arrows have the same style: light blue stroke (rgba(56, 189, 248, 0.85)), strokeWidth 2, headSize 12, bow varies by breakpoint (0.06 on mobile, 0.02 on desktop). Arrows are cleared when the question is completed.

---

## Contextual Hints

The `getContextualHint` function produces progress-aware hint messages based on current state. It accepts a large state object including: which devices are placed, whether all are placed, whether router configs are open/configured, individual field states (DHCP, DNS, NAT, PPPoE), PC IP status, and Google reachability. Hints guide the user progressively through the task.

---

## Page Layout

The page uses a responsive layout with 4 layout modes based on breakpoint:

- `row` (xl): All 7 spaces in a single row
- `structured-lg` (lg): Two rows — first row has local, conn-1, router; second row has conn-2, igw, dns, google
- `structured` (base-md): Two groups — local + conn-1 on first row, router alone, then conn-2 + igw + dns + google on last row
- Default fallback: vertical stack

Below the board: ContextualHint, DragOverlay, DrawerLayout (with PoolSpace for inventory), and TerminalLayout.

---

## Game Flow

1. Setup phase: User sees 7 empty grid spaces connected by arrows. All 9 items are in the inventory drawer.
2. Playing phase: User drags items from inventory to their target spaces. Each item can only go to its allowed space(s). The drag engine tracks progress.
3. Configuring phase: When all 9 items are placed, phase transitions to `configuring`. User clicks on router-lan, router-nat, and router-wan to configure them via modals. Other entities (PC, IGW, DNS, Google) show read-only status.
4. Terminal phase: Once configurations are complete and the drag engine finishes, phase becomes `terminal`. Terminal opens automatically with available commands.
5. Success: A successful `curl google.com` or `curl 142.250.80.46` opens the success modal, finishes the terminal engine, and marks the question complete. Clicking "Next question" sets `navigateAway = true`, triggering navigation.

---

## Educational Content

Concepts taught through this question:
- DHCP: Automatic IP assignment to devices on a local network (Router LAN config)
- DNS: Translating domain names to IP addresses (Router LAN config + nslookup command)
- NAT: Network Address Translation allowing private IPs to share a public IP (Router NAT config)
- PPPoE: Point-to-Point Protocol over Ethernet for ISP authentication (Router WAN config)
- Internet Gateway/Modem: Bridge between home network and ISP
- Full request path: PC → Router LAN → Router NAT → Router WAN → IGW → DNS → Google
- Network diagnostics: ifconfig, nslookup, curl commands

Each entity has a tooltip with a brief explanation and a "See more" link for deeper learning.
