import {
	MAX_HISTORY_ENTRIES,
	sanitizeTerminalInput,
	sanitizeTerminalOutput,
} from "../../validation/sanitize";
import type { GameAction } from "../actions";
import type { GameState, TerminalEntry, TerminalEntryType } from "../types";

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

export const terminalReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
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
