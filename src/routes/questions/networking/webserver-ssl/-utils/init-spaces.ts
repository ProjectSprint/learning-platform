/**
 * Initialization helpers for WebServer-SSL question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import {
	createGridSpaceData,
	createPoolSpaceData,
} from "@/components/game/domain/space/space-fns";
import type { GameAction } from "@/components/game/game-provider";
import {
	BASIC_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_ID,
	SPACE_CONFIGS,
	SSL_ITEMS_INVENTORY,
	SSL_ITEMS_POOL_CONFIG,
	SSL_SETUP_INVENTORY_ITEMS,
	SSL_SETUP_POOL_CONFIG,
} from "./constants";

type GameDispatch = (action: GameAction) => void;

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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		dispatch({
			type: "ENTITY_ADDED",
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
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
	for (const config of Object.values(SPACE_CONFIGS)) {
		dispatch({
			type: "SPACE_CREATED",
			payload: { space: createGridSpaceData(config) },
		});
	}
	dispatch({
		type: "SPACE_CREATED",
		payload: { space: createPoolSpaceData(INVENTORY_POOL_CONFIG) },
	});
	dispatch({
		type: "SPACE_CREATED",
		payload: { space: createPoolSpaceData(SSL_SETUP_POOL_CONFIG) },
	});
	dispatch({
		type: "SPACE_CREATED",
		payload: { space: createPoolSpaceData(SSL_ITEMS_POOL_CONFIG) },
	});

	// Initialize entities
	initializeEntities(dispatch);
};
