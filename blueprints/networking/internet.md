# Internet Gateway Blueprint

Declaration-first blueprint for `internet-gateway`.
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

Use this blueprint as the canonical source of truth for Internet question behavior.
Use game docs for API details.

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
- Add new terms before using them in logic text.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value |
|---|---|
| `QUESTION_ID` | `internet-gateway` |
| `QUESTION_TITLE` | `🌐 Connect to the Internet!` |
| `QUESTION_DESCRIPTION` | `Now you can setup a router, but you can't reach Google yet. Connect to your ISP and configure the router to access the internet!` |

### 1.2 Architecture Terms

| Term ID | Value | Meaning |
|---|---|---|
| `STYLE_DECLARATIVE_BEHAVIOR_DRIVEN` | `true` | Uses definition + behavior reactor + derived state hook |
| `HAS_PHASE_RULES` | `true` | Phase is resolved from condition context |
| `PHASE_RULE_EVAL_MODE` | `last-match-wins` | `resolvePhase` iterates all rules; later matches override earlier |

### 1.3 Space Terms

| Term ID | Space ID | Kind |
|---|---|---|
| `SPACE_LOCAL` | `local` | `grid` |
| `SPACE_CONN_1` | `conn-1` | `grid` |
| `SPACE_ROUTER` | `router` | `grid` |
| `SPACE_CONN_2` | `conn-2` | `grid` |
| `SPACE_IGW` | `igw` | `grid` |
| `SPACE_DNS` | `dns` | `grid` |
| `SPACE_GOOGLE` | `google` | `grid` |
| `SPACE_INVENTORY` | `inventory` | `pool` |

### 1.4 Entity Terms

| Term ID | Entity ID | Type |
|---|---|---|
| `ENTITY_PC` | `pc-1` | `pc` |
| `ENTITY_CABLE` | `cable-1` | `cable` |
| `ENTITY_FIBER` | `fiber-1` | `fiber` |
| `ENTITY_ROUTER_LAN` | `router-lan-1` | `router-lan` |
| `ENTITY_ROUTER_NAT` | `router-nat-1` | `router-nat` |
| `ENTITY_ROUTER_WAN` | `router-wan-1` | `router-wan` |
| `ENTITY_IGW` | `igw-1` | `igw` |
| `ENTITY_DNS` | `dns-1` | `dns` |
| `ENTITY_GOOGLE` | `google-1` | `google` |

### 1.5 Network Validation Terms

| Term ID | Meaning |
|---|---|
| `VALID_DNS_RUNTIME` | Runtime reachability accepts `8.8.8.8`, `8.8.4.4`, `1.1.1.1`, `1.0.0.1` |
| `VALID_DNS_MODAL` | Modal validator also accepts `208.67.222.222` |
| `VALID_PPPOE_USERNAME` | `user@telkom.net` |
| `VALID_PPPOE_PASSWORD` | `indihome123` |
| `GOOGLE_IP` | `142.250.80.46` |

### 1.6 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_PLAYING` | `playing` |
| `PHASE_CONFIGURING` | `configuring` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

### 1.7 Condition Context Terms

| Term ID | Meaning |
|---|---|
| `CTX_DRAG_STATUS` | `dragEngine.progress.status` |
| `CTX_QUESTION_STATUS` | `state.question.status` |
| `CTX_ALL_DEVICES_PLACED` | Derived boolean from topology completeness |

### 1.8 Behavior Rule Terms

| Term ID | Behavior Rule ID |
|---|---|
| `RULE_LAN_CLICK` | `internet.router-lan-click` |
| `RULE_NAT_CLICK` | `internet.router-nat-click` |
| `RULE_WAN_CLICK` | `internet.router-wan-click` |
| `RULE_PC_CLICK` | `internet.pc-click` |
| `RULE_IGW_CLICK` | `internet.igw-click` |
| `RULE_DNS_CLICK` | `internet.dns-click` |
| `RULE_GOOGLE_CLICK` | `internet.google-click` |
| `RULE_LAN_SAVE` | `internet.router-lan-save` |
| `RULE_NAT_SAVE` | `internet.router-nat-save` |
| `RULE_WAN_SAVE` | `internet.router-wan-save` |
| `RULE_SUCCESS_NAV` | `internet.success-modal-navigate` |
| `RULE_TERMINAL_COMMAND` | `internet.terminal-command` |
| `RULE_TERMINAL_NOT_READY` | `internet.terminal-not-ready` |

