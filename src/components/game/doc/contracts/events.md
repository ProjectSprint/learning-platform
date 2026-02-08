# Event Contracts

> Authoritative reference for all game engine events.
> Source: `application/state/types/events.ts`, `application/state/events.ts`

## When to Read

- You need to react to state changes in your engine or question page
- You are writing a reducer and need to know which events to emit
- You are debugging event ordering or missed events

---

## Event Architecture

Events are **facts about state changes** that already happened. They are emitted by reducers
after mutations succeed. Engines consume events via `useEngineEvents(engineId)`.

```
  Action dispatched
       |
       v
  Reducer validates + mutates state
       |
       v
  Reducer appends GameEvent(s) to eventQueue
       |
       v
  Engine reads new events via useEngineEvents()
       |
       v
  Engine acknowledges with ACK_EVENTS
```

### Event Identity

Every event has a base shape:

```typescript
type GameEventBase = {
  eventId: number;    // Monotonic, unique across entire queue
  actionId: number;   // Groups events from the same action dispatch
  timestamp?: number; // Epoch ms (optional)
};
```

- `eventId` always increases (1, 2, 3, ...)
- Multiple events from one action share the same `actionId`
- Engines use `eventCursors[engineId]` to track which events they have processed

### Event Queue

```typescript
type GameEventQueue = {
  events: GameEvent[];  // Append-only
  lastEventId: number;
  lastActionId: number;
};
```

Events are **never removed** from the queue. Engines track their cursor position.

---

## Event Types

### GameEvent (Discriminated Union)

```typescript
type GameEvent =
  | EntityEnteredSpaceEvent
  | EntityLeftSpaceEvent
  | EntityMovedEvent
  | EntityUpdatedEvent
  | ModalOpenedEvent
  | ModalSubmittedEvent
  | ModalClosedEvent
  | TerminalInputEvent
  | EngineStartedEvent
  | EngineFinishedEvent
  | PhaseChangedEvent;
```

---

### ENTITY_ENTERED_SPACE

Emitted when an entity is added to a space it was not previously in.

```typescript
type EntityEnteredSpaceEvent = GameEventBase & {
  type: "ENTITY_ENTERED_SPACE";
  entityId: string;
  spaceId: string;
  position?: Record<string, unknown>;  // GridPosition for grid, { index } for pool
};
```

**Emitted by:**
- `ADD_ENTITY_TO_SPACE` action (space reducer)

**Chain:**

```
dispatch(ADD_ENTITY_TO_SPACE)
  |
  v
spaceReducer: validate entity + space exist
  |
  v
Grid: gridCanAccept() -> gridAdd()
Pool: capacity check  -> poolAdd()
  |
  v
emit ENTITY_ENTERED_SPACE { entityId, spaceId, position }
```

---

### ENTITY_LEFT_SPACE

Emitted when an entity is removed from a space.

```typescript
type EntityLeftSpaceEvent = GameEventBase & {
  type: "ENTITY_LEFT_SPACE";
  entityId: string;
  spaceId: string;
  position?: Record<string, unknown>;
};
```

**Emitted by:**
- `REMOVE_ENTITY_FROM_SPACE` action (space reducer)
- `REMOVE_ITEM` legacy action (space reducer)

**Chain:**

```
dispatch(REMOVE_ENTITY_FROM_SPACE)
  |
  v
spaceReducer: validate entity + space exist
  |
  v
Grid: gridGetPosition() -> gridRemove()
Pool: indexOf()         -> poolRemove()
  |
  v
emit ENTITY_LEFT_SPACE { entityId, spaceId, position }
```

---

### ENTITY_MOVED

Emitted when an entity transfers from one space to another.

```typescript
type EntityMovedEvent = GameEventBase & {
  type: "ENTITY_MOVED";
  entityId: string;
  fromSpaceId: string;
  toSpaceId: string;
  fromPosition?: Record<string, unknown>;
  toPosition?: Record<string, unknown>;
};
```

