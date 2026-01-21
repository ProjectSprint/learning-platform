# TerminalLayout — Specification

The **TerminalLayout** provides the bottom-docked container for terminal UI.
It accepts **TerminalView** and **TerminalInput** as injected children so you can swap or omit them.

---

## Responsibility

- Display terminal prompt and history (TerminalView)
- Capture user input (TerminalInput, optional)
- Provide a reusable docked container (TerminalLayout)

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TERMINAL                                                                    │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                            HISTORY                                      │ │
│ │                                                                         │ │
│ │   How can you check that PC-1 is connected to PC-2?                     │ │
│ │                                                                         │ │
│ │   > ping PC-3                                                           │ │
│ │   Error: Unknown device "PC-3"                                          │ │
│ │                                                                         │ │
│ │   > ping PC-2                                                           │ │
│ │   Reply from 192.168.1.3: bytes=32 time<1ms TTL=64                      │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ > _                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│   ▲                                                                         │
│   └── INPUT LINE (always at bottom)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Terminal States

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│       HIDDEN        │     │       ACTIVE        │     │      DISABLED       │
│                     │     │                     │     │                     │
│   terminal.visible  │     │   terminal.visible  │     │   question.status   │
│      = false        │     │      = true         │     │    = completed      │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         │                           │                           │
         ▼                           ▼                           ▼
    Not rendered              Accepts input              Read-only, shows
    or collapsed              Shows prompt               success message
```

---

## Entry Types

```
┌─────────────────────────────────────────────────────────────────┐
│                         HISTORY                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ PROMPT                                                  │   │
│   │ "How can you check that PC-1 is connected to PC-2?"     │   │
│   │                                          (type: prompt) │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ > ping PC-3                              (type: input)  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Error: Unknown device "PC-3"             (type: error)  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ > ping PC-2                              (type: input)  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Reply from 192.168.1.3: bytes=32...     (type: output)  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Type    | Style                  | Source                    |
| ------- | ---------------------- | ------------------------- |
| prompt  | Bold, highlighted      | Question definition       |
| input   | Prefixed with `>`      | User input                |
| output  | Normal text            | Command result (success)  |
| error   | Red text               | Command result (failure)  |
| hint    | Italic, muted          | Hint system               |

---

## Input Flow

```
Step 1 │ User types command
       │
       │   > ping PC-2_
       │             ▲
       │             └── cursor
       │
───────┼───────────────────────────────────────────────────────
       │
Step 2 │ User presses Enter
       │
       │   dispatch({
       │     type: 'SUBMIT_COMMAND',
       │     payload: { input: 'ping PC-2' }
       │   })
       │
───────┼───────────────────────────────────────────────────────
       │
Step 3 │ Reducer processes command
       │
       │   1. Add input to history
       │   2. Parse command (via question's parser)
       │   3. Validate (via question's validate)
       │   4. Add output/error to history
       │   5. Update question status if success
       │
───────┼───────────────────────────────────────────────────────
       │
Step 4 │ Terminal re-renders with new history
       │
       │   > ping PC-2
       │   Reply from 192.168.1.3: bytes=32 time<1ms TTL=64
       │
       │   > _
```

---

## Data Structure

```ts
type TerminalState = {
  visible: boolean
  prompt: string
  history: TerminalEntry[]
}

type TerminalEntry = {
  id: string
  type: 'prompt' | 'input' | 'output' | 'error' | 'hint'
  content: string
  timestamp: number
}
```

---

## Must Do

- Read from `state.terminal`
- Display history entries with correct styling
- Auto-scroll to bottom on new entries
- Dispatch `SUBMIT_COMMAND` on Enter
- Focus input when terminal becomes visible

---

## Must NOT Do

```
❌ Parsing commands

const parsed = parseCommand(input)  // ❌ reducer does this
```

```
❌ Validating answers

if (input === 'ping PC-2') {
  setSuccess(true)  // ❌ reducer handles validation
}
```

```
❌ Adding to history directly

setHistory([...history, newEntry])  // ❌ dispatch ADD_TERMINAL_OUTPUT
```

```
❌ Checking win condition

if (commandSucceeded) {
  dispatch({ type: 'COMPLETE_QUESTION' })  // ❌ reducer handles
}
```

---

## Keyboard Shortcuts

| Key        | Action                              |
| ---------- | ----------------------------------- |
| Enter      | Submit command                      |
| Up Arrow   | Previous command (history)          |
| Down Arrow | Next command (history)              |
| Ctrl+L     | Clear visible history               |
| Escape     | Clear input line                    |

---

## Command History Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User has entered:                                             │
│     1. ping PC-3                                                │
│     2. ping PC-2                                                │
│                                                                 │
│   Current input: (empty)                                        │
│                                                                 │
│   Press ↑:  "ping PC-2" appears                                 │
│   Press ↑:  "ping PC-3" appears                                 │
│   Press ↓:  "ping PC-2" appears                                 │
│   Press ↓:  (empty) appears                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility

