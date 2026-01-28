# Engines

## Overview

Engines add reactive, automated behavior to the game. They listen to state changes and execute logic based on events, with built-in lifecycle management.

## Engine Lifecycle

All engines follow a three-phase lifecycle:

```
pending → started → finished
```

### Progress Tracking

```typescript
type EngineProgress = {
  status: 'pending' | 'started' | 'finished';
  startedAt?: number;    // Timestamp when started
  finishedAt?: number;   // Timestamp when finished
};
```

### Lifecycle Callbacks

```typescript
interface EngineLifecycleCallbacks<TContext> {
  onStarted?: (ctx: TContext) => void;
  onFinished?: (ctx: TContext) => void;
}
```

---

## Terminal Engine

The Terminal Engine processes terminal commands and manages command history.

### Basic Usage

```tsx
import { useTerminalEngine } from '@/components/game/engines/terminal/use-terminal-engine';

function TerminalGame() {
  const engine = useTerminalEngine({
    onCommand: (input, helpers) => {
      if (input === 'help') {
        helpers.writeOutput('Available commands: help, clear, exit', 'output');
      } else if (input === 'clear') {
        helpers.clearHistory();
      } else if (input === 'exit') {
        helpers.writeOutput('Goodbye!', 'output');
        helpers.finishEngine();
      } else {
        helpers.writeOutput(`Unknown command: ${input}`, 'error');
      }
    },
    onStarted: () => {
      console.log('Terminal engine started');
    },
    onFinished: () => {
      console.log('Terminal engine finished');
    }
  });

  return (
    <div>
      Status: {engine.progress.status}
    </div>
  );
}
```

### Terminal Engine API

#### Configuration

```typescript
interface TerminalEngineConfig<TContext> {
  context?: TContext;                    // Custom context data
  onCommand?: (input, helpers) => void;  // Command handler
  onStarted?: (ctx) => void;            // Lifecycle callback
  onFinished?: (ctx) => void;           // Lifecycle callback
}
```

#### Helpers

The `helpers` object provided to `onCommand`:

```typescript
interface TerminalCommandHelpers<TContext> {
  writeOutput: (content: string, type: 'output' | 'error' | 'hint') => void;
  clearHistory: () => void;
  finishEngine: () => void;
  context?: TContext;
}
```

#### Engine Controller

```typescript
interface TerminalEngine<TContext> {
  progress: EngineProgress;
  start: () => void;
  finish: () => void;
  reset: () => void;
  context?: TContext;
}
```

### Advanced Examples

#### Command Parsing

```tsx
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    const [command, ...args] = input.trim().split(/\s+/);

    switch (command) {
      case 'ping':
        if (args.length === 0) {
          helpers.writeOutput('Usage: ping <host>', 'error');
        } else {
          helpers.writeOutput(`Pinging ${args[0]}...`, 'output');
          helpers.writeOutput('Reply from ${args[0]}: time=10ms', 'output');
        }
        break;

      case 'traceroute':
        helpers.writeOutput(`Tracing route to ${args[0]}`, 'output');
        helpers.writeOutput('1  192.168.1.1  1ms', 'output');
        helpers.writeOutput('2  10.0.0.1     5ms', 'output');
        break;

      default:
        helpers.writeOutput(`Command not found: ${command}`, 'error');
    }
  }
});
```

#### Context Usage

```tsx
type GameContext = {
  networkDevices: string[];
  activeConnections: number;
};

const engine = useTerminalEngine<GameContext>({
  context: {
    networkDevices: ['router-1', 'switch-1', 'pc-1'],
    activeConnections: 0
  },
  onCommand: (input, helpers) => {
    const devices = helpers.context?.networkDevices || [];

    if (input === 'list-devices') {
      helpers.writeOutput(`Devices: ${devices.join(', ')}`, 'output');
    }
  }
});
```

#### Progress Tracking

```tsx
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    if (input === 'complete') {
      helpers.writeOutput('Task completed!', 'output');
      helpers.finishEngine();
    }
  }
});

// Check engine status
console.log(engine.progress.status);     // 'started'
console.log(engine.progress.startedAt);  // Timestamp

// Manually finish
engine.finish();
console.log(engine.progress.status);     // 'finished'
```

#### Hints System

```tsx
const engine = useTerminalEngine({
  onCommand: (input, helpers) => {
    const normalizedInput = input.toLowerCase().trim();

    if (normalizedInput.includes('help')) {
      helpers.writeOutput('Try using the "ping" command', 'hint');
    } else if (normalizedInput === 'pin') {
      helpers.writeOutput('Did you mean "ping"?', 'hint');
    } else {
      // Regular command processing
    }
  }
});
```

---

## Drag Engine

The Drag Engine monitors puzzle state and reacts to item placements.

### Basic Usage

```tsx
import { useDragEngine } from '@/components/game/engines/drag/use-drag-engine';

function PuzzleGame() {
  const engine = useDragEngine({
    autoStart: true,  // Start when first item placed
    onStarted: (ctx) => {
      console.log('User started placing items');
    },
    onFinished: (ctx) => {
      console.log('Puzzle completed!');
    }
  });

  // Access current puzzle state
  console.log(engine.state.placedItems);
  console.log(engine.state.puzzle.config);

  return (
    <div>
      Items placed: {engine.state.placedItems.length}
      Status: {engine.progress.status}
    </div>
  );
}
```

### Drag Engine API

#### Configuration

