# Webserver SSL Blueprint

Declaration-first blueprint for `webserver-ssl`.
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

Use this blueprint as the canonical source of truth for Webserver SSL question behavior.
Use game docs for runtime APIs and component contracts.

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

- Logic text must use exact term IDs from Section 1.
- Add terms before using them.

---

## 1) Canonical Term Dictionary

### 1.1 Question Identity Terms

| Term ID | Exact Value |
|---|---|
| `QUESTION_ID` | `webserver-ssl` |
| `QUESTION_TITLE` | `🔒 Secure Your Website!` |
| `QUESTION_DESCRIPTION` | `Your webserver is running, but browsers warn it's not secure. Set up HTTPS with a certificate from Let's Encrypt!` |

### 1.2 Architecture Terms

| Term ID | Value | Meaning |
|---|---|---|
| `STYLE_HYBRID_DECLARATIVE_IMPERATIVE` | `true` | Declarative definition + behavior rules + imperative page lifecycle |
| `HAS_PHASE_RULES` | `false` | `phaseRules` array is empty |
| `PHASE_TRANSITION_SOURCE` | `behavior-rule` | Terminal phase is triggered by `RULE_PHASE_TERMINAL_READY_*` behavior rules, not by phase rule evaluation |
| `ENTITY_CLICK_SOURCE` | `page-click-map` | Entity click routing is handled in page logic (`isEntityClickable`), not via behavior-rule click triggers |

### 1.3 Space Terms

| Term ID | Space ID | Kind | Grid Size |
|---|---|---|---|
| `SPACE_BROWSER` | `browser` | `grid` | 1×1 |
| `SPACE_PORT_80` | `port-80` | `grid` | 1×3 |
| `SPACE_LETSENCRYPT` | `letsencrypt` | `grid` | 1×1 |
| `SPACE_PORT_443` | `port-443` | `grid` | 1×5 |
| `SPACE_POOL_INVENTORY` | `inventory` | `pool` | — |
| `SPACE_POOL_SSL_SETUP` | `ssl-setup` | `pool` | — |
| `SPACE_POOL_SSL_ITEMS` | `ssl-items` | `pool` | — |

`SPACE_LETSENCRYPT` and `SPACE_PORT_443` are rendered only when `VIS_SSL_SPACES` is active. `SPACE_POOL_SSL_SETUP` and `SPACE_POOL_SSL_ITEMS` are only added to the drawer when their corresponding visibility conditions are met.

### 1.4 Progressive Visibility Terms

| Term ID | Trigger Condition | Effect |
|---|---|---|
| `VIS_SSL_SPACES` | `STATE_HTTP_READY == true` | Render `SPACE_LETSENCRYPT` and `SPACE_PORT_443`; add `SPACE_POOL_SSL_SETUP` to drawer; auto-open drawer |
| `VIS_SSL_ITEMS_POOL` | `STATE_CERT_ISSUED == true` | Add `SPACE_POOL_SSL_ITEMS` to drawer; auto-open drawer |

Page-level React state (`showSslSpaces`, `showSslItems`) tracks these transitions and updates `drawerSpaceIds` dynamically:
- Initial drawer: `["inventory"]`
- After `VIS_SSL_SPACES`: `["inventory", "ssl-setup"]`
- After `VIS_SSL_ITEMS_POOL`: `["inventory", "ssl-setup", "ssl-items"]`

Drawer auto-opens on each new space addition so the user notices new items.

### 1.5 Entity Family Terms

| Term ID | Entity IDs | Initial Placement |
|---|---|---|
| `ENTITY_GROUP_BASIC` | `browser-1`, `webserver-80-1`, `domain-1`, `index-html-1` | `SPACE_POOL_INVENTORY` |
| `ENTITY_GROUP_SSL_SETUP` | `webserver-443-1`, `domain-2`, `domain-3`, `redirect-https-1` | Pre-registered in definition; placed into `SPACE_POOL_SSL_SETUP` by page effect when `VIS_SSL_SPACES` triggers |
| `ENTITY_GROUP_SSL_ITEMS` | `private-key-1`, `certificate-1` | Pre-registered in definition; placed into `SPACE_POOL_SSL_ITEMS` by page effect when `VIS_SSL_ITEMS_POOL` triggers |

