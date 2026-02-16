import type { IconInfo } from "./icon";

export type ItemTooltip = {
	content: string;
	seeMoreHref?: string;
};

export type Item = {
	id: string;
	type: string;
	name?: string;
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
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