```typescript
interface DragEngineConfig<TContext> {
  context?: TContext;
  autoStart?: boolean;       // Auto-start when items placed (default: true)
  onStarted?: (ctx) => void;
  onFinished?: (ctx) => void;
}
```

#### Engine State

```typescript
interface DragEngineState {
  puzzle: PuzzleState;        // Current puzzle state
  placedItems: PlacedItem[];  // All placed items
}
```

#### Engine Controller

```typescript
interface DragEngine<TContext> {
  progress: EngineProgress;
  start: () => void;
  finish: () => void;
  reset: () => void;
  context?: TContext;
  state: DragEngineState;     // Puzzle state snapshot
}
```

### Advanced Examples

#### Completion Detection

```tsx
import { useEffect } from 'react';

const engine = useDragEngine({
  autoStart: true,
});

useEffect(() => {
  const { placedItems, puzzle } = engine.state;

  // Check if all required items are placed
  const requiredTypes = ['router', 'switch', 'server'];
  const placedTypes = placedItems.map(item => item.type);
  const allPlaced = requiredTypes.every(type =>
    placedTypes.includes(type)
  );

  if (allPlaced && engine.progress.status === 'started') {
    engine.finish();
  }
}, [engine]);
```

#### Validation on Placement

```tsx
const engine = useDragEngine();

useEffect(() => {
  const { placedItems } = engine.state;

  placedItems.forEach(item => {
    // Validate item placement
    const isValidPosition = validatePosition(item);

    if (!isValidPosition) {
      dispatch({
        type: 'CONFIGURE_DEVICE',
        payload: {
          deviceId: item.id,
          config: { status: 'error' }
        }
      });
    }
  });
}, [engine.state.placedItems]);
```

#### Context for Validation

```tsx
type ValidationContext = {
  requiredItems: string[];
  maxItems: number;
};

const engine = useDragEngine<ValidationContext>({
  context: {
    requiredItems: ['router', 'switch'],
    maxItems: 5
  }
});

useEffect(() => {
  const { placedItems } = engine.state;
  const { requiredItems, maxItems } = engine.context || {};

  const isComplete = requiredItems?.every(type =>
    placedItems.some(item => item.type === type)
  );

  const isValid = placedItems.length <= (maxItems || Infinity);

  if (isComplete && isValid) {
    engine.finish();
  }
}, [engine]);
```

---

## Creating Custom Engines

You can create custom engines using `useEngineProgress`:

```tsx
import { useEngineProgress } from '@/components/game/engines/use-engine-progress';
import { useGameState } from '@/components/game/game-provider';
import { useEffect } from 'react';

function useCustomEngine(config = {}) {
  const controller = useEngineProgress(config);
  const state = useGameState();

  useEffect(() => {
    // Your custom logic here
    if (someCondition(state)) {
      controller.start();
    }

    if (otherCondition(state)) {
      controller.finish();
    }
  }, [state, controller]);

  return controller;
}
```

### Example: Timer Engine

```tsx
import { useEngineProgress } from '@/components/game/engines/use-engine-progress';
import { useEffect } from 'react';

interface TimerEngineConfig {
  duration: number;  // milliseconds
  onTick?: (remaining: number) => void;
  onStarted?: () => void;
  onFinished?: () => void;
}

function useTimerEngine(config: TimerEngineConfig) {
  const controller = useEngineProgress(config);
  const [remaining, setRemaining] = useState(config.duration);

  useEffect(() => {
    if (controller.progress.status !== 'started') return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1000;
        config.onTick?.(next);

        if (next <= 0) {
          controller.finish();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [controller.progress.status]);

  return { ...controller, remaining };
}

// Usage
const timer = useTimerEngine({
  duration: 60000,  // 60 seconds
  onTick: (remaining) => {
    console.log(`${remaining / 1000}s remaining`);
  },
  onFinished: () => {
    console.log('Time up!');
  }
});

timer.start();
```

### Example: Score Engine

```tsx
function useScoreEngine() {
  const controller = useEngineProgress();
  const state = useGameState();
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (controller.progress.status !== 'started') return;

    // Calculate score based on placed items
    const newScore = state.puzzle.placedItems.reduce((total, item) => {
      if (item.status === 'success') return total + 10;
      if (item.status === 'warning') return total + 5;
      return total;
    }, 0);

    setScore(newScore);

    // Finish when target score reached
    if (newScore >= 100) {
      controller.finish();
    }
  }, [state.puzzle.placedItems, controller]);

  return { ...controller, score };
}
```

## Engine Patterns

### Multiple Engines

Run multiple engines simultaneously:

```tsx
function GameWithEngines() {
  const terminalEngine = useTerminalEngine({
    onCommand: handleCommand
  });

  const dragEngine = useDragEngine({
    autoStart: true
  });

  const scoreEngine = useScoreEngine();

  // Coordinate between engines
  useEffect(() => {
    if (dragEngine.progress.status === 'finished') {
      terminalEngine.finish();
      scoreEngine.finish();
    }
  }, [dragEngine.progress.status]);

  return <div>...</div>;
}
```

### Conditional Engine Activation

```tsx
function AdaptiveGame() {
  const state = useGameState();

  // Only use terminal engine in terminal phase
  const terminalEngine = useTerminalEngine({
    onCommand: state.phase === 'terminal' ? handleCommand : undefined
  });

  // Only use drag engine in playing phase
  const dragEngine = useDragEngine({
    autoStart: state.phase === 'playing'
  });

  return <div>...</div>;
}
```