"Pre-registered" means entities exist in the engine state from the start but have no space assignment until the page effect places them.

### 1.6 State Terms

| Term ID | Exact Definition |
|---|---|
| `STATE_HTTP_READY` | `SPACE_PORT_80` contains: a `webserver-80` entity + a `domain` entity + at least one of (`index-html` entity OR `redirect-to-https` entity) |
| `STATE_HAS_REDIRECT` | `SPACE_PORT_80` contains: a `webserver-80` entity + a `domain` entity + a `redirect-to-https` entity |
| `STATE_HTTPS_READY` | `SPACE_PORT_443` contains: a `webserver-443` entity + a `domain` entity + an `index-html` entity + a `private-key` entity + a `certificate` entity (all five required) |
| `STATE_CERT_ISSUED` | A `domain` entity has `certificateIssued == true` in its data (written by `RULE_CERT_ISSUE`) |

`STATE_HTTP_READY` allows either `index-html` or `redirect-to-https` on port 80. `STATE_HAS_REDIRECT` is stricter: requires the redirect item specifically.

### 1.7 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

There is no `PHASE_PLAYING` or `PHASE_CONFIGURING` in this question. The drag engine is present but not actively driven (no start/finish calls). Phase transitions are imperative via behavior rules.

Terminal UI is shown when `phase === "terminal"` or `phase === "completed"` or `isCompleted === true`.

### 1.8 Behavior Rule Terms

| Term ID | Behavior Rule ID | Trigger |
|---|---|---|
| `RULE_PHASE_TERMINAL_READY_80` | `ssl.phase-terminal-ready.port-80` | `buildEntityArrivedTrigger` on any entity arriving in `SPACE_PORT_80` |
| `RULE_PHASE_TERMINAL_READY_443` | `ssl.phase-terminal-ready.port-443` | `buildEntityArrivedTrigger` on any entity arriving in `SPACE_PORT_443` |
| `RULE_CERT_ISSUE` | `ssl.certificate-issue` | modal submit on `certificate-request-*` with `issue` action |
| `RULE_SUCCESS_NAV` | `ssl.success-modal-navigate` | modal submit on `success` with `primary` action |
| `RULE_TERMINAL_ONBOARDING` | `ssl.terminal-onboarding` | `PHASE_CHANGED` event to `terminal`, fires once |
| `RULE_TERMINAL_COMMAND` | `ssl.terminal-command` | terminal input event |

`RULE_PHASE_TERMINAL_READY_80` and `RULE_PHASE_TERMINAL_READY_443` share the same guard and effect: if `httpsReady && hasRedirect && phase !== "terminal"`, call `setPhase("terminal", "ssl.behavior")`. Both rules exist because an entity arriving in either space can be the final step that completes the configuration.

There is no `RULE_TERMINAL_NOT_READY` in this question — the terminal command rule has no phase guard (only `questionStatus !== "completed"`).

### 1.9 Modal Terms

| Term ID | Modal ID Pattern | Actions | Fields |
|---|---|---|---|
| `MODAL_BROWSER_STATUS` | `browser-status-{deviceId}` | `close` | URL, connection status, port; optional TLS handshake steps |
| `MODAL_WEBSERVER_80` | `webserver-80-status-{deviceId}` | `close` | port 80, status, domain, document root, serving file |
| `MODAL_WEBSERVER_443` | `webserver-443-status-{deviceId}` | `close` | port 443, SSL key/cert status with tree display |
| `MODAL_CERT_STATUS` | `certificate-status-{deviceId}` | `close` | certificate domain, issuer, status (readonly; shown after issuance) |
| `MODAL_CERT_REQUEST` | `certificate-request-{deviceId}` | `cancel`, `issue` | `domain` (text field; validated against port-80 domain) |
| `MODAL_PRIVATE_KEY_INFO` | `private-key-info-{deviceId}` | `close` | key install status |
| `MODAL_CERT_INFO` | `certificate-info-{deviceId}` | `close` | certificate install status |
| `MODAL_REDIRECT_INFO` | `redirect-info-{deviceId}` | `close` | redirect description |
| `MODAL_INDEX_HTML` | `index-html-view-{deviceId}` | `close` | full `INDEX_HTML_CONTENT` source display |
| `MODAL_TLS_HANDSHAKE` | `tls-handshake` | `close` | `TLS_HANDSHAKE_STEPS` (8-step educational walkthrough) |
| `MODAL_SUCCESS` | `success` | `primary` | educational HTTPS content; action label: "Next question" |

