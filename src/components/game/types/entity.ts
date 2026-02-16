import type { _IconInfo } from "./icon";

export type _EntityVisual = {
	icon?: string;
	color?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	style?: Record<string, unknown>;
};

export type _ItemTooltip = {
	content: string;
	seeMoreHref?: string;
};

export type _EntityDataConfig = {
	id: string;
	type: string;
	name?: string;
	visual?: _EntityVisual;
	data?: Record<string, unknown>;
	state?: Record<string, unknown>;
	behaviorIds?: string[];
};

export type _EntityData = {
	id: string;
	type: string;
	name?: string;
	visual: _EntityVisual;
	data: Record<string, unknown>;
	state: Record<string, unknown>;
	behaviorIds: string[];
};

export type _ItemDataConfig = Omit<_EntityDataConfig, "type"> & {
	allowedPlaces: string[];
	icon?: _IconInfo;
	tooltip?: _ItemTooltip;
	draggable?: boolean;
	category?: string;
};

export type _ItemData = _EntityData & {
	allowedPlaces: string[];
	icon?: _IconInfo;
	tooltip?: _ItemTooltip;
	draggable: boolean;
	category?: string;
};

export type EntityVisual = _EntityVisual;
export type ItemTooltip = _ItemTooltip;
export type EntityDataConfig = _EntityDataConfig;
export type EntityData = _EntityData;
export type ItemDataConfig = _ItemDataConfig;
export type ItemData = _ItemData;
