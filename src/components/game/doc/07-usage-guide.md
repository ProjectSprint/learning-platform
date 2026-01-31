# Usage Guide

## Quick Start

### 1. Basic Game Setup

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { PoolSpaceView } from '@/components/game/presentation/space/PoolSpaceView';
import { GridSpace } from '@/components/game/domain/space';
import { PoolSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';
import { useState, useEffect } from 'react';

function App() {
  return (
    <GameProvider initialState={{ phase: 'playing' }}>
      <GameContainer />
    </GameProvider>
  );
}

function GameContainer() {
  const [gridSpace, setGridSpace] = useState(null);
  const [poolSpace, setPoolSpace] = useState(null);

  useEffect(() => {
    // Create a grid space for gameplay
    const grid = new GridSpace({
      id: 'game-grid',
      rows: 4,
      cols: 5,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    });

    // Create a pool space for items
    const pool = new PoolSpace({
      id: 'items-pool',
      layout: { type: 'horizontal-wrap', gap: 8 },
    });

    // Add some entities to the pool
    const entity = new Entity({
      id: 'item-1',
      type: 'block',
      name: 'Block',
      visual: { icon: '🧱' },
    });
    pool.add(entity);

    setGridSpace(grid);
    setPoolSpace(pool);
  }, []);

  return (
    <div>
      {poolSpace && <PoolSpaceView space={poolSpace} />}
      {gridSpace && <GridSpaceView space={gridSpace} />}
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
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { PoolSpaceView } from '@/components/game/presentation/space/PoolSpaceView';
import { GridSpace, PoolSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';
import { useState, useEffect } from 'react';

function DragDropGame() {
  const [gridSpace, setGridSpace] = useState(null);
  const [poolSpace, setPoolSpace] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Create spaces
    const grid = new GridSpace({
      id: 'network-grid',
      rows: 4,
      cols: 5,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
    });

    const pool = new PoolSpace({ id: 'devices', layout: { type: 'horizontal-wrap' } });

    // Create entities
    ['router', 'switch', 'server'].forEach((type, i) => {
      const entity = new Entity({
        id: `${type}-${i}`,
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        visual: { icon: type === 'router' ? '🔀' : type === 'switch' ? '🔌' : '🖥️' },
      });
      pool.add(entity);
    });

    setGridSpace(grid);
    setPoolSpace(pool);
  }, []);

  // Check completion
  useEffect(() => {
    if (!gridSpace) return;

    const requiredTypes = ['router', 'switch', 'server'];
    const entities = gridSpace.getEntities();
    const placedTypes = entities.map(e => e.type);
    const allPlaced = requiredTypes.every(t => placedTypes.includes(t));

    if (allPlaced && !completed) {
      setCompleted(true);
      console.log('Game completed!');
    }
  }, [gridSpace]);

  return (
    <div className="game-container">
      {poolSpace && <PoolSpaceView space={poolSpace} />}
      {gridSpace && <GridSpaceView space={gridSpace} />}
      <div>Status: {completed ? 'completed' : 'playing'}</div>
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

### Pattern 3: Multi-Space Game

```tsx
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { GridSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';

function MultiSpaceGame() {
  const [spaces, setSpaces] = useState({});

  useEffect(() => {
    // Create multiple spaces
    const officeNetwork = new GridSpace({
      id: 'network-1',
      rows: 4,
      cols: 5,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
      maxCapacity: 5,
    });

    const homeNetwork = new GridSpace({
      id: 'network-2',
      rows: 3,
      cols: 4,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
      maxCapacity: 3,
    });

    setSpaces({
      'network-1': { space: officeNetwork, title: 'Office Network' },
      'network-2': { space: homeNetwork, title: 'Home Network' },
    });
  }, []);

  return (
    <div className="multi-space-game">
      {Object.entries(spaces).map(([id, { space, title }]) => (
        <div key={id} className="space-section">
          <h3>{title}</h3>
          <GridSpaceView space={space} />
          <div>
            Entities: {space.getEntities().length} / {space.capacity().max || '∞'}
          </div>
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

### Pattern 5: Entity Transfer Between Spaces

```tsx
import { GridSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';

function TransferEntitiesExample() {
  const [spaces, setSpaces] = useState({ space1: null, space2: null });

  const transferEntity = () => {
    const { space1, space2 } = spaces;
    if (!space1 || !space2) return;

    // Find entity in space1
    const entity = space1.getEntities().find(e => e.id === 'router-1');
    if (!entity) return;

    // Get current position
    const currentPos = space1.getPosition(entity);

    // Remove from space1
    space1.remove(entity);

    // Add to space2 at new position
    space2.add(entity, { row: 1, col: 1 });

    // Trigger re-render
    setSpaces({ ...spaces });
  };

  return <button onClick={transferEntity}>Transfer Router</button>;
}
```

---

## Complete Examples

### Example 1: Network Topology Builder

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { PoolSpaceView } from '@/components/game/presentation/space/PoolSpaceView';
import { GridSpace, PoolSpace } from '@/components/game/domain/space';
import { Entity } from '@/components/game/domain/entity';
import { useState, useEffect } from 'react';

function NetworkTopologyGame() {
  return (
    <GameProvider>
      <NetworkGameContent />
    </GameProvider>
  );
}

function NetworkGameContent() {
  const [gridSpace, setGridSpace] = useState(null);
  const [poolSpace, setPoolSpace] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Create grid space for network diagram
    const grid = new GridSpace({
      id: 'topology',
      rows: 5,
      cols: 6,
      metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
      maxCapacity: 10,
    });

    // Create pool for available devices
    const pool = new PoolSpace({
      id: 'devices',
      layout: { type: 'vertical', gap: 8 },
    });

    // Add device entities to pool
    const deviceTypes = [
      { type: 'router', icon: '🔀', count: 2 },
      { type: 'switch', icon: '🔌', count: 3 },
      { type: 'server', icon: '🖥️', count: 2 },
      { type: 'client', icon: '💻', count: 5 },
    ];

    deviceTypes.forEach(({ type, icon, count }) => {
      for (let i = 0; i < count; i++) {
        const entity = new Entity({
          id: `${type}-${i}`,
          type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          visual: { icon },
        });
        pool.add(entity);
      }
    });

    setGridSpace(grid);
    setPoolSpace(pool);
  }, []);

  // Validation logic
  useEffect(() => {
    if (!gridSpace) return;

    const entities = gridSpace.getEntities();
    const hasRouter = entities.some(e => e.type === 'router');
    const hasSwitch = entities.some(e => e.type === 'switch');
    const hasServer = entities.some(e => e.type === 'server');
    const clientCount = entities.filter(e => e.type === 'client').length;

    if (hasRouter && hasSwitch && hasServer && clientCount >= 2) {
      setCompleted(true);
    }
  }, [gridSpace]);

  return (
    <div className="network-game">
      <div className="header">
        <h1>Build Your Network</h1>
        <div>
          Entities Placed: {gridSpace?.getEntities().length || 0} / 10
        </div>
        <div>Status: {completed ? 'completed' : 'building'}</div>
      </div>

      <div className="game-area">
        {poolSpace && <PoolSpaceView space={poolSpace} />}
        {gridSpace && <GridSpaceView space={gridSpace} />}
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
// ✅ Good: Check space constraints before adding
const addEntity = (entity, position) => {
  if (gridSpace.canAccept(entity, position)) {
    const success = gridSpace.add(entity, position);
    if (success) {
      setGridSpace({ ...gridSpace }); // Trigger re-render
    }
  }
};

// ✅ Good: Check capacity
const addEntity = (entity) => {
  if (!poolSpace.isFull()) {
    poolSpace.add(entity);
    setPoolSpace({ ...poolSpace });
  }
};
```

### 3. Use Reactive State Management

```tsx
// ✅ Good: Watch space state for completion
const [gridSpace, setGridSpace] = useState(null);

useEffect(() => {
  if (!gridSpace) return;

  const entities = gridSpace.getEntities();
  if (entities.length === 10) {
    console.log('Space is full!');
  }
}, [gridSpace]);

// ✅ Good: Use callback props
<GridSpaceView
  space={gridSpace}
  onEntityAdd={(entity, position) => {
    console.log('Entity added:', entity.id);
  }}
/>
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
