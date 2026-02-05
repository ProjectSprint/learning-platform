/**
 * Core game reducer for phase and question status.
 */

import type { CoreAction } from "../actions/core";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

export const coreReducer = (
	state: GameState,
	action: CoreAction,
): GameState => {
	switch (action.type) {
		case "SET_PHASE":
			if (state.phase === action.payload.phase) {
				return state;
			}
			return {
				...state,
				phase: action.payload.phase,
				eventQueue: appendEvents(
					state.eventQueue,
					getNextActionId(state.eventQueue),
					[
						{
							type: "PHASE_CHANGED",
							from: state.phase,
							to: action.payload.phase,
						},
					],
				),
			};
		case "COMPLETE_QUESTION":
			return {
				...state,
				question: {
					...state.question,
					status: "completed",
				},
			};
		case "ACK_EVENTS": {
			const nextCursor = Math.min(
				action.payload.cursor,
				state.eventQueue.lastEventId,
			);
			if (nextCursor <= state.eventCursor) {
				return state;
			}
			return {
				...state,
				eventCursor: nextCursor,
			};
		}
		case "EMIT_EVENTS": {
			if (action.payload.events.length === 0) {
				return state;
			}
			return {
				...state,
				eventQueue: appendEvents(
					state.eventQueue,
					getNextActionId(state.eventQueue),
					action.payload.events,
				),
			};
		}
		default:
			return state;
	}
};