`MODAL_CERT_REQUEST` is dual-mode: if the domain already has `STATE_CERT_ISSUED`, the modal opens as `MODAL_CERT_STATUS` (readonly) instead.

### 1.10 Click Handling Terms

Clickability is determined by `isEntityClickable` in page logic:

| Entity Type | Clickable When |
|---|---|
| `browser` | always |
| `webserver-80` | always |
| `webserver-443` | always |
| `index-html` | always |
| `private-key` | always |
| `certificate` | always |
| `redirect-to-https` | always |
| `domain` | only when entity is in `SPACE_LETSENCRYPT` |

### 1.11 Terminal Command Terms

| Term ID | Value |
|---|---|
| `CMD_CURL` | `curl [options] <url>` |
| `CMD_OPENSSL` | `openssl s_client <url>` |
| `CMD_HELP` | `help` or `?` |
| `CMD_CLEAR` | `clear` |
| `CURL_FLAG_VERBOSE` | `-v`, `--verbose` — produces full headers output |
| `CURL_FLAG_HEAD` | `-I`, `--head` — produces headers-only output |
| `CURL_FLAG_INSECURE` | `-k`, `--insecure` — explicitly rejected; returns error |

### 1.12 Behavior Context Fields

| Field | Type | Set By | Meaning |
|---|---|---|---|
| `ctx.navigateAway` | `boolean` | `RULE_SUCCESS_NAV` | Signals page to navigate to next question |
| `ctx.certificateDomain` | `string` | `RULE_CERT_ISSUE` | Domain string stored at certificate issuance time |

### 1.13 Domain and Content Terms

| Term ID | Value |
|---|---|
| `DEFAULT_DOMAIN` | `example.com` |
| `CERT_ISSUER` | `Let's Encrypt Authority X3` |
| `INDEX_HTML_CONTENT` | Full HTML template string defined in `constants.ts` |
| `TLS_HANDSHAKE_STEPS` | Array of 8 TLS handshake step descriptions |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase is `PHASE_SETUP`.

### 2.2 Space and Pool Declaration

- Declare all spaces from Section 1.3.
- `SPACE_POOL_INVENTORY` is always visible.
- `SPACE_LETSENCRYPT` and `SPACE_PORT_443` are conditionally rendered (see `VIS_SSL_SPACES`).
- `SPACE_POOL_SSL_SETUP` and `SPACE_POOL_SSL_ITEMS` are conditionally added to the drawer.

### 2.3 Entity Declaration

- `ENTITY_GROUP_BASIC` starts in `SPACE_POOL_INVENTORY`.
- `ENTITY_GROUP_SSL_SETUP` and `ENTITY_GROUP_SSL_ITEMS` are pre-registered with no initial space.
- Page effects place them into their respective pools when visibility conditions are met, but only if they are still unplaced (to avoid overwriting user placement).

### 2.4 Phase Declaration

- `HAS_PHASE_RULES` is `false`; `phaseRules` array is empty.
- Phase stays at `PHASE_SETUP` until `RULE_PHASE_TERMINAL_READY_80` or `RULE_PHASE_TERMINAL_READY_443` fires.
- Those rules call `setPhase("terminal", "ssl.behavior")` when `STATE_HTTPS_READY && STATE_HAS_REDIRECT && phase !== "terminal"`.
- Completion is handled by the terminal command rule; the engine marks `questionStatus = completed`.

### 2.5 Click Handling Declaration

- Clickability is type-based in page logic; see Section 1.10.
- `domain` entities are clickable **only** when placed in `SPACE_LETSENCRYPT`.

### 2.6 Behavior Declaration

