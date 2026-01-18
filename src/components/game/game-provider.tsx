import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";

export type GamePhase =
	| "setup"
	| "configuring"
	| "playing"
	| "terminal"
	| "completed";
export type QuestionStatus = "in_progress" | "completed";

import type { IconInfo, ItemBehavior } from "./item-icons";

export type InventoryItem = {
	id: string;
	type: string;
	name?: string;
	used: boolean;
	quantity?: number;
	icon?: IconInfo;
	behavior?: ItemBehavior;
	data?: Record<string, unknown>;
};

export type CanvasConfig = {
	id: string;
	columns: number;
	rows: number;
	orientation?: "horizontal" | "vertical";
	stateKey?: string;
	allowedItemTypes?: string[];
	maxItems?: number;
	initialPlacements?: Placement[];
};

export type Placement = {
	blockX: number;
	blockY: number;
	itemType: string;
};

export type BlockStatus = "empty" | "hover" | "occupied" | "invalid";

export type Block = {
	x: number;
	y: number;
	status: BlockStatus;
	itemId?: string;
};

export type PlacedItemStatus = "normal" | "warning" | "success" | "error";

export type PlacedItem = {
	id: string;
	itemId: string;
	type: string;
	blockX: number;
	blockY: number;
	status: PlacedItemStatus;
	icon?: IconInfo;
	behavior?: ItemBehavior;
	data: Record<string, unknown>;
};

export type Connection = {
	id: string;
	type: "cable" | "wireless";
	from: { x: number; y: number };
	to: { x: number; y: number };
	cableId?: string;
};

export type CrossCanvasConnection = {
	id: string;
	type: "cable" | "wireless";
	from: {
		canvasKey: string;
		x: number;
		y: number;
	};
	to: {
		canvasKey: string;
		x: number;
		y: number;
	};
	cableId?: string;
};

export type SharedZoneItem = {
	id: string;
	key: string;
	value: unknown;
	sourceCanvas?: string;
	timestamp: number;
};

export type SharedZoneState = {
	items: Record<string, SharedZoneItem>;
};

export type TerminalEntryType =
	| "prompt"
	| "input"
	| "output"
	| "error"
	| "hint";

export type TerminalEntry = {
	id: string;
	type: TerminalEntryType;
	content: string;
	timestamp: number;
};

export type TerminalState = {
	visible: boolean;
	prompt: string;
	history: TerminalEntry[];
};

export type { ModalInstance } from "./modal-types";

import type { ModalInstance } from "./modal-types";

export type OverlayState = {
	activeModal: ModalInstance | null;
};

export type CanvasState = {
	config: CanvasConfig;
	blocks: Block[][];
	placedItems: PlacedItem[];
	connections: Connection[];
	selectedBlock: { x: number; y: number } | null;
};

export type GameState = {
	phase: GamePhase;
	inventory: { items: InventoryItem[] };
	canvas: CanvasState;
	canvases?: Record<string, CanvasState>;
	crossConnections: CrossCanvasConnection[];
	sharedZone: SharedZoneState;
	terminal: TerminalState;
	overlay: OverlayState;
	question: { id: string; status: QuestionStatus };
	sequence: number;
};

export type InitQuestionConfig = {
	canvas?: CanvasConfig;
	inventory?: InventoryItem[];
	terminal?: Partial<TerminalState>;
	phase?: GamePhase;
	questionStatus?: QuestionStatus;
};

