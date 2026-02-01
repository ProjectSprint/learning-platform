import {
	MAX_HISTORY_ENTRIES,
	sanitizeTerminalInput,
	sanitizeTerminalOutput,
} from "../../domain/validation/sanitize";
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
	type: TerminalEntryType,
	content: string,
): TerminalEntry => {
	const timestamp = Date.now();
	return {
		id: `entry-${timestamp}-${crypto.randomUUID()}`,
		type,
		content,
		timestamp,
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

			const entry = createEntry("input", input);
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

			const entry = createEntry(action.payload.type, content);
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
