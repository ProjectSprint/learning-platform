import type { Arrow } from "../types";

export type ArrowAction =
	| { type: "ADD_ARROW"; payload: { arrow: Arrow } }
	| { type: "UPDATE_ARROW"; payload: { id: string; updates: Partial<Arrow> } }
	| { type: "REMOVE_ARROW"; payload: { id: string } }
	| { type: "SET_ARROWS"; payload: { arrows: Arrow[] } }
	| { type: "CLEAR_ARROWS" };
