# DHCP Home Networking Blueprint

Declaration-first blueprint for `networking` (DHCP question).
This document is the starting specification for authoring and maintaining this question.

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

| Term ID | Space ID | Kind |
|---|---|---|
| `SPACE_PC_1` | `pc-1-board` | `grid` |
| `SPACE_CONN_LEFT` | `connector-left` | `grid` |
| `SPACE_ROUTER` | `router-board` | `grid` |
| `SPACE_CONN_RIGHT` | `connector-right` | `grid` |
| `SPACE_PC_2` | `pc-2-board` | `grid` |
| `SPACE_INVENTORY` | `inventory` | `pool` |

### 1.4 Entity Terms

| Term ID | Entity ID | Type |
|---|---|---|
| `ENTITY_PC_1` | `pc-1` | `pc` |
| `ENTITY_PC_2` | `pc-2` | `pc` |
| `ENTITY_ROUTER` | `router-1` | `router` |
| `ENTITY_CABLE_1` | `cable-1` | `cable` |
| `ENTITY_CABLE_2` | `cable-2` | `cable` |

### 1.5 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_PLAYING` | `playing` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

### 1.6 Condition Context Terms

| Term ID | Meaning |
|---|---|
| `CTX_DRAG_STATUS` | `dragEngine.progress.status` |
| `CTX_QUESTION_STATUS` | `state.question.status` |

### 1.7 Behavior Rule Terms

| Term ID | Behavior Rule ID |
|---|---|
| `RULE_ROUTER_CLICK` | `dhcp.router-click` |
| `RULE_PC_CLICK` | `dhcp.pc-click` |
| `RULE_ROUTER_SAVE` | `dhcp.router-config-save` |
| `RULE_SUCCESS_NAV` | `dhcp.success-modal-navigate` |
| `RULE_TERMINAL_COMMAND` | `dhcp.terminal-command` |
| `RULE_TERMINAL_NOT_READY` | `dhcp.terminal-not-ready` |

### 1.8 Modal Terms

| Term ID | Modal ID Pattern | Actions |
|---|---|---|
| `MODAL_ROUTER_CONFIG` | `router-config-{deviceId}` | `cancel`, `save` |
| `MODAL_PC_CONFIG` | `pc-config-{deviceId}` | `close` |
| `MODAL_SUCCESS` | `success` | `primary` |

### 1.9 Validation Terms

| Term ID | Meaning |
|---|---|
| `VALID_PRIVATE_IP_RANGE` | Start/end must be valid private IPv4 addresses |
| `VALID_RANGE_MIN_SIZE` | End IP must be greater than start IP and provide at least 2 addresses |

### 1.10 Terminal Terms

| Term ID | Value |
|---|---|
| `TERMINAL_COMMAND_HELP` | `help` |
| `TERMINAL_COMMAND_PING` | `ping <ip>` |
| `TERMINAL_SUCCESS_TARGET` | `pc-2` assigned IP |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase must be `PHASE_SETUP`.

### 2.2 Space and Entity Declaration

- Declare all spaces in Section 1.3.
- All entities in Section 1.4 start in `SPACE_INVENTORY`.
- Allowed-place constraints remain fixed to prevent invalid placements.

### 2.3 Phase Rule Declaration

Phase rules (declared order):
1. `questionStatus == completed` -> `PHASE_COMPLETED`
2. `dragStatus == finished` -> `PHASE_TERMINAL`
3. `dragStatus == started` -> `PHASE_PLAYING`

Because evaluation is `last-match-wins`, later matches override earlier matches.

### 2.4 Derived State Declaration

- Router config is read from `ENTITY_ROUTER.data`.
- Router is considered configured when DHCP is enabled and IP range passes validation terms.
- Connected PCs receive sequential IPs starting from configured start IP.
- Entity status is derived and written by the state hook:
  - router: `success` or `error`
  - cables: `success` or `warning`
  - PCs: `success` when IP assigned, else `warning`

### 2.5 Drag Engine Declaration

- Start drag progress when router exists and at least one PC is connected.
- Finish drag progress when router exists and both PCs have IP addresses.

### 2.6 Behavior Declaration

- Router click opens DHCP config modal.
- PC click opens read-only IP modal.
- Router save persists DHCP settings.
- Terminal command rule is active only in `PHASE_TERMINAL` and before completion.
- Success modal submit sets navigation context.

### 2.7 AI Authoring Contract

- You may change text copy and educational hints.
- You must not rename canonical IDs, modal patterns, or command names.
- You must preserve declarative phase-resolution and behavior-driven flow.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap board and inventory.
2. User places PCs, router, and cables.
3. Derived hook computes topology connectivity.
4. User configures router DHCP settings.
5. Hook validates range and auto-assigns IPs.
6. Terminal phase opens when both PCs have IPs.
7. User runs ping check; success modal completes question.

### 3.2 Connectivity Logic

- Two cables are required to connect both PCs to router.
- Direct PC-to-PC does not satisfy topology.
- Cable statuses are warning until properly connected.

### 3.3 DHCP Configuration Logic

- `dhcpEnabled` must be true.
- `startIp` and `endIp` must satisfy `VALID_PRIVATE_IP_RANGE` and `VALID_RANGE_MIN_SIZE`.
- Once valid and connected, IP addresses are assigned to connected PCs in sorted entity order.

### 3.4 Terminal Logic

- `help`: prints ping/manual help text.
- `ping <ip>`:
  - success only when target equals current PC-2 assigned IP.
  - on success: open success modal, finish terminal engine, complete question.
  - otherwise: error unknown target.
- Any other command: unknown command error.

### 3.5 Terminal Not-Ready Logic

- Any terminal input outside `PHASE_TERMINAL` returns `Error: Terminal is not ready yet.`

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
| `router-config-*` | `save` | persist `dhcpEnabled/startIp/endIp` |
| `success` | `primary` | set navigate-away context |

### 4.3 Terminal Command Matrix

| Command | Preconditions | Success | Failure |
|---|---|---|---|
| `help` | terminal phase active | manual text | n/a |
| `ping <ip>` | terminal phase active | completes question when target equals PC-2 IP | unknown target/missing arg |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic

| Term | Logic Usage |
|---|---|
| `SPACE_CONN_LEFT` | PC-1 cable bridge |
| `SPACE_CONN_RIGHT` | PC-2 cable bridge |
| `SPACE_ROUTER` | DHCP configuration anchor |

### 5.2 Rule Terms -> Logic

| Term | Logic Usage |
|---|---|
| `RULE_ROUTER_SAVE` | persist router DHCP settings |
| `RULE_TERMINAL_COMMAND` | ping verification and success gate |
| `RULE_TERMINAL_NOT_READY` | guards pre-terminal input |

### 5.3 Validation Terms -> Logic

| Term | Logic Usage |
|---|---|
| `VALID_PRIVATE_IP_RANGE` | router config validation |
| `VALID_RANGE_MIN_SIZE` | prevents invalid DHCP pool size |

---

## 6) Hard Invariants

- Router remains the only configurable network core.
- Success remains tied to pinging current PC-2 assigned IP.
- Modal ID patterns remain stable.
- All entities remain single-instance with fixed IDs.

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
- Every modal used in logic appears in Section 1.8.
- Terminal behavior text matches command outcomes.
- No undeclared synonyms appear in Sections 2-5.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
