/**
 * UI reducers for modals.
 * These handle the UI-related state that doesn't fit into the Space/Entity model.
 */
import type { UIAction } from "../actions/ui";
import type { GameEventInput } from "../events";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

/**
 * UI reducer handling modal actions.
 */
export const uiReducer = (state: GameState, action: UIAction): GameState => {
	switch (action.type) {
		// Modal actions
		case "OPEN_MODAL": {
			const modalId = action.payload.id ?? "modal-default";
			const existingModal = state.overlay.modals[modalId];

			if (existingModal) {
				if (existingModal.visible) {
					return state;
				}

				const events: GameEventInput[] = [
					{
						type: "MODAL_OPENED",
						modalId,
						modal: existingModal.instance,
					},
				];
				const nextQueue = appendEvents(
					state.eventQueue,
					getNextActionId(state.eventQueue),
					events,
				);

				// Modal exists, just show it
				return {
					...state,
					overlay: {
						...state.overlay,
						modals: {
							...state.overlay.modals,
							[modalId]: { ...existingModal, visible: true },
						},
					},
					eventQueue: nextQueue,
				};
			}

			const events: GameEventInput[] = [
				{
					type: "MODAL_OPENED",
					modalId,
					modal: action.payload,
				},
			];
			const nextQueue = appendEvents(
				state.eventQueue,
				getNextActionId(state.eventQueue),
				events,
			);

			// New modal, add to map
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
				eventQueue: nextQueue,
			};
		}
		case "CLOSE_MODAL": {
			const modalIdToClose = action.payload?.modalId;

			if (modalIdToClose) {
				// Close specific modal
				const modal = state.overlay.modals[modalIdToClose];
				if (!modal || !modal.visible) return state;

				const events: GameEventInput[] = [
					{
						type: "MODAL_CLOSED",
						modalId: modalIdToClose,
						modal: modal.instance,
						reason: "programmatic",
					},
				];
				const nextQueue = appendEvents(
					state.eventQueue,
					getNextActionId(state.eventQueue),
					events,
				);

				return {
					...state,
					overlay: {
						...state.overlay,
						modals: {
							...state.overlay.modals,
							[modalIdToClose]: { ...modal, visible: false },
						},
					},
					eventQueue: nextQueue,
				};
			}

			// Close all visible modals
			const events: GameEventInput[] = [];
			const updatedModals = Object.fromEntries(
				Object.entries(state.overlay.modals).map(([id, entry]) => {
					if (entry.visible) {
						events.push({
							type: "MODAL_CLOSED",
							modalId: id,
							modal: entry.instance,
							reason: "programmatic",
						});
					}
					return [id, { ...entry, visible: false }];
				}),
			);

			if (events.length === 0) {
				return state;
			}

			const nextQueue = appendEvents(
				state.eventQueue,
				getNextActionId(state.eventQueue),
				events,
			);

			return {
				...state,
				overlay: {
					...state.overlay,
					modals: updatedModals,
				},
				eventQueue: nextQueue,
			};
		}
		case "MODAL_SUBMITTED": {
			const events: GameEventInput[] = [
				{
					type: "MODAL_SUBMITTED",
					modalId: action.payload.modalId,
					modalActionId: action.payload.modalActionId,
					values: action.payload.values,
				},
			];
			const nextQueue = appendEvents(
				state.eventQueue,
				getNextActionId(state.eventQueue),
				events,
			);
			return {
				...state,
				eventQueue: nextQueue,
			};
		}

		default:
			return state;
	}
};
