import type { IconInfo, ItemBehavior } from "../../icons";

export type PlacedItemStatus = "normal" | "warning" | "success" | "error";

export type PlacedItem = {
	id: string;
	itemId: string;
	type: string;
	blockX: number;
	blockY: number;
	status: PlacedItemStatus;
	icon?: IconInfo;
	behavior?: ItemBehavior;
	data: Record<string, unknown>;
};
