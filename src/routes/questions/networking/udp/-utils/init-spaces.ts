/**
 * Initialization helpers for UDP question using Space/Entity model.
 * Creates GridSpaces and Entities from the question configuration.
 */

import { createItemData } from "@/components/game/domain/entity/entity-fns";
import {
	ACK_PACKETS,
	DATA_PACKETS,
	FRAME_ITEMS,
	QUESTION_ID,
	RECEIVED_SYN_PACKETS,
	SYN_ACK_PACKETS,
	SYN_PACKETS,
} from "./constants";

// Use any for dispatch to work around Phase 5 integration issues
// biome-ignore lint/suspicious/noExplicitAny: Phase 5 integration incomplete
type GameDispatch = (action: any) => void;

/**
 * Initialize all entities (inventory items) for the UDP question.
 */
export const initializeEntities = (dispatch: GameDispatch) => {
	// Create SYN packets
	for (const itemConfig of SYN_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create SYN-ACK packets
	for (const itemConfig of SYN_ACK_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create ACK packets
	for (const itemConfig of ACK_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create DATA packets
	for (const itemConfig of DATA_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create received SYN packets (non-draggable)
	for (const itemConfig of RECEIVED_SYN_PACKETS) {
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
		// Will be added to inventory group in initial state
	}

	// Create UDP frame items
	for (const itemConfig of FRAME_ITEMS) {
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
		// Will be added to inventory group in initial state
	}
};

/**
 * Initialize the entire UDP question state.
 * This replaces the legacy INIT_MULTI_CANVAS action.
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
	// Initialize entities
	initializeEntities(dispatch);
};