export type GameAction =
	| {
			type: "INIT_QUESTION";
			payload: { questionId: string; config?: InitQuestionConfig };
	  }
	| {
			type: "PLACE_ITEM";
			payload: {
				itemId: string;
				blockX: number;
				blockY: number;
				stateKey?: string;
			};
	  }
	| {
			type: "REMOVE_ITEM";
			payload: { blockX: number; blockY: number; stateKey?: string };
	  }
	| {
			type: "REPOSITION_ITEM";
			payload: {
				itemId: string;
				fromBlockX: number;
				fromBlockY: number;
				toBlockX: number;
				toBlockY: number;
				stateKey?: string;
			};
	  }
	| {
			type: "MAKE_CONNECTION";
			payload: {
				from: { x: number; y: number };
				to: { x: number; y: number };
				cableId?: string;
				stateKey?: string;
			};
	  }
	| {
			type: "REMOVE_CONNECTION";
			payload: { connectionId: string; stateKey?: string };
	  }
	| {
			type: "MAKE_CROSS_CONNECTION";
			payload: {
				from: { canvasKey: string; x: number; y: number };
				to: { canvasKey: string; x: number; y: number };
				cableId?: string;
			};
	  }
	| {
			type: "REMOVE_CROSS_CONNECTION";
			payload: { connectionId: string };
	  }
	| {
			type: "SET_SHARED_DATA";
			payload: {
				key: string;
				value: unknown;
				sourceCanvas?: string;
			};
	  }
	| {
			type: "REMOVE_SHARED_DATA";
			payload: { key: string };
	  }
	| {
			type: "TRANSFER_ITEM";
			payload: {
				itemId: string;
				fromCanvas: string;
				fromBlockX: number;
				fromBlockY: number;
				toCanvas: string;
				toBlockX: number;
				toBlockY: number;
			};
	  }
	| {
			type: "INIT_MULTI_CANVAS";
			payload: {
				questionId: string;
				canvases: Record<string, CanvasConfig>;
				inventory?: InventoryItem[];
				terminal?: Partial<TerminalState>;
				phase?: GamePhase;
				questionStatus?: QuestionStatus;
			};
	  }
	| {
			type: "CONFIGURE_DEVICE";
			payload: {
				deviceId: string;
				config: Record<string, unknown>;
				stateKey?: string;
			};
	  }
	| { type: "OPEN_MODAL"; payload: ModalInstance }
	| { type: "CLOSE_MODAL" }
	| { type: "SUBMIT_COMMAND"; payload: { input: string } }
	| {
			type: "ADD_TERMINAL_OUTPUT";
			payload: {
				content: string;
				type: Exclude<TerminalEntryType, "input" | "prompt">;
			};
	  }
	| { type: "CLEAR_TERMINAL_HISTORY" }
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };

const MAX_HISTORY_ENTRIES = 100;
const MAX_INPUT_LENGTH = 200;
const MAX_OUTPUT_LENGTH = 500;
const MAX_CONFIG_VALUE_LENGTH = 100;
const MAX_INVENTORY_ITEMS = 50;

const defaultCanvasConfig: CanvasConfig = {
	id: "default-canvas",
	columns: 6,
	rows: 4,
	orientation: "horizontal",
};

