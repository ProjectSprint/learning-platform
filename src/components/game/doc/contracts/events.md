# Event Contracts

Source of truth: `src/components/game/application/state/types/events.ts`.

## Event Queue Model

Reducers append events into `eventQueue`.
Each event has:

```ts
type GameEventBase = {
  eventId: number;
  actionId: number;
  timestamp?: number;
};
```

`eventId` is globally monotonic.
`actionId` groups events emitted by one dispatch.

## Engine Consumption

Use `useEngineEvents(engineId)`:

- `events`: unread events for that consumer
- `cursor`: current ack cursor
- `ack()`: advance cursor to latest read event

Always call `ack()` after processing.

## Event Types

### Space/entity flow

- `ENTITY_ENTERED_SPACE`
- `ENTITY_LEFT_SPACE`
- `ENTITY_MOVED`
- `ENTITY_UPDATED`

### UI flow

- `MODAL_OPENED`
- `MODAL_SUBMITTED`
- `MODAL_CLOSED`

### Engine/system flow

- `TERMINAL_INPUT`
- `ENGINE_STARTED`
- `ENGINE_FINISHED`
- `PHASE_CHANGED`

## Emission Mapping

| Action | Typical emitted events |
| --- | --- |
| `ENTITY_ADDED` | `ENTITY_ENTERED_SPACE` |
| `ENTITY_REMOVED` | `ENTITY_LEFT_SPACE` |
| `ENTITY_MOVED` | `ENTITY_MOVED` |
| `ENTITY_UPDATED` / `ENTITY_STATE_UPDATED` | `ENTITY_UPDATED` |
| `OPEN_MODAL` | `MODAL_OPENED` |
| `CLOSE_MODAL` | `MODAL_CLOSED` |
| `MODAL_SUBMITTED` | `MODAL_SUBMITTED` |
| `SET_PHASE` | `PHASE_CHANGED` |
| `EMIT_EVENTS` | custom events from payload |

Notes:
- Rejected placement mutations should not emit success events.
- `ACK_EVENTS` updates per-engine cursor only; it does not mutate queue contents.

## Cursor Rules

1. Cursors are per-engine (`eventCursors[engineId]`).
2. Cursor updates are monotonic.
3. Cursor is clamped to `lastEventId`.

