/**
 * Core game actions (phase, question status).
 */

import type { GamePhase, QuestionStatus } from "../../../core/types";

export type CoreAction =
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };
