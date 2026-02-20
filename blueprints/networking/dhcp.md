# DHCP Home Networking Blueprint

Declaration-first blueprint for `networking` (DHCP question).
This document is the canonical source of truth for authoring and maintaining this question.

Canonical engine references:
- `src/components/game/doc/README.md`
- `src/components/game/doc/question-definition.md`
- `src/components/game/doc/runtime-api.md`
- `src/components/game/doc/behavior-system.md`
- `src/components/game/doc/components.md`

---

## 0) Reading Protocol

### 0.1 Purpose

Use this blueprint as the canonical source of truth for DHCP question behavior.
Use game docs for runtime API details.

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
- Add new terms before logic references.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value |
|---|---|
| `QUESTION_ID` | `networking` |
| `QUESTION_TITLE` | `🏡 Setup your home connection!` |
| `QUESTION_DESCRIPTION` | `Try to connect two of this PC using Router!` |

### 1.2 Architecture Terms

| Term ID | Value | Meaning |
|---|---|---|
| `STYLE_DECLARATIVE_BEHAVIOR_DRIVEN` | `true` | Uses definition + behaviors + derived state hook |
| `HAS_PHASE_RULES` | `true` | Phase resolved from condition context |
| `PHASE_RULE_EVAL_MODE` | `last-match-wins` | Later matching rules override earlier rules |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Grid Size |
|---|---|---|---|
| `SPACE_PC_1` | `pc-1-board` | `grid` | 1×1 |
| `SPACE_CONN_LEFT` | `connector-left` | `grid` | 1×1 |
| `SPACE_ROUTER` | `router-board` | `grid` | 1×1 |
| `SPACE_CONN_RIGHT` | `connector-right` | `grid` | 1×1 |
| `SPACE_PC_2` | `pc-2-board` | `grid` | 1×1 |
| `SPACE_INVENTORY` | `inventory` | `pool` | — |

### 1.4 Entity Terms

| Term ID | Entity ID | Type |
|---|---|---|
| `ENTITY_PC_1` | `pc-1` | `pc` |
| `ENTITY_PC_2` | `pc-2` | `pc` |
| `ENTITY_ROUTER` | `router-1` | `router` |
| `ENTITY_CABLE_1` | `cable-1` | `cable` |
| `ENTITY_CABLE_2` | `cable-2` | `cable` |

All 5 entities start in `SPACE_INVENTORY`.

### 1.5 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_PLAYING` | `playing` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

### 1.6 Condition Context Terms

| Term ID | Source | Meaning |
|---|---|---|
| `CTX_DRAG_STATUS` | `dragEngine.progress.status` | Current drag engine progress value |
| `CTX_QUESTION_STATUS` | `state.question.status` | Engine-level question completion |

### 1.7 Behavior Context Fields

These fields live on `ctx` (mutable context bag) in behavior rules:

| Field | Type | Set By | Meaning |
|---|---|---|---|
| `ctx.navigateAway` | `boolean` | `RULE_SUCCESS_NAV` | Signals page to navigate to next question |
| `ctx.lastConfiguredDeviceId` | `string` | `RULE_ROUTER_SAVE` | ID of router entity most recently saved |

### 1.8 Behavior Rule Terms

| Term ID | Behavior Rule ID | Trigger |
|---|---|---|
| `RULE_ROUTER_CLICK` | `dhcp.router-click` | entity click on `router` type |
| `RULE_PC_CLICK` | `dhcp.pc-click` | entity click on `pc` type |
| `RULE_ROUTER_SAVE` | `dhcp.router-config-save` | modal submit on `router-config-*` with `save` action |
| `RULE_SUCCESS_NAV` | `dhcp.success-modal-navigate` | modal submit on `success` with `primary` action |
| `RULE_TERMINAL_ONBOARDING` | `dhcp.terminal-onboarding` | `PHASE_CHANGED` event to `terminal`, fires once |
| `RULE_TERMINAL_COMMAND` | `dhcp.terminal-command` | terminal input event |
| `RULE_TERMINAL_NOT_READY` | `dhcp.terminal-not-ready` | terminal input event (fallback guard) |

