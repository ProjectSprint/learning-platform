# DHCP Blueprint

Reference implementation for a behavior-driven networking question. This is the simplest networking question and serves as the canonical example when building new questions.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `networking`
- Title: `Setup your home connection!`
- Description: `Try to connect two of this PC using Router!`
- Learning Objective: Understand how DHCP assigns IP addresses, how routers connect devices, and how to verify connectivity with ping.

---

## Architecture Pattern

This question uses the full behavior-driven architecture:

- `QuestionDefinition` with `phaseRules` for declarative phase transitions
- `BehaviorDefinition` with rules for entity clicks, modal submissions, and terminal commands
- A custom `useNetworkState` hook that computes derived network topology from entity positions and updates entity statuses reactively
- The page component (`-page.tsx`) wires runtime, engines, arrows, terminal, drawer, and hints together

File structure:

- `index.tsx` — Route entry. Wraps `DhcpQuestion` in question navigation logic.
- `-page.tsx` — Main game component. Renders board, drawer, terminal, modal, arrows, hints.
- `-utils/definition.ts` — `DHCP_DEFINITION: QuestionDefinition`. Spaces, entities, phase rules, behaviors reference.
- `-utils/behaviors.ts` — `DHCP_BEHAVIORS: BehaviorDefinition`. Seven rules handling clicks, modals, terminal.
- `-utils/constants.ts` — Static config. Space configs, inventory items, question metadata, terminal prompt.
- `-utils/modal-builders.ts` — Factory functions that build `ModalInstance` objects for router config, PC status, success.
- `-utils/network-utils.ts` — IP validation, range calculation, network topology snapshot builder.
- `-utils/use-network-state.ts` — Reactive hook. Converts entity positions to network topology, updates device statuses via `world.updateEntityState`, manages drag engine lifecycle.
- `-utils/entity-label.ts` — `getNetworkingItemLabel(type)` returns display name for drag overlay.
- `-utils/entity-badge.ts` — `getNetworkingStatusMessage(placedItem)` returns status badge text for grid entities.
- `-utils/get-contextual-hint.ts` — `getContextualHint(state)` returns progressive hint string.

---

## Question Definition

Source: `-utils/definition.ts`

### Spaces

Five grid spaces arranged horizontally to represent a simple LAN topology, plus one pool space for the inventory.

Grid spaces, each 1x1 with maxCapacity 1:

- `pc-1-board` — title "PC-1". Holds one PC entity.
- `connector-left` — title "Connector". Holds one cable entity. Connects PC-1 to router.
- `router-board` — title "Router". Holds one router entity.
- `connector-right` — title "Connector". Holds one cable entity. Connects router to PC-2.
- `pc-2-board` — title "PC-2". Holds one PC entity.

Pool space:

- `inventory` — title "Items". Contains all five entities at start.

All grid spaces use `metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 }`.

### Entities

Five entities, all starting in the `inventory` pool:

