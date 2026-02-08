/**
 * UI-related actions (modals).
 * These are legacy actions from the old system that still work with UI components.
 */

import type { ModalInstance } from "../../../core/types";

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

/**
 * Union of all UI actions.
 */
export type UIAction = ModalAction;