### 1.9 Modal Terms

| Term ID | Modal ID Pattern | Actions | Fields |
|---|---|---|---|
| `MODAL_ROUTER_CONFIG` | `router-config-{deviceId}` | `cancel`, `save` | `dhcpEnabled` (checkbox), `startIp` (text), `endIp` (text) |
| `MODAL_PC_CONFIG` | `pc-config-{deviceId}` | `close` | `ip` (readonly) |
| `MODAL_SUCCESS` | `success` | `primary` | educational content |

### 1.10 Validation Terms

| Term ID | Meaning |
|---|---|
| `VALID_PRIVATE_IP_RANGE` | `startIp` and `endIp` must be valid private IPv4 addresses |
| `VALID_RANGE_MIN_SIZE` | `endIp` must be strictly greater than `startIp` and provide at least 2 addresses |

### 1.11 Terminal Terms

| Term ID | Value |
|---|---|
| `TERMINAL_PROMPT` | `"How can you check that PC-1 is connected to PC-2?"` |
| `TERMINAL_COMMAND_HELP` | `help` |
| `TERMINAL_COMMAND_PING` | `ping <ip>` |
| `TERMINAL_SUCCESS_TARGET` | Current `pc-2` assigned IP address |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase is `PHASE_SETUP`.

### 2.2 Space and Entity Declaration

- Declare all spaces in Section 1.3.
- All entities in Section 1.4 start in `SPACE_INVENTORY`.
- Allowed-place constraints remain fixed to prevent invalid placements.

### 2.3 Phase Rule Declaration

Phase rules (declared order, evaluated `last-match-wins`):

1. `CTX_QUESTION_STATUS == completed` → `PHASE_COMPLETED`
2. `CTX_DRAG_STATUS == finished` → `PHASE_TERMINAL`
3. `CTX_DRAG_STATUS == started` → `PHASE_PLAYING`

Because evaluation is `last-match-wins`, rule 3 (`playing`) wins over rule 1 (`completed`) when drag status is `started` but question is also complete — however rule 1 wins whenever `questionStatus` is `completed` **and** drag status is not `started`. In practice, the question is completed only during terminal phase when drag is `finished`, so rule 1 supersedes rule 2 after completion.

Effective phase resolution priority (highest to lowest): playing > terminal > completed (when drag started).

### 2.4 Derived State Declaration

Derived in `useNetworkState` hook (`-utils/use-network-state.ts`):

| Derived Field | Meaning |
|---|---|
| `routerConfigured` | DHCP enabled + IP range passes `VALID_PRIVATE_IP_RANGE` and `VALID_RANGE_MIN_SIZE` |
| `pc1HasIp` | PC-1 entity has a non-empty IP assigned |
| `pc2HasIp` | PC-2 entity has a non-empty IP assigned |
| `pc2Ip` | Current IP string assigned to PC-2 |
| `connectedPcIds` | Entity IDs of PCs with a cable connecting them to the router |

IP assignment happens as a side effect of the hook whenever `routerConfigured` is true and a PC is connected:
- Connected PCs are sorted by entity ID alphabetically.
- IPs are assigned sequentially starting from `startIp` (last octet incremented per PC index).
- IP is written to `entity.state.ip` for each connected PC.

Entity statuses written by hook:
- router: `"success"` when configured, `"error"` otherwise
- cables: `"success"` when properly connected, `"warning"` otherwise
- PCs: `"success"` when IP assigned, `"warning"` otherwise

### 2.5 Drag Engine Declaration

- **Start** drag progress: when router entity exists in `SPACE_ROUTER` and at least one PC is connected via cable.
- **Finish** drag progress: when router entity exists and both `pc1HasIp && pc2HasIp` are true.

### 2.6 Behavior Declaration

