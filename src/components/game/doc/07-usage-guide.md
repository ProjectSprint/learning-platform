# Usage Guide

## Quick Start

### 1. Basic Game Setup

```tsx
import { GameProvider } from '@/components/game/game-provider';
import { GridSpaceView } from '@/components/game/presentation/space/GridSpaceView';
import { PoolSpaceView } from '@/components/game/presentation/space/PoolSpaceView';
import { createGridSpaceData } from '@/components/game/domain/space';
import { createPoolSpaceData } from '@/components/game/domain/space';
import { createEntityData } from '@/components/game/domain/entity';

function App() {
  return (
    <GameProvider initialState={{ phase: 'playing' }}>
      <GameContainer />
    </GameProvider>
  );
}

function GameContainer() {
  const dispatch = useGameDispatch();

  useEffect(() => {
    // Create a grid space for gameplay
    const gridSpace = createGridSpaceData({
      id: 'game-grid',
      layout: {
        size: { rows: 4, cols: 5 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
    });

    // Create a pool space for items
    const poolSpace = createPoolSpaceData({
      id: 'items-pool',
      layout: { type: 'horizontal-wrap', gap: 8 },
    });

    // Create an entity
    const entity = createEntityData({
      id: 'item-1',
      type: 'block',
      name: 'Block',
      visual: { icon: '🧱' },
    });

    // Create spaces and entity in state
    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'demo-1',
        canvases: {
          'game-grid': {
            id: 'game-grid',
            title: 'Game Grid',
            canvasConfig: gridSpace,
          },
        },
        inventoryGroups: [
          {
            id: 'items-pool',
            title: 'Items',
            items: [
              {
                ...entity,
                allowedPlaces: ['game-grid'],
              },
            ],
          },
        ],
        phase: 'playing',
      },
    });
  }, [dispatch]);

  const gridSpace = useSpace('game-grid');
  const poolSpace = useSpace('items-pool');

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
import { createGridSpaceData } from '@/components/game/domain/space';

function GameInitializer() {
  const dispatch = useGameDispatch();

  useEffect(() => {
    // Initialize game
    const canvasConfig = createGridSpaceData({
      id: 'main',
      layout: {
        size: { rows: 4, cols: 5 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
    });

    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'tutorial-1',
        canvases: {
          main: {
            id: 'main',
            title: 'Puzzle',
            canvasConfig,
          },
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
                allowedPlaces: ['main'],
              },
            ],
          },
        ],
        phase: 'playing',
      },
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
import { useGameDispatch, useGameState } from '@/components/game/game-provider';
import { createGridSpaceData, createPoolSpaceData } from '@/components/game/domain/space';
import { createEntityData } from '@/components/game/domain/entity';
import { spaceGetEntityCount } from '@/components/game/domain/space';
import { useEffect } from 'react';

function DragDropGame() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  useEffect(() => {
    const gridSpace = createGridSpaceData({
      id: 'network-grid',
      layout: {
        size: { rows: 4, cols: 5 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
    });

    const poolSpace = createPoolSpaceData({
      id: 'devices',
      layout: { type: 'horizontal-wrap', gap: 8 },
    });

    const entities = ['router', 'switch', 'server'].map((type, i) =>
      createEntityData({
        id: `${type}-${i}`,
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        visual: {
          icon:
            type === 'router' ? '🔀' : type === 'switch' ? '🔌' : '🖥️',
        },
        allowedPlaces: ['network-grid'],
      }),
    );

    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'network-1',
        canvases: {
          'network-grid': {
            id: 'network-grid',
            title: 'Network',
            canvasConfig: gridSpace,
          },
        },
        inventoryGroups: [
          {
            id: 'devices',
            title: 'Devices',
            items: entities,
          },
        ],
        phase: 'playing',
      },
    });
  }, [dispatch]);

  const gridSpace = useSpace('network-grid');
  const completed =
    gridSpace ? spaceGetEntityCount(gridSpace) >= 3 : false;

  return (
    <div className="game-container">
      <PoolSpaceView space={useSpace('devices')} />
      {gridSpace && <GridSpaceView space={gridSpace} />}
      <div>Status: {completed ? 'completed' : 'playing'}</div>
    </div>
  );
}
```

