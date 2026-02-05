/**
 * Core game actions (phase, question status).
 */

import type { GamePhase } from "../../../core/types";
import type { GameEventInput } from "../events";

export type CoreAction =
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" }
	| { type: "ACK_EVENTS"; payload: { cursor: number } }
	| {
			type: "EMIT_EVENTS";
			payload: {
				events: GameEventInput[];
			};
	  };