### 1.9 Modal Terms

| Term ID | Modal ID Pattern | Actions |
|---|---|---|
| `MODAL_ROUTER_LAN` | `router-lan-config-{deviceId}` | `cancel`, `save` |
| `MODAL_ROUTER_NAT` | `router-nat-config-{deviceId}` | `cancel`, `save` |
| `MODAL_ROUTER_WAN` | `router-wan-config-{deviceId}` | `cancel`, `save` |
| `MODAL_PC_STATUS` | `pc-status-{deviceId}` | `close` |
| `MODAL_IGW_STATUS` | `igw-status-{deviceId}` | `close` |
| `MODAL_DNS_STATUS` | `dns-status-{deviceId}` | `close` |
| `MODAL_GOOGLE_STATUS` | `google-status-{deviceId}` | `close` |
| `MODAL_SUCCESS` | `success` | `primary` |

### 1.10 Terminal Terms

| Term ID | Value |
|---|---|
| `TERMINAL_COMMAND_HELP` | `help` |
| `TERMINAL_COMMAND_IFCONFIG` | `ifconfig` |
| `TERMINAL_COMMAND_NSLOOKUP` | `nslookup <domain>` |
| `TERMINAL_COMMAND_CURL` | `curl <hostname-or-ip>` |
| `TERMINAL_ALLOWED_DOMAIN` | `google.com` |
| `TERMINAL_ALLOWED_IP` | `142.250.80.46` |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase must be `PHASE_SETUP`.

### 2.2 Space and Entity Declaration

- Declare all spaces from Section 1.3.
- All entities from Section 1.4 start in `SPACE_INVENTORY`.
- Allowed-place constraints remain fixed.

### 2.3 Phase Rule Declaration

Phase rules (in declared order):
1. `CTX_ALL_DEVICES_PLACED == true` -> `PHASE_CONFIGURING`
2. `CTX_DRAG_STATUS == started` -> `PHASE_PLAYING`
3. `CTX_DRAG_STATUS == finished` -> `PHASE_TERMINAL`
4. `CTX_QUESTION_STATUS == completed` -> `PHASE_COMPLETED`

Because `PHASE_RULE_EVAL_MODE` is `last-match-wins`, later matches override earlier matches.

### 2.4 Derived State Declaration

- `allDevicesPlaced`: all 9 required entities are placed on target topology.
- `routerLanConfigured`: DHCP enabled + valid private range + runtime-valid DNS.
- `routerNatConfigured`: NAT enabled.
- `hasValidPppoeCredentials`: exact PPPoE username/password match.
- `allRoutersConfigured`: LAN configured + NAT enabled + PPPoE valid.
- `googleReachable`: `allRoutersConfigured` and full topology connected.

### 2.5 Drag Engine Declaration

- Start drag progress when `allDevicesPlaced` becomes true.
- Finish drag progress when `allRoutersConfigured` and `googleReachable` are true.

### 2.6 Behavior Declaration

- Click rules open config/status modals.
- Save rules persist router fields to entity data.
- Terminal command rule is active only in `PHASE_TERMINAL` and before question completion.
- Success modal rule toggles navigate-away context.

### 2.7 AI Authoring Contract

- You may adjust educational copy and hint language.
- You must not rename canonical IDs, command names, or modal patterns.
- You must preserve the declarative phase-resolution contract and behavior-rule semantics.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap board and inventory.
2. User places all devices along topology.
3. User configures router LAN, NAT, and WAN.
4. Derived state updates entity statuses and PC IP assignment.
5. Terminal phase opens when drag engine finishes.
6. User verifies connectivity with terminal commands.
7. Success modal completes question and navigation context is set.

### 3.2 Placement and Topology Logic

- Required topology path: PC -> cable -> router LAN/NAT/WAN -> fiber -> IGW -> DNS -> Google.
- `allDevicesPlaced` is placement completeness, not correctness of configuration.
- Entity statuses are derived continuously from connectivity and config validity.

### 3.3 Router Configuration Logic

- Router LAN modal fields:
  - `dhcpEnabled`
  - `startIp`
  - `endIp`
  - `dnsServer`
- Router NAT modal field:
  - `natEnabled`
