# Internet Gateway Blueprint

Declaration-first blueprint for `internet-gateway`.
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

Use this blueprint as the canonical source of truth for Internet Gateway question behavior.
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

| Term ID | Space ID | Kind | Grid Size |
|---|---|---|---|
| `SPACE_LOCAL` | `local` | `grid` | 1×1 |
| `SPACE_CONN_1` | `conn-1` | `grid` | 1×1 |
| `SPACE_ROUTER` | `router` | `grid` | 1×3 |
| `SPACE_CONN_2` | `conn-2` | `grid` | 1×1 |
| `SPACE_IGW` | `igw` | `grid` | 1×1 |
| `SPACE_DNS` | `dns` | `grid` | 1×1 |
| `SPACE_GOOGLE` | `google` | `grid` | 1×1 |
| `SPACE_INVENTORY` | `inventory` | `pool` | — |

`SPACE_ROUTER` is a 1×3 grid that hosts three distinct router entities side by side (`ENTITY_ROUTER_LAN`, `ENTITY_ROUTER_NAT`, `ENTITY_ROUTER_WAN`).

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

All 9 entities start in `SPACE_INVENTORY`.

### 1.5 Network Validation Terms

| Term ID | Meaning |
|---|---|
| `VALID_DNS_RUNTIME` | Runtime reachability check accepts: `8.8.8.8`, `8.8.4.4`, `1.1.1.1`, `1.0.0.1` |
| `VALID_DNS_MODAL` | LAN modal validator additionally accepts `208.67.222.222` (OpenDNS); superset of `VALID_DNS_RUNTIME` |
| `VALID_PPPOE_USERNAME` | `user@telkom.net` |
| `VALID_PPPOE_PASSWORD` | `indihome123` |
| `GOOGLE_IP` | `142.250.80.46` |

`VALID_DNS_MODAL` exists so the UI can suggest valid servers without restricting to a shorter runtime list. Only `VALID_DNS_RUNTIME` gates actual reachability logic.

### 1.6 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_PLAYING` | `playing` |
| `PHASE_CONFIGURING` | `configuring` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

### 1.7 Condition Context Terms

| Term ID | Source | Meaning |
|---|---|---|
| `CTX_DRAG_STATUS` | `dragEngine.progress.status` | Current drag engine progress value |
| `CTX_QUESTION_STATUS` | `state.question.status` | Engine-level question completion |
| `CTX_ALL_DEVICES_PLACED` | derived in `useInternetState` | `true` when all 9 required entities are placed and fully connected in topology |

### 1.8 Behavior Context Fields

These fields live on `ctx` (mutable context bag) in behavior rules:

| Field | Type | Set By | Meaning |
|---|---|---|---|
| `ctx.navigateAway` | `boolean` | `RULE_SUCCESS_NAV` | Signals page to navigate to next question |

### 1.9 Behavior Rule Terms

| Term ID | Behavior Rule ID | Trigger |
|---|---|---|
| `RULE_LAN_CLICK` | `internet.router-lan-click` | entity click on `router-lan` type |
| `RULE_NAT_CLICK` | `internet.router-nat-click` | entity click on `router-nat` type |
| `RULE_WAN_CLICK` | `internet.router-wan-click` | entity click on `router-wan` type |
| `RULE_PC_CLICK` | `internet.pc-click` | entity click on `pc` type |
| `RULE_IGW_CLICK` | `internet.igw-click` | entity click on `igw` type |
| `RULE_DNS_CLICK` | `internet.dns-click` | entity click on `dns` type |
| `RULE_GOOGLE_CLICK` | `internet.google-click` | entity click on `google` type |
| `RULE_LAN_SAVE` | `internet.router-lan-save` | modal submit on `router-lan-config-*` with `save` action |
| `RULE_NAT_SAVE` | `internet.router-nat-save` | modal submit on `router-nat-config-*` with `save` action |
| `RULE_WAN_SAVE` | `internet.router-wan-save` | modal submit on `router-wan-config-*` with `save` action |
| `RULE_SUCCESS_NAV` | `internet.success-modal-navigate` | modal submit on `success` with `primary` action |
| `RULE_TERMINAL_ONBOARDING` | `internet.terminal-onboarding` | `PHASE_CHANGED` event to `terminal` phase, fires once |
| `RULE_TERMINAL_COMMAND` | `internet.terminal-command` | terminal input event |
| `RULE_TERMINAL_NOT_READY` | `internet.terminal-not-ready` | terminal input event (fallback guard) |

### 1.10 Modal Terms

