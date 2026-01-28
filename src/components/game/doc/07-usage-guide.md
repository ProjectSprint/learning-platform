# Usage Guide

## Quick Start

### 1. Basic Game Setup

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { PuzzleBoard } from '@/components/game/puzzle/board';
import { InventoryPanel } from '@/components/game/puzzle/inventory';

function App() {
  return (
    <GameProvider
      initialState={{
        phase: 'playing',
        inventory: {
          groups: [
            {
              id: 'items',
              title: 'Items',
              visible: true,
              items: [
                {
                  id: 'item-1',
                  type: 'block',
                  name: 'Block',
                  allowedPlaces: ['*']
                }
              ]
            }
          ]
        },
        // ... other state
      }}
    >
      <GameContainer />
    </GameProvider>
  );
}

function GameContainer() {
  return (
    <div>
      <InventoryPanel />
      <PuzzleBoard />
    </div>
  );
}
```

### 2. Initialize with Actions

```tsx
import { useEffect } from 'react';
import { useGameDispatch } from '@/components/game/game-provider';

function GameInitializer() {
  const dispatch = useGameDispatch();

  useEffect(() => {
    // Initialize game
    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'tutorial-1',
        canvases: {
          'main': {
            id: 'main',
            title: 'Puzzle',
            columns: 5,
            rows: 4
          }
        },
        inventoryGroups: [
          {
            id: 'tools',
            title: 'Tools',
            items: [
              {
                id: 'hammer',
                type: 'tool',
                name: 'Hammer',
                allowedPlaces: ['main']
              }
            ]
          }
        ],
        phase: 'playing'
      }
    });
  }, [dispatch]);

  return <YourGameComponents />;
}
```

---

## Common Patterns

### Pattern 1: Drag and Drop Game

```tsx
import { useDragEngine } from '@/components/game/engines/drag/use-drag-engine';
import { useGameState, useGameDispatch } from '@/components/game/game-provider';
import { PuzzleBoard } from '@/components/game/puzzle/board';
import { InventoryPanel } from '@/components/game/puzzle/inventory';

function DragDropGame() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const engine = useDragEngine({
    autoStart: true,
    onFinished: () => {
      console.log('Puzzle completed!');
      dispatch({ type: 'SET_PHASE', payload: { phase: 'completed' } });
    }
  });

  // Check completion
  useEffect(() => {
    const requiredItems = ['router', 'switch', 'server'];
    const placedTypes = engine.state.placedItems.map(i => i.type);
    const allPlaced = requiredItems.every(t => placedTypes.includes(t));

    if (allPlaced && engine.progress.status === 'started') {
      engine.finish();
    }
  }, [engine]);

  return (
    <div className="game-container">
      <InventoryPanel />
      <PuzzleBoard />
      <div>Status: {engine.progress.status}</div>
    </div>
  );
}
```

### Pattern 2: Terminal-Based Game

```tsx
import { useTerminalEngine } from '@/components/game/engines/terminal/use-terminal-engine';
import { TerminalView } from '@/components/game/terminal';
import { useGameDispatch } from '@/components/game/game-provider';