- Router WAN modal fields:
  - `username`
  - `password`

Save actions update entity data. Runtime derivation then decides effective connectivity.

### 3.4 PC IP and Reachability Logic

- PC receives IP only when router LAN is configured and physically connected.
- Assigned IP uses LAN `startIp` base value.
- Google reachability requires valid WAN auth, NAT enabled, and valid DNS.

### 3.5 Terminal Logic

- `help`: prints command manual.
- `ifconfig`: prints `eth0` IP or missing IP.
- `nslookup <domain>`:
  - requires runtime-valid DNS
  - resolves only `google.com` -> `GOOGLE_IP`
- `curl <target>`:
  - target must be `google.com` or `GOOGLE_IP`
  - checks WAN then NAT then DNS (for domain target)
  - on success prints simulated HTTP response and opens success modal.

### 3.6 Terminal Not-Ready Logic

- Any terminal input outside `PHASE_TERMINAL` returns `Error: Terminal is not ready yet.`

---

## 4) Transition Matrices

### 4.1 Phase Transition Matrix

| Rule Order | Condition | Target Phase |
|---|---|---|
| 1 | `allDevicesPlaced == true` | `configuring` |
| 2 | `dragStatus == started` | `playing` |
| 3 | `dragStatus == finished` | `terminal` |
| 4 | `questionStatus == completed` | `completed` |

Evaluation mode: `last-match-wins`.

### 4.2 Command Outcome Matrix

| Command | Preconditions | Success Output | Failure Output |
|---|---|---|---|
| `ifconfig` | none (terminal phase active) | `eth0: <ip>` | `eth0: No IP assigned` |
| `nslookup google.com` | DNS runtime-valid | `google.com -> 142.250.80.46` | DNS not configured error |
| `curl google.com` | WAN + NAT + DNS valid | `HTTP/1.1 200 OK ...` | specific gate error |
| `curl 142.250.80.46` | WAN + NAT valid | `HTTP/1.1 200 OK ...` | specific gate error |

### 4.3 Modal Submission Matrix

| Modal | Action | Side Effect |
|---|---|---|
| `router-lan-config-*` | `save` | persist LAN fields |
| `router-nat-config-*` | `save` | persist NAT field |
| `router-wan-config-*` | `save` | persist WAN credentials |
| `success` | `primary` | set navigate-away context |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic

| Term | Logic Usage |
|---|---|
| `SPACE_ROUTER` | Hosts LAN/NAT/WAN configurable entities |
| `SPACE_CONN_1` | PC-to-router cable connector |
| `SPACE_CONN_2` | Router-to-IGW fiber connector |
| `SPACE_GOOGLE` | End destination status entity |

### 5.2 Validation Terms -> Logic

| Term | Logic Usage |
|---|---|
| `VALID_DNS_RUNTIME` | reachability checks and DNS status |
| `VALID_DNS_MODAL` | LAN modal validation only |
| `VALID_PPPOE_USERNAME/PASSWORD` | WAN auth check |

### 5.3 Rule Terms -> Logic

| Term | Logic Usage |
|---|---|
| `RULE_LAN_SAVE` | writes DHCP/DNS values |
| `RULE_WAN_SAVE` | writes PPPoE credentials |
| `RULE_TERMINAL_COMMAND` | command interpreter and success gate |
| `RULE_TERMINAL_NOT_READY` | terminal guard outside terminal phase |

---

## 6) Hard Invariants

- `GOOGLE_IP` remains `142.250.80.46`.
- WAN credentials remain exact-match gates.
- Terminal success remains tied to `curl` against allowed host/IP.
- Phase rules remain declarative and evaluated with `last-match-wins`.
- Modal ID patterns remain stable.

---

## 7) Non-Goals

- Not multi-PC DHCP scope simulation.
- Not dynamic internet routing simulation.
- Not arbitrary DNS host resolution beyond `google.com`.
- Not real PPPoE handshake protocol emulation.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 terms first.
2. Update declarations in Section 2.
3. Update lifecycle and transition matrices.
4. Validate term-link index.

### 8.2 Consistency Checks

- Every behavior rule ID referenced in logic exists in Section 1.8.
- Every modal pattern used in logic exists in Section 1.9.
- Phase-rule semantics state `last-match-wins`.
- DNS validator/runtime split is documented.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