**Emitted by:**
- `MOVE_ENTITY_BETWEEN_SPACES` action (space reducer)
- `SWAP_ENTITIES` action (space reducer, 2 events)

**Chain:**

```
dispatch(MOVE_ENTITY_BETWEEN_SPACES)
  |
  v
spaceReducer: validate fromSpace, toSpace, entity exist
  |
  v
Check entity is in fromSpace (StrictMode guard)
  |
  v
Remove from source: gridRemove() / poolRemove()
  |
  v
Add to destination: gridCanAccept() + gridAdd() / poolAdd()
  |  (if add fails -> rollback to source)
  v
emit ENTITY_MOVED { entityId, fromSpaceId, toSpaceId, fromPosition, toPosition }
```

**Rollback behavior:** If the destination rejects the entity (capacity, bounds), the entity
is placed back in the source space and **no event is emitted**.

---

### ENTITY_UPDATED

Emitted when entity properties change (name, visual, data, state, draggable).

```typescript
type EntityUpdatePayload = {
  name?: EntityData["name"];
  draggable?: boolean;
  visual?: EntityData["visual"];
  data?: EntityData["data"];
  state?: EntityData["state"];
};

type EntityUpdatedEvent = GameEventBase & {
  type: "ENTITY_UPDATED";
  entityId: string;
  updates: EntityUpdatePayload;
};
```

**Emitted by:**
- `UPDATE_ENTITY` action (entity reducer)
- `UPDATE_ENTITY_STATE` action (entity reducer)

**Chain:**

```
dispatch(UPDATE_ENTITY)
  |
  v
entityReducer: validate entity exists
  |
  v
Compare each field (name, draggable, visual, data, state)
  |  (skip if no actual changes)
  v
Mutate entity fields that changed
  |
  v
emit ENTITY_UPDATED { entityId, updates: { ...changed fields only } }
```

**Note:** Only changed fields are included in `updates`. If nothing changed, no event is emitted.

---

### MODAL_OPENED

Emitted when a modal becomes visible.

```typescript
type ModalOpenedEvent = GameEventBase & {
  type: "MODAL_OPENED";
  modalId: string;
  modal: ModalInstance;
};
```

**Emitted by:**
- `OPEN_MODAL` action (UI reducer)

**Chain:**

```
dispatch(OPEN_MODAL { payload: ModalInstance })
  |
  v
uiReducer: check if modal already exists + visible
  |  (if already visible -> no-op, no event)
  v
Set modal visible: true
  |
  v
emit MODAL_OPENED { modalId, modal }
```

---

### MODAL_SUBMITTED

Emitted when a user submits a modal form (clicks an action button with `validate: true`).

```typescript
type ModalSubmittedEvent = GameEventBase & {
  type: "MODAL_SUBMITTED";
  modalId: string;
  modalActionId: string;
  values: Record<string, unknown>;
};
```

**Emitted by:**
- `MODAL_SUBMITTED` action (UI reducer)

**Chain:**

```
User clicks modal action button
  |
  v
dispatch(MODAL_SUBMITTED { modalId, modalActionId, values })
  |
  v
uiReducer: append event (no validation in reducer)
  |
  v
emit MODAL_SUBMITTED { modalId, modalActionId, values }
  |
  v
Engine listens -> processes submission -> advances phase/state
```

This is the primary mechanism for modal-driven progression (e.g., device configuration forms).

---

### MODAL_CLOSED

Emitted when a modal is hidden.

```typescript
type ModalCloseReason = "backdrop" | "escape" | "button" | "programmatic" | "unknown";

type ModalClosedEvent = GameEventBase & {
  type: "MODAL_CLOSED";
  modalId: string;
  modal?: ModalInstance;
  reason?: ModalCloseReason;
};
```

**Emitted by:**
- `CLOSE_MODAL` action (UI reducer)

**Chain:**

