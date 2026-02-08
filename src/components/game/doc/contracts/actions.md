# Action Contracts

Source of truth: `src/components/game/application/state/actions/*`.

## Union

```ts
type Action = ApplicationAction | UIAction | CoreAction;
```

## ApplicationAction (World Facts)

### Space facts

- `SPACE_CREATED`
- `SPACE_REMOVED`
- `ENTITY_ADDED`
- `ENTITY_REMOVED`
- `ENTITY_MOVED`
- `ENTITY_POSITION_UPDATED`
- `ENTITIES_SWAPPED`

### Entity facts

- `ENTITY_CREATED`
- `ENTITY_UPDATED`
- `ENTITY_STATE_UPDATED`
- `ENTITIES_DELETED`

## UIAction (Intent Channel)

- `OPEN_MODAL`
- `CLOSE_MODAL`
- `MODAL_SUBMITTED`

## CoreAction

- `SET_QUESTION`
- `SET_PHASE`
- `COMPLETE_QUESTION`
- `ACK_EVENTS`
- `EMIT_EVENTS`

## World Action Examples

```ts
dispatch({
  type: "SPACE_CREATED",
  payload: { space: createGridSpaceData({ id: "board", rows: 1, cols: 1, metrics }) },
});

dispatch({
  type: "ENTITY_CREATED",
  payload: { entity: createItemData({ id: "router-1", name: "Router", allowedPlaces: ["inventory", "board"] }) },
});

dispatch({
  type: "ENTITY_ADDED",
  payload: { entityId: "router-1", spaceId: "inventory" },
});

dispatch({
  type: "ENTITY_MOVED",
  payload: {
    entityId: "router-1",
    fromSpaceId: "inventory",
    toSpaceId: "board",
    toPosition: { row: 0, col: 0 },
  },
});
```

## Modal Intent Example

```ts
dispatch({
  type: "OPEN_MODAL",
  payload: {
    id: "router-config",
    content: [],
    actions: [{ id: "save", label: "Save" }],
  },
});
```

## Deprecated World Actions (Forbidden)

These are hard-cut removed from active architecture guidance:

- `CREATE_SPACE`, `REMOVE_SPACE`
- `CREATE_ENTITY`, `UPDATE_ENTITY`, `UPDATE_ENTITY_STATE`, `DELETE_ENTITIES`
- `ADD_ENTITY_TO_SPACE`, `REMOVE_ENTITY_FROM_SPACE`
- `MOVE_ENTITY_BETWEEN_SPACES`, `UPDATE_ENTITY_POSITION`, `SWAP_ENTITIES`
- legacy aliases such as `PLACE_ITEM`, `TRANSFER_ITEM`, `REPOSITION_ITEM`, `UPDATE_POOL_GROUP`

Use the fact-style names listed above.

