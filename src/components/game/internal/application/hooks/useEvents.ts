/**
 * useEngineEvents hook.
 * Provides ordered event batches with an engine-specific ack cursor.
 */

import { useCallback, useEffect, useMemo } from "react";
import type { GameEvent } from "@/components/game/types/state";
import { useGameDispatch, useGameState } from "../../game-provider";

type EngineEventBatch = {
	events: GameEvent[];
	cursor: number;
	ack: () => void;
};

export const useEngineEvents = (engineId: string): EngineEventBatch => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const queue = state.eventQueue ?? {
		events: [],
		lastEventId: 0,
		lastActionId: 0,
	};
	const cursor = state.eventCursors?.[engineId] ?? 0;

	const events = useMemo(() => {
		if (queue.events.length === 0) {
			return [] as GameEvent[];
		}
		return queue.events.filter((event) => event.eventId > cursor);
	}, [cursor, queue.events]);

	const ack = useCallback(() => {
		if (events.length === 0) return;
		const nextCursor = events[events.length - 1].eventId;
		if (nextCursor <= cursor) {
			return;
		}
		dispatch({
			type: "ACK_EVENTS",
			payload: { engineId, cursor: nextCursor },
		});
	}, [cursor, dispatch, engineId, events]);

	useEffect(() => {
		if (queue.lastEventId < cursor) {
			dispatch({
				type: "ACK_EVENTS",
				payload: { engineId, cursor: 0 },
			});
		}
	}, [cursor, dispatch, engineId, queue.lastEventId]);

	return {
		events,
		cursor,
		ack,
	};
};
