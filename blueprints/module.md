# New Module Template

Fill out this template to define a new learning module. This information will be used to implement the module using the module engine.

---

## 1. Module Overview

**Module ID:** `[unique-slug, e.g., "networking-basics", "firewall-fundamentals"]`

**Module Title:** `[Display title, e.g., "Networking Basics"]`

**Module Description:** `[Brief description of what learners will achieve]`

**Learning Objectives:**
- `[Objective 1]`
- `[Objective 2]`
- `[Objective 3]`

---

## 2. Onboarding Page

The onboarding page welcomes users and explains what they will learn before starting.

**Heading:** `[e.g., "Welcome to Networking Basics"]`

**Introduction:** `[e.g., "In this module, you will learn how to:"]`

**Learning Points:**
- `[Point 1, e.g., "Connect computers using routers and cables"]`
- `[Point 2, e.g., "Configure DHCP to assign IP addresses automatically"]`
- `[Point 3, e.g., "Verify network connectivity using the ping command"]`

**Start Button Label:** `[e.g., "Play"]`

---

## 3. Questions

List the questions in this module in order. Each question should have its own blueprint file.

| Order | Question ID | Blueprint File | Description |
|-------|-------------|----------------|-------------|
| 1 | `[e.g., "dhcp-basics"]` | `[e.g., "blueprints/networking/dhcp.md"]` | `[Brief description]` |
| 2 | `[e.g., "dns-lookup"]` | `[e.g., "blueprints/networking/dns.md"]` | `[Brief description]` |
| 3 | `[e.g., "firewall-rules"]` | `[e.g., "blueprints/networking/firewall.md"]` | `[Brief description]` |

---

## 4. Navigation

| Action | Destination |
|--------|-------------|
| Exit (X button in header) | `[e.g., "Landing page"]` |
| Complete all questions | `[e.g., "Landing page"]` |

---

## 5. Completion

**On Module Complete:**
- `[What happens when user finishes all questions, e.g., "Return to landing page"]`
- `[Optional: "Show completion celebration"]`
- `[Optional: "Unlock next module"]`

---

## Checklist

Before implementation, ensure you have defined:

- [ ] Module ID, title, and description
- [ ] Learning objectives
- [ ] Onboarding heading and introduction
- [ ] Learning points list
- [ ] Start button label
- [ ] Questions in order with blueprint references
- [ ] Navigation destinations
- [ ] Completion behavior