- `RULE_ROUTER_CLICK` opens `MODAL_ROUTER_CONFIG`.
- `RULE_PC_CLICK` reads `entity.state.ip` and merges into modal data, opens `MODAL_PC_CONFIG` (readonly).
- `RULE_ROUTER_SAVE` parses modal submission, writes `dhcpEnabled`, `startIp`, `endIp` to entity data, sets `ctx.lastConfiguredDeviceId`.
- `RULE_TERMINAL_ONBOARDING` fires once when phase transitions to `terminal`; after 100ms prints the terminal intro including the actual current PC-2 IP.
- `RULE_TERMINAL_COMMAND` is active only when `phase === "terminal" && questionStatus !== "completed"`.
- `RULE_TERMINAL_NOT_READY` is a fallback: active when `phase !== "terminal"`, always returns error.
- `RULE_SUCCESS_NAV` sets `ctx.navigateAway = true`; page then navigates away.

### 2.7 AI Authoring Contract

- You may change text copy and educational hints.
- You must not rename canonical IDs, modal patterns, or command names.
- You must preserve declarative phase-resolution and behavior-driven flow.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap board and inventory with all 5 entities.
2. User drags router to `SPACE_ROUTER`, PCs to their respective boards, cables to connectors.
3. Derived hook computes topology connectivity.
4. When router placed and ≥1 PC connected: drag engine starts, phase → `PHASE_PLAYING`.
5. User clicks router to open `MODAL_ROUTER_CONFIG` and configure DHCP.
6. On `RULE_ROUTER_SAVE`: settings persisted, `ctx.lastConfiguredDeviceId` updated.
7. Hook validates IP range, auto-assigns IPs to connected PCs.
8. When both PCs have IPs: drag engine finishes, phase → `PHASE_TERMINAL`.
9. `RULE_TERMINAL_ONBOARDING` fires once; prints intro including `ping <pc-2-ip>`.
10. User runs `ping <pc-2-ip>` to verify connectivity.
11. On successful ping: opens success modal, completes question, phase → `PHASE_COMPLETED`.
12. `RULE_SUCCESS_NAV` fires; `ctx.navigateAway = true`; page navigates.

### 3.2 Connectivity Logic

`buildNetworkSnapshot` (`-utils/network-utils.ts`):
- Reads all 5 grid spaces and their placed items.
- Locates pc1, pc2, router, leftCables, rightCables.
- Derives `connectedPcIds`: a PC is connected when a cable occupies the connector space on that PC's side.
- Returns `connectionErrors` for topology validation.

Topology rules:
- Direct PC-to-PC (without router) does **not** satisfy connectivity.
- A cable in `SPACE_CONN_LEFT` connects PC-1 to router; a cable in `SPACE_CONN_RIGHT` connects PC-2 to router.
- Both cables must be present for both PCs to receive IPs.

### 3.3 DHCP Configuration Logic

Fields saved by `RULE_ROUTER_SAVE`:
- `dhcpEnabled`: must be `true` for router to be considered configured.
- `startIp`: must pass `VALID_PRIVATE_IP_RANGE`.
- `endIp`: must pass `VALID_PRIVATE_IP_RANGE` and `VALID_RANGE_MIN_SIZE` (strictly greater than `startIp`, ≥2 addresses).

IP assignment when configured:
- Connected PCs sorted by entity ID alphabetically (e.g., `pc-1` before `pc-2`).
- First connected PC gets `startIp` last-octet value; subsequent PCs get incremented last octets.

### 3.4 Terminal Logic

Active guard: `phase === "terminal" && questionStatus !== "completed"`.

| Command | Logic |
|---|---|
| `help` | Prints command manual (`ping <pc-2-ip>` syntax explained). |
| `ping <ip>` | If `<ip>` equals current `TERMINAL_SUCCESS_TARGET`: success response, opens success modal, finishes engine, completes question. Otherwise: unknown target error. |
| Any other command | Unknown command error. |
| Missing argument | Missing argument error. |

### 3.5 Terminal Onboarding Logic

