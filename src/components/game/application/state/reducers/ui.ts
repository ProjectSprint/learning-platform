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
	const nextHistory = [...history, entry];
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
				};
			}

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
			};
		}
		case "CLOSE_MODAL": {
			const modalIdToClose = action.payload?.modalId;

			if (modalIdToClose) {
				// Close specific modal
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

			// Close all visible modals
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
			return {
				...state,
				terminal: {
					...state.terminal,
					history: addHistoryEntry(state.terminal.history, entry),
				},
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
