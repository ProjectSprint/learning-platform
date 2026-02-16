import { describe, expect, it } from "vitest";

import { hasFreeLane, pickLane } from "../behavior/lane-scheduler";

type LaneId = "core-1" | "core-2";
const lanes: LaneId[] = ["core-1", "core-2"];

describe("lane scheduler", () => {
	it("first_free picks the first available lane", () => {
		const result = pickLane({
			lanes,
			policy: "first_free",
			cursor: -1,
			isOccupied: (laneId) => laneId === "core-1",
		});
		expect(result).toEqual({ laneId: "core-2", cursor: 1 });
	});

	it("round_robin advances lane selection using cursor", () => {
		const first = pickLane({
			lanes,
			policy: "round_robin",
			cursor: -1,
			isOccupied: () => false,
		});
		const second = pickLane({
			lanes,
			policy: "round_robin",
			cursor: first.cursor,
			isOccupied: () => false,
		});
		expect(first).toEqual({ laneId: "core-1", cursor: 0 });
		expect(second).toEqual({ laneId: "core-2", cursor: 1 });
	});

	it("respects enabled lanes filter", () => {
		const result = pickLane({
			lanes,
			enabledLanes: ["core-2"],
			policy: "first_free",
			cursor: -1,
			isOccupied: () => false,
		});
		expect(result).toEqual({ laneId: "core-2", cursor: 0 });
	});

	it("hasFreeLane reports availability against enabled lanes", () => {
		expect(
			hasFreeLane({
				lanes,
				enabledLanes: ["core-1"],
				isOccupied: () => true,
			}),
		).toBe(false);
		expect(
			hasFreeLane({
				lanes,
				enabledLanes: ["core-2"],
				isOccupied: () => false,
			}),
		).toBe(true);
	});
});
