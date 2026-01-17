# OverlayLayer — Specification

The **OverlayLayer** renders modals, toasts, and hints above the game UI.
It is a portal container — renders content but owns no logic.

---

## Responsibility

- Render modals when `state.overlay.activeModal` is set
- Render hint toasts from `state.overlay.hints`
- Render success/completion modals
- Handle backdrop clicks for dismissal

---

## Layer Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VIEWPORT                                       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │                         GAME LAYOUT                                 │   │
│   │                     (InventoryPanel, Canvas, Terminal)              │   │
│   │                                                                     │   │
│   │                            z-index: 0                               │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░ BACKDROP ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░┌───────────────────────────────┐░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░│                               │░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░│           MODAL               │░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░│                               │░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░│         z-index: 100          │░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░│                               │░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░└───────────────────────────────┘░░░░░░░░░░░░░░░░░░░░░ │   │
│   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│   │                          z-index: 50                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌───────────────────────────────────────┐                                 │
│   │            HINT TOAST                 │  ◄── bottom-right, z-index: 200 │
│   │  "Click the router to configure it"  │                                 │
│   └───────────────────────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modal Types

### Config Modal (Router/Device Configuration)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  ROUTER CONFIGURATION                              [X]  │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │                                                         │   │
│   │  ┌─ DHCP Settings ────────────────────────────────────┐ │   │
│   │  │                                                    │ │   │
│   │  │  [x] Enable DHCP                                   │ │   │
│   │  │                                                    │ │   │
│   │  │  IP Range: [ 192.168.1.0/24        ]               │ │   │
│   │  │                                                    │ │   │
│   │  └────────────────────────────────────────────────────┘ │   │
│   │                                                         │   │
│   │                              [ Cancel ]  [ Save ]       │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Success Modal (Question Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │                        ✓                                │   │
│   │                                                         │   │
│   │               QUESTION COMPLETE!                        │   │
│   │                                                         │   │
│   │      You successfully connected two computers           │   │
│   │      and verified their connection using ping.          │   │
│   │                                                         │   │
│   │                  [ Next Question ]                      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hint Toasts

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                        ┌──────────────────────┐ │
│                                        │ 💡 HINT              │ │
│                                        │                      │ │
│                                        │ The router needs to  │ │
│                                        │ be configured before │ │
│                                        │ it can assign IPs.   │ │
│                                        │                      │ │
│                                        │ [ Dismiss ] [ Docs ] │ │
│                                        └──────────────────────┘ │
│                                                                 │
│   Position: bottom-right                                        │
│   Auto-dismiss: 10 seconds (or manual)                          │
│   Stacking: newest on top                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Structure

```ts
type OverlayState = {
  activeModal: ModalState | null
  hints: Hint[]
}

type ModalState = {
  type: 'router-config' | 'pc-config' | 'success' | 'confirm'
  deviceId?: string
  data?: Record<string, unknown>
}

type Hint = {
  id: string
  message: string
  docsUrl?: string
  autoDismiss: boolean
  timestamp: number
}
```

---

## Component Structure

```
OverlayLayer
├── Backdrop (when modal active)
│   └── onClick → dispatch CLOSE_MODAL
│
├── ModalContainer (when activeModal)
│   └── {ModalContent} based on modal.type
│       ├── RouterConfigForm
│       ├── PCConfigForm
│       ├── SuccessModal
│       └── ConfirmModal
│
└── HintStack (always rendered)
    └── HintToast (×n)
        ├── Message
        ├── Docs link (optional)
        └── Dismiss button
```

---

## Modal Flow

```
Step 1 │ User clicks item on canvas
       │
       │   dispatch({ type: 'OPEN_MODAL', payload: { type: 'router-config', deviceId } })
       │
───────┼───────────────────────────────────────────────────────
       │
Step 2 │ OverlayLayer renders modal
       │
       │   state.overlay.activeModal = { type: 'router-config', deviceId: 'router-1' }
       │
       │   → Backdrop appears
       │   → RouterConfigForm rendered inside modal
       │
───────┼───────────────────────────────────────────────────────
       │
Step 3 │ User saves config
       │
       │   RouterConfigForm dispatches:
       │     { type: 'CONFIGURE_DEVICE', payload: { deviceId, config } }
       │
       │   Reducer:
       │     1. Updates device config
       │     2. Sets activeModal = null
       │
───────┼───────────────────────────────────────────────────────
       │
Step 4 │ Modal closes, UI updates
       │
       │   → Backdrop removed
       │   → Device shows success status
```

---

## Must Do

- Render as portal to `document.body`
- Read from `state.overlay`
- Render correct form component based on `modal.type`
- Handle backdrop click → dispatch `CLOSE_MODAL`
- Auto-dismiss hints after timeout

---

## Must NOT Do

```
❌ Form logic in OverlayLayer

function handleSave(values) {
  validateConfig(values)  // ❌ form component handles
}
```

```
❌ Deciding which modal to show

if (clickedItem.type === 'router') {
  setModalType('router-config')  // ❌ dispatch determines this
}
```

```
❌ Managing modal state locally

const [isOpen, setIsOpen] = useState(false)  // ❌ read from context
```

---

## Config Forms

Config forms are separate components rendered inside the modal:

| Form              | Props                     | Dispatches                    |
| ----------------- | ------------------------- | ----------------------------- |
| RouterConfigForm  | `deviceId`, `currentConfig` | `CONFIGURE_DEVICE`          |
| PCConfigForm      | `deviceId`, `currentConfig` | `CONFIGURE_DEVICE`          |

### Form Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                        ConfigForm                               │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                       DOES                              │   │
│   │                                                         │   │
│   │   • Render form fields                                  │   │
│   │   • Local form state (controlled inputs)                │   │
│   │   • Validate input format                               │   │
│   │   • Dispatch CONFIGURE_DEVICE on save                   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     DOES NOT                            │   │
│   │                                                         │   │
│   │   • Close the modal (reducer handles)                   │   │
│   │   • Run animations                                      │   │
│   │   • Access other devices                                │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility

| Requirement           | Implementation                              |
| --------------------- | ------------------------------------------- |
| Focus trap            | Tab cycles within modal                     |
| Escape key            | Close modal                                 |
| Screen reader         | `role="dialog"`, `aria-modal="true"`        |
| Focus on open         | Focus first interactive element             |
| Focus on close        | Return focus to trigger element             |

---

## Performance

### Lazy Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Modal content components are lazy loaded:                     │
│                                                                 │
│   const RouterConfigForm = lazy(() =>                           │
│     import('./forms/RouterConfigForm')                          │
│   )                                                             │
│                                                                 │
│   Only loaded when modal opens, not on initial page load        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Render Optimization

```ts
// OverlayLayer only re-renders when overlay state changes
const overlay = useOverlayState() // separate context slice

// If no modal and no hints, render nothing
if (!overlay.activeModal && overlay.hints.length === 0) {
  return null
}
```

### Animation Performance

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Modal animations use CSS transforms only:                     │
│                                                                 │
│   ✅ transform: scale(), translateY()                           │
│   ✅ opacity                                                    │
│                                                                 │
│   ❌ width, height, top, left (cause layout recalc)             │
│                                                                 │
│   Use will-change: transform on modal container                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hint Toast Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max visible hints | 3 | Screen space |
| Auto-dismiss time | 10s | UX |
| Max hint length | 200 chars | Display |

---

## Reliability

### Modal State Validation

```ts
function validateModalState(modal: unknown): ModalState | null {
  if (!modal || typeof modal !== 'object') return null

  const { type, deviceId } = modal as any

  // Validate type is known
  if (!VALID_MODAL_TYPES.includes(type)) return null

  // If device modal, validate deviceId exists
  if (['router-config', 'pc-config'].includes(type)) {
    if (typeof deviceId !== 'string') return null
  }

  return modal as ModalState
}
```

### Focus Management Recovery

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   If focus return element is missing:                           │
│                                                                 │
│   1. Try to find original trigger                               │
│   2. If not found, focus first focusable in game area           │
│   3. If none, focus body                                        │
│                                                                 │
│   const triggerRef = useRef<HTMLElement | null>(null)           │
│                                                                 │
│   function onClose() {                                          │
│     const target = triggerRef.current                           │
│       ?? document.querySelector('[data-game-focus-fallback]')   │
│       ?? document.body                                          │
│     target.focus()                                              │
│   }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hint Deduplication

```ts
function addHint(hints: Hint[], newHint: Hint): Hint[] {
  // Don't add duplicate messages
  if (hints.some(h => h.message === newHint.message)) {
    return hints
  }

  // Limit total hints
  const updated = [...hints, newHint]
  if (updated.length > MAX_HINTS) {
    return updated.slice(-MAX_HINTS)
  }

  return updated
}
```

### Portal Safety

```ts
// Ensure portal target exists
function OverlayLayer() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or find portal container
    let container = document.getElementById('overlay-portal')
    if (!container) {
      container = document.createElement('div')
      container.id = 'overlay-portal'
      document.body.appendChild(container)
    }
    setPortalTarget(container)

    return () => {
      // Cleanup if we created it
    }
  }, [])

  if (!portalTarget) return null

  return createPortal(<OverlayContent />, portalTarget)
}
```

---

## Security

### Form Input Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   All config form inputs must be validated:                     │
│                                                                 │
│   Router Config:                                                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ DHCP Enabled: boolean (checkbox, safe)                  │   │
│   │ IP Range:     validate CIDR format                      │   │
│   │               reject invalid patterns                   │   │
│   │               limit to private IP ranges                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### IP Range Validation

```ts
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
]

function validateIPRange(input: string): { valid: boolean; error?: string } {
  // Check format
  const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  if (!cidrPattern.test(input)) {
    return { valid: false, error: 'Invalid format. Use: 192.168.1.0/24' }
  }

  const [ip, prefix] = input.split('/')
  const prefixNum = parseInt(prefix, 10)

  // Check prefix range (no /32, must be /24 or larger network)
  if (prefixNum < 8 || prefixNum > 30) {
    return { valid: false, error: 'Prefix must be between /8 and /30' }
  }

  // Check private IP range
  if (!PRIVATE_IP_RANGES.some(r => r.test(ip))) {
    return { valid: false, error: 'Must use private IP range' }
  }

  return { valid: true }
}
```

### Config Data Sanitization

```ts
function sanitizeRouterConfig(config: unknown): RouterConfig | null {
  if (!config || typeof config !== 'object') return null

  const { dhcpEnabled, ipRange } = config as any

  // Validate types
  if (typeof dhcpEnabled !== 'boolean') return null

  // Validate and sanitize IP range
  const rangeValidation = validateIPRange(ipRange)
  if (!rangeValidation.valid) return null

  return {
    dhcpEnabled,
    ipRange: ipRange.trim(), // safe after validation
  }
}
```

### Modal Type Whitelist

```ts
const VALID_MODAL_TYPES = [
  'router-config',
  'pc-config',
  'success',
  'confirm',
] as const

type ModalType = typeof VALID_MODAL_TYPES[number]

// Reject unknown modal types
function handleOpenModal(action: OpenModalAction) {
  if (!VALID_MODAL_TYPES.includes(action.payload.type)) {
    console.warn('Unknown modal type:', action.payload.type)
    return state // ignore
  }
  // ... proceed
}
```

### Backdrop Click Safety

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Backdrop click should only close if:                          │
│                                                                 │
│   1. Click target is backdrop itself (not modal content)        │
│   2. Modal is dismissible (not a blocking confirmation)         │
│                                                                 │
│   function handleBackdropClick(e: MouseEvent) {                 │
│     if (e.target !== e.currentTarget) return // clicked inside  │
│     if (modal.blocking) return // can't dismiss                 │
│     dispatch({ type: 'CLOSE_MODAL' })                           │
│   }                                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
