/**
 * useGameEvents hook.
 * Provides ordered event batches with an ack cursor.
 */

import { useCallback, useMemo, useRef } from "react";
import { useGameState } from "../../game-provider";
import type { GameEvent } from "../state/types";

export type GameEventBatch = {
	events: GameEvent[];
	cursor: number;
	ack: () => void;
};

export const useGameEvents = (): GameEventBatch => {
	const { eventQueue } = useGameState();
	const queue = eventQueue ?? { events: [], lastEventId: 0, lastActionId: 0 };
	const lastEventIdRef = useRef(0);

	const events = useMemo(() => {
		if (queue.events.length === 0) {
			return [] as GameEvent[];
		}
		return queue.events.filter(
			(event) => event.eventId > lastEventIdRef.current,
		);
	}, [queue.events]);

	const ack = useCallback(() => {
		if (events.length === 0) return;
		lastEventIdRef.current = events[events.length - 1].eventId;
	}, [events]);

	return {
		events,
		cursor: lastEventIdRef.current,
		ack,
	};
};
