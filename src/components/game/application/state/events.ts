/**
 * Helpers for appending deterministic events to the game state.
 */

import type { GameEvent, GameEventQueue } from "./types";

export type GameEventInput = GameEvent extends infer Event
	? Event extends GameEvent
		? Omit<Event, "eventId" | "actionId" | "timestamp">
		: never
	: never;

const ensureQueue = (queue?: GameEventQueue): GameEventQueue => {
	if (queue) return queue;
	return { events: [], lastActionId: 0, lastEventId: 0 };
};

export const getNextActionId = (queue?: GameEventQueue): number => {
	const safeQueue = ensureQueue(queue);
	return safeQueue.lastActionId + 1;
};

export const appendEvents = (
	queue: GameEventQueue | undefined,
	actionId: number,
	inputs: GameEventInput[],
): GameEventQueue => {
	const safeQueue = ensureQueue(queue);
	if (inputs.length === 0) return safeQueue;

	let nextEventId = safeQueue.lastEventId;
	const events = inputs.map((input) => {
		nextEventId += 1;
		return {
			...input,
			eventId: nextEventId,
			actionId,
		} as GameEvent;
	});

	return {
		events: [...safeQueue.events, ...events],
		lastEventId: nextEventId,
		lastActionId: actionId,
	};
};
