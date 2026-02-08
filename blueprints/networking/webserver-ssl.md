# New Question Template

Fill out this template to define a new question. This information will be used to implement the question using the game engine.

---

## 1. Question Overview

**Question ID:** `webserver-ssl`

**Question Title:** `🔒 Secure Your Website!`

**Question Description:** `Your webserver is running, but browsers warn it's not secure. Set up HTTPS with a certificate from Let's Encrypt!`

**Learning Objective:** `Understand how web servers serve content over HTTP and HTTPS, including ports (80 vs 443), SSL certificates, the role of Certificate Authorities, and how browsers establish secure connections.`

---

## 2. Phase 1: Space Game

**Type:** Drag-and-drop

**Goal:** Set up a webserver with HTTP, then upgrade to HTTPS by obtaining and installing an SSL certificate from Let's Encrypt

### 2.1 GridSpace and PoolSpace Architecture

**Engine Capability:** This question uses conditional space visibility and dynamic pool items that appear based on game progress.

**Architecture Design Pattern:**

```
Question State
  ├── GridSpace 1 (Browser) - Always visible
  ├── GridSpace 2 (Port 80) - Always visible
  ├── GridSpace 3 (Let's Encrypt) - Conditional: appears after HTTP works but shows "Not Secure"
  ├── GridSpace 4 (Port 443) - Conditional: appears with GridSpace 3
  │
  ├── PoolSpace 1 (Basic Components) - Always visible
  │   ├── browser
  │   ├── webserver-80
  │   ├── domain
  │   └── index-html
  │
  ├── PoolSpace 2 (SSL Setup) - Conditional: appears after HTTP works (browser warning)
  │   ├── webserver-443
  │   ├── domain
  │   ├── domain-ssl
  │   └── redirect-to-https
  │
  ├── PoolSpace 3 (SSL Certificate) - Conditional: appears after certificate is issued
  │   ├── private-key
  │   └── certificate
```

### 2.1.1 GridSpace Setup

**GridSpace Layout:** Four grid spaces, with spaces 3 and 4 appearing conditionally.

**GridSpace Order:** `browser` → `port-80` → `letsencrypt` → `port-443`

| GridSpace Key | Title | Grid Size | Max Items | Allowed Item Types |
|------------|-------|-----------|-----------|-------------------|
| browser | Browser | 1 x 1 | 1 | ["browser"] |
| port-80 | Port 80 (HTTP) | 3 x 1 | 3 | ["webserver-80", "domain", "index-html", "redirect-to-https"] |
| letsencrypt | Let's Encrypt | 1 x 1 | 1 | ["domain-ssl"] |
| port-443 | Port 443 (HTTPS) | 5 x 1 | 5 | ["webserver-443", "domain", "index-html", "private-key", "certificate"] |

**Interaction Rules:**
- Placed items can be repositioned within or across spaces (if allowed by item rules)
- `index-html` can be placed in both port-80 and port-443 spaces (single pool item)
- `domain` items are separate instances for port-80/port-443
- `domain-ssl` can ONLY be placed in the Let's Encrypt space
- `redirect-to-https` can ONLY be placed in port-80; port-80 is considered complete with `index-html` **or** `redirect-to-https`

**GridSpace Visibility Rules:**

| GridSpace Key | Initial Visibility | Show Condition | Hide Condition | Notes |
|------------|-------------------|----------------|----------------|----|
| browser | Always visible | Always | Never | User's browser - core item |
| port-80 | Always visible | Always | Never | HTTP setup - core item |
| letsencrypt | Hidden initially | `port-80 complete` (browser shows warning) | Never (persistent once shown) | Appears when HTTP works |
| port-443 | Hidden initially | `port-80 complete` (browser shows warning) | Never (persistent once shown) | Appears when HTTP works, alongside letsencrypt |

**Implementation Note:** Once spaces 3 & 4 are shown (when HTTP is working), they remain visible for the rest of the question. Do NOT hide them again.

### 2.1.2 PoolSpace Setup

