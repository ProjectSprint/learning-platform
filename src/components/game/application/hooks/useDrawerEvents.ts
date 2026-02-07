/**
 * useDrawerEvents hook.
 * Filters engine events to drawer-specific events.
 */

import { useMemo } from "react";
import type { GameEvent } from "../state/types";
import { useEngineEvents } from "./useEvents";

export type DrawerEvent = Extract<GameEvent, { type: `DRAWER_${string}` }>;

export type DrawerEventBatch = {
	events: DrawerEvent[];
	cursor: number;
	ack: () => void;
};

/**
 * Hook to listen for drawer events.
 *
 * @example
 * ```ts
 * const { events, ack } = useDrawerEvents("inventory-drawer");
 * useEffect(() => {
 *   if (events.length === 0) return;
 *   // react to events
 *   ack();
 * }, [events, ack]);
 * ```
 */
export const useDrawerEvents = (drawerId?: string): DrawerEventBatch => {
	const engineId = `drawer-events-${drawerId ?? "all"}`;
	const { events, cursor, ack } = useEngineEvents(engineId);

	const drawerEvents = useMemo(() => {
		const filtered = events.filter((event): event is DrawerEvent =>
			event.type.startsWith("DRAWER_"),
		);

		if (!drawerId) {
			return filtered;
		}

		return filtered.filter((event) => event.drawerId === drawerId);
	}, [drawerId, events]);

	return {
		events: drawerEvents,
		cursor,
		ack,
	};
};
