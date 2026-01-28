# Limitations and Constraints

## System Limits

### Inventory Limits

| Constraint | Limit | Reason |
|------------|-------|--------|
| Maximum items per group | 100 | Performance and UI constraints |
| Maximum inventory groups | Unlimited | No technical limit |
| Item ID length | No limit | String validation only |
| Item data size | No enforced limit | Consider performance impact |

**Validation:**
- Inventory items are automatically sliced to first 100 items per group
- Invalid items (missing `id` or `type`) are filtered out
- Duplicate item IDs across groups are prevented

### Puzzle Limits

| Constraint | Limit | Reason |
|------------|-------|--------|
| Grid size (recommended) | 20×20 blocks | UI rendering performance |
| Grid size (maximum) | No hard limit | May impact performance |
| Items per puzzle | Configurable via `maxItems` | Game design choice |
| Number of puzzles | Unlimited | Multi-puzzle support |

**Validation:**
- Block coordinates must be within grid bounds
- Only one item per block
- Items must exist in inventory before placement
- Items must be allowed on target puzzle

### Terminal Limits

| Constraint | Limit | Reason |
|------------|-------|--------|
| History entries | Unlimited | Manual clearing required |
| Entry content length | No limit | Consider UX for long outputs |
| Command processing | Synchronous | Async commands not supported |

**Recommendation:**
- Clear terminal history periodically to prevent performance issues
- Limit individual output lengths for better UX

### Modal Limits

| Constraint | Limit | Reason |
|------------|-------|--------|
| Active modals | 1 | Single overlay at a time |
| Fields per modal | No limit | UI may become unwieldy |
| Actions per modal | No limit | Recommended: 2-4 |

---

## Validation Rules

### Item Placement Validation

When placing items via `PLACE_ITEM`, the following checks occur:

1. **Item Exists**
   ```
   Item must exist in inventory with matching ID
   ```

2. **Block Availability**
   ```
   Target block must have status 'empty' or 'hover'
   Cannot place on 'occupied' or 'invalid' blocks
   ```

3. **Puzzle Allowed**
   ```
   Item's allowedPlaces must include:
   - ['*'] for any puzzle, OR
   - [puzzleId] for specific puzzle(s)
   ```

4. **Puzzle Capacity**
   ```
   If puzzle.config.maxItems is set:
   placedItems.length < maxItems
   ```

5. **Grid Bounds**
   ```
   0 <= blockX < puzzle.config.columns
   0 <= blockY < puzzle.config.rows
   ```

**Failed Validation:**
- Action is silently ignored
- State remains unchanged
- No error thrown

### Inventory Validation

When adding inventory via `ADD_INVENTORY_GROUP`:

1. **Duplicate Group ID**
   ```
   Group ID must be unique
   If duplicate, action is ignored
   ```

2. **Item Structure**
   ```
   Each item must have:
   - id: string (required)
   - type: string (required)
   - allowedPlaces: string[] (required)
   ```

3. **Duplicate Item IDs**
   ```
   Item IDs must be unique across ALL groups
   Duplicates are filtered out
   ```

4. **Item Limit**
   ```
   Only first 100 items per group are kept
   ```

### Modal Validation

When validating modal fields:

```typescript
type ModalFieldValidator<Value = unknown> = (
  value: Value,
  allValues: Record<string, unknown>
) => string | null;  // null = valid, string = error message
```

**Example:**
```tsx
{
  kind: 'text',
  id: 'ipAddress',
  label: 'IP Address',
  validate: (value) => {
    if (!value) return 'IP address is required';
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      return 'Invalid IP address format';
    }
    return null;
  }
}
```

**Validation Timing:**
- On action click (if `validate: true`)
- Blocks action if any field is invalid
- Error messages displayed inline

---

## Known Limitations

### 1. Single Active Modal

Only one modal can be active at a time. Opening a new modal closes the previous one.

**Workaround:**
- Use multi-step modals within a single modal instance
- Chain modal actions

### 2. No Undo/Redo

The engine does not include built-in undo/redo functionality.

**Workaround:**
- Implement custom state history tracking
- Store previous states in parent component

### 3. No Item Animation Callbacks

Item placement/removal happens instantly without animation hooks.

**Workaround:**
- Use engines to detect state changes
- Implement animations in UI layer using `useEffect`

### 4. Synchronous Command Processing

Terminal commands are processed synchronously. Async operations are not awaited.

**Workaround:**
```tsx
const engine = useTerminalEngine({
  onCommand: async (input, helpers) => {
    // This works but next command won't wait
    const result = await fetchData();
    helpers.writeOutput(result, 'output');
  }
});
```

