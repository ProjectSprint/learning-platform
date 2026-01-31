/**
 * Initialization helpers for WebServer-SSL question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { Item } from "@/components/game/domain/entity";
import { GridSpace, PoolSpace } from "@/components/game/domain/space";
import {
	BASIC_INVENTORY_ITEMS,
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	QUESTION_ID,
	SSL_ITEMS_INVENTORY,
	SSL_SETUP_INVENTORY_ITEMS,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all spaces (grid canvases + inventory pool) for the SSL question.
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
 * Initialize all entities (inventory items) for the SSL question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create basic inventory items
	for (const itemConfig of BASIC_INVENTORY_ITEMS) {
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

	// Create SSL setup items (shown after HTTP works)
	for (const itemConfig of SSL_SETUP_INVENTORY_ITEMS) {
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
		// These start hidden, will be added to inventory later
	}

	// Create SSL certificate items (shown after certificate is issued)
	for (const itemConfig of SSL_ITEMS_INVENTORY) {
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
		// These start hidden, will be added to inventory later
	}
};

/**
 * Initialize terminal state for the SSL question.
 */
export const initializeTerminal = (dispatch: GameDispatch) => {
	dispatch({
		type: "SET_TERMINAL_PROMPT",
		payload: { prompt: TERMINAL_PROMPT },
	});

	// Add intro entries
	for (const entry of TERMINAL_INTRO_ENTRIES) {
		dispatch({
			type: "ADD_TERMINAL_ENTRY",
			payload: { entry },
		});
	}
};

/**
 * Initialize the entire SSL question state.
 * This replaces the old INIT_MULTI_CANVAS action.
 */
export const initializeSslQuestion = (dispatch: GameDispatch) => {
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
