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
} from "../../../validation/sanitize";
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
	state: GameState,
	type: TerminalEntryType,
	content: string,
): { entry: TerminalEntry; sequence: number } => {
	const nextSequence = state.sequence + 1;
	return {
		entry: {
			id: `entry-${nextSequence}`,
			type,
			content,
			timestamp: nextSequence,
		},
		sequence: nextSequence,
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
		case "OPEN_MODAL":
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: action.payload,
				},
			};
		case "CLOSE_MODAL":
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: null,
				},
			};

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

			const { entry, sequence } = createEntry(state, "input", input);
			return {
				...state,
				sequence,
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

			const { entry, sequence } = createEntry(
				state,
				action.payload.type,
				content,
			);
			return {
				...state,
				sequence,
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