- `RULE_PHASE_TERMINAL_READY_80` / `RULE_PHASE_TERMINAL_READY_443`: watch entity arrivals; trigger terminal phase when HTTPS is fully ready.
- `RULE_CERT_ISSUE`: validates and persists certificate issuance to the domain entity data.
- `RULE_SUCCESS_NAV`: sets `ctx.navigateAway = true` after success modal.
- `RULE_TERMINAL_ONBOARDING`: fires once on phase change to terminal; prints help text after 100ms.
- `RULE_TERMINAL_COMMAND`: active when `questionStatus !== "completed"` (no phase guard); handles all terminal commands.

### 2.7 AI Authoring Contract

- You may alter educational copy and modal content wording.
- You must not change canonical IDs, pool/space IDs, command semantics, or progressive visibility gates.
- You must preserve hybrid architecture: page effects manage entity placement and drawer state; behavior rules manage phase transitions and certificate logic.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap with `ENTITY_GROUP_BASIC` in `SPACE_POOL_INVENTORY`.
2. User drags `webserver-80-1`, `domain-1`, `index-html-1` into `SPACE_PORT_80`.
3. `STATE_HTTP_READY` becomes `true`.
4. Page effect: `VIS_SSL_SPACES` triggers — renders Let's Encrypt and port-443 spaces; `ENTITY_GROUP_SSL_SETUP` entities appear in `SPACE_POOL_SSL_SETUP`; drawer auto-opens.
5. User drags a `domain` entity into `SPACE_LETSENCRYPT`; clicks it to open `MODAL_CERT_REQUEST`.
6. User submits domain; `RULE_CERT_ISSUE` fires — writes `certificateIssued: true`, `verified: true`, `certificateDomain` to domain entity; sets `ctx.certificateDomain`.
7. `STATE_CERT_ISSUED` becomes `true`.
8. Page effect: `VIS_SSL_ITEMS_POOL` triggers — `ENTITY_GROUP_SSL_ITEMS` entities appear in `SPACE_POOL_SSL_ITEMS`; drawer auto-opens.
9. User places all required entities in `SPACE_PORT_443` (webserver-443 + domain + index-html + private-key + certificate).
10. User places `redirect-https-1` in `SPACE_PORT_80`.
11. `STATE_HTTPS_READY && STATE_HAS_REDIRECT` both become `true`.
12. `RULE_PHASE_TERMINAL_READY_80` or `RULE_PHASE_TERMINAL_READY_443` fires; `setPhase("terminal")`.
13. `RULE_TERMINAL_ONBOARDING` fires once; prints intro after 100ms.
14. User runs `curl https://<domain>`.
15. `RULE_TERMINAL_COMMAND` verifies `STATE_HTTPS_READY`; opens success modal; completes question.
16. `RULE_SUCCESS_NAV` fires; `ctx.navigateAway = true`; page navigates.

### 3.2 Derived State Logic

`deriveSslStatus(state)` (internal to `behaviors.ts`) and `useSslState` hook (`-utils/use-ssl-state.ts`) both derive state from entity types in each space:

| State Field | Derivation |
|---|---|
| `httpReady` | `SPACE_PORT_80` has `webserver-80` + `domain` + (`index-html` OR `redirect-to-https`) |
| `httpsReady` | `SPACE_PORT_443` has all five: `webserver-443` + `domain` + `index-html` + `private-key` + `certificate` |
| `hasRedirect` | `SPACE_PORT_80` has `webserver-80` + `domain` + `redirect-to-https` |
| `certificateIssued` | any `domain` entity in any space has `data.certificateIssued == true` |
| `port80Domain` | domain string from `domain` entity on port 80 |
| `port443Domain` | domain string from `domain` entity on port 443 |
| `certificateDomain` | domain string stored in issued domain entity data |

`useSslState` is pure derivation — no side effects. It feeds the page component for rendering decisions.

### 3.3 Certificate Issuance Logic

`MODAL_CERT_REQUEST` validation (in `modal-builders.ts`):
- Domain must pass `validateDomain` (regex: valid hostname format).
- Domain must match `port80Domain` (the domain currently on port 80).

`RULE_CERT_ISSUE` writes to the domain entity:
- `certificateIssued: true`
- `verified: true`
- `certificateDomain: <submitted domain>`

After issuance, clicking the same domain entity opens `MODAL_CERT_STATUS` (readonly) instead of `MODAL_CERT_REQUEST`.

### 3.4 Terminal Logic

