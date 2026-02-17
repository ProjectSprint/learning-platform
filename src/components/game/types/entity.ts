import type { IconInfo } from "./icon";

type DynamicPayload = Record<string, unknown>;

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

export type EntityDataConfig<
	TType extends string = string,
	TData extends DynamicPayload = DynamicPayload,
	TState extends DynamicPayload = DynamicPayload,
> = {
	id: string;
	type: TType;
	name?: string;
	visual?: EntityVisual;
	data?: TData;
	state?: TState;
	behaviorIds?: string[];
};

export type EntityData<
	TType extends string = string,
	TData extends DynamicPayload = DynamicPayload,
	TState extends DynamicPayload = DynamicPayload,
> = {
	id: string;
	type: TType;
	name?: string;
	visual: EntityVisual;
	data: TData;
	state: TState;
	behaviorIds: string[];
};

export type ItemDataConfig<
	TData extends DynamicPayload = DynamicPayload,
	TState extends DynamicPayload = DynamicPayload,
> = Omit<EntityDataConfig<string, TData, TState>, "type"> & {
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
	draggable?: boolean;
	category?: string;
};

export type ItemData<
	TType extends string = string,
	TData extends DynamicPayload = DynamicPayload,
	TState extends DynamicPayload = DynamicPayload,
> = EntityData<TType, TData, TState> & {
	allowedPlaces: string[];
	icon?: IconInfo;
	tooltip?: ItemTooltip;
	draggable: boolean;
	category?: string;
};