const sanitizeText = (value: string, maxLength: number) =>
	value
		.slice(0, maxLength)
		.replace(/<[^>]*>/g, "")
		.replace(/[<>"'&]/g, "")
		.trim();

const sanitizeTerminalInput = (input: string) =>
	sanitizeText(input, MAX_INPUT_LENGTH);

const sanitizeTerminalOutput = (output: string) =>
	sanitizeText(output, MAX_OUTPUT_LENGTH);

const sanitizeConfigValue = (value: string) =>
	sanitizeText(value, MAX_CONFIG_VALUE_LENGTH);

const sanitizeDeviceConfig = (config: Record<string, unknown>) => {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		if (value === null) {
			sanitized[key] = null;
			continue;
		}

		if (typeof value === "string") {
			sanitized[key] = sanitizeConfigValue(value);
			continue;
		}

		if (typeof value === "number" || typeof value === "boolean") {
			sanitized[key] = value;
		}
	}

	return sanitized;
};

const createBlockGrid = (columns: number, rows: number) =>
	Array.from({ length: rows }, (_, rowIndex) =>
		Array.from({ length: columns }, (_, colIndex) => ({
			x: colIndex,
			y: rowIndex,
			status: "empty" as BlockStatus,
		})),
	);

const createCanvasState = (config: CanvasConfig): CanvasState => ({
	config,
	blocks: createBlockGrid(config.columns, config.rows),
	placedItems: [],
	connections: [],
	selectedBlock: null,
});

const resolveCanvasState = (state: GameState, stateKey?: string) => {
	if (!stateKey) {
		return state.canvas;
	}

	return state.canvases?.[stateKey] ?? state.canvas;
};

const updateCanvasState = (
	state: GameState,
	stateKey: string | undefined,
	nextCanvas: CanvasState,
): GameState => {
	if (!stateKey) {
		return { ...state, canvas: nextCanvas };
	}

	const nextPrimary =
		state.canvas.config.stateKey === stateKey ? nextCanvas : state.canvas;

	return {
		...state,
		canvas: nextPrimary,
		canvases: {
			...(state.canvases ?? {}),
			[stateKey]: nextCanvas,
		},
	};
};

const updateBlock = (
	blocks: Block[][],
	blockX: number,
	blockY: number,
	updates: Partial<Block>,
) => {
	if (!blocks[blockY]?.[blockX]) {
		return blocks;
	}

	const nextBlocks = blocks.slice();
	const nextRow = nextBlocks[blockY].slice();
	nextRow[blockX] = { ...nextRow[blockX], ...updates };
	nextBlocks[blockY] = nextRow;
	return nextBlocks;
};

const addHistoryEntry = (history: TerminalEntry[], entry: TerminalEntry) => {
	const nextHistory = [...history, entry];
	if (nextHistory.length > MAX_HISTORY_ENTRIES) {
		return nextHistory.slice(-MAX_HISTORY_ENTRIES);
	}
	return nextHistory;
};

const normalizeInventory = (items: InventoryItem[]) =>
	items
		.filter(
			(item) =>
				item && typeof item.id === "string" && typeof item.type === "string",
		)
		.slice(0, MAX_INVENTORY_ITEMS)
		.map((item) => ({ ...item, used: Boolean(item.used) }));

const applyInitialPlacements = (
	canvas: CanvasState,
	inventoryItems: InventoryItem[],
): { canvas: CanvasState; inventory: InventoryItem[] } => {
	const placements = canvas.config.initialPlacements ?? [];
	if (placements.length === 0) {
		return { canvas, inventory: inventoryItems };
	}

	let nextBlocks = canvas.blocks;
	let nextInventory = inventoryItems;
	const placedItems: PlacedItem[] = [];

	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		let itemId = `initial-${placement.itemType}-${placement.blockX}-${placement.blockY}`;
		const inventoryIndex = nextInventory.findIndex(
			(item) => item.type === placement.itemType && !item.used,
		);

		if (inventoryIndex >= 0) {
			const inventoryItem = nextInventory[inventoryIndex];
			itemId = inventoryItem.id;
			nextInventory = nextInventory.map((item, index) =>
				index === inventoryIndex ? { ...item, used: true } : item,
			);
		}

		placedItems.push({
			id: itemId,
			itemId,
			type: placement.itemType,
			blockX: placement.blockX,
			blockY: placement.blockY,
			status: "normal",
			data: {},
		});

		nextBlocks = updateBlock(nextBlocks, placement.blockX, placement.blockY, {
			status: "occupied",
			itemId,
		});
	});

	return {
		canvas: {
			...canvas,
			blocks: nextBlocks,
			placedItems,
			connections: deriveConnectionsFromCables(placedItems),
		},
		inventory: nextInventory,
	};
};

const createDefaultState = (): GameState => ({
	phase: "setup",
	inventory: { items: [] },
	canvas: createCanvasState(defaultCanvasConfig),
	crossConnections: [],
	sharedZone: { items: {} },
	terminal: {
		visible: false,
		prompt: "",
		history: [],
	},
	overlay: {
		activeModal: null,
	},
	question: {
		id: "",
		status: "in_progress",
	},
	sequence: 0,
});

const createEntry = (
	state: GameState,
	type: TerminalEntryType,
	content: string,
): { entry: TerminalEntry; sequence: number } => {
	const nextSequence = state.sequence + 1;
	return {
		entry: {
			id: `entry-${nextSequence}`,
			type,
			content,
			timestamp: nextSequence,
		},
		sequence: nextSequence,
	};
};

const normalizeConnectionKey = (
	from: { x: number; y: number },
	to: { x: number; y: number },
) => {
	if (from.y < to.y || (from.y === to.y && from.x <= to.x)) {
		return `${from.x},${from.y}-${to.x},${to.y}`;
	}
	return `${to.x},${to.y}-${from.x},${from.y}`;
};