| Requirement           | Implementation                              |
| --------------------- | ------------------------------------------- |
| Screen reader         | Announce new output entries                 |
| Focus management      | Auto-focus input when visible               |
| Keyboard only         | Full functionality without mouse            |
| High contrast         | Error messages clearly distinguished        |
| Role                  | `role="log"` for history, `role="textbox"` for input |

---

## Styling

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Background:   Dark (terminal-like)                            │
│   Font:         Monospace                                       │
│   Text:         Light gray                                      │
│                                                                 │
│   Prompt:       White, bold                                     │
│   Input:        Green prefix (>)                                │
│   Output:       Light gray                                      │
│   Error:        Red                                             │
│   Hint:         Italic, muted                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance

### History Virtualization

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   For long terminal histories:                                  │
│                                                                 │
│   Current: Render all entries (< 50 expected per session)       │
│   Future:  Virtualize if > 100 entries                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ... (virtualized, not in DOM)                           │   │
│   │ entry 95                                                │   │
│   │ entry 96                                                │   │
│   │ entry 97  ◄── visible viewport                          │   │
│   │ entry 98                                                │   │
│   │ entry 99                                                │   │
│   │ entry 100                                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Render Optimization

```ts
// Memoize history entries
const TerminalEntry = memo(({ entry }) => {
  return <div className={`entry-${entry.type}`}>{entry.content}</div>
})

// Only scroll container, not re-render entries
const historyRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight })
}, [history.length]) // only on new entry
```

### Input Debouncing

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Input is local state — no debouncing needed for typing.       │
│   Only dispatch on Enter (submit).                              │
│                                                                 │
│   const [input, setInput] = useState('')  // local              │
│                                                                 │
│   No context updates during typing = no re-renders elsewhere    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reliability

### History Limits

```ts
const MAX_HISTORY_ENTRIES = 100

function addHistoryEntry(history: TerminalEntry[], entry: TerminalEntry) {
  const newHistory = [...history, entry]

  // Trim oldest entries if over limit
  if (newHistory.length > MAX_HISTORY_ENTRIES) {
    return newHistory.slice(-MAX_HISTORY_ENTRIES)
  }

  return newHistory
}
```

### Command History (Navigation)

```ts
const MAX_COMMAND_HISTORY = 50

// Store only user inputs for up/down navigation
const commandHistory: string[] = []

function addCommand(command: string) {
  commandHistory.push(command)
  if (commandHistory.length > MAX_COMMAND_HISTORY) {
    commandHistory.shift() // remove oldest
  }
}
```

### Input Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Before submitting command:                                    │
│                                                                 │
│   1. Trim whitespace                                            │
│   2. Check not empty                                            │
│   3. Check max length (200 chars)                               │
│   4. Sanitize (strip HTML)                                      │
│                                                                 │
│   Invalid input → show error, don't dispatch                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Error Display Recovery

```ts
// If entry rendering fails, show fallback
function TerminalEntry({ entry }: { entry: TerminalEntry }) {
  try {
    return <div className={`entry-${entry.type}`}>{entry.content}</div>
  } catch {
    return <div className="entry-error">[Display error]</div>
  }
}
```

---

## Security

### Input Sanitization

```ts
const MAX_INPUT_LENGTH = 200

function sanitizeInput(input: string): string {
  return input
    .slice(0, MAX_INPUT_LENGTH)   // limit length
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[<>"']/g, '')        // remove dangerous chars
    .trim()
}

function handleSubmit() {
  const sanitized = sanitizeInput(input)
  if (!sanitized) return

  dispatch({ type: 'SUBMIT_COMMAND', payload: { input: sanitized } })
  setInput('')
}
```

### XSS Prevention

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   NEVER use dangerouslySetInnerHTML for terminal output.        │
│                                                                 │
│   ❌ <div dangerouslySetInnerHTML={{ __html: entry.content }} />│
│                                                                 │
│   ✅ <div>{entry.content}</div>                                 │
│                                                                 │
│   React auto-escapes text content.                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Output Sanitization

```ts
// Even output from game logic should be sanitized
function sanitizeOutput(output: string): string {
  return output
    .slice(0, 500)              // limit length
    .replace(/<[^>]*>/g, '')    // strip HTML
}

// In reducer
case 'ADD_TERMINAL_OUTPUT':
  return {
    ...state,
    terminal: {
      ...state.terminal,
      history: addHistoryEntry(state.terminal.history, {
        ...action.payload,
        content: sanitizeOutput(action.payload.content),
      }),
    },
  }
```

### Command Injection Prevention

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Terminal commands are parsed, not executed:                   │
│                                                                 │
│   User types: "ping PC-2; rm -rf /"                             │
│                                                                 │
│   Parser sees: { type: 'UNKNOWN', raw: 'ping PC-2; rm -rf /' }  │
│                                                                 │
│   No actual command execution — just string matching            │
│   against known command patterns.                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
