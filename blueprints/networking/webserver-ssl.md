# Webserver SSL Blueprint

Reference implementation for a behavior-driven networking question with progressive space visibility, multi-pool inventory management, conditional entity creation at runtime, and a certificate issuance flow.

Technical documentation: `src/components/game/doc/`

---

## Question Overview

- Question ID: `webserver-ssl`
- Title: `Secure Your Website!`
- Description: `Your webserver is running, but browsers warn it's not secure. Set up HTTPS with a certificate from Let's Encrypt!`
- Learning Objective: Understand HTTP vs HTTPS, SSL/TLS certificates, private keys, Certificate Authorities (Let's Encrypt), the TLS handshake, and HTTP-to-HTTPS redirects.

---

## Architecture Pattern

This question uses the behavior-driven architecture with several unique characteristics:

- `QuestionDefinition` with spaces and entities, but NO phaseRules (empty array). Phase transitions are managed imperatively by the page component.
- `useQuestionRuntime` for bootstrap and behavior reactor.
- `BehaviorDefinition` with 4 rules: certificate issuance (modal submit), success navigation, and terminal commands.
- Entity click handlers are defined as page-level callbacks (in `-page.tsx`), NOT as behavior rules. This is because click handling depends on complex derived state (port80Config, port443SslStatus, browserStatus, certificateIssued, etc.) that would be difficult to access inside behavior guards and handlers.
- Progressive disclosure: SSL-related spaces and inventory items are hidden initially and revealed as the user progresses.
- Three separate pool spaces for inventory grouping.

---

## File Structure

All files live under `src/routes/questions/networking/webserver-ssl/`:

- `index.tsx` — Route definition.
- `-page.tsx` — Main page component. Contains the entity click handler map, progressive visibility logic, phase transitions, drawer management, and SSL-specific state tracking.
- `-utils/constants.ts` — Static configuration: question metadata, space configs, 3 pool configs, 3 groups of inventory items (basic, SSL setup, SSL certificates), TLS handshake steps, HTML content.
- `-utils/definition.ts` — `SSL_DEFINITION`: QuestionDefinition with empty phaseRules and 3 entity groups.
- `-utils/behaviors.ts` — `SSL_BEHAVIORS`: 4 behavior rules (certificate issue, success navigation, terminal commands).
- `-utils/modal-builders.ts` — 9 modal builder functions for browser status, webserver status (port 80 and 443), certificate request, private key info, certificate info, redirect info, index.html view, TLS handshake, and success.
- `-utils/use-ssl-state.ts` — Custom hook computing derived SSL state from entity placement.
- `-utils/entity-label.ts` — `getSslItemLabel(type)`.
- `-utils/entity-badge.ts` — `getSslStatusMessage(item)`.
- `-utils/get-contextual-hint.ts` — `getContextualHint(state)`.

---

## Question Definition

### Spaces

4 grid spaces plus 3 pool spaces:

Grid spaces:
1. `browser` (Browser) — 1x1, maxCapacity 1. Holds the browser entity.
2. `port-80` (Port 80 HTTP) — 1x3, maxCapacity 3. Holds webserver-80, domain, and either index-html or redirect-to-https.
3. `letsencrypt` (Let's Encrypt) — 1x1, maxCapacity 1. Holds a domain entity for certificate issuance. Hidden initially, shown when HTTP is ready.
4. `port-443` (Port 443 HTTPS) — 1x5, maxCapacity 5. Holds webserver-443, domain, index-html, private-key, and certificate. Hidden initially, shown when HTTP is ready.

Pool spaces:
1. `inventory` (Inventory) — Main inventory pool, always visible. Holds basic items.
2. `ssl-setup` (SSL Setup) — Hidden initially. Items appear when HTTP is working. Holds: webserver-443, domain-2, domain-3, redirect-to-https.
3. `ssl-items` (SSL Certificates) — Hidden initially. Items appear when certificate is issued. Holds: private-key, certificate.

### Entities

Three groups of entities with different initial placement:

Group 1 — Basic items (start in `inventory` pool):
1. `browser-1` (type: `browser`) — "Browser". Allowed in inventory, browser.
2. `webserver-80-1` (type: `webserver-80`) — "Webserver (HTTP)". Allowed in inventory, port-80.
3. `domain-1` (type: `domain`) — "Domain". Allowed in inventory, port-80, port-443, letsencrypt.
4. `index-html-1` (type: `index-html`) — "index.html". Allowed in inventory, port-80, port-443.

Group 2 — SSL setup items (created but NOT placed in any space initially):
5. `webserver-443-1` (type: `webserver-443`) — "Webserver (HTTPS)". Allowed in inventory, port-443.
6. `domain-2` (type: `domain`) — "Domain". Allowed in inventory, port-80, port-443, letsencrypt.
7. `domain-3` (type: `domain`) — "Domain". Allowed in inventory, port-80, port-443, letsencrypt.
8. `redirect-https-1` (type: `redirect-to-https`) — "Redirect HTTP to HTTPS". Allowed in inventory, port-80.

Group 3 — SSL certificate items (created but NOT placed initially):
9. `private-key-1` (type: `private-key`) — "Private Key". Allowed in inventory, port-443.
10. `certificate-1` (type: `certificate`) — "Domain Certificate". Allowed in inventory, port-443.

Note: There are 3 domain entities because domain needs to be placed in port-80, letsencrypt, AND port-443 simultaneously.

### Phase Rules

The phaseRules array is EMPTY. Phase transitions are managed imperatively by the page component. The page watches `httpsReady && hasRedirect` and transitions to `terminal` phase when both are true.

---

## Progressive Disclosure

This question reveals content progressively:

1. Initially visible: `browser` space, `port-80` space, basic inventory items (browser, webserver-80, domain, index-html).
2. When `httpReady` becomes true (webserver-80 + domain + index-html placed in port-80): `letsencrypt` and `port-443` spaces appear. SSL setup items (webserver-443, domain-2, domain-3, redirect-to-https) are added to `ssl-setup` pool.
3. When `certificateIssued` becomes true (user issues a certificate via Let's Encrypt modal): SSL certificate items (private-key, certificate) are added to `ssl-items` pool.

The grid layout changes dynamically:
- Before SSL spaces visible: 2 areas (browser, port-80)
- After SSL spaces visible: 4 areas (browser, port-80, letsencrypt, port-443)

The drawer manages multiple pool space IDs and updates them as pools become visible.

---

## Behavior Rules

4 rules defined in `behaviors.ts`. The behavior context type is:

```
type SslBehaviorContext = {
  certificateDomain: string | null;
  navigateAway: boolean;
};
```

Initial context: `{ certificateDomain: null, navigateAway: false }`.

### Certificate Issue Rule

Rule `ssl.certificate-issue`:
- Trigger: `modalSubmitted(undefined, "issue")`
- Guard: `event.modalId.startsWith("certificate-request-")`
- Handler: Extracts the device ID from modal ID. Reads the `domain` value from the modal form. If domain is non-empty, updates the letsencrypt entity with `{ certificateIssued: true, verified: true, certificateDomain: domain }` and sets `context.certificateDomain` for use by terminal commands.

### Success Navigation Rule

Rule `ssl.success-modal-navigate`:
- Trigger: `modalSubmitted("success", "primary")`
- Handler: Sets `context.navigateAway = true`.

### Terminal Command Rule

Rule `ssl.terminal-command`:
- Trigger: `terminalInput()`
- Guard: `state.question.status !== "completed"`. Note: no phase guard — commands are processed regardless of phase.
- Handler: Parses input into tokens. Uses `deriveSslStatus(state)` to check current configuration. Supports these commands:

  `curl <url>` — The primary testing command. Supports flags: `-v`/`--verbose` (shows connection and TLS details), `-I`/`--head` (headers only), `-k`/`--insecure` (rejected in simulation). URL must start with `http://` or `https://`.

  For `curl http://...`:
  - If redirect is configured (port-80 has webserver-80 + domain + redirect-to-https): responds with `HTTP/1.1 301 Moved Permanently` and `Location: https://<domain>/`.
  - If HTTP is ready (port-80 has webserver-80 + domain + index-html): responds with `HTTP/1.1 200 OK` and the index.html content.
  - Otherwise: "Connection refused. Webserver not configured."

  For `curl https://...`:
  - If `--insecure` flag: error about not being supported.
  - If HTTPS not ready (port-443 missing any required item): "SSL handshake failed. Certificate not found."
  - If HTTPS ready: Shows TLS handshake summary, certificate info, and HTTP 200 response. If BOTH httpsReady AND hasRedirect are true, opens the success modal, finishes terminal, and completes the question.
  - Verbose mode adds: trying IP, connected to host, TLS version, cipher suite, certificate subject, issuer, and verify status.
  - Head mode shows only headers, not response body.

  `openssl s_client <url>` — SSL certificate inspection tool.
  - Requires `https://` URL.
  - If HTTPS not ready: "SSL handshake failed. The server doesn't have a certificate configured."
  - If ready: Shows certificate chain, subject, issuer (Let's Encrypt Authority X3), and verify return code (0 ok).

  `help` or `?` — Lists all available commands with examples.

  `clear` — Calls `terminal.clearHistory()` to clear terminal output.

  Any other command: "Unknown command" error.

Note: The `curl --help` or `curl -h` variant shows curl-specific help (usage, options, examples).

---

## Entity Click Handlers (Page-Level)

Unlike DHCP and Internet which handle clicks via behavior rules, SSL handles entity clicks in the page component via an `entityClickHandlers` map. This is because click behavior depends on complex derived state from `useSslState`.

Clickable entity types and their click behavior:

`browser` — Opens Browser Status modal showing URL, connection type (Secure/Not Secure/Can't connect), and port. If HTTPS is working, also shows TLS handshake steps.

`webserver-80` — Opens Webserver (Port 80) Status modal showing listening port (80), status, domain, document root (/var/www/html), and serving file.

`webserver-443` — Opens Webserver (Port 443) Status modal showing port (443), status, domain, private key status, certificate status, serving file, and SSL component tree.

`domain` (only clickable in letsencrypt space) — Opens the Certificate Request modal (before issuance) or Certificate Status modal (after issuance).

`index-html` — Opens a modal showing the raw index.html content.

`private-key` — Opens Private Key info modal explaining the key's role and installation status.

`certificate` — Opens Domain Certificate info modal with certificate details and installation status.

`redirect-to-https` — Opens Redirect info modal explaining HTTP 301 redirect behavior.

---

## Modals

### Certificate Request Modal

- ID pattern: `certificate-request-{deviceId}`
- Title: "Request SSL Certificate"
- Fields:
  1. `domain` — text, placeholder "example.com", validated with `validateDomainMatch(existingPort80Domain)` (must be valid domain format AND match the domain on port 80).
- Content: Explanatory text about Let's Encrypt, ACME challenge verification, and port 80 requirement.
- Actions: Cancel (ghost), "Issue Certificate" (primary, validate: true, closesModal: true, action ID: `issue`)

### Certificate Status Modal (after issuance)

- ID pattern: `certificate-status-{deviceId}`
- Title: "Domain Certificate Status"
- Content: Domain, issuer (Let's Encrypt), status (Issued), type (RSA 2048-bit), instructions to drag items to port 443.
- Actions: Close

### Browser Status Modal

- ID pattern: `browser-status-{deviceId}`
- Fields: url, connection, port (all readonly)
- Conditional content based on connection state. TLS handshake steps shown when HTTPS active.

### Webserver Port 80 Status Modal

- ID pattern: `webserver-80-status-{deviceId}`
- Fields: port (80), status, domain, document root, serving file (all readonly)

### Webserver Port 443 Status Modal

- ID pattern: `webserver-443-status-{deviceId}`
- Fields: port (443), status, domain, private key status, certificate status, serving file (all readonly)
- Includes SSL component tree showing installed/missing items.

### Private Key Info, Certificate Info, Redirect Info, Index.html View, TLS Handshake Modals

All are informational read-only modals with Close action.

### Success Modal

- ID: `success`
- Title: "Website Secured!"
- Content: Summary of what was learned: Port 80/HTTP, Port 443/HTTPS, Let's Encrypt, Private Key, Certificate, SSL Handshake, HTTP→HTTPS Redirect.
- Actions: "Next question" (primary)

---

## Derived SSL Status Function

The `deriveSslStatus(state)` function examines entity placement in port-80 and port-443 spaces:

- `httpReady`: port-80 has webserver-80 + domain + (index-html OR redirect-to-https)
- `httpsReady`: port-443 has webserver-443 + domain + index-html + certificate + private-key
- `hasRedirect`: port-80 has webserver-80 + domain + redirect-to-https
- `port80Domain`: the domain value from the domain entity in port-80

---

## Terminal Setup

Terminal intro entries list available commands: curl (http and https variants, with -v, -I flags), openssl s_client, help, clear. Terminal opens when phase is "terminal", "completed", or isCompleted. On first open, shows a full help listing.

---

## Page Layout

Responsive Grid layout:
- Before SSL spaces: 2 areas (browser, port-80), 1-2 columns
- After SSL spaces: 4 areas (browser, port-80, letsencrypt, port-443), 1-2-4 columns

Drawer contains up to 3 PoolSpace components with visibility toggling. Terminal rendered outside GameBoard.

---

## Game Flow

1. Initial state: Browser and Port 80 spaces visible. 4 basic items in inventory.
2. Set up HTTP: Drag webserver-80, domain, and index-html to Port 80. Once all 3 placed, httpReady becomes true.
3. SSL spaces appear: Let's Encrypt and Port 443 visible. SSL setup items appear in drawer.
4. Request certificate: Drag domain to Let's Encrypt, click it, enter domain name, click "Issue Certificate".
5. Certificate items appear: Private key and certificate appear in drawer.
6. Set up HTTPS: Drag webserver-443, domain, index-html, private-key, certificate to Port 443. Drag redirect-to-https to Port 80.
7. Terminal phase: httpsReady AND hasRedirect triggers terminal phase.
8. Verify: `curl http://example.com` (sees redirect), `curl https://example.com` (sees TLS + 200 OK). Success modal opens, question completes.
9. Navigate: "Next question" sets navigateAway.

---

## Educational Content

Concepts taught:
- HTTP (Port 80): Unencrypted web traffic
- HTTPS (Port 443): Encrypted web traffic using TLS
- SSL/TLS Certificate: Proves server identity, contains public key
- Private Key: Secret key on server for decryption
- Certificate Authority (Let's Encrypt): Free CA using ACME challenge
- TLS Handshake: 8-step process (Client Hello, Server Hello, Server Certificate, Server Hello Done, Certificate Verify, Client Key Exchange, Change Cipher Spec, Finished)
- HTTP→HTTPS Redirect: 301 redirect ensuring secure connections
- curl and openssl: CLI tools for testing web connections

Entity tooltips provide explanations with links to MDN and other resources.
