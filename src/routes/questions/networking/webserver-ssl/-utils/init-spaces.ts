/**
 * Initialization helpers for WebServer-SSL question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import {
	BASIC_INVENTORY_ITEMS,
	QUESTION_ID,
	SSL_ITEMS_INVENTORY,
	SSL_SETUP_INVENTORY_ITEMS,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all entities (inventory items) for the SSL question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create basic inventory items
	for (const itemConfig of BASIC_INVENTORY_ITEMS) {
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

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		dispatch({
			type: "ADD_ENTITY_TO_SPACE",
			payload: { entityId: entity.id, spaceId: "inventory" },
		});
	}

	// Create SSL setup items (shown after HTTP works)
	for (const itemConfig of SSL_SETUP_INVENTORY_ITEMS) {
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

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// These start hidden, will be added to inventory later
	}

	// Create SSL certificate items (shown after certificate is issued)
	for (const itemConfig of SSL_ITEMS_INVENTORY) {
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

		dispatch({ type: "CREATE_ENTITY", payload: { entity } });
		// These start hidden, will be added to inventory later
	}
};

/**
 * Initialize the entire SSL question state.
 * This replaces the legacy INIT_MULTI_CANVAS action.
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
	// Initialize entities
	initializeEntities(dispatch);
};