| Term ID | Modal ID Pattern | Actions | Fields |
|---|---|---|---|
| `MODAL_ROUTER_LAN` | `router-lan-config-{deviceId}` | `cancel`, `save` | `dhcpEnabled` (checkbox), `startIp` (text), `endIp` (text), `dnsServer` (text) |
| `MODAL_ROUTER_NAT` | `router-nat-config-{deviceId}` | `cancel`, `save` | `natEnabled` (checkbox) |
| `MODAL_ROUTER_WAN` | `router-wan-config-{deviceId}` | `cancel`, `save` | `username` (text), `password` (text) |
| `MODAL_PC_STATUS` | `pc-status-{deviceId}` | `close` | `ip` (readonly), `status` (readonly) |
| `MODAL_IGW_STATUS` | `igw-status-{deviceId}` | `close` | `Connection Status` (readonly) |
| `MODAL_DNS_STATUS` | `dns-status-{deviceId}` | `close` | `DNS Server` (readonly), `Status` (readonly) |
| `MODAL_GOOGLE_STATUS` | `google-status-{deviceId}` | `close` | `Domain`, `IP Address`, `Status`, optional `Reason` (all readonly) |
| `MODAL_SUCCESS` | `success` | `primary` | educational content |

### 1.11 Terminal Terms

| Term ID | Value |
|---|---|
| `TERMINAL_COMMAND_HELP` | `help` |
| `TERMINAL_COMMAND_IFCONFIG` | `ifconfig` |
| `TERMINAL_COMMAND_NSLOOKUP` | `nslookup google.com` |
| `TERMINAL_COMMAND_CURL_DOMAIN` | `curl google.com` |
| `TERMINAL_COMMAND_CURL_IP` | `curl 142.250.80.46` |
| `TERMINAL_ALLOWED_DOMAIN` | `google.com` |
| `TERMINAL_ALLOWED_IP` | `142.250.80.46` |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase is `PHASE_SETUP`.

### 2.2 Space and Entity Declaration

- Declare all spaces from Section 1.3.
- All entities from Section 1.4 start in `SPACE_INVENTORY`.
- Allowed-place constraints are fixed per entity type.

### 2.3 Phase Rule Declaration

Phase rules (declared order, evaluated `last-match-wins`):

1. `CTX_ALL_DEVICES_PLACED == true` → `PHASE_CONFIGURING`
2. `CTX_DRAG_STATUS == started` → `PHASE_PLAYING`
3. `CTX_DRAG_STATUS == finished` → `PHASE_TERMINAL`
4. `CTX_QUESTION_STATUS == completed` → `PHASE_COMPLETED`

Because `PHASE_RULE_EVAL_MODE` is `last-match-wins`, rule 4 always wins over rule 3 once the question is completed. Rule 2 wins over rule 1 once the drag engine starts (devices already placed). Rule 3 wins once drag engine finishes (routers configured + Google reachable).

Effective phase resolution priority (highest to lowest): completed > terminal > playing > configuring.

### 2.4 Derived State Declaration

Derived in `useInternetState` hook (`-utils/use-internet-state.ts`):

| Derived Field | Meaning |
|---|---|
| `allDevicesPlaced` | All 9 entities placed **and** topology is fully connected (PC→cable→router→fiber→IGW→DNS→Google) |
| `routerLanConfigured` | DHCP enabled + valid private IP range + runtime-valid DNS (`VALID_DNS_RUNTIME`) |
| `routerNatConfigured` | NAT enabled |
| `hasValidPppoeCredentials` | WAN username/password exact-match `VALID_PPPOE_USERNAME`/`VALID_PPPOE_PASSWORD` |
| `allRoutersConfigured` | `routerLanConfigured && routerNatConfigured && hasValidPppoeCredentials` |
| `googleReachable` | `allRoutersConfigured && topology fully connected` |
| `pcIp` | Derived from router LAN `startIp`; assigned when `routerLanConfigured && pcConnectedToRouterLan` |

Entity statuses are updated as a side effect of the hook every render cycle.

### 2.5 Drag Engine Declaration

- **Start** drag progress: when `allDevicesPlaced` becomes `true`.
- **Finish** drag progress: when `allRoutersConfigured && googleReachable` are both `true`.

### 2.6 Behavior Declaration

- Click rules open config/status modals for respective entity types.
- Save rules read modal submission via `createEntityPayloadWriter`, validate, and write to entity data.
- `RULE_TERMINAL_ONBOARDING` fires once when phase transitions to `terminal`; prints help text after 100ms delay.
- `RULE_TERMINAL_COMMAND` is active only when `phase === "terminal" && questionStatus !== "completed"`.
- `RULE_TERMINAL_NOT_READY` is a fallback: active when `phase !== "terminal"`, always returns error.
- `RULE_SUCCESS_NAV` sets `ctx.navigateAway = true`; page then navigates away.