const CONNECTABLE_DEVICE_TYPES = new Set(["pc", "router"]);

const isConnectableDevice = (item?: PlacedItem) =>
	Boolean(item && CONNECTABLE_DEVICE_TYPES.has(item.type));

const deriveConnectionsFromCables = (placedItems: PlacedItem[]) => {
	const byCoord = new Map<string, PlacedItem>();
	placedItems.forEach((item) => {
		byCoord.set(`${item.blockX}-${item.blockY}`, item);
	});

	const connections: Connection[] = [];
	const seen = new Set<string>();

	const maybeAddConnection = (from: PlacedItem, to: PlacedItem) => {
		if (!isConnectableDevice(from) || !isConnectableDevice(to)) {
			return;
		}

		if (from.type === to.type) {
			return;
		}

		const fromCoord = { x: from.blockX, y: from.blockY };
		const toCoord = { x: to.blockX, y: to.blockY };
		const key = normalizeConnectionKey(fromCoord, toCoord);
		if (seen.has(key)) {
			return;
		}

		seen.add(key);
		connections.push({
			id: `connection-${key}-link`,
			type: "cable",
			from: fromCoord,
			to: toCoord,
		});
	};

	placedItems
		.filter((item) => item.type === "cable")
		.forEach((cable) => {
			const left = byCoord.get(`${cable.blockX - 1}-${cable.blockY}`);
			const right = byCoord.get(`${cable.blockX + 1}-${cable.blockY}`);
			const up = byCoord.get(`${cable.blockX}-${cable.blockY - 1}`);
			const down = byCoord.get(`${cable.blockX}-${cable.blockY + 1}`);

			if (left && right) {
				maybeAddConnection(left, right);
			}

			if (up && down) {
				maybeAddConnection(up, down);
			}
		});

	return connections;
};

