import type { GameAction } from "../actions";
import type { GameState } from "../types";

export const modalReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "OPEN_MODAL": {
			const modalId = action.payload.id ?? "modal-default";
			const existingModal = state.overlay.modals[modalId];

			if (existingModal) {
				return {
					...state,
					overlay: {
						...state.overlay,
						modals: {
							...state.overlay.modals,
							[modalId]: { ...existingModal, visible: true },
						},
					},
				};
			}

			return {
				...state,
				overlay: {
					...state.overlay,
					modals: {
						...state.overlay.modals,
						[modalId]: {
							instance: action.payload,
							visible: true,
						},
					},
				},
			};
		}
		case "CLOSE_MODAL": {
			const modalIdToClose =
				"payload" in action ? action.payload?.modalId : undefined;

			if (modalIdToClose) {
				const modal = state.overlay.modals[modalIdToClose];
				if (!modal) return state;

				return {
					...state,
					overlay: {
						...state.overlay,
						modals: {
							...state.overlay.modals,
							[modalIdToClose]: { ...modal, visible: false },
						},
					},
				};
			}

			const updatedModals = Object.fromEntries(
				Object.entries(state.overlay.modals).map(([id, entry]) => [
					id,
					{ ...entry, visible: false },
				]),
			);

			return {
				...state,
				overlay: {
					...state.overlay,
					modals: updatedModals,
				},
			};
		}
		default:
			return state;
	}
};