Active guard: `questionStatus !== "completed"` (no phase guard — terminal commands work during `PHASE_SETUP` too, though onboarding prints only on terminal phase entry).

| Command | Logic |
|---|---|
| `curl http://...` | if `STATE_HAS_REDIRECT` → 301 + Location header; else if `STATE_HTTP_READY` → 200 + HTML body (unless `CURL_FLAG_HEAD`); else → connection refused |
| `curl https://...` | if `CURL_FLAG_INSECURE` → explicit rejection error; if not `STATE_HTTPS_READY` → SSL handshake failed; else → TLS summary + 200 + HTML; if `STATE_HTTPS_READY && STATE_HAS_REDIRECT` → also opens success modal and completes question |
| `openssl s_client https://...` | requires HTTPS URL; if not `STATE_HTTPS_READY` → error; else → certificate chain summary + verify code 0 |
| `help` or `?` | command summary |
| `clear` | clears terminal history |

`CURL_FLAG_VERBOSE` (`-v`/`--verbose`) adds full response headers to output. `CURL_FLAG_HEAD` (`-I`/`--head`) outputs headers only, no body.

### 3.5 Terminal Onboarding Logic

`RULE_TERMINAL_ONBOARDING` fires once on `PHASE_CHANGED` event to `terminal`. After 100ms it prints `TERMINAL_INTRO_ENTRIES` (8 entries listing curl, openssl, help, clear commands with the actual domain name).

### 3.6 Browser Status Modal Logic

`MODAL_BROWSER_STATUS` shows:
- URL derived from current port-80 domain.
- Connection: `"insecure"` when HTTP only, `"secure"` when HTTPS ready.
- Optional TLS handshake steps (only shown when `STATE_HTTPS_READY`).

Clicking browser opens `MODAL_BROWSER_STATUS`. Clicking "TLS Handshake" inside it opens `MODAL_TLS_HANDSHAKE`.

### 3.7 Entity Badge Logic

Short badge text derived by `getSslStatusMessage` (`-utils/entity-badge.ts`):

| Entity Type | Badge Values |
|---|---|
| `browser` | `"can't connect to {domain}"` / `"{domain} is insecure"` / `"{domain} is secured"` |
| `webserver-80` | `"not configured"` / `"serving HTTP"` / `"redirecting to HTTPS"` |
| `webserver-443` | `"not configured"` / `"missing private key"` / `"missing certificate"` / `"missing SSL"` / `"🔒 serving HTTPS"` |
| `domain` (in letsencrypt) | `"Needs Issuing"` / `"Configured"` |
| `domain` (elsewhere) | domain string |

### 3.8 Legacy Code Note

`-utils/ssl-utils.ts` contains utility functions (`isPort80Complete`, `getBrowserStatus`, etc.) that use an older `space.placedItems` API. These are **not used** by the current page implementation; `useSslState` is the active derivation path.

`-utils/certificate-context.tsx` exports `CertificateContext` and `CertificateProvider` but is **not currently used** by the page. Certificate state is stored directly on the domain entity via `createEntityPayloadWriter` and read from `state.entities`.

---

## 4) Transition Matrices

### 4.1 Progressive Visibility Matrix

| Condition | Effect |
|---|---|
| `STATE_HTTP_READY == true` | render SSL spaces; add `SPACE_POOL_SSL_SETUP` to drawer; place `ENTITY_GROUP_SSL_SETUP` entities in pool; auto-open drawer |
| `STATE_CERT_ISSUED == true` | add `SPACE_POOL_SSL_ITEMS` to drawer; place `ENTITY_GROUP_SSL_ITEMS` entities in pool; auto-open drawer |

### 4.2 Phase Transition Matrix

| Trigger | Preconditions | Effects | Next Phase |
|---|---|---|---|
| `RULE_PHASE_TERMINAL_READY_80` or `RULE_PHASE_TERMINAL_READY_443` | `STATE_HTTPS_READY && STATE_HAS_REDIRECT && phase !== "terminal"` | `setPhase("terminal", "ssl.behavior")` | `terminal` |

### 4.3 Terminal Command Outcome Matrix

