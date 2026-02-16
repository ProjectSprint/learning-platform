/**
 * Helpers for appending deterministic events to the game state.
 */

import {
	applyAppendEvents,
	getNextActionId as getNextTransitionActionId,
} from "../../domain/transformers/event-queue";
import type { GameEvent, GameEventQueue } from "./types";

export type GameEventInput = GameEvent extends infer Event
	? Event extends GameEvent
		? Omit<Event, "eventId" | "actionId" | "timestamp">
		: never
	: never;

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
