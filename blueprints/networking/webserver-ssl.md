# Webserver SSL Blueprint

Declaration-first blueprint for `webserver-ssl`.
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
| `HAS_PHASE_RULES` | `false` | `phaseRules` is empty |
| `PHASE_TRANSITION_SOURCE` | `page-effect` | Page transitions to terminal when HTTPS + redirect are ready |
| `ENTITY_CLICK_SOURCE` | `page-click-map` | Entity click handling is page-level, not behavior-rule click triggers |

### 1.3 Space Terms

| Term ID | Space ID | Kind |
|---|---|---|
| `SPACE_BROWSER` | `browser` | `grid` |
| `SPACE_PORT_80` | `port-80` | `grid` |
| `SPACE_LETSENCRYPT` | `letsencrypt` | `grid` |
| `SPACE_PORT_443` | `port-443` | `grid` |
| `SPACE_POOL_INVENTORY` | `inventory` | `pool` |
| `SPACE_POOL_SSL_SETUP` | `ssl-setup` | `pool` |
| `SPACE_POOL_SSL_ITEMS` | `ssl-items` | `pool` |

### 1.4 Progressive Visibility Terms

| Term ID | Meaning |
|---|---|
| `VIS_SSL_SPACES` | Show `SPACE_LETSENCRYPT` and `SPACE_PORT_443` once HTTP setup is ready |
| `VIS_SSL_SETUP_POOL` | Show `SPACE_POOL_SSL_SETUP` once `VIS_SSL_SPACES` is active |
| `VIS_SSL_ITEMS_POOL` | Show `SPACE_POOL_SSL_ITEMS` once certificate is issued |

### 1.5 Entity Family Terms

| Term ID | IDs | Initial Placement |
|---|---|---|
| `ENTITY_GROUP_BASIC` | `browser-1`, `webserver-80-1`, `domain-1`, `index-html-1` | `SPACE_POOL_INVENTORY` |
| `ENTITY_GROUP_SSL_SETUP` | `webserver-443-1`, `domain-2`, `domain-3`, `redirect-https-1` | created, no initial space |
| `ENTITY_GROUP_SSL_ITEMS` | `private-key-1`, `certificate-1` | created, no initial space |

### 1.6 State Terms

| Term ID | Meaning |
|---|---|
| `STATE_HTTP_READY` | Port 80 has webserver + domain + (index.html or redirect) |
| `STATE_HTTPS_READY` | Port 443 has webserver + domain + index.html + private key + certificate |
| `STATE_HAS_REDIRECT` | Port 80 has webserver + domain + redirect item |
| `STATE_CERT_ISSUED` | A domain entity has `certificateIssued == true` |

### 1.7 Phase Terms

| Term ID | Phase Value |
|---|---|
| `PHASE_SETUP` | `setup` |
| `PHASE_TERMINAL` | `terminal` |
| `PHASE_COMPLETED` | `completed` |

### 1.8 Behavior Rule Terms

| Term ID | Behavior Rule ID |
|---|---|
| `RULE_CERT_ISSUE` | `ssl.certificate-issue` |
| `RULE_SUCCESS_NAV` | `ssl.success-modal-navigate` |
| `RULE_TERMINAL_COMMAND` | `ssl.terminal-command` |

### 1.9 Modal Terms

| Term ID | Modal ID Pattern | Actions |
|---|---|---|
| `MODAL_BROWSER_STATUS` | `browser-status-{deviceId}` | `close` |
| `MODAL_WEBSERVER_80` | `webserver-80-status-{deviceId}` | `close` |
| `MODAL_WEBSERVER_443` | `webserver-443-status-{deviceId}` | `close` |
| `MODAL_CERT_STATUS` | `certificate-status-{deviceId}` | `close` |
| `MODAL_CERT_REQUEST` | `certificate-request-{deviceId}` | `cancel`, `issue` |
| `MODAL_PRIVATE_KEY_INFO` | `private-key-info-{deviceId}` | `close` |
| `MODAL_CERT_INFO` | `certificate-info-{deviceId}` | `close` |
| `MODAL_REDIRECT_INFO` | `redirect-info-{deviceId}` | `close` |
| `MODAL_INDEX_HTML` | `index-html-view-{deviceId}` | `close` |
| `MODAL_TLS_HANDSHAKE` | `tls-handshake` | `close` |
| `MODAL_SUCCESS` | `success` | `primary` |