| Command | Preconditions | Success | Failure |
|---|---|---|---|
| `curl http://...` | — | 301 (if redirect) or 200 (if http ready) | connection refused |
| `curl https://...` | `STATE_HTTPS_READY`; no `CURL_FLAG_INSECURE` | TLS summary + 200; may complete question | SSL handshake failed / insecure flag rejected |
| `openssl s_client https://...` | `STATE_HTTPS_READY` | certificate chain + verify code 0 | invalid URL / missing cert setup |
| `help` / `?` | — | command summary | — |
| `clear` | — | clears history | — |

### 4.4 Modal Submission Matrix

| Modal Pattern | Action | Side Effect |
|---|---|---|
| `certificate-request-*` | `issue` | write `certificateIssued: true`, `verified: true`, `certificateDomain` to domain entity; set `ctx.certificateDomain` |
| `success` | `primary` | `ctx.navigateAway = true` |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms → Logic

| Term | Logic Usage |
|---|---|
| `SPACE_PORT_80` | HTTP readiness, redirect detection, `STATE_HAS_REDIRECT` |
| `SPACE_LETSENCRYPT` | Certificate request interaction; `domain` clickability gate |
| `SPACE_PORT_443` | HTTPS readiness checks; all five components required |
| `SPACE_POOL_SSL_ITEMS` | Key and certificate reveal pool; shown after `STATE_CERT_ISSUED` |

### 5.2 State Terms → Logic

| Term | Logic Usage |
|---|---|
| `STATE_HTTP_READY` | Gate for `VIS_SSL_SPACES`; `curl http://` response |
| `STATE_HAS_REDIRECT` | Phase terminal gate; `curl https://` success trigger; `curl http://` 301 response |
| `STATE_HTTPS_READY` | `RULE_PHASE_TERMINAL_READY_*` guard; `curl https://` gate; `openssl` gate |
| `STATE_CERT_ISSUED` | Gate for `VIS_SSL_ITEMS_POOL`; dual-mode certificate modal |

### 5.3 Rule Terms → Logic

| Term | Logic Usage |
|---|---|
| `RULE_PHASE_TERMINAL_READY_80` / `RULE_PHASE_TERMINAL_READY_443` | imperative terminal phase trigger on entity arrival |
| `RULE_CERT_ISSUE` | persists certificate issuance; enables SSL items reveal |
| `RULE_TERMINAL_ONBOARDING` | prints terminal intro once on phase entry |
| `RULE_TERMINAL_COMMAND` | curl/openssl parser and completion logic |
| `RULE_SUCCESS_NAV` | post-success navigation |

---

## 6) Hard Invariants

- Canonical IDs (spaces, entities, modal IDs) remain stable.
- Certificate issuance remains domain-modal driven via `issue` action from `MODAL_CERT_REQUEST`.
- Final completion requires `STATE_HTTPS_READY && STATE_HAS_REDIRECT` (both port 443 configured and redirect on port 80).
- `CURL_FLAG_INSECURE` remains explicitly rejected with an error.
- Phase transition to terminal is triggered by behavior rules, not declarative phase rules.
- `ENTITY_GROUP_SSL_SETUP` and `ENTITY_GROUP_SSL_ITEMS` are never placed until their visibility gate is met.

---

## 7) Non-Goals

- Not full TLS cryptography simulation.
- Not full HTTP server configuration model.
- Not certificate renewal/expiration lifecycle simulation.
- Not arbitrary CA/provider selection.

---

## 8) Authoring and Verification Protocol

### 8.1 Authoring Steps

1. Update Section 1 terms first.
2. Update declarations in Section 2.
3. Update lifecycle and command matrices.
4. Re-check term-to-logic mapping.

### 8.2 Consistency Checks

- Progressive visibility gates match Section 1.4 and Section 3.2.
- Clickability rules match Section 1.10 and Section 2.5.
- Terminal command outputs and failure gates match Section 3.4 and Section 4.3.
- `RULE_PHASE_TERMINAL_READY_*` rules are documented in Section 1.8 (not as page effects).
- `STATE_HTTP_READY` and `STATE_HAS_REDIRECT` are documented as distinct conditions.
- Legacy files (`ssl-utils.ts`, `certificate-context.tsx`) are noted as unused in Section 3.8.
- No undeclared synonyms in Sections 2-5.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
