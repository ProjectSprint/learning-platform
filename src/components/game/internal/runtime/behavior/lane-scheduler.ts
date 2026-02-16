import type {
	LaneSchedulerInput,
	LaneSelectionResult,
} from "@/components/game/types/behavior";

const clampCursor = (cursor: number | undefined, laneCount: number): number => {
	if (laneCount <= 0) return -1;
	if (cursor === undefined || !Number.isFinite(cursor)) return -1;
	if (cursor < -1) return -1;
	return Math.min(cursor, laneCount - 1);
};

const getEnabledLanes = <TLaneId extends string>(
	input: LaneSchedulerInput<TLaneId>,
): TLaneId[] => {
	const enabled =
		input.enabledLanes && input.enabledLanes.length > 0
			? input.enabledLanes
			: input.lanes;
	return enabled.filter((laneId) => input.lanes.includes(laneId));
};

export const hasFreeLane = <TLaneId extends string>(
	input: Omit<LaneSchedulerInput<TLaneId>, "policy" | "cursor">,
): boolean => {
	const enabled = getEnabledLanes({
		...input,
		policy: "first_free",
	});
	return enabled.some((laneId) => !input.isOccupied(laneId));
};

export const pickLane = <TLaneId extends string>(
	input: LaneSchedulerInput<TLaneId>,
): LaneSelectionResult<TLaneId> => {
	const enabled = getEnabledLanes(input);
	const cursor = clampCursor(input.cursor, enabled.length);

	if (enabled.length === 0) {
		return { laneId: null, cursor };
	}

	if (input.policy === "first_free") {
		const laneId = enabled.find((candidate) => !input.isOccupied(candidate));
		if (!laneId) {
			return { laneId: null, cursor };
		}
		const nextCursor = enabled.indexOf(laneId);
		return { laneId, cursor: nextCursor };
	}

	const start = (cursor + 1 + enabled.length) % enabled.length;
	for (let offset = 0; offset < enabled.length; offset += 1) {
		const index = (start + offset) % enabled.length;
		const laneId = enabled[index];
		if (!input.isOccupied(laneId)) {
			return { laneId, cursor: index };
		}
	}

	return { laneId: null, cursor };
};