### 1.10 Terminal Command Terms

| Term ID | Value |
|---|---|
| `CMD_CURL` | `curl [options] <url>` |
| `CMD_OPENSSL` | `openssl s_client <url>` |
| `CMD_HELP` | `help` or `?` |
| `CMD_CLEAR` | `clear` |
| `CURL_FLAG_VERBOSE` | `-v`, `--verbose` |
| `CURL_FLAG_HEAD` | `-I`, `--head` |
| `CURL_FLAG_INSECURE` | `-k`, `--insecure` |

### 1.11 Domain Terms

| Term ID | Value |
|---|---|
| `DEFAULT_DOMAIN` | `example.com` |
| `CERT_ISSUER` | `Let's Encrypt Authority X3` |

---

## 2) Declarative Specification

### 2.1 Meta Declaration

- Meta fields must match Section 1.1.
- Initial phase must be `PHASE_SETUP`.

### 2.2 Space and Pool Declaration

- Declare all spaces in Section 1.3.
- `SPACE_POOL_INVENTORY` starts visible.
- `SPACE_POOL_SSL_SETUP` and `SPACE_POOL_SSL_ITEMS` start hidden.
- `SPACE_LETSENCRYPT` and `SPACE_PORT_443` are rendered only when `VIS_SSL_SPACES` is true.

### 2.3 Entity Declaration

- `ENTITY_GROUP_BASIC` starts in `SPACE_POOL_INVENTORY`.
- `ENTITY_GROUP_SSL_SETUP` and `ENTITY_GROUP_SSL_ITEMS` are pre-registered but unplaced.
- On progressive visibility events:
  - Add SSL setup entities to `SPACE_POOL_SSL_SETUP` if currently unplaced.
  - Add SSL item entities to `SPACE_POOL_SSL_ITEMS` if currently unplaced.

### 2.4 Phase Declaration

- `HAS_PHASE_RULES` is false.
- Transition to `PHASE_TERMINAL` is imperative and occurs when both `STATE_HTTPS_READY` and `STATE_HAS_REDIRECT` are true.
- Terminal UI is shown only in `PHASE_TERMINAL`, `PHASE_COMPLETED`, or completed-question state.

### 2.5 Click Handling Declaration

- Clickability is type-based in page logic:
  - Always clickable: `browser`, `webserver-80`, `webserver-443`, `index-html`, `private-key`, `certificate`, `redirect-to-https`
  - Conditionally clickable: `domain` only when domain entity is in `SPACE_LETSENCRYPT`

### 2.6 Behavior Declaration

- `RULE_CERT_ISSUE`: handles certificate issue modal submit (`issue` action).
- `RULE_SUCCESS_NAV`: navigates after success modal primary action.
- `RULE_TERMINAL_COMMAND`: terminal parser and success gate.

### 2.7 AI Authoring Contract

- You may alter educational copy and modal content wording.
- You must not change canonical IDs, pool/space IDs, command semantics, or progressive visibility gates.
- You must preserve hybrid architecture: page effects + behavior rules.

---

## 3) Lifecycle and Logic Specification

### 3.1 Runtime Lifecycle Sequence

1. Bootstrap base spaces and basic entities.
2. User configures Port 80 HTTP path.
3. When `STATE_HTTP_READY` is true, reveal SSL spaces and SSL setup pool.
4. User requests certificate at Let's Encrypt domain slot.
5. On successful issue, mark domain as issued and reveal SSL items pool.
6. User places private key + certificate and configures redirect.
7. When `STATE_HTTPS_READY` and `STATE_HAS_REDIRECT` are both true, transition to terminal.
8. User validates with terminal commands; success modal completes question.

### 3.2 HTTP/HTTPS Derived State Logic

- `STATE_HTTP_READY` allows either `index-html` or redirect on port 80.
- `STATE_HAS_REDIRECT` is stricter: requires redirect item on port 80.
- `STATE_HTTPS_READY` requires all five HTTPS components on port 443.

### 3.3 Certificate Issuance Logic

