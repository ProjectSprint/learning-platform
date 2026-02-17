import type { IconInfo } from "./icon";

export type EntityVisual = {
	icon?: string;
	color?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	style?: Record<string, unknown>;
};

export type ItemTooltip = {
	content: string;
	seeMoreHref?: string;
};

export type EntityDataConfig = {
	id: string;
	type: string;
	name?: string;
	visual?: EntityVisual;
	data?: Record<string, unknown>;
	state?: Record<string, unknown>;
	behaviorIds?: string[];
};

export type EntityData = {
	id: string;
	type: string;
	name?: string;
	visual: EntityVisual;
	data: Record<string, unknown>;
	state: Record<string, unknown>;
	behaviorIds: string[];
};

export type ItemDataConfig = Omit<EntityDataConfig, "type"> & {
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
	draggable?: boolean;
	category?: string;
};

export type ItemData = EntityData & {
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
	draggable: boolean;
	category?: string;
};
