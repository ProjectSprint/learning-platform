import type { IconInfo } from "./icon";

export type InventoryItem = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	quantity?: number;
	icon?: IconInfo;
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
