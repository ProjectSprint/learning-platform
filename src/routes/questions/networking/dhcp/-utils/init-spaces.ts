/**
 * Initialization helpers for DHCP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import { INVENTORY_ITEMS, QUESTION_ID } from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// The new actions exist but aren't in GameAction type yet
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

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
	// Initialize entities
	initializeEntities(dispatch);
};
