/**
 * Initialization helpers for TCP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import {
	createGridSpaceData,
	createPoolSpaceData,
} from "@/components/game/domain/space/space-fns";
import type { GameAction } from "@/components/game/game-provider";
import {
	FILE_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM,
	NOTES_PACKET_ITEMS,
	QUESTION_ID,
	RECEIVED_POOL_CONFIG,
	SPACE_CONFIGS,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
} from "./constants";

type GameDispatch = (action: GameAction) => void;

/**
 * Initialize all entities (inventory items) for the TCP question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create file inventory items
	for (const itemConfig of FILE_INVENTORY_ITEMS) {
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

	// Create system packet items (non-draggable)
	for (const item of Object.values(SYSTEM_PACKET_ITEMS)) {
		const entity = createItemData({
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		// System packets start in a hidden inventory group
	}

	// Create TCP tool items (SYN, ACK, FIN)
	for (const item of Object.values(TCP_TOOL_ITEMS)) {
		const entity = createItemData({
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		// TCP tools start in a hidden inventory group
	}

	// Create message packet items
	for (const item of MESSAGE_PACKET_ITEMS) {
		const entity = createItemData({
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		// Message packets start in a hidden inventory group
	}

	// Create notes file item
	{
		const entity = createItemData({
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		// Notes file starts in a hidden inventory group
	}

	// Create notes packet items
	for (const item of NOTES_PACKET_ITEMS) {
		const entity = createItemData({
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

		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		// Notes packets start in a hidden inventory group
	}
};

/**
 * Initialize the entire TCP question state.
 * This replaces the legacy INIT_MULTI_CANVAS action.
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
		payload: { phase: "mtu" },
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
		payload: { space: createPoolSpaceData(RECEIVED_POOL_CONFIG) },
	});

	// Initialize entities
	initializeEntities(dispatch);
};
