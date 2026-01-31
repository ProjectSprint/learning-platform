/**
 * Initialization helpers for UDP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { Item } from "@/components/game/domain/entity";
import { GridSpace, PoolSpace } from "@/components/game/domain/space";
import {
	ACK_PACKETS,
	CANVAS_CONFIGS,
	DATA_PACKETS,
	FRAME_ITEMS,
	QUESTION_ID,
	RECEIVED_SYN_PACKETS,
	SYN_ACK_PACKETS,
	SYN_PACKETS,
	TCP_CANVAS_ORDER,
	UDP_CANVAS_ORDER,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all spaces (grid canvases + inventory pool) for the UDP question.
 */
export const initializeSpaces = (dispatch: GameDispatch) => {
	// Create grid spaces for TCP phase
	for (const canvasId of TCP_CANVAS_ORDER) {
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

	// Create grid spaces for UDP phase
	for (const canvasId of UDP_CANVAS_ORDER) {
		if (TCP_CANVAS_ORDER.includes(canvasId)) continue; // Skip duplicates
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
 * Initialize all entities (inventory items) for the UDP question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create SYN packets
	for (const itemConfig of SYN_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create SYN-ACK packets
	for (const itemConfig of SYN_ACK_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create ACK packets
	for (const itemConfig of ACK_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create DATA packets
	for (const itemConfig of DATA_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create received SYN packets (non-draggable)
	for (const itemConfig of RECEIVED_SYN_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create UDP frame items
	for (const itemConfig of FRAME_ITEMS) {
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
		// Will be added to inventory group in initial state
	}
};

/**
 * Initialize terminal state for the UDP question.
 */
export const initializeTerminal = (dispatch: GameDispatch) => {
	dispatch({
		type: "SET_TERMINAL_PROMPT",
		payload: { prompt: "Terminal ready." },
	});
};

/**
 * Initialize the entire UDP question state.
 * This replaces the old INIT_MULTI_CANVAS action.
 */
export const initializeUdpQuestion = (dispatch: GameDispatch) => {
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