**PoolSpace Configuration:** This question uses three pool groups: basic (always visible), SSL setup (appears after HTTP works), and SSL certificate (appears after issuing a certificate).

**PoolSpace Visibility Timeline:**

| PoolSpace Key | Initial Items | Phase 1 (Setup) | Phase 2 (SSL Setup) | Phase 3 (SSL Issued) | Phase 4 (HTTPS Ready) |
|---|---|---|---|---|---|
| basic | browser-1, webserver-80-1, domain-1, index-html-1 | All 4 visible | (no change) | (no change) | (no change) |
| ssl-setup | webserver-443-1, domain-2, domain-3, redirect-https-1 | Hidden | Visible after HTTP works | (no change) | (no change) |
| ssl-items | private-key-1, certificate-1 | Hidden | Hidden | Visible after certificate issued | (no change) |

**Item Visibility Rules:**

| Item ID | Initial State | Becomes Visible When | Notes |
|---------|---|---|---|
| `browser-1` | Visible | Always visible | Core HTTP item |
| `webserver-80-1` | Visible | Always visible | Core HTTP item |
| `domain-1` | Visible | Always visible | Used for port 80 |
| `index-html-1` | Visible | Always visible | Single index.html pool item used in port 80 or port 443 |
| `webserver-443-1` | Hidden | HTTP works (browser warning) | HTTPS webserver |
| `domain-2` | Hidden | HTTP works (browser warning) | Secondary domain instance for port 443 |
| `domain-3` | Hidden | HTTP works (browser warning) | Domain (SSL) for Let's Encrypt |
| `redirect-https-1` | Hidden | HTTP works (browser warning) | HTTP→HTTPS redirect item |
| `private-key-1` | Hidden | Certificate issued from Domain (SSL) modal | Appears after certificate issuance |
| `certificate-1` | Hidden | Certificate issued from Domain (SSL) modal | Appears after certificate issuance |

**Implementation Note:** Pool panel itself is always visible. Items are added/removed from pool as conditions are met.

### 2.2 Item Types