const reducer = (state: GameState, action: GameAction): GameState => {
	switch (action.type) {
		case "INIT_QUESTION": {
			const config = action.payload.config;
			const canvasConfig = config?.canvas ?? defaultCanvasConfig;
			const nextCanvas = createCanvasState(canvasConfig);
			const inventoryItems = normalizeInventory(config?.inventory ?? []);
			const seeded = applyInitialPlacements(nextCanvas, inventoryItems);
			const terminal = {
				...state.terminal,
				...config?.terminal,
			};
			return {
				...createDefaultState(),
				phase: config?.phase ?? "setup",
				inventory: { items: seeded.inventory },
				canvas: seeded.canvas,
				terminal: {
					visible: terminal.visible ?? false,
					prompt: terminal.prompt ?? "",
					history: terminal.history ?? [],
				},
				question: {
					id: action.payload.questionId,
					status: config?.questionStatus ?? "in_progress",
				},
			};
		}
		case "INIT_MULTI_CANVAS": {
			const config = action.payload;
			const entries = Object.values(config.canvases);
			if (entries.length === 0) {
				return state;
			}

			const stateKeys = new Set<string>();
			for (const canvasConfig of entries) {
				if (!canvasConfig.stateKey) {
					return state;
				}
				if (stateKeys.has(canvasConfig.stateKey)) {
					return state;
				}
				stateKeys.add(canvasConfig.stateKey);
			}

			let inventoryItems = normalizeInventory(config.inventory ?? []);
			const nextCanvases: Record<string, CanvasState> = {};

			for (const canvasConfig of entries) {
				const key = canvasConfig.stateKey;
				if (!key) {
					return state;
				}
				const seeded = applyInitialPlacements(
					createCanvasState(canvasConfig),
					inventoryItems,
				);
				inventoryItems = seeded.inventory;
				nextCanvases[key] = seeded.canvas;
			}

			const firstKey = entries[0].stateKey;
			if (!firstKey) {
				return state;
			}
			const firstCanvas = nextCanvases[firstKey];
			if (!firstCanvas) {
				return state;
			}

			const terminal = {
				...state.terminal,
				...config.terminal,
			};

			return {
				...createDefaultState(),
				phase: config.phase ?? "setup",
				inventory: { items: inventoryItems },
				canvas: firstCanvas,
				canvases: nextCanvases,
				terminal: {
					visible: terminal.visible ?? false,
					prompt: terminal.prompt ?? "",
					history: terminal.history ?? [],
				},
				question: {
					id: config.questionId,
					status: config.questionStatus ?? "in_progress",
				},
			};
		}
		case "PLACE_ITEM": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const { itemId, blockX, blockY } = action.payload;
			const item = state.inventory.items.find((entry) => entry.id === itemId);

			if (!item || item.used) {
				return state;
			}

			if (!canvas.blocks[blockY]?.[blockX]) {
				return state;
			}

			if (canvas.blocks[blockY][blockX].status === "occupied") {
				return state;
			}

			if (
				canvas.config.allowedItemTypes &&
				!canvas.config.allowedItemTypes.includes(item.type)
			) {
				return state;
			}

			if (
				typeof canvas.config.maxItems === "number" &&
				canvas.placedItems.length >= canvas.config.maxItems
			) {
				return state;
			}

			const placedItem: PlacedItem = {
				id: item.id,
				itemId: item.id,
				type: item.type,
				blockX,
				blockY,
				status: "normal",
				icon: item.icon,
				behavior: item.behavior,
				data: item.data ?? {},
			};

			const nextBlocks = updateBlock(canvas.blocks, blockX, blockY, {
				status: "occupied",
				itemId: item.id,
			});

			const nextPlacedItems = [...canvas.placedItems, placedItem];
			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: deriveConnectionsFromCables(nextPlacedItems),
			};

			const nextInventory = state.inventory.items.map((entry) =>
				entry.id === item.id ? { ...entry, used: true } : entry,
			);

			return updateCanvasState(
				{
					...state,
					inventory: { items: nextInventory },
				},
				action.payload.stateKey,
				nextCanvas,
			);
		}
		case "REMOVE_ITEM": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const { blockX, blockY } = action.payload;
			const block = canvas.blocks[blockY]?.[blockX];

			if (!block?.itemId) {
				return state;
			}

			const nextBlocks = updateBlock(canvas.blocks, blockX, blockY, {
				status: "empty",
				itemId: undefined,
			});

			const nextPlacedItems = canvas.placedItems.filter(
				(item) => item.itemId !== block.itemId,
			);
			const nextConnections = deriveConnectionsFromCables(nextPlacedItems);

			const nextInventory = state.inventory.items.map((entry) =>
				entry.id === block.itemId ? { ...entry, used: false } : entry,
			);

			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: nextConnections,
			};

			return updateCanvasState(
				{
					...state,
					inventory: { items: nextInventory },
				},
				action.payload.stateKey,
				nextCanvas,
			);
		}
		case "REPOSITION_ITEM": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const { itemId, fromBlockX, fromBlockY, toBlockX, toBlockY } =
				action.payload;

			if (fromBlockX === toBlockX && fromBlockY === toBlockY) {
				return state;
			}

			const fromBlock = canvas.blocks[fromBlockY]?.[fromBlockX];
			if (!fromBlock?.itemId || fromBlock.itemId !== itemId) {
				return state;
			}

			const toBlock = canvas.blocks[toBlockY]?.[toBlockX];
			if (!toBlock) {
				return state;
			}

			if (toBlock.status === "occupied") {
				return state;
			}

			if (
				canvas.config.allowedItemTypes &&
				!canvas.config.allowedItemTypes.includes(
					canvas.placedItems.find((p) => p.itemId === itemId)?.type ?? "",
				)
			) {
				return state;
			}

			const placedItem = canvas.placedItems.find((p) => p.itemId === itemId);
			if (!placedItem) {
				return state;
			}

			let nextBlocks = updateBlock(canvas.blocks, fromBlockX, fromBlockY, {
				status: "empty",
				itemId: undefined,
			});
			nextBlocks = updateBlock(nextBlocks, toBlockX, toBlockY, {
				status: "occupied",
				itemId,
			});

			const nextPlacedItems = canvas.placedItems.map((item) =>
				item.itemId === itemId
					? { ...item, blockX: toBlockX, blockY: toBlockY }
					: item,
			);

			const nextCanvas: CanvasState = {
				...canvas,
				blocks: nextBlocks,
				placedItems: nextPlacedItems,
				connections: deriveConnectionsFromCables(nextPlacedItems),
			};

			return updateCanvasState(state, action.payload.stateKey, nextCanvas);
		}
		case "MAKE_CONNECTION": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const { from, to, cableId } = action.payload;

			if (from.x === to.x && from.y === to.y) {
				return state;
			}

			const fromBlock = canvas.blocks[from.y]?.[from.x];
			const toBlock = canvas.blocks[to.y]?.[to.x];

			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const connectionKey = normalizeConnectionKey(from, to);
			const exists = canvas.connections.some(
				(connection) =>
					normalizeConnectionKey(connection.from, connection.to) ===
					connectionKey,
			);

			if (exists) {
				return state;
			}

			if (cableId) {
				const cableItem = state.inventory.items.find(
					(entry) => entry.id === cableId,
				);
				if (!cableItem || cableItem.used) {
					return state;
				}
			}

			const connectionId = `connection-${connectionKey}-${cableId ?? "link"}`;
			const nextConnections: Connection[] = [
				...canvas.connections,
				{
					id: connectionId,
					type: "cable",
					from,
					to,
					cableId,
				},
			];

			const nextCanvas: CanvasState = {
				...canvas,
				connections: nextConnections,
			};

			let nextInventory = state.inventory.items;
			if (cableId) {
				nextInventory = state.inventory.items.map((entry) =>
					entry.id === cableId ? { ...entry, used: true } : entry,
				);
			}

			return updateCanvasState(
				{
					...state,
					inventory: { items: nextInventory },
				},
				action.payload.stateKey,
				nextCanvas,
			);
		}
		case "REMOVE_CONNECTION": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const connection = canvas.connections.find(
				(entry) => entry.id === action.payload.connectionId,
			);

			if (!connection) {
				return state;
			}

			const nextConnections = canvas.connections.filter(
				(entry) => entry.id !== action.payload.connectionId,
			);

			const nextCanvas: CanvasState = {
				...canvas,
				connections: nextConnections,
			};

			let nextInventory = state.inventory.items;
			if (connection.cableId) {
				nextInventory = state.inventory.items.map((entry) =>
					entry.id === connection.cableId ? { ...entry, used: false } : entry,
				);
			}

			return updateCanvasState(
				{
					...state,
					inventory: { items: nextInventory },
				},
				action.payload.stateKey,
				nextCanvas,
			);
		}
		case "MAKE_CROSS_CONNECTION": {
			const { from, to, cableId } = action.payload;
			if (!state.canvases) {
				return state;
			}

			if (from.canvasKey === to.canvasKey) {
				return state;
			}

			const fromCanvas = state.canvases[from.canvasKey];
			const toCanvas = state.canvases[to.canvasKey];
			if (!fromCanvas || !toCanvas) {
				return state;
			}

			const fromBlock = fromCanvas.blocks[from.y]?.[from.x];
			const toBlock = toCanvas.blocks[to.y]?.[to.x];
			if (!fromBlock?.itemId || !toBlock?.itemId) {
				return state;
			}

			const nextConnection: CrossCanvasConnection = {
				id: crypto.randomUUID(),
				type: "cable",
				from,
				to,
				cableId,
			};

			return {
				...state,
				crossConnections: [...state.crossConnections, nextConnection],
			};
		}
		case "REMOVE_CROSS_CONNECTION": {
			const nextConnections = state.crossConnections.filter(
				(connection) => connection.id !== action.payload.connectionId,
			);

			return {
				...state,
				crossConnections: nextConnections,
			};
		}
		case "SET_SHARED_DATA": {
			const nextItem: SharedZoneItem = {
				id: crypto.randomUUID(),
				key: action.payload.key,
				value: action.payload.value,
				sourceCanvas: action.payload.sourceCanvas,
				timestamp: Date.now(),
			};

			return {
				...state,
				sharedZone: {
					items: {
						...state.sharedZone.items,
						[action.payload.key]: nextItem,
					},
				},
			};
		}
		case "REMOVE_SHARED_DATA": {
			const nextItems = { ...state.sharedZone.items };
			delete nextItems[action.payload.key];

			return {
				...state,
				sharedZone: {
					items: nextItems,
				},
			};
		}
		case "TRANSFER_ITEM": {
			const {
				itemId,
				fromCanvas,
				fromBlockX,
				fromBlockY,
				toCanvas,
				toBlockX,
				toBlockY,
			} = action.payload;

			if (!state.canvases) {
				return state;
			}

			if (fromCanvas === toCanvas) {
				return state;
			}

			const sourceCanvas = state.canvases[fromCanvas];
			const targetCanvas = state.canvases[toCanvas];
			if (!sourceCanvas || !targetCanvas) {
				return state;
			}

			const sourceBlock = sourceCanvas.blocks[fromBlockY]?.[fromBlockX];
			if (!sourceBlock?.itemId || sourceBlock.itemId !== itemId) {
				return state;
			}

			const targetBlock = targetCanvas.blocks[toBlockY]?.[toBlockX];
			if (!targetBlock || targetBlock.status === "occupied") {
				return state;
			}

			const movingItem = sourceCanvas.placedItems.find(
				(item) => item.itemId === itemId,
			);
			if (!movingItem) {
				return state;
			}

			if (
				targetCanvas.config.allowedItemTypes &&
				!targetCanvas.config.allowedItemTypes.includes(movingItem.type)
			) {
				return state;
			}

			if (
				typeof targetCanvas.config.maxItems === "number" &&
				targetCanvas.placedItems.length >= targetCanvas.config.maxItems
			) {
				return state;
			}

			const nextSourceBlocks = updateBlock(
				sourceCanvas.blocks,
				fromBlockX,
				fromBlockY,
				{ status: "empty", itemId: undefined },
			);
			const nextSourcePlacedItems = sourceCanvas.placedItems.filter(
				(item) => item.itemId !== itemId,
			);
			const nextSourceConnections = deriveConnectionsFromCables(
				nextSourcePlacedItems,
			);
			const nextSourceCanvas: CanvasState = {
				...sourceCanvas,
				blocks: nextSourceBlocks,
				placedItems: nextSourcePlacedItems,
				connections: nextSourceConnections,
			};

			const nextTargetBlocks = updateBlock(
				targetCanvas.blocks,
				toBlockX,
				toBlockY,
				{ status: "occupied", itemId },
			);
			const nextTargetPlacedItems = [
				...targetCanvas.placedItems,
				{
					...movingItem,
					blockX: toBlockX,
					blockY: toBlockY,
				},
			];
			const nextTargetConnections = deriveConnectionsFromCables(
				nextTargetPlacedItems,
			);
			const nextTargetCanvas: CanvasState = {
				...targetCanvas,
				blocks: nextTargetBlocks,
				placedItems: nextTargetPlacedItems,
				connections: nextTargetConnections,
			};

			const nextCrossConnections = state.crossConnections.filter(
				(connection) => {
					const fromMatch =
						connection.from.canvasKey === fromCanvas &&
						connection.from.x === fromBlockX &&
						connection.from.y === fromBlockY;
					const toMatch =
						connection.to.canvasKey === fromCanvas &&
						connection.to.x === fromBlockX &&
						connection.to.y === fromBlockY;
					return !fromMatch && !toMatch;
				},
			);

			const nextCanvases = {
				...state.canvases,
				[fromCanvas]: nextSourceCanvas,
				[toCanvas]: nextTargetCanvas,
			};

			let nextPrimaryCanvas = state.canvas;
			if (state.canvas.config.stateKey === fromCanvas) {
				nextPrimaryCanvas = nextSourceCanvas;
			} else if (state.canvas.config.stateKey === toCanvas) {
				nextPrimaryCanvas = nextTargetCanvas;
			}

			return {
				...state,
				canvas: nextPrimaryCanvas,
				canvases: nextCanvases,
				crossConnections: nextCrossConnections,
			};
		}
		case "CONFIGURE_DEVICE": {
			const canvas = resolveCanvasState(state, action.payload.stateKey);
			const config = sanitizeDeviceConfig(action.payload.config);
			const itemIndex = canvas.placedItems.findIndex(
				(item) => item.id === action.payload.deviceId,
			);

			if (itemIndex === -1) {
				return state;
			}

			const nextPlacedItems = canvas.placedItems.slice();
			const currentItem = nextPlacedItems[itemIndex];

			// Extract status if provided
			const newStatus =
				typeof config.status === "string" ? config.status : undefined;
			const { status: _, ...dataConfig } = config;

			nextPlacedItems[itemIndex] = {
				...currentItem,
				...(newStatus && { status: newStatus as PlacedItemStatus }),
				data: {
					...currentItem.data,
					...dataConfig,
				},
			};

			const nextCanvas: CanvasState = {
				...canvas,
				placedItems: nextPlacedItems,
			};

			return updateCanvasState(
				{
					...state,
					overlay: {
						...state.overlay,
						activeModal: null,
					},
				},
				action.payload.stateKey,
				nextCanvas,
			);
		}
		case "OPEN_MODAL": {
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: action.payload,
				},
			};
		}
		case "CLOSE_MODAL":
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: null,
				},
			};
		case "SUBMIT_COMMAND": {
			const input = sanitizeTerminalInput(action.payload.input);
			if (!input) {
				return state;
			}

			const { entry, sequence } = createEntry(state, "input", input);
			return {
				...state,
				sequence,
				terminal: {
					...state.terminal,
					history: addHistoryEntry(state.terminal.history, entry),
				},
			};
		}
		case "ADD_TERMINAL_OUTPUT": {
			const content = sanitizeTerminalOutput(action.payload.content);
			if (!content) {
				return state;
			}

			const { entry, sequence } = createEntry(
				state,
				action.payload.type,
				content,
			);
			return {
				...state,
				sequence,
				terminal: {
					...state.terminal,
					history: addHistoryEntry(state.terminal.history, entry),
				},
			};
		}
		case "CLEAR_TERMINAL_HISTORY":
			return {
				...state,
				terminal: {
					...state.terminal,
					history: [],
				},
			};
		case "SET_PHASE":
			return {
				...state,
				phase: action.payload.phase,
				terminal: {
					...state.terminal,
					visible:
						action.payload.phase === "terminal" ||
						action.payload.phase === "completed",
				},
			};
		case "COMPLETE_QUESTION":
			return {
				...state,
				phase: "completed",
				question: { ...state.question, status: "completed" },
			};
		default:
			return state;
	}
};

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

