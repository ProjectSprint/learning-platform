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
		case "SET_QUESTION":
			if (
				state.question.id === action.payload.id &&
				(action.payload.status === undefined ||
					state.question.status === action.payload.status)
			) {
				return state;
			}
			return {
				...state,
				question: {
					id: action.payload.id,
					status: action.payload.status ?? state.question.status,
				},
			};
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
			const { engineId, cursor } = action.payload;
			const nextCursor = Math.min(cursor, state.eventQueue.lastEventId);
			const currentCursor = state.eventCursors[engineId] ?? 0;
			if (nextCursor <= currentCursor) {
				return state;
			}
			return {
				...state,
				eventCursors: {
					...state.eventCursors,
					[engineId]: nextCursor,
				},
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
