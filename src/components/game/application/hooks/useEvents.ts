/**
 * useGameEvents hook.
 * Provides ordered event batches with a global ack cursor.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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
	const [cursor, setCursor] = useState(0);

	const events = useMemo(() => {
		if (queue.events.length === 0) {
			return [] as GameEvent[];
		}
		return queue.events.filter((event) => event.eventId > cursor);
	}, [cursor, queue.events]);

	const ack = useCallback(() => {
		if (events.length === 0) return;
		const nextCursor = events[events.length - 1].eventId;
		setCursor((prev) => (nextCursor > prev ? nextCursor : prev));
	}, [events]);

	useEffect(() => {
		if (queue.lastEventId < cursor) {
			setCursor(0);
		}
	}, [cursor, queue.lastEventId]);

	return {
		events,
		cursor,
		ack,
	};
};
