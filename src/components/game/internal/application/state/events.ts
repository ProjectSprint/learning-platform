/**
 * Helpers for appending deterministic events to the game state.
 */

import type {
	GameEvent,
	GameEventInput,
	GameEventQueue,
} from "@/components/game/types/state";
import {
	applyAppendEvents,
	getNextActionId as getNextTransitionActionId,
} from "../../domain/transformers/event-queue";

export const getNextActionId = (queue?: GameEventQueue): number => {
	return getNextTransitionActionId(queue);
};

export const appendEvents = (
	queue: GameEventQueue | undefined,
	actionId: number,
	inputs: GameEventInput[],
): GameEventQueue => {
	return applyAppendEvents<GameEvent>(queue, actionId, inputs);
};
