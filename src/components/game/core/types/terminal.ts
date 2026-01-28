export type TerminalEntryType =
	| "prompt"
	| "input"
	| "output"
	| "error"
	| "hint";

export type TerminalEntry = {
	id: string;
	type: TerminalEntryType;
	content: string;
	timestamp: number;
};

export type TerminalState = {
	visible: boolean;
	prompt: string;
	history: TerminalEntry[];
};
