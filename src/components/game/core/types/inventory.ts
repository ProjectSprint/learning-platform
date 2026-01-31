import type { IconInfo } from "./icon";

export type Item = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	icon?: IconInfo;
	data?: Record<string, unknown>;
	draggable?: boolean;
	category?: string;
};

export type InventoryGroup = {
	id: string;
	title: string;
	visible: boolean;
	items: Item[];
};

export type InventoryGroupConfig = {
	id: string;
	title: string;
	visible?: boolean;
	items: Item[];
};
