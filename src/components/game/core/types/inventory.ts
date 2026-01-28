import type { IconInfo, ItemBehavior } from "../../icons";

export type InventoryItem = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	quantity?: number;
	icon?: IconInfo;
	behavior?: ItemBehavior;
	data?: Record<string, unknown>;
	draggable?: boolean;
	category?: string;
};

export type InventoryGroup = {
	id: string;
	title: string;
	visible: boolean;
	items: InventoryItem[];
};

export type InventoryGroupConfig = {
	id: string;
	title: string;
	visible?: boolean;
	items: InventoryItem[];
};
