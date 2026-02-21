import type {
	BoardItemStatus,
	EntityStatus,
} from "@/components/game/types/board";

export const toBoardItemStatus = (value: unknown): BoardItemStatus => {
	if (
		value === "normal" ||
		value === "warning" ||
		value === "success" ||
		value === "error"
	) {
		return value;
	}
	return "normal";
};

export const toEntityStatus = (status: BoardItemStatus): EntityStatus =>
	status === "normal" ? undefined : status;

export const parseCoordinate = (value: unknown): number => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	return 0;
};