function TerminalGame() {
  const dispatch = useGameDispatch();

  const engine = useTerminalEngine({
    context: {
      level: 1,
      score: 0
    },
    onCommand: (input, helpers) => {
      const [cmd, ...args] = input.trim().toLowerCase().split(/\s+/);

      switch (cmd) {
        case 'help':
          helpers.writeOutput('Commands: help, connect, disconnect, exit', 'output');
          break;

        case 'connect':
          if (args.length === 0) {
            helpers.writeOutput('Usage: connect <host>', 'error');
          } else {
            helpers.writeOutput(`Connecting to ${args[0]}...`, 'output');
            setTimeout(() => {
              dispatch({
                type: 'ADD_TERMINAL_OUTPUT',
                payload: {
                  content: `Connected to ${args[0]}`,
                  type: 'output'
                }
              });
            }, 1000);
          }
          break;

        case 'exit':
          helpers.writeOutput('Goodbye!', 'output');
          helpers.finishEngine();
          dispatch({ type: 'SET_PHASE', payload: { phase: 'completed' } });
          break;

        default:
          helpers.writeOutput(`Unknown command: ${cmd}`, 'error');
          helpers.writeOutput('Type "help" for available commands', 'hint');
      }
    },
    onStarted: () => {
      dispatch({
        type: 'ADD_TERMINAL_OUTPUT',
        payload: {
          content: 'Welcome! Type "help" to get started.',
          type: 'output'
        }
      });
    }
  });

  return (
    <div className="terminal-game">
      <TerminalView />
    </div>
  );
}
```

### Pattern 3: Multi-Puzzle Game

```tsx
function MultiPuzzleGame() {
  const dispatch = useGameDispatch();
  const puzzles = useAllPuzzles();

  useEffect(() => {
    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'multi-puzzle-1',
        canvases: {
          'network-1': {
            id: 'network-1',
            title: 'Office Network',
            columns: 5,
            rows: 4,
            maxItems: 5
          },
          'network-2': {
            id: 'network-2',
            title: 'Home Network',
            columns: 4,
            rows: 3,
            maxItems: 3
          }
        },
        inventoryGroups: [
          {
            id: 'devices',
            title: 'Devices',
            items: [
              {
                id: 'router',
                type: 'router',
                allowedPlaces: ['network-1', 'network-2'],  // Both puzzles
                quantity: 2
              },
              {
                id: 'server',
                type: 'server',
                allowedPlaces: ['network-1'],  // Only office network
                quantity: 1
              }
            ]
          }
        ]
      }
    });
  }, []);

  return (
    <div className="multi-puzzle">
      {Object.entries(puzzles).map(([id, puzzle]) => (
        <div key={id} className="puzzle-section">
          <h3>{puzzle.config.title}</h3>
          <PuzzleBoard puzzleId={id} />
          <div>Items: {puzzle.placedItems.length} / {puzzle.config.maxItems}</div>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 4: Modal Configuration

```tsx
function DeviceConfigGame() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  const openConfigModal = (deviceId: string) => {
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        id: 'device-config',
        title: 'Configure Device',
        blocking: true,
        content: [
          {
            kind: 'text',
            text: 'Enter device configuration:'
          },
          {
            kind: 'field',
            field: {
              kind: 'text',
              id: 'deviceName',
              label: 'Device Name',
              placeholder: 'e.g., Router-1',
              validate: (value) => {
                if (!value) return 'Name is required';
                if (value.length < 3) return 'Name must be at least 3 characters';
                return null;
              }
            }
          },
          {
            kind: 'field',
            field: {
              kind: 'text',
              id: 'ipAddress',
              label: 'IP Address',
              placeholder: '192.168.1.1',
              validate: (value) => {
                const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
                if (!ipRegex.test(value)) return 'Invalid IP address';
                return null;
              }
            }
          },
          {
            kind: 'field',
            field: {
              kind: 'select',
              id: 'protocol',
              label: 'Protocol',
              options: [
                { value: 'static', label: 'Static IP' },
                { value: 'dhcp', label: 'DHCP' }
              ],
              defaultValue: 'dhcp'
            }
          }
        ],
        actions: [
          {
            id: 'cancel',
            label: 'Cancel',
            variant: 'secondary',
            closesModal: true
          },
          {
            id: 'save',
            label: 'Save Configuration',
            variant: 'primary',
            validate: true,
            onClick: ({ values, close, dispatch }) => {
              dispatch({
                type: 'CONFIGURE_DEVICE',
                payload: {
                  deviceId,
                  config: values
                }
              });
              close();
            }
          }
        ]
      }
    });
  };

  return (
    <div>
      <button onClick={() => openConfigModal('device-1')}>
        Configure Device
      </button>
    </div>
  );
}
```

### Pattern 5: Item Transfer Between Puzzles

```tsx
function TransferItemsExample() {
  const dispatch = useGameDispatch();

  const transferItem = () => {
    dispatch({
      type: 'TRANSFER_ITEM',
      payload: {
        itemId: 'router-1',
        fromPuzzle: 'network-1',
        fromBlockX: 0,
        fromBlockY: 0,
        toPuzzle: 'network-2',
        toBlockX: 1,
        toBlockY: 1
      }
    });
  };

  return <button onClick={transferItem}>Transfer Router</button>;
}
```

---

## Complete Examples

### Example 1: Network Topology Builder

```tsx
import { GameProvider, useGameDispatch, useGameState } from '@/components/game/game-provider';
import { useDragEngine } from '@/components/game/engines/drag/use-drag-engine';
import { PuzzleBoard } from '@/components/game/puzzle/board';
import { InventoryPanel } from '@/components/game/puzzle/inventory';
import { useEffect } from 'react';

function NetworkTopologyGame() {
  return (
    <GameProvider>
      <NetworkGameContent />
    </GameProvider>
  );
}

function NetworkGameContent() {
  const dispatch = useGameDispatch();

  useEffect(() => {
    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'network-topology',
        canvases: {
          'topology': {
            id: 'topology',
            title: 'Network Diagram',
            columns: 6,
            rows: 5,
            maxItems: 10
          }
        },
        inventoryGroups: [
          {
            id: 'devices',
            title: 'Network Devices',
            items: [
              {
                id: 'router',
                type: 'router',
                name: 'Router',
                allowedPlaces: ['topology'],
                quantity: 2,
                icon: { type: 'emoji', value: '🔀' }
              },
              {
                id: 'switch',
                type: 'switch',
                name: 'Switch',
                allowedPlaces: ['topology'],
                quantity: 3,
                icon: { type: 'emoji', value: '🔌' }
              },
              {
                id: 'server',
                type: 'server',
                name: 'Server',
                allowedPlaces: ['topology'],
                quantity: 2,
                icon: { type: 'emoji', value: '🖥️' }
              },
              {
                id: 'client',
                type: 'client',
                name: 'Client PC',
                allowedPlaces: ['topology'],
                quantity: 5,
                icon: { type: 'emoji', value: '💻' }
              }
            ]
          }
        ],
        phase: 'playing'
      }
    });
  }, [dispatch]);

  return <NetworkGame />;
}

function NetworkGame() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const engine = useDragEngine({
    autoStart: true,
    onFinished: () => {
      dispatch({
        type: 'OPEN_MODAL',
        payload: {
          title: 'Topology Complete!',
          content: [
            { kind: 'text', text: 'Great job! Your network topology is complete.' }
          ],
          actions: [
            {
              id: 'ok',
              label: 'OK',
              variant: 'primary',
              closesModal: true
            }
          ]
        }
      });
    }
  });

  // Validation logic
  useEffect(() => {
    const { placedItems } = engine.state;

    // Check if minimum requirements are met
    const hasRouter = placedItems.some(i => i.type === 'router');
    const hasSwitch = placedItems.some(i => i.type === 'switch');
    const hasServer = placedItems.some(i => i.type === 'server');
    const clientCount = placedItems.filter(i => i.type === 'client').length;

    // Update item statuses based on validation
    placedItems.forEach(item => {
      let status: PlacedItemStatus = 'normal';

      if (item.type === 'router' && hasSwitch && hasServer) {
        status = 'success';
      } else if (item.type === 'client' && !hasRouter) {
        status = 'error';
      }

      if (item.status !== status) {
        dispatch({
          type: 'CONFIGURE_DEVICE',
          payload: {
            deviceId: item.id,
            config: { status }
          }
        });
      }
    });

    // Complete when valid topology exists
    if (hasRouter && hasSwitch && hasServer && clientCount >= 2) {
      if (engine.progress.status === 'started') {
        engine.finish();
      }
    }
  }, [engine.state.placedItems, engine, dispatch]);

  return (
    <div className="network-game">
      <div className="header">
        <h1>Build Your Network</h1>
        <div>Items Placed: {state.puzzle.placedItems.length} / 10</div>
        <div>Status: {engine.progress.status}</div>
      </div>

      <div className="game-area">
        <InventoryPanel />
        <PuzzleBoard />
      </div>

      <div className="requirements">
        <h3>Requirements:</h3>
        <ul>
          <li>At least 1 Router</li>
          <li>At least 1 Switch</li>
          <li>At least 1 Server</li>
          <li>At least 2 Client PCs</li>
        </ul>
      </div>
    </div>
  );
}

export default NetworkTopologyGame;
```

### Example 2: Command-Line Simulation

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { useTerminalEngine } from '@/components/game/engines/terminal/use-terminal-engine';
import { TerminalView } from '@/components/game/terminal';
import { useState } from 'react';

type NetworkState = {
  connections: string[];
  files: string[];
  currentDir: string;
};

function CommandLineGame() {
  return (
    <GameProvider
      initialState={{
        phase: 'terminal',
        terminal: {
          visible: true,
          prompt: 'user@system:~$',
          history: []
        },
        // ... other required state
      }}
    >
      <TerminalSimulation />
    </GameProvider>
  );
}

function TerminalSimulation() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    connections: [],
    files: ['readme.txt', 'config.ini'],
    currentDir: '/home/user'
  });

  const engine = useTerminalEngine({
    context: networkState,
    onCommand: (input, helpers) => {
      const [cmd, ...args] = input.trim().split(/\s+/);

      switch (cmd.toLowerCase()) {
        case 'help':
          helpers.writeOutput('Available commands:', 'output');
          helpers.writeOutput('  ls - List files', 'output');
          helpers.writeOutput('  connect <host> - Connect to host', 'output');
          helpers.writeOutput('  disconnect <host> - Disconnect', 'output');
          helpers.writeOutput('  status - Show connection status', 'output');
          helpers.writeOutput('  exit - Complete simulation', 'output');
          break;

        case 'ls':
          helpers.writeOutput(networkState.files.join('  '), 'output');
          break;

        case 'connect':
          if (args.length === 0) {
            helpers.writeOutput('Usage: connect <hostname>', 'error');
          } else {
            const host = args[0];
            if (networkState.connections.includes(host)) {
              helpers.writeOutput(`Already connected to ${host}`, 'warning');
            } else {
              helpers.writeOutput(`Connecting to ${host}...`, 'output');
              setTimeout(() => {
                setNetworkState(prev => ({
                  ...prev,
                  connections: [...prev.connections, host]
                }));
                helpers.writeOutput(`Connected to ${host}`, 'output');
              }, 1000);
            }
          }
          break;

        case 'disconnect':
          if (args.length === 0) {
            helpers.writeOutput('Usage: disconnect <hostname>', 'error');
          } else {
            const host = args[0];
            if (!networkState.connections.includes(host)) {
              helpers.writeOutput(`Not connected to ${host}`, 'error');
            } else {
              setNetworkState(prev => ({
                ...prev,
                connections: prev.connections.filter(h => h !== host)
              }));
              helpers.writeOutput(`Disconnected from ${host}`, 'output');
            }
          }
          break;

        case 'status':
          if (networkState.connections.length === 0) {
            helpers.writeOutput('No active connections', 'output');
          } else {
            helpers.writeOutput('Active connections:', 'output');
            networkState.connections.forEach(conn => {
              helpers.writeOutput(`  - ${conn}`, 'output');
            });
          }
          break;

        case 'exit':
          helpers.writeOutput('Simulation completed!', 'output');
          helpers.finishEngine();
          break;

        default:
          helpers.writeOutput(`Command not found: ${cmd}`, 'error');
          helpers.writeOutput('Type "help" for available commands', 'hint');
      }
    },
    onStarted: () => {
      console.log('Terminal simulation started');
    },
    onFinished: () => {
      console.log('Simulation completed');
    }
  });

  return (
    <div className="terminal-simulation">
      <h1>Network Command Simulation</h1>
      <div className="status">
        Active Connections: {networkState.connections.length}
      </div>
      <TerminalView />
    </div>
  );
}

export default CommandLineGame;
```

---

## Best Practices

### 1. Initialize Once

```tsx
// ✅ Good: Initialize in useEffect
useEffect(() => {
  dispatch({ type: 'INIT_MULTI_CANVAS', payload: { /* ... */ } });
}, []);

// ❌ Bad: Initialize on every render
dispatch({ type: 'INIT_MULTI_CANVAS', payload: { /* ... */ } });
```

### 2. Validate Before Actions

```tsx
// ✅ Good: Check state before dispatching
const placeItem = () => {
  const block = state.puzzle.blocks[y][x];
  if (block.status === 'empty') {
    dispatch({ type: 'PLACE_ITEM', payload: { /* ... */ } });
  }
};

// ❌ Bad: Dispatch without checking
const placeItem = () => {
  dispatch({ type: 'PLACE_ITEM', payload: { /* ... */ } });
};
```

### 3. Use Engines for Reactive Logic

```tsx
// ✅ Good: Use engine for game logic
const engine = useDragEngine({
  onFinished: () => {
    // Handle completion
  }
});

useEffect(() => {
  if (checkCompletion(engine.state)) {
    engine.finish();
  }
}, [engine.state]);

// ❌ Bad: Manual state watching
useEffect(() => {
  if (state.puzzle.placedItems.length === 10) {
    // Completion logic
  }
}, [state.puzzle.placedItems]);
```

### 4. Clean Up Terminal History

```tsx
useEffect(() => {
  if (state.terminal.history.length > 500) {
    dispatch({ type: 'CLEAR_TERMINAL_HISTORY' });
  }
}, [state.terminal.history.length]);
```

### 5. Use Context for Engine State

```tsx
const engine = useTerminalEngine({
  context: {
    level: 1,
    score: 0,
    // Other game-specific data
  },
  onCommand: (input, helpers) => {
    // Access via helpers.context
    console.log(helpers.context?.level);
  }
});
```
