/**
 * Initialization helpers for DHCP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import { createPoolSpaceData } from "@/components/game/domain/space/space-fns";
import {
	DHCP_SPACE_IDS,
	INVENTORY_ITEMS,
	QUESTION_ID,
	SPACE_CONFIGS,
	SPACE_ORDER,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// The new actions exist but aren't in GameAction type yet
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all spaces (grid spaces + inventory pool) for the DHCP question.
 */
export const initializeSpaces = (dispatch: GameDispatch) => {
	// Create grid spaces for each space
	for (const gridSpace of SPACE_CONFIGS) {
		dispatch({
			type: "CREATE_SPACE",
			payload: { space: gridSpace },
		});
	}

	// Create pool space for inventory
	const inventorySpace = createPoolSpaceData({
		id: "inventory",
		name: "Inventory",
		metadata: { visible: true },
	});

	dispatch({
		type: "CREATE_SPACE",
		payload: { space: inventorySpace },
	});
};

/**
 * Initialize all entities (inventory items) for the DHCP question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	for (const itemConfig of INVENTORY_ITEMS) {
		const entity = createItemData({
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

		// Create entity
		dispatch({ type: "CREATE_ENTITY", payload: { entity } });

		// Add to inventory space
		dispatch({
			type: "ADD_ENTITY_TO_SPACE",
			payload: {
				entityId: entity.id,
				spaceId: "inventory",
			},
		});
	}
};

/**
 * Initialize terminal state for the DHCP question.
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
 * Initialize the entire DHCP question state.
 * This replaces the legacy INIT_MULTI_CANVAS action.
 */
export const initializeDhcpQuestion = (dispatch: GameDispatch) => {
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

/**
 * Space IDs for easy reference
 */
export { DHCP_SPACE_IDS, SPACE_ORDER };
