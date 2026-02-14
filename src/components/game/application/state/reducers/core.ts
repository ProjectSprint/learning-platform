/**
 * Core game reducer for phase and question status.
 */

import { produce } from "immer";
import {
	applyCompleteQuestion,
	tryAckEvents,
	tryEmitEvents,
	trySetPhase,
	trySetQuestion,
} from "../../../domain/transformers/game";
import type { CoreAction } from "../actions/core";
import type { GameEventInput } from "../events";
import { appendEvents, getNextActionId } from "../events";
import type { GameState } from "../types";

const appendTransitionEvents = (
	state: GameState,
	events: GameEventInput[],
): GameState => {
	if (events.length === 0) {
		return state;
	}
	return {
		...state,
		eventQueue: appendEvents(
			state.eventQueue,
			getNextActionId(state.eventQueue),
			events,
		),
	};
};

export const coreReducer = (
	state: GameState,
	action: CoreAction,
): GameState => {
	switch (action.type) {
		case "SET_QUESTION": {
			return produce(state, (draft) => {
				trySetQuestion(draft, action.payload);
			});
		}
		case "SET_PHASE": {
			const nextState = produce(state, (draft) => {
				const transition = trySetPhase(draft, { phase: action.payload.phase });
				if (transition.status !== "applied") {
					return;
				}
				draft.eventQueue = appendEvents(
					draft.eventQueue,
					getNextActionId(draft.eventQueue),
					transition.value.events,
				);
			});
			return nextState;
		}
		case "COMPLETE_QUESTION": {
			return produce(state, (draft) => {
				applyCompleteQuestion(draft);
			});
		}
		case "ACK_EVENTS": {
			return produce(state, (draft) => {
				tryAckEvents(draft, action.payload);
			});
		}
		case "EMIT_EVENTS": {
			const transition = tryEmitEvents(action.payload.events);
			if (transition.status !== "applied") {
				return state;
			}
			return appendTransitionEvents(
				state,
				transition.value.events as GameEventInput[],
			);
		}
		default:
			return state;
	}
};