```
dispatch(CLOSE_MODAL { modalId? })
  |
  v
uiReducer: if modalId provided -> close that modal
           if no modalId        -> close ALL visible modals
  |  (skip already-hidden modals)
  v
Set modal(s) visible: false
  |
  v
emit MODAL_CLOSED { modalId, modal, reason: "programmatic" }
  (one event per closed modal)
```

---

### TERMINAL_INPUT

Emitted when a user submits text via the terminal interface.

```typescript
type TerminalInputEvent = GameEventBase & {
  type: "TERMINAL_INPUT";
  entryId: string;
  input: string;
};
```

**Emitted by:**
- `EMIT_EVENTS` action (core reducer, dispatched by TerminalProvider)

**Note:** Terminal UI state (prompt, history, visibility) lives in `TerminalProvider` (UI-local).
Only the submitted input crosses into core state as a `TERMINAL_INPUT` event.

---

### ENGINE_STARTED

Emitted to signal an engine has started processing.

```typescript
type EngineStartedEvent = GameEventBase & {
  type: "ENGINE_STARTED";
  engineId?: string;
};
```

**Emitted by:**
- `EMIT_EVENTS` action (core reducer, dispatched by engine code)

---

### ENGINE_FINISHED

Emitted to signal an engine has completed processing.

```typescript
type EngineFinishedEvent = GameEventBase & {
  type: "ENGINE_FINISHED";
  engineId?: string;
};
```

**Emitted by:**
- `EMIT_EVENTS` action (core reducer, dispatched by engine code)

---

### PHASE_CHANGED

Emitted when the game phase transitions.

```typescript
type PhaseChangedEvent = GameEventBase & {
  type: "PHASE_CHANGED";
  from: GamePhase;
  to: GamePhase;
};
```

**Emitted by:**
- `SET_PHASE` action (core reducer)

**Chain:**

```
dispatch(SET_PHASE { phase: "playing" })
  |
  v
coreReducer: check phase !== current (skip if same)
  |
  v
Update state.phase
  |
  v
emit PHASE_CHANGED { from: "setup", to: "playing" }
```

---

## Event Helpers

### GameEventInput

The type used when creating events in reducers. Omits auto-assigned fields:

```typescript
type GameEventInput = Omit<GameEvent, "eventId" | "actionId" | "timestamp">;
```

### appendEvents()

Appends events to the queue with auto-assigned IDs:

```typescript
appendEvents(queue: GameEventQueue, actionId: number, inputs: GameEventInput[]): GameEventQueue
```

- Assigns monotonically increasing `eventId` to each event
- Sets `actionId` on all events in the batch
- Returns a new queue (does not mutate)

### getNextActionId()

```typescript
getNextActionId(queue: GameEventQueue): number  // queue.lastActionId + 1
```

---

## Event Consumption Pattern

Engines consume events via `useEngineEvents(engineId)`:

```typescript
const { events, ack } = useEngineEvents("my-engine");

useEffect(() => {
  for (const event of events) {
    if (event.type === "ENTITY_MOVED") {
      // react to entity movement
    }
    if (event.type === "MODAL_SUBMITTED" && event.modalId === "config-modal") {
      // react to modal submission
    }
  }
  ack(); // dispatches ACK_EVENTS, advances cursor
}, [events, ack]);
```

**Critical:** Always call `ack()` after processing events to advance the cursor.
Failing to ack causes events to be re-delivered on every render.

---

## What Is NOT a GameEvent

The following are handled by UI-local providers and never appear in the event queue:

| Concern | Provider | Why not a GameEvent |
|---------|----------|---------------------|
| Drag start/end | `DragContext` | UI-transient, not progression |
| Drawer open/close | `DrawerProvider` | Layout concern |
| Hint show/hide | `HintProvider` | Display concern |
| Arrow add/remove | `ArrowProvider` | Visual decoration |
| Terminal visibility | `TerminalProvider` | UI chrome |
