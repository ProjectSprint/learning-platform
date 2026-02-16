/**
 * Core game actions (phase, question status).
 */

import type { QuestionStatus } from "../../../core/types";
import type { GameEventInput } from "../events";

export type CoreAction =
	| {
			type: "SET_QUESTION";
			payload: {
				id: string;
				status?: QuestionStatus;
			};
	  }
	| { type: "SET_PHASE"; payload: { phase: string } }
	| { type: "COMPLETE_QUESTION" }
	| { type: "ACK_EVENTS"; payload: { engineId: string; cursor: number } }
	| {
			type: "EMIT_EVENTS";
			payload: {
				events: GameEventInput[];
			};
	  };