`RULE_TERMINAL_ONBOARDING` fires once on `PHASE_CHANGED` event to `terminal`. After 100ms it prints:
- The terminal prompt (`TERMINAL_PROMPT`).
- Intro entries showing `- ping <pc-2-ip>` with the **actual current** PC-2 IP value.

### 3.6 Terminal Not-Ready Logic

`RULE_TERMINAL_NOT_READY` fires when `phase !== "terminal"`. Returns `Error: Terminal is not ready yet.` for any input.

### 3.7 Entity Badge Logic

Short badge text derived by `getNetworkingStatusMessage` (`-utils/entity-badge.ts`):

| Entity Type | Badge Values |
|---|---|
| `router` | `"needs configuration"` / `"configured"` |
| `pc` | IP string (when assigned) / `"no ip"` |
| `cable` | `null` (no badge) |

---

## 4) Transition Matrices

### 4.1 Phase Transition Matrix

| Rule Order | Condition | Target Phase |
|---|---|---|
| 1 | `questionStatus == completed` | `completed` |
| 2 | `dragStatus == finished` | `terminal` |
| 3 | `dragStatus == started` | `playing` |

Evaluation mode: `last-match-wins`.

### 4.2 Modal Submission Matrix

| Modal Pattern | Action | Side Effect |
|---|---|---|
| `router-config-*` | `save` | persist `dhcpEnabled`, `startIp`, `endIp`; set `ctx.lastConfiguredDeviceId` |
| `success` | `primary` | set `ctx.navigateAway = true` |

### 4.3 Terminal Command Matrix

| Command | Preconditions | Success | Failure |
|---|---|---|---|
| `help` | terminal phase active | manual text | n/a |
| `ping <ip>` | terminal phase active | completes question when `<ip>` equals `TERMINAL_SUCCESS_TARGET` | unknown target / missing argument |
| Other | terminal phase active | — | unknown command error |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms → Logic

| Term | Logic Usage |
|---|---|
| `SPACE_CONN_LEFT` | Hosts cable connecting PC-1 to router |
| `SPACE_CONN_RIGHT` | Hosts cable connecting PC-2 to router |
| `SPACE_ROUTER` | DHCP configuration anchor; drag engine watches for router presence here |

### 5.2 Rule Terms → Logic

| Term | Logic Usage |
|---|---|
| `RULE_ROUTER_SAVE` | persists router DHCP settings; triggers IP re-derivation |
| `RULE_TERMINAL_ONBOARDING` | prints intro with actual PC-2 IP on phase entry |
| `RULE_TERMINAL_COMMAND` | ping verification and success gate |
| `RULE_TERMINAL_NOT_READY` | guards pre-terminal input |

### 5.3 Validation Terms → Logic

| Term | Logic Usage |
|---|---|
| `VALID_PRIVATE_IP_RANGE` | router config `startIp`/`endIp` validation |
| `VALID_RANGE_MIN_SIZE` | prevents trivial DHCP pool with only 1 address |

---

## 6) Hard Invariants

- Router remains the only configurable network core.
- Success remains tied to pinging `TERMINAL_SUCCESS_TARGET` (current PC-2 assigned IP).
- Modal ID patterns remain stable.
- All entities remain single-instance with fixed IDs.
- IP assignment is always sorted by entity ID, sequential from `startIp`.

---

## 7) Non-Goals

- Not DHCP lease time or renewal simulation.
- Not subnet mask/gateway/DNS per-host simulation.
- Not multi-router or VLAN topology.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 terms first.
2. Update declaration constraints in Section 2.
3. Update lifecycle and matrices.
4. Re-check term-link consistency.

### 8.2 Consistency Checks

- Phase rules documented as `last-match-wins`.
- Every modal used in logic appears in Section 1.9.
- Terminal behavior text matches command outcomes in Section 4.3.
- No undeclared synonyms appear in Sections 2-5.
- `TERMINAL_SUCCESS_TARGET` is dynamic (PC-2 current IP), not a hardcoded string.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