### Pattern 2: Terminal-Based Game

```tsx
import { useTerminalEngine } from '@/components/game/engines/terminal/use-terminal-engine';
import { TerminalView } from '@/components/game/presentation/terminal';
import { useGameDispatch } from '@/components/game/game-provider';

function TerminalGame() {
  const dispatch = useGameDispatch();

  const engine = useTerminalEngine({
    context: {
      level: 1,
      score: 0,
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
              helpers.writeOutput(`Connected to ${args[0]}`, 'output');
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
          type: 'output',
        },
      });
    },
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
import { createGridSpaceData } from '@/components/game/domain/space';
import { useGameDispatch, useSpace } from '@/components/game/game-provider';
import { useEffect } from 'react';

function MultiSpaceGame() {
  const dispatch = useGameDispatch();

  useEffect(() => {
    const officeNetwork = createGridSpaceData({
      id: 'network-1',
      layout: {
        size: { rows: 4, cols: 5 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
      maxCapacity: 5,
    });

    const homeNetwork = createGridSpaceData({
      id: 'network-2',
      layout: {
        size: { rows: 3, cols: 4 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
      maxCapacity: 3,
    });

    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'multi-network',
        canvases: {
          'network-1': {
            id: 'network-1',
            title: 'Office Network',
            canvasConfig: officeNetwork,
          },
          'network-2': {
            id: 'network-2',
            title: 'Home Network',
            canvasConfig: homeNetwork,
          },
        },
        inventoryGroups: [],
        phase: 'playing',
      },
    });
  }, [dispatch]);

  const spaces = [
    { id: 'network-1', title: 'Office Network' },
    { id: 'network-2', title: 'Home Network' },
  ];

  return (
    <div className="multi-space-game">
      {spaces.map(({ id, title }) => {
        const space = useSpace(id);
        if (!space) return null;

        return (
          <div key={id} className="space-section">
            <h3>{title}</h3>
            <GridSpaceView space={space} />
            <div>
              Entities: {spaceGetEntityCount(space)} / {space.maxCapacity || '∞'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Pattern 4: Modal Configuration

```tsx
function DeviceConfigGame() {
  const dispatch = useGameDispatch();

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
            text: 'Enter device configuration:',
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
              },
            },
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
              },
            },
          },
          {
            kind: 'field',
            field: {
              kind: 'select',
              id: 'protocol',
              label: 'Protocol',
              options: [
                { value: 'static', label: 'Static IP' },
                { value: 'dhcp', label: 'DHCP' },
              ],
              defaultValue: 'dhcp',
            },
          },
        ],
        actions: [
          {
            id: 'cancel',
            label: 'Cancel',
            variant: 'secondary',
            closesModal: true,
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
                  config: values,
                },
              });
              close();
            },
          },
        ],
      },
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
import { useGameDispatch } from '@/components/game/game-provider';
import { gridRemove, gridAdd } from '@/components/game/domain/space';
import { isGridSpace } from '@/components/game/domain/space';

