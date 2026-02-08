# Guide: Engines

> How to create and use engines for game progression logic.
> For event details, see [contracts/events.md](../contracts/events.md).
> For action details, see [contracts/actions.md](../contracts/actions.md).

## When to Read

- You need to implement game logic that reacts to player actions
- You are setting up drag-and-drop, terminal, or custom progression
- You need to understand the event consumption lifecycle

---

## What Is an Engine

An engine is a React hook that:
1. Subscribes to `GameEvent`s via `useEngineEvents(id)`
2. Processes events (validates, applies logic)
3. Dispatches actions or calls UI APIs in response
4. Acknowledges events to advance its cursor

Engines are the **glue** between core state changes and question-specific behavior.

```
Player action (drag, click, type)
  |
  v
Dispatch action -> Reducer -> State change + Events
  |
  v
Engine receives events via useEngineEvents()
  |
  v
Engine applies question logic (validate, progress, respond)
  |
  v
Engine dispatches follow-up actions or updates UI
```

---

## Built-in Engines

### Drag Engine

Manages the drag-and-drop lifecycle. Tracks progress (pending/started/finished).

```tsx
import { useDragEngine } from "@/components/game/engines";

const dragEngine = useDragEngine();
// dragEngine.progress.status: "pending" | "started" | "running" | "finished"
```

The drag engine automatically transitions:
- `pending` -> `started` when first entity enters a grid space
- `started` -> `finished` when all items are placed (per `finishCondition`)

Used for phase management: `dragStatus === "finished"` -> transition to next phase.

### Terminal Engine

Processes terminal input commands.

```tsx
import { useTerminalEngine } from "@/components/game/engines";

useTerminalEngine({
  onCommand: (input, helpers) => {
    if (input.startsWith("ping ")) {
      const target = input.slice(5).trim();
      helpers.writeOutput(`Pinging ${target}...`, "output");

      if (isValidIp(target)) {
        helpers.writeOutput("Reply from " + target, "success");
        helpers.finishEngine();
      } else {
        helpers.writeOutput("Request timed out.", "error");
      }
    } else {
      helpers.writeOutput(`Unknown command: ${input}`, "error");
    }
  },
});
```

**Terminal command helpers:**

| Helper | Description |
|--------|-------------|
| `writeOutput(content, type)` | Add output line (`"output"`, `"success"`, `"error"`, `"info"`) |
| `clearHistory()` | Clear terminal history |
| `finishEngine()` | Mark terminal engine as finished |
| `context` | Optional context value from config |

**How terminal input flows:**

```
User types in TerminalInput
  |
  v
useTerminalInput: sanitize + addInput() to TerminalStore
  |
  v
dispatch(EMIT_EVENTS [TERMINAL_INPUT { input }])
  |
  v
useTerminalEngine: receives TERMINAL_INPUT event
  |
  v
Calls onCommand(input, helpers)
  |
  v
Command handler writes output, may finishEngine()
```

---

## Custom Engine Pattern

For question-specific logic beyond drag and terminal:

```tsx
const { events, ack } = useEngineEvents("my-custom-engine");

useEffect(() => {
  if (events.length === 0) return;

  for (const event of events) {
    // React to specific events
    if (event.type === "ENTITY_MOVED" && event.toSpaceId === "target-zone") {
      // Check if puzzle is solved
      if (isPuzzleSolved(state)) {
        dispatch({ type: "OPEN_MODAL", payload: buildSuccessModal() });
      }
    }

    if (event.type === "MODAL_SUBMITTED" && event.modalId === "success") {
      dispatch({ type: "COMPLETE_QUESTION" });
    }
  }

  ack(); // Always acknowledge
}, [events, ack, state, dispatch]);
```

---

## Engine Progress

Engines can track lifecycle with `useEngineProgress`:

```tsx
import { useEngineProgress } from "@/components/game/engines/use-engine-progress";

const controller = useEngineProgress({ engineId: "my-engine" });

// controller.progress.status: "pending" | "started" | "running" | "finished"
// controller.start()  - transition to started/running
// controller.finish() - transition to finished
```

This is used by drag engine and terminal engine internally.

---

## Event Consumption Rules

1. **Always call `ack()`** - Even if you skip all events. Failing to ack causes re-delivery.

2. **Use unique engine IDs** - Two consumers with the same ID share a cursor and will miss events.

3. **Process all events in the batch** - `events` contains all new events since last ack.
   Process them in order.

4. **Don't dispatch inside the event loop without care** - Dispatching inside the event
   processing loop can cause the component to re-render mid-loop. Batch state updates or
   use flags:

```tsx
useEffect(() => {
  let shouldSync = false;

  for (const event of events) {
    if (event.type === "ENTITY_MOVED") {
      shouldSync = true;
    }
  }

  if (shouldSync) {
    setEventTick((prev) => prev + 1); // Trigger derived state recalc
  }
  ack();
}, [events, ack]);
```

5. **Events are append-only** - The queue grows forever during a session. Engines only see
   events after their cursor position.

---

## Terminal Setup Checklist

To add terminal support to a question:

1. **Import terminal components:**
   ```tsx
   import { TerminalInput, TerminalLayout, TerminalView, useTerminalInput, useTerminalStore }
     from "@/components/game/presentation/terminal";
   ```

2. **Set up terminal store:**
   ```tsx
   const { terminal, openTerminal, closeTerminal, setPrompt, addEntry, addOutput } = useTerminalStore();
   const terminalInput = useTerminalInput();
   ```

3. **Initialize prompt and intro:**
   ```tsx
   useEffect(() => {
     setPrompt("What command verifies connectivity?");
     addEntry({ id: "intro", type: "output", content: "Available: ping <ip>", timestamp: 0 });
     closeTerminal(); // Start hidden
   }, []);
   ```

4. **Wire up terminal engine:**
   ```tsx
   useTerminalEngine({ onCommand: myCommandHandler });
   ```

5. **Control visibility by phase:**
   ```tsx
   useEffect(() => {
     if (state.phase === "terminal") openTerminal();
   }, [state.phase]);
   ```

6. **Render terminal:**
   ```tsx
   <TerminalLayout
     visible={terminal.visible}
     focusRef={terminalInput.inputRef}
     view={<TerminalView history={terminal.history} prompt={terminal.prompt} isCompleted={isCompleted} />}
     input={<TerminalInput {...terminalInput} disabled={isCompleted} />}
   />
   ```

---

## Drag Engine Setup

Drag is mostly automatic. The `GridSpace` and `PoolSpace` components handle drag
interactions via `DragContext`. You just need:

1. **Use the drag engine hook:**
   ```tsx
   const dragEngine = useDragEngine();
   ```

2. **Use its status for phase management:**
   ```tsx
   // In phase rules
   { kind: "set", when: { kind: "eq", key: "dragStatus", value: "finished" }, to: "terminal" }
   ```

3. **Render the drag overlay:**
   ```tsx
   <DragOverlay getEntityLabel={(type) => labelMap[type]} />
   ```

The drag engine emits `ENGINE_STARTED` when a drag begins and watches for all items
being placed to determine completion.
