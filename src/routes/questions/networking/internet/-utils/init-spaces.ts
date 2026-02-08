/**
 * Initialization helpers for Internet question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import {
	createGridSpaceData,
	createPoolSpaceData,
} from "@/components/game/domain/space/space-fns";
import type { GameAction } from "@/components/game/game-provider";
import {
	INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_ID,
	SPACE_CONFIGS,
} from "./constants";

type GameDispatch = (action: GameAction) => void;

/**
 * Initialize all entities (inventory items) for the Internet question.
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
		dispatch({ type: "ENTITY_CREATED", payload: { entity } });

		// Add to inventory space
		dispatch({
			type: "ENTITY_ADDED",
			payload: {
				entityId: entity.id,
				spaceId: "inventory",
			},
		});
	}
};

/**
 * Initialize the entire Internet question state.
 * This replaces the legacy INIT_MULTI_CANVAS action.
 */
export const initializeInternetQuestion = (dispatch: GameDispatch) => {
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

	// Initialize entities
	initializeEntities(dispatch);
};
