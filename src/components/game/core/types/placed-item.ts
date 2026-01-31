import type { IconInfo } from "./icon";

export type BoardItemStatus = "normal" | "warning" | "success" | "error";

export type BoardItemLocation = {
	id: string;
	itemId: string;
	type: string;
	blockX: number;
	blockY: number;
	status: BoardItemStatus;
	icon?: IconInfo;
	data: Record<string, unknown>;
};