| ID | Type | Name | Allowed Places | Icon | Tooltip |
|---|---|---|---|---|---|
| `pc-1` | `pc` | PC-1 | inventory, pc-1-board | twemoji:laptop-computer | none |
| `pc-2` | `pc` | PC-2 | inventory, pc-2-board | twemoji:laptop-computer | none |
| `router-1` | `router` | Router | inventory, router-board | streamline-flex-color:router-wifi-network | "A router connects multiple devices..." with link |
| `cable-1` | `cable` | Cable | inventory, connector-left, connector-right | mdi:ethernet-cable (color #2596be) | "Ethernet cables connect devices..." with link |
| `cable-2` | `cable` | Cable | inventory, connector-left, connector-right | mdi:ethernet-cable (color #2596be) | "Ethernet cables connect devices..." with link |

Entity data: The entity `type` field is stored in `entity.data.type` at bootstrap (convention: `data: { ...item.data, type: item.type }`). This is how behavior rules and display functions distinguish entity types.

The `allowedPlaces` array controls which spaces accept each entity. The engine validates placement against this list. For example, `pc-1` can only go in `inventory` or `pc-1-board`, preventing players from putting both PCs on the same board.

### Phase Rules

Phase rules are evaluated in order. First matching rule wins. Condition keys are `dragStatus` and `questionStatus`.

1. When `questionStatus` equals `"completed"` → set phase to `"completed"`
2. When `dragStatus` equals `"finished"` → set phase to `"terminal"`
3. When `dragStatus` equals `"started"` → set phase to `"playing"`

Initial phase: `"setup"`

Phase progression: `setup` → `playing` (when first entity placed and connected) → `terminal` (when both PCs have IPs) → `completed` (when question marked complete)

The `dragStatus` value comes from `useDragEngine()`. The `useNetworkState` hook controls when `dragEngine.start()` and `dragEngine.finish()` are called:

- `dragEngine.start()` — Called when the router is placed and at least one PC is connected via cable.
- `dragEngine.finish()` — Called when both PCs have been assigned IP addresses (router configured with valid DHCP range).

### Behaviors

Source: `-utils/behaviors.ts`

Context type: `{ lastConfiguredDeviceId: string | null; navigateAway: boolean }`

Initial context: `{ lastConfiguredDeviceId: null, navigateAway: false }`

---

## Behavior Rules

Seven rules, evaluated in order (first match wins per event):

### Rule 1: `dhcp.router-click`

- Trigger: `entityClicked("router")` — fires when a router entity is clicked on a grid space.
- Guard: none
- Handler: Opens the router config modal. Calls `interaction.openModal(buildRouterConfigModal(entity.id, entity.data))`.
- Purpose: Lets the player configure DHCP settings on the router.

### Rule 2: `dhcp.pc-click`

- Trigger: `entityClicked("pc")` — fires when a PC entity is clicked.
- Guard: none
- Handler: Opens the PC config modal (read-only IP display). Reads the IP from `state.entities[entity.id].state.ip` (set by useNetworkState), falling back to `entity.data.ip`.
- Purpose: Shows the player what IP address the PC has been assigned.

### Rule 3: `dhcp.router-config-save`

- Trigger: `modalSubmitted(undefined, "save")` — fires when any modal's "save" action is clicked.
- Guard: `event.modalId.startsWith("router-config-")` — only matches router config modals.
- Handler: Extracts `dhcpEnabled`, `startIp`, `endIp` from `event.values`. Calls `world.updateEntity(deviceId, { data: { dhcpEnabled, startIp, endIp } })`. Also updates behavior context: `ctx.lastConfiguredDeviceId = deviceId`.
- Purpose: Persists router configuration into entity data. The `useNetworkState` hook reacts to these changes and auto-assigns IPs to connected PCs.

### Rule 4: `dhcp.success-modal-navigate`

- Trigger: `modalSubmitted("success", "primary")` — fires when the success modal's primary button is clicked.
- Guard: none
- Handler: Sets `ctx.navigateAway = true`. The page watches `behaviorContext.navigateAway` via useEffect and calls `onQuestionComplete()`.
- Purpose: Navigates to the next question after the player acknowledges success.

### Rule 5: `dhcp.terminal-command`

- Trigger: `terminalInput()` — fires on any terminal input.
- Guard: `phase === "terminal" && state.question.status !== "completed"` — only active during terminal phase, before question is completed.
- Handler: Parses the input string. Supports two commands:
  - `help` — Writes a help page to the terminal showing available commands (ping, help) with examples.
  - `ping <ip>` — Checks if the target IP matches PC-2's assigned IP. If yes: writes success reply, opens success modal, calls `terminal.finishEngine()` and `progress.completeQuestion()`. If no: writes error.
  - Any other command: writes "Unknown command" error.
- Purpose: Terminal verification phase. Player must ping PC-2's IP to prove connectivity.

### Rule 6: `dhcp.terminal-not-ready`

- Trigger: `terminalInput()` — fires on any terminal input.
- Guard: `phase !== "terminal"` — only matches when NOT in terminal phase.
- Handler: Writes "Terminal is not ready yet" error.
- Purpose: Catch-all for terminal input outside the terminal phase.

Note: Rules 5 and 6 together cover all terminal input. Rule 5 catches input during terminal phase, rule 6 catches everything else. Since rule 5 is listed first and has the terminal phase guard, it takes priority during terminal phase.

---

## Modals

Source: `-utils/modal-builders.ts`

### Router Config Modal

- ID: `router-config-{deviceId}` (e.g. `router-config-router-1`)
- Title: "Router configuration"
- Content: Three fields:
  1. `dhcpEnabled` — checkbox, label "Enable DHCP", default from current entity data. Has helpLink "What is DHCP?" pointing to Google search.
  2. `startIp` — text input, label "Start IP", placeholder "192.168.1.100", default from current entity data. Validated: must be valid IPv4, each octet 0-255, must be in private IP range (10.x, 172.16-31.x, 192.168.x).
  3. `endIp` — text input, label "End IP", placeholder "192.168.1.200", default from current entity data. Validated: same as startIp plus must be greater than startIp and range must have at least 2 addresses.
- Actions:
  - `cancel` — label "Cancel", variant "ghost", closesModal true, validate false
  - `save` — label "Save", variant "primary" (default validate true, modal stays open for behavior rule to process)

When the "save" action is clicked, the modal system emits a `MODAL_SUBMITTED` event with `modalId`, `modalActionId: "save"`, and `values: { dhcpEnabled, startIp, endIp }`. The `dhcp.router-config-save` behavior rule picks this up.

### PC Config Modal

- ID: `pc-config-{deviceId}` (e.g. `pc-config-pc-1`)
- Title: "PC configuration"
- Content: One readonly field:
  1. `ip` — readonly, label "IP Address", value is the current IP or "Not assigned"
- Actions:
  - `close` — label "Close", variant "primary", closesModal true, validate false

### Success Modal

- ID: `success`
- Title: "Question complete" (passed as argument)
- Content: One text block: "You connected two computers and verified their connection using ping."
- Actions:
  - `primary` — label "Next question", variant "primary", closesModal true, validate false

---

## Entity Display

### Entity Labels

Source: `-utils/entity-label.ts`

Used by `DragOverlay` to show the entity name during drag. Mapping:

- `pc` → "PC"
- `router` → "Router"
- `cable` → "Cable"
- Default → Capitalize first letter of type

### Entity Status Badges

Source: `-utils/entity-badge.ts`

Used by `GridSpace` via `getEntityStatus` prop to show status messages under entities. The function receives a `SpaceItemLocation` (entity data with placement info) and returns `string | null`.

- Router: `"needs configuration"` when status is warning or error; `"configured"` when status is success; null otherwise.
- PC: Shows the IP address string when available; `"no ip"` when status is warning; null otherwise.
- Cable: Always null (no status messages).

The `status` field on entities is set by the `useNetworkState` hook, not by behavior rules.

---

## Contextual Hints

Source: `-utils/get-contextual-hint.ts`

The hint function receives the full network state and returns a string. Hints are progressive and include both guidance and error correction.

Error hints (checked first, take priority):

- More than 2 PCs placed → "Only 2 PCs needed - remove the extra one"
- More than 1 router placed → "Only 1 router needed - remove the extra one"
- PC-to-PC cable connection → "PCs can't connect directly - connect them to the router instead"
- Router-to-router cable → "Both cable ends are on the router - connect one end to a PC"
- Duplicate cable on one PC → "This PC already has a cable - connect the other PC instead"
- Invalid IP in router settings (when modal open) → specific IP validation errors

Progress hints (in order of game progression):

1. Nothing placed → "Drag a PC from inventory to any slot to start"
2. 1 PC, no router → "Add the second PC to another slot"
3. 2 PCs, no router → "Place the router in the middle slot to connect both PCs"
4. Router + 2 PCs, no cables → "Connect PC-1 to the router using a cable"
5. 1 cable connected → "Connect [other PC] to the router with the second cable"
6. 2 cables connected, router not configured → "Physically connected but not working! Click the router to configure DHCP"
7. Router settings open, DHCP not enabled → "Enable DHCP so the router can assign IP addresses"
8. DHCP enabled, no start IP → "Set the start IP address (e.g., 192.168.1.100)"
9. Start IP set, no end IP → "Set the end IP address (e.g., 192.168.1.200)"
10. Both IPs set, not saved → "Click 'Save' to activate DHCP"
11. Both PCs have IPs → "Network configured! Both PCs can now communicate"

---

## State Management

Source: `-utils/use-network-state.ts`

This hook is the brain of the DHCP question. It runs as a React hook inside the page component and provides derived network state.

What it does:

1. Reads all grid spaces from `state.spaces` and converts entities into a `BoardPlacements` map (spaceId → array of SpaceItemLocation).
2. Builds a `NetworkSnapshot` by analyzing which entities are placed where, identifying the router, PCs, cables, and deriving cable connections (a cable in connector-left with a PC in pc-1-board means PC-1 is connected to the router).
3. Computes derived state: `routerConfigured`, `pc1Connected`, `pc2Connected`, `pc1HasIp`, `pc2HasIp`, etc.
4. In a useEffect, updates entity statuses reactively:
   - Router: `"success"` when configured, `"error"` otherwise.
   - Cables: `"success"` when properly connecting a PC to router, `"warning"` otherwise.
   - PCs: Assigns IP addresses based on DHCP range when connected to a configured router. Sets `"success"` status when IP assigned, `"warning"` otherwise.
5. In another useEffect, manages drag engine lifecycle:
   - `dragEngine.start()` when router is placed and at least one PC is connected.
   - `dragEngine.finish()` when both PCs have IPs.

Important: The state updates here use `world.updateEntityState()` which emits events. These events are processed by the behavior reactor in the next render cycle, but since no behavior rules match `ENTITY_UPDATED` events in this question, they just flow through harmlessly.

---

## Terminal Commands

Available during the `terminal` phase only (after both PCs have IPs).

Terminal prompt: "How can you check that PC-1 is connected to PC-2?"

Intro entries shown when terminal opens:
- "Available commands:"
- "- ping <pc-2-ip>"

Commands:

- `help` — Displays formatted help page with synopsis, commands, description, and examples. The example ping target uses the actual PC-2 IP from game state.
- `ping <ip>` — If `<ip>` matches PC-2's assigned IP: prints success reply, opens success modal, finishes terminal engine, completes question. If IP doesn't match: prints "Unknown target" error. If no target given: prints "Missing target" error.
- Anything else → "Unknown command" error.

Completion trigger: `ping <correct-pc-2-ip>` succeeds.

---

## Page Layout

Source: `-page.tsx`

The page component structure:

1. `GameProvider` wraps everything.
2. Inside: `NetworkingGame` component with:
   - `useQuestionRuntime("dhcp-page", DHCP_DEFINITION)` — bootstraps game state, activates behavior reactor.
   - `useGameCtx()` — gets game context for GridSpace/PoolSpace.
   - `useDragEngine()` — tracks drag progress for phase rules.
   - `useTerminalEngine({})` — provides terminal engine lifecycle. `registerTerminalFinish.current = terminalEngine.finish` wires it to the behavior system.
   - `useNetworkState({ dragEngine, world })` — computes derived network state and auto-updates entity statuses.
   - `useDrawerManager()` — registers inventory drawer.

Layout:

- Title and description text at top.
- `GameBoard` containing:
  - Five `GridSpace` components in a horizontal `Flex` with arrows between them.
  - `ContextualHint` component.
  - `DragOverlay` with `getEntityLabel={getNetworkingItemLabel}`.
  - `DrawerLayout` with `PoolSpace` for inventory.
- `TerminalLayout` below the board (visible only during terminal phase).
- `Modal` component at the end.

Arrows: Five arrows connecting adjacent spaces (pc-1 → connector-left → router → connector-right → pc-2), with responsive anchors.

Phase transitions are handled by a useEffect that calls `resolvePhase(DHCP_DEFINITION.phaseRules, context, state.phase, "setup")` and requests phase transitions via `interactionSession.requestPhaseTransition()`.

Navigation: The page watches `behaviorContext.navigateAway` and calls `onQuestionComplete()` when it becomes true.

---

## Game Flow

Step-by-step player experience:

1. Player sees 5 empty grid spaces and an inventory drawer with 5 items (PC-1, PC-2, Router, 2 Cables).
2. Player drags PC-1 to pc-1-board, PC-2 to pc-2-board, Router to router-board.
3. Player drags cables to connector-left and connector-right. The `useNetworkState` hook detects connections and updates cable/router statuses.
4. Hint says "Click the router to configure DHCP". Player clicks router → router config modal opens.
5. Player enables DHCP, enters start IP (e.g. 192.168.1.100) and end IP (e.g. 192.168.1.200). Clicks Save.
6. Behavior rule `dhcp.router-config-save` updates router entity data. `useNetworkState` reacts: assigns IPs to both PCs, updates all statuses to success.
7. `dragEngine.finish()` is called → phase transitions to `terminal`.
8. Terminal appears. Player types `ping 192.168.1.100` (PC-2's IP).
9. Behavior rule `dhcp.terminal-command` validates the ping target, prints success reply, opens success modal, completes question.
10. Player clicks "Next question" in success modal → `dhcp.success-modal-navigate` sets `navigateAway = true` → page calls `onQuestionComplete()`.

---

## Educational Content

This question teaches:
- Physical network topology: PCs connect to routers via cables
- DHCP: Routers assign IP addresses automatically within a configured range
- Private IP addresses: Must use private ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Connectivity verification: Using ping to test network connectivity
- IP addressing: Each device needs a unique IP to communicate