- Certificate request modal validates requested domain format and match with current port-80 domain.
- `RULE_CERT_ISSUE` writes:
  - `certificateIssued: true`
  - `verified: true`
  - `certificateDomain: <submitted-domain>`
- `STATE_CERT_ISSUED` enables SSL items reveal.

### 3.4 Terminal Logic

- Guard: terminal commands run while question is not completed (no phase guard).
- `curl` behavior:
  - `http://...`
    - if redirect configured: 301 response + location header
    - else if HTTP ready: 200 response + HTML body (unless head-only)
    - else: connection refused error
  - `https://...`
    - reject `--insecure`
    - require `STATE_HTTPS_READY`
    - output TLS summary + 200 response
    - if `STATE_HTTPS_READY && STATE_HAS_REDIRECT`, open success modal and complete
- `openssl s_client https://...`
  - requires HTTPS URL
  - requires `STATE_HTTPS_READY`
  - returns certificate chain summary and verify code 0
- `help/?` shows command summary; `clear` clears history.

### 3.5 Modal and Status Logic

- Browser, webserver, and certificate-related modals are informational status views.
- Domain modal in Let's Encrypt is dual-mode:
  - request mode before issuance
  - status mode after issuance

---

## 4) Transition Matrices

### 4.1 Progressive Visibility Matrix

| Condition | Effect |
|---|---|
| `STATE_HTTP_READY == true` | show SSL spaces + add SSL setup entities to setup pool |
| `STATE_CERT_ISSUED == true` | show SSL items pool + add key/cert entities |

### 4.2 Phase Transition Matrix

| Trigger | Preconditions | Effects | Next Phase |
|---|---|---|---|
| page effect | `STATE_HTTPS_READY && STATE_HAS_REDIRECT` and phase != terminal | request phase transition | `terminal` |

### 4.3 Terminal Command Outcome Matrix

| Command | Preconditions | Success | Failure |
|---|---|---|---|
| `curl http://...` | none | 301 (if redirect) or 200 (if http ready) | connection refused |
| `curl https://...` | https ready | TLS + 200; may complete question | SSL handshake failed / unsupported insecure flag |
| `openssl s_client https://...` | https ready | certificate chain details | invalid URL or missing cert setup |

### 4.4 Modal Submission Matrix

| Modal Pattern | Action | Side Effect |
|---|---|---|
| `certificate-request-*` | `issue` | mark certificate issued + store certificate domain |
| `success` | `primary` | set navigate-away context |

---

## 5) Term-to-Logic Link Index

### 5.1 Space Terms -> Logic

| Term | Logic Usage |
|---|---|
| `SPACE_PORT_80` | HTTP readiness and redirect checks |
| `SPACE_LETSENCRYPT` | Certificate request interaction point |
| `SPACE_PORT_443` | HTTPS readiness checks |
| `SPACE_POOL_SSL_ITEMS` | key/certificate reveal pool |

### 5.2 State Terms -> Logic

| Term | Logic Usage |
|---|---|
| `STATE_HTTP_READY` | unlock SSL stage |
| `STATE_CERT_ISSUED` | unlock certificate items |
| `STATE_HTTPS_READY` | HTTPS command success gate |
| `STATE_HAS_REDIRECT` | terminal transition and final success gate |

### 5.3 Rule Terms -> Logic

| Term | Logic Usage |
|---|---|
| `RULE_CERT_ISSUE` | persists issuance state |
| `RULE_TERMINAL_COMMAND` | curl/openssl parser and completion logic |
| `RULE_SUCCESS_NAV` | post-success navigation |

---

## 6) Hard Invariants

- Canonical IDs (spaces, entities, modal IDs) remain stable.
- Certificate issuance remains domain-modal driven via `issue` action.
- Final completion requires both HTTPS readiness and HTTP-to-HTTPS redirect.
- `curl --insecure` remains explicitly unsupported.

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

- Progressive visibility gates match Sections 1.4 and 3.2.
- Clickability rules match Section 2.5.
- Terminal command outputs and failure gates match Section 3.4.
- No undeclared synonyms in Sections 2-5.

### 8.3 Quality Gates

- `pnpm check:biome`
- `pnpm check:tsc`
