/**
 * UI reducers for arrows, hints, modals, and terminal.
 * These handle the UI-related state that doesn't fit into the Space/Entity model.
 */

import type {
	Arrow,
	TerminalEntry,
	TerminalEntryType,
} from "../../../core/types";
import {
	MAX_HISTORY_ENTRIES,
	sanitizeTerminalInput,
	sanitizeTerminalOutput,
} from "../../../domain/validation/sanitize";
import type { UIAction } from "../actions/ui";
import type { GameEventInput } from "../events";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

// Helper functions for arrows
const mergeArrow = (arrow: Arrow, updates: Partial<Arrow>): Arrow => {
	return {
		...arrow,
		...updates,
		from: updates.from ? { ...arrow.from, ...updates.from } : arrow.from,
		to: updates.to ? { ...arrow.to, ...updates.to } : arrow.to,
		style: updates.style
			? { ...(arrow.style ?? {}), ...updates.style }
			: arrow.style,
	};
};

// Helper functions for terminal
const addHistoryEntry = (history: TerminalEntry[], entry: TerminalEntry) => {
	const existingIds = new Set(history.map((item) => item.id));
	let nextEntry = entry;
	if (existingIds.has(entry.id)) {
		let counter = 1;
		let nextId = `${entry.id}-${counter}`;
		while (existingIds.has(nextId)) {
			counter += 1;
			nextId = `${entry.id}-${counter}`;
		}
		nextEntry = { ...entry, id: nextId };
	}
	const nextHistory = [...history, nextEntry];
	if (nextHistory.length > MAX_HISTORY_ENTRIES) {
		return nextHistory.slice(-MAX_HISTORY_ENTRIES);
	}
	return nextHistory;
};

const createEntry = (
	type: TerminalEntryType,
	content: string,
	timestamp = Date.now(),
): { entry: TerminalEntry } => {
	return {
		entry: {
			id: `entry-${timestamp}`,
			type,
			content,
			timestamp,
		},
	};
};

/**
 * UI reducer handling arrows, hints, modals, and terminal actions.
 */
export const uiReducer = (state: GameState, action: UIAction): GameState => {
	switch (action.type) {
		// Arrow actions
		case "ADD_ARROW":
			return {
				...state,
				arrows: [...state.arrows, action.payload.arrow],
			};
		case "UPDATE_ARROW":
			return {
				...state,
				arrows: state.arrows.map((arrow) =>
					arrow.id === action.payload.id
						? mergeArrow(arrow, action.payload.updates)
						: arrow,
				),
			};
		case "REMOVE_ARROW":
			return {
				...state,
				arrows: state.arrows.filter((arrow) => arrow.id !== action.payload.id),
			};
		case "SET_ARROWS":
			return {
				...state,
				arrows: action.payload.arrows,
			};
		case "CLEAR_ARROWS":
			return {
				...state,
				arrows: [],
			};

		// Hint actions
		case "SHOW_HINT":
			return {
				...state,
				hint: {
					visible: true,
					content: action.payload.content,
				},
			};
		case "HIDE_HINT":
			return {
				...state,
				hint: {
					...state.hint,
					visible: false,
				},
			};
		case "REPLACE_HINT":
			return {
				...state,
				hint: {
					...state.hint,
					content: action.payload.content,
				},
			};

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

		// Terminal actions
		case "OPEN_TERMINAL":
			return {
				...state,
				terminal: {
					...state.terminal,
					visible: true,
				},
			};
		case "CLOSE_TERMINAL":
			return {
				...state,
				terminal: {
					...state.terminal,
					visible: false,
				},
			};
		case "SUBMIT_COMMAND": {
			const input = sanitizeTerminalInput(action.payload.input);
			if (!input) {
				return state;
			}

			const { entry } = createEntry("input", input);
			const events: GameEventInput[] = [
				{
					type: "TERMINAL_INPUT",
					entryId: entry.id,
					input,
				},
			];
			const nextQueue = appendEvents(
				state.eventQueue,
				getNextActionId(state.eventQueue),
				events,
			);
			return {
				...state,
				terminal: {
					...state.terminal,
					history: addHistoryEntry(state.terminal.history, entry),
				},
				eventQueue: nextQueue,
			};
		}
		case "ADD_TERMINAL_OUTPUT": {
			const content = sanitizeTerminalOutput(action.payload.content);
			if (!content) {
				return state;
			}

			const { entry } = createEntry(action.payload.type, content);
			return {
				...state,
				terminal: {
					...state.terminal,
					history: addHistoryEntry(state.terminal.history, entry),
				},
			};
		}
		case "CLEAR_TERMINAL_HISTORY":
			return {
				...state,
				terminal: {
					...state.terminal,
					history: [],
				},
			};

		default:
			return state;
	}
};