### 2.7 AI Authoring Contract

- You may adjust educational copy and hint language.
- You must not rename canonical IDs, command names, or modal patterns.
- You must preserve the declarative phase-resolution contract and behavior-rule semantics.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap board and inventory with all 9 entities.
2. User drags entities into topology: PC → cable → router spaces → fiber → IGW → DNS → Google.
3. `CTX_ALL_DEVICES_PLACED` becomes `true`; phase resolves to `PHASE_CONFIGURING`.
4. Drag engine starts; phase resolves to `PHASE_PLAYING` (overrides configuring).
5. User clicks router entities to open config modals and save settings.
6. Derived state computes `routerLanConfigured`, `routerNatConfigured`, `googleReachable`.
7. PC auto-receives IP when LAN configured and physically connected.
8. When `allRoutersConfigured && googleReachable`, drag engine finishes.
9. Phase resolves to `PHASE_TERMINAL`.
10. `RULE_TERMINAL_ONBOARDING` fires once; prints intro + help text.
11. User runs terminal commands to verify connectivity.
12. `curl google.com` or `curl 142.250.80.46` succeeds: opens success modal, completes question.
13. `RULE_SUCCESS_NAV` fires; `ctx.navigateAway = true`; page navigates.

### 3.2 Topology and Connectivity Logic

Required physical topology (left to right):
```
PC (local) → cable (conn-1) → Router LAN/NAT/WAN (router) → fiber (conn-2) → IGW (igw) → DNS (dns) → Google (google)
```

`buildInternetNetworkSnapshot` (`-utils/network-utils.ts`):
- Reads all 7 grid spaces and their placed items.
- Derives `pcConnectedToRouterLan`, `routerWanConnectedToIgw`, `isFullyConnected`.
- Returns `connectionErrors` list for diagnostic display.

`allDevicesPlaced` requires all entities placed **and** `isFullyConnected == true`.

### 3.3 Router Configuration Logic

**LAN modal** (`MODAL_ROUTER_LAN`):
- `dhcpEnabled`: must be `true`.
- `startIp`: must be a valid private IP address.
- `endIp`: must be a valid private IP address greater than `startIp`.
- `dnsServer`: validated against `VALID_DNS_MODAL` list (superset of runtime).

**NAT modal** (`MODAL_ROUTER_NAT`):
- `natEnabled`: must be `true`.

**WAN modal** (`MODAL_ROUTER_WAN`):
- `username`: exact match against `VALID_PPPOE_USERNAME`.
- `password`: exact match against `VALID_PPPOE_PASSWORD`.
- Placeholder text shows example credentials.

Save actions call `createEntityPayloadWriter` to persist fields to `entity.data`.

### 3.4 PC IP and Reachability Logic

- PC auto-receives IP when `routerLanConfigured && pcConnectedToRouterLan`.
- Assigned IP is derived from `startIp` (last octet incremented for each connected PC).
- `googleReachable` requires: valid WAN credentials + NAT enabled + valid DNS + full topology.

### 3.5 Terminal Logic

Active guard: `phase === "terminal" && questionStatus !== "completed"`.

| Command | Logic |
|---|---|
| `help` | Prints command manual listing all available commands. |
| `ifconfig` | Prints `eth0: <pcIp>` if IP assigned; otherwise `eth0: No IP assigned`. |
| `nslookup google.com` | Requires `dnsServer` in `VALID_DNS_RUNTIME`; resolves `google.com` → `GOOGLE_IP`. |
| `curl google.com` | Gate: WAN valid → NAT enabled → DNS valid. On success: prints HTTP 200 response, opens success modal, completes question. |
| `curl 142.250.80.46` | Gate: WAN valid → NAT enabled (no DNS check for IP). On success: same as above. |
| Unknown command | Prints unknown command error. |

`deriveStatus(state)` is an internal function in `behaviors.ts` that reads all router entity data from `state.entities` and returns a snapshot used to gate terminal command outcomes.

### 3.6 Terminal Onboarding Logic

`RULE_TERMINAL_ONBOARDING` fires once on `PHASE_CHANGED` event to `terminal`. After a 100ms delay it prints `TERMINAL_INTRO_ENTRIES` (5 output lines listing available commands).

### 3.7 Terminal Not-Ready Logic

`RULE_TERMINAL_NOT_READY` fires when `phase !== "terminal"`. Returns `Error: Terminal is not ready yet.` for any input.

