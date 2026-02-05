/**
 * useGameEvents hook.
 * Provides ordered event batches with a global ack cursor.
 */

import { useCallback, useMemo } from "react";
import { useGameDispatch, useGameState } from "../../game-provider";
import type { GameEvent } from "../state/types";

export type GameEventBatch = {
	events: GameEvent[];
	cursor: number;
	ack: () => void;
};

export const useGameEvents = (): GameEventBatch => {
	const { eventQueue, eventCursor } = useGameState();
	const dispatch = useGameDispatch();
	const queue = eventQueue ?? { events: [], lastEventId: 0, lastActionId: 0 };
	const cursor = eventCursor ?? 0;

	const events = useMemo(() => {
		if (queue.events.length === 0) {
			return [] as GameEvent[];
		}
		return queue.events.filter((event) => event.eventId > cursor);
	}, [cursor, queue.events]);

	const ack = useCallback(() => {
		if (events.length === 0) return;
		dispatch({
			type: "ACK_EVENTS",
			payload: { cursor: events[events.length - 1].eventId },
		});
	}, [dispatch, events]);

	return {
		events,
		cursor,
		ack,
	};
};
