import { describe, expect, it, vi } from "vitest";
import type { InspectorLogEntry } from "@/components/game/types/behavior";
import { createBehaviorInspector, NOOP_INSPECTOR } from "../behavior/inspector";

function makeEntry(
	overrides: Partial<InspectorLogEntry> = {},
): InspectorLogEntry {
	return {
		timestamp: Date.now(),
		eventType: "ENTITY_PLACED_IN_SPACE",
		eventId: 1,
		ruleId: "rule-1",
		action: "matched",
		...overrides,
	};
}

describe("createBehaviorInspector", () => {
	it("starts with empty entries", () => {
		const inspector = createBehaviorInspector();
		expect(inspector.getEntries()).toEqual([]);
	});

	it("log adds entries", () => {
		const inspector = createBehaviorInspector();
		const entry = makeEntry();
		inspector.log(entry);
		expect(inspector.getEntries()).toEqual([entry]);
	});

	it("log evicts oldest when max reached", () => {
		const inspector = createBehaviorInspector(3);

		const entries = Array.from({ length: 4 }, (_, i) =>
			makeEntry({ eventId: i, ruleId: `rule-${i}` }),
		);
		for (const entry of entries) {
			inspector.log(entry);
		}

		const stored = inspector.getEntries();
		expect(stored).toHaveLength(3);
		expect(stored[0].eventId).toBe(1);
		expect(stored[2].eventId).toBe(3);
	});

	it("getEntries returns entries in order", () => {
		const inspector = createBehaviorInspector();
		const a = makeEntry({ ruleId: "a" });
		const b = makeEntry({ ruleId: "b" });
		const c = makeEntry({ ruleId: "c" });

		inspector.log(a);
		inspector.log(b);
		inspector.log(c);

		expect(inspector.getEntries()).toEqual([a, b, c]);
	});

	it("clear removes all entries", () => {
		const inspector = createBehaviorInspector();
		inspector.log(makeEntry());
		inspector.log(makeEntry());
		inspector.clear();
		expect(inspector.getEntries()).toEqual([]);
	});

	it("subscribe receives new entries", () => {
		const inspector = createBehaviorInspector();
		const listener = vi.fn();
		inspector.subscribe(listener);

		const entry = makeEntry();
		inspector.log(entry);

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith(entry);
	});

	it("unsubscribe stops receiving entries", () => {
		const inspector = createBehaviorInspector();
		const listener = vi.fn();
		const unsubscribe = inspector.subscribe(listener);

		inspector.log(makeEntry());
		expect(listener).toHaveBeenCalledOnce();

		unsubscribe();
		inspector.log(makeEntry());
		expect(listener).toHaveBeenCalledOnce();
	});
});

describe("NOOP_INSPECTOR", () => {
	it("methods are no-ops", () => {
		NOOP_INSPECTOR.log(makeEntry());
		expect(NOOP_INSPECTOR.getEntries()).toEqual([]);
		NOOP_INSPECTOR.clear();

		const unsubscribe = NOOP_INSPECTOR.subscribe(() => {});
		expect(typeof unsubscribe).toBe("function");
		unsubscribe();
	});
});
