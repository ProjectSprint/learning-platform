import type { TerminalEntryType } from "../types";

export type TerminalAction =
	| { type: "SUBMIT_COMMAND"; payload: { input: string } }
	| {
			type: "ADD_TERMINAL_OUTPUT";
			payload: {
				content: string;
				type: Exclude<TerminalEntryType, "input" | "prompt">;
			};
	  }
	| { type: "CLEAR_TERMINAL_HISTORY" };
