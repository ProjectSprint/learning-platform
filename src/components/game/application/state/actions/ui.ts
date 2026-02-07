/**
 * UI-related actions (arrows, hints, modals, terminal).
 * These are legacy actions from the old system that still work with UI components.
 */

import type {
	Arrow,
	DrawerInstance,
	ModalInstance,
	TerminalEntryType,
} from "../../../core/types";

// Arrow actions
export type ArrowAction =
	| { type: "ADD_ARROW"; payload: { arrow: Arrow } }
	| { type: "UPDATE_ARROW"; payload: { id: string; updates: Partial<Arrow> } }
	| { type: "REMOVE_ARROW"; payload: { id: string } }
	| { type: "SET_ARROWS"; payload: { arrows: Arrow[] } }
	| { type: "CLEAR_ARROWS" };

// Hint actions
export type HintAction =
	| { type: "SHOW_HINT"; payload: { content: string } }
	| { type: "HIDE_HINT" }
	| { type: "REPLACE_HINT"; payload: { content: string } };

// Modal actions
export type ModalAction =
	| { type: "OPEN_MODAL"; payload: ModalInstance }
	| { type: "CLOSE_MODAL"; payload?: { modalId?: string } }
	| {
			type: "MODAL_SUBMITTED";
			payload: {
				modalId: string;
				modalActionId: string;
				values: Record<string, unknown>;
			};
	  };

// Drawer actions
/** Register a drawer in overlay state. */
export type DrawerAction =
	| { type: "REGISTER_DRAWER"; payload: DrawerInstance }
	| { type: "OPEN_DRAWER"; payload: { drawerId: string } }
	| { type: "CLOSE_DRAWER"; payload: { drawerId: string } }
	| { type: "TOGGLE_DRAWER"; payload: { drawerId: string } }
	| {
			type: "UPDATE_DRAWER_CONFIG";
			payload: { drawerId: string; config: Partial<DrawerInstance> };
	  };

// Terminal actions
export type TerminalAction =
	| { type: "OPEN_TERMINAL" }
	| { type: "CLOSE_TERMINAL" }
	| { type: "SUBMIT_COMMAND"; payload: { input: string } }
	| {
			type: "ADD_TERMINAL_OUTPUT";
			payload: {
				content: string;
				type: Exclude<TerminalEntryType, "input" | "prompt">;
			};
	  }
	| { type: "CLEAR_TERMINAL_HISTORY" };

/**
 * Union of all UI actions.
 */
export type UIAction =
	| ArrowAction
	| HintAction
	| ModalAction
	| DrawerAction
	| TerminalAction;