### 3.8 Entity Badge Logic

Short badge text derived by `getInternetStatusMessage` (`-utils/entity-badge.ts`):

| Entity Type | Badge Values |
|---|---|
| `pc` | `"no ip"` / IP string / `"Can't reach Google"` / `"<ip> → internet"` |
| `router-lan` | `"not configured"` / `"no DNS"` / `"configured"` |
| `router-nat` | `"disabled"` / `"enabled"` |
| `router-wan` | `"not configured"` / `"wrong credentials"` / `"authenticated"` |
| `igw` | `"waiting for auth"` / `"connected"` |
| `dns` | `"unreachable"` / `"resolving"` |
| `google` | `"can't resolve"` / `"no route"` / `"142.250.80.46"` |

---

## 4) Transition Matrices

### 4.1 Phase Transition Matrix

| Rule Order | Condition | Target Phase |
|---|---|---|
| 1 | `allDevicesPlaced == true` | `configuring` |
| 2 | `dragStatus == started` | `playing` |
| 3 | `dragStatus == finished` | `terminal` |
| 4 | `questionStatus == completed` | `completed` |

Evaluation mode: `last-match-wins`. Rule 4 supersedes all others once complete.

### 4.2 Command Outcome Matrix

| Command | Preconditions | Success Output | Failure Output |
|---|---|---|---|
| `help` | terminal phase active | command manual | n/a |
| `ifconfig` | terminal phase active | `eth0: <ip>` | `eth0: No IP assigned` |
| `nslookup google.com` | DNS in `VALID_DNS_RUNTIME` | `google.com -> 142.250.80.46` | DNS not configured error |
| `curl google.com` | WAN valid + NAT enabled + DNS valid | `HTTP/1.1 200 OK ...` + success modal | specific gate error per failed condition |
| `curl 142.250.80.46` | WAN valid + NAT enabled | `HTTP/1.1 200 OK ...` + success modal | specific gate error |

### 4.3 Modal Submission Matrix

| Modal | Action | Side Effect |
|---|---|---|
| `router-lan-config-*` | `save` | persist `dhcpEnabled`, `startIp`, `endIp`, `dnsServer` to entity data |
| `router-nat-config-*` | `save` | persist `natEnabled` to entity data |
| `router-wan-config-*` | `save` | persist `username`, `password` to entity data |
| `success` | `primary` | `ctx.navigateAway = true` |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms → Logic

| Term | Logic Usage |
|---|---|
| `SPACE_ROUTER` | Hosts all three router entities in a 1×3 grid |
| `SPACE_CONN_1` | PC-to-router cable connector |
| `SPACE_CONN_2` | Router-to-IGW fiber connector |
| `SPACE_GOOGLE` | End destination; status entity tracks reachability |

### 5.2 Validation Terms → Logic

| Term | Logic Usage |
|---|---|
| `VALID_DNS_RUNTIME` | `deriveStatus` and reachability gate for `nslookup`/`curl` |
| `VALID_DNS_MODAL` | LAN modal `dnsServer` field validator only |
| `VALID_PPPOE_USERNAME` | WAN auth exact-match check |
| `VALID_PPPOE_PASSWORD` | WAN auth exact-match check |

### 5.3 Rule Terms → Logic

| Term | Logic Usage |
|---|---|
| `RULE_LAN_SAVE` | writes DHCP/DNS values to entity data |
| `RULE_WAN_SAVE` | writes PPPoE credentials to entity data |
| `RULE_TERMINAL_ONBOARDING` | prints intro once on phase entry |
| `RULE_TERMINAL_COMMAND` | command interpreter and success gate |
| `RULE_TERMINAL_NOT_READY` | guards terminal input outside terminal phase |

---

## 6) Hard Invariants

- `GOOGLE_IP` remains `142.250.80.46`.
- `VALID_PPPOE_USERNAME` and `VALID_PPPOE_PASSWORD` remain exact-match gates.
- Terminal success remains tied to `curl` against `google.com` or `142.250.80.46` only.
- Phase rules remain declarative and evaluated with `last-match-wins`.
- Modal ID patterns remain stable.
- `SPACE_ROUTER` remains a 1×3 grid hosting three distinct router entity types.

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

- Every behavior rule ID referenced in logic exists in Section 1.9.
- Every modal pattern used in logic exists in Section 1.10.
- Phase-rule semantics state `last-match-wins`.
- `VALID_DNS_MODAL` vs `VALID_DNS_RUNTIME` split is documented in Section 1.5.
- `CTX_ALL_DEVICES_PLACED` requires both placement and topology connectivity.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