function TransferEntitiesExample() {
  const dispatch = useGameDispatch();
  const space1 = useSpace('network-1');
  const space2 = useSpace('network-2');

  const transferEntity = () => {
    if (!space1 || !space2) return;
    if (!isGridSpace(space1) || !isGridSpace(space2)) return;

    const entityId = 'router-1';

    // Remove from space1
    const success = gridRemove(space1, entityId);
    if (!success) return;

    // Add to space2 at new position
    gridAdd(space2, entityId, { row: 1, col: 1 });
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
import { createGridSpaceData, createPoolSpaceData } from '@/components/game/domain/space';
import { createEntityData } from '@/components/game/domain/entity';
import { useGameDispatch, useSpace, useEntity } from '@/components/game/game-provider';
import { spaceGetEntityCount, gridGetEntitiesAt } from '@/components/game/domain/space';
import { isGridSpace } from '@/components/game/domain/space';

function NetworkTopologyGame() {
  return (
    <GameProvider>
      <NetworkGameContent />
    </GameProvider>
  );
}

function NetworkGameContent() {
  const dispatch = useGameDispatch();
  const gridSpace = useSpace('topology');

  useEffect(() => {
    const gridSpaceData = createGridSpaceData({
      id: 'topology',
      layout: {
        size: { rows: 5, cols: 6 },
        cellSize: { width: 64, height: 64 },
        gap: { x: 4, y: 4 },
      },
      maxCapacity: 10,
    });

    const poolSpaceData = createPoolSpaceData({
      id: 'devices',
      layout: { type: 'vertical', gap: 8 },
    });

    const deviceTypes = [
      { type: 'router', icon: '🔀', count: 2 },
      { type: 'switch', icon: '🔌', count: 3 },
      { type: 'server', icon: '🖥️', count: 2 },
      { type: 'client', icon: '💻', count: 5 },
    ];

    const items: Array<ReturnType<typeof createEntityData>> = [];

    deviceTypes.forEach(({ type, icon, count }) => {
      for (let i = 0; i < count; i++) {
        const entity = createEntityData({
          id: `${type}-${i}`,
          type,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          visual: { icon },
          allowedPlaces: ['topology'],
        });
        items.push(entity);
      }
    });

    dispatch({
      type: 'INIT_MULTI_CANVAS',
      payload: {
        questionId: 'network-topology',
        canvases: {
          topology: {
            id: 'topology',
            title: 'Network Topology',
            canvasConfig: gridSpaceData,
          },
        },
        inventoryGroups: [
          {
            id: 'devices',
            title: 'Available Devices',
            items,
          },
        ],
        phase: 'playing',
      },
    });
  }, [dispatch]);

  const completed =
    gridSpace && isGridSpace(gridSpace)
      ? (() => {
          const entities = gridGetEntitiesAt(gridSpace, { row: 0, col: 0 });
          // Your validation logic here
          return false;
        })()
      : false;

  return (
    <div className="network-game">
      <div className="header">
        <h1>Build Your Network</h1>
        <div>
          Entities Placed: {gridSpace ? spaceGetEntityCount(gridSpace) : 0} / 10
        </div>
        <div>Status: {completed ? 'completed' : 'building'}</div>
      </div>
      <div className="game-area">
        <PoolSpaceView space={useSpace('devices')} />
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
import { TerminalView } from '@/components/game/presentation/terminal';
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
          history: [],
        },
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
    currentDir: '/home/user',
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
                setNetworkState((prev) => ({
                  ...prev,
                  connections: [...prev.connections, host],
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
              setNetworkState((prev) => ({
                ...prev,
                connections: prev.connections.filter((h) => h !== host),
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
            networkState.connections.forEach((conn) => {
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
    },
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

### 2. Use Domain Functions for Operations

```tsx
// ✅ Good: Use domain functions in reducers
import { gridAdd, gridCanAccept } from '@/components/game/domain/space';

if (isGridSpace(space) && gridCanAccept(space, position)) {
  gridAdd(space, entityId, position);
}

// ❌ Bad: Direct mutation without validation
space.occupied[key].push(entityId);
```

### 3. Use Hooks for State Access

```tsx
// ✅ Good: Use provided hooks
const space = useSpace('grid-id');
const entity = useEntity('entity-id');
const dispatch = useGameDispatch();

// ❌ Bad: Access raw state
const space = state.spaces['grid-id'];
```

### 4. Clean Up Terminal History

```tsx
useEffect(() => {
  if (state.terminal.history.length > 500) {
    dispatch({ type: 'CLEAR_TERMINAL_HISTORY' });
  }
}, [state.terminal.history.length, dispatch]);
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
  },
});
```