**Better Approach:**
```tsx
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    helpers.writeOutput('Processing...', 'output');

    fetchData().then(result => {
      dispatch({
        type: 'ADD_TERMINAL_OUTPUT',
        payload: { content: result, type: 'output' }
      });
    });
  }
});
```

### 5. No Built-in Persistence

Game state is not persisted automatically. It's lost on page refresh.

**Workaround:**
```tsx
function PersistentGame() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem('gameState');
    return saved ? JSON.parse(saved) : undefined;
  });

  const gameState = useGameState();

  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  return <GameProvider initialState={state}>...</GameProvider>;
}
```

### 6. No Multi-Select in Inventory

Users cannot select multiple items for batch operations.

**Workaround:**
- Implement custom selection state outside the engine
- Dispatch multiple `PLACE_ITEM` actions in sequence

### 7. No Drag Constraints

Drag system doesn't support grid snapping or drag constraints out of the box.

**Workaround:**
- Implement in UI layer using drag hooks
- Validate final positions before dispatching

### 8. Limited Block Status

Blocks have limited status types: `empty | hover | occupied | invalid`

**Workaround:**
- Use placed item `status` for more granular states
- Store custom metadata in placed item `data`

---

## Performance Considerations

### Large Inventories

**Issue:** 100+ items may slow rendering

**Solutions:**
- Split items into multiple groups
- Use virtualized lists for large item counts
- Lazy load inventory groups

### Large Grids

**Issue:** Grids larger than 20×20 may impact performance

**Solutions:**
- Limit grid size to reasonable dimensions
- Use `React.memo` on grid components
- Virtualize grid rendering for very large grids

### Terminal History Growth

**Issue:** Unlimited terminal history can cause memory issues

**Solutions:**
```tsx
// Periodic cleanup
useEffect(() => {
  if (state.terminal.history.length > 1000) {
    dispatch({ type: 'CLEAR_TERMINAL_HISTORY' });
  }
}, [state.terminal.history.length]);

// Or manual clear command
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    if (input === 'clear') {
      helpers.clearHistory();
    }
  }
});
```

### Frequent State Updates

**Issue:** Dispatching many actions rapidly can cause performance issues

**Solutions:**
```tsx
// ❌ Bad: Many individual dispatches
items.forEach(item => {
  dispatch({ type: 'REMOVE_ITEM', payload: item });
});

// ✅ Better: Batch operations
dispatch({
  type: 'PURGE_ITEMS',
  payload: { itemIds: items.map(i => i.id) }
});
```

---

## Browser Compatibility

### Requirements

- Modern browsers with ES2015+ support
- React 16.8+ (hooks support)
- No IE11 support

### Tested Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Local Storage

For persistence workarounds, ensure:
- localStorage is available
- Sufficient storage quota
- Handle quota exceeded errors

---

## Security Considerations

### User Input Validation

**Terminal Commands:**
```tsx
// Always sanitize user input
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    // Validate/sanitize
    const sanitized = input.trim().slice(0, 1000);

    // Never execute as code
    // ❌ eval(input)  // NEVER DO THIS

    // Use safe command parsing
    const [command, ...args] = sanitized.split(/\s+/);
    // ... safe handling
  }
});
```

**Modal Fields:**
```tsx
// Validate all user input
{
  kind: 'text',
  id: 'username',
  validate: (value) => {
    // Prevent XSS
    if (/<|>|script/i.test(value)) {
      return 'Invalid characters';
    }
    return null;
  }
}
```

### Item Data

Item `data` fields accept arbitrary objects. Always validate before use:

```tsx
const item = state.puzzle.placedItems[0];

// ❌ Dangerous
const config = item.data as NetworkConfig;
config.execute?.();  // Could be malicious

// ✅ Safe
if (typeof item.data.ipAddress === 'string') {
  // Use validated data
}
```

---

## TypeScript Limitations

### Generic Constraints

Engine context types must be serializable for proper type inference:

```tsx
// ✅ Good
type Context = {
  count: number;
  items: string[];
};

// ❌ Avoid
type Context = {
  callback: () => void;  // Not serializable
  element: HTMLElement;  // Not serializable
};
```

### Action Type Narrowing

TypeScript cannot narrow action types automatically. Use type guards:

```tsx
const gameReducer = (state: GameState, action: GameAction) => {
  if (action.type === 'PLACE_ITEM') {
    // TypeScript knows action.payload has specific shape
    const { itemId, blockX, blockY } = action.payload;
  }
};
```
