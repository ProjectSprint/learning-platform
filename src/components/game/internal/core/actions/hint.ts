export type HintAction =
	| { type: "SHOW_HINT"; payload: { content: string } }
	| { type: "HIDE_HINT" }
	| { type: "REPLACE_HINT"; payload: { content: string } };
