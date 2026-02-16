/**
 * Behavior inspector — lightweight debug logging for the behavior system.
 * Enabled only in development mode. Provides structured trace output
 * for rule matching, guard evaluation, and handler execution.
 */

import type {
	BehaviorInspector,
	InspectorLogEntry,
} from "@/components/game/types/behavior";

/**
 * Create a behavior inspector that stores entries in memory.
 * @param maxEntries Maximum entries to retain (FIFO eviction). Default: 200
 */
export function createBehaviorInspector(maxEntries = 200): BehaviorInspector {
	const entries: InspectorLogEntry[] = [];
	const listeners = new Set<(entry: InspectorLogEntry) => void>();

	return {
		log(entry) {
			entries.push(entry);
			if (entries.length > maxEntries) {
				entries.shift();
			}
			for (const listener of listeners) {
				listener(entry);
			}
		},
		getEntries() {
			return entries;
		},
		clear() {
			entries.length = 0;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

/**
 * Create a console-logging inspector for development.
 * Wraps a base inspector and logs to console with formatted output.
 */
export function createConsoleInspector(maxEntries = 200): BehaviorInspector {
	const base = createBehaviorInspector(maxEntries);
	const originalLog = base.log;

	return {
		...base,
		log(entry) {
			originalLog(entry);
			const prefix = `[behavior:${entry.ruleId}]`;
			const action = entry.action;
			const event = entry.eventType;
			const detail = entry.detail ? ` — ${entry.detail}` : "";
			const entityInfo = entry.entityId ? ` entity=${entry.entityId}` : "";
			const spaceInfo = entry.spaceId ? ` space=${entry.spaceId}` : "";

			if (action === "handler-error") {
				console.warn(
					`${prefix} ⚠ ${action} ${event}${entityInfo}${spaceInfo}${detail}`,
				);
			} else {
				console.debug(
					`${prefix} ${action} ${event}${entityInfo}${spaceInfo}${detail}`,
				);
			}
		},
	};
}

/**
 * No-op inspector for production — all methods are no-ops.
 */
export const NOOP_INSPECTOR: BehaviorInspector = {
	log: () => {},
	getEntries: () => [],
	clear: () => {},
	subscribe: () => () => {},
};
