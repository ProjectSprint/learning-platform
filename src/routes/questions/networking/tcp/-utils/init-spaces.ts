/**
 * Initialization helpers for TCP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { Item } from "@/components/game/domain/entity";
import { GridSpace, PoolSpace } from "@/components/game/domain/space";
import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	FILE_INVENTORY_ITEMS,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM,
	NOTES_PACKET_ITEMS,
	QUESTION_ID,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all spaces (grid canvases + inventory pool) for the TCP question.
 */
export const initializeSpaces = (dispatch: GameDispatch) => {
	// Create grid spaces for each canvas
	for (const canvasId of CANVAS_ORDER) {
		const config = CANVAS_CONFIGS[canvasId];
		if (!config) continue;

		const gridSpace = new GridSpace({
			id: config.id,
			name: config.name,
			rows: config.rows,
			cols: config.cols,
			metrics: config.metrics,
			maxCapacity: config.maxCapacity,
			metadata: config.metadata ?? {},
		});

		dispatch({
			type: "CREATE_SPACE",
			payload: { space: gridSpace },
		});
	}

	// Create pool space for inventory
	const inventorySpace = new PoolSpace({
		id: "inventory",
		name: "Inventory",
		maxCapacity: undefined,
		metadata: { visible: true },
	});

	dispatch({
		type: "CREATE_SPACE",
		payload: { space: inventorySpace },
	});
};

/**
 * Initialize all entities (inventory items) for the TCP question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create file inventory items
	for (const itemConfig of FILE_INVENTORY_ITEMS) {
		const entity = new Item({
			id: itemConfig.id,
			name: itemConfig.name,
			icon: itemConfig.icon,
			data: {
				...itemConfig.data,
				type: itemConfig.type,
			},
			tooltip: itemConfig.tooltip,
			allowedPlaces: itemConfig.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		dispatch({
			type: "ADD_ENTITY_TO_SPACE",
			payload: { entityId: entity.id, spaceId: "inventory" },
		});
	}

	// Create system packet items (non-draggable)
	for (const item of Object.values(SYSTEM_PACKET_ITEMS)) {
		const entity = new Item({
			id: item.id,
			name: item.name,
			icon: item.icon,
			data: {
				...item.data,
				type: item.type,
			},
			tooltip: item.tooltip,
			allowedPlaces: item.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// System packets start in a hidden inventory group
	}

	// Create TCP tool items (SYN, ACK, FIN)
	for (const item of Object.values(TCP_TOOL_ITEMS)) {
		const entity = new Item({
			id: item.id,
			name: item.name,
			icon: item.icon,
			data: {
				...item.data,
				type: item.type,
			},
			tooltip: item.tooltip,
			allowedPlaces: item.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// TCP tools start in a hidden inventory group
	}

	// Create message packet items
	for (const item of MESSAGE_PACKET_ITEMS) {
		const entity = new Item({
			id: item.id,
			name: item.name,
			icon: item.icon,
			data: {
				...item.data,
				type: item.type,
			},
			tooltip: item.tooltip,
			allowedPlaces: item.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// Message packets start in a hidden inventory group
	}

	// Create notes file item
	{
		const entity = new Item({
			id: NOTES_FILE_ITEM.id,
			name: NOTES_FILE_ITEM.name,
			icon: NOTES_FILE_ITEM.icon,
			data: {
				...NOTES_FILE_ITEM.data,
				type: NOTES_FILE_ITEM.type,
			},
			tooltip: NOTES_FILE_ITEM.tooltip,
			allowedPlaces: NOTES_FILE_ITEM.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// Notes file starts in a hidden inventory group
	}

	// Create notes packet items
	for (const item of NOTES_PACKET_ITEMS) {
		const entity = new Item({
			id: item.id,
			name: item.name,
			icon: item.icon,
			data: {
				...item.data,
				type: item.type,
			},
			tooltip: item.tooltip,
			allowedPlaces: item.allowedPlaces,
		});

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// Notes packets start in a hidden inventory group
	}
};

/**
 * Initialize terminal state for the TCP question.
 */
export const initializeTerminal = (dispatch: GameDispatch) => {
	dispatch({
		type: "SET_TERMINAL_PROMPT",
		payload: { prompt: "Use the terminal to inspect the TCP exchange." },
	});

	// No intro entries for TCP question
};

/**
 * Initialize the entire TCP question state.
 * This replaces the old INIT_MULTI_CANVAS action.
 */
export const initializeTcpQuestion = (dispatch: GameDispatch) => {
	// Set question metadata
	dispatch({
		type: "SET_QUESTION",
		payload: {
			id: QUESTION_ID,
			status: "in_progress",
		},
	});

	// Set initial phase
	dispatch({
		type: "SET_PHASE",
		payload: { phase: "setup" },
	});

	// Initialize spaces
	initializeSpaces(dispatch);

	// Initialize entities
	initializeEntities(dispatch);

	// Initialize terminal
	initializeTerminal(dispatch);

	// Close terminal initially
	dispatch({ type: "CLOSE_TERMINAL" });
};