Define the types of items in this question. Icons are from [Iconify](https://icon-sets.iconify.design/).

| Type | Display Label | Icon | Description |
|------|---------------|------|-------------|
| browser | Browser | `mdi:web` | Web browser that visits websites |
| webserver-80 | Webserver (HTTP) | `mdi:server` | Web server listening on port 80 |
| webserver-443 | Webserver (HTTPS) | `mdi:server-security` | Web server listening on port 443 |
| domain | Domain | `mdi:domain` | Domain name (example.com) |
| domain-ssl | Domain (SSL) | `mdi:domain` | Domain item used to request an SSL certificate |
| index-html | index.html | `mdi:file-code` | The main webpage file |
| private-key | Private Key | `mdi:key` | Server's private key (keep secret!) |
| certificate | Domain Certificate | `mdi:card-account-details` | SSL certificate (shared with browsers) |
| redirect-to-https | ↪️ Redirect | `mdi:arrow-right-bold` | Redirects HTTP requests to HTTPS |

**Click Behavior:**

| Type | On Click | Opens Modal |
|------|----------|-------------|
| browser | View status | browser-status |
| webserver-80 | View configuration | webserver-80-status |
| webserver-443 | View configuration | webserver-443-status |
| domain | (no modal) | - |
| domain-ssl | Request certificate | certificate-request / certificate-status |
| index-html | View content | index-html-view |
| private-key | View info | private-key-info |
| certificate | View certificate | certificate-info |
| redirect-to-https | View info | redirect-info |

### 2.3 Item States & Status Messages

#### Item Type: `browser`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "can't connect to example.com" | Port 80 not configured or browser not connected |
| warning | "example.com is insecure" | HTTP works but HTTPS is not ready |
| success | "example.com is secured" | HTTPS ready and redirect configured |

#### Item Type: `webserver-80`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "not configured" | Webserver missing domain or content |
| warning | "serving HTTP" | Port 80 complete (index.html) but no redirect |
| success | "redirecting to HTTPS" | redirect-to-https is placed on port 80 |

#### Item Type: `webserver-443`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "not configured" | Missing domain or index.html |
| warning | "missing SSL" | Domain + index.html set, but key/cert missing |
| success | "🔒 serving HTTPS" | Domain + index.html + key + cert installed |

#### Item Type: `domain`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| idle | "example.com" | Default display (status not set by game logic) |

#### Item Type: `domain-ssl`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | "Needs Issuing" | Certificate has not been issued yet |
| success | "Configured" | Certificate issued on this domain |


### 2.4 Connection Rules

**Connection Method:** Items must be placed in the correct space to function together.

**Port 80 GridSpace Requirements:**

| Required Items | Optional Items | Result |
|----------------|----------------|--------|
| webserver-80 + domain + index-html | - | HTTP serving works |
| webserver-80 + domain + redirect-to-https | - | HTTP redirects to HTTPS |

**Port 443 GridSpace Requirements:**

| Required Items | Result |
|----------------|--------|
| webserver-443 + domain + index-html | Shows "missing SSL" warning |
| webserver-443 + domain + index-html + private-key | Shows "missing certificate" |
| webserver-443 + domain + index-html + certificate | Shows "missing private key" |
| webserver-443 + domain + index-html + private-key + certificate | 🔒 HTTPS working! |

**Let's Encrypt GridSpace Requirements:**

| Required Items | Condition | Result |
|----------------|-----------|--------|
| domain-ssl | Click the Domain (SSL) item | Opens certificate request modal |
| domain-ssl (configured) | Issue Certificate with matching Port 80 domain | Certificate issued, key + cert appear in pool |

**Invalid Placements:**

| Placement | Error Message |
|-----------|---------------|
| private-key in port-80 | ❌ Private key is only used for HTTPS (port 443) |
| certificate in port-80 | ❌ Certificate is only used for HTTPS (port 443) |
| redirect-to-https in port-443 | ❌ Redirect only makes sense on port 80 |
| webserver-80 in port-443 | ❌ This webserver is for HTTP (port 80) |
| webserver-443 in port-80 | ❌ This webserver is for HTTPS (port 443) |
| domain-ssl in other spaces | Not allowed (no explicit error hint) |

### 2.5 Pool Items

| ID | Type | Display Name | Quantity | Visibility Phase | Notes |
|----|------|--------------|----------|---|-------|
| `browser-1` | browser | Browser | 1 | Always visible | User's browser - core item |
| `webserver-80-1` | webserver-80 | Webserver (HTTP) | 1 | Always visible | Listens on port 80 |
| `domain-1` | domain | Domain | 1 | Always visible | For port 80 setup |
| `index-html-1` | index-html | index.html | 1 | Always visible | Can be used on port 80 or port 443 |
| `webserver-443-1` | webserver-443 | Webserver (HTTPS) | 1 | After HTTP works | Appears in SSL setup group |
| `domain-2` | domain | Domain | 1 | After HTTP works | Secondary domain instance for port 443 |
| `domain-3` | domain-ssl | Domain (SSL) | 1 | After HTTP works | Used in Let's Encrypt space |
| `redirect-https-1` | redirect-to-https | Redirect | 1 | After HTTP works | HTTP→HTTPS redirect item |
| `private-key-1` | private-key | Private Key | 1 | After certificate issued | Appears when certificate is issued |
| `certificate-1` | certificate | Domain Certificate | 1 | After certificate issued | Appears when certificate is issued |

**Important: Item Duplication**

Items `domain-1` and `domain-2` represent the SAME conceptual domain but as separate pool instances:

- **`domain-1`** is intended for port 80.
- **`domain-2`** is intended for port 443 (and can also be placed on port 80).
- **`domain-3`** (`domain-ssl`) is a separate item used only in the Let's Encrypt space.

`index-html-1` is a single pool item that can be placed in either port 80 or port 443 (no duplicate index.html pool item).

### 2.6 Pool Tooltips

| Item Type | Tooltip Text | Learn More URL |
|-----------|--------------|----------------|
| browser | A web browser is software that allows users to access websites. You'll use it to test your webserver configuration. | https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_browser |
| webserver-80 | An HTTP webserver serves unencrypted content on port 80. Anyone on the network can see what's being sent! | https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server |
| webserver-443 | An HTTPS webserver serves encrypted content on port 443. It requires an SSL certificate and private key. | https://developer.mozilla.org/en-US/docs/Web/Security/Secure_contexts |
| domain | A domain name (like example.com) is the address where your website can be found on the internet. | https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_domain_name |
| domain-ssl | No tooltip configured (falls back to no info icon). | (none) |
| index-html | The index.html file is the default page your webserver serves when someone visits your website. | https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Document_and_website_structure |
| private-key | 🔑 The private key is SECRET. It stays on your server and is used to decrypt incoming HTTPS traffic. NEVER share it with anyone! | https://www.digicert.com/faq/what-is-a-private-key.htm |
| certificate | 📜 The domain certificate contains your public key and proves your server's identity to browsers. It's PUBLIC - you share it with visitors. | https://www.digicert.com/faq/what-is-an-ssl-certificate.htm |
| redirect-to-https | ↪️ A redirect sends HTTP visitors to HTTPS automatically. This ensures everyone uses the secure connection, even if they type http:// | https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections |

### 2.7 Modals

#### 2.7.1 Modal Triggers

| Item Type | Modal ID | Trigger |
|-----------|----------|---------|
| browser | browser-status-{deviceId} | Click on placed browser |
| webserver-80 | webserver-80-status-{deviceId} | Click on placed webserver-80 |
| webserver-443 | webserver-443-status-{deviceId} | Click on placed webserver-443 |
| index-html | index-html-view-{deviceId} | Click on placed index.html |
| domain-ssl | certificate-request-{deviceId} / certificate-status-{deviceId} | Click Domain (SSL) in Let's Encrypt space |
| private-key | private-key-info-{deviceId} | Click on placed private key |
| certificate | certificate-info-{deviceId} | Click on placed certificate |
| redirect-to-https | redirect-info-{deviceId} | Click on placed redirect |

#### 2.7.2 Browser Status Modal

**ID Pattern:** `browser-status-{deviceId}`

**Title:** `Browser`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| url | readonly | URL | `item.data.url` or "Not connected" |
| connection | readonly | Connection | `item.data.connection` or "Can't connect" |
| port | readonly | Port | `item.data.port` or "—" |

**Visual: Connection Status Indicator**

```
❌ Can't connect
   └─ No webserver configured

⚠️ Not Secure
   └─ ⚠️ Your connection is not private

🔒 Secure
   └─ Certificate: example.com
   └─ Issued by: Let's Encrypt
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.3 Webserver (Port 80) Status Modal

**ID Pattern:** `webserver-80-status-{deviceId}`

**Title:** `Webserver Status (Port 80)`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| port | readonly | Listening Port | 80 |
| status | readonly | Status | "Not configured" / "Serving HTTP" / "Redirecting to HTTPS" |
| domain | readonly | Domain | (from placed domain item or "Not set") |
| documentRoot | readonly | Document Root | /var/www/html |
| servingFile | readonly | Serving | "/var/www/html/index.html" / "Redirect to HTTPS" / "Nothing" |

**Info Text:**
> Port 80 is the default port for HTTP (unencrypted) web traffic. Browsers automatically connect to port 80 when you type `http://` URLs.

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.4 Webserver (Port 443) Status Modal

**ID Pattern:** `webserver-443-status-{deviceId}`

**Title:** `Webserver Status (Port 443)`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| port | readonly | Listening Port | 443 |
| status | readonly | Status | "Not configured" / "Missing SSL" / "Serving HTTPS" |
| domain | readonly | Domain | (from placed domain item or "Not set") |
| privateKey | readonly | Private Key | "Not installed" / "✓ Installed" |
| certificate | readonly | Certificate | "Not installed" / "✓ Installed (example.com)" |
| servingFile | readonly | Serving | "/var/www/html/index.html" / "Nothing" |

**Info Text:**
> Port 443 is the default port for HTTPS (encrypted) web traffic. It requires an SSL certificate and private key to establish secure connections.

**SSL Status Indicator:**

```
❌ Missing SSL
   ├─ Private Key: Not installed
   └─ Certificate: Not installed

⚠️ Incomplete SSL
   ├─ Private Key: ✓ Installed
   └─ Certificate: Not installed

🔒 SSL Configured
   ├─ Private Key: ✓ Installed
   └─ Certificate: ✓ Installed (example.com)
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.5 Certificate Request Modal

**ID Pattern:** `certificate-request-{deviceId}` (request) / `certificate-status-{deviceId}` (issued)

**Title:** `Request SSL Certificate` / `📜 Domain Certificate Status`

**Modal State:** This modal is stateful. If the Domain (SSL) item already has `certificateIssued: true`, the click opens the status view (`certificate-status-*`) instead of the request form (`certificate-request-*`).

**Fields:**

| Field ID | Kind | Label | Default | Validation |
|----------|------|-------|---------|------------|
| domain | text | Domain Name | (current domain) | Required, must be a valid domain string |

**Status View (when already issued):**
- Shows read-only certificate details (domain, issuer, status)
- Only action is **Close**

**Help Links:**

| Field ID | Link Text | URL |
|----------|-----------|-----|
| (none) | (not configured) | (n/a) |

**Info Text:**
> Get a free SSL certificate from Let's Encrypt for your domain.
>
> To prove ownership, Let's Encrypt will verify: `http://example.com/.well-known/acme-challenge/xxx`
>
> Make sure your Port 80 webserver is configured before requesting!

**Field Validation Rules:**

| Field | Validation Rule | Error Message |
|-------|---|---|
| domain | Must not be empty | Enter your domain name |
| domain | Must match domain format | "Invalid domain format. Use: example.com" |

**Cross-Space Validation (when "Issue Certificate" clicked):**

Before issuing certificate, the engine only checks that the entered domain matches the Port 80 domain string (no hard validation of port-80 completeness):

| Check # | Requirement | Error if Not Met |
|---------|---|---|
| 1 | Entered domain matches domain string for port-80 | ❌ Domain must match: {port-80-domain} |

**Note:** If no domain is placed on port-80, the default domain string is `example.com`, so the modal will only accept `example.com`.

**Logic Flow:**

```
User clicks "Issue Certificate"
  ↓
Validate field: domain not empty + valid format?
  ├─ NO → Show error: "Enter your domain name" / invalid domain
  └─ YES → Continue
  ↓
Check if entered domain matches port-80 domain?
  ├─ NO → Show error: "Domain must match: example.com"
  └─ YES → Continue
  ↓
✅ Certificate Issued!
  - domain-ssl item gets `certificateIssued: true`
  - domain-ssl item stores `certificateDomain`
  - ssl-items pool group becomes visible
```

**Actions:**

| ID | Label | Variant | Validates Field? | Validates Cross-Space? | Closes? |
|----|-------|---------|------------------|------------------------|---------|
| cancel | Cancel | ghost | No | No | Yes |
| issue | Issue Certificate | primary | Yes | Yes (domain match only) | No (stays open on success) |

**On Issue (Success):**

- domain-ssl item is updated with `certificateIssued` and `certificateDomain`
- Items appear in pool: `private-key-1`, `certificate-1`
- Modal remains open until closed manually

**On Issue (Failure):**

- Show error message based on failed check
- Modal stays open so user can fix and retry

#### 2.7.6 Private Key Info Modal

**ID Pattern:** `private-key-info-{deviceId}`

**Title:** `Private Key`

**Content:**

```
🔑 Private Key for example.com

This is your server's SECRET key.
- Used to decrypt incoming HTTPS traffic
- Must be installed on your webserver (port 443)
- NEVER share this with anyone!

Status: [In Pool] / [Installed on server]
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.7 Certificate Info Modal

**ID Pattern:** `certificate-info-{deviceId}`

**Title:** `Domain Certificate`

**Content:**

```
📜 Domain Certificate

Subject: example.com
Issuer: Let's Encrypt Authority X3
Valid: 90 days

This certificate is sent to browsers to prove your server's identity.
It contains your public key (browsers use this to encrypt data to you).

Status: [In Pool] / [Installed on server]
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.8 Redirect Info Modal

**ID Pattern:** `redirect-info-{deviceId}`

**Title:** `HTTP to HTTPS Redirect`

**Content:**

```
↪️ Redirect to HTTPS

When a visitor goes to:
  http://example.com

They will be automatically redirected to:
  https://example.com

This ensures all visitors use the secure connection!

Server response: HTTP 301 Moved Permanently
Location: https://example.com/
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.9 Index.html View Modal

**ID Pattern:** `index-html-view-{deviceId}`

**Title:** `index.html`

**Content:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Welcome to example.com</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>Welcome to example.com</h1>
  <p>This is your website running on a secure HTTPS connection!</p>
</body>
</html>
```

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

---

**State Dependencies (across all components):**

```
Browser can connect (HTTP)  ← Port 80: webserver-80 + domain + (index-html or redirect)
Browser shows warning       ← HTTP works but HTTPS not ready
GridSpaces 3 & 4 appear       ← Port 80 complete (browser warning)
SSL setup pool appears ← Port 80 complete (browser warning)
SSL cert pool appears  ← Domain (SSL) certificate issued
HTTPS works                 ← Port 443: webserver-443 + domain + index-html + key + cert
Redirect enabled            ← redirect-to-https placed on port 80
Browser shows secure        ← Port 443 complete + redirect on port 80
```

### 2.8 TLS Handshake Steps Display

**Trigger:** When browser status changes to secure (HTTPS ready + redirect), display the TLS handshake steps

**Implementation:** Steps are appended as text inside the Browser status modal once TLS handshake is triggered.

**Handshake Steps (for educational reference):**

| Step | Direction | Phase Name | Description | Real-World Time |
|------|-----------|-----------|-------------|-----------------|
| 1 | Browser → Server | Client Hello | Browser offers TLS version and cipher suites | 0.5s |
| 2 | Server → Browser | Server Hello | Server chooses TLS version and cipher | 0.5s |
| 3 | Server → Browser | Server Certificate | Server sends SSL certificate (example.com) | 0.5s |
| 4 | Server → Browser | Server Hello Done | Server finished negotiating | 0.5s |
| 5 | Browser (internal) | Certificate Verify | Browser verifies certificate | 0.5s |
| 6 | Browser → Server | Client Key Exchange | Browser sends key exchange data | 0.5s |
| 7 | Both | Change Cipher Spec | Switch to encrypted channel | 0.5s |
| 8 | Both | Finished | Handshake complete | 0.5s |

**Display Format:**
- Browser modal appends a newline-separated list of steps: `{step}. {phase} ({direction})`

**State Condition:**
- Display this modal when: HTTPS is ready and redirect is configured (browser secure)
- User can close and re-open modal by clicking browser item again

### 2.9 Contextual Hints

**Progress Hints:**

| Condition | Hint Text |
|-----------|-----------|
| Space empty | Drag the Browser to the first space |
| Browser placed, nothing else | Now set up your webserver! Drag Webserver (HTTP) to the Port 80 space |
| Webserver-80 placed, no domain | Add your domain to the Port 80 space |
| Webserver-80 + domain, no index or redirect | Add index.html so your webserver has something to serve |
| Port 80 complete | Click the Browser to see your website! |
| Browser shows warning + letsencrypt empty | ⚠️ Your site works but it's not secure! New spaces have appeared... |
| Browser shows warning + letsencrypt has items | Drag the Domain (SSL) to the Let's Encrypt space to get a certificate |
| Domain (SSL) placed, modal closed | Click the Domain (SSL) in the Let's Encrypt space to request a certificate |
| Domain (SSL) modal open | Enter your domain name (e.g., example.com) |
| Certificate issued, port 443 empty | 🎉 You got a certificate! Drag the Private Key and Domain Certificate to the Port 443 space |
| Certificate issued, port 443 missing webserver | Set up your HTTPS webserver in the Port 443 space |
| Port 443 missing key or cert | Install both the private key AND domain certificate on your HTTPS webserver |
| Port 443 missing domain | Add your domain and index.html to Port 443 |
| Port 443 missing index.html | Add index.html to Port 443 |
| Port 443 complete, no redirect | 🔒 HTTPS is ready! But visitors might still go to HTTP... |
| Port 80 has redirect (HTTPS complete) | 🎉 Perfect! Click the Browser to see the secure connection |
| Browser secure (HTTPS complete) | 🎉 Your website is now secure with HTTPS! Click the browser to see the TLS handshake. |

**Error Hints:**

| Mistake | Error Hint |
|---------|------------|
| Private key in port-80 | ❌ Private key is for HTTPS only - put it in Port 443 |
| Certificate in port-80 | ❌ Certificate is for HTTPS only - put it in Port 443 |
| Redirect in port-443 | ❌ Redirect only makes sense on port 80 |
| Webserver-80 in port-443 | ❌ This webserver is for HTTP (port 80) |
| Webserver-443 in port-80 | ❌ This webserver is for HTTPS (port 443) |

### 2.10 Phase Transitions

| Current Phase | Condition | Next Phase | Changes |
|---------------|-----------|------------|---------|
| `setup` | Port 80 complete and browser status is warning | `playing` | SSL setup pool appears; letsencrypt + port-443 spaces appear |
| `playing` | Port 443 complete + redirect configured + browser secure | `terminal` | Terminal panel appears |
| `terminal` | `curl https://...` succeeds with redirect configured | `completed` | Success modal + question complete |

**Phase Behaviors:**

| Phase | Spaces Visible | Pools Visible | Notes |
|-------|------------------|---------------------|-------|
| `setup` | browser, port-80 | basic | Only HTTP items |
| `playing` | all 4 | basic + ssl-setup (+ ssl-items after issuance) | SSL setup and certificate flow |
| `terminal` | all 4 (read-only) | all (read-only) | Terminal visible |
| `completed` | all 4 (read-only) | all (read-only) | Success modal |

**Note:** Once the SSL spaces appear, they remain visible even if Port 80 later becomes incomplete (the UI does not regress back to setup).

---

## 3. Phase 2: Terminal Game

**Type:** Command-line

**Goal:** Verify HTTP redirect and HTTPS connection

### 3.1 Terminal Setup

**Prompt:**
> Your secure website is ready! Test both HTTP and HTTPS connections.

**Visible UI:**
- Terminal panel appears at bottom
- All spaces remain visible (read-only)
- SSL handshake animation can replay

### 3.2 Expected Commands

**Command 1:** `curl http://example.com`

**Expected Response:**
```
HTTP/1.1 301 Moved Permanently
Location: https://example.com/

Redirecting to https://example.com...
```

**Command 2:** `curl https://example.com`

**Expected Response:**
```
🔒 TLS Handshake successful
   Certificate: example.com
   Issuer: Let's Encrypt

HTTP/1.1 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
  <title>Welcome to example.com</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>Welcome to example.com</h1>
  <p>This is your website running on a secure HTTPS connection!</p>
</body>
</html>
```

### 3.3 Additional Commands

| Command | Syntax | Response |
|---------|--------|----------|
| `curl -v http://example.com` | Verbose HTTP | Shows connection + redirect headers |
| `curl -v https://example.com` | Verbose HTTPS | Shows TLS details and certificate metadata |
| `curl -I http://example.com` | Headers only | Shows 301 redirect |
| `curl -I https://example.com` | Headers only | Shows 200 OK |
| `curl -h` | Help | Shows curl usage and flags |
| `openssl s_client https://example.com` | SSL info | Shows certificate chain details |
| `help` | Help | Lists supported commands |
| `clear` | Clear | Clears terminal history |

### 3.4 Command Responses

**Error Responses:**

| Error Condition | Error Message |
|-----------------|---------------|
| Unknown command | Unknown command: {command}. Type 'help' for available commands. |
| curl without URL | Error: No URL specified. Usage: curl <url> |
| curl https:// without SSL configured | Error: SSL handshake failed. Certificate not found. |
| curl http:// without webserver | Error: Connection refused. Webserver not configured. |
| curl -k / --insecure | Error: --insecure flag not supported in this simulation. |
| openssl without https:// URL | Error: s_client requires an https:// URL |

### 3.5 Phase Completion

**Trigger:** User runs `curl https://example.com` successfully while HTTPS is ready and redirect is configured

**Next Phase:** Completed

---

## 4. Phase 3: Completed

**Type:** Success

### 4.1 Success Modal

**Title:** `🔒 Website Secured!`

**Message:**
> Congratulations! You've successfully secured your website with HTTPS.
>
> You learned:
> - **Port 80 (HTTP)** serves unencrypted content - anyone can read it!
> - **Port 443 (HTTPS)** serves encrypted content - only you and the server can read it
> - **Let's Encrypt** is a free Certificate Authority that verifies domain ownership
> - **Private Key** stays secret on your server (decrypts incoming data)
> - **Certificate** is shared with browsers (proves your identity)
> - **SSL Handshake** establishes a secure connection before any data is sent
> - **HTTP→HTTPS Redirect** ensures all visitors use the secure connection
>
> The 🔒 in your browser means the certificate is valid and the connection is encrypted!

**Action Button:** `Next question`

---

## 5. Additional Notes

### 5.1 Relationship to Previous Puzzles

This puzzle assumes knowledge from:
- DHCP puzzle (basic networking)
- Internet Gateway puzzle (how requests reach servers)

### 5.2 Simplified vs Reality

| Concept | This Puzzle | Real World |
|---------|-------------|------------|
| Certificate issuance | Instant | Takes a few seconds to minutes |
| Domain verification | Automatic if port 80 works | HTTP-01 or DNS-01 challenge |
| Private key | Generated by Let's Encrypt | Usually generated on server |
| Certificate installation | Drag and drop | Edit nginx/apache config files |
| Redirect | Single item | Server configuration rule |

### 5.3 Security Teaching Points

| Concept | Why It Matters |
|---------|----------------|
| Private key secrecy | If leaked, attackers can decrypt all traffic |
| Certificate validity | Browsers check if cert is from trusted CA |
| HTTPS everywhere | Even "unimportant" sites should use HTTPS |
| Redirect importance | Prevents accidental HTTP usage |

### 5.4 Common Misconceptions Addressed

| Misconception | Reality |
|---------------|---------|
| "HTTPS is only for banks" | All websites should use HTTPS |
| "SSL certificate = security" | Certificate proves identity, encryption secures data |
| "HTTP works fine" | HTTP traffic can be read by anyone on the network |
| "HTTPS is slow" | Modern HTTPS has negligible performance impact |

---

## Checklist

Before implementation, ensure you have defined:

**Phase 1 - Space Game:**
- [x] GridSpace setup (4 spaces: browser, port-80, letsencrypt, port-443)
- [x] GridSpace visibility rules (conditional for letsencrypt and port-443)
- [x] Item types with display labels, icons, and click behavior (9 types)
- [x] Item states and status messages for each type
- [x] Connection/placement rules for each space
- [x] Multiple inventories (basic, ssl-setup, ssl-items)
- [x] Conditional pool visibility rules
- [x] Tooltips for all item types
- [x] Modal triggers and definitions (8 modals)
- [x] SSL handshake visualization
- [x] Progressive hints and error hints
- [x] Phase transition rules with conditional space/pool reveals

**Phase 2 - Terminal Game:**
- [x] Terminal prompt
- [x] Expected commands (curl http, curl https)
- [x] Success and error responses
- [x] Additional commands (curl -v, openssl)
- [x] Phase completion trigger

**Phase 3 - Completed:**
- [x] Success modal content with learning summary

**Overall:**
- [x] Question ID: `webserver-ssl`
- [x] Question title: `🔒 Secure Your Website!`
- [x] Question description
- [x] Learning objective