export type GameProviderProps = {
	children: ReactNode;
	initialState?: GameState;
};

export const GameProvider = ({ children, initialState }: GameProviderProps) => {
	const [state, dispatch] = useReducer(
		reducer,
		initialState ?? createDefaultState(),
	);

	return (
		<GameStateContext.Provider value={state}>
			<GameDispatchContext.Provider value={dispatch}>
				{children}
			</GameDispatchContext.Provider>
		</GameStateContext.Provider>
	);
};

export const useGameState = () => {
	const state = useContext(GameStateContext);
	if (!state) {
		throw new Error("useGameState must be used within GameProvider");
	}
	return state;
};

export const useGameDispatch = () => {
	const dispatch = useContext(GameDispatchContext);
	if (!dispatch) {
		throw new Error("useGameDispatch must be used within GameProvider");
	}
	return dispatch;
};

export const useGame = () => ({
	state: useGameState(),
	dispatch: useGameDispatch(),
});

export const useCanvasState = (stateKey?: string) => {
	const state = useGameState();
	if (!stateKey) {
		return state.canvas;
	}
	return state.canvases?.[stateKey] ?? state.canvas;
};

export const useCrossConnections = () => {
	const state = useGameState();
	return state.crossConnections;
};

export const useSharedZone = () => {
	const state = useGameState();
	return state.sharedZone;
};

export const useSharedData = <T = unknown>(key: string): T | undefined => {
	const state = useGameState();
	return state.sharedZone.items[key]?.value as T | undefined;
};

export const useAllCanvases = () => {
	const state = useGameState();
	return state.canvases ?? { default: state.canvas };
};
