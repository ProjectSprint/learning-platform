# New Question Template

Fill out this template to define a new question. This information will be used to implement the question using the game engine.

---

## 1. Question Overview

**Question ID:** `[unique-slug, e.g., "networking", "firewall-basics"]`

**Question Title:** `[Display title]`

**Learning Objective:** `[What should the learner understand after completing this?]`

---

## 2. Phase 1: Canvas Game

**Type:** Drag-and-drop

**Goal:** Build the network by placing and connecting devices

### 2.1 Canvas Setup

**Grid Size:** `[columns] x [rows]` (e.g., 5x1)

**Max Items Allowed:** `[number]`

**Allowed Item Types:** `[list of item types that can be placed]` (e.g., `["pc", "router", "cable"]`)

### 2.2 Item Types

Define the types of items in this question:

| Type | Display Label | Description |
|------|---------------|-------------|
| pc | PC | A computer that can send/receive data |
| router | Router | Connects devices and assigns IPs via DHCP |
| cable | Cable | Connects two adjacent devices |

**Click Behavior:**

| Type | On Click | Opens Modal |
|------|----------|-------------|
| router | Open configuration | router-config |
| pc | View status | pc-config |
| cable | (not clickable) | - |

### 2.3 Item States & Status Messages

For each item type, define the possible states and what message to display:

#### Item Type: `pc`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | "no ip" | Not connected or no IP assigned |
| success | `[IP address]` | Has IP assigned (e.g., "192.168.1.2") |

#### Item Type: `router`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | "needs configuration" | DHCP not enabled or no IP range set |
| success | "configured" | DHCP enabled with valid IP range |

#### Item Type: `cable`

| Status | Display Message | Condition |
|--------|-----------------|-----------|
| warning | (none) | Not properly connected |
| success | (none) | Connects a PC to the router |

### 2.4 Connection Rules

**Connection Method:** `[e.g., "adjacency" - items connect when placed next to each other]`

**Valid Connections:**

| From | To | Via | Notes |
|------|-----|-----|-------|
| pc | router | cable | Cable must be between PC and router |
| router | pc | cable | Same as above |

**Invalid Connections (show error):**

| Connection | Error Message |
|------------|---------------|
| pc → pc | ❌ PCs can't connect directly - connect them to the router instead |
| router → router | ❌ Both cable ends are on the router - connect one end to a PC |
| pc with 2+ cables | ❌ This PC already has a cable - connect the other PC instead |

### 2.5 Inventory Items

| ID | Type | Display Name | Quantity | Notes |
|----|------|--------------|----------|-------|
| `pc-1` | pc | PC-1 | 1 | |
| `pc-2` | pc | PC-2 | 1 | |
| `router-1` | router | Router | 1 | Configurable |
| `cable-1` | cable | Cable | 1 | Connects devices |
| `cable-2` | cable | Cable | 1 | Connects devices |

### 2.6 Inventory Tooltips

| Item Type | Tooltip Text | Learn More URL |
|-----------|--------------|----------------|
| cable | Ethernet cables connect devices in a network... | https://... |
| router | A router connects multiple devices... | https://... |

### 2.7 Modals

Modals are **data-driven** - you define the structure and the game engine renders them.

#### 2.7.1 Modal Triggers

| Item Type | Modal ID | Trigger |
|-----------|----------|---------|
| router | router-config-{deviceId} | Click on placed router |
| pc | pc-config-{deviceId} | Click on placed PC |

#### 2.7.2 Router Configuration Modal

**ID Pattern:** `router-config-{deviceId}`

**Title:** `Router configuration`

**Fields:**

| Field ID | Kind | Label | Default | Validation |
|----------|------|-------|---------|------------|
| dhcpEnabled | checkbox | Enable DHCP | false | - |
| ipRange | text | IP range (CIDR) | "" | CIDR format, private IP |

**Help Links:**

| Field ID | Link Text | URL |
|----------|-----------|-----|
| dhcpEnabled | What is DHCP? | https://www.google.com/search?q=what+is+DHCP |

**Validation Rules:**

| Field | Rule | Error Message |
|-------|------|---------------|
| ipRange | Must be valid CIDR notation | Invalid format. Use 192.168.1.0/24. |
| ipRange | Must be private IP range | Use a private IP range. |
| ipRange | Prefix must be 8-30 | Prefix must be between /8 and /30. |

**Validation Constants:**

```
PRIVATE_IP_RANGES = [
  /^10\./,                        # 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,   # 172.16.0.0/12
  /^192\.168\./                   # 192.168.0.0/16
]
```

**Actions:**

| ID | Label | Variant | Validates? | Closes? |
|----|-------|---------|------------|---------|
| cancel | Cancel | ghost | No | Yes |
| save | Save | primary | Yes | Yes |

**On Save:**

- Router DHCP is set to enabled/disabled (based on checkbox)
- Router IP range is set to the entered value
- Router status changes to "configured" (if both are set)
- Connected PCs receive IP addresses automatically

**Automatic IP Assignment:**

When router is configured (DHCP enabled + valid IP range), the system automatically assigns IPs to connected PCs:

1. Parse CIDR to extract base IP (e.g., `192.168.1.0/24` → `192.168.1`)
2. Find all PCs connected to router via cables (using adjacency detection)
3. Sort connected PCs by ID alphabetically
4. Assign sequential IPs starting from `.2`:
   - PC-1 → `{base}.2` (e.g., `192.168.1.2`)
   - PC-2 → `{base}.3` (e.g., `192.168.1.3`)
5. Update PC status to "success" when IP assigned, "warning" when not

#### 2.7.3 PC Configuration Modal

**ID Pattern:** `pc-config-{deviceId}`

**Title:** `PC configuration`

**Fields:**

| Field ID | Kind | Label | Value |
|----------|------|-------|-------|
| ip | readonly | IP Address | (from device data or "Not assigned") |

**Actions:**

| ID | Label | Variant | Closes? |
|----|-------|---------|---------|
| close | Close | primary | Yes |

### 2.8 Contextual Hints

Guide the learner through each step:

**Progress Hints:**

| Condition | Hint Text |
|-----------|-----------|
| Canvas is empty | Drag a PC from inventory to any slot to start |
| 1 PC placed, no router | Add the second PC to another slot |
| 2 PCs placed, no router | Place the router in the middle slot to connect both PCs |
| Router + 2 PCs, no cables | Connect PC-1 to the router using a cable |
| 1 cable connected | Connect PC-2 to the router with the second cable |
| All connected, router not configured | ⚠️ Physically connected but not working! Click the router to configure DHCP |
| Router config open, DHCP off | Enable DHCP so the router can assign IP addresses |
| DHCP on, no IP range | Set IP range - Start: 192.168.1.100, End: 192.168.1.200 |
| All configured | 🎉 Network configured! Both PCs can now communicate |

**Error Hints:**

| Mistake | Error Hint |
|---------|------------|
| More than 2 PCs | ❌ Only 2 PCs needed - remove the extra one |
| PCs connected directly | ❌ PCs can't connect directly - connect them to the router instead |
| Duplicate cable on same PC | ❌ This PC already has a cable - connect the other PC instead |

### 2.9 Phase Transitions

The game automatically transitions between phases based on network state:

| Current Phase | Condition | Next Phase |
|---------------|-----------|------------|
| `setup` | Router placed + at least 1 PC connected | `playing` |
| `playing` | Router configured + both PCs have IPs | `terminal` |
| `terminal` | Correct ping command executed | `completed` |

**Phase Behaviors:**

| Phase | Terminal Visible | Canvas Editable |
|-------|------------------|-----------------|
| `setup` | No | Yes |
| `playing` | No | Yes |
| `terminal` | Yes | Read-only |
| `completed` | Yes | Read-only |

**Canvas Phase Completion Trigger:** Router configured + both PCs have IP addresses assigned

**Next Phase:** Terminal Game

---

## 3. Phase 2: Terminal Game

**Type:** Command-line

**Goal:** Verify the network works by running a command

### 3.1 Terminal Setup

**Prompt:** 
> How can you check that PC-1 is connected to PC-2?

**Visible UI:**
- Terminal panel appears at bottom
- Canvas remains visible (read-only)

### 3.2 Expected Command

**Command:** `ping`

**Syntax:** `ping <target>`

### 3.3 Valid Targets

| Target | Example | Description |
|--------|---------|-------------|
| By hostname | `ping pc-2` | Target PC by name |
| By IP address | `ping 192.168.1.3` | Target PC by assigned IP |

### 3.4 Command Responses

**Success Response:**
```
Reply from 192.168.1.3: bytes=32 time<1ms TTL=64
```

**Error Responses:**

| Error Condition | Error Message |
|-----------------|---------------|
| Unknown command | Error: Unknown command. |
| Missing target | Error: Missing target. |
| Invalid target | Error: Unknown target "[target]". |
| Terminal not ready | Error: Terminal is not ready yet. |

### 3.5 Phase Completion

**Trigger:** Correct ping command executed (ping pc-2 or ping [PC-2's IP])

**Next Phase:** Completed

---

## 4. Phase 3: Completed

**Type:** Success

### 4.1 Success Modal

**Title:** `Question complete`

**Message:** 
> You connected two computers and verified their connection using ping.

**Action Button:** `Next question`

### 4.2 What Happens

- Success modal is shown
- Question is marked as completed
- User can proceed to next question

---

## 5. Additional Notes

[Any other requirements, edge cases, or special behaviors]

---

## Checklist

Before implementation, ensure you have defined:

**Phase 1 - Canvas Game:**
- [ ] Canvas setup (grid size, max items, allowed item types)
- [ ] Item types with display labels and click behavior
- [ ] Item states and status messages for each type
- [ ] Connection rules (valid and invalid)
- [ ] Inventory items with IDs and types
- [ ] Tooltips for item types
- [ ] Modal triggers and definitions
- [ ] Modal fields, validation rules, and validation constants
- [ ] Automatic state changes (e.g., IP assignment)
- [ ] Progressive hints and error hints
- [ ] Phase transition rules

**Phase 2 - Terminal Game:**
- [ ] Terminal prompt
- [ ] Expected command and syntax
- [ ] Valid targets
- [ ] Success and error responses
- [ ] Phase completion trigger

**Phase 3 - Completed:**
- [ ] Success modal content (title, message, button)

**Overall:**
- [ ] Question ID, title, and learning objective
