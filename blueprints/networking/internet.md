# New Question Template

Fill out this template to define a new question. This information will be used to implement the question using the game engine.

---

## 1. Question Overview

**Question ID:** `internet-gateway`

**Question Title:** `🌐 Connect to the Internet!`

**Question Description:** `Your home network is ready, but you can't reach Google yet. Connect to your ISP and configure the router to access the internet!`

**Learning Objective:** `Understand how a home network connects to the internet through an ISP, including PPPoE authentication, NAT translation, and DNS resolution.`

---

## 2. Phase 1: Canvas Game

**Type:** Drag-and-drop

**Goal:** Build a complete path from PC to Google by connecting devices and configuring the router's WAN settings, NAT, and DNS

### 2.1 Canvas Setup

**Grid Size:** `12 x 1` (horizontal layout showing the full path)

**Max Items Allowed:** `12`

**Allowed Item Types:** `["pc", "cable", "router-lan", "router-nat", "router-wan", "fiber", "igw", "internet", "dns", "google"]`

### 2.2 Item Types

Define the types of items in this question. Icons are from [Iconify](https://icon-sets.iconify.design/).

| Type | Display Label | Icon | Description |
|------|---------------|------|-------------|
| pc | PC | `mdi:desktop-classic` | Your computer that wants to reach Google |
| cable | Ethernet Cable | `mdi:ethernet-cable` | Connects PC to router (LAN side) |
| router-lan | Router (LAN) | `mdi:lan` | LAN side: assigns private IPs via DHCP and sets DNS |
| router-nat | Router (NAT) | `mdi:swap-horizontal` | NAT: translates private IPs to public IP |
| router-wan | Router (WAN) | `mdi:wan` | WAN side: connects to ISP via PPPoE |
| fiber | Fiber Cable | `mdi:fiber-smart-record` | Connects router to IGW (WAN side) |
| igw | Internet Gateway | `mdi:server-network` | ISP's gateway/modem that provides internet access |
| internet | Internet | `mdi:cloud` | The global internet (passthrough) |
| dns | DNS Server | `mdi:dns` | Resolves domain names to IP addresses |
| google | Google Server | `mdi:google` | The destination server (google.com) |

**Click Behavior:**

| Type | On Click | Opens Modal |
|------|----------|-------------|
| pc | View status | pc-status |
| router-lan | Open LAN configuration | router-lan-config |
| router-nat | Open NAT configuration | router-nat-config |
| router-wan | Open WAN configuration | router-wan-config |
| igw | View status | igw-status |
| dns | View status | dns-status |
| google | View status | google-status |
| cable | (not clickable) | - |
| fiber | (not clickable) | - |
| internet | (not clickable) | - |

### 2.3 Item States & Status Messages

For each item type, define the possible states and what message to display:

#### Item Type: `pc`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "no ip" | Not connected or no IP assigned |
| warning | `[Private IP]` (e.g., "192.168.1.100") | Has private IP but can't reach internet (WAN/NAT/DNS not configured) |
| success | `[Private IP]` + "→ internet" (e.g., "192.168.1.100 → internet") | Has private IP AND can reach internet (all router config complete) |

#### Item Type: `router-lan`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "not configured" | DHCP not enabled or no IP range |
| warning | "no DNS" | DHCP configured but DNS server not set |
| success | "configured" | DHCP enabled + IP range + DNS server set |

#### Item Type: `router-nat`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "disabled" | NAT not enabled |
| success | "enabled" | NAT enabled |

#### Item Type: `router-wan`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "not configured" | No connection type selected |
| warning | "no credentials" | PPPoE selected but no username/password |
| success | "connected" + `[Public IP]` | PPPoE authenticated (e.g., "connected 103.45.67.89") |

#### Item Type: `fiber`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | (none) | Not properly connected |
| success | (none) | Connects router to IGW |

#### Item Type: `igw`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | "waiting for auth" | Router WAN not configured (no PPPoE) |
| success | "connected" | Router has valid PPPoE credentials |

#### Item Type: `internet`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | "no route" | IGW not connected/authenticated |
| success | "online" | IGW is connected |

#### Item Type: `dns`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "unreachable" | Router DNS not configured |
| success | "resolving" | Router DNS is set to valid DNS server |

#### Item Type: `google`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| error | "can't resolve" | DNS unreachable (no DNS configured) |
| warning | "no route" | DNS ok but NAT disabled or WAN not configured |
| success | "142.250.80.46" | Fully reachable (all router config complete) |

### 2.4 Connection Rules

**Connection Method:** `adjacency` - items connect when placed next to each other in correct order

**Required Order (left to right):**
```
[PC] → [Cable] → [Router LAN] → [Router NAT] → [Router WAN] → [Fiber] → [IGW] → [Internet] → [DNS] → [Google]
```

**Valid Connections:**

| From | To | Via | Notes |
|------|-----|-----|-------|
| pc | router-lan | cable | Cable connects PC to router's LAN side |
| router-lan | router-nat | (direct) | Internal router connection |
| router-nat | router-wan | (direct) | Internal router connection |
| router-wan | igw | fiber | Fiber connects router's WAN to IGW |
| igw | internet | (direct) | IGW connects directly to internet |
| internet | dns | (direct) | DNS is on the internet |
| dns | google | (direct) | Google is on the internet |

**Invalid Connections (show error):**

| Connection | Error Message |
|------------|---------------|
| pc → router-nat | ❌ PC must connect to Router LAN first |
| pc → router-wan | ❌ PC must connect to Router LAN first |
| pc → igw | ❌ PC can't connect directly to IGW - use the router |
| router-lan → igw | ❌ Router LAN must go through NAT and WAN first |
| router-nat → igw | ❌ Router NAT must go through WAN first |
| Items out of order | ❌ Devices must be connected in the correct order |

### 2.5 Inventory Items

| ID | Type | Display Name | Quantity | Notes |
|----|------|--------------|----------|-------|
| `pc-1` | pc | PC | 1 | Starting device |
| `cable-1` | cable | Ethernet Cable | 1 | Connects PC to Router LAN |
| `router-lan-1` | router-lan | Router (LAN) | 1 | Configurable - DHCP and DNS |
| `router-nat-1` | router-nat | Router (NAT) | 1 | Configurable - Enable/disable NAT |
| `router-wan-1` | router-wan | Router (WAN) | 1 | Configurable - PPPoE credentials |
| `fiber-1` | fiber | Fiber Cable | 1 | Connects Router WAN to IGW |
| `igw-1` | igw | Internet Gateway | 1 | ISP's gateway |
| `internet-1` | internet | Internet | 1 | Cloud/backbone |
| `dns-1` | dns | DNS Server | 1 | Resolves domains |
| `google-1` | google | Google | 1 | Destination |

### 2.6 Inventory Tooltips

| Item Type | Tooltip Text | Learn More URL |
|-----------|--------------|----------------|
| cable | Ethernet cable connects your PC to the router's LAN port | https://www.google.com/search?q=what+is+ethernet+cable |
| router-lan | The LAN (Local Area Network) side of the router. Assigns private IP addresses to devices via DHCP and configures which DNS server to use. | https://www.google.com/search?q=what+is+router+LAN |
| router-nat | NAT (Network Address Translation) translates private IP addresses to the public IP address so multiple devices can share one internet connection. | https://www.google.com/search?q=what+is+NAT+network+address+translation |
| router-wan | The WAN (Wide Area Network) side of the router. Connects to your ISP using PPPoE authentication to get a public IP address. | https://www.google.com/search?q=what+is+router+WAN+PPPoE |
| fiber | Fiber optic cable provides high-speed connection to your ISP | https://www.google.com/search?q=what+is+fiber+optic+internet |
| igw | Internet Gateway (modem) connects your home to the ISP's network | https://www.google.com/search?q=what+is+internet+gateway |
| internet | The global network of interconnected computers | https://www.google.com/search?q=how+does+the+internet+work |
| dns | DNS Server translates domain names (google.com) to IP addresses | https://www.google.com/search?q=what+is+DNS |
| google | Google's server - your destination! | https://www.google.com/search?q=how+do+websites+work |

### 2.7 Modals

Modals are **data-driven** - you define the structure and the game engine renders them.

#### 2.7.1 Modal Triggers

| Item Type | Modal ID | Trigger |
|-----------|----------|---------|
| pc | pc-status-{deviceId} | Click on placed PC |
| router-lan | router-lan-config-{deviceId} | Click on placed Router LAN |
| router-nat | router-nat-config-{deviceId} | Click on placed Router NAT |
| router-wan | router-wan-config-{deviceId} | Click on placed Router WAN |
| igw | igw-status-{deviceId} | Click on placed IGW |
| dns | dns-status-{deviceId} | Click on placed DNS |
| google | google-status-{deviceId} | Click on placed Google |

#### 2.7.2 Router LAN Configuration Modal

**ID Pattern:** `router-lan-config-{deviceId}`

**Title:** `Router LAN Configuration`

**Fields:**

| Field ID | Kind | Label | Default | Validation |
|----------|------|-------|---------|------------|
| dhcpEnabled | checkbox | Enable DHCP | false | - |
| startIp | text | Start IP | "" | Valid IP, private range |
| endIp | text | End IP | "" | Valid IP, private range, > startIp |
| dnsServer | text | DNS Server | "" | Valid IP (public DNS like 8.8.8.8) |

**Help Links:**

| Field ID | Link Text | URL |
|----------|-----------|-----|
| dhcpEnabled | What is DHCP? | https://www.google.com/search?q=what+is+DHCP |
| dnsServer | What is DNS? | https://www.google.com/search?q=what+is+DNS+server |

**Validation Rules:**

| Field | Rule | Error Message |
|-------|------|---------------|
| startIp | Must be valid IP format | Invalid format. Use 192.168.1.100 |
| startIp | Must be private IP range | Use a private IP range (192.168.x.x) |
| endIp | Must be valid IP format | Invalid format. Use 192.168.1.200 |
| endIp | Must be private IP range | Use a private IP range (192.168.x.x) |
| endIp | Must be greater than startIp | End IP must be greater than start IP |
| dnsServer | Must be valid IP format | Invalid format. Use 8.8.8.8 |
| dnsServer | Must be public IP | DNS server must be a public IP address |

**Validation Constants:**

```
PRIVATE_IP_RANGES = [
  /^10\./,                        # 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,   # 172.16.0.0/12
  /^192\.168\./                   # 192.168.0.0/16
]

VALID_DNS_SERVERS = [
  "8.8.8.8",       # Google DNS
  "8.8.4.4",       # Google DNS secondary
  "1.1.1.1",       # Cloudflare DNS
  "1.0.0.1",       # Cloudflare DNS secondary
  "208.67.222.222" # OpenDNS
]
```

**Actions:**

| ID | Label | Variant | Validates? | Closes? |
|----|-------|---------|------------|---------|
| cancel | Cancel | ghost | No | Yes |
| save | Save | primary | Yes | Yes |

**On Save:**

- Router LAN DHCP is set to enabled/disabled
- Router LAN IP range is set
- Router LAN DNS server is stored
- Connected PC receives private IP address
- Router LAN status updates based on configuration

**Automatic IP Assignment:**

When Router LAN is configured (DHCP enabled + valid IP range), the system automatically assigns IPs to connected PCs:

1. Parse start IP to extract base (first 3 octets) and starting last octet (e.g., `192.168.1.100` → base `192.168.1`, start `100`)
2. Find PC connected to Router LAN via cable
3. Assign IP: PC → `{base}.{startOctet}` (e.g., `192.168.1.100`)
4. Update PC status to "warning" (has local IP but no internet yet)

---

#### 2.7.3 Router NAT Configuration Modal

**ID Pattern:** `router-nat-config-{deviceId}`

**Title:** `Router NAT Configuration`

**Fields:**

| Field ID | Kind | Label | Default | Validation |
|----------|------|-------|---------|------------|
| natEnabled | checkbox | Enable NAT | false | - |

**Help Links:**

| Field ID | Link Text | URL |
|----------|-----------|-----|
| natEnabled | What is NAT? | https://www.google.com/search?q=what+is+NAT+network+address+translation |

**Info Text:**
> NAT (Network Address Translation) allows multiple devices on your home network to share a single public IP address. When enabled, the router translates your private IP (192.168.x.x) to the public IP assigned by your ISP.

**Actions:**

| ID | Label | Variant | Validates? | Closes? |
|----|-------|---------|------------|---------|
| cancel | Cancel | ghost | No | Yes |
| save | Save | primary | Yes | Yes |

**On Save:**

- Router NAT is set to enabled/disabled
- Router NAT status updates to "enabled" or "disabled"
- If all conditions met (LAN + NAT + WAN + DNS), PC status updates to "success"

---

#### 2.7.4 Router WAN Configuration Modal

**ID Pattern:** `router-wan-config-{deviceId}`

**Title:** `Router WAN Configuration`

**Fields:**

| Field ID | Kind | Label | Default | Validation |
|----------|------|-------|---------|------------|
| connectionType | select | Connection Type | "" | Required, options: ["PPPoE", "DHCP", "Static"] |
| pppoeUsername | text | PPPoE Username | "" | Required if connectionType is PPPoE |
| pppoePassword | password | PPPoE Password | "" | Required if connectionType is PPPoE |

**Help Links:**

| Field ID | Link Text | URL |
|----------|-----------|-----|
| connectionType | What is PPPoE? | https://www.google.com/search?q=what+is+PPPoE |

**Connection Type Behavior:**

| Connection Type | Additional Fields Shown | Public IP Assignment |
|-----------------|------------------------|---------------------|
| PPPoE | Username, Password | Assigned by ISP after auth |
| DHCP | (none) | Assigned by ISP automatically |
| Static | Public IP, Subnet, Gateway | Manually entered |

**For this puzzle:** Only PPPoE works (simulating Indonesian ISPs like Indihome)

**Validation Rules:**

| Field | Rule | Error Message |
|-------|------|---------------|
| connectionType | Must be selected | Select a connection type |
| pppoeUsername | Required if PPPoE | Enter your ISP username |
| pppoePassword | Required if PPPoE | Enter your ISP password |
| pppoeUsername | Must match ISP credentials | Invalid ISP username |
| pppoePassword | Must match ISP credentials | Invalid ISP password |

**Validation Constants:**

```
VALID_PPPOE_CREDENTIALS = {
  username: "user@telkom.net",
  password: "indihome123"
}
```

**Actions:**

| ID | Label | Variant | Validates? | Closes? |
|----|-------|---------|------------|---------|
| cancel | Cancel | ghost | No | Yes |
| save | Save | primary | Yes | Yes |

**On Save:**

- Router WAN connection type is set
- If PPPoE credentials are correct:
  - Router WAN receives public IP (e.g., "103.45.67.89")
  - Router WAN status changes to "connected 103.45.67.89"
  - IGW status changes to "connected"
  - Internet status changes to "online"
- If credentials are wrong:
  - Show error: "Authentication failed. Check your ISP credentials."

---

**State Dependencies (across all router components):**

```
PC gets private IP      ← Router LAN: DHCP enabled + IP range set
PC status = warning     ← Has private IP, but internet not reachable
IGW connected           ← Router WAN: PPPoE credentials correct
Internet online         ← IGW connected
DNS resolving           ← Internet online + Router LAN: DNS server configured
Google reachable        ← DNS resolving + Router NAT: enabled
PC status = success     ← Google reachable (all config complete)
```

#### 2.7.5 PC Status Modal

**ID Pattern:** `pc-status-{deviceId}`

**Title:** `PC Status`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| privateIp | readonly | Private IP | (from DHCP or "Not assigned") |
| dnsServer | readonly | DNS Server | (from Router LAN config or "Not set") |
| internetStatus | readonly | Internet Access | "No" / "Yes" |
| publicIp | readonly | Public IP (via NAT) | (from Router WAN or "Not available") |

**Status Indicator:**
- 🔴 Error: No private IP assigned
- 🟡 Warning: Has private IP, no internet access
- 🟢 Success: Has private IP and internet access

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.6 IGW Status Modal

**ID Pattern:** `igw-status-{deviceId}`

**Title:** `Internet Gateway Status`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| status | readonly | Connection Status | "Waiting for authentication" / "Connected" |
| publicIp | readonly | Public IP | (assigned after PPPoE auth, e.g., "103.45.67.89") |
| isp | readonly | ISP | "Telkom Indonesia" |

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.7 DNS Status Modal

**ID Pattern:** `dns-status-{deviceId}`

**Title:** `DNS Server Status`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| server | readonly | DNS Server | "8.8.8.8 (Google DNS)" or "Unreachable" |
| status | readonly | Status | "Ready" / "Unreachable - configure DNS in router" |
| lastQuery | readonly | Last Query | "google.com → 142.250.80.46" or "-" |

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

#### 2.7.8 Google Status Modal

**ID Pattern:** `google-status-{deviceId}`

**Title:** `Google Server Status`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| domain | readonly | Domain | "google.com" |
| ip | readonly | IP Address | "142.250.80.46" or "Can't resolve" |
| status | readonly | Status | "Reachable" / "Unreachable" |
| reason | readonly | Reason | (if unreachable: "DNS not configured" / "NAT disabled" / "WAN not connected") |

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

### 2.8 Contextual Hints

Guide the learner through each step:

**Progress Hints:**

| Condition | Hint Text |
|-----------|-----------|
| Canvas is empty | Drag the PC from inventory to the leftmost slot |
| PC placed, no cable | Connect the ethernet cable to the PC |
| Cable placed, no router-lan | Place the Router (LAN) - this is where your home network starts |
| Router LAN placed, no router-nat | Place the Router (NAT) - this translates your private IP |
| Router NAT placed, no router-wan | Place the Router (WAN) - this connects to your ISP |
| Router WAN placed, no fiber | Connect the fiber cable to the router's WAN side |
| Fiber placed, no IGW | Place the Internet Gateway - this is your ISP's modem |
| IGW placed, no internet | Add the Internet cloud |
| Internet placed, no DNS | Place the DNS server - it translates domain names to IPs |
| DNS placed, no Google | Finally, place Google - your destination! |
| All placed, router-lan not configured | Click Router (LAN) to configure DHCP and DNS settings |
| Router LAN config open, DHCP off | Enable DHCP so your PC can get an IP address |
| DHCP on, no IP range | Set the IP range (e.g., 192.168.1.100 to 192.168.1.200) |
| IP range set, no DNS | Set the DNS server (e.g., 8.8.8.8) so you can resolve domain names |
| Router LAN configured, router-wan not configured | Click Router (WAN) to configure your ISP connection |
| Router WAN config open, no connection type | Select PPPoE as the connection type |
| PPPoE selected, no credentials | Enter your ISP credentials (username: user@telkom.net) |
| Router WAN configured, router-nat not configured | Click Router (NAT) to enable address translation |
| Router NAT config open, NAT off | Enable NAT so your private IP can reach the internet |
| All configured | 🎉 You're connected to the internet! Try pinging Google |

**Error Hints:**

| Mistake | Error Hint |
|---------|------------|
| Wrong order | ❌ Devices must be connected in order: PC → Cable → Router LAN → Router NAT → Router WAN → Fiber → IGW → Internet → DNS → Google |
| PC connected directly to Router NAT | ❌ PC must connect to Router LAN first |
| PC connected directly to Router WAN | ❌ PC must connect to Router LAN first |
| PC connected to IGW directly | ❌ PC needs to go through the router first |
| Wrong PPPoE credentials | ❌ Invalid ISP credentials. Check your username and password |
| DNS set but NAT disabled | ⚠️ DNS is configured but NAT is disabled - traffic can't leave your network |
| WAN connected but no DNS | ⚠️ You're connected to the internet but can't resolve domain names - set a DNS server in Router LAN |

### 2.9 Phase Transitions

The game automatically transitions between phases based on network state:

| Current Phase | Condition | Next Phase |
|---------------|-----------|------------|
| `setup` | All devices placed in correct order | `configuring` |
| `configuring` | All router components configured (LAN + NAT + WAN) | `playing` |
| `playing` | All states are success (PC has internet, IGW connected, DNS resolving, Google reachable) | `terminal` |
| `terminal` | Correct ping command executed | `completed` |

**Phase Behaviors:**

| Phase | Terminal Visible | Canvas Editable | Router Components Configurable |
|-------|------------------|-----------------|-------------------------------|
| `setup` | No | Yes | No |
| `configuring` | No | No | Yes |
| `playing` | No | No | Yes |
| `terminal` | Yes | Read-only | Read-only |
| `completed` | Yes | Read-only | Read-only |

**Canvas Phase Completion Trigger:** All devices connected AND all router components configured AND Google is reachable

**Next Phase:** Terminal Game

---

## 3. Phase 2: Terminal Game

**Type:** Command-line

**Goal:** Verify internet connectivity by pinging Google

### 3.1 Terminal Setup

**Prompt:** 
> Your network is configured! Can you verify that you can reach Google?

**Visible UI:**
- Terminal panel appears at bottom
- Canvas remains visible (read-only)
- Shows the full path with all green checkmarks

### 3.2 Expected Command

**Command:** `ping`

**Syntax:** `ping <target>`

### 3.3 Valid Targets

| Target | Example | Description |
|--------|---------|-------------|
| By domain | `ping google.com` | Uses DNS to resolve, then pings |
| By IP address | `ping 142.250.80.46` | Pings Google's IP directly |

### 3.4 Command Responses

**Success Response (by domain):**
```
Resolving google.com... 142.250.80.46
Reply from 142.250.80.46: bytes=32 time=15ms TTL=117
```

**Success Response (by IP):**
```
Reply from 142.250.80.46: bytes=32 time=15ms TTL=117
```

**Error Responses:**

| Error Condition | Error Message |
|-----------------|---------------|
| Unknown command | Error: Unknown command. |
| Missing target | Error: Missing target. Usage: ping <hostname or IP> |
| Invalid target | Error: Unknown host "[target]". |
| DNS not configured (ping by domain) | Error: Could not resolve hostname. DNS server not configured. |
| NAT disabled (any ping) | Error: Network unreachable. Check NAT configuration. |
| WAN not connected | Error: Network unreachable. No internet connection. |

### 3.5 Additional Commands (Optional)

| Command | Syntax | Response |
|---------|--------|----------|
| `ifconfig` | `ifconfig` | Shows PC's IP: `eth0: 192.168.1.100` |
| `nslookup` | `nslookup <domain>` | Shows DNS resolution: `google.com → 142.250.80.46` |
| `traceroute` | `traceroute google.com` | Shows path: `192.168.1.1 → 103.45.67.89 → ... → 142.250.80.46` |

### 3.6 Phase Completion

**Trigger:** Correct ping command executed (`ping google.com` or `ping 142.250.80.46`)

**Next Phase:** Completed

---

## 4. Phase 3: Completed

**Type:** Success

### 4.1 Success Modal

**Title:** `🎉 Connected to the Internet!`

**Message:** 
> Congratulations! You've successfully connected your home network to the internet.
> 
> You learned how:
> - **Router LAN + DHCP** assigns private IPs to your devices
> - **Router WAN + PPPoE** authenticates with your ISP to get a public IP
> - **Router NAT** translates your private IP to the public IP
> - **DNS** resolves domain names (google.com) to IP addresses (142.250.80.46)
> 
> Your ping traveled: PC → Router LAN → Router NAT → Router WAN → IGW → Internet → Google!

**Action Button:** `Next question`

### 4.2 What Happens

- Success modal is shown
- Question is marked as completed
- User can proceed to next question

---

## 5. Additional Notes

### 5.1 Relationship to DHCP Puzzle

This puzzle builds on the DHCP puzzle:
- Same DHCP concepts (private IP assignment)
- Router now has additional responsibilities (WAN, NAT, DNS)
- User should complete DHCP puzzle first

### 5.2 Simplified vs Reality

| Concept | This Puzzle | Real World |
|---------|-------------|------------|
| Router components | Split into LAN, NAT, WAN | Single device with all functions |
| DNS location | Separate node after Internet | Distributed, could be ISP's or public (8.8.8.8) |
| NAT location | Explicit Router NAT component | Built into router firmware |
| PPPoE | Single correct credential | Varies by ISP |
| Public IP | Instant assignment | May take seconds |

### 5.3 Indonesian ISP Context

The puzzle uses PPPoE with credentials similar to Indonesian ISPs (Indihome/Telkom):
- Username format: `user@telkom.net`
- This makes it relatable for Indonesian learners

### 5.4 Pre-filled Values (Optional)

To reduce complexity, some values could be pre-filled:
- DHCP range (from previous puzzle)
- ISP username hint shown in placeholder

---

## Checklist

Before implementation, ensure you have defined:

**Phase 1 - Canvas Game:**
- [x] Canvas setup (grid size: 12x1, max items: 12)
- [x] Item types with display labels, icons, and click behavior (10 types including split router)
- [x] Item states and status messages for each type (PC has 3 states: error/warning/success)
- [x] Connection rules (valid order and invalid connections)
- [x] Inventory items with IDs and types (10 items)
- [x] Tooltips for item types (no tooltip for PC)
- [x] Modal triggers and definitions (7 modals: 3 router configs + 4 status modals)
- [x] Modal fields, validation rules, and validation constants
- [x] Automatic state changes (IP assignment, connection status)
- [x] Progressive hints and error hints
- [x] Phase transition rules

**Phase 2 - Terminal Game:**
- [x] Terminal prompt
- [x] Expected command and syntax (ping)
- [x] Valid targets (google.com, 142.250.80.46)
- [x] Success and error responses
- [x] Additional commands (ifconfig, nslookup, traceroute)
- [x] Phase completion trigger

**Phase 3 - Completed:**
- [x] Success modal content (title, message with learning summary, button)

**Overall:**
- [x] Question ID: `internet-gateway`
- [x] Question title: `🌐 Connect to the Internet!`
- [x] Question description
- [x] Learning objective